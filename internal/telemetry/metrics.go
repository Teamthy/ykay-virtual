// Package telemetry — Prometheus metrics (G3.3, remediation plan).
//
// Every metric is namespaced nuvora_*. The default registry is wired into
// the API and worker HTTP servers and exposed at GET /metrics (optionally
// behind a bearer token via METRICS_TOKEN). Tests construct their own
// Metrics instance with NewMetrics(prometheus.NewRegistry()) and swap it in
// with SetMetrics so assertions never race with production collectors.
package telemetry

import (
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// Metrics bundles all NUVORA collectors. Names/labels are a contract with
// deploy/prometheus/alerts.yml and deploy/grafana/dashboards/nuvora-api.json —
// change them in all three places.
type Metrics struct {
	BuildInfo             *prometheus.GaugeVec
	HTTPRequestsTotal     *prometheus.CounterVec
	HTTPRequestDuration   *prometheus.HistogramVec
	JobsEnqueuedTotal     *prometheus.CounterVec
	JobsCompletedTotal    *prometheus.CounterVec
	JobsRetriedTotal      *prometheus.CounterVec
	JobsDeadLetteredTotal *prometheus.CounterVec
	JobsDroppedTotal      *prometheus.CounterVec
	QueueDepth            *prometheus.GaugeVec
	CronRunsTotal         *prometheus.CounterVec
	CronLastSuccess       *prometheus.GaugeVec

	registry *prometheus.Registry
}

// NewMetrics registers every collector on the given registry (pass
// prometheus.NewRegistry() in tests, prometheus.DefaultRegisterer in prod).
func NewMetrics(registry *prometheus.Registry) *Metrics {
	m := &Metrics{
		BuildInfo: prometheus.NewGaugeVec(prometheus.GaugeOpts{
			Name: "nuvora_build_info",
			Help: "NUVORA build metadata; 1 with the deployed version label.",
		}, []string{"version"}),
		HTTPRequestsTotal: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "nuvora_http_requests_total",
			Help: "HTTP requests handled, by method, normalized route and status class.",
		}, []string{"method", "route", "code"}),
		HTTPRequestDuration: prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "nuvora_http_request_duration_seconds",
			Help:    "HTTP request latency by method and normalized route.",
			Buckets: prometheus.DefBuckets,
		}, []string{"method", "route"}),
		JobsEnqueuedTotal: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "nuvora_jobs_enqueued_total",
			Help: "Durable-queue jobs enqueued by type and backend (redis|memory).",
		}, []string{"type", "backend"}),
		JobsCompletedTotal: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "nuvora_jobs_completed_total",
			Help: "Jobs that finished successfully by type and backend.",
		}, []string{"type", "backend"}),
		JobsRetriedTotal: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "nuvora_jobs_retried_total",
			Help: "Job attempts that failed and were scheduled for retry, by type and backend.",
		}, []string{"type", "backend"}),
		JobsDeadLetteredTotal: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "nuvora_jobs_dead_lettered_total",
			Help: "Jobs moved to the dead-letter list after exhausting attempts.",
		}, []string{"type", "backend"}),
		JobsDroppedTotal: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "nuvora_jobs_dropped_total",
			Help: "Jobs dropped without retry (malformed payload or unregistered type).",
		}, []string{"type", "backend"}),
		QueueDepth: prometheus.NewGaugeVec(prometheus.GaugeOpts{
			Name: "nuvora_queue_depth",
			Help: "Durable-queue depth by backend and state (ready|processing|delayed|dead).",
		}, []string{"backend", "state"}),
		CronRunsTotal: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "nuvora_worker_cron_runs_total",
			Help: "Worker cron invocations by cron name and result (success|error).",
		}, []string{"cron", "result"}),
		CronLastSuccess: prometheus.NewGaugeVec(prometheus.GaugeOpts{
			Name: "nuvora_worker_cron_last_success_timestamp",
			Help: "Unix timestamp of the last successful run per cron name.",
		}, []string{"cron"}),
	}
	registry.MustRegister(
		m.BuildInfo, m.HTTPRequestsTotal, m.HTTPRequestDuration,
		m.JobsEnqueuedTotal, m.JobsCompletedTotal, m.JobsRetriedTotal,
		m.JobsDeadLetteredTotal, m.JobsDroppedTotal, m.QueueDepth,
		m.CronRunsTotal, m.CronLastSuccess,
	)
	m.registry = registry
	return m
}

// --- Default instance (production path) -----------------------------------

var current atomic.Pointer[Metrics]
var defaultOnce sync.Once

// DefaultMetrics returns the process-wide Metrics registered on the
// prometheus default registry. Safe for concurrent first use (sync.Once
// guards registration — two goroutines racing at boot must not double-
// register collectors).
func DefaultMetrics() *Metrics {
	if m := current.Load(); m != nil {
		return m
	}
	defaultOnce.Do(func() {
		m := NewMetrics(prometheus.DefaultRegisterer.(*prometheus.Registry))
		current.Store(m)
	})
	return current.Load()
}

// SetMetrics swaps the metrics instance used by the package-level helpers
// (used by tests). Returns a restore function; restoring always lands on a
// non-nil instance (the default is materialized first).
func SetMetrics(m *Metrics) func() {
	if current.Load() == nil {
		_ = DefaultMetrics() // materialize the default instance first
	}
	old := current.Swap(m)
	return func() { current.Store(old) }
}

// --- Build + HTTP ----------------------------------------------------------

// MarkBuild publishes the running version once per process.
func (m *Metrics) MarkBuild(version string) {
	m.BuildInfo.WithLabelValues(version).Set(1)
}

// Middleware instruments every request except the scrape endpoint itself.
// Route labels are normalized: UUID path segments become :id so the label
// space stays bounded. The wrapped ResponseWriter captures the status code.
func (m *Metrics) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		route := maskRoute(r.URL.Path)
		if route == "/metrics" {
			next.ServeHTTP(w, r)
			return
		}
		start := time.Now()
		sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(sw, r)
		m.HTTPRequestsTotal.WithLabelValues(r.Method, route, strconv.Itoa(sw.status)).Inc()
		m.HTTPRequestDuration.WithLabelValues(r.Method, route).Observe(time.Since(start).Seconds())
	})
}

// HandlerWithToken exposes Prometheus metrics. When token is non-empty the
// scrape endpoint requires `Authorization: Bearer <token>` (fail-closed).
func (m *Metrics) HandlerWithToken(token string) http.Handler {
	h := promhttp.HandlerFor(m.registry, promhttp.HandlerOpts{})
	if token == "" {
		return h
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer "+token {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		h.ServeHTTP(w, r)
	})
}

// statusWriter captures the response status while preserving optional
// interfaces via Unwrap (ResponseController-compatible).
type statusWriter struct {
	http.ResponseWriter
	status int
}

func (s *statusWriter) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

func (s *statusWriter) Unwrap() http.ResponseWriter { return s.ResponseWriter }

var uuidSegment = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
var numericSegment = regexp.MustCompile(`^\d+$`)

// maskRoute normalizes a request path for label cardinality: UUID segments
// and pure-numeric segments become :id (query strings are already excluded).
func maskRoute(path string) string {
	segs := strings.Split(strings.Trim(path, "/"), "/")
	out := make([]string, 0, len(segs))
	for _, s := range segs {
		switch {
		case s == "":
			continue
		case uuidSegment.MatchString(s), numericSegment.MatchString(s):
			out = append(out, ":id")
		default:
			out = append(out, s)
		}
	}
	return "/" + strings.Join(out, "/")
}

// --- Queue (called from internal/worker) -----------------------------------

func JobEnqueued(jobType, backend string) {
	DefaultMetrics().JobsEnqueuedTotal.WithLabelValues(jobType, backend).Inc()
}
func JobCompleted(jobType, backend string) {
	DefaultMetrics().JobsCompletedTotal.WithLabelValues(jobType, backend).Inc()
}
func JobRetried(jobType, backend string) {
	DefaultMetrics().JobsRetriedTotal.WithLabelValues(jobType, backend).Inc()
}
func JobDeadLettered(jobType, backend string) {
	DefaultMetrics().JobsDeadLetteredTotal.WithLabelValues(jobType, backend).Inc()
}
func JobDropped(jobType, backend string) {
	DefaultMetrics().JobsDroppedTotal.WithLabelValues(jobType, backend).Inc()
}

// SetQueueDepth sets one queue state gauge (ready|processing|delayed|dead).
func SetQueueDepth(backend, state string, v float64) {
	DefaultMetrics().QueueDepth.WithLabelValues(backend, state).Set(v)
}

// --- Worker crons ----------------------------------------------------------

// CronRun records one cron invocation; ok=true on success (also stamps
// CronLastSuccess for staleness alerting).
func CronRun(cron string, ok bool) {
	DefaultMetrics().CronRunsTotal.WithLabelValues(cron, map[bool]string{true: "success", false: "error"}[ok]).Inc()
	if ok {
		DefaultMetrics().CronLastSuccess.WithLabelValues(cron).Set(float64(time.Now().Unix()))
	}
}
