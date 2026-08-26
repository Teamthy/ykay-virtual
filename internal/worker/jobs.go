package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
)

type JobType string

const (
	JobSendEmail               JobType = "send_email"
	JobSendSMS                 JobType = "send_sms"
	JobSendWhatsApp            JobType = "send_whatsapp"
	JobSendPush                JobType = "send_push"
	JobProcessPaymentWebhook   JobType = "process_payment_webhook_async"
	JobGenerateLessonReminders JobType = "generate_lesson_reminders"
	JobExpireStaleBookingHolds JobType = "expire_stale_booking_holds"
	// JobExpirePendingEnrollments — seat-leak recovery: cancel PENDING cohort
	// enrollments whose checkout was abandoned and release the reserved seat.
	JobExpirePendingEnrollments JobType = "expire_stale_pending_enrollments"
	// JobExpirePlusSubscriptions — marks ACTIVE/TRIAL NUVORA Plus subscriptions
	// whose term has passed as EXPIRED (000066), so entitlements drop.
	JobExpirePlusSubscriptions JobType = "expire_plus_subscriptions"
	// JobSendPlusWeeklyReports — emails active NUVORA Plus subscribers their
	// weekly progress report (000067 / P4).
	JobSendPlusWeeklyReports   JobType = "send_plus_weekly_reports"
	JobComputeTutorRanking     JobType = "compute_tutor_ranking_score"
	JobRefreshSearchCache      JobType = "refresh_search_cache"
	JobProcessWeeklyPayouts    JobType = "process_weekly_tutor_payouts"
	JobGenerateProgressReports JobType = "generate_progress_reports"
	JobSendReferralRewards     JobType = "send_referral_rewards"
	JobCleanupExpiredUploads   JobType = "cleanup_expired_uploads"
	JobRegenerateSitemaps      JobType = "regenerate_sitemaps"
	JobPublishScheduledPosts   JobType = "publish_scheduled_blog_posts"
	JobArchiveAuditLogs        JobType = "archive_audit_logs" // G7.3 retention
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
	_ = ctx
	slog.Info("processing job", "job_id", job.ID, "type", string(job.Type))
	// Fail-closed: the durable queue must Register typed handlers. A generic
	// Process that always succeeds would ACK jobs without doing work.
	return fmt.Errorf("unregistered job type %s — register a handler on RedisQueue", job.Type)
}
