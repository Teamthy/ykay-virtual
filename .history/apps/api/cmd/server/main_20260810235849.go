package main

import (
	"fmt"
	"net/http"

	"ykay-virtual/internal/auth"
	"ykay-virtual/internal/enrollments"
	"ykay-virtual/internal/programmes"
	"ykay-virtual/internal/tuitionrequests"
)

func main() {
	authService := auth.NewService()
	authHandler := auth.NewHandler(authService)
	programmesService := programmes.NewService()
	programmesHandler := programmes.NewHandler(programmesService)
	enrollmentsService := enrollments.NewService()
	enrollmentsHandler := enrollments.NewHandler(enrollmentsService)
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
	mux.HandleFunc("/api/v1/tuition-requests", tuitionRequestsHandler.Create)

	fmt.Println("API listening on :8080")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		panic(err)
	}
}
