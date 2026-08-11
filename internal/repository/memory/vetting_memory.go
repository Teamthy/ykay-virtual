package memory

import (
	"context"
	"sort"
	"sync"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/tutor"
	"ykay-virtual/internal/domain/vetting"

	"github.com/google/uuid"
)

// In-memory vetting store — tests + dev fallback. Mirrors VettingRepository.

type VettingMemory struct {
	mu sync.RWMutex

	profiles map[uuid.UUID]*tutor.TutorProfile
	byUser   map[uuid.UUID]uuid.UUID // userID → profileID

	documents map[uuid.UUID]*vetting.VettingDocument
	events    map[uuid.UUID][]vetting.VettingEvent

	attempts   map[uuid.UUID]*vetting.AssessmentAttempt
	questions  map[uuid.UUID]*vetting.AssessmentQuestion
	answers    map[uuid.UUID][]vetting.AssessmentAnswer
	competency []vetting.CompetencyAssessment

	subjectEntries map[uuid.UUID][]tutor.TutorSubjectEntry // profileID → entries
}

func NewVettingMemory() *VettingMemory {
	return &VettingMemory{
		profiles:       map[uuid.UUID]*tutor.TutorProfile{},
		byUser:         map[uuid.UUID]uuid.UUID{},
		documents:      map[uuid.UUID]*vetting.VettingDocument{},
		events:         map[uuid.UUID][]vetting.VettingEvent{},
		attempts:       map[uuid.UUID]*vetting.AssessmentAttempt{},
		questions:      map[uuid.UUID]*vetting.AssessmentQuestion{},
		answers:        map[uuid.UUID][]vetting.AssessmentAnswer{},
		subjectEntries: map[uuid.UUID][]tutor.TutorSubjectEntry{},
	}
}

// Seed helpers for tests.
func (m *VettingMemory) SeedProfile(p *tutor.TutorProfile) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	m.profiles[p.ID] = p
	m.byUser[p.UserID] = p.ID
}

func (m *VettingMemory) SeedQuestion(q vetting.AssessmentQuestion) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if q.ID == uuid.Nil {
		q.ID = uuid.New()
	}
	m.questions[q.ID] = &q
}

func (m *VettingMemory) SeedTutorSubject(profileID, subjectID uuid.UUID) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.subjectEntries[profileID] = append(m.subjectEntries[profileID], tutor.TutorSubjectEntry{
		SubjectID: subjectID, Name: "Subject", Slug: "subject", Approved: false,
	})
}

// --- Profiles ---

func (m *VettingMemory) GetProfileByID(_ context.Context, profileID uuid.UUID) (*tutor.TutorProfile, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if p, ok := m.profiles[profileID]; ok {
		cp := *p
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *VettingMemory) GetProfileByUserID(_ context.Context, userID uuid.UUID) (*tutor.TutorProfile, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	profileID, ok := m.byUser[userID]
	if !ok {
		return nil, domain.ErrNotFound
	}
	p, ok := m.profiles[profileID]
	if !ok {
		return nil, domain.ErrNotFound
	}
	cp := *p
	return &cp, nil
}

func (m *VettingMemory) CreateProfile(_ context.Context, p *tutor.TutorProfile) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	p.CreatedAt = time.Now().UTC()
	p.UpdatedAt = p.CreatedAt
	m.profiles[p.ID] = p
	m.byUser[p.UserID] = p.ID
	return nil
}

func (m *VettingMemory) SetPublic(_ context.Context, profileID uuid.UUID, isPublic bool) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	p, ok := m.profiles[profileID]
	if !ok {
		return domain.ErrNotFound
	}
	p.IsPublic = isPublic
	return nil
}

func (m *VettingMemory) UpdateStatus(_ context.Context, profileID uuid.UUID, status string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	p, ok := m.profiles[profileID]
	if !ok {
		return domain.ErrNotFound
	}
	p.Status = tutor.TutorStatus(status)
	return nil
}

func (m *VettingMemory) MarkApproved(_ context.Context, profileID, approvedBy uuid.UUID, rankingScore float64) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	p, ok := m.profiles[profileID]
	if !ok {
		return domain.ErrNotFound
	}
	now := time.Now().UTC()
	p.Status = tutor.TutorStatusApproved
	p.IsPublic = true
	p.ApprovedBy = &approvedBy
	p.ApprovedAt = &now
	p.VerifiedAt = &now
	p.RankingScore = rankingScore
	return nil
}

func (m *VettingMemory) SetRankingScore(_ context.Context, profileID uuid.UUID, score float64) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	p, ok := m.profiles[profileID]
	if !ok {
		return domain.ErrNotFound
	}
	p.RankingScore = score
	return nil
}

func (m *VettingMemory) ListByStatus(_ context.Context, status string, limit, offset int) ([]tutor.TutorProfile, int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []tutor.TutorProfile
	for _, p := range m.profiles {
		if status == "" || string(p.Status) == status {
			out = append(out, *p)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].UpdatedAt.After(out[j].UpdatedAt) })
	total := int64(len(out))
	if offset > len(out) {
		offset = len(out)
	}
	end := offset + limit
	if limit < 1 {
		end = offset + 20
	}
	if end > len(out) {
		end = len(out)
	}
	return out[offset:end], total, nil
}

func (m *VettingMemory) ListApprovedProfiles(_ context.Context, limit int) ([]uuid.UUID, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []uuid.UUID
	for _, p := range m.profiles {
		if p.Status == tutor.TutorStatusApproved {
			out = append(out, p.ID)
		}
	}
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

// --- Documents ---

func (m *VettingMemory) CreateDocument(_ context.Context, d *vetting.VettingDocument) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	d.CreatedAt = time.Now().UTC()
	d.Status = vetting.DocStatusPending
	m.documents[d.ID] = d
	return nil
}

func (m *VettingMemory) GetDocument(_ context.Context, id uuid.UUID) (*vetting.VettingDocument, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if d, ok := m.documents[id]; ok {
		cp := *d
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *VettingMemory) ListDocuments(_ context.Context, profileID uuid.UUID) ([]vetting.VettingDocument, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []vetting.VettingDocument
	for _, d := range m.documents {
		if d.TutorProfileID == profileID {
			out = append(out, *d)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.Before(out[j].CreatedAt) })
	return out, nil
}

func (m *VettingMemory) UpdateDocumentReview(_ context.Context, id uuid.UUID, status vetting.DocumentStatus,
	reviewedBy uuid.UUID, reason *string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	d, ok := m.documents[id]
	if !ok {
		return domain.ErrNotFound
	}
	now := time.Now().UTC()
	d.Status = status
	d.ReviewedBy = &reviewedBy
	d.ReviewedAt = &now
	d.RejectionReason = reason
	return nil
}

// --- Events ---

func (m *VettingMemory) CreateEvent(_ context.Context, e *vetting.VettingEvent) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	e.CreatedAt = time.Now().UTC()
	m.events[e.TutorProfileID] = append(m.events[e.TutorProfileID], *e)
	return nil
}

func (m *VettingMemory) ListEvents(_ context.Context, profileID uuid.UUID, limit int) ([]vetting.VettingEvent, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	events := m.events[profileID]
	out := make([]vetting.VettingEvent, len(events))
	copy(out, events)
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

// --- Assessment ---

func (m *VettingMemory) CreateAttempt(_ context.Context, a *vetting.AssessmentAttempt) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	a.StartedAt = time.Now().UTC()
	m.attempts[a.ID] = a
	return nil
}

func (m *VettingMemory) GetAttempt(_ context.Context, id uuid.UUID) (*vetting.AssessmentAttempt, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if a, ok := m.attempts[id]; ok {
		cp := *a
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *VettingMemory) GetActiveAttempt(_ context.Context, profileID, subjectID uuid.UUID) (*vetting.AssessmentAttempt, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var found *vetting.AssessmentAttempt
	for _, a := range m.attempts {
		if a.TutorProfileID == profileID && a.SubjectID == subjectID && a.Status == vetting.AttemptInProgress {
			cp := *a
			found = &cp
		}
	}
	if found == nil {
		return nil, domain.ErrNotFound
	}
	return found, nil
}

func (m *VettingMemory) ListQuestionsForSubject(_ context.Context, subjectID uuid.UUID, limit int) ([]vetting.AssessmentQuestion, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []vetting.AssessmentQuestion
	for _, q := range m.questions {
		if q.SubjectID == subjectID && q.IsActive {
			out = append(out, *q)
		}
	}
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

func (m *VettingMemory) GetQuestion(_ context.Context, id uuid.UUID) (*vetting.AssessmentQuestion, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if q, ok := m.questions[id]; ok {
		cp := *q
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *VettingMemory) SaveAnswer(_ context.Context, a *vetting.AssessmentAnswer) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	for i, existing := range m.answers[a.AttemptID] {
		if existing.QuestionID == a.QuestionID {
			m.answers[a.AttemptID][i] = *a
			return nil
		}
	}
	m.answers[a.AttemptID] = append(m.answers[a.AttemptID], *a)
	return nil
}

func (m *VettingMemory) CompleteAttempt(_ context.Context, id uuid.UUID, score, maxScore float64, passed bool) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	a, ok := m.attempts[id]
	if !ok {
		return domain.ErrNotFound
	}
	now := time.Now().UTC()
	a.Status = vetting.AttemptCompleted
	a.Score = &score
	a.MaxScore = &maxScore
	a.Passed = &passed
	a.CompletedAt = &now
	return nil
}

func (m *VettingMemory) CreateCompetencyResult(_ context.Context, c *vetting.CompetencyAssessment) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	c.AttemptedAt = time.Now().UTC()
	m.competency = append(m.competency, *c)
	return nil
}

func (m *VettingMemory) ListCompetencyResults(_ context.Context, profileID uuid.UUID, limit int) ([]vetting.CompetencyAssessment, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []vetting.CompetencyAssessment
	for _, c := range m.competency {
		if c.TutorProfileID == profileID {
			out = append(out, c)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].AttemptedAt.After(out[j].AttemptedAt) })
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

func (m *VettingMemory) PassedCompetencyExists(_ context.Context, profileID uuid.UUID, now time.Time) (bool, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, c := range m.competency {
		if c.TutorProfileID == profileID && c.Passed {
			if c.ExpiresAt == nil || c.ExpiresAt.After(now) {
				return true, nil
			}
		}
	}
	return false, nil
}

var _ vetting.VettingRepository = (*VettingMemory)(nil)

// --- Tutor subjects ---

type VettingTutorSubjectMemory struct {
	mu   sync.RWMutex
	rows map[uuid.UUID][]tutor.TutorSubjectEntry
}

func NewVettingTutorSubjectMemory() *VettingTutorSubjectMemory {
	return &VettingTutorSubjectMemory{rows: map[uuid.UUID][]tutor.TutorSubjectEntry{}}
}

func (m *VettingTutorSubjectMemory) ListByTutor(_ context.Context, profileID uuid.UUID) ([]tutor.TutorSubjectEntry, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]tutor.TutorSubjectEntry, len(m.rows[profileID]))
	copy(out, m.rows[profileID])
	return out, nil
}

func (m *VettingTutorSubjectMemory) AddForTutor(_ context.Context, profileID, subjectID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, e := range m.rows[profileID] {
		if e.SubjectID == subjectID {
			return nil
		}
	}
	m.rows[profileID] = append(m.rows[profileID], tutor.TutorSubjectEntry{
		SubjectID: subjectID, Name: "Subject", Slug: "subject", Approved: false,
	})
	return nil
}

var _ tutor.TutorSubjectRepository = (*VettingTutorSubjectMemory)(nil)
