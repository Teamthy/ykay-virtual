package lessons

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

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
	TutorName   string    `json:"tutorName"`
	StartTime   time.Time `json:"startTime"`
	EndTime     time.Time `json:"endTime"`
	Timezone    string    `json:"timezone"`
	Status      Status    `json:"status"`
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
}

func NewService(tutorService *tutors.Service) *Service {
	return &Service{tutorService: tutorService}
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

	lesson := Lesson{
		ID:          fmt.Sprintf("lesson-%d", len(s.lessons)+1),
		ProgrammeID: req.ProgrammeID,
		Title:       strings.TrimSpace(req.Title),
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

func (s *Service) MarkAttendance(_ context.Context, lessonID string, status Status) (Lesson, error) {
	for i := range s.lessons {
		if s.lessons[i].ID == lessonID {
			s.lessons[i].Status = status
			s.lessons[i].UpdatedAt = time.Now().UTC()
			return s.lessons[i], nil
		}
	}
	return Lesson{}, errors.New("lesson not found")
}
