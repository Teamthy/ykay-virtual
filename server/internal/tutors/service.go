package tutors

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
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

type QualificationFile struct {
	ID          string    `json:"id"`
	TutorID     string    `json:"tutorId"`
	Filename    string    `json:"filename"`
	StoragePath string    `json:"storagePath"`
	IsPublic    bool      `json:"isPublic"`
	UploadedAt  time.Time `json:"uploadedAt"`
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
	mu             sync.RWMutex
	profiles       []Profile
	qualifications map[string]QualificationFile
}

func NewService() *Service {
	return &Service{
		qualifications: make(map[string]QualificationFile),
	}
}

func (s *Service) CreateProfile(_ context.Context, req CreateProfileRequest) (CreateProfileResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

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
	s.mu.RLock()
	defer s.mu.RUnlock()
	return append([]Profile(nil), s.profiles...)
}

type UpdateProfileStatusResponse struct {
	Profile Profile `json:"profile"`
}

func (s *Service) UpdateProfileStatus(_ context.Context, id string, status string) (UpdateProfileStatusResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

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

// UploadQualification stores a qualification file in restricted storage (IsPublic=false).
func (s *Service) UploadQualification(_ context.Context, tutorID, filename string) (QualificationFile, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if strings.TrimSpace(tutorID) == "" || strings.TrimSpace(filename) == "" {
		return QualificationFile{}, errors.New("tutorId and filename are required")
	}

	id := fmt.Sprintf("qual-%d", len(s.qualifications)+1)
	qual := QualificationFile{
		ID:          id,
		TutorID:     strings.TrimSpace(tutorID),
		Filename:    strings.TrimSpace(filename),
		StoragePath: fmt.Sprintf("private/tutors/%s/evidence/%s", tutorID, filename),
		IsPublic:    false,
		UploadedAt:  time.Now().UTC(),
	}
	s.qualifications[id] = qual
	return qual, nil
}

// GetQualificationFile enforces AC-10: Tutor qualification files are not publicly accessible.
func (s *Service) GetQualificationFile(_ context.Context, fileID, requestRole, requestID string) (QualificationFile, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	qual, exists := s.qualifications[fileID]
	if !exists {
		return QualificationFile{}, errors.New("qualification file not found")
	}

	role := strings.ToUpper(strings.TrimSpace(requestRole))
	if role != "ACADEMIC_ADMIN" && role != "SUPER_ADMIN" && requestID != qual.TutorID {
		return QualificationFile{}, errors.New("forbidden: tutor qualification files are not publicly accessible")
	}

	return qual, nil
}
