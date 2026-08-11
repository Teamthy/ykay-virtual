package location

import (
	"time"
	"github.com/google/uuid"
)

type LocationType string
const (
	TypeCountry LocationType = "COUNTRY"
	TypeState   LocationType = "STATE"
	TypeCity    LocationType = "CITY"
	TypeArea    LocationType = "AREA"
	TypeCustom  LocationType = "CUSTOM"
)

type Location struct {
	ID          uuid.UUID    `json:"id"`
	Name        string       `json:"name"`
	Slug        string       `json:"slug"`
	Type        LocationType `json:"type"`
	ParentID    *uuid.UUID   `json:"parent_id,omitempty"`
	CountryCode *string      `json:"country_code,omitempty"`
	Latitude    *float64     `json:"latitude,omitempty"`
	Longitude   *float64     `json:"longitude,omitempty"`
	IsActive    bool         `json:"is_active"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}
