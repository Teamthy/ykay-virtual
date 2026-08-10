package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
)

type Role string

const (
	RoleStudent       Role = "STUDENT"
	RoleParent        Role = "PARENT"
	RoleTutor         Role = "TUTOR"
	RoleAcademicAdmin Role = "ACADEMIC_ADMIN"
	RoleSuperAdmin    Role = "SUPER_ADMIN"
)

type User struct {
	ID        string
	Email     string
	Password  string
	Roles     []Role
	CreatedAt time.Time
}

type RegisterRequest struct {
	Email    string
	Password string
	Roles    []string
}

type RegisterResponse struct {
	User User
}

type LoginRequest struct {
	Email    string
	Password string
}

type LoginResponse struct {
	Token string
	User  User
}

type Service struct {
	users map[string]User
}

func NewService() *Service {
	return &Service{users: make(map[string]User)}
}

func (s *Service) Register(_ context.Context, req RegisterRequest) (RegisterResponse, error) {
	if strings.TrimSpace(req.Email) == "" {
		return RegisterResponse{}, errors.New("email is required")
	}
	if strings.TrimSpace(req.Password) == "" {
		return RegisterResponse{}, errors.New("password is required")
	}
	if len(req.Roles) == 0 {
		return RegisterResponse{}, errors.New("at least one role is required")
	}
	if _, exists := s.users[strings.ToLower(req.Email)]; exists {
		return RegisterResponse{}, fmt.Errorf("email already registered: %s", req.Email)
	}

	roles := make([]Role, 0, len(req.Roles))
	for _, role := range req.Roles {
		switch Role(role) {
		case RoleStudent, RoleParent, RoleTutor, RoleAcademicAdmin, RoleSuperAdmin:
			roles = append(roles, Role(role))
		default:
			return RegisterResponse{}, fmt.Errorf("unsupported role: %s", role)
		}
	}

	user := User{
		ID:        fmt.Sprintf("user-%d", len(s.users)+1),
		Email:     strings.ToLower(req.Email),
		Password:  req.Password,
		Roles:     roles,
		CreatedAt: time.Now().UTC(),
	}
	s.users[user.Email] = user

	return RegisterResponse{User: user}, nil
}

func (s *Service) Login(_ context.Context, req LoginRequest) (LoginResponse, error) {
	user, exists := s.users[strings.ToLower(req.Email)]
	if !exists {
		return LoginResponse{}, errors.New("invalid credentials")
	}
	if user.Password != req.Password {
		return LoginResponse{}, errors.New("invalid credentials")
	}

	return LoginResponse{
		Token: fmt.Sprintf("token-%s", user.ID),
		User:  user,
	}, nil
}
