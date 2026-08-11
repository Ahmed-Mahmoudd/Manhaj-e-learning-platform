# MANHAJ — Project Status

## Current Phase
**PHASE 0 — FOUNDATION**

## Current Feature
Foundation verification and project initialization

---

## Completed

### Phase 0 — Foundation
- [x] Laravel 12.65.0 verified
- [x] PHP 8.2.12 verified
- [x] Composer dependencies installed (vendor/ present)
- [x] MySQL via XAMPP — DB `manhaj` connected and responding
- [x] `.env` configured for MySQL (DB_CONNECTION=mysql, DB_DATABASE=manhaj)
- [x] Three default migrations ran successfully (users, cache, jobs/sessions)
- [x] Git repository initialized in project root (Manhaj/)
- [x] Initial test suite passing (2/2 tests, PHPUnit 11.x)
- [x] APP_NAME set to `MANHAJ`
- [x] PROJECT_STATUS.md created

---

## In Progress
*(nothing — foundation checkpoint complete)*

---

## Blocked
*(none)*

---

## Next Task
**Phase 1 — Step 1: Tenancy**

Create `tenants` table migration + `Tenant` model with all required fields:
- name, subdomain (unique), logo, locale, timezone, grading_system, settings (JSON)

Then add `tenant_id` to the `users` table and implement a `BelongsToTenant` scope/trait.

Write a tenant isolation feature test (Tenant A cannot access Tenant B data).

---

## Important Decisions

| Decision | Rationale |
|---|---|
| Single MySQL database, shared tables + tenant_id | Simplest correct architecture; no over-engineering |
| phpunit.xml uses SQLite :memory: for tests | Fast test execution; tests are isolated from dev DB |
| No Redis yet | Core must be stable before introducing queues/cache |
| No Docker yet | XAMPP local development first |
| Modular monolith (single Laravel app) | Per spec; no microservices |
| React + Vite + TypeScript for frontend | Already scaffolded in the project |

---

## Known Issues
- Git was previously initialized at the Desktop parent level; re-initialized at Manhaj/ project root (fixed)
- No other issues found

---

## Tests Status

| Suite | Tests | Passing | Failing |
|---|---|---|---|
| Unit | 1 | 1 | 0 |
| Feature | 1 | 1 | 0 |
| **Total** | **2** | **2** | **0** |

Last run: `php artisan test` — 2 passed

---

## Environment Summary

| Item | Value |
|---|---|
| Laravel | 12.65.0 |
| PHP | 8.2.12 |
| Database | MySQL 8 via XAMPP |
| DB Host | 127.0.0.1:3306 |
| DB Name | manhaj |
| Queue | database (sync in tests) |
| Cache | database (array in tests) |
| Session | database (array in tests) |
| Frontend | React + Vite + TypeScript + Tailwind |
| Test runner | PHPUnit 11.x (SQLite :memory: for tests) |
