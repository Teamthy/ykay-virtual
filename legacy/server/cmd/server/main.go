package main

import (
	"fmt"
	"net/http"

	"ykay-legacy/internal/admin"
	"ykay-legacy/internal/auth"
	"ykay-legacy/internal/enrollments"
	"ykay-legacy/internal/lessons"
	"ykay-legacy/internal/payments"
	"ykay-legacy/internal/programmes"
	"ykay-legacy/internal/support"
	"ykay-legacy/internal/tuitionrequests"
	"ykay-legacy/internal/tutors"
)

func main() {
	authService := auth.NewService()
	authHandler := auth.NewHandler(authService)
	programmesService := programmes.NewService()
	programmesHandler := programmes.NewHandler(programmesService)
	enrollmentsService := enrollments.NewService()
	enrollmentsHandler := enrollments.NewHandler(enrollmentsService)
	tutorsService := tutors.NewService()
	tutorsHandler := tutors.NewHandler(tutorsService)
	lessonsService := lessons.NewService(tutorsService)
	lessonsHandler := lessons.NewHandler(lessonsService)
	adminService := admin.NewService()
	adminHandler := admin.NewHandler(adminService)
	paymentsService := payments.NewService()
	paymentsHandler := payments.NewHandler(paymentsService)
	supportService := support.NewService()
	supportHandler := support.NewHandler(supportService)
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
	mux.HandleFunc("/api/v1/support/tickets", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			supportHandler.List(w, r)
		case http.MethodPost:
			supportHandler.Create(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})
	mux.HandleFunc("/api/v1/payments", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			paymentsHandler.List(w, r)
		case http.MethodPost:
			paymentsHandler.Create(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})
	mux.HandleFunc("/api/v1/payments/mark-paid", paymentsHandler.MarkPaid)
	mux.HandleFunc("/api/v1/support/tickets/status", supportHandler.UpdateStatus)
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
	mux.HandleFunc("/api/v1/tutors/status", tutorsHandler.UpdateStatus)
	mux.HandleFunc("/api/v1/tuition-requests", tuitionRequestsHandler.Create)

	fmt.Println("API listening on :8080")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		panic(err)
	}
}
