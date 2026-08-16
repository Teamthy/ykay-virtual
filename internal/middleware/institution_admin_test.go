package middleware

import "testing"

// YK-008 regression: INSTITUTION_ADMIN must NOT be treated as a platform admin.
// Only SUPER_ADMIN and ACADEMIC_ADMIN gate the platform-wide admin/refund/
// payment routes. An institution admin must not get IsAdmin by default.
func TestIsPlatformAdmin(t *testing.T) {
	cases := []struct {
		name  string
		roles []string
		want  bool
	}{
		{"super admin is platform admin", []string{"SUPER_ADMIN"}, true},
		{"academic admin is platform admin", []string{"ACADEMIC_ADMIN"}, true},
		{"institution admin is NOT platform admin (YK-008)", []string{"INSTITUTION_ADMIN"}, false},
		{"institution + student still not platform admin", []string{"STUDENT", "INSTITUTION_ADMIN"}, false},
		{"tutor not admin", []string{"TUTOR"}, false},
		{"student not admin", []string{"STUDENT"}, false},
		{"empty not admin", []string{}, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := isPlatformAdmin(tc.roles); got != tc.want {
				t.Fatalf("isPlatformAdmin(%v) = %v, want %v", tc.roles, got, tc.want)
			}
		})
	}
}
