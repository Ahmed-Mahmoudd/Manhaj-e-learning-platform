# MANHAJ — Project Status

## Current Phase
**PHASE 1 — COMPLETE ✅ → Moving to PHASE 2**

## Current Feature
Phase 2 — Assessment & Grades (next)

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

**Phase 1 Exit Condition MET:**
- ✅ Admin can create term / course / section (data model + seeder proves it)
- ✅ Student can enrol and open a lesson (EnrolmentService + LessonProgressService proven in tests)

---

## Database Tables (MySQL `manhaj`)
`tenants` → `users` → `faculties` → `departments` → `programmes`
→ `academic_terms` → `courses` → `course_prerequisites` → `sections`
→ `section_teaching_assistants` → `enrolments`
→ `modules` → `lessons` → `lesson_progress`
(+ `cache`, `jobs`, `sessions`, `password_reset_tokens`)

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

## Next Task
**Phase 2 — Step 1: Authentication API**

Laravel Sanctum token auth:
- `POST /api/v1/auth/login` → returns token
- `POST /api/v1/auth/logout`
- `GET  /api/v1/auth/me`
- Login feature tests (valid, invalid, role assertion on me endpoint)

Then immediately: Student Dashboard API + Instructor Dashboard API

---

## Important Decisions

| Decision | Rationale |
|---|---|
| Factory closure-based tenant_id removed | Causes "Factory cannot be converted to string" when chained; tests always supply tenant_id explicitly |
| LessonProgressService uses withoutGlobalScope | Progress records must be found regardless of current TenantContext |
| Progress never goes backwards | `max($old, $new)` prevents out-of-order video heartbeats corrupting data |
| DatabaseSeeder idempotent-friendly via fresh data | Run `migrate:fresh --seed` to reset cleanly |

---

## Tests Status

| Suite | Tests | Passing |
|---|---|---|
| Unit | 1 | 1 ✅ |
| Feature — Tenancy | 5 | 5 ✅ |
| Feature — Auth | 19 | 19 ✅ |
| Feature — Hierarchy | 7 | 7 ✅ |
| Feature — Enrolment | 7 | 7 ✅ |
| Feature — Content | 10 | 10 ✅ |
| Feature — Example | 1 | 1 ✅ |
| **Total** | **49** | **49 ✅** |

Last run: `php artisan test` — **49 passed, 0 failed** ✅

---

## Git Log (recent)
- `6b75987` feat(content): Module, Lesson, LessonProgress + LessonProgressService + demo seeder
- `1ad046a` feat(content): [pre-rebase version]
- `fdd0960` [remote commit]
- `83798ac` feat(courses): Course, Section, Enrolment + EnrolmentService + tests
- `8717f5b` feat(academic): Faculty, Department, Programme, AcademicTerm + tests
- `5df6d65` feat(auth): Role enum, Gates, EnsureRole middleware, authorization tests
- `4ebc2e5` feat(tenancy): Tenant model, BelongsToTenant trait, TenantContext, isolation tests
