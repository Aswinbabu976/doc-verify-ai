# DocVerify AI

**AI-assisted document verification with human review.**

DocVerify AI is a student project for helping organizations review submitted documents. It aims to extract information from documents, check it against configured rules, and prepare a report that explains its findings and sources.

## Important

AI supports the review process; it does not make the final decision. A human reviewer checks the evidence and records the final decision.

Use only synthetic or anonymized documents for development and testing. Do not upload real identity documents or other real personal documents to this project or to an external AI service. Never commit passwords, API keys, or other secrets.

## Project roles

- **Applicant:** uploads documents and tracks an application.
- **Reviewer:** checks documents and AI findings, then records a decision.
- **Administrator:** manages users, document types, rules, and reference materials.

## Planned workflow

1. An applicant creates an application and uploads documents.
2. The system extracts text and relevant fields.
3. It checks the information against configured rules and reference sources.
4. It prepares a report with findings, explanations, and source references.
5. A human reviewer checks the report and records the final decision.

## Project status

- **Phase 1 - Product definition:** drafted.
- **Phase 2 - Core platform:** planned.
- **Phase 3 - AI and RAG integration:** planned.
- **Phase 4 - Testing and evaluation:** planned.
- **Phase 5 - Final documentation and video:** planned.

## Selected technology

- Frontend: React with Vite
- Backend: Python with FastAPI
- Main database: MongoDB
- Vector database: Qdrant (container setup in Phase 2; AI/RAG use in Phase 3)
- Local services: Docker Compose
- Continuous integration: GitHub Actions

See [the architecture document](docs/architecture.md) for details.

## Repository structure

- `backend/` - backend application files
- `docs/` - project documentation
- `personas/` - user personas
- `scenarios/` - usage scenarios
- `user-stories/` - user stories and acceptance criteria

## Setup

### Requirements
- Docker Desktop installed and running.

### Start the application
From the repository root, run `docker compose up --build -d`.

### Open the services
- Frontend: http://localhost:5173/
- Backend health check: http://localhost:8000/health
- Qdrant dashboard: http://localhost:6333/dashboard

### Stop the application
From the repository root, run `docker compose down`.

MongoDB and Qdrant data remain in their Docker volumes.

## Project backlog

GitHub Project: [DocVerify AI Backlog](https://github.com/users/Aswinbabu976/projects/2/views/1?layout=board)

## Author

Aswin Babu
MIT 5.2 - Senior IT Project Retake, Winter Semester 2026/27
instructor: Dr Ali Alhossseini

## License

To be decided.