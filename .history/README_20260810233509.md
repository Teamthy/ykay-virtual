# YKAY Virtual School

This repository is the starting point for the YKAY Virtual School platform.

## Current status

The workspace was empty, so the initial step was to establish the project structure, architecture documentation, and foundational environment scaffolding for a modular monolith approach.

## Proposed architecture

- Frontend: Next.js + React + TypeScript + TanStack Query/Form/Table
- Backend: Go REST API in a modular monolith
- Data: PostgreSQL with migrations and sqlc
- Infrastructure: Docker Compose for PostgreSQL and Redis

## Repository structure

- apps/web — Next.js frontend
- apps/api — Go backend
- docs — product, architecture, and ADRs
- infra — environment and deployment assets
