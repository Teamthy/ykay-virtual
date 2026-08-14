package worker

import (
	"context"
	"encoding/json"
	"log"
)

type JobType string

const (
	JobSendEmail               JobType = "send_email"
	JobSendSMS                 JobType = "send_sms"
	JobSendPush                JobType = "send_push"
	JobProcessPaymentWebhook   JobType = "process_payment_webhook_async"
	JobGenerateLessonReminders JobType = "generate_lesson_reminders"
	JobExpireStaleBookingHolds JobType = "expire_stale_booking_holds"
	JobComputeTutorRanking     JobType = "compute_tutor_ranking_score"
	JobRefreshSearchCache      JobType = "refresh_search_cache"
	JobProcessWeeklyPayouts    JobType = "process_weekly_tutor_payouts"
	JobGenerateProgressReports JobType = "generate_progress_reports"
	JobSendReferralRewards     JobType = "send_referral_rewards"
	JobCleanupExpiredUploads   JobType = "cleanup_expired_uploads"
	JobRegenerateSitemaps      JobType = "regenerate_sitemaps"
	JobPublishScheduledPosts   JobType = "publish_scheduled_blog_posts"
)

type Job struct {
	ID          string          `json:"id"`
	Type        JobType         `json:"type"`
	Payload     json.RawMessage `json:"payload,omitempty"`
	Attempts    int             `json:"attempts"`
	MaxAttempts int             `json:"max_attempts"`
	LastError   string          `json:"last_error,omitempty"`
}

// Worker is kept for backwards compatibility with earlier call sites; the
// durable implementations live in queue.go (RedisQueue / MemoryQueue).
type Worker struct{}

func New() *Worker { return &Worker{} }

func (w *Worker) Process(ctx context.Context, job Job) error {
	log.Printf("processing job %s type %s", job.ID, job.Type)
	return nil
}
