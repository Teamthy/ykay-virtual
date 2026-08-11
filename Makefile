# YKAY Virtual School — developer workflow

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

test: test-api test-legacy test-web ## Full test suite

test-api: ## Go tests (root module)
	$(GO) test ./...

test-legacy: ## Go tests (legacy module)
	cd legacy/server && $(GO) test ./...

test-web: ## Frontend tests (Vitest)
	cd client && $(NPM) test

lint: ## Go vet + gofmt check
	$(GO) vet ./...
	@test -z "$$(gofmt -l internal cmd pkg)" || (echo "gofmt needed:"; gofmt -l internal cmd pkg; exit 1)

fmt: ## Format Go code
	gofmt -w internal cmd pkg

smoke: ## Boot API with memory fallback and hit health + catalogue
	@echo "Run: go run ./cmd/api  (then curl localhost:8080/health)"
