package main

// Seed a fully vetted tutor + LMS pack against the same Postgres as
// seedusers. The tutor is created as an ACTIVE TUTOR account when missing
// (password from --tutor-password or SEED_OPERATOR_PASSWORD — the same
// password you use for the seeded admins), their vetting profile is APPROVED
// and public with a passed competency assessment, and the LMS pack includes:
// a recorded demo video lesson, a study-material PDF, an assignment, a
// lesson note with homework, a weekly availability schedule and one enrolled
// demo student so the tutor roster is populated end to end.
//
//	go run ./cmd/seedlms --tutor-email samaliu333@gmail.com
//
// (set SEED_OPERATOR_PASSWORD in the environment, or pass --tutor-password.)
import (
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	_ "github.com/lib/pq"

	"ykay-virtual/internal/ops"
)

const (
	defaultTutorEmail = "local.tutor@nuvora.test"
	demoStudentEmail  = "local.student@nuvora.test"
	progSlug          = "utme-mastery-lms"
	cohortSlug        = "utme-2026-lms-demo"
	lessonTitle       = "Algebra foundations (recorded)"
	videoURL          = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
	pdfURL            = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
)

func main() {
	allowProd := flag.Bool("allow-prod", false, "allow seeding when ENVIRONMENT=production")
	tutorEmail := flag.String("tutor-email", defaultTutorEmail, "tutor account email (created if missing)")
	tutorPassword := flag.String("tutor-password", "", "tutor login password (defaults to SEED_OPERATOR_PASSWORD / OPERATOR_PASSWORD)")
	flag.Parse()

	env := strings.ToLower(strings.TrimSpace(os.Getenv("ENVIRONMENT")))
	if (env == "production" || env == "prod") && !*allowProd {
		log.Fatal("refusing to seed LMS pack in production (pass --allow-prod if you really mean it)")
	}

	email := strings.ToLower(strings.TrimSpace(*tutorEmail))
	if !strings.Contains(email, "@") {
		log.Fatalf("--tutor-email must be a valid email, got %q", email)
	}
	password := strings.TrimSpace(*tutorPassword)
	if password == "" {
		password = strings.TrimSpace(os.Getenv("SEED_OPERATOR_PASSWORD"))
	}
	if password == "" {
		password = strings.TrimSpace(os.Getenv("OPERATOR_PASSWORD"))
	}

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://nuvora:nuvora@localhost:5432/nuvora?sslmode=disable"
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		log.Fatalf("database: %v", err)
	}

	// ── Tutor account: create when missing, sync role (and password when one
	// was supplied) when present.
	var userID string
	err = db.QueryRow(`SELECT id::text FROM users WHERE email = $1 AND deleted_at IS NULL`, email).Scan(&userID)
	if err == sql.ErrNoRows {
		if password == "" {
			log.Fatalf("%s does not exist — set SEED_OPERATOR_PASSWORD (the admin seed password) or pass --tutor-password so the account can be created", email)
		}
		if perr := ops.ValidatePassword(password); perr != nil {
			log.Fatalf("tutor password invalid: %v", perr)
		}
		if perr := ops.UpsertUser(db, email, "TUTOR", password); perr != nil {
			log.Fatalf("create tutor account: %v", perr)
		}
		if err = db.QueryRow(`SELECT id::text FROM users WHERE email = $1 AND deleted_at IS NULL`, email).Scan(&userID); err != nil {
			log.Fatalf("read back tutor account: %v", err)
		}
		fmt.Println("tutor account created:", email, "(password = SEED_OPERATOR_PASSWORD/--tutor-password)")
	} else if err != nil {
		log.Fatalf("tutor account lookup: %v", err)
	} else {
		// Existing account: re-sync the password when one was supplied (keeps
		// the tutor aligned with the admin seed password) and make sure the
		// account is ACTIVE + verified + carries the TUTOR role.
		if password != "" {
			if perr := ops.ValidatePassword(password); perr != nil {
				log.Fatalf("tutor password invalid: %v", perr)
			}
			if perr := ops.UpsertUser(db, email, "TUTOR", password); perr != nil {
				log.Fatalf("sync tutor account: %v", perr)
			}
			fmt.Println("tutor account synced:", email, "(password = SEED_OPERATOR_PASSWORD/--tutor-password)")
		} else {
			_, _ = db.Exec(`
				INSERT INTO user_roles (user_id, role_id)
				SELECT $1::uuid, r.id FROM roles r WHERE r.name = 'TUTOR'
				ON CONFLICT (user_id, role_id) DO NOTHING`, userID)
			_, _ = db.Exec(`UPDATE users SET status = 'ACTIVE', email_verified_at = COALESCE(email_verified_at, NOW()), onboarded_at = COALESCE(onboarded_at, NOW()) WHERE id = $1::uuid`, userID)
			fmt.Println("tutor account reused (existing password):", email)
		}
	}

	// ── Vetted profile: APPROVED + public, on every run (idempotent).
	var tutorID string
	err = db.QueryRow(`
		INSERT INTO tutor_profiles (
			user_id, slug, display_name, bio, headline, years_experience,
			status, is_public, timezone, accepts_online, accepts_in_person, currency
		)
		SELECT $1::uuid, 'vetted-tutor', 'Vetted NUVORA Tutor',
			'Vetted NUVORA tutor — fully functional LMS fixture (demo lesson, study material, assignments, homework notes).',
			'Mathematics · UTME', 5, 'APPROVED', TRUE, 'Africa/Lagos', TRUE, TRUE, 'NGN'
		WHERE NOT EXISTS (SELECT 1 FROM tutor_profiles WHERE user_id = $1::uuid)
		RETURNING id::text`, userID).Scan(&tutorID)
	if err == sql.ErrNoRows {
		err = db.QueryRow(`SELECT id::text FROM tutor_profiles WHERE user_id = $1::uuid`, userID).Scan(&tutorID)
	}
	if err != nil {
		log.Fatalf("tutor profile: %v", err)
	}
	_, _ = db.Exec(`
		UPDATE tutor_profiles
		SET bio = $2, headline = $3,
			status = 'APPROVED', is_public = TRUE,
			verified_at = COALESCE(verified_at, NOW()),
			approved_at = COALESCE(approved_at, NOW()),
			updated_at = NOW()
		WHERE id = $1::uuid`, tutorID,
		"Vetted NUVORA tutor — fully functional LMS fixture (demo lesson, study material, assignments, homework notes).",
		"Mathematics · UTME")

	// Teaching scope: Mathematics (create the subject if the local DB lacks it).
	var mathsSubjID string
	_ = db.QueryRow(`SELECT id::text FROM subjects WHERE slug = 'mathematics'`).Scan(&mathsSubjID)
	if mathsSubjID == "" {
		err := db.QueryRow(`INSERT INTO subjects (name, slug, category) VALUES ('Mathematics','mathematics','Academic') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id::text`).Scan(&mathsSubjID)
		if err != nil {
			log.Fatalf("subject: %v", err)
		}
	}
	_, _ = db.Exec(`INSERT INTO tutor_subjects (tutor_profile_id, subject_id)
		VALUES ($1::uuid, $2::uuid) ON CONFLICT DO NOTHING`, tutorID, mathsSubjID)

	// Competency: passed assessment so the vetting console shows a verified tutor.
	var compN int
	_ = db.QueryRow(`SELECT COUNT(*) FROM competency_assessments WHERE tutor_profile_id = $1::uuid`, tutorID).Scan(&compN)
	if compN == 0 {
		_, _ = db.Exec(`INSERT INTO competency_assessments (tutor_profile_id, subject_id, score, max_score, passed, attempted_at, expires_at)
			VALUES ($1::uuid, $2::uuid, 92, 100, TRUE, NOW(), NOW() + INTERVAL '12 months')`, tutorID, mathsSubjID)
	}

	// Weekly availability so the tutor LMS calendar is populated.
	for _, slot := range [][3]string{
		{"2", "17:00", "19:00"}, // Tue
		{"4", "17:00", "19:00"}, // Thu
		{"6", "10:00", "12:00"}, // Sat
	} {
		_, _ = db.Exec(`INSERT INTO tutor_availabilities (tutor_profile_id, day_of_week, start_time, end_time, is_recurring)
			VALUES ($1::uuid, $2, $3, $4, TRUE)
			ON CONFLICT (tutor_profile_id, day_of_week, start_time, end_time) DO NOTHING`,
			tutorID, slot[0], slot[1], slot[2])
	}

	var progID string
	err = db.QueryRow(`
		INSERT INTO programmes (title, slug, summary, format, status, currency, is_featured, published_at)
		VALUES ('UTME Mastery (LMS demo)', $1, 'Seeded demo programme for the vetted tutor LMS pack.', 'COHORT', 'PUBLISHED', 'NGN', FALSE, NOW())
		ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, status = 'PUBLISHED', published_at = COALESCE(programmes.published_at, NOW())
		RETURNING id::text`, progSlug).Scan(&progID)
	if err != nil {
		log.Fatalf("programme: %v", err)
	}

	var cohortID string
	err = db.QueryRow(`
		INSERT INTO cohorts (
			programme_id, title, slug, capacity, start_date, end_date, timezone,
			location_mode, fee, currency, status, code, schedule_description, published_at
		)
		VALUES (
			$1::uuid, 'UTME 2026 LMS demo cohort', $2, 40,
			CURRENT_DATE + 14, CURRENT_DATE + 120, 'Africa/Lagos',
			'ONLINE', 35000, 'NGN', 'PUBLISHED', 'NV-LMSDEMO',
			'Tue/Thu evenings · demo recorded lesson + worksheet', NOW()
		)
		ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, status = 'PUBLISHED'
		RETURNING id::text`, progID, cohortSlug).Scan(&cohortID)
	if err != nil {
		log.Fatalf("cohort: %v", err)
	}
	_, _ = db.Exec(`UPDATE cohorts SET tutor_profile_id = $1::uuid, updated_at = NOW() WHERE id = $2::uuid`, tutorID, cohortID)

	// ── Demo student enrollment so the tutor roster has a learner.
	var studentUserID string
	err = db.QueryRow(`SELECT id::text FROM users WHERE email = $1 AND deleted_at IS NULL`, demoStudentEmail).Scan(&studentUserID)
	if err == nil {
		var spID string
		_ = db.QueryRow(`SELECT id::text FROM student_profiles WHERE user_id = $1::uuid`, studentUserID).Scan(&spID)
		if spID == "" {
			err = db.QueryRow(`
				INSERT INTO student_profiles (user_id, first_name, last_name, current_level, school_name, guardian_consent, timezone)
				VALUES ($1::uuid, 'Demo', 'Student', 'SSS2', 'NUVORA Demo School', TRUE, 'Africa/Lagos')
				RETURNING id::text`, studentUserID).Scan(&spID)
			if err != nil {
				log.Fatalf("demo student profile: %v", err)
			}
		}
		_, _ = db.Exec(`
			INSERT INTO cohort_enrollments (cohort_id, student_profile_id, parent_user_id, status)
			VALUES ($1::uuid, $2::uuid, $3::uuid, 'CONFIRMED')
			ON CONFLICT (cohort_id, student_profile_id) DO UPDATE SET status = 'CONFIRMED'`,
			cohortID, spID, studentUserID)
		_, _ = db.Exec(`UPDATE cohorts SET enrolled_count = (
			SELECT COUNT(*) FROM cohort_enrollments WHERE cohort_id = $1::uuid AND status = 'CONFIRMED'
		) WHERE id = $1::uuid`, cohortID)
	}

	var lessonID string
	err = db.QueryRow(`SELECT id::text FROM lessons WHERE cohort_id = $1::uuid AND title = $2`, cohortID, lessonTitle).Scan(&lessonID)
	if err == sql.ErrNoRows {
		err = db.QueryRow(`
			INSERT INTO lessons (
				cohort_id, tutor_profile_id, title, description,
				start_at, end_at, timezone, status, video_url, meeting_provider
			)
			VALUES (
				$1::uuid, $2::uuid, $3,
				'Demo recorded lesson — sample video for the LMS pack.',
				NOW() + INTERVAL '14 days' + INTERVAL '18 hours',
				NOW() + INTERVAL '14 days' + INTERVAL '19 hours 30 minutes',
				'Africa/Lagos', 'SCHEDULED', $4, 'GOOGLE_MEET'
			)
			RETURNING id::text`, cohortID, tutorID, lessonTitle, videoURL).Scan(&lessonID)
	}
	if err != nil {
		log.Fatalf("lesson: %v", err)
	}

	var n int
	_ = db.QueryRow(`SELECT COUNT(*) FROM resources WHERE cohort_id = $1::uuid AND title = $2`, cohortID, "Algebra diagnostic worksheet (PDF)").Scan(&n)
	if n == 0 {
		_, err = db.Exec(`
			INSERT INTO resources (programme_id, cohort_id, lesson_id, title, description, file_url, is_public, uploaded_by)
			VALUES ($1::uuid, $2::uuid, $3::uuid, 'Algebra diagnostic worksheet (PDF)',
				'Demo study material for the LMS pack.', $4, TRUE, $5::uuid)`,
			progID, cohortID, lessonID, pdfURL, userID)
		if err != nil {
			log.Fatalf("resource: %v", err)
		}
	}

	_ = db.QueryRow(`SELECT COUNT(*) FROM assignments WHERE cohort_id = $1::uuid AND title = $2`, cohortID, "Week 1 algebra worksheet").Scan(&n)
	if n == 0 {
		_, err = db.Exec(`
			INSERT INTO assignments (cohort_id, lesson_id, title, instructions, due_at, max_score, created_by)
			VALUES ($1::uuid, $2::uuid, 'Week 1 algebra worksheet',
				'Complete the diagnostic worksheet and upload your working.',
				NOW() + INTERVAL '21 days', 20, $3::uuid)`,
			cohortID, lessonID, userID)
		if err != nil {
			log.Fatalf("assignment: %v", err)
		}
	}

	// Lesson note + homework so the tutor LMS shows teaching content too.
	var noteN int
	_ = db.QueryRow(`SELECT COUNT(*) FROM lesson_notes WHERE lesson_id = $1::uuid`, lessonID).Scan(&noteN)
	if noteN == 0 {
		_, err = db.Exec(`
			INSERT INTO lesson_notes (lesson_id, tutor_profile_id, content, homework, is_visible_to_parent)
			VALUES ($1::uuid, $2::uuid, 'Demo class note — we covered linear equations and simplification. Watch the recorded lesson first, then try the worksheet.',
				'Complete questions 1-10 of the Week 1 algebra worksheet and upload your working before the next live session.', TRUE)`,
			lessonID, tutorID)
		if err != nil {
			log.Fatalf("lesson note: %v", err)
		}
	}

	fmt.Println("NUVORA vetted-tutor LMS pack seeded")
	fmt.Println("database:", dsn)
	fmt.Println("tutor login:", email)
	if password != "" {
		fmt.Println("tutor password: (the value you passed via SEED_OPERATOR_PASSWORD / --tutor-password)")
	}
	fmt.Println("tutor profile:", tutorID, "(APPROVED · public · competency passed)")
	fmt.Println("programme:", progSlug, "cohort:", cohortSlug, "code: NV-LMSDEMO")
	fmt.Println("pack: demo recorded video · study PDF · assignment · homework note · weekly availability")
	fmt.Println("NEXT:")
	fmt.Println("  1. Log in as", email, "— the tutor LMS is fully populated.")
	fmt.Println("  2. Admin → Tutor vetting shows the tutor as APPROVED (routed to admin).")
	fmt.Println("  3. Admin → Programmes → utme-mastery-lms — roster shows tutor + cohort + demo student.")
	fmt.Println("  4. Restart the API if it was started before this seed")
}
