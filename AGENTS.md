# AGENTS.md

## 1. Project Overview

This is a monorepo for an academic media aggregation platform inspired by services such as Kinopoisk and Netflix.

The platform aggregates and presents:

* Movies
* TV series
* Anime
* Cartoons
* Donghua
* Doramas
* Other serialized and episodic media

Core user features include:

* Registration and authentication
* User profiles
* Search
* Filtering and sorting
* Content pages
* Seasons and episodes
* Ratings
* Comments
* Bookmarks / favorites
* Watch history
* Watch progress
* External content providers
* Provider-specific external IDs
* Responsive dark-only interface

The project is a monorepo.

The frontend and backend are separate applications and communicate through a documented HTTP API.

---

# 2. Repository Structure

Expected high-level structure:

```text
/
├── apps/
│   ├── frontend/
│   └── backend/
│
├── packages/
│   ├── shared/
│   └── api-contracts/
│
├── database/
├── docker/
├── scripts/
├── .agents/
│   └── skills/
│
├── AGENTS.md
├── README.md
└── ...
```

Backend:

```text
apps/backend/
├── app/
│   ├── api/
│   │   ├── routes/
│   │   ├── dependencies.py
│   │   └── router.py
│   │
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   └── database.py
│   │
│   ├── models/
│   ├── schemas/
│   ├── repositories/
│   ├── services/
│   ├── providers/
│   ├── exceptions/
│   └── main.py
│
├── alembic/
├── tests/
├── pyproject.toml
└── ...
```

The exact directory structure may evolve if there is a clear architectural reason.

Do not introduce unnecessary layers solely for the sake of abstraction.

---

# 3. Technology Stack

## Frontend

The existing frontend stack MUST remain unchanged:

* React
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui
* ESLint

Do not replace or migrate the frontend to another framework or build system.

shadcn/ui is the primary generic UI component system.

Tailwind CSS is the styling layer.

The frontend is dark-only.

Primary visual tokens:

```text
Background: #000000
Primary / Accent: #FF002F
```

Do not reintroduce `#100101`.

Preserve the existing frontend architecture and functionality when modifying the backend.

---

# 4. Backend Technology Stack

* Python (adhering strictly to PEP 8)
* uv (package, dependency, virtual environment, and tool management)
* FastAPI
* SQLAlchemy 2.x
* Alembic
* PostgreSQL
* Pydantic / Pydantic Settings
* Python type hints
* pytest
* Ruff (linter and code formatter conforming to PEP 8)
* mypy (strict static type checker)

Preferred dependency management:

* `pyproject.toml`
* `uv` is the ONLY Python package manager and runner for the backend.
* Use `uv` for all dependency management (`uv add`, `uv remove`, `uv sync`), virtual environment management, and execution (`uv run`).
* Do NOT use raw `pip` or direct `python` commands without `uv`.
* Do not introduce multiple package managers (e.g. poetry, pipenv, conda).

Recommended runtime & tooling:

```text
Python 3.12+ (PEP 8 compliant)
uv
FastAPI
Uvicorn
SQLAlchemy 2.x
Alembic
asyncpg
Pydantic v2
pydantic-settings
pytest
httpx
Ruff
mypy
```

Do not add dependencies unless they solve a concrete project requirement.

---

# 5. Backend Architecture

Use a modular layered architecture:

```text
HTTP Request
    ↓
FastAPI Router
    ↓
Dependency / Authentication
    ↓
Service / Use Case
    ↓
Repository
    ↓
SQLAlchemy
    ↓
PostgreSQL
```

External providers follow a separate abstraction:

```text
Service
    ↓
Provider Interface
    ↓
Provider Implementation
    ↓
External API
```

Routes must remain thin.

Business logic belongs in services/use cases.

Database access belongs in repositories.

SQLAlchemy models belong in the model layer.

Pydantic schemas belong in the API/schema layer.

External API integrations belong in providers.

Do not put large amounts of business logic directly inside FastAPI route functions.

---

# 6. FastAPI Rules

Use FastAPI idiomatically.

Prefer:

* `APIRouter`
* dependency injection
* typed request/response models
* Pydantic schemas
* async endpoints where appropriate
* centralized exception handling
* reusable dependencies
* explicit response models

Example structure:

```python
router = APIRouter(prefix="/content", tags=["content"])


@router.get("/{content_id}", response_model=ContentResponse)
async def get_content(
    content_id: UUID,
    service: ContentService = Depends(get_content_service),
) -> ContentResponse:
    return await service.get_content(content_id)
```

Avoid:

* global mutable state
* database queries directly inside routes
* untyped dictionaries as the primary API contract
* duplicated validation
* giant route modules
* unnecessary middleware

---

# 7. SQLAlchemy

Use SQLAlchemy 2.x style.

Prefer typed declarative models:

```python
class Content(Base):
    __tablename__ = "contents"

    id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
    )

    title: Mapped[str] = mapped_column(String(255))
```

Use:

* `Mapped`
* `mapped_column`
* typed relationships
* explicit constraints
* indexes where justified
* PostgreSQL-specific types when useful

Avoid legacy SQLAlchemy patterns.

Do not use raw SQL unless:

1. SQLAlchemy cannot reasonably express the operation, or
2. raw SQL provides a clear and measurable benefit.

When raw SQL is necessary, keep it isolated and documented.

---

# 8. Database

PostgreSQL is the primary database.

The database is the source of truth for application-owned data.

Important domains include:

```text
users
content
content_external_ids
genres
content_genres
people
content_people
seasons
episodes
providers
comments
ratings
bookmarks
watch_history
watch_progress
```

The exact schema may differ depending on the existing implementation.

Do not blindly recreate the database from scratch when migrating the PHP backend.

First inspect the existing schema and preserve compatible data structures wherever practical.

---

# 9. Alembic

Alembic is the ONLY database migration mechanism.

Never manually modify production schema without a corresponding migration.

Migration workflow:

```text
Model change
    ↓
Alembic migration
    ↓
Review migration
    ↓
Apply migration
```

Every schema change must have a migration.

Migration files must be:

* deterministic
* readable
* reversible where practical
* safe for existing data

Do not generate migrations and blindly commit them without reviewing their SQL implications.

Never delete existing migrations simply to make the migration history look cleaner unless explicitly requested.

---

# 10. Pydantic Schemas

Separate database models from API schemas.

Use Pydantic for:

* request validation
* response serialization
* query parameter validation
* API contracts
* provider normalization where appropriate

Example:

```python
class ContentResponse(BaseModel):
    id: UUID
    title: str
    description: str | None = None

    model_config = ConfigDict(from_attributes=True)
```

Do not expose SQLAlchemy models directly as the public API contract.

---

# 11. Repository Layer

Repositories encapsulate persistence operations.

Example:

```python
class ContentRepository:
    async def get_by_id(
        self,
        content_id: UUID,
    ) -> Content | None:
        ...
```

Repositories should not contain HTTP-specific behavior.

Repositories should not know about FastAPI request/response objects.

---

# 12. Service Layer

Services contain business logic and orchestrate repositories/providers.

Example:

```python
class ContentService:
    def __init__(
        self,
        repository: ContentRepository,
        providers: ProviderRegistry,
    ):
        self.repository = repository
        self.providers = providers
```

Services may:

* validate business rules
* combine repository operations
* synchronize provider data
* normalize external content
* calculate watch progress
* enforce ownership rules
* coordinate transactions

Do not duplicate the same business rules across routes.

---

# 13. Provider Architecture

External APIs are first-class integrations.

The application should NOT tightly couple its domain model to a single external provider.

Use provider abstractions.

Example:

```python
class ContentProvider(Protocol):
    async def search(self, query: str) -> list[ProviderContent]:
        ...

    async def get_content(
        self,
        external_id: str,
    ) -> ProviderContent | None:
        ...

    async def get_episodes(
        self,
        external_id: str,
    ) -> list[ProviderEpisode]:
        ...
```

Possible providers may include:

```text
Anixart
Kinopoisk
TMDB
Jikan
AniList
TVMaze
Other external APIs
```

These are examples, not mandatory dependencies.

The application must tolerate provider failure.

One external API being unavailable must not crash the entire backend.

Use:

* timeouts
* retries where appropriate
* error isolation
* provider-specific exceptions
* caching where justified
* rate-limit awareness

Never assume an unofficial API will remain stable forever.

---

# 14. External API Rules

When integrating unofficial/reverse-engineered APIs:

* isolate the integration behind a provider
* do not spread provider-specific response structures throughout the application
* normalize external data into internal DTOs/models
* define explicit timeouts
* handle malformed responses
* handle rate limits
* handle provider downtime
* avoid excessive requests
* cache data when appropriate

Do not implement mechanisms intended to bypass:

* authentication
* CAPTCHA
* DRM
* access controls
* rate limits
* paywalls
* security controls

Use publicly accessible APIs and documented/reverse-engineered client implementations responsibly.

---

# 15. Authentication

Authentication must be implemented securely.

Requirements include:

* password hashing using a modern password hashing algorithm
* secure session/token handling
* authentication dependencies
* authorization checks
* ownership validation
* no plaintext passwords
* no secrets in source code

Sensitive configuration must come from environment variables.

Example:

```text
DATABASE_URL=
SECRET_KEY=
JWT_SECRET=
```

Never commit real credentials.

---

# 16. Authorization

Authentication and authorization are separate concepts.

Every protected operation must verify:

1. The user is authenticated.
2. The user has permission to perform the operation.
3. The requested resource belongs to or is accessible by that user when applicable.

Examples:

* A user can edit their own profile.
* A user can delete their own comment.
* A user cannot modify another user's private watch history.
* Administrative functionality must use explicit authorization checks.

Never trust user IDs supplied by the client without validating ownership.

---

# 17. Comments

Comments must support:

* authenticated creation
* editing by owner
* deletion by owner
* appropriate authorization
* pagination
* validation
* timestamps

Do not trust client-provided ownership information.

---

# 18. Ratings

Ratings must:

* belong to an authenticated user
* reference valid content
* enforce valid rating ranges
* prevent invalid duplicate state
* support updating an existing rating if required by the product

Use database constraints where appropriate.

Do not rely exclusively on frontend validation.

---

# 19. Bookmarks / Favorites

Bookmarks must:

* belong to a user
* reference valid content
* prevent duplicate bookmarks
* support add/remove operations
* support listing the user's bookmarks

Use a database uniqueness constraint for `(user_id, content_id)` where appropriate.

---

# 20. Watch History and Progress

Watch tracking should support:

```text
user
content
season
episode
position
duration
completed
updated_at
```

The backend must validate ownership and referenced entities.

Watch progress should be idempotent where practical.

Repeated progress updates should not create uncontrolled duplicate rows.

---

# 21. Search

Search endpoints must support:

* text search
* pagination
* filtering
* sorting where appropriate

Do not load the entire database into Python and filter it in application memory.

Filtering and pagination should happen at the database level whenever possible.

---

# 22. Pagination

Collection endpoints must use pagination.

Prefer a consistent API contract.

Example:

```json
{
  "items": [],
  "page": 1,
  "page_size": 20,
  "total": 0
}
```

Do not allow unlimited database queries from public endpoints.

Set sensible maximum page sizes.

---

# 23. API Design

API endpoints should be predictable and REST-oriented.

Example:

```text
GET    /api/v1/content
GET    /api/v1/content/{id}
GET    /api/v1/content/{id}/seasons
GET    /api/v1/content/{id}/episodes

GET    /api/v1/search

POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/users/me

GET    /api/v1/bookmarks
POST   /api/v1/bookmarks
DELETE /api/v1/bookmarks/{content_id}

POST   /api/v1/ratings
DELETE /api/v1/ratings/{content_id}

GET    /api/v1/comments
POST   /api/v1/comments
PATCH  /api/v1/comments/{comment_id}
DELETE /api/v1/comments/{comment_id}

GET    /api/v1/watch-history
PUT    /api/v1/watch-progress
```

The exact endpoints should follow the existing frontend's needs.

Do not break existing frontend contracts unnecessarily.

---

# 24. API Versioning

Use:

```text
/api/v1/...
```

for the public API.

Avoid unnecessary version changes.

If an API contract must change, update the frontend and backend coherently.

---

# 25. Error Handling

Use consistent JSON errors.

Example:

```json
{
  "error": {
    "code": "CONTENT_NOT_FOUND",
    "message": "Content not found"
  }
}
```

Do not expose:

* stack traces
* database credentials
* SQL statements
* internal filesystem paths
* sensitive provider data

to clients in production responses.

Use application-specific exceptions and centralized handlers where appropriate.

---

# 26. Transactions

Database transactions must be deliberate.

A service operation that modifies multiple related entities should use an appropriate transaction boundary.

Avoid:

```text
commit()
commit()
commit()
commit()
```

inside one logical operation.

Prefer a coherent transaction.

---

# 27. Async Rules

Use async I/O where appropriate.

The stack is:

```text
FastAPI
SQLAlchemy async
asyncpg
httpx
```

Do not perform blocking network calls directly inside async endpoints.

If a library is synchronous and cannot be replaced, isolate the blocking work appropriately.

Do not blindly make every function async without a reason.

---

# 28. Configuration

Use environment-based configuration.

Recommended:

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    secret_key: str

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )
```

Never hardcode:

* database passwords
* API tokens
* JWT secrets
* provider credentials
* production URLs containing secrets

---

# 29. Testing and Code Quality

Backend tests use pytest (executed via `uv run pytest`).
Static analysis and formatting use Ruff and mypy (executed via `uv run ruff` and `uv run mypy`).
All Python code must strictly follow PEP 8 standards.

Test:

* authentication
* authorization
* services
* repositories
* API endpoints
* validation
* provider adapters
* critical business rules

Code Quality Rules:

* All tooling commands must be run via `uv` (`uv run pytest`, `uv run ruff`, `uv run mypy`)
* PEP 8 compliance is enforced via `uv run ruff check .` and `uv run ruff format --check .`
* Type safety and consistency are enforced via `uv run mypy app`
* Prefer testing behavior over implementation details.
* Important API paths should have integration tests.
* Tests must not depend on live external APIs unless explicitly designated as integration tests.
* Mock or fake external providers in normal test suites.

---

# 30. Security

Follow secure backend practices.

Protect against:

* SQL injection
* broken authorization
* insecure direct object references
* mass assignment
* credential leakage
* unsafe deserialization
* SSRF
* unrestricted resource consumption
* malformed external provider responses

Validate all external input.

Never trust:

* client IDs
* ownership fields
* provider responses
* query parameters
* uploaded data

Use parameterized SQL through SQLAlchemy.

---

# 31. CORS

CORS must be explicitly configured.

Do not use unrestricted:

```text
allow_origins=["*"]
```

for authenticated production requests unless there is a concrete reason and the security implications are understood.

Use environment-based frontend origins.

---

# 32. Logging

Logs should contain useful operational information without leaking secrets.

Never log:

* passwords
* authentication tokens
* cookies
* API keys
* authorization headers
* sensitive personal information

Provider errors should include enough context to debug failures without exposing secrets.

---

# 33. Docker

If Docker is already used by the repository, keep the development environment reproducible.

Typical services:

```text
frontend
backend
postgres
```

Do not introduce Kubernetes or microservices unless explicitly required.

The backend should remain a single modular application.

---

# 34. Frontend Compatibility

The React frontend is an existing consumer of the backend.

When changing backend behavior:

1. Inspect existing frontend API usage.
2. Preserve compatible endpoints when practical.
3. Preserve response shapes when practical.
4. Update API contracts if necessary.
5. Test important frontend/backend flows.

Do not rewrite frontend functionality merely because the backend implementation changed.

---

# 35. shadcn/ui

shadcn/ui remains the frontend's primary generic component system.

Use shadcn/ui for generic primitives such as:

* Button
* Input
* Textarea
* Select
* Dialog
* DropdownMenu
* Tabs
* Card
* Badge
* Tooltip
* Avatar
* Skeleton
* Sheet
* Popover
* Command
* Form

Domain-specific components remain custom.

Examples:

```text
MovieCard
MovieHero
EpisodeCard
ContentGrid
CommentItem
RatingWidget
WatchProgress
SeasonSelector
```

These should compose reusable shadcn/ui primitives instead of reinventing generic controls.

---

# 36. UI Design

Dark-only.

Primary background:

```text
#000000
```

Primary accent:

```text
#FF002F
```

The visual direction should remain cinematic and media-focused.

Do not replace the existing design with default shadcn styling.

shadcn components should be adapted to the project's visual system.

---

# 37. Git

Use Git branches for coherent work.

Branch naming should be descriptive.

Examples:

```text
python-version
feature/auth
feature/search
fix/provider-timeout
refactor/backend
```

Never use destructive Git operations unless explicitly requested.

Do not use:

```text
git reset --hard
git clean -fd
```

or equivalent destructive commands without explicit permission.

Never commit:

* `.env`
* secrets
* API keys
* passwords
* private credentials
* generated local databases

---

# 38. Conventional Commits

The agent is responsible for automatically creating Conventional Commits after completing coherent logical work.

Format:

```text
<type>(<scope>): <description>
```

Allowed common types:

```text
feat
fix
refactor
test
docs
style
chore
build
perf
```

Examples:

```text
feat(auth): implement JWT authentication
feat(content): add provider abstraction
refactor(backend): migrate persistence layer to SQLAlchemy
fix(search): handle empty queries
test(content): add content service tests
chore(deps): update backend dependencies
```

Before committing:

1. Run validation.
2. Inspect the diff.
3. Ensure unrelated files are not included.
4. Ensure secrets are not included.
5. Create a clear Conventional Commit.

Do not create meaningless commits such as:

```text
update
changes
fix stuff
work
```

If work naturally consists of multiple coherent changes, separate commits are preferred.

---

# 39. Development Workflow

For every substantial task:

### Step 1 — Inspect

Understand:

* existing code
* architecture
* database
* API contracts
* frontend API usage
* tests
* configuration

Do not modify files before understanding their role.

### Step 2 — Plan

Identify:

* affected modules
* dependencies
* database changes
* API changes
* migration requirements
* tests

### Step 3 — Implement

Implement the smallest coherent solution.

Avoid unnecessary rewrites.

### Step 4 — Validate

Run appropriate:

```text
uv run pytest
uv run ruff check .
uv run ruff format --check .
uv run mypy app
uv run alembic upgrade head
frontend lint
frontend build
```

Use only tools actually configured in the repository.

### Step 5 — Review

Inspect:

```text
git diff
git status
```

Look for:

* accidental changes
* duplicated code
* security problems
* broken API contracts
* missing migrations
* missing tests

### Step 6 — Commit

Create a Conventional Commit after successful validation.

---

# 40. Backend Migration Principle

The backend is allowed to evolve substantially.

However, migration from PHP to Python must preserve application behavior unless a behavior change is explicitly requested.

The migration should preserve:

* API capabilities
* authentication behavior
* content functionality
* search
* filtering
* comments
* ratings
* bookmarks
* watch history
* watch progress
* provider integrations
* frontend compatibility

The implementation may change completely.

The product behavior should not.

---

# 41. What NOT To Do

Do not:

* rewrite the React frontend
* replace Vite
* replace TypeScript
* remove Tailwind
* replace shadcn/ui
* introduce another frontend framework
* introduce microservices
* introduce Kubernetes
* introduce GraphQL without explicit need
* add Redis without a concrete requirement
* add Celery without a concrete background-job requirement
* add unnecessary abstractions
* copy PHP architecture literally into Python
* put SQLAlchemy queries inside every route
* expose SQLAlchemy models directly as API schemas
* use `pip` or global `python` directly instead of `uv`
* bypass `uv` for dependency and environment management
* commit secrets
* silently change API contracts
* delete migrations without explicit reason
* bypass provider authentication/security controls
* build unnecessary infrastructure

---

# 42. Definition of Done

A backend task is complete when:

* implementation is finished
* architecture remains coherent
* types are correct and validated with `uv run mypy app`
* PEP 8 compliance and linting validated with `uv run ruff check .` and `uv run ruff format --check .`
* API behavior is documented/consistent
* database changes have Alembic migrations
* security requirements are satisfied
* tests are added or updated where appropriate
* existing frontend integration is preserved
* lint/type checks pass (`uv run ruff`, `uv run mypy`)
* tests pass (`uv run pytest`)
* production build/integration checks pass where applicable
* `git diff` has been reviewed
* no secrets are present
* a Conventional Commit has been created

The goal is not merely to make the code run.

The goal is to maintain a clean, understandable, secure and extensible academic project that can continue to evolve.
