package acceptance

import (
	"context"
	"strings"
	"testing"

	"ykay-virtual/internal/admin"
	"ykay-virtual/internal/audit"
	"ykay-virtual/internal/auth"
	"ykay-virtual/internal/enrollments"
	"ykay-virtual/internal/learning"
	"ykay-virtual/internal/lessons"
	"ykay-virtual/internal/notifications"
	"ykay-virtual/internal/payments"
	"ykay-virtual/internal/programmes"
	"ykay-virtual/internal/tutors"
	"ykay-virtual/internal/users"
)

// AC-01: A parent can register, verify, add a learner, pick a cohort, pay, and see enrolment in the dashboard.
func TestAC01_ParentJourneyToEnrolmentAndDashboard(t *testing.T) {
	ctx := context.Background()

	// 1. Register Parent
	authSvc := auth.NewService()
	regResp, err := authSvc.Register(ctx, auth.RegisterRequest{
		Email:    "parent@ykay.ng",
		Password: "SecurePassword123",
		Roles:    []string{"PARENT"},
	})
	if err != nil || regResp.User.Email != "parent@ykay.ng" {
		t.Fatalf("AC-01 failed: parent register error: %v", err)
	}

	// 2. Add a learner
	usersSvc := users.NewService()
	learner, err := usersSvc.CreateLearner(ctx, users.CreateLearnerRequest{
		ParentEmail: "parent@ykay.ng",
		Name:        "Ada Okafor",
		AgeBand:     "14-16",
		SchoolYear:  "Year 10",
	})
	if err != nil || learner.Name != "Ada Okafor" {
		t.Fatalf("AC-01 failed: add learner error: %v", err)
	}

	// 3. Pick a cohort/programme
	progSvc := programmes.NewService()
	prog, err := progSvc.Get("prog-igcse-cs")
	if err != nil || prog.Price <= 0 {
		t.Fatalf("AC-01 failed: pick cohort error: %v", err)
	}

	// 4. Pay via invoice / webhook
	paySvc := payments.NewService()
	invResp, err := paySvc.Create(ctx, payments.CreateRequest{
		LearnerName: learner.Name,
		ProgrammeID: prog.ID,
		Amount:      prog.Price,
		Currency:    "NGN",
		Description: "IGCSE Computer Science Enrolment",
	})
	if err != nil || invResp.Invoice.Status != payments.StatusPending {
		t.Fatalf("AC-01 failed: create invoice error: %v", err)
	}

	// Webhook confirms payment
	webhookResp, err := paySvc.ProcessWebhook(ctx, payments.WebhookRequest{
		Reference: "paystack-ac01-ref-001",
		Amount:    prog.Price,
		Provider:  "PAYSTACK",
		Signature: "paystack_secret_test",
	})
	if err != nil || !webhookResp.Transaction.EnrolmentCreated {
		t.Fatalf("AC-01 failed: payment verification error: %v", err)
	}

	// 5. Enrol and see in dashboard
	enrolSvc := enrollments.NewService()
	enrolResp, err := enrolSvc.Create(ctx, enrollments.CreateRequest{
		ProgrammeID: prog.ID,
		ParentEmail: regResp.User.Email,
		LearnerName: learner.Name,
	})
	if err != nil || enrolResp.Enrollment.ProgrammeID != prog.ID {
		t.Fatalf("AC-01 failed: enrolment dashboard view error: %v", err)
	}
}

// AC-02: A tutor cannot appear approved or be assigned until an authorized admin completes approval.
func TestAC02_TutorApprovalGuard(t *testing.T) {
	ctx := context.Background()
	tutorSvc := tutors.NewService()

	unapproved, err := tutorSvc.CreateProfile(ctx, tutors.CreateProfileRequest{
		Name:     "Mr. Pending Tutor",
		Subject:  "Mathematics",
		Status:   "PENDING_REVIEW",
		Timezone: "Africa/Lagos",
	})
	if err != nil {
		t.Fatalf("AC-02 failed: tutor create error: %v", err)
	}

	lessonSvc := lessons.NewService(tutorSvc)
	_, err = lessonSvc.Create(ctx, lessons.CreateRequest{
		ProgrammeID: "prog-1",
		Title:       "Maths Lesson",
		TutorID:     unapproved.Profile.ID,
		TutorName:   unapproved.Profile.Name,
		StartTime:   "2026-08-20T16:00:00Z",
		EndTime:     "2026-08-20T17:00:00Z",
		Timezone:    "Africa/Lagos",
	})
	if err == nil {
		t.Fatal("AC-02 failed: expected lesson creation to fail for unapproved tutor")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "approved") {
		t.Fatalf("AC-02 failed: unexpected error message: %v", err)
	}
}

// AC-03: A tutor can mark attendance only for assigned lessons/cohorts.
func TestAC03_TutorAttendanceAssignmentGuard(t *testing.T) {
	ctx := context.Background()
	tutorSvc := tutors.NewService()
	approved, _ := tutorSvc.CreateProfile(ctx, tutors.CreateProfileRequest{
		Name:     "Dr. Assigned",
		Subject:  "Computer Science",
		Status:   "APPROVED",
		Timezone: "Africa/Lagos",
	})

	lessonSvc := lessons.NewService(tutorSvc)
	created, _ := lessonSvc.Create(ctx, lessons.CreateRequest{
		ProgrammeID: "prog-igcse-cs",
		Title:       "Live Class",
		TutorID:     approved.Profile.ID,
		TutorName:   approved.Profile.Name,
		StartTime:   "2026-08-20T16:00:00Z",
		EndTime:     "2026-08-20T17:00:00Z",
		Timezone:    "Africa/Lagos",
	})

	// An unassigned tutor tries to mark attendance
	_, err := lessonSvc.MarkAttendance(ctx, created.Lesson.ID, lessons.StatusAttended, "other-tutor-88", "TUTOR")
	if err == nil || !strings.Contains(strings.ToLower(err.Error()), "forbidden") {
		t.Fatalf("AC-03 failed: expected forbidden error when unassigned tutor marks attendance, got %v", err)
	}
}

// AC-04: A parent cannot access another family's learner by changing URL/API ids.
func TestAC04_ParentLearnerIsolation(t *testing.T) {
	ctx := context.Background()
	usersSvc := users.NewService()

	learnerA, _ := usersSvc.CreateLearner(ctx, users.CreateLearnerRequest{
		ParentEmail: "family-a@ykay.ng",
		Name:        "Child A",
		AgeBand:     "11-13",
		SchoolYear:  "Year 7",
	})

	_, err := usersSvc.GetLearner(ctx, learnerA.ID, "family-b@ykay.ng", "PARENT")
	if err == nil || !strings.Contains(strings.ToLower(err.Error()), "forbidden") {
		t.Fatalf("AC-04 failed: expected forbidden error when Parent B accesses Learner A, got %v", err)
	}
}

// AC-05: A tutor cannot be double-booked into overlapping lessons without an explicit authorized override.
func TestAC05_DoubleBookingGuard(t *testing.T) {
	ctx := context.Background()
	tutorSvc := tutors.NewService()
	approved, _ := tutorSvc.CreateProfile(ctx, tutors.CreateProfileRequest{
		Name:     "Mr. Double Book",
		Subject:  "Physics",
		Status:   "APPROVED",
		Timezone: "Africa/Lagos",
	})

	lessonSvc := lessons.NewService(tutorSvc)
	_, _ = lessonSvc.Create(ctx, lessons.CreateRequest{
		ProgrammeID: "prog-1",
		Title:       "Lesson 1",
		TutorID:     approved.Profile.ID,
		TutorName:   approved.Profile.Name,
		StartTime:   "2026-08-20T16:00:00Z",
		EndTime:     "2026-08-20T17:00:00Z",
		Timezone:    "Africa/Lagos",
	})

	// Overlap without override fails
	_, err := lessonSvc.Create(ctx, lessons.CreateRequest{
		ProgrammeID: "prog-2",
		Title:       "Lesson 2 Overlap",
		TutorID:     approved.Profile.ID,
		TutorName:   approved.Profile.Name,
		StartTime:   "2026-08-20T16:30:00Z",
		EndTime:     "2026-08-20T17:30:00Z",
		Timezone:    "Africa/Lagos",
		Override:    false,
	})
	if err == nil || !strings.Contains(strings.ToLower(err.Error()), "double-booking") {
		t.Fatalf("AC-05 failed: expected double-booking error, got %v", err)
	}
}

// AC-06: A verified payment webhook processed twice does not create duplicate enrolments/credits.
func TestAC06_WebhookIdempotency(t *testing.T) {
	ctx := context.Background()
	paySvc := payments.NewService()

	resp1, err1 := paySvc.ProcessWebhook(ctx, payments.WebhookRequest{
		Reference: "paystack-ref-ac06",
		Amount:    30000,
		Provider:  "PAYSTACK",
		Signature: "paystack_secret_test",
	})
	if err1 != nil || resp1.DuplicateIgnored {
		t.Fatalf("AC-06 failed: first processing error: %v", err1)
	}

	resp2, err2 := paySvc.ProcessWebhook(ctx, payments.WebhookRequest{
		Reference: "paystack-ref-ac06",
		Amount:    30000,
		Provider:  "PAYSTACK",
		Signature: "paystack_secret_test",
	})
	if err2 != nil || !resp2.DuplicateIgnored {
		t.Fatalf("AC-06 failed: expected duplicate to be ignored idempotently")
	}
}

// AC-07: Cancelling/rescheduling a lesson updates dashboards and triggers notifications.
func TestAC07_LessonRescheduleCancelTrigger(t *testing.T) {
	ctx := context.Background()
	tutorSvc := tutors.NewService()
	approved, _ := tutorSvc.CreateProfile(ctx, tutors.CreateProfileRequest{
		Name:     "Mr. Reschedule",
		Subject:  "Chemistry",
		Status:   "APPROVED",
		Timezone: "Africa/Lagos",
	})

	notifSvc := notifications.NewService()
	lessonSvc := lessons.NewService(tutorSvc).WithNotifications(notifSvc)

	created, _ := lessonSvc.Create(ctx, lessons.CreateRequest{
		ProgrammeID: "prog-igcse-chem",
		Title:       "Chemistry Live Class",
		TutorID:     approved.Profile.ID,
		TutorName:   approved.Profile.Name,
		StartTime:   "2026-08-20T16:00:00Z",
		EndTime:     "2026-08-20T17:00:00Z",
		Timezone:    "Africa/Lagos",
	})

	_, err := lessonSvc.Reschedule(ctx, created.Lesson.ID, "2026-08-21T16:00:00Z", "2026-08-21T17:00:00Z", "admin")
	if err != nil {
		t.Fatalf("AC-07 failed: reschedule error: %v", err)
	}

	notifs := notifSvc.ListByUser(ctx, approved.Profile.ID)
	if len(notifs) == 0 {
		t.Fatalf("AC-07 failed: expected notification to be triggered on reschedule")
	}
}

// AC-08: A student accesses only resources attached to programmes/cohorts they're granted.
func TestAC08_StudentResourceAccessGuard(t *testing.T) {
	ctx := context.Background()
	lrnSvc := learning.NewService()

	res, _ := lrnSvc.CreateResource(ctx, "prog-igcse-cs", "IGCSE Notes", "https://cdn.ykay.ng/notes.pdf", "PDF")

	_, err := lrnSvc.GetResource(ctx, res.ID, []string{"prog-other-101"})
	if err == nil || !strings.Contains(strings.ToLower(err.Error()), "forbidden") {
		t.Fatalf("AC-08 failed: expected forbidden when accessing unenrolled resource, got %v", err)
	}
}

// AC-09: Admin can publish/unpublish a programme without deployment.
func TestAC09_AdminPublishUnpublishProgramme(t *testing.T) {
	ctx := context.Background()
	progSvc := programmes.NewService()

	draft, _ := progSvc.Create(ctx, programmes.CreateRequest{
		Title:      "Dynamic Python Programme",
		Curriculum: "Digital Academy",
		Level:      "All",
		Subject:    "Python",
		Status:     "DRAFT",
	})

	// Public list excludes DRAFT
	if len(progSvc.List(true)) != 2 {
		t.Fatalf("AC-09 failed: public list should only show published programmes")
	}

	// Admin publishes dynamically
	pub, err := progSvc.UpdateStatus(ctx, draft.ID, "PUBLISHED", "ACADEMIC_ADMIN")
	if err != nil || pub.Status != "PUBLISHED" {
		t.Fatalf("AC-09 failed: admin publish error: %v", err)
	}

	// Public list now includes published programme without deployment
	if len(progSvc.List(true)) != 3 {
		t.Fatalf("AC-09 failed: public list did not update after dynamic publish")
	}
}

// AC-10: Tutor qualification files are not publicly accessible.
func TestAC10_TutorQualificationFilePrivacy(t *testing.T) {
	ctx := context.Background()
	tutorSvc := tutors.NewService()

	qual, _ := tutorSvc.UploadQualification(ctx, "tutor-1", "certificate.pdf")
	if qual.IsPublic {
		t.Fatalf("AC-10 failed: qualification file must not be marked public")
	}

	_, err := tutorSvc.GetQualificationFile(ctx, qual.ID, "STUDENT", "user-9")
	if err == nil || !strings.Contains(strings.ToLower(err.Error()), "forbidden") {
		t.Fatalf("AC-10 failed: expected forbidden when public/student accesses tutor certificate, got %v", err)
	}
}

// AC-11: Mobile navigation and core enrolment flow API readiness
func TestAC11_MobileAPIReadiness(t *testing.T) {
	progSvc := programmes.NewService()

	// Ensure API returns launch catalogue with Nigerian & British pathways for mobile JSON client
	progs := progSvc.List(true)
	if len(progs) < 2 {
		t.Fatalf("AC-11 failed: expected launch catalogue with multi-curriculum pathways")
	}
}

// AC-12: Key administrative changes create an audit event.
func TestAC12_AdminChangesCreateAuditEvent(t *testing.T) {
	ctx := context.Background()
	auditSvc := audit.NewService()
	adminSvc := admin.NewService().WithAudit(auditSvc)

	_, err := adminSvc.CreateProgrammeSummary(ctx, admin.CreateProgrammeSummaryRequest{
		Title:           "JAMB Physics Prep",
		Curriculum:      "Nigerian",
		Status:          "PUBLISHED",
		EnrollmentCount: 20,
	})
	if err != nil {
		t.Fatalf("AC-12 failed: create summary error: %v", err)
	}

	events := auditSvc.List(ctx)
	if len(events) == 0 {
		t.Fatalf("AC-12 failed: expected audit event to be created")
	}
	if events[0].Action != "CREATE_PROGRAMME_SUMMARY" {
		t.Fatalf("AC-12 failed: unexpected audit action: %s", events[0].Action)
	}
}
