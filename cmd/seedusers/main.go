package main

// Seed local operator accounts. Passwords are random, printed once, never
// committed. Refuses production unless --allow-prod is set.
//
//	DATABASE_URL=postgres://nuvora:nuvora@localhost:5432/nuvora?sslmode=disable \
//	  go run ./cmd/seedusers
import (
	"crypto/rand"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"unicode"

	"golang.org/x/crypto/bcrypt"

	_ "github.com/lib/pq"
)

type account struct {
	Email string
	Role  string
}

func main() {
	allowProd := flag.Bool("allow-prod", false, "allow seeding when ENVIRONMENT=production")
	flag.Parse()

	env := strings.ToLower(strings.TrimSpace(os.Getenv("ENVIRONMENT")))
	if (env == "production" || env == "prod") && !*allowProd {
		log.Fatal("refusing to seed users in production (pass --allow-prod if you really mean it)")
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

	accounts := []account{
		{Email: "local.super@nuvora.test", Role: "SUPER_ADMIN"},
		{Email: "local.academic@nuvora.test", Role: "ACADEMIC_ADMIN"},
		{Email: "local.parent@nuvora.test", Role: "PARENT"},
		{Email: "local.tutor@nuvora.test", Role: "TUTOR"},
		{Email: "local.student@nuvora.test", Role: "STUDENT"},
	}

	fmt.Println("NUVORA local seed — save these passwords now (not stored in git)")
	fmt.Println("email\trole\tpassword")

	var dump strings.Builder
	dump.WriteString("# NUVORA local seed credentials (gitignored). Delete after copying.\n")

	for _, a := range accounts {
		pw, err := randomPassword(16)
		if err != nil {
			log.Fatal(err)
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(pw), 12)
		if err != nil {
			log.Fatal(err)
		}
		var id string
		err = db.QueryRow(`
			INSERT INTO users (email, password_hash, status, timezone, email_verified_at, onboarded_at)
			VALUES ($1, $2, 'ACTIVE', 'Africa/Lagos', NOW(), NOW())
			ON CONFLICT (email) WHERE deleted_at IS NULL
			DO UPDATE SET
				password_hash = EXCLUDED.password_hash,
				status = 'ACTIVE',
				deleted_at = NULL,
				email_verified_at = NOW(),
				onboarded_at = NOW()
			RETURNING id::text`, a.Email, string(hash)).Scan(&id)
		if err != nil {
			log.Fatalf("%s: %v", a.Email, err)
		}
		_, err = db.Exec(`
			INSERT INTO user_roles (user_id, role_id)
			SELECT $1::uuid, r.id FROM roles r WHERE r.name = $2
			ON CONFLICT (user_id, role_id) DO NOTHING`, id, a.Role)
		if err != nil {
			log.Fatalf("%s role: %v", a.Email, err)
		}
		fmt.Printf("%s\t%s\t%s\n", a.Email, a.Role, pw)
		fmt.Fprintf(&dump, "%s\t%s\t%s\n", a.Email, a.Role, pw)
	}

	out := "seed-local-users.once.txt"
	if err := os.WriteFile(out, []byte(dump.String()), 0600); err != nil {
		log.Printf("could not write %s: %v", out, err)
	} else {
		fmt.Println("wrote", out, "(gitignored)")
	}
}

func randomPassword(n int) (string, error) {
	const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
	const digits = "23456789"
	buf := make([]byte, n)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	out := make([]byte, n)
	for i := 0; i < n-2; i++ {
		out[i] = letters[int(buf[i])%len(letters)]
	}
	out[n-2] = digits[int(buf[n-2])%len(digits)]
	out[n-1] = letters[int(buf[n-1])%len(letters)]
	// shuffle last two into the body
	out[3], out[n-2] = out[n-2], out[3]
	if !hasLetterDigit(string(out)) {
		out[0] = 'A'
		out[1] = '2'
	}
	return string(out), nil
}

func hasLetterDigit(s string) bool {
	var l, d bool
	for _, r := range s {
		if unicode.IsLetter(r) {
			l = true
		}
		if unicode.IsDigit(r) {
			d = true
		}
	}
	return l && d
}
