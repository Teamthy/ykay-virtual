package service

import (
	"context"
	"testing"

	"ykay-virtual/internal/domain/institution"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestInstitutionSvc() (*InstitutionService, *memory.InstitutionMemory, uuid.UUID, uuid.UUID, uuid.UUID) {
	store := memory.NewMemoryStore()
	repo := store.Institutions
	svc := NewInstitutionService(repo, NewAuditService(store.AuditLogs))
	owner := uuid.New()
	admin := uuid.New()
	instID := uuid.New()

	repo.Seed(&institution.Institution{ID: instID, Name: "Lekki International School", Slug: "lekki-school", Type: institution.TypeSchool, IsActive: true})
	_ = repo.AddMembership(context.Background(), &institution.Membership{InstitutionID: instID, UserID: owner, Role: institution.RoleOwner})
	_ = repo.AddMembership(context.Background(), &institution.Membership{InstitutionID: instID, UserID: admin, Role: institution.RoleAdmin})
	return svc, repo, instID, owner, admin
}

func TestInstitutionService_ListMine(t *testing.T) {
	svc, _, _, owner, _ := newTestInstitutionSvc()
	views, err := svc.ListMine(context.Background(), owner)
	require.NoError(t, err)
	require.Len(t, views, 1)
	assert.Equal(t, "Lekki International School", views[0].Institution.Name)
	assert.Equal(t, institution.RoleOwner, views[0].Role)
}

func TestInstitutionService_Update_RequiresManager(t *testing.T) {
	svc, repo, instID, _, admin := newTestInstitutionSvc()
	stranger := uuid.New()
	_ = repo.AddMembership(context.Background(), &institution.Membership{InstitutionID: instID, UserID: stranger, Role: institution.RoleStudent})

	name := "Renamed School"
	// A STUDENT (not manager) cannot edit.
	_, err := svc.Update(context.Background(), stranger, instID, false, InstitutionUpdateInput{Name: &name})
	require.Error(t, err)

	// An ADMIN can.
	got, err := svc.Update(context.Background(), admin, instID, false, InstitutionUpdateInput{Name: &name})
	require.NoError(t, err)
	assert.Equal(t, "Renamed School", got.Name)
}

func TestInstitutionService_InviteAndRoles(t *testing.T) {
	svc, repo, instID, owner, _ := newTestInstitutionSvc()
	member := uuid.New()

	// Owner invites a TEACHER.
	m, err := svc.InviteMember(context.Background(), owner, instID, member, institution.RoleTeacher)
	require.NoError(t, err)
	assert.Equal(t, institution.RoleTeacher, m.Role)

	// Owner promotes to ADMIN.
	err = svc.SetMemberRole(context.Background(), owner, instID, member, institution.RoleAdmin)
	require.NoError(t, err)
	mem, _ := repo.GetMembership(context.Background(), instID, member)
	assert.Equal(t, institution.RoleAdmin, mem.Role)

	// A STUDENT member (non-manager) cannot remove anyone.
	student := uuid.New()
	_, _ = svc.InviteMember(context.Background(), owner, instID, student, institution.RoleStudent)
	err = svc.RemoveMember(context.Background(), student, instID, owner)
	require.Error(t, err)
}

func TestInstitutionService_OwnerCannotSelfRemove(t *testing.T) {
	svc, _, instID, owner, _ := newTestInstitutionSvc()
	err := svc.RemoveMember(context.Background(), owner, instID, owner)
	require.Error(t, err)
}

func TestInstitutionService_Students(t *testing.T) {
	svc, _, instID, owner, _ := newTestInstitutionSvc()
	student := uuid.New()

	v, err := svc.AddStudent(context.Background(), owner, instID, student, "LEK-2026-001")
	require.NoError(t, err)
	assert.Equal(t, "LEK-2026-001", *v.EnrollmentRef)

	students, err := svc.ListStudents(context.Background(), owner, instID)
	require.NoError(t, err)
	require.Len(t, students, 1)
	assert.Equal(t, student, students[0].StudentProfileID)

	err = svc.RemoveStudent(context.Background(), owner, instID, student)
	require.NoError(t, err)
	students, _ = svc.ListStudents(context.Background(), owner, instID)
	assert.Len(t, students, 0)
}
