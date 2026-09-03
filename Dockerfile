# YK-Virtual API — multi-stage production image (non-root).
#
# Build:   docker build -f Dockerfile -t yk-virtual-api:latest .
# Run:     see docker-compose.prod.yml

# ── Stage 1: build ─────────────────────────────────────────────────────────
FROM golang:1.22-alpine AS build
WORKDIR /src

# Cache module downloads first (layer stays valid unless go.mod changes).
COPY go.mod go.sum ./
RUN go mod download

COPY . .
# CGO_ENABLED=0 → static binary; -trimpath keeps builds reproducible.
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api \
 && CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/migrate ./cmd/migrate \
 && CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/worker ./cmd/worker

# ── Stage 2: runtime (scratch, non-root) ───────────────────────────────────
# SECURITY (A-01): the scratch image has no CA certificates, so every outbound
# HTTPS call (Paystack, Flutterwave, Whereby, Gemini, SMTP/TLS, S3) would fail
# TLS verification at runtime while /health still reported 200. Copy the CA
# bundle from the build stage (golang:alpine ships ca-certificates so `go mod
# download` can verify module downloads over HTTPS).
FROM scratch
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=build /out/api /out/migrate /out/worker /usr/local/bin/

# Non-root user (uid 65532 = nobody in scratch).
USER 65532:65532

EXPOSE 8080
ENV PORT=8080

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD ["/usr/local/bin/api", "-healthcheck"]

ENTRYPOINT ["/usr/local/bin/api"]
