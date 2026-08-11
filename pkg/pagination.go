package pkg

import (
	"math"
	"strconv"
)

type PaginationParams struct {
	Page     int `json:"page"`
	PageSize int `json:"page_size"`
}

func (p PaginationParams) Offset() int {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.PageSize < 1 {
		p.PageSize = 20
	}
	if p.PageSize > 100 {
		p.PageSize = 100
	}
	return (p.Page - 1) * p.PageSize
}

func (p PaginationParams) Limit() int {
	if p.PageSize < 1 {
		return 20
	}
	if p.PageSize > 100 {
		return 100
	}
	return p.PageSize
}

type PaginationMeta struct {
	Page       int   `json:"page"`
	PageSize   int   `json:"page_size"`
	TotalItems int64 `json:"total_items"`
	TotalPages int   `json:"total_pages"`
	HasNext    bool  `json:"has_next"`
	HasPrev    bool  `json:"has_prev"`
}

func NewPaginationMeta(page, pageSize int, total int64) PaginationMeta {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))
	return PaginationMeta{
		Page:       page,
		PageSize:   pageSize,
		TotalItems: total,
		TotalPages: totalPages,
		HasNext:    page < totalPages,
		HasPrev:    page > 1,
	}
}

func ParsePaginationFromQuery(pageStr, pageSizeStr string) PaginationParams {
	page, _ := strconv.Atoi(pageStr)
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(pageSizeStr)
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	return PaginationParams{Page: page, PageSize: pageSize}
}
