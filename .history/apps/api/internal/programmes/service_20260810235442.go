package programmes

import (
	"fmt"
)

type Programme struct {
	ID         string  `json:"id"`
	Title      string  `json:"title"`
	Curriculum string  `json:"curriculum"`
	Level      string  `json:"level"`
	Subject    string  `json:"subject"`
	Format     string  `json:"format"`
	Summary    string  `json:"summary"`
	Price      float64 `json:"price"`
}

type Service struct {
	programmes []Programme
}

func NewService() *Service {
	return &Service{programmes: []Programme{
		{
			ID:         "prog-igcse-cs",
			Title:      "IGCSE Computer Science",
			Curriculum: "British Curriculum",
			Level:      "IGCSE",
			Subject:    "Computer Science",
			Format:     "Cohort",
			Summary:    "Structured online preparation for IGCSE Computer Science with live lessons and guided revision.",
			Price:      25000,
		},
		{
			ID:         "prog-waec-maths",
			Title:      "WAEC Mathematics Revision",
			Curriculum: "Nigerian Curriculum",
			Level:      "SSS3",
			Subject:    "Mathematics",
			Format:     "Private Tuition",
			Summary:    "Exam-focused revision for WAEC and school assessment preparation with parent visibility.",
			Price:      18000,
		},
	}}
}

func (s *Service) List() []Programme {
	out := make([]Programme, len(s.programmes))
	copy(out, s.programmes)
	return out
}

func (s *Service) Get(id string) (Programme, error) {
	for _, programme := range s.programmes {
		if programme.ID == id {
			return programme, nil
		}
	}
	return Programme{}, fmt.Errorf("programme %s not found", id)
}
