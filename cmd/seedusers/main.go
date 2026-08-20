package main

// Seed local fixture users (random passwords) and optional named operators.
// Passwords for operators come from SEED_OPERATOR_PASSWORD — never committed.
// Refuses production unless --allow-prod is set.
import (
	"crypto/rand"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"unicode"

	"ykay-virtual/internal/ops"

	_ "github.com/lib/pq"
)

type account struct {
	Email    string
	Role     string
	Password string // empty → generate random
}

func main() {
	allowProd := flag.Bool("allow-prod", false, "allow seeding when ENVIRONMENT=production")
	opsOnly := flag.Bool("ops-only", false, "skip @nuvora.test fixtures; only --academic/--super")
	academic := flag.String("academic", strings.TrimSpace(os.Getenv("SEED_ACADEMIC_EMAIL")), "ACADEMIC_ADMIN email")
	super := flag.String("super", strings.TrimSpace(os.Getenv("SEED_SUPER_EMAIL")), "SUPER_ADMIN email")
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

	opPassword := os.Getenv("SEED_OPERATOR_PASSWORD")
	if opPassword == "" {
		opPassword = os.Getenv("OPERATOR_PASSWORD")
	}
	var accounts []account
	if !*opsOnly {
		accounts = append(accounts,
			account{Email: "local.super@nuvora.test", Role: "SUPER_ADMIN"},
			account{Email: "local.academic@nuvora.test", Role: "ACADEMIC_ADMIN"},
			account{Email: "local.parent@nuvora.test", Role: "PARENT"},
			account{Email: "local.tutor@nuvora.test", Role: "TUTOR"},
			account{Email: "local.student@nuvora.test", Role: "STUDENT"},
		)
	}
	acad := strings.ToLower(strings.TrimSpace(*academic))
	sup := strings.ToLower(strings.TrimSpace(*super))
	if acad != "" || sup != "" {
		if strings.TrimSpace(opPassword) == "" {
			log.Fatal("SEED_OPERATOR_PASSWORD is required when --academic or --super is set")
		}
		if err := ops.ValidatePassword(opPassword); err != nil {
			log.Fatal(err)
		}
	}
	if acad != "" {
		accounts = append(accounts, account{Email: acad, Role: "ACADEMIC_ADMIN", Password: opPassword})
	}
	if sup != "" {
		accounts = append(accounts, account{Email: sup, Role: "SUPER_ADMIN", Password: opPassword})
	}
	if len(accounts) == 0 {
		log.Fatal("nothing to seed: omit --ops-only, or pass --academic / --super")
	}

	fmt.Println("NUVORA seed — operator passwords are not written to git")
	fmt.Println("database:", dsn)
	fmt.Println("These logins ONLY work against an API using THIS same DATABASE_URL.")
	fmt.Println("If the API log says \"in-memory store\", restart the API after Postgres is up.")
	fmt.Println("Vercel login uses the HOSTED API database, not this laptop.")
	fmt.Println("Admins (ACADEMIC_ADMIN / SUPER_ADMIN) must complete MFA after the password.")
	fmt.Println("email\trole\tpassword")

	var dump strings.Builder
	dump.WriteString("# NUVORA local seed credentials (gitignored). Delete after copying.\n")

	for _, a := range accounts {
		pw := a.Password
		if pw == "" {
			pw, err = randomPassword(16)
			if err != nil {
				log.Fatal(err)
			}
		}
		if err := ops.UpsertUser(db, a.Email, a.Role, pw); err != nil {
			log.Fatalf("%s: %v", a.Email, err)
		}
		shown := pw
		if a.Password != "" {
			shown = "(SEED_OPERATOR_PASSWORD)"
		}
		fmt.Printf("%s\t%s\t%s\n", a.Email, a.Role, shown)
		fmt.Fprintf(&dump, "%s\t%s\t%s\n", a.Email, a.Role, shown)
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
