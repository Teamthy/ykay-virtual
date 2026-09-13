#!/usr/bin/env bash
# YK-Virtual â€” health-gated production deploy on OCI with automatic rollback.
#
# Called by GitHub Actions (.github/workflows/deploy-oci.yml) over SSH:
#
#   IMAGE_TAG=sha-abc123 ./deploy.sh
#
# Requirements on the host (one-time setup, see README.md):
#   /opt/ykay/virtual/.env                     (chmod 600)
#   /opt/ykay/virtual/docker-compose.oci.yml
#   /opt/ykay/virtual/Caddyfile
#   docker logged in to ghcr.io (echo $GHCR_PAT | docker login ghcr.io -u USER --password-stdin)
set -euo pipefail

cd "$(dirname "$0")"
COMPOSE="docker compose -f docker-compose.oci.yml"

# Load the same .env docker compose reads (needed for $API_HOST below).
if [[ -f .env ]]; then
  set -a; source .env; set +a
fi

if [[ -z "${IMAGE_TAG:-}" ]]; then
  echo "ERROR: IMAGE_TAG is required (git sha or release tag)." >&2
  exit 2
fi

# Snapshot the currently running image so we can roll back to it.
PREV_TAG="$(docker inspect --format='{{.Config.Image}}' ykv-prod-api-1 2>/dev/null \
  | sed -E 's#.*/ykay-virtual:##' || true)"
echo "â†’ deploying ${IMAGE_TAG} (current: ${PREV_TAG:-none})"

export IMAGE_TAG
$COMPOSE pull api worker migrate

# migrate runs first (service_completed_successfully gates api/worker).
$COMPOSE up -d migrate
$COMPOSE up -d api worker caddy

echo "â†’ waiting for api to become healthy (max 150s)â€¦"
deadline=$(( $(date +%s) + 150 ))
healthy=0
while [[ $(date +%s) -lt $deadline ]]; do
  status="$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' ykv-prod-api-1 2>/dev/null || echo missing)"
  if [[ "$status" == "healthy" || "$status" == "running" ]]; then healthy=1; break; fi
  sleep 5
done

# External readiness through TLS/Caddy.
ready=0
if [[ $healthy -eq 1 ]]; then
  for _ in $(seq 1 12); do
    if curl -fsS --max-time 8 "https://${API_HOST}/health/ready" | grep -q '"ready"'; then
      ready=1; break
    fi
    sleep 5
  done
fi

if [[ $ready -ne 1 ]]; then
  echo "âœ— deployment failed health gate. Recent logs:" >&2
  $COMPOSE logs --tail=120 api worker migrate caddy >&2 || true
  if [[ -n "${PREV_TAG:-}" ]]; then
    echo "â†º rolling back to ${PREV_TAG}" >&2
    IMAGE_TAG="$PREV_TAG" $COMPOSE up -d api worker
    sleep 20
    if [[ "$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' ykv-prod-api-1 2>/dev/null)" == "healthy" ]]; then
      echo "âœ“ rolled back to ${PREV_TAG} (investigate ${IMAGE_TAG})" >&2
    else
      echo "âœ— ROLLBACK ALSO UNHEALTHY â€” manual intervention required" >&2
    fi
  fi
  exit 1
fi

echo "âœ“ ${IMAGE_TAG} live and healthy"
docker image prune -f >/dev/null 2>&1 || true
