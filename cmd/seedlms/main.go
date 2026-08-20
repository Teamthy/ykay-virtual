package main

// Seed a local tutor LMS pack against the same Postgres as seedusers:
// tutor profile for local.tutor@nuvora.test (SUBMITTED so Admin → Tutor vetting
// can approve), a published demo programme/cohort, recorded lesson, study PDF,
// and an assignment. Does not print or write passwords.
//
//	go run ./cmd/seedlms
import (
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	_ "github.com/lib/pq"
)

const (
	tutorEmail = "local.tutor@nuvora.test"
	progSlug   = "utme-mastery-lms"
	cohortSlug = "utme-2026-lms-demo"
	lessonTitle = "Algebra foundations (recorded)"
	videoURL   = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
	pdfURL     = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
)

func main() {
	allowProd := flag.Bool("allow-prod", false, "allow seeding when ENVIRONMENT=production")
	flag.Parse()

	env := strings.ToLower(strings.TrimSpace(os.Getenv("ENVIRONMENT")))
	if (env == "production" || env == "prod") && !*allowProd {
		log.Fatal("refusing to seed LMS pack in production (pass --allow-prod if you really mean it)")
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

	var userID string
	err = db.QueryRow(`SELECT id::text FROM users WHERE email = $1 AND deleted_at IS NULL`, tutorEmail).Scan(&userID)
	if err != nil {
		log.Fatalf("%s not found — run go run ./cmd/seedusers first: %v", tutorEmail, err)
	}

	var tutorID string
	err = db.QueryRow(`
		INSERT INTO tutor_profiles (
			user_id, slug, display_name, bio, headline, years_experience,
			status, is_public, timezone, accepts_online, accepts_in_person, currency
		)
		SELECT $1::uuid, 'local-tutor', 'Local Tutor (fixture)',
			'Demo LMS pack. Approve in Admin → Tutor vetting, then assign to the UTME LMS demo cohort.',
			'Mathematics · UTME', 5, 'SUBMITTED', FALSE, 'Africa/Lagos', TRUE, TRUE, 'NGN'
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
		SET bio = $2, headline = $3, updated_at = NOW()
		WHERE id = $1::uuid`, tutorID,
		"Demo LMS pack. Approve in Admin → Tutor vetting, then assign to the UTME LMS demo cohort.",
		"Mathematics · UTME")

	var progID string
	err = db.QueryRow(`
		INSERT INTO programmes (title, slug, summary, format, status, currency, is_featured, published_at)
		VALUES ('UTME Mastery (LMS demo)', $1, 'Seeded demo programme for the local tutor LMS pack.', 'COHORT', 'PUBLISHED', 'NGN', FALSE, NOW())
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

	fmt.Println("NUVORA LMS pack seeded")
	fmt.Println("database:", dsn)
	fmt.Println("tutor:", tutorEmail, "profile:", tutorID)
	fmt.Println("programme:", progSlug, "cohort:", cohortSlug, "code: NV-LMSDEMO")
	fmt.Println("NEXT:")
	fmt.Println("  1. Admin → Tutor vetting — approve local-tutor (then set public if you want marketplace listing)")
	fmt.Println("  2. Admin → Cohorts — Assign the tutor, or approve their join request")
	fmt.Println("  3. Restart the API if it was started before this seed")
}
