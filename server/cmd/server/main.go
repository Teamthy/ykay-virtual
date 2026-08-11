package main

import (
	"fmt"
	"net/http"
	"os"

	"ykay-virtual/internal/admin"
	"ykay-virtual/internal/audit"
	"ykay-virtual/internal/auth"
	"ykay-virtual/internal/enrollments"
	"ykay-virtual/internal/learning"
	"ykay-virtual/internal/lessons"
	"ykay-virtual/internal/notifications"
	"ykay-virtual/internal/payments"
	"ykay-virtual/internal/programmes"
	"ykay-virtual/internal/support"
	"ykay-virtual/internal/tuitionrequests"
	"ykay-virtual/internal/tutors"
	"ykay-virtual/internal/users"
)

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Actor-ID, X-Actor-Role")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	auditService := audit.NewService()
	notifService := notifications.NewService()
	_ = users.NewService()
	_ = learning.NewService()

	authService := auth.NewService()
	authHandler := auth.NewHandler(authService)
	programmesService := programmes.NewService()
	programmesHandler := programmes.NewHandler(programmesService)
	enrollmentsService := enrollments.NewService()
	enrollmentsHandler := enrollments.NewHandler(enrollmentsService)
	tutorsService := tutors.NewService()
	tutorsHandler := tutors.NewHandler(tutorsService)
	lessonsService := lessons.NewService(tutorsService).WithNotifications(notifService)
	lessonsHandler := lessons.NewHandler(lessonsService)
	adminService := admin.NewService().WithAudit(auditService)
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
	mux.HandleFunc("/api/v1/programmes", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			programmesHandler.List(w, r)
		case http.MethodPost:
			programmesHandler.Create(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})
	mux.HandleFunc("/api/v1/programmes/status", programmesHandler.UpdateStatus)
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
	mux.HandleFunc("/api/v1/lessons/reschedule", lessonsHandler.Reschedule)
	mux.HandleFunc("/api/v1/lessons/cancel", lessonsHandler.Cancel)
	mux.HandleFunc("/api/v1/lessons/", lessonsHandler.MarkAttendance)
	mux.HandleFunc("/api/v1/admin/kpis", adminHandler.GetKPIs)
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
	mux.HandleFunc("/api/v1/payments/webhook", paymentsHandler.HandleWebhook)
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

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	addr := fmt.Sprintf("0.0.0.0:%s", port)
	fmt.Printf("API listening on %s\n", addr)
	if err := http.ListenAndServe(addr, corsMiddleware(mux)); err != nil {
		panic(err)
	}
}
