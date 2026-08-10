package main

import (
	"fmt"
	"net/http"

	"ykay-virtual/internal/admin"
	"ykay-virtual/internal/auth"
	"ykay-virtual/internal/enrollments"
	"ykay-virtual/internal/lessons"
	"ykay-virtual/internal/programmes"
	"ykay-virtual/internal/support"
	"ykay-virtual/internal/tuitionrequests"
	"ykay-virtual/internal/tutors"
)

func main() {
	authService := auth.NewService()
	authHandler := auth.NewHandler(authService)
	programmesService := programmes.NewService()
	programmesHandler := programmes.NewHandler(programmesService)
	enrollmentsService := enrollments.NewService()
	enrollmentsHandler := enrollments.NewHandler(enrollmentsService)
	lessonsService := lessons.NewService()
	lessonsHandler := lessons.NewHandler(lessonsService)
	adminService := admin.NewService()
	adminHandler := admin.NewHandler(adminService)
	supportService := support.NewService()
	supportHandler := support.NewHandler(supportService)
	tutorsService := tutors.NewService()
	tutorsHandler := tutors.NewHandler(tutorsService)
	tuitionRequestsService := tuitionrequests.NewService()
	tuitionRequestsHandler := tuitionrequests.NewHandler(tuitionRequestsService)

	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	mux.HandleFunc("/api/v1/auth/register", authHandler.Register)
	mux.HandleFunc("/api/v1/auth/login", authHandler.Login)
	mux.HandleFunc("/api/v1/programmes", programmesHandler.List)
	mux.HandleFunc("/api/v1/programmes/", programmesHandler.Get)
	mux.HandleFunc("/api/v1/enrollments", enrollmentsHandler.Create)
	mux.HandleFunc("/api/v1/lessons", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			lessonsHandler.List(w, r)
		case http.MethodPost:
			lessonsHandler.Create(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})
	mux.HandleFunc("/api/v1/lessons/", lessonsHandler.MarkAttendance)
	mux.HandleFunc("/api/v1/admin/programme-summaries", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			adminHandler.ListProgrammeSummaries(w, r)
		case http.MethodPost:
			adminHandler.CreateProgrammeSummary(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})
	mux.HandleFunc("/api/v1/support/tickets", supportHandler.Create)
	mux.HandleFunc("/api/v1/tutors", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			tutorsHandler.ListProfiles(w, r)
		case http.MethodPost:
			tutorsHandler.CreateProfile(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})
	mux.HandleFunc("/api/v1/tuition-requests", tuitionRequestsHandler.Create)

	fmt.Println("API listening on :8080")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		panic(err)
	}
}
