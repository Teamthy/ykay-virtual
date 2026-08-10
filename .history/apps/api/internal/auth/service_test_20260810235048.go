package auth

import (
	"context"
	"testing"
)

func TestRegisterAndLogin(t *testing.T) {
	service := NewService()

	regResp, err := service.Register(context.Background(), RegisterRequest{
		Email:    "parent@example.com",
		Password: "StrongPass123!",
		Roles:    []string{"PARENT"},
	})
	if err != nil {
		t.Fatalf("register failed: %v", err)
	}
	if regResp.User.Email != "parent@example.com" {
		t.Fatalf("unexpected email: %s", regResp.User.Email)
	}

	loginResp, err := service.Login(context.Background(), LoginRequest{
		Email:    "parent@example.com",
		Password: "StrongPass123!",
	})
	if err != nil {
		t.Fatalf("login failed: %v", err)
	}
	if loginResp.Token == "" {
		t.Fatal("expected a token")
	}
}

func TestRegisterRejectsDuplicateEmail(t *testing.T) {
	service := NewService()

	_, err := service.Register(context.Background(), RegisterRequest{
		Email:    "duplicate@example.com",
		Password: "StrongPass123!",
		Roles:    []string{"STUDENT"},
	})
	if err != nil {
		t.Fatalf("first registration failed: %v", err)
	}

	_, err = service.Register(context.Background(), RegisterRequest{
		Email:    "duplicate@example.com",
		Password: "AnotherPass123!",
		Roles:    []string{"PARENT"},
	})
	if err == nil {
		t.Fatal("expected duplicate email error")
	}
}
