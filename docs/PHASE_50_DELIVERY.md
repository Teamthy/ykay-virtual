# PHASE 50 — CI REPAIR + DEV EXPERIENCE + HERO IMAGERY — DELIVERY

Branch: feature/phase-50-ci-hero-devux
Base: feature/phase-49-g7-hardening @ 73e9376
Scope: the two failing CI jobs on main, plain-text dev codes, local
best-fit hero imagery, and the Windows `next dev` OOM.

## CI repairs (both failures root-caused from the run on main)

### Metrics + alerts config validation (G3.3) — promtool
- Root cause: `deploy/prometheus/prometheus.yml` references its rules at
  `/etc/prometheus/alerts.yml` — the mount path used INSIDE the compose
  service. The CI validation container mounted the directory at `/p`, so
  promtool failed with `"/etc/prometheus/alerts.yml" does not point to an
  existing file`. The rules themselves were always valid (11/11).
- Fix: CI now mounts at `/etc/prometheus` and validates both
  `check config` and `check rules` at that path. Verified locally with
  promtool 2.53: `SUCCESS: 1 rule files found`.

### Lighthouse CI — exit 127
- Root cause: `lhci` was installed globally in an earlier step; after
  the runner's Node 20→24 migration the global bin isn't reliably on
  PATH in later steps → `lhci: command not found` (127). Secondary risk:
  the API boot health-wait was racing a cold `go run` compile.
- Fix: the boot step now pre-builds the API binary (`go build -o
  /tmp/nuvora-api`), boots it directly, installs lhci IN-STEP with an
  explicit `PATH="$(npm config get prefix)/bin:$PATH"` export, and falls
  back to `npx --yes @lhci/cli` if `lhci` is still missing. Health waits
  widened 30s → 60s. Same hardening applied to the observability smoke.

## Dev experience

### Plain-text codes/links in the terminal (development only)
- AuthService.WithDevLogging(enabled) — wired from
  `cfg.Environment != "production"`. Login codes, verify-email links and
  reset-password links now print as:
  `🔑 login code for devcheck@test.com: 716537 (expires in 10 minutes)`
  `🔑 verify-email link for …: http://localhost:3000/verify-email?token=…`
  Never enabled in production (verified live against a booted API).

### Windows `next dev` OOM ("Array buffer allocation failed")
- Root cause: webpack's dev pack-file cache serializes via very large
  gzip buffers; on a RAM-constrained machine (Docker + API + browser
  running) the allocation fails and Node dies.
- Fix: `client/next.config.js` disables the webpack filesystem cache in
  dev mode only (production builds keep it). Plus docs: raise/limit the
  heap via `NODE_OPTIONS=--max-old-space-size=2048` and free RAM
  (stop Docker / close browsers) as an immediate workaround.

## Hero imagery — best-fit, local, zero hotlinks

- 6 new on-brand hero photographs generated for the homepage slider
  (1376×768, ~200 KB each) in `client/public/hero/`:
  `home-tutoring.jpg · international.jpg · utme.jpg · test-prep.jpg ·
  nuvora-plus.jpg · entrance-exam.jpg`
- Wired into BOTH hero components (HeroSlider 5 slides + HeroCarousel
  via site-data.ts) with per-slide best-fit mapping. No more Unsplash
  hotlinks on the homepage — faster, CSP-safe, no remote dependency,
  and lighthouse byte-weight friendly. (Tutor cards keep the existing
  remote pattern for now — tracked.)
- AI-generated marketing imagery noted for the G5.3 content register:
  photos of real people in marketing still require consent evidence.

## Verification

```
promtool check config + rules        SUCCESS (11 rules) — CI mount fix
                                     reproduced and confirmed locally
gofmt / go build / go vet            PASS
go test ./...                        PASS
live dev-code check                   🔑 login code … printed to API log
client tsc --noEmit                  PASS
client next build                    83/83 routes
scripts/e2e-web.sh (Playwright)      5 passed · landing 0 critical /
                                     0 serious with local hero images
```

## Remaining

- Tutor-card imagery migration to local/asset pipeline (tracked).
- G5.3 register: AI-generated imagery disclosure decision.
