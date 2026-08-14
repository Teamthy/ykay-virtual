package httpapi

import (
	"net/http"

	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/meeting"
	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"
)

// MeetingHandler — live-class meeting links (G4.2).
//
//	POST /api/v1/lessons/{lessonId}/meeting-link  tutor opens/refreshes the room
//	GET  /api/v1/lessons/{lessonId}/meeting-link  tutor OR participant join link
//	                                              (join window enforced for students)
//
// Profile identity is resolved through the G1.2 ProfileAuthorizer — the
// caller never supplies a profile id.
type MeetingHandler struct {
	svc   *service.MeetingService
	authz *ProfileAuthorizer
}

func NewMeetingHandler(svc *service.MeetingService, authz *ProfileAuthorizer) *MeetingHandler {
	return &MeetingHandler{svc: svc, authz: authz}
}

func isTutorRole(roles []string) bool {
	for _, r := range roles {
		if r == "TUTOR" || r == "SUPER_ADMIN" || r == "ACADEMIC_ADMIN" || r == "INSTITUTION_ADMIN" {
			return true
		}
	}
	return false
}

// OpenOrRefresh — tutor-only: create the meeting if absent, refresh when the
// previous link expired, otherwise return the existing one (idempotent).
func (h *MeetingHandler) OpenOrRefresh(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	if !isTutorRole(actor.Roles) {
		WriteAppError(w, pkg.Forbidden("tutor access required"))
		return
	}
	lessonID, err := ParseUUID(r, "lessonId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	tutorProfileID, err := h.authz.ResolveTutor(r.Context(), actor, "")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	m, err := h.svc.GetOrCreateTutorLink(r.Context(), lessonID, tutorProfileID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, meetingResponse(m, true), nil)
}

// Join — the session's learner fetches the join link (join window enforced);
// tutors may also use this route to retrieve the link they created.
func (h *MeetingHandler) Join(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	lessonID, err := ParseUUID(r, "lessonId")
	if err != nil {
		WriteAppError(w, err)
		return
	}

	if isTutorRole(actor.Roles) {
		profileID, perr := h.authz.ResolveTutor(r.Context(), actor, "")
		if perr != nil {
			WriteAppError(w, perr)
			return
		}
		m, merr := h.svc.GetOrCreateTutorLink(r.Context(), lessonID, profileID)
		if merr != nil {
			WriteAppError(w, merr)
			return
		}
		pkg.WriteSuccess(w, http.StatusOK, meetingResponse(m, true), nil)
		return
	}

	studentProfileID, err := h.authz.ResolveStudent(r.Context(), actor, "")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	m, err := h.svc.GetParticipantLink(r.Context(), lessonID, studentProfileID)
	if err != nil {
		if err == meeting.ErrJoinWindowClosed {
			pkg.WriteError(w, http.StatusForbidden, string(pkg.CodeForbidden),
				"join window is not open yet — you can join 15 minutes before the lesson", nil)
			return
		}
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, meetingResponse(m, false), nil)
}

func meetingResponse(m *booking.LessonMeeting, host bool) map[string]any {
	return map[string]any{
		"lesson_id":   m.LessonID,
		"provider":    m.Provider,
		"meeting_url": m.MeetingURL,
		"expires_at":  m.ExpiresAt,
		"host":        host,
	}
}
