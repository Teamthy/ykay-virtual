package config

import (
	"os"
)

type Config struct {
	Port              string
	DatabaseURL       string
	RedisURL          string
	JWTSecret         string
	S3Endpoint        string
	S3PublicBucket    string
	S3PrivateBucket   string
	S3Region          string
	S3AccessKey       string
	S3SecretKey       string
	PaymentProvider   string
	PaystackSecret    string
	FlutterwaveSecret string
	Environment       string
	OtelEndpoint      string
	SiteURL           string
	AllowedOrigins    string
}

func Load() Config {
	return Config{
		Port:            getEnv("PORT", "8080"),
		DatabaseURL:     getEnv("DATABASE_URL", "postgres://ykay:ykay@localhost:5432/ykay?sslmode=disable"),
		RedisURL:        getEnv("REDIS_URL", "redis://localhost:6379/0"),
		JWTSecret:       getEnv("JWT_SECRET", "dev-secret-change-me"),
		S3Endpoint:      getEnv("S3_ENDPOINT", ""),
		S3PublicBucket:  getEnv("S3_PUBLIC_BUCKET", "ykay-public"),
		S3PrivateBucket: getEnv("S3_PRIVATE_BUCKET", "ykay-private"),
		S3Region:        getEnv("S3_REGION", "us-east-1"),
		S3AccessKey:     getEnv("S3_ACCESS_KEY", ""),
		S3SecretKey:     getEnv("S3_SECRET_KEY", ""),
		PaymentProvider: getEnv("PAYMENT_PROVIDER", "PAYSTACK"),
		PaystackSecret:  getEnv("PAYSTACK_SECRET", ""),
		Environment:     getEnv("ENVIRONMENT", "development"),
		OtelEndpoint:    getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", ""),
		SiteURL:         getEnv("SITE_URL", "https://ykayvirtual.com"),
		AllowedOrigins:  getEnv("ALLOWED_ORIGINS", "*"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
