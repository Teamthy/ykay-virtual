package telemetry

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/testutil"
)

func newTestMetrics(t *testing.T) *Metrics {
	t.Helper()
	return NewMetrics(prometheus.NewRegistry())
}

func TestMaskRoute(t *testing.T) {
	cases := map[string]string{
		"/api/v1/tutors/9f8e7d6c-5b4a-3210-abcd-ef0123456789": "/api/v1/tutors/:id",
		"/api/v1/subjects/c001":                               "/api/v1/subjects/c001", // slug, not numeric/UUID
		"/api/v1/cohorts/42/enroll":                           "/api/v1/cohorts/:id/enroll",
		"/health":                                             "/health",
		"/metrics":                                            "/metrics",
		"/":                                                   "/",
	}
	for in, want := range cases {
		if got := maskRoute(in); got != want {
			t.Errorf("maskRoute(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestMiddlewareRecordsHTTP(t *testing.T) {
	m := newTestMetrics(t)
	handler := m.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
	}))

	req := httptest.NewRequest(http.MethodPost, "/api/v1/tutors/9f8e7d6c-5b4a-3210-abcd-ef0123456789", nil)
	handler.ServeHTTP(httptest.NewRecorder(), req)

	want := `
# HELP ykv_http_requests_total HTTP requests handled, by method, normalized route and status class.
# TYPE ykv_http_requests_total counter
ykv_http_requests_total{code="201",method="POST",route="/api/v1/tutors/:id"} 1
`
	if err := testutil.CollectAndCompare(m.HTTPRequestsTotal, strings.NewReader(want), "ykv_http_requests_total"); err != nil {
		t.Fatal(err)
	}
}

func TestMiddlewareSkipsMetricsScrape(t *testing.T) {
	m := newTestMetrics(t)
	handler := m.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))

	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	handler.ServeHTTP(httptest.NewRecorder(), req)

	if got := testutil.CollectAndCount(m.HTTPRequestsTotal, "ykv_http_requests_total"); got != 0 {
		t.Fatalf("scrape path must not be self-instrumented, got %d series", got)
	}
}

func TestHandlerWithToken(t *testing.T) {
	m := newTestMetrics(t)
	m.MarkBuild("test-version")
	h := m.HandlerWithToken("s3cret")

	// No token → 401
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/metrics", nil))
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 without token, got %d", rr.Code)
	}

	// Wrong token → 401
	rr = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	req.Header.Set("Authorization", "Bearer wrong")
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 with wrong token, got %d", rr.Code)
	}

	// Correct token → 200 + build info
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/metrics", nil)
	req.Header.Set("Authorization", "Bearer s3cret")
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 with token, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), `ykv_build_info{version="test-version"} 1`) {
		t.Fatalf("build info missing from scrape:\n%s", rr.Body.String())
	}
}

func TestOpenHandlerWithoutToken(t *testing.T) {
	m := newTestMetrics(t)
	rr := httptest.NewRecorder()
	m.HandlerWithToken("").ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/metrics", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("expected open /metrics 200, got %d", rr.Code)
	}
}

func TestJobAndCronHelpers(t *testing.T) {
	m := newTestMetrics(t)
	restore := SetMetrics(m)
	defer restore()

	JobEnqueued("send_email", "redis")
	JobCompleted("send_email", "redis")
	JobRetried("send_email", "redis")
	JobDeadLettered("send_email", "redis")
	JobDropped("unknown_type", "redis")
	SetQueueDepth("redis", "dead", 7)

	before := time.Now().Unix()
	CronRun("expire_stale_booking_holds", true)
	CronRun("process_weekly_tutor_payouts", false)

	checks := map[string]float64{
		`enqueued`:     testutil.ToFloat64(m.JobsEnqueuedTotal.WithLabelValues("send_email", "redis")),
		`completed`:    testutil.ToFloat64(m.JobsCompletedTotal.WithLabelValues("send_email", "redis")),
		`retried`:      testutil.ToFloat64(m.JobsRetriedTotal.WithLabelValues("send_email", "redis")),
		`deadlettered`: testutil.ToFloat64(m.JobsDeadLetteredTotal.WithLabelValues("send_email", "redis")),
		`dropped`:      testutil.ToFloat64(m.JobsDroppedTotal.WithLabelValues("unknown_type", "redis")),
		`queue depth`:  testutil.ToFloat64(m.QueueDepth.WithLabelValues("redis", "dead")),
	}
	for name, got := range checks {
		if got != 1 && name != "queue depth" {
			t.Errorf("%s = %v, want 1", name, got)
		}
	}
	if checks["queue depth"] != 7 {
		t.Errorf("queue depth = %v, want 7", checks["queue depth"])
	}

	cronTS := testutil.ToFloat64(m.CronLastSuccess.WithLabelValues("expire_stale_booking_holds"))
	if cronTS < float64(before) || cronTS > float64(time.Now().Unix()) {
		t.Fatalf("cron last-success timestamp out of range: %v", cronTS)
	}
	if payTS := testutil.ToFloat64(m.CronLastSuccess.WithLabelValues("process_weekly_tutor_payouts")); payTS != 0 {
		t.Fatalf("failed cron must not stamp last-success, got %v", payTS)
	}
}
