package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/library"
	"ykay-virtual/internal/domain/plus"
)

// LessonParticipantReader — reports whether a learner is a participant of a
// lesson (satisfied by *postgres.LessonRepo / *memory.LessonMemory).
type LessonParticipantReader interface {
	IsParticipant(ctx context.Context, lessonID, studentProfileID uuid.UUID) (bool, error)
}

// LibraryService — the on-demand recorded-lesson library: public catalogue
// browse + admin curation. Playback entitlement is enforced here (extend, don't
// fork): an item's `video_url`/`transcript` are returned only when the viewer is
// a participant of the lesson (or an admin). Non-participants still see the
// metadata so the catalogue works as a discovery surface.
type LibraryService struct {
	repo         library.Repository
	participants LessonParticipantReader
	plus         *PlusService // transcript gate (000066)
	// studentsForUser resolves the student profile IDs the actor may act for
	// (their own + any linked learners). Used to gate entitlement.
	studentByUserID   func(ctx context.Context, userID uuid.UUID) (*identity.StudentProfile, error)
	learnersForParent func(ctx context.Context, parentUserID uuid.UUID) ([]identity.StudentProfile, error)
}

func NewLibraryService(repo library.Repository, participants LessonParticipantReader) *LibraryService {
	return &LibraryService{repo: repo, participants: participants}
}

// WithPlus wires the YK-Virtual Plus gate: recorded-library transcripts are a
// Plus feature (000066). Video playback stays entitlement-gated by cohort
// participation; transcripts additionally require an active Plus plan.
func (s *LibraryService) WithPlus(p *PlusService) *LibraryService {
	s.plus = p
	return s
}

// WithStudentResolvers wires identity resolution so entitlement can be
// determined per viewer. Without them, no student can be resolved → anonymous
// behaviour (metadata only).
func (s *LibraryService) WithStudentResolvers(
	studentByUserID func(ctx context.Context, userID uuid.UUID) (*identity.StudentProfile, error),
	learnersForParent func(ctx context.Context, parentUserID uuid.UUID) ([]identity.StudentProfile, error),
) *LibraryService {
	s.studentByUserID = studentByUserID
	s.learnersForParent = learnersForParent
	return s
}

// viewerStudentIDs returns the learner profile IDs the given user is allowed to
// watch on behalf of (their own + linked learners). Empty when the user is a
// tutor/admin-without-learner or anonymous.
func (s *LibraryService) viewerStudentIDs(ctx context.Context, userID uuid.UUID) ([]uuid.UUID, error) {
	ids := []uuid.UUID{}
	if s.studentByUserID != nil {
		if own, err := s.studentByUserID(ctx, userID); err == nil && own != nil {
			ids = append(ids, own.ID)
		}
	}
	if s.learnersForParent != nil {
		if linked, err := s.learnersForParent(ctx, userID); err == nil {
			for _, l := range linked {
				ids = append(ids, l.ID)
			}
		}
	}
	return ids, nil
}

// entitled reports whether the viewer (admin or a resolved learner) may play a
// lesson. Unknown viewers are never entitled.
func (s *LibraryService) entitled(ctx context.Context, isAdmin bool, userID uuid.UUID, lessonID uuid.UUID) bool {
	if isAdmin {
		return true
	}
	if s.participants == nil {
		return false
	}
	studentIDs, err := s.viewerStudentIDs(ctx, userID)
	if err != nil || len(studentIDs) == 0 {
		return false
	}
	for _, sid := range studentIDs {
		ok, err := s.participants.IsParticipant(ctx, lessonID, sid)
		if err == nil && ok {
			return true
		}
	}
	return false
}

// gate applies playback entitlement to catalogue items: video_url is kept
// only for entitled viewers; transcript additionally requires Plus (000066).
func (s *LibraryService) gate(ctx context.Context, isAdmin bool, userID uuid.UUID, items []library.Item) []library.Item {
	transcripts := s.transcriptAllowed(ctx, isAdmin, userID)
	out := make([]library.Item, 0, len(items))
	for _, it := range items {
		if !s.entitled(ctx, isAdmin, userID, it.LessonID) {
			it.VideoURL = nil
			it.Transcript = nil
			it.Entitled = false
		} else {
			it.Entitled = true
			if !transcripts {
				it.Transcript = nil
			}
		}
		out = append(out, it)
	}
	return out
}

func (s *LibraryService) gateOne(ctx context.Context, isAdmin bool, userID uuid.UUID, it *library.Item) *library.Item {
	if it == nil {
		return nil
	}
	if !s.entitled(ctx, isAdmin, userID, it.LessonID) {
		it.VideoURL = nil
		it.Transcript = nil
		it.Entitled = false
	} else {
		it.Entitled = true
		if !s.transcriptAllowed(ctx, isAdmin, userID) {
			it.Transcript = nil
		}
	}
	return it
}

// transcriptAllowed — transcripts are a Plus feature; admins always have them.
func (s *LibraryService) transcriptAllowed(ctx context.Context, isAdmin bool, userID uuid.UUID) bool {
	if isAdmin {
		return true
	}
	return s.plus != nil && s.plus.HasActivePlan(ctx, userID)
}

// Catalogue — public browse (filters + paging). Returns metadata always; video
// only for entitled viewers.
func (s *LibraryService) Catalogue(ctx context.Context, f library.Filter, isAdmin bool, userID uuid.UUID) ([]library.Item, int64, error) {
	if s.repo == nil {
		return []library.Item{}, 0, nil
	}
	items, total, err := s.repo.Catalogue(ctx, f)
	if err != nil {
		return nil, 0, err
	}
	return s.gate(ctx, isAdmin, userID, items), total, nil
}

// Featured — homepage rail. Metadata only; never exposes video to the public.
func (s *LibraryService) Featured(ctx context.Context, limit int) ([]library.Item, error) {
	if s.repo == nil {
		return []library.Item{}, nil
	}
	items, err := s.repo.Featured(ctx, limit)
	if err != nil {
		return nil, err
	}
	for i := range items {
		items[i].VideoURL = nil
		items[i].Transcript = nil
		items[i].Entitled = false
	}
	return items, nil
}

// Get — detail page. Strips video/transcript unless the viewer is entitled.
func (s *LibraryService) Get(ctx context.Context, lessonID uuid.UUID, isAdmin bool, userID uuid.UUID) (*library.Item, error) {
	if s.repo == nil {
		return nil, domain.ErrNotFound
	}
	it, err := s.repo.GetByLessonID(ctx, lessonID)
	if err != nil {
		return nil, err
	}
	return s.gateOne(ctx, isAdmin, userID, it), nil
}

// DownloadURL — offline/mobile download (P5). Returns the video URL for a
// recorded lesson only when the viewer is entitled AND has an active YK-Virtual
// Plus plan (or is an admin). Downloads are a Plus feature, enforced server-side
// so the mobile app can cache offline. Returns plus.ErrPremiumRequired (HTTP
// 402) for entitled-but-not-Plus viewers.
func (s *LibraryService) DownloadURL(ctx context.Context, isAdmin bool, userID uuid.UUID, lessonID uuid.UUID) (*string, error) {
	if !s.entitled(ctx, isAdmin, userID, lessonID) {
		return nil, domain.ErrForbidden
	}
	if !isAdmin {
		if s.plus == nil || !s.plus.HasActivePlan(ctx, userID) {
			return nil, plus.ErrPremiumRequired
		}
	}
	it, err := s.repo.GetByLessonID(ctx, lessonID)
	if err != nil {
		return nil, err
	}
	if it.VideoURL == nil || *it.VideoURL == "" {
		return nil, domain.ErrNotFound
	}
	return it.VideoURL, nil
}

// ListAdmin — recorded lessons + curation meta for the admin content manager.
func (s *LibraryService) ListAdmin(ctx context.Context, search string, page, pageSize int) ([]library.Item, int64, error) {
	if s.repo == nil {
		return []library.Item{}, 0, nil
	}
	return s.repo.ListAdmin(ctx, search, page, pageSize)
}

// UpdateMeta — admin curation of a lesson's library row.
func (s *LibraryService) UpdateMeta(ctx context.Context, lessonID uuid.UUID, in library.UpdateMetaInput) error {
	if s.repo == nil {
		return domain.ErrNotFound
	}
	if s.validateUpdate(in) != nil {
		return s.validateUpdate(in)
	}
	return s.repo.UpdateMeta(ctx, lessonID, in)
}

func (s *LibraryService) validateUpdate(in library.UpdateMetaInput) error {
	if in.DurationSeconds != nil && *in.DurationSeconds < 0 {
		return fmt.Errorf("%w: duration cannot be negative", domain.ErrInvalidInput)
	}
	if in.SortOrder != nil && *in.SortOrder < 0 {
		return fmt.Errorf("%w: sort order cannot be negative", domain.ErrInvalidInput)
	}
	if in.ThumbnailURL != nil {
		t := strings.TrimSpace(*in.ThumbnailURL)
		if t != "" && !isHTTPSURL(t) {
			return fmt.Errorf("%w: thumbnail must be a full https URL", domain.ErrInvalidInput)
		}
	}
	return nil
}

func isHTTPSURL(raw string) bool {
	low := strings.ToLower(raw)
	return strings.HasPrefix(low, "https://") || strings.HasPrefix(low, "http://")
}
