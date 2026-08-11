# MANHAJ — Project Status

## Current Phase
**PHASE 7 — COMPLETE ✅ → Moving to PHASE 8**

## Current Feature
Phase 8 — Course Catalogue API (browsable, filterable, section availability)

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
| 1-4 | AnnouncementService, instructor create/draft/publish, student feed + mark-read | 15 ✅ |

### Phase 4 — Discussion Forums ✅

| Step | Feature | Tests |
|---|---|---|
| 1-4 | DiscussionService, forum API, pin/lock/markAnswer, upvote | 16 ✅ |

### Phase 5 — Enrolment API ✅

| Endpoint | Feature | Tests |
|---|---|---|
| POST enrol | Self-enrol with capacity + prerequisite check, auto-waitlist | — |
| POST drop | Drop with waitlist auto-promotion | — |
| GET eligibility | Can-I-enrol check with reason | 14 ✅ |

### Phase 6 — University Admin API ✅

| Resource | Endpoints | Tests |
|---|---|---|
| Faculties | CRUD, delete guard | — |
| Departments | CRUD, filter by faculty, delete guard | — |
| Terms | CRUD, activate (deactivates others), deactivate | — |
| Courses | CRUD, prerequisite sync, delete guard | — |
| Sections | CRUD, filter by course/term, delete guard | — |
| Users | List (paginated+filter), create, show, updateRole (platform_admin protected) | 22 ✅ |

### Phase 7 — Platform Admin API ✅

| Resource | Endpoints | Tests |
|---|---|---|
| Tenants | List (paginated, search, active filter), create, update, activate/deactivate, stats | — |
| Users | List (any tenant), create (any role), show, impersonate (short-lived token) | 12 ✅ |

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
| Feature — Enrolment API | 14 | 14 ✅ |
| Feature — University Admin API | 22 | 22 ✅ |
| Feature — Platform Admin API | 12 | 12 ✅ |
| Feature — Example | 1 | 1 ✅ |
| **Total** | **170** | **170 ✅** |

Last run: `php artisan test` — **170 passed, 0 failed** ✅

---

## What Is Left (Remaining Phases)

### Phase 8 — Course Catalogue API 🔄 NEXT
- `GET /api/v1/catalogue/courses` — browsable courses (filter: dept, term, credits, search)
- `GET /api/v1/catalogue/courses/{course}` — detail with sections, prerequisites
- `GET /api/v1/catalogue/sections/{section}/availability` — seats left, waitlist depth

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
| Admin controllers use TenantContext::require() | Not ::get(); must be called after RequireTenant middleware has run |
| Platform routes use separate prefix (v1/platform) | No X-Tenant-ID header required; platform_admin sees all tenants without scoping |

---

## Git Log (recent)
- feat(platform): Platform Admin API — tenant CRUD, activate/deactivate, stats, user create, impersonate — 170 tests
- feat(admin): University Admin API — Faculty/Dept/Term/Course/Section/User CRUD — 158 tests
- feat(enrolment): Enrolment API — self-enrol, drop, waitlist, eligibility — 136 tests
- `acdc634` feat(discussion): DiscussionThread + DiscussionPost + Vote models, DiscussionService, forum API — 122 tests
- `4068c56` feat(announcements): Announcement + AnnouncementRead models, AnnouncementService — 106 tests
- `4ad2710` feat(grades): GradeItem + StudentGrade models, GradeService, instructor/student grade APIs — 91 tests
- `4781864` feat(api): ResolveTenant + RequireTenant middleware, student dashboard API, instructor dashboard API — 78 tests
- `08f1ef6` feat(api): Sanctum auth — login, me, logout endpoints + 10 API tests
- `6b75987` feat(content): Module, Lesson, LessonProgress + LessonProgressService + demo seeder
- `83798ac` feat(courses): Course, Section, Enrolment + EnrolmentService + tests
