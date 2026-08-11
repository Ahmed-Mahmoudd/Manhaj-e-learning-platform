# MANHAJ — Project Status

## Current Phase
**PHASE 4 — COMPLETE ✅ → Moving to PHASE 5**

## Current Feature
Phase 5 — Enrolment API (student self-enrol, drop, waitlist auto-promotion, prerequisite enforcement)

---

## Completed

### Phase 0 — Foundation ✅
- Laravel 12.65.0, PHP 8.2.12, MySQL via XAMPP
- Git + GitHub: https://github.com/Ahmed-Mahmoudd/Manhaj-e-learning-platform

### Phase 1 — Academic Core ✅

| Step | Feature | Tests |
|---|---|---|
| 1 | Tenancy (TenantContext, BelongsToTenant, Tenant model) | 5 ✅ |
| 2 | Roles & Permissions (Role enum, 12 Gates, EnsureRole middleware) | 19 ✅ |
| 3 | Institutional Hierarchy (Faculty→Dept→Programme, AcademicTerm) | 7 ✅ |
| 4 | Courses, Sections, Enrolment + EnrolmentService | 7 ✅ |
| 5 | Content — Modules, Lessons, LessonProgress + LessonProgressService | 10 ✅ |
| 6 | Demo DatabaseSeeder — 2 universities, full hierarchy, courses, students | ✅ |

### Phase 2 — REST API Layer ✅

| Step | Feature | Tests |
|---|---|---|
| 1 | Sanctum Auth — login, me, logout | 10 ✅ |
| 2 | ResolveTenant + RequireTenant middleware | 5 ✅ |
| 3 | Student Dashboard API — courses, lessons, progress update | 8 ✅ |
| 4 | Instructor Dashboard API — sections, enrolment roster | 6 ✅ |
| 5 | Grades API — GradeItem, StudentGrade, GradeService, publish flow | 13 ✅ |

### Phase 3 — Announcements ✅

| Step | Feature | Tests |
|---|---|---|
| 1 | Announcement + AnnouncementRead models | — |
| 2 | AnnouncementService — create, publish, markRead, unreadCount | — |
| 3 | Instructor API — create, draft, publish | — |
| 4 | Student API — feed with is_read, mark-read, unread_count | 15 ✅ |

### Phase 4 — Discussion Forums ✅

| Step | Feature | Tests |
|---|---|---|
| 1 | DiscussionThread + DiscussionPost + DiscussionPostVote models | — |
| 2 | DiscussionService — createThread, reply, togglePin/Lock, markAnswer, toggleVote | — |
| 3 | Forum API — list, show (paginated), create thread, reply, upvote | — |
| 4 | Instructor-gated: pin, lock, markAnswer | 16 ✅ |

---

## Database Tables (MySQL `manhaj`)

```
tenants → users → faculties → departments → programmes
→ academic_terms → courses → course_prerequisites → sections
→ section_teaching_assistants → enrolments
→ modules → lessons → lesson_progress
→ grade_items → student_grades
→ announcements → announcement_reads
→ discussion_threads → discussion_posts → discussion_post_votes
→ personal_access_tokens
(+ cache, jobs, sessions, password_reset_tokens)
```

## Demo Credentials (after `php artisan db:seed`)

| Role | Email | Password |
|---|---|---|
| Platform Admin | admin@manhaj.app | password |
| CUT Uni Admin | admin@cut.manhaj.app | password |
| CUT Instructor | instructor@cut.manhaj.app | password |
| CUT Student | student@cut.manhaj.app | password |
| AIS Uni Admin | admin@ais.manhaj.app | password |
| AIS Student | student@ais.manhaj.app | password |

---

## Tests Status

| Suite | Tests | Passing |
|---|---|---|
| Feature — Tenancy | 5 | 5 ✅ |
| Feature — Auth / Authorization | 19 | 19 ✅ |
| Feature — Content / Lesson Progress | 10 | 10 ✅ |
| Feature — API Auth (Sanctum) | 10 | 10 ✅ |
| Feature — Tenant Middleware | 5 | 5 ✅ |
| Feature — Student Dashboard | 8 | 8 ✅ |
| Feature — Instructor Dashboard | 6 | 6 ✅ |
| Feature — Grades API | 13 | 13 ✅ |
| Feature — Announcements | 15 | 15 ✅ |
| Feature — Discussion Forums | 16 | 16 ✅ |
| Feature — Example | 1 | 1 ✅ |
| **Total** | **122** | **122 ✅** |

Last run: `php artisan test` — **122 passed, 0 failed** ✅

---

## What Is Left (Remaining Phases)

### Phase 5 — Enrolment API 🔄 IN PROGRESS
- `POST /api/v1/student/sections/{section}/enrol` — self-enrol (prerequisite check, capacity check, waitlist)
- `POST /api/v1/student/enrolments/{id}/drop` — drop with waitlist auto-promotion
- `GET  /api/v1/student/sections/{section}/eligibility` — can I enrol? why not?

### Phase 6 — University Admin API
- Manage faculties, departments, programmes
- Manage academic terms (open/close)
- Manage courses and sections (CRUD)
- User management (invite, deactivate, role assignment)

### Phase 7 — Platform Admin API
- Tenant (university) CRUD
- Tenant suspension / reactivation
- Platform-wide stats

### Phase 8 — Search & Catalogue
- Course catalogue endpoint (browsable, filterable by dept / term)
- Section availability check (seats, prerequisites)

### Phase 9 — INTERN B Integration Layer
- `POST /api/v1/internal/ml/recommendations` — ingest ML recommendations
- `GET  /api/v1/student/recommendations` — surface to student
- Webhook endpoint for FastAPI to push events

### Phase 10 — Polish & Production Readiness
- Rate limiting on all API groups
- API versioning strategy
- `.env.example` audit
- OpenAPI / Swagger spec (L5-Swagger)
- `migrate:fresh --seed` smoke test in CI

---

## Important Decisions

| Decision | Rationale |
|---|---|
| Factory closure-based tenant_id removed | Causes "Factory cannot be converted to string" when chained; tests always supply tenant_id explicitly |
| LessonProgressService uses withoutGlobalScope | Progress records must be found regardless of current TenantContext |
| Progress never goes backwards | `max($old, $new)` prevents out-of-order video heartbeats corrupting data |
| DatabaseSeeder idempotent-friendly via fresh data | Run `migrate:fresh --seed` to reset cleanly |
| GradeService uses withoutGlobalScope | StudentGrade records don't carry tenant context in session during instructor entry |
| AnnouncementService uses withoutGlobalScope | Student feed query runs outside tenant scope (reads across enrolled sections) |
| DiscussionController uses single shared controller | Forum is symmetric (student + instructor both post); role gates happen inside methods |
| MySQL index names must be ≤ 64 chars | Long compound index names must use explicit short aliases |
| SQLite boolean casts need fresh() | After `Model::create()` booleans may be null until reloaded from DB |

---

## Git Log (recent)
- `acdc634` feat(discussion): DiscussionThread + DiscussionPost + Vote models, DiscussionService, forum API — 122 tests
- `4068c56` feat(announcements): Announcement + AnnouncementRead models, AnnouncementService — 106 tests
- `4ad2710` feat(grades): GradeItem + StudentGrade models, GradeService, instructor/student grade APIs — 91 tests
- `4781864` feat(api): ResolveTenant + RequireTenant middleware, student dashboard API, instructor dashboard API — 78 tests
- `08f1ef6` feat(api): Sanctum auth — login, me, logout endpoints + 10 API tests
- `6b75987` feat(content): Module, Lesson, LessonProgress + LessonProgressService + demo seeder
- `83798ac` feat(courses): Course, Section, Enrolment + EnrolmentService + tests
- `8717f5b` feat(academic): Faculty, Department, Programme, AcademicTerm + tests
- `5df6d65` feat(auth): Role enum, Gates, EnsureRole middleware, authorization tests
- `4ebc2e5` feat(tenancy): Tenant model, BelongsToTenant trait, TenantContext, isolation tests
