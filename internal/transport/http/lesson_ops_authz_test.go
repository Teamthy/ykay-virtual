package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/service"

	"github.com/google/uuid"
)

func mustJSON(t *testing.T, v any) string {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	return string(b)
}

func containsStr(s, needle string) bool {
	return strings.Contains(s, needle)
}

// YK-002 negative-authorization regressions:
//   - Unauthenticated lesson-schedule responses MUST NOT leak meeting_url or
//     video_url (live classroom + paid video URLs).
//   - Attendance (learner records) and notes/homework MUST require
//     authentication; the handler must return 401, not data.

func TestPublicLessonView_RedactsPrivateURLs(t *testing.T) {
	vid := "https://cdn.nuvora.com/videos/lesson1.mp4"
	meet := "https://whereby.com/nuvora/room-abc"
	ls := []booking.Lesson{
		{
			ID:              uuid.New(),
			Title:           "Algebra 101",
			StartAt:         time.Now(),
			EndAt:           time.Now().Add(time.Hour),
			Timezone:        "Africa/Lagos",
			Status:          booking.LessonScheduled,
			MeetingURL:      &meet,
			MeetingProvider: "whereby",
			VideoURL:        &vid,
		},
	}
	view := toPublicLessonView(ls)
	if len(view) != 1 {
		t.Fatalf("expected 1 public lesson, got %d", len(view))
	}
	if view[0].Title != "Algebra 101" || view[0].Timezone != "Africa/Lagos" {
		t.Fatalf("public view dropped schedule fields: %+v", view[0])
	}
	// The DTO has no meeting_url / video_url fields by construction; the real
	// guard is that the JSON payload contains neither key nor value. Verify by
	// asserting the raw lesson still holds them (i.e. we didn't accidentally
	// mutate the source) and that the redaction strips them.
	if ls[0].MeetingURL == nil || ls[0].VideoURL == nil {
		t.Fatal("source lesson URLs were mutated — redaction must not mutate source")
	}
	// Ensure the public view never contains the private values.
	serialized := mustJSON(t, view)
	for _, leak := range []string{vid, meet, "meeting_url", "video_url"} {
		if containsStr(serialized, leak) {
			t.Fatalf("public lesson view leaked private value %q", leak)
		}
	}
}

func TestListAttendance_RequiresTutor(t *testing.T) {
	h := NewLessonOpsHandler(service.NewLessonService(nil, nil, nil, nil, nil))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/lessons/00000000-0000-0000-0000-000000000001/attendance", nil)
	rec := httptest.NewRecorder()
	h.ListAttendance(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("unauthenticated attendance should be 401, got %d (%s)", rec.Code, rec.Body.String())
	}
}

func TestListNotes_RequiresAuth(t *testing.T) {
	h := NewLessonOpsHandler(service.NewLessonService(nil, nil, nil, nil, nil))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/lessons/00000000-0000-0000-0000-000000000001/notes", nil)
	rec := httptest.NewRecorder()
	h.ListNotes(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("unauthenticated notes should be 401, got %d (%s)", rec.Code, rec.Body.String())
	}
}

func TestListResources_RequiresAuth(t *testing.T) {
	h := NewLessonOpsHandler(service.NewLessonService(nil, nil, nil, nil, nil))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/cohorts/00000000-0000-0000-0000-000000000001/resources", nil)
	rec := httptest.NewRecorder()
	h.ListResources(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("unauthenticated resources should be 401, got %d (%s)", rec.Code, rec.Body.String())
	}
}
