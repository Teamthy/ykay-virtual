package storage

import (
	"context"
	"time"
)

type BucketType string

const (
	BucketPublic  BucketType = "public"
	BucketPrivate BucketType = "private"
)

type Storage interface {
	Upload(ctx context.Context, bucket BucketType, key string, data []byte, contentType string) error
	Delete(ctx context.Context, bucket BucketType, key string) error
	GeneratePresignedURL(ctx context.Context, bucket BucketType, key string, expiry time.Duration) (string, error)
	GetPublicURL(bucket BucketType, key string) string
}

// Placeholder implementation for Phase 1
type LocalStorage struct{}

func NewLocalStorage() *LocalStorage { return &LocalStorage{} }

func (s *LocalStorage) Upload(_ context.Context, _ BucketType, _ string, _ []byte, _ string) error { return nil }
func (s *LocalStorage) Delete(_ context.Context, _ BucketType, _ string) error { return nil }
func (s *LocalStorage) GeneratePresignedURL(_ context.Context, _ BucketType, key string, _ time.Duration) (string, error) {
	return "https://storage.local/" + key, nil
}
func (s *LocalStorage) GetPublicURL(_ BucketType, key string) string {
	return "https://cdn.ykay.local/" + key
}
