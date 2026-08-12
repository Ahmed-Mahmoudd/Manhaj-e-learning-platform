# MANHAJ Frontend Progress

> Cold-start file. Read this + `frontend/src/` before continuing any session.

---

## DONE

### Auth shell (item 1)
Login, token storage, `X-Tenant-ID`, role guards, AR/EN RTL, placeholder homes for non-student roles.

### Student — My courses + lesson viewer (item 2, part A)
- `/student`, `/student/sections/:id`, `/student/sections/:id/lessons/:id`

### Student — Catalogue + enrolment (item 2, part B)
- `/student/catalogue`, `/student/catalogue/:courseId`, enrol/drop/waitlist UI

### Bug fixes (2026-08-12)
**BUG 1 — empty My courses:** `StudentDashboardController::myCourses()` now uses `Enrolment::withoutGlobalScope('tenant')` + `student_id` filter (same pattern as `EnrolmentController::index`). Tenant global scope was excluding valid enrolment rows when `enrolments.tenant_id` did not match `TenantContext`. Regression tests added in `StudentDashboardApiTest`.

**BUG 2 — duplicate enrol 500:** `EnrolmentService::enrol()` re-checks inside a DB transaction with `lockForUpdate()`. Active enrolments → 422 `"You are already enrolled in this section."`; dropped rows are reactivated instead of re-inserted. Frontend: 422 shows API `message`; 500 shows generic `"Something went wrong. Try again."` (no SQL leaked).

### Student UX fixes (2026-08-12) — four commits

**FIX 1 — term ledger vs completion:** `TermLedger` is now a text-first calendar indicator (week X of Y, calendar icon, dashed border on section headers). Shared `ProgressBar` is the primary completion UI on course rows, section header, lesson list, and lesson viewer.

**FIX 2 — RTL progress bars:** `ProgressBar` uses flex inline-start alignment so fill direction mirrors with `dir="rtl"` (Arabic).

**FIX 3 — video progress stuck at ~8%:** Root cause was a fake +5s/5s interval sending a stale client `progress_pct` (YouTube iframe cannot expose `currentTime`). Backend now recomputes `progress_pct = min(100, seconds_spent / duration_seconds × 100)` when `duration_seconds > 0`; frontend video tracking sends only `seconds_spent` (1s wall-clock ticks while tab visible). Feature test: 25% / 50% / 100% at 400s duration.

**FIX 4 — course completion aggregation:** Confirmed `LessonProgressService::courseCompletionPct()` — equal weight per published lesson (`completed_at` set / total published lessons). Documented in service comment. Feature tests: 4 lessons, 2 complete → 50%; POST progress updates next GET `/student/courses`.

**Tests:** 198 passing (497 assertions). Frontend `npm run build` OK.

**Run:** `php artisan serve` + `cd frontend && npm run dev` → `student@cut.manhaj.app` / `password`

---

## IN PROGRESS

- (none)

---

## NOT STARTED (Student item 2 remainder)

- Grades view (`GET /student/grades`)
- Announcements feed + mark read
- Discussion threads

## NOT STARTED (later items)

3. **Instructor:** sections, roster, grades, announcements, discussion moderation
4. **University Admin:** CRUD data tables
5. **Platform Admin:** tenant CRUD, stats

**Next session:** Layout plan for **Grades view** in this file; read `StudentGradeController`; build `/student/grades`.
