package httpapi

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"ykay-virtual/internal/storage"
)

// Security CF-2 regression: the LocalStorage object-serving route must never be
// mounted in production. A nil handler keeps it unregistered in the router.
func TestObjectHandler_NotMountedInProduction(t *testing.T) {
	ls := storage.NewLocalStorage()
	assert.Nil(t, NewObjectHandlerForEnvironment(ls, "production"))
	assert.NotNil(t, NewObjectHandlerForEnvironment(ls, "development"))
	assert.NotNil(t, NewObjectHandlerForEnvironment(ls, "staging"))
}
