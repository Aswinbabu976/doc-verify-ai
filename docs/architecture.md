# DocVerify AI Architecture

## Selected technology stack

- Frontend: React with Vite
- Backend: Python with FastAPI
- Main database: MongoDB
- Vector database: Qdrant
- Local services: Docker Compose
- Continuous integration: GitHub Actions

## Phase 2 application flow

The applicant, reviewer, or administrator uses the React website. The website sends requests to the FastAPI backend. The backend checks the user's role, handles application and document actions, and stores account, application, status, and document metadata in MongoDB.

Uploaded test files will be stored in protected local storage managed by Docker, with their metadata recorded in MongoDB.

## Vector database and AI scope

Qdrant will run as a service in Docker Compose. During Phase 2 it is included as infrastructure only. OCR, embeddings, retrieval, and other AI/RAG features are planned for Phase 3. Qdrant will hold vector data and references, not original uploaded files.

## Development and data safeguards

- Docker Compose will start the frontend, backend, MongoDB, and Qdrant services.
- GitHub Actions will build the services and run linting and automated tests on pushes and pull requests.
- Role permissions will be checked by the backend.
- Use synthetic or anonymized documents only.
- Keep passwords, API keys, and other secrets out of Git.