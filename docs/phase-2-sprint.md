# Phase 2 Sprint: Implementation and Development Workflow



## Goal



Build the core DocVerify AI application without AI features, and establish a development workflow using Git, Docker, GitHub Projects, and GitHub Actions.



## Scope

- User registration and login with Applicant, Reviewer, and Admin roles

- PDF document upload and storage

- Application tracking and reviewer workflow

- Basic administration and versioned verification rules

- Audit history

- Docker Compose setup for the application services

- GitHub Actions CI for linting, tests, and build checks



## Completed work



- Implemented authentication and role-based access for applicants, reviewers, and administrators.

- Added PDF uploads with file validation and storage.

- Added application tracking, reviewer queue, document review, final decisions, and requests for additional documents.

- Added administrator user-role management and versioned verification rules.

- Added audit events for key actions and an administrator audit-history view.

- Added Docker Compose services for the frontend, backend, MongoDB, and Qdrant.

- Added a GitHub Actions workflow for backend linting and tests and frontend build checks.

- Tracked work on the GitHub Project board, with issues and pull requests.



## Verification



The local Docker Compose status showed all four services running:



- Frontend — running

- Backend — healthy

- MongoDB — healthy

- Qdrant — running



The GitHub Actions run shown after the latest import-order fix passed. Confirm the latest run on `main` is still green before submitting.



## Pull requests



- Docker/application setup: PR #15

- Document upload: PR #19

- User-role administration: PR #25

- Other Phase 2 feature pull requests: add links here



## Not included in Phase 2



AI-based verification findings and application-question answering are planned for Phase 3.



## Retrospective



### What went well



- Feature branches and pull requests kept changes organized.

- Docker Compose made the services available together.

- CI caught lint and frontend build issues before merging.



### Challenges


- Import ordering and missing frontend component files caused CI build failures during development.

- These issues were fixed before the successful CI run shown.



### Follow-up


- Confirm branch protection and required checks on `main`.

- Keep the README setup instructions and this sprint document aligned with the current Compose configuration.

