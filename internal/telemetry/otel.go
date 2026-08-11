package telemetry

import (
	"context"
	"log"
)

func InitTracer(ctx context.Context, endpoint string) func() {
	if endpoint == "" {
		log.Println("OTel disabled - no endpoint")
		return func() {}
	}
	log.Printf("OTel enabled: %s (placeholder)", endpoint)
	return func() { log.Println("OTel shutdown") }
}
