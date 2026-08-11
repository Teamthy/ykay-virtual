package worker

import (
	"context"
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
	ID       string
	Type     JobType
	Payload  []byte
	Attempts int
}

type Worker struct{}

func New() *Worker { return &Worker{} }

func (w *Worker) Process(ctx context.Context, job Job) error {
	log.Printf("processing job %s type %s", job.ID, job.Type)
	// idempotent handling placeholder
	return nil
}
