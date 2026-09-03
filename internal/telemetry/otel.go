// Package telemetry — real OpenTelemetry tracing (G3.2, remediation plan).
//
// When OTEL_EXPORTER_OTLP_ENDPOINT is set, spans are exported over OTLP/HTTP
// (works with Grafana Tempo, Honeycomb, Jaeger's OTLP collector, SigNoz, …).
// When it is empty, a no-op tracer is installed and the app pays zero cost.
package telemetry

import (
	"context"
	"log/slog"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

// InitTracer configures the global tracer provider. Returns a shutdown
// function that flushes pending spans; always safe to call.
func InitTracer(ctx context.Context, endpoint string) func() {
	return InitTracerWithService(ctx, endpoint, "yk-virtual-api", "")
}

// InitTracerWithService — like InitTracer but with explicit service metadata.
func InitTracerWithService(ctx context.Context, endpoint, serviceName, version string) func() {
	if endpoint == "" {
		slog.Info("telemetry: OTel disabled (no OTEL_EXPORTER_OTLP_ENDPOINT)")
		return func() {}
	}

	exp, err := otlptracehttp.New(ctx,
		otlptracehttp.WithEndpointURL(endpoint),
	)
	if err != nil {
		slog.Warn("telemetry: OTLP exporter init failed — tracing disabled", "error", err)
		return func() {}
	}

	attrs := []sdktrace.TracerProviderOption{
		sdktrace.WithBatcher(exp,
			sdktrace.WithBatchTimeout(5*time.Second),
			sdktrace.WithMaxExportBatchSize(512),
		),
		sdktrace.WithResource(resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceName(serviceName),
			semconv.ServiceVersion(version),
		)),
		// Head sampling: keep everything below ~100 rps; ratio-sample beyond
		// that via OTEL_TRACES_SAMPLER env if needed (SDK honours it).
		sdktrace.WithSampler(sdktrace.ParentBased(sdktrace.AlwaysSample())),
	}

	tp := sdktrace.NewTracerProvider(attrs...)
	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{}, propagation.Baggage{},
	))

	slog.Info("telemetry: OTel tracing enabled", "endpoint", endpoint, "service", serviceName)
	return func() {
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := tp.Shutdown(shutdownCtx); err != nil {
			slog.Warn("telemetry: OTel shutdown error", "error", err)
		}
	}
}
