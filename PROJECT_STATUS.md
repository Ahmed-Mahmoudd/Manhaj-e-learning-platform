# MANHAJ — Project Status

## Current Phase
**PHASE 1 — ACADEMIC CORE**

## Current Feature
Roles / Permissions (next)

---

## Completed

### Phase 0 — Foundation
- [x] Laravel 12.65.0 verified
- [x] PHP 8.2.12 verified
- [x] Composer dependencies installed
- [x] MySQL via XAMPP connected (DB: manhaj)
- [x] `.env` configured correctly
- [x] Default migrations ran (users, cache, jobs/sessions)
- [x] Git initialized in project root
- [x] Initial test suite passing
- [x] APP_NAME = MANHAJ
- [x] PROJECT_STATUS.md created

### Phase 1 — Academic Core
- [x] **Tenancy** — `tenants` table + `Tenant` model
- [x] `tenant_id` added to `users` (nullable FK)
- [x] `TenantContext` service (current-tenant holder)
- [x] `BelongsToTenant` trait (global scope + auto-fill + forTenant())
- [x] `TenantFactory` + `UserFactory` updated with `forTenant()` state
- [x] 5 tenant isolation tests — all PASS

---

## In Progress
*(nothing — tenancy checkpoint complete)*

---

## Blocked
*(none)*

---

## Next Task
**Phase 1 — Step 2: Roles & Permissions**

- Add `role` column to `users` (enum: platform_admin, university_admin, faculty_admin, instructor, teaching_assistant, student, guest)
- Create Laravel Gates / Policies pattern
- Create `RoleMiddleware` for route-level protection
- Write authorization feature tests (e.g. student cannot access instructor routes)

---

## Important Decisions

| Decision | Rationale |
|---|---|
| Single MySQL database, shared tables + tenant_id | Simplest correct architecture per spec |
| phpunit.xml uses SQLite :memory: for tests | Fast, isolated — no touch to dev DB |
| TenantContext as static class | Simple, zero-dependency; no IoC binding needed for this stage |
| BelongsToTenant global scope only fires when TenantContext is set | Platform admins (null context) need unfiltered access |
| tenant_id on users is nullable | Platform Admin users have no tenant |
| No Redis yet | Core must be stable first |
| No Docker yet | XAMPP local dev first |
| Modular monolith | Per spec |
| PHPUnit #[Test] attributes | Deprecated @test doc-comments fixed — forward compatible with PHPUnit 12 |

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
| **Total** | **7** | **7** | **0** |

Last run: `php artisan test` — **7 passed** ✅

---

## Environment Summary

| Item | Value |
|---|---|
| Laravel | 12.65.0 |
| PHP | 8.2.12 |
| Database | MySQL 8 via XAMPP |
| DB Name | manhaj |
| Test DB | SQLite :memory: |
| Frontend | React + Vite + TypeScript + Tailwind |
| Test runner | PHPUnit 11.x |

---

## Git Log (recent)
- `4ebc2e5` feat(tenancy): Tenant model, BelongsToTenant trait, TenantContext, isolation tests
- `14078ce` chore: initial commit - Laravel 12 MANHAJ foundation
