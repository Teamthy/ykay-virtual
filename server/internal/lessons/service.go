package lessons

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"ykay-virtual/internal/notifications"
	"ykay-virtual/internal/tutors"
)

type Status string

const (
	StatusScheduled Status = "SCHEDULED"
	StatusAttended  Status = "ATTENDED"
	StatusCancelled Status = "CANCELLED"
)

type Lesson struct {
	ID          string    `json:"id"`
	ProgrammeID string    `json:"programmeId"`
	Title       string    `json:"title"`
	TutorID     string    `json:"tutorId"`
	TutorName   string    `json:"tutorName"`
	StartTime   time.Time `json:"startTime"`
	EndTime     time.Time `json:"endTime"`
	Timezone    string    `json:"timezone"`
	Status      Status    `json:"status"`
	Outcome     string    `json:"outcome,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type CreateRequest struct {
	ProgrammeID string `json:"programmeId"`
	Title       string `json:"title"`
	TutorID     string `json:"tutorId"`
	TutorName   string `json:"tutorName"`
	StartTime   string `json:"startTime"`
	EndTime     string `json:"endTime"`
	Timezone    string `json:"timezone"`
	Override    bool   `json:"override"`
}

type CreateResponse struct {
	Lesson Lesson `json:"lesson"`
}

type ListResponse struct {
	Lessons []Lesson `json:"lessons"`
}

type Service struct {
	lessons      []Lesson
	tutorService *tutors.Service
	notifService *notifications.Service
}

func NewService(tutorService *tutors.Service) *Service {
	return &Service{tutorService: tutorService}
}

func (s *Service) WithNotifications(n *notifications.Service) *Service {
	s.notifService = n
	return s
}

func (s *Service) Create(_ context.Context, req CreateRequest) (CreateResponse, error) {
	if strings.TrimSpace(req.ProgrammeID) == "" {
		return CreateResponse{}, errors.New("programme id is required")
	}
	if strings.TrimSpace(req.Title) == "" {
		return CreateResponse{}, errors.New("title is required")
	}
	if strings.TrimSpace(req.TutorName) == "" {
		return CreateResponse{}, errors.New("tutor name is required")
	}
	if strings.TrimSpace(req.TutorID) == "" {
		return CreateResponse{}, errors.New("tutor id is required")
	}
	if s.tutorService != nil {
		profiles := s.tutorService.ListProfiles(context.Background())
		approved := false
		for _, profile := range profiles {
			if profile.ID == req.TutorID && strings.EqualFold(profile.Status, "APPROVED") {
				approved = true
				break
			}
		}
		if !approved {
			return CreateResponse{}, errors.New("selected tutor must be approved")
		}
	}
	startTime, err := time.Parse(time.RFC3339, req.StartTime)
	if err != nil {
		return CreateResponse{}, errors.New("start time must be a valid RFC3339 timestamp")
	}
	endTime, err := time.Parse(time.RFC3339, req.EndTime)
	if err != nil {
		return CreateResponse{}, errors.New("end time must be a valid RFC3339 timestamp")
	}
	if endTime.Before(startTime) {
		return CreateResponse{}, errors.New("end time must be after start time")
	}

	// AC-05: Double-booking guard
	for _, existing := range s.lessons {
		if existing.TutorID == req.TutorID && existing.Status == StatusScheduled {
			if startTime.Before(existing.EndTime) && endTime.After(existing.StartTime) {
				if !req.Override {
					return CreateResponse{}, errors.New("double-booking forbidden: tutor already scheduled during this time window without authorized override")
				}
			}
		}
	}

	lesson := Lesson{
		ID:          fmt.Sprintf("lesson-%d", len(s.lessons)+1),
		ProgrammeID: req.ProgrammeID,
		Title:       strings.TrimSpace(req.Title),
		TutorID:     strings.TrimSpace(req.TutorID),
		TutorName:   strings.TrimSpace(req.TutorName),
		StartTime:   startTime.UTC(),
		EndTime:     endTime.UTC(),
		Timezone:    strings.TrimSpace(req.Timezone),
		Status:      StatusScheduled,
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
	}
	s.lessons = append(s.lessons, lesson)

	return CreateResponse{Lesson: lesson}, nil
}

func (s *Service) List(_ context.Context) ListResponse {
	return ListResponse{Lessons: append([]Lesson(nil), s.lessons...)}
}

// MarkAttendance enforces AC-03: A tutor can mark attendance only for assigned lessons/cohorts.
func (s *Service) MarkAttendance(ctx context.Context, lessonID string, status Status, actorID string, actorRole string) (Lesson, error) {
	for i := range s.lessons {
		if s.lessons[i].ID == lessonID {
			if strings.EqualFold(actorRole, "TUTOR") && actorID != "" && actorID != s.lessons[i].TutorID {
				return Lesson{}, errors.New("forbidden: tutor can only mark attendance for assigned lessons")
			}
			s.lessons[i].Status = status
			s.lessons[i].UpdatedAt = time.Now().UTC()
			if status == StatusAttended {
				s.lessons[i].Outcome = "Completed successfully"
			} else if status == StatusCancelled {
				s.lessons[i].Outcome = "Cancelled"
			} else {
				s.lessons[i].Outcome = ""
			}
			return s.lessons[i], nil
		}
	}
	return Lesson{}, errors.New("lesson not found")
}

// Reschedule implements AC-07: Cancelling/rescheduling a lesson updates dashboards and triggers notifications.
func (s *Service) Reschedule(ctx context.Context, lessonID string, newStartTime, newEndTime string, actor string) (Lesson, error) {
	startTime, err := time.Parse(time.RFC3339, newStartTime)
	if err != nil {
		return Lesson{}, errors.New("start time must be a valid RFC3339 timestamp")
	}
	endTime, err := time.Parse(time.RFC3339, newEndTime)
	if err != nil {
		return Lesson{}, errors.New("end time must be a valid RFC3339 timestamp")
	}
	if endTime.Before(startTime) {
		return Lesson{}, errors.New("end time must be after start time")
	}

	for i := range s.lessons {
		if s.lessons[i].ID == lessonID {
			s.lessons[i].StartTime = startTime.UTC()
			s.lessons[i].EndTime = endTime.UTC()
			s.lessons[i].UpdatedAt = time.Now().UTC()
			s.lessons[i].Outcome = fmt.Sprintf("Rescheduled by %s", actor)

			if s.notifService != nil {
				_, _ = s.notifService.Send(ctx, notifications.SendRequest{
					UserID:    s.lessons[i].TutorID,
					Recipient: s.lessons[i].TutorName,
					Kind:      "LESSON_RESCHEDULED",
					Channel:   notifications.ChannelEmail,
					Message:   fmt.Sprintf("Lesson %s has been rescheduled to %s", s.lessons[i].Title, newStartTime),
				})
			}
			return s.lessons[i], nil
		}
	}
	return Lesson{}, errors.New("lesson not found")
}

// Cancel implements AC-07: Cancelling/rescheduling a lesson updates dashboards and triggers notifications.
func (s *Service) Cancel(ctx context.Context, lessonID string, reason string, actor string) (Lesson, error) {
	for i := range s.lessons {
		if s.lessons[i].ID == lessonID {
			s.lessons[i].Status = StatusCancelled
			s.lessons[i].UpdatedAt = time.Now().UTC()
			s.lessons[i].Outcome = fmt.Sprintf("Cancelled by %s: %s", actor, reason)

			if s.notifService != nil {
				_, _ = s.notifService.Send(ctx, notifications.SendRequest{
					UserID:    s.lessons[i].TutorID,
					Recipient: s.lessons[i].TutorName,
					Kind:      "LESSON_CANCELLED",
					Channel:   notifications.ChannelEmail,
					Message:   fmt.Sprintf("Lesson %s has been cancelled: %s", s.lessons[i].Title, reason),
				})
			}
			return s.lessons[i], nil
		}
	}
	return Lesson{}, errors.New("lesson not found")
}
