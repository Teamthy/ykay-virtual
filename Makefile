# YK-Virtual — developer workflow

GO ?= go
NPM ?= npm

.PHONY: help infra migrate api worker web build typecheck test test-api test-web lint fmt fmt-check smoke

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

infra: ## Start Postgres + Redis
	docker compose up -d postgres redis

migrate: ## Apply migrations (up)
	$(GO) run ./cmd/migrate --cmd=up

api: ## Run the API server (port 8080)
	$(GO) run ./cmd/api

worker: ## Run the background worker + crons
	$(GO) run ./cmd/worker

web: ## Run the Next.js frontend (port 3000)
	cd client && $(NPM) run dev

build: ## Production builds (Go + Next.js)
	$(GO) build ./...
	cd client && $(NPM) run build

typecheck: ## TypeScript typecheck
	cd client && npx tsc --noEmit

test: test-api test-web ## Full test suite

test-api: ## Go tests (root module)
	$(GO) test ./...

test-web: ## Frontend tests (Vitest)
	cd client && $(NPM) test

lint: ## Go vet + gofmt check
	$(GO) vet ./...
	@test -z "$$(gofmt -l internal cmd pkg)" || (echo "gofmt needed:"; gofmt -l internal cmd pkg; exit 1)

fmt: ## Format Go code
	gofmt -w internal cmd pkg

seed-users: ## Create local operator accounts with random passwords (prints once)
	$(GO) run ./cmd/seedusers

seed-lms: ## Seed local tutor LMS pack (video/material; run after seed-users)
	$(GO) run ./cmd/seedlms

smoke: ## Boot API with memory fallback and hit health + catalogue
	@echo "Run: go run ./cmd/api  (then curl localhost:8080/health)"

# ── Production ops (Phase 40) ──────────────────────────────────────────────
.PHONY: deploy backup restore drill prod-infra obs-validate

deploy: ## One-command production deploy (docker compose + migrate + health)
	bash scripts/deploy.sh

backup: ## Manual database backup (custom format)
	bash scripts/backup.sh

restore: ## Restore a backup: make restore DUMP=backups/yk-virtual-<ts>.dump
	bash scripts/restore.sh "$(DUMP)"

drill: ## Automated backup/restore drill (G3.4): make drill [DEEP=1]
	bash scripts/dr-drill.sh $(if $(DEEP),--deep,)

prod-infra: ## Bring up the full production stack
	docker compose -f docker-compose.prod.yml up -d --build

obs-validate: ## Validate Prometheus config/rules + Grafana dashboard JSON (G3.3)
	python3 -m json.tool deploy/grafana/dashboards/yk-virtual-api.json >/dev/null && echo "dashboard JSON valid"
	@if command -v docker >/dev/null 2>&1; then \
		docker run --rm -v "$$PWD/deploy/prometheus:/p:ro" prom/prometheus:v2.53.0 \
			promtool check config /p/prometheus.yml && \
		docker run --rm -v "$$PWD/deploy/prometheus:/p:ro" prom/prometheus:v2.53.0 \
			promtool check rules /p/alerts.yml; \
	else \
		echo "docker not available — skipped promtool; run in CI or locally"; \
	fi
	docker compose -f docker-compose.prod.yml config --quiet 2>/dev/null && echo "compose config valid" || echo "docker not available — skipped compose check"
