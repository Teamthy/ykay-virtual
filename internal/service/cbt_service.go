package service

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"strconv"
	"strings"

	"ykay-virtual/internal/domain/cbt"

	"github.com/google/uuid"
)

// CBTService — the practice-bank engine: subjects with live counts, random
// per-request papers (different student, different questions), server-side
// grading with review, admin browse/publish/delete and CSV import/seed.
type CBTService struct {
	repo cbt.Repository
}

func NewCBTService(repo cbt.Repository) *CBTService {
	return &CBTService{repo: repo}
}

// ── student surface ────────────────────────────────────────────────────────

type SubjectInfo struct {
	Slug          string `json:"slug"`
	Name          string `json:"name"`
	ClassLevel    string `json:"class_level"`
	Department    string `json:"department"`
	QuestionCount int    `json:"question_count"`
}

func (s *CBTService) ListSubjects(ctx context.Context) ([]SubjectInfo, error) {
	subjects, err := s.repo.ListSubjects(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]SubjectInfo, len(subjects))
	for i, sub := range subjects {
		out[i] = SubjectInfo{Slug: sub.Slug, Name: sub.Name, ClassLevel: sub.ClassLevel,
			Department: sub.Department, QuestionCount: sub.QuestionCount}
	}
	return out, nil
}

// PaperQuestion — the student view: NO CorrectIndex, NO Explanation.
type PaperQuestion struct {
	ID         uuid.UUID `json:"id"`
	Topic      string    `json:"topic"`
	Difficulty int       `json:"difficulty"`
	Stem       string    `json:"text"`
	Options    []string  `json:"options"`
}

// GeneratePaper draws a random published subset — a fresh paper per call.
func (s *CBTService) GeneratePaper(ctx context.Context, subjectSlug string, limit int) ([]PaperQuestion, error) {
	if subjectSlug == "" {
		return nil, cbt.ErrInvalidInput
	}
	if limit < 1 || limit > 100 {
		limit = 30
	}
	qs, err := s.repo.RandomQuestions(ctx, subjectSlug, limit)
	if err != nil {
		return nil, err
	}
	out := make([]PaperQuestion, len(qs))
	for i, q := range qs {
		out[i] = PaperQuestion{ID: q.ID, Topic: q.Topic, Difficulty: q.Difficulty, Stem: q.Stem,
			Options: append([]string(nil), q.Options...)}
	}
	// NOTE: option order is NOT shuffled — grading maps the client's selected
	// index directly onto the stored option order, so shuffling here would
	// desync the key. Randomness comes from question selection + order.
	return out, nil
}

type GradeAnswer struct {
	QuestionID    uuid.UUID `json:"question_id"`
	SelectedIndex *int      `json:"selected_index"`
}

type GradedQuestion struct {
	ID            uuid.UUID `json:"id"`
	Text          string    `json:"text"`
	Options       []string  `json:"options"`
	SelectedIndex *int      `json:"selected_index"`
	CorrectIndex  int       `json:"correct_index"`
	Explanation   string    `json:"explanation"`
	Correct       bool      `json:"correct"`
}

type GradeResult struct {
	Score   int              `json:"score"` // percentage
	Correct int              `json:"correct"`
	Total   int              `json:"total"`
	Review  []GradedQuestion `json:"review"`
}

// GradePaper grades server-side: the client only sends its selections. The
// key and explanations are revealed here and nowhere else.
func (s *CBTService) GradePaper(ctx context.Context, answers []GradeAnswer) (*GradeResult, error) {
	if len(answers) == 0 || len(answers) > 100 {
		return nil, cbt.ErrInvalidInput
	}
	ids := make([]uuid.UUID, len(answers))
	byID := map[uuid.UUID]GradeAnswer{}
	for i, a := range answers {
		ids[i] = a.QuestionID
		byID[a.QuestionID] = a
	}
	qs, err := s.repo.GetByIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	if len(qs) == 0 {
		return nil, cbt.ErrNotFound
	}
	res := &GradeResult{Total: len(qs), Review: make([]GradedQuestion, 0, len(qs))}
	for _, q := range qs {
		a := byID[q.ID]
		gq := GradedQuestion{ID: q.ID, Text: q.Stem, Options: q.Options,
			SelectedIndex: a.SelectedIndex, CorrectIndex: q.CorrectIndex, Explanation: q.Explanation}
		if a.SelectedIndex != nil && *a.SelectedIndex == q.CorrectIndex {
			gq.Correct = true
			res.Correct++
		}
		res.Review = append(res.Review, gq)
	}
	res.Score = res.Correct * 100 / res.Total
	return res, nil
}

// ── admin surface ──────────────────────────────────────────────────────────

func (s *CBTService) ListQuestions(ctx context.Context, subjectSlug string, page, pageSize int) ([]cbt.Question, int, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	return s.repo.ListQuestions(ctx, subjectSlug, pageSize, (page-1)*pageSize)
}

func (s *CBTService) SetStatus(ctx context.Context, id uuid.UUID, status string) error {
	if status != "draft" && status != "published" {
		return cbt.ErrInvalidInput
	}
	return s.repo.SetStatus(ctx, id, status)
}

func (s *CBTService) DeleteQuestion(ctx context.Context, id uuid.UUID) error {
	return s.repo.DeleteQuestion(ctx, id)
}

// CreateQuestion — admin-authored single question.
func (s *CBTService) CreateQuestion(ctx context.Context, subjectSlug, subjectName, classLevel, department string, q cbt.Question) error {
	if subjectSlug == "" || strings.TrimSpace(q.Stem) == "" || len(q.Options) < 2 || len(q.Options) > 6 {
		return cbt.ErrInvalidInput
	}
	if q.CorrectIndex < 0 || q.CorrectIndex >= len(q.Options) {
		return cbt.ErrInvalidInput
	}
	sub := cbt.Subject{Slug: subjectSlug, Name: subjectName, ClassLevel: defaultStr(classLevel, "ss2"), Department: defaultStr(department, "general")}
	if err := s.repo.UpsertSubject(ctx, &sub); err != nil {
		return err
	}
	q.SubjectID = sub.ID
	if q.Status == "" {
		q.Status = "published"
	}
	_, err := s.repo.CreateQuestion(ctx, &q, false)
	return err
}

// ImportCSV — bulk load from the shared bank CSV layout. Duplicate stems are
// skipped (idempotent), subjects upserted. Returns imported/skipped counts.
func (s *CBTService) ImportCSV(ctx context.Context, r io.Reader) (imported, skipped int, err error) {
	cr := csv.NewReader(r)
	cr.FieldsPerRecord = -1
	cr.ReuseRecord = false
	header, err := cr.Read()
	if err != nil {
		return 0, 0, fmt.Errorf("cbt import: read header: %w", err)
	}
	col := map[string]int{}
	for i, h := range header {
		col[strings.TrimSpace(strings.ToLower(h))] = i
	}
	need := []string{"subjectslug", "stem", "optiona", "optionb", "optionc", "optiond", "correctindex"}
	for _, n := range need {
		if _, ok := col[n]; !ok {
			return 0, 0, fmt.Errorf("cbt import: missing column %q", n)
		}
	}
	get := func(row []string, name string) string {
		if i, ok := col[name]; ok && i < len(row) {
			return strings.TrimSpace(row[i])
		}
		return ""
	}
	type parsed struct {
		subject cbt.Subject
		q       cbt.Question
	}
	var batch []parsed
	for {
		row, rerr := cr.Read()
		if rerr == io.EOF {
			break
		}
		if rerr != nil {
			return imported, skipped, fmt.Errorf("cbt import: row %d: %w", imported+skipped+2, rerr)
		}
		slug := get(row, "subjectslug")
		stem := get(row, "stem")
		optA, optB := get(row, "optiona"), get(row, "optionb")
		ci, cerr := strconv.Atoi(get(row, "correctindex"))
		if slug == "" || stem == "" || optA == "" || optB == "" || cerr != nil || ci < 0 || ci > 5 {
			skipped++ // malformed row — never half-import a question
			continue
		}
		diff := 2
		if d, e := strconv.Atoi(get(row, "difficulty")); e == nil && d >= 1 && d <= 3 {
			diff = d
		}
		p := parsed{
			subject: cbt.Subject{
				Slug:       slug,
				Name:       defaultStr(get(row, "subjectname"), slug),
				ClassLevel: defaultStr(get(row, "classlevel"), "ss2"),
				Department: defaultStr(get(row, "department"), "general"),
			},
			q: cbt.Question{
				Topic: defaultStr(get(row, "topic"), "General"), Difficulty: diff, Stem: stem,
				Options:      []string{get(row, "optiona"), get(row, "optionb"), get(row, "optionc"), get(row, "optiond")},
				CorrectIndex: ci, Explanation: get(row, "explanation"),
				Source: defaultStr(get(row, "source"), "curriculum"), Status: "published",
			},
		}
		batch = append(batch, p)
	}
	subjectCache := map[string]uuid.UUID{}
	for _, p := range batch {
		id, ok := subjectCache[p.subject.Slug]
		if !ok {
			sub := p.subject
			if err := s.repo.UpsertSubject(ctx, &sub); err != nil {
				return imported, skipped, err
			}
			subjectCache[sub.Slug] = sub.ID
			id = sub.ID
		}
		q := p.q
		q.SubjectID = id
		created, err := s.repo.CreateQuestion(ctx, &q, true)
		if err != nil {
			return imported, skipped, err
		}
		if created {
			imported++
		} else {
			skipped++
		}
	}
	return imported, skipped, nil
}

// SeedIfAbsent loads the bank only when the table is empty (first boot).
func (s *CBTService) SeedIfAbsent(ctx context.Context, csvData string) (int, error) {
	n, err := s.repo.CountPublished(ctx)
	if err != nil {
		return 0, err
	}
	if n > 0 {
		return 0, nil
	}
	imported, _, err := s.ImportCSV(ctx, strings.NewReader(csvData))
	return imported, err
}

func defaultStr(v, def string) string {
	if strings.TrimSpace(v) == "" {
		return def
	}
	return v
}
