package meeting

import (
	"context"
	"strings"
	"testing"
	"time"
)

func TestJitsiCreate_PublicRoomURL(t *testing.T) {
	p := NewJitsi()
	end := time.Now().Add(time.Hour)
	link, err := p.Create(context.Background(), "00000000-0000-0000-0000-00000000c010", "Algebra", time.Now(), end)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(link.JoinURL, "https://meet.jit.si/yk-virtual-") {
		t.Fatalf("join URL = %q", link.JoinURL)
	}
	if link.ProviderRef == "" || link.ProviderRef == "stub-" {
		t.Fatalf("provider ref looks stubby: %q", link.ProviderRef)
	}
}
