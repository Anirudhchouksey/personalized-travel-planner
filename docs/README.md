# WanderAI Documentation Portal

Welcome to the comprehensive documentation directory for **WanderAI**, an AI-powered personalized travel itinerary planner.

This documentation suite covers every aspect of the project—from system architecture and development setup to production deployment, workflows, testing, limitations, and future roadmaps.

---

## Documentation Index

| Document | Description | Target Audience |
| :--- | :--- | :--- |
| [**Architecture & System Design**](file:///e:/personalized-travel-planner/docs/architecture.md) | Component architecture, technology stack, sequence diagrams, and security model. | Architects, Engineers |
| [**Local Setup & Development Guide**](file:///e:/personalized-travel-planner/docs/setup-guide.md) | Step-by-step local setup for Python backend, Node frontend, environment variables, and Docker. | Developers, Contributors |
| [**System & User Workflows**](file:///e:/personalized-travel-planner/docs/workflow.md) | Complete user journeys (wizard, regeneration, refinements, sharing, exports) and CI/CD pipelines. | Product Managers, Developers |
| [**Production Deployment Guide**](file:///e:/personalized-travel-planner/docs/deployment.md) | Zero-cost hosting guide for Render (FastAPI), Vercel (React), and Supabase (PostgreSQL). | DevOps, Maintainers |
| [**Verification & Testing Strategy**](file:///e:/personalized-travel-planner/docs/testing.md) | Pytest backend suite (57 tests), Vitest frontend suite (14 tests), and GitHub Actions automation. | QA, Developers |
| [**Known Limitations & Boundaries**](file:///e:/personalized-travel-planner/docs/limitations.md) | Analysis of free-tier limits (cold starts, 15 RPM rate limits), map constraints, and mitigations. | All Stakeholders |
| [**Project Conclusion & Roadmap**](file:///e:/personalized-travel-planner/docs/conclusion.md) | Executive summary, accomplishments, retrospective lessons learned, and future phases. | Evaluators, Stakeholders |
| [**REST API Documentation**](file:///e:/personalized-travel-planner/docs/api.md) | Comprehensive endpoint catalog with request/response schemas and curl examples. | Integrators, Frontend Devs |
| [**Database Architecture & Schema**](file:///e:/personalized-travel-planner/docs/database.md) | Supabase PostgreSQL schema, relational tables, constraints, and Row Level Security policies. | Backend & DB Engineers |

---

## Suggested Reading Paths

### 1. New Developer / Contributor
1. [Setup Guide](file:///e:/personalized-travel-planner/docs/setup-guide.md) $\rightarrow$ Get the app running locally in 5 minutes.
2. [Architecture](file:///e:/personalized-travel-planner/docs/architecture.md) $\rightarrow$ Understand how frontend, backend, AI, and database interact.
3. [Testing](file:///e:/personalized-travel-planner/docs/testing.md) $\rightarrow$ Learn how to run and write unit and integration tests.

### 2. DevOps & Deployment
1. [Deployment Guide](file:///e:/personalized-travel-planner/docs/deployment.md) $\rightarrow$ Deploy the free-tier stack on Render, Vercel, and Supabase.
2. [Limitations](file:///e:/personalized-travel-planner/docs/limitations.md) $\rightarrow$ Understand cloud boundaries (cold starts, rate limits) and optimizations.
3. [Testing](file:///e:/personalized-travel-planner/docs/testing.md) $\rightarrow$ Inspect CI quality gates in GitHub Actions.

### 3. Project Evaluator / Technical Reviewer
1. [Conclusion & Roadmap](file:///e:/personalized-travel-planner/docs/conclusion.md) $\rightarrow$ High-level summary of deliverables and engineering achievements.
2. [Workflows](file:///e:/personalized-travel-planner/docs/workflow.md) $\rightarrow$ Visual walkthrough of generation, editing, and companion collaboration.
3. [Architecture](file:///e:/personalized-travel-planner/docs/architecture.md) $\rightarrow$ Deep dive into the deterministic TSP routing and failover resilience.
