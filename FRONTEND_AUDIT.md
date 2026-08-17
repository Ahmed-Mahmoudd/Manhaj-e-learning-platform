# MANHAJ Frontend Audit

> **Date:** 2026-08-13  
> **Scope:** All built frontend surfaces — student, instructor, university admin, platform admin, auth shell.  
> **Method:** Read-only code inspection + data-flow tracing. Reference behaviour: Canvas / Moodle / Coursera (gated content, enrolment truth, clean errors, RTL parity).  
> **No fixes applied in this session.**

---

## Executive summary

| Severity | Count | Themes |
|----------|------:|--------|
| **Critical** | 8 | Locked-lesson bypass, enrolment UI lies, 500 error leakage, invalid URLs → false empty states, shared-browser cache after logout, faculty_admin broken shell |
| **Moderate** | 32 | Stale cache after mutations, RTL arrows, i18n gaps, silent mutation failures, form validation holes, loading/refetch gaps |
| **Minor** | 14 | Badge timing, pluralization, redundant empty copy, polish |

**Already fixed in prior sessions (not re-opened):** video progress API, course `completion_pct` aggregation, RTL progress bar fill, PDF origin via `storageFileUrl()`, infinite re-render in lesson viewer, login tenant-scope bug.

---

## Critical

### C1 — Locked-module lessons viewable via direct URL

| | |
|---|---|
| **Page / component** | `LessonViewerPage.tsx`, `LessonSidebar` (same file) |
| **What's wrong** | `SectionLessonsPage` disables links when `!mod.is_available`, but `LessonViewerPage` loads any lesson ID from the same `sectionLessons` payload with **no module-lock check**. Sidebar links to all lessons regardless of lock. API returns full `body`, `url`, and `file_path` for locked modules too. |
| **Repro** | Enrol in a course where Module 2 is locked. Copy `/student/sections/{id}/lessons/{lockedLessonId}` from network tab or guess ID → full text/video/PDF content renders. Progress can be saved (see C2). |
| **Why it matters** | Canvas/Moodle gate content until prerequisites/dates are met. Students can skip the intended learning path entirely. |
| **Note** | Backend `updateProgress` also lacks lock/enrolment checks — frontend-only fix is insufficient. |

---

### C2 — Progress can be recorded on any lesson (including locked / wrong section)

| | |
|---|---|
| **Page / component** | `LessonViewerPage.tsx` → `POST /student/lessons/{id}/progress` |
| **What's wrong** | Frontend sends progress for whatever `lessonId` is in the URL. Backend `StudentDashboardController::updateProgress` does not verify enrolment or module availability. |
| **Repro** | Deep-link to locked lesson → watch/mark complete → course completion % increases. |
| **Why it matters** | Completion badges and course progress become meaningless; undermines the fixed aggregation logic. |

---

### C3 — Catalogue course detail flashes “Enrol now” for already-enrolled students

| | |
|---|---|
| **Page / component** | `CourseDetailPage.tsx` → `SectionEnrolRow` |
| **What's wrong** | `enrolmentsQuery` is **not** included in loading gates. While `/student/enrolments` is in flight, `activeEnrolments` defaults to `[]`, so `existingEnrolment` is undefined. `SectionEnrolRow` only waits on availability/eligibility queries, then shows **Enrol now** / **Join waitlist**. |
| **Repro** | Already enrolled in CS101 → open `/student/catalogue/{courseId}` on slow network → brief (or sustained if enrolments fails) **Enrol now** button next to a section you're in. |
| **Why it matters** | Same class as the original “empty My courses” bug — UI contradicts server state; can cause double-enrol attempts or user panic. |

---

### C4 — Enrolments fetch failure silently shows enrol actions

| | |
|---|---|
| **Page / component** | `CourseDetailPage.tsx` |
| **What's wrong** | `enrolmentsQuery.error` is never read. On failure, `activeEnrolments = []` → enrolled students see enrol buttons with no error banner. |
| **Repro** | Block or 500 `/student/enrolments` while course detail loads → **Enrol now** for enrolled sections, no error. |
| **Why it matters** | User may attempt duplicate enrolment; trust in enrolment status is broken. |

---

### C5 — `AsyncPanel` can surface raw 500 messages (regression class)

| | |
|---|---|
| **Page / component** | `AsyncPanel.tsx` (used on ~20 pages) |
| **What's wrong** | Uses `error.serverMessage ?? error.message` instead of `ApiError.userMessage(fallback, serverErrorFallback)`. For status ≥ 500, `serverMessage` still returns backend `message` (SQL, stack fragments). `userMessage()` exists in `api/client.ts` but is **only used in `CourseDetailPage` mutations**. |
| **Repro** | Trigger 500 on any list endpoint (e.g. misconfigured DB) → student sees server text in the red alert panel. |
| **Why it matters** | Same failure class as the SQL leak already fixed elsewhere; central component re-introduces it on every page. |

---

### C6 — Invalid section IDs show “empty” instead of “invalid”

| | |
|---|---|
| **Page / component** | All `sections/:sectionId/*` pages (student + instructor) |
| **What's wrong** | Queries use `enabled: Number.isFinite(id) && id > 0`. Invalid IDs (`abc`, `0`) disable the query → `isLoading === false`, `error === null`, `data === undefined` → **empty state** (“no lessons”, “no students”, “no threads”). |
| **Repro** | `/student/sections/abc`, `/instructor/sections/99999/grades` → designed empty copy, not 404/invalid URL. |
| **Why it matters** | Masks typos and unauthorized access; support/debugging harder; differs from LMS 404 behaviour. |

---

### C7 — Logout leaves role-scoped data in TanStack Query cache

| | |
|---|---|
| **Page / component** | `AuthContext.tsx` |
| **What's wrong** | Logout calls `queryClient.removeQueries({ queryKey: ['auth'] })` only. Student/instructor/admin query caches (`studentKeys.*`, `instructorKeys.*`, etc.) remain until `staleTime` expires. |
| **Repro** | Log in as instructor → view roster → logout → log in as student on same browser (without hard refresh) → stale instructor data can flash if keys collide or devtools inspect cache. Worse on shared machines. |
| **Why it matters** | Privacy / FERPA-style concern; not equivalent to ending a session cleanly. |

---

### C8 — `faculty_admin` sees admin UI but API rejects all actions

| | |
|---|---|
| **Page / component** | `AppRoutes.tsx` + all `/admin/*` pages |
| **What's wrong** | Frontend `ProtectedRoute` allows `faculty_admin`. Backend `/api/v1/admin/*` routes use `role:university_admin` **only**. Faculty admin gets full nav and forms; every mutation returns 403. |
| **Repro** | Log in as `faculty_admin` (if seeded) → `/admin/faculties` loads → create/edit/delete all fail. |
| **Why it matters** | Broken role entirely — either shouldn't reach shell or API should allow scoped admin. |

---

## Moderate

### Data correctness & cache invalidation

| ID | Page / component | Issue | User impact |
|----|------------------|-------|-------------|
| M1 | `MyCoursesPage.tsx` | Drop invalidates `studentKeys.courses()` + `enrolmentKeys.all` but **not** `catalogueKeys.all` | Catalogue seat counts stale after drop from My Courses |
| M2 | `MySectionsPage.tsx`, `MyCoursesPage.tsx` | `TermLedger` uses first section/course's term only | Wrong term header when teaching/enrolled across multiple terms |
| M3 | `MySectionsPage.tsx` (`SectionRow`) | Stat chips default to `0` while child queries load | Flash “0 grade items / 0 threads / 0 drafts” before real counts |
| M4 | `GradeItemGradesPage.tsx` | `rows` state not cleared when navigating between grade items | Previous item's student scores visible briefly |
| M5 | `DiscussThreadsPage.tsx`, `InstructorDiscussThreadsPage.tsx` | Creating thread invalidates cache but **does not reset `page` to 1** | New thread hidden when user is on page 2+ |
| M6 | `InstructorDiscussThreadsPage.tsx` | `page` state not reset when `sectionId` param changes | Wrong page → false empty thread list after switching sections |
| M7 | `SectionLessonsPage.tsx` | Header `completion_pct` from `courses()` query; lesson list from `sectionLessons()` | Course bar can lag behind lesson progress until courses refetch |
| M8 | `GradesPage.tsx` | `setGradesLastSeenAt` in `useEffect` without re-render; `GradeRow` reads `lastSeen` at render | “NEW” chips stay visible entire first visit; nav badge clears late |
| M9 | `StudentShell.tsx` | Badge queries `staleTime: 30_000`, no invalidation from child pages except on navigation | Announcement/grade badges up to 30s stale |
| M10 | `AnnouncementsPage.tsx` | `readMutation` has no `onError` | Expand unread item → silent fail, stays unread |
| M11 | `DiscussThreadPage.tsx` | `voteMutation` has no error UI | Upvote appears broken with no feedback |
| M12 | `InstructorDiscussThreadPage.tsx` | Pin/lock/mark-answer mutations lack error UI | Moderation actions fail silently |
| M13 | `FacultiesPage.tsx` | Delete invalidates `faculties()` only, not `departments()` | Deleted faculty's departments still listed until stale |
| M14 | `SectionsPage.tsx` | Create/delete invalidates `sections()` only, not `courses()` | `sections_count` on courses page stale |
| M15 | `TenantsPage.tsx` | Expanded stats: no loading/error UI | “View stats” → blank row on failure |
| M16 | `CourseDetailPage.tsx` | `availabilityQuery` / `eligibilityQuery` errors not shown; if both fail, section shows metadata with no action and no error | Confusing dead-end row |
| M17 | `SectionEnrolRow` | `eligibility.reason` rendered raw from API | English server string in Arabic UI |
| M18 | `CataloguePage.tsx`, `GradesPage.tsx`, `CourseDetailPage.tsx` | Department/prerequisite/course titles use `name_en` / `title_en` only in places | Arabic locale shows English labels |
| M19 | `SectionLessonsPage.tsx` | `formatDuration()` hardcodes `"min"` | Untranslated duration in Arabic |
| M20 | `AnnouncementsPage.tsx`, instructor announcements | `toLocaleDateString(undefined, …)` uses browser locale, not app `locale` | Dates wrong language when app is AR but browser EN |

---

### RTL / localization

| ID | Page / component | Issue |
|----|------------------|-------|
| M21 | 12+ back/action links | Hardcoded `←` / `→` in student, instructor pages (e.g. `SectionLessonsPage`, `CourseDetailPage`, `SectionActionLinks`) — do not flip in RTL |
| M22 | `GradesPage.tsx` | Table uses `text-left` instead of logical `text-start` |
| M23 | `DiscussSectionsPage.tsx` | Uses `mx-2` for section number spacing instead of `ms-2` |
| M24 | `admin/TermsPage.tsx` | Term type `<option>` labels hardcoded English; row shows raw API `term.type` with CSS capitalize |
| M25 | `AppRoutes.tsx` (`RootRedirect`) | Loading text `…` not translated (other spinners use `t('loading')`) |
| M26 | `AsyncPanel` / API errors | 403 messages like `"Not enrolled in this section."` shown verbatim from API — not i18n |
| M27 | `ErrorBoundary.tsx` | Default title/message/retry in English if used outside `RouteErrorBoundary` |
| M28 | `PaginationBar.tsx` | Prev/next order correct logically, but no chevron icons to mirror — acceptable; page numbers use Western digits only |

---

### Authorization / role boundaries (frontend)

| ID | Issue | Notes |
|----|-------|-------|
| M29 | **Student → `/instructor/*` or `/admin/*`:** Blocked by `guards.tsx` — ✅ | Redirect to role home |
| M30 | **`platform_admin` → any prefix:** Allowed by `roleCanAccess` bypass | Can render student/instructor/admin shells via URL; **API must enforce** |
| M31 | Frontend guards are **not security** | Direct API calls with stolen token bypass UI; audit assumes backend is source of truth |
| M32 | `DiscussThreadPage.tsx` | `sectionId` in URL not validated against thread's section | Wrong back-link context if URL manipulated (thread still loads by id) |

---

### Error message quality

| ID | Location | Issue |
|----|----------|-------|
| M33 | `LoginPage.tsx` | Uses `serverMessage` without 500 guard (unlike recommended `userMessage`) |
| M34 | `AdminUi.tsx` (`FormError`) | Same pattern; non-ApiError shows raw `error.message` |
| M35 | ~10 mutation handlers | `LessonViewerPage`, `MyCoursesPage`, `DiscussThreadsPage`, instructor grade/announcement pages use `serverMessage ?? message` |
| M36 | Admin CRUD forms | 422 field errors not mapped to inputs (only `LoginPage` does this) |
| M37 | `ErrorBoundary.tsx` | Renders `error.message` in `<pre>` for developers — OK for dev; visible to users on crash |

---

### Form validation

| ID | Page | Issue |
|----|------|-------|
| M38 | `DiscussThreadsPage`, `DiscussThreadPage`, instructor reply forms | HTML `required` only — whitespace-only `"   "` submits |
| M39 | `admin/SectionsPage.tsx` (CreateForm) | No guard if courses/terms/instructors arrays empty; falls back to `undefined` IDs |
| M40 | `admin/SectionsPage.tsx` | Instructor dropdown: page 1 only (`fetchAdminUsers('instructor', 1)`) — instructors on page 2+ missing |
| M41 | `admin/UsersPage.tsx` (CreateForm) | Default password `'password'`; empty name/email not blocked client-side |
| M42 | `admin/DepartmentsPage`, `CoursesPage`, `TermsPage`, `TenantsPage` | Submit enabled with empty required fields — server 422 only |
| M43 | `admin/TermsPage` | No client check that `starts_at < ends_at` |
| M44 | `GradeItemGradesPage.tsx` | Score max enforced by HTML only — can bypass via devtools |
| M45 | `admin/UsersPage.tsx` | `faculty_admin` absent from role filter/assign list; `university_admin` assignable by any admin UI user |

---

### Loading states

| ID | Issue |
|----|-------|
| M46 | **No page uses `isFetching` / `isRefetching`** — background refetch shows stale data with no indicator |
| M47 | `AsyncPanel` only checks `isLoading` (first load), not refetch-in-progress |
| M48 | `StudentShell` badge queries: failures silent → badge shows 0 |
| M49 | `CourseDetailPage`: course `AsyncPanel` can show content while enrolments still loading (see C3) |

---

### Content / LMS behaviour gaps

| ID | Page | Issue |
|----|------|-------|
| M50 | `LessonViewerPage.tsx` | Text lessons: `dangerouslySetInnerHTML` without client sanitization — XSS if CMS compromised |
| M51 | PDF/link lessons | No auto progress on open; user must click Mark complete (Moodle auto-tracks SCORM; acceptable if documented) |
| M52 | `LessonViewerPage` sidebar | No lock indicator on sidebar links; locked and unlocked look the same |

---

## Minor

| ID | Page / component | Issue |
|----|------------------|-------|
| N1 | `messages.ts` | `replyCount` no plural form (“1 replies”) |
| N2 | `GradesPage.tsx` | Enrolled with unpublished grades: global hint + per-section empty — redundant |
| N3 | `gradesSeen.ts` | First visit: all graded items count as “unseen” for nav badge — may be intentional |
| N4 | `DiscussThreadPage.tsx` | Zero replies: heading with no empty-state sentence |
| N5 | `DiscussThreadsPage.tsx` | Invalid `sectionId` → empty threads, not invalid-param message |
| N6 | `SectionRosterPage.tsx` | Subtitle hidden until data loads |
| N7 | `gradeLetterStyle.ts` | Unknown letter grades styled as “poor” tier |
| N8 | `MySectionsPage.tsx` | Schedule joined with ` · ` and English day names from API |
| N9 | Shell headers | `MANHAJ` brand not localized — acceptable |
| N10 | `RoleHomePage.tsx` | Orphan file (routes no longer use it) — dead code |
| N11 | `api/discussion.ts` | `addThreadPost` response typed `unknown` |
| N12 | `CourseDetailPage` | `score_pct` from API unused in grades display (shows fraction only) |
| N13 | `AnnouncementsPage` | Unread header count briefly stale after expand until refetch |
| N14 | Production deploy | `getApiOrigin()` falls back to `window.location.origin` when `VITE_API_URL` unset — production build served separately from Laravel needs env docs |

---

## Page-by-page checklist (quick reference)

| Page | Empty state | Error state | Loading | Mutations invalidate | RTL | Critical issues |
|------|-------------|-------------|---------|---------------------|-----|-----------------|
| Login | — | ⚠️ 500 leak | ✅ | — | ✅ | — |
| My Courses | ✅ | ⚠️ AsyncPanel | ✅ | ⚠️ catalogue | ✅ | — |
| Section lessons | ✅ | ⚠️ | ✅ | — | ⚠️ arrow | — |
| Lesson viewer | ✅ | ⚠️ | ✅ | ✅ | ⚠️ arrow | **C1, C2** |
| Catalogue | ✅ | ⚠️ | ✅ | — | ✅ | — |
| Course detail | ✅ | ⚠️ partial | ⚠️ flash | ✅ | ⚠️ arrow | **C3, C4** |
| Grades | ✅ | ⚠️ | ✅ | — | ⚠️ table | — |
| Announcements | ✅ | ⚠️ | ✅ | ✅ | ✅ | — |
| Discuss (all) | ✅ | ⚠️ | ✅ | ⚠️ page | ⚠️ arrows | — |
| Instructor sections | ✅ | ⚠️ | ⚠️ stat flash | — | ✅ | — |
| Instructor section/* | ⚠️ false empty | ⚠️ | ✅ | mostly ✅ | ⚠️ arrows | **C6** |
| Admin CRUD | ✅ | ⚠️ FormError | ✅ | ⚠️ partial | ✅ | **C8** |
| Platform tenants | ✅ | ⚠️ stats | ✅ | ✅ | ✅ | — |

Legend: ✅ OK · ⚠️ gaps noted above

---

## TanStack Query invalidation matrix

| Mutation | Invalidates | Missing / risky |
|----------|-------------|-----------------|
| Drop (My Courses) | `studentKeys.courses()`, `enrolmentKeys.all` | `catalogueKeys.all` |
| Enrol / drop (Course detail) | `catalogueKeys.all`, `enrolmentKeys.all`, `studentKeys.courses()` | — |
| Lesson progress / reset | `setQueryData(sectionLessons)`, `studentKeys.courses()` | — |
| Mark announcement read | `announcementKeys.list()` | optimistic update |
| Create thread | `discussionKeys.all` | reset `page` |
| Reply / vote | `thread(id)`, `discussionKeys.all` | — |
| Instructor grades/announcements | scoped `instructorKeys.*` | — |
| Admin faculty delete | `faculties()` | `departments()` |
| Admin section create/delete | `sections()` | `courses()` |
| Logout | `['auth']` only | **all tenant-scoped keys** |

---

## Recommended fix priority (for next session — not executed here)

1. **C1 + C2** — Gate locked lessons in viewer + backend progress authorization (Canvas-style module prerequisites).
2. **C3 + C4** — Gate course detail enrol UI on enrolments query (`isLoading \|\| error`).
3. **C5** — Switch `AsyncPanel` / `FormError` / mutations to `userMessage()` everywhere.
4. **C6** — Invalid URL param component shared across section-scoped pages.
5. **C7** — `queryClient.clear()` or prefix-based remove on logout/login.
6. **C8** — Align `faculty_admin` frontend access with backend (remove from route or add API support).
7. **M1, M4–M6, M10–M12** — Cache, pagination, and silent mutation errors batch.

---

*End of audit. No code was modified. Awaiting direction on which items to fix first.*
