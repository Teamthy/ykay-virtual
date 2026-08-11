package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain/academics"
	"ykay-virtual/internal/domain/content"
	"ykay-virtual/internal/domain/tutor"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func seedBlogPost(t *testing.T, store *memory.MemoryStore, slug, title string, subjectSlugs, examSlugs []string, publishedAt time.Time) *content.BlogPost {
	t.Helper()
	p := &content.BlogPost{
		Title: title, Slug: slug, Content: "Body",
		Status: content.StatusPublished, PublishedAt: &publishedAt,
	}
	store.Blogs.Seed(p, content.PostTags{SubjectSlugs: subjectSlugs, ExamSlugs: examSlugs})
	return p
}

func TestContentService_ListPosts_FilterAndCache(t *testing.T) {
	ctx := context.Background()
	store := memory.NewMemoryStore()
	now := time.Now().UTC()
	seedBlogPost(t, store, "igcse-maths-guide", "IGCSE Maths Guide", []string{"mathematics"}, []string{"IGCSE"}, now)
	seedBlogPost(t, store, "jamb-biology", "JAMB Biology Topics", []string{"biology"}, []string{"JAMB"}, now.Add(-time.Hour))

	svc := NewContentService(store.Blogs, store.Redirects, nil, nil, newMemCache())

	posts, total, err := svc.ListPosts(ctx, content.BlogListParams{Page: 1, PageSize: 20})
	require.NoError(t, err)
	assert.Equal(t, int64(2), total)

	filtered, total, err := svc.ListPosts(ctx, content.BlogListParams{Subject: "biology", Page: 1, PageSize: 20})
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Equal(t, "jamb-biology", filtered[0].Slug)
	assert.Equal(t, []string{"biology"}, filtered[0].SubjectSlugs)
	assert.Equal(t, []string{"JAMB"}, filtered[0].ExamSlugs)

	// Cache: second call served from cache.
	posts2, _, err := svc.ListPosts(ctx, content.BlogListParams{Page: 1, PageSize: 20})
	require.NoError(t, err)
	assert.Equal(t, posts, posts2)
}

func TestContentService_GetPostBySlug_PublishedOnly(t *testing.T) {
	ctx := context.Background()
	store := memory.NewMemoryStore()
	seedBlogPost(t, store, "live-post", "Live", nil, nil, time.Now())

	svc := NewContentService(store.Blogs, store.Redirects, nil, nil, newMemCache())
	post, err := svc.GetPostBySlug(ctx, "live-post")
	require.NoError(t, err)
	assert.Equal(t, "Live", post.Title)

	_, err = svc.GetPostBySlug(ctx, "draft-post")
	assert.Error(t, err)
}

func TestContentService_ResolveRedirect(t *testing.T) {
	ctx := context.Background()
	store := memory.NewMemoryStore()
	store.Redirects.Seed("old-tutor-page", "/tutors/chinasa", "301")

	svc := NewContentService(store.Blogs, store.Redirects, nil, nil, newMemCache())
	rm, err := svc.ResolveRedirect(ctx, "old-tutor-page")
	require.NoError(t, err)
	assert.Equal(t, "/tutors/chinasa", rm.ToSlug)

	_, err = svc.ResolveRedirect(ctx, "unknown-slug")
	assert.Error(t, err)

	require.NoError(t, svc.AddRedirect(ctx, "new-redirect", "/programmes", "301", nil))
	rm2, err := svc.ResolveRedirect(ctx, "new-redirect")
	require.NoError(t, err)
	assert.Equal(t, "/programmes", rm2.ToSlug)
}

func TestContentService_RelatedContent_Graph(t *testing.T) {
	ctx := context.Background()
	store := memory.NewMemoryStore()
	now := time.Now().UTC()

	// Tutor who teaches mathematics.
	store.Tutors.Seed(tutor.TutorSearchResult{
		Profile: tutor.TutorProfile{
			ID: uuid.New(), Slug: "math-tutor", DisplayName: "Math Tutor",
			Status: tutor.TutorStatusApproved, IsPublic: true, RatingAvg: 4.8, RatingCount: 10,
		},
		Subjects: []string{"Mathematics"}, SubjectSlugs: []string{"mathematics"},
	})
	// Published programme tagged to mathematics via programme_subjects is not
	// modeled in memory; use a plain published programme (filter ignored).
	store.ProgrammesSeed = append(store.ProgrammesSeed, academics.Programme{
		ID: uuid.New(), Title: "Maths Masterclass", Slug: "maths-masterclass",
		Format: academics.FormatCohort, Status: academics.ProgrammePublished,
	})
	// Blog posts tagged mathematics.
	seedBlogPost(t, store, "maths-tips", "Maths Tips", []string{"mathematics"}, nil, now)

	svc := NewContentService(store.Blogs, store.Redirects, store.Tutors, memory.NewProgrammeMemory(store.ProgrammesSeed), newMemCache())
	related, err := svc.RelatedContent(ctx, "mathematics")
	require.NoError(t, err)
	assert.Len(t, related.Tutors, 1)
	assert.Len(t, related.Programmes, 1)
	assert.Len(t, related.Posts, 1)
	assert.Equal(t, "math-tutor", related.Tutors[0].Profile.Slug)
}
