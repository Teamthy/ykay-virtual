package tutors

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
)

type Profile struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Subject   string    `json:"subject"`
	Status    string    `json:"status"`
	Timezone  string    `json:"timezone"`
	CreatedAt time.Time `json:"createdAt"`
}

type CreateProfileRequest struct {
	Name     string `json:"name"`
	Subject  string `json:"subject"`
	Status   string `json:"status"`
	Timezone string `json:"timezone"`
}

type CreateProfileResponse struct {
	Profile Profile `json:"profile"`
}

type Service struct {
	profiles []Profile
}

func NewService() *Service {
	return &Service{}
}

func (s *Service) CreateProfile(_ context.Context, req CreateProfileRequest) (CreateProfileResponse, error) {
	if strings.TrimSpace(req.Name) == "" {
		return CreateProfileResponse{}, errors.New("name is required")
	}
	if strings.TrimSpace(req.Subject) == "" {
		return CreateProfileResponse{}, errors.New("subject is required")
	}

	status := strings.TrimSpace(req.Status)
	if status == "" {
		status = "PENDING_REVIEW"
	}

	profile := Profile{
		ID:        fmt.Sprintf("tutor-%d", len(s.profiles)+1),
		Name:      strings.TrimSpace(req.Name),
		Subject:   strings.TrimSpace(req.Subject),
		Status:    status,
		Timezone:  strings.TrimSpace(req.Timezone),
		CreatedAt: time.Now().UTC(),
	}
	s.profiles = append(s.profiles, profile)

	return CreateProfileResponse{Profile: profile}, nil
}

func (s *Service) ListProfiles(_ context.Context) []Profile {
	return append([]Profile(nil), s.profiles...)
}

type UpdateProfileStatusResponse struct {
	Profile Profile `json:"profile"`
}

func (s *Service) UpdateProfileStatus(_ context.Context, id string, status string) (UpdateProfileStatusResponse, error) {
	trimmedStatus := strings.TrimSpace(status)
	if trimmedStatus == "" {
		return UpdateProfileStatusResponse{}, errors.New("status is required")
	}

	for i := range s.profiles {
		if s.profiles[i].ID == id {
			s.profiles[i].Status = trimmedStatus
			return UpdateProfileStatusResponse{Profile: s.profiles[i]}, nil
		}
	}

	return UpdateProfileStatusResponse{}, errors.New("profile not found")
}
