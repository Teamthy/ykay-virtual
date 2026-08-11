package content

import (
	"time"
	"github.com/google/uuid"
)

type ContentStatus string
const (
	StatusDraft     ContentStatus = "DRAFT"
	StatusScheduled ContentStatus = "SCHEDULED"
	StatusPublished ContentStatus = "PUBLISHED"
	StatusArchived  ContentStatus = "ARCHIVED"
)

type BlogPost struct {
	ID            uuid.UUID     `json:"id"`
	Title         string        `json:"title"`
	Slug          string        `json:"slug"`
	Excerpt       *string       `json:"excerpt,omitempty"`
	Content       string        `json:"content"`
	CoverImageKey *string       `json:"cover_image_key,omitempty"`
	AuthorUserID  *uuid.UUID    `json:"author_user_id,omitempty"`
	Status        ContentStatus `json:"status"`
	SeoTitle      *string       `json:"seo_title,omitempty"`
	SeoDescription *string      `json:"seo_description,omitempty"`
	CanonicalURL  *string       `json:"canonical_url,omitempty"`
	PublishedAt   *time.Time    `json:"published_at,omitempty"`
	ScheduledAt   *time.Time    `json:"scheduled_at,omitempty"`
	ViewCount     int           `json:"view_count"`
	CreatedAt     time.Time     `json:"created_at"`
	UpdatedAt     time.Time     `json:"updated_at"`
}

type ContentBlock struct {
	ID        uuid.UUID `json:"id"`
	Key       string    `json:"key"`
	Type      string    `json:"type"`
	Title     *string   `json:"title,omitempty"`
	Body      string    `json:"body"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type RedirectMap struct {
	ID        uuid.UUID  `json:"id"`
	FromSlug  string     `json:"from_slug"`
	ToSlug    string     `json:"to_slug"`
	Type      string     `json:"type"`
	CreatedAt time.Time  `json:"created_at"`
	CreatedBy *uuid.UUID `json:"created_by,omitempty"`
}

type Testimonial struct {
	ID           uuid.UUID `json:"id"`
	AuthorName   string    `json:"author_name"`
	AuthorLocation *string `json:"author_location,omitempty"`
	Body         string    `json:"body"`
	Rating       *int      `json:"rating,omitempty"`
	IsFeatured   bool      `json:"is_featured"`
	ConsentGiven bool      `json:"consent_given"`
	IsPublic     bool      `json:"is_public"`
	CreatedAt    time.Time `json:"created_at"`
}
