# MANHAJ — Project Status

## Current Phase
**PHASE 1 — ACADEMIC CORE**

## Current Feature
Content (Modules & Lessons) — next

---

## Completed

### Phase 0 — Foundation ✅
- Laravel 12.65.0, PHP 8.2.12, MySQL via XAMPP
- Git initialized, GitHub remote: https://github.com/Ahmed-Mahmoudd/Manhaj-e-learning-platform
- Initial test suite passing

### Phase 1 — Academic Core

#### Step 1 — Tenancy ✅
- `tenants` table + `Tenant` model
- `tenant_id` on users (nullable FK)
- `TenantContext` service + `BelongsToTenant` trait
- 5 isolation tests passing

#### Step 2 — Roles & Permissions ✅
- `Role` PHP 8.1 backed enum (7 roles)
- `role` column on users
- `AppServiceProvider` Gate definitions (12 gates, platform admin bypasses all)
- `EnsureRole` middleware registered as `role:` alias
- 19 authorization tests passing

#### Step 3 — Institutional Hierarchy ✅
- `Faculty` → `Department` → `Programme` models + migrations
- `AcademicTerm` model (semester/summer/year, add-drop deadline, active scope)
- Factories for all 4 models
- 7 hierarchy + isolation tests passing

#### Step 4 — Courses, Sections & Enrolment ✅
- `Course` model (code unique per tenant, prerequisites many-to-many)
- `Section` model (capacity, JSON schedule, TA pivot)
- `Enrolment` model (enrolled/waitlisted/dropped/completed/withdrawn)
- `EnrolmentService`: enrol, drop, prerequisite check, waitlist promotion
- 7 enrolment tests passing (including prerequisite enforcement + waitlist promotion)

---

## In Progress
*(nothing — courses checkpoint complete)*

---

## Blocked
*(none)*

---

## Next Task
**Phase 1 — Step 5: Content (Modules & Lessons)**

- `modules` table (course, title, order, release rules)
- `lessons` table (module, type: video/pdf/text/link/download, order, release_at)
- `lesson_progress` table (user, lesson, seconds_spent, completed_at, progress_pct)
- Models: Module, Lesson, LessonProgress
- Lesson completion service

---

## Important Decisions

| Decision | Rationale |
|---|---|
| Single MySQL DB + tenant_id | Simplest correct tenancy |
| TenantContext static class | Zero dependencies, easy to clear in tests |
| BelongsToTenant global scope | Auto-isolation on every query |
| Role enum (not spatie/permission) | Simple, type-safe, no extra package needed at this stage |
| Gate::before for platform admin | Clean bypass without polluting every gate definition |
| EnrolmentService (not controller logic) | Testable, reusable, follows spec rule |
| `getOriginal()` bug caught and fixed | Pre-update status must be captured before `update()` call |
| Migration timestamps manually managed | Artisan sometimes creates same-second timestamps; rename immediately |

---

## Known Issues
*(none)*

---

## Tests Status

| Suite | Tests | Passing | Failing |
|---|---|---|---|
| Unit | 1 | 1 | 0 |
| Feature — Example | 1 | 1 | 0 |
| Feature — Tenancy | 5 | 5 | 0 |
| Feature — Auth | 19 | 19 | 0 |
| Feature — Hierarchy | 7 | 7 | 0 |
| Feature — Enrolment | 7 | 7 | 0 |
| **Total** | **39** | **39** | **0** |

Last run: `php artisan test` — **39 passed** ✅

---

## Git Log (recent)
- `83798ac` feat(courses): Course, Section, Enrolment + EnrolmentService + tests
- `8717f5b` feat(academic): Faculty, Department, Programme, AcademicTerm + tests
- `5df6d65` feat(auth): Role enum, Gates, EnsureRole middleware, authorization tests
- `4ebc2e5` feat(tenancy): Tenant model, BelongsToTenant trait, TenantContext, isolation tests
- `14078ce` chore: initial commit - Laravel 12 MANHAJ foundation

## GitHub
https://github.com/Ahmed-Mahmoudd/Manhaj-e-learning-platform
