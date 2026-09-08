package service

import (
	"context"
	"strings"
	"testing"
	"time"

	"ykay-virtual/internal/domain/cbt"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const miniBankCSV = `subjectSlug,subjectName,classLevel,department,topic,difficulty,stem,optionA,optionB,optionC,optionD,correctIndex,explanation,source
mathematics,Mathematics,ss2,science,Algebra,1,2+2=?,3,4,5,6,1,basic addition,curriculum
mathematics,Mathematics,ss2,science,Algebra,2,5x3=?,8,15,16,125,1,times table,curriculum
mathematics,Mathematics,ss2,science,Number bases,3,10 in base 2 is,1100,1010,1001,1110,1,base conversion,curriculum
english,English Language,ss2,arts,Grammar,1,Choose the correct spelling,recieve,receive,recive,receeive,1,spelling rule,curriculum
english,English Language,ss2,arts,Grammar,2,Synonym of happy is,sad,glad,angry,tired,1,synonyms,curriculum
`

func newSeededCBT(t *testing.T) *CBTService {
	t.Helper()
	svc := NewCBTService(memory.NewCBTMemory())
	n, err := svc.SeedIfAbsent(context.Background(), miniBankCSV)
	require.NoError(t, err)
	require.Equal(t, 5, n)
	return svc
}

func TestCBTSeedIsIdempotent(t *testing.T) {
	svc := newSeededCBT(t)
	// Second boot: bank non-empty â†’ no re-import.
	n, err := svc.SeedIfAbsent(context.Background(), miniBankCSV)
	require.NoError(t, err)
	assert.Zero(t, n)
	// Even a forced re-import skips every duplicate stem.
	imported, skipped, err := svc.ImportCSV(context.Background(), strings.NewReader(miniBankCSV))
	require.NoError(t, err)
	assert.Zero(t, imported)
	assert.Equal(t, 5, skipped)
}

func TestCBTSubjectsHaveLiveCounts(t *testing.T) {
	svc := newSeededCBT(t)
	subjects, err := svc.ListSubjects(context.Background())
	require.NoError(t, err)
	require.Len(t, subjects, 2)
	bySlug := map[string]int{}
	for _, s := range subjects {
		bySlug[s.Slug] = s.QuestionCount
	}
	assert.Equal(t, 3, bySlug["mathematics"])
	assert.Equal(t, 2, bySlug["english"])
}

func TestCBTPaperIsRandomSubsetWithoutKey(t *testing.T) {
	svc := newSeededCBT(t)
	paper, err := svc.GeneratePaper(context.Background(), "mathematics", 2, 0, 0, testStudent(), "")
	require.NoError(t, err)
	require.Len(t, paper.Questions, 2)
	assert.NotEmpty(t, paper.AttemptToken)
	assert.True(t, paper.Deadline.IsZero(), "duration 0 means untimed")
	for _, q := range paper.Questions {
		assert.NotEmpty(t, q.ID)
		assert.NotEmpty(t, q.Stem)
		assert.Len(t, q.Options, 4)
	}
	// Two draws over a 3-question pool with limit 2 must (practically) differ.
	differ := false
	for i := 0; i < 20 && !differ; i++ {
		other, err := svc.GeneratePaper(context.Background(), "mathematics", 2, 0, 0, testStudent(), "")
		require.NoError(t, err)
		differ = other.Questions[0].ID != paper.Questions[0].ID ||
			other.Questions[1].ID != paper.Questions[1].ID
	}
	assert.True(t, differ, "two random draws should rarely be identical")

	_, err = svc.GeneratePaper(context.Background(), "nope", 5, 0, 0, testStudent(), "")
	assert.ErrorIs(t, err, cbt.ErrNotFound)
	// Input guards: difficulty and duration have hard bounds.
	_, err = svc.GeneratePaper(context.Background(), "mathematics", 5, 4, 0, testStudent(), "")
	assert.ErrorIs(t, err, cbt.ErrInvalidInput)
	_, err = svc.GeneratePaper(context.Background(), "mathematics", 5, 1, 181, testStudent(), "")
	assert.ErrorIs(t, err, cbt.ErrInvalidInput)
}

func TestCBTPaperFiltersByTopic(t *testing.T) {
	svc := newSeededCBT(t)
	topics, err := svc.ListTopics(context.Background(), "mathematics")
	require.NoError(t, err)
	assert.ElementsMatch(t, []string{"Algebra", "Number bases"}, topics)

	paper, err := svc.GeneratePaper(context.Background(), "mathematics", 10, 0, 0, testStudent(), "Number bases")
	require.NoError(t, err)
	require.Len(t, paper.Questions, 1)
	assert.Equal(t, "Number bases", paper.Questions[0].Topic)
}

func TestCBTPaperFiltersByDifficulty(t *testing.T) {
	svc := newSeededCBT(t)
	// mini bank mathematics: difficulty 1, 2, 3 (one each).
	for _, d := range []int{1, 2, 3} {
		paper, err := svc.GeneratePaper(context.Background(), "mathematics", 10, d, 0, testStudent(), "")
		require.NoError(t, err)
		require.Len(t, paper.Questions, 1, "difficulty %d should match exactly one question", d)
		assert.Equal(t, d, paper.Questions[0].Difficulty)
	}
	mixed, err := svc.GeneratePaper(context.Background(), "mathematics", 10, 0, 0, testStudent(), "")
	require.NoError(t, err)
	assert.Len(t, mixed.Questions, 3)
}

func testStudent() uuid.UUID { return uuid.MustParse("11111111-1111-1111-1111-111111111111") }

func TestCBTAttemptTokenBindsDrawAndDeadline(t *testing.T) {
	now := time.Date(2026, 9, 8, 12, 0, 0, 0, time.UTC)
	svc := newSeededCBT(t).WithClock(func() time.Time { return now })
	other := uuid.MustParse("22222222-2222-2222-2222-222222222222")

	paper, err := svc.GeneratePaper(context.Background(), "mathematics", 3, 0, 5, testStudent(), "")
	require.NoError(t, err)
	require.Len(t, paper.Questions, 3)
	assert.Equal(t, now.Add(5*time.Minute), paper.Deadline)

	good := 1
	answers := make([]GradeAnswer, 0, 3)
	for _, q := range paper.Questions {
		answers = append(answers, GradeAnswer{QuestionID: q.ID, SelectedIndex: &good})
	}

	// Happy path inside the window.
	res, err := svc.GradePaper(context.Background(), testStudent(), paper.AttemptToken, answers)
	require.NoError(t, err)
	assert.Equal(t, 3, res.Total)
	assert.Equal(t, 3, res.Correct)

	// Tampered token (flip a character in the payload).
	tampered := paper.AttemptToken[:12] + string(rune(paper.AttemptToken[12]+1)) + paper.AttemptToken[13:]
	if tampered == paper.AttemptToken { // extremely unlikely collision guard
		tampered = paper.AttemptToken + "x"
	}
	_, err = svc.GradePaper(context.Background(), testStudent(), tampered, answers)
	assert.ErrorIs(t, err, cbt.ErrAttemptInvalid)

	// Cross-student replay: signature valid, sid mismatch.
	_, err = svc.GradePaper(context.Background(), other, paper.AttemptToken, answers)
	assert.ErrorIs(t, err, cbt.ErrAttemptInvalid)

	// Answer for a question that was never drawn.
	stray := append(append([]GradeAnswer(nil), answers...),
		GradeAnswer{QuestionID: uuid.New(), SelectedIndex: &good})
	_, err = svc.GradePaper(context.Background(), testStudent(), paper.AttemptToken, stray)
	assert.ErrorIs(t, err, cbt.ErrAttemptInvalid)

	// Past the deadline â†’ expired.
	svc.WithClock(func() time.Time { return now.Add(5*time.Minute + attemptGrace + time.Second) })
	_, err = svc.GradePaper(context.Background(), testStudent(), paper.AttemptToken, answers)
	assert.ErrorIs(t, err, cbt.ErrAttemptExpired)

	// Inside the grace window the auto-submit still grades.
	svc.WithClock(func() time.Time { return now.Add(5*time.Minute + attemptGrace - time.Second) })
	res, err = svc.GradePaper(context.Background(), testStudent(), paper.AttemptToken, answers)
	require.NoError(t, err)
	assert.Equal(t, 3, res.Correct)
}

func TestCBTGradeWithoutTokenKeepsLegacyPath(t *testing.T) {
	svc := newSeededCBT(t)
	paper, err := svc.GeneratePaper(context.Background(), "mathematics", 3, 0, 0, testStudent(), "")
	require.NoError(t, err)
	good := 1
	answers := []GradeAnswer{{QuestionID: paper.Questions[0].ID, SelectedIndex: &good}}
	res, err := svc.GradePaper(context.Background(), testStudent(), "", answers)
	require.NoError(t, err)
	assert.Equal(t, 1, res.Correct)
}

func TestCBTGradeServerSide(t *testing.T) {
	svc := newSeededCBT(t)
	paper, err := svc.GeneratePaper(context.Background(), "mathematics", 3, 0, 0, testStudent(), "")
	require.NoError(t, err)

	answers := make([]GradeAnswer, 0, len(paper.Questions))
	// mathematics CSV keys are all index 1 â†’ answer 1 correctly, skip 1, flub 1.
	good := 1
	answers = append(answers, GradeAnswer{QuestionID: paper.Questions[0].ID, SelectedIndex: &good})
	answers = append(answers, GradeAnswer{QuestionID: paper.Questions[1].ID}) // unanswered
	bad := 2
	answers = append(answers, GradeAnswer{QuestionID: paper.Questions[2].ID, SelectedIndex: &bad})

	res, err := svc.GradePaper(context.Background(), testStudent(), "", answers)
	require.NoError(t, err)
	assert.Equal(t, 3, res.Total)
	assert.Equal(t, 1, res.Correct)
	assert.InDelta(t, 33, res.Score, 1)
	require.Len(t, res.Review, 3)
	for _, r := range res.Review {
		assert.Equal(t, 1, r.CorrectIndex) // key revealed only in review
		assert.NotEmpty(t, r.Explanation)
	}

	_, err = svc.GradePaper(context.Background(), testStudent(), "", nil)
	assert.ErrorIs(t, err, cbt.ErrInvalidInput)
}

func TestCBTAdminLifecycle(t *testing.T) {
	svc := newSeededCBT(t)

	qs, total, err := svc.ListQuestions(context.Background(), "english", 1, 2)
	require.NoError(t, err)
	assert.Equal(t, 2, total)
	assert.Len(t, qs, 2)

	// unpublished questions drop out of papers
	require.NoError(t, svc.SetStatus(context.Background(), qs[0].ID, "draft"))
	subjects, err := svc.ListSubjects(context.Background())
	require.NoError(t, err)
	for _, s := range subjects {
		if s.Slug == "english" {
			assert.Equal(t, 1, s.QuestionCount)
		}
	}

	// duplicate stem â†’ conflict
	err = svc.CreateQuestion(context.Background(), "english", "English Language", "ss2", "arts", cbt.Question{
		Topic: "Grammar", Difficulty: 1, Stem: qs[0].Stem,
		Options: []string{"a", "b"}, CorrectIndex: 0,
	})
	assert.ErrorIs(t, err, cbt.ErrDuplicateStem)

	// new unique question â†’ created published
	err = svc.CreateQuestion(context.Background(), "english", "English Language", "ss2", "arts", cbt.Question{
		Topic: "Comprehension", Difficulty: 2, Stem: "A story's lesson is itsâ€¦",
		Options: []string{"plot", "moral"}, CorrectIndex: 1, Explanation: "definition",
	})
	require.NoError(t, err)

	// delete round-trip
	all, total, err := svc.ListQuestions(context.Background(), "english", 1, 50)
	require.NoError(t, err)
	require.Equal(t, 3, total) // 2 originals (1 now draft) + 1 new
	for _, q := range all {
		if q.Topic == "Comprehension" {
			require.NoError(t, svc.DeleteQuestion(context.Background(), q.ID))
		}
	}
	_, total, err = svc.ListQuestions(context.Background(), "english", 1, 50)
	require.NoError(t, err)
	assert.Equal(t, 2, total) // new question deleted, originals remain

	assert.ErrorIs(t, svc.DeleteQuestion(context.Background(), uuid.New()), cbt.ErrNotFound)
}

func TestCBTImportRejectsBadRows(t *testing.T) {
	svc := NewCBTService(memory.NewCBTMemory())
	csv := `subjectSlug,subjectName,classLevel,department,topic,difficulty,stem,optionA,optionB,optionC,optionD,correctIndex,explanation,source
mathematics,Mathematics,ss2,science,Algebra,1,valid row,1,2,3,4,0,ok,curriculum
mathematics,Mathematics,ss2,science,Algebra,1,missing options,,,,,0,,curriculum
mathematics,Mathematics,ss2,science,Algebra,1,bad correct index,1,2,3,4,9,,curriculum
`
	imported, skipped, err := svc.ImportCSV(context.Background(), strings.NewReader(csv))
	require.NoError(t, err)
	assert.Equal(t, 1, imported)
	assert.Equal(t, 2, skipped)
}