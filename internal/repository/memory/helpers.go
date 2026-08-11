package memory

import "time"

func nowUTC() time.Time { return time.Now().UTC() }

func timePtrNow() *time.Time {
	t := time.Now().UTC()
	return &t
}
