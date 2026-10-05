# NOTES.md

## Summary of changes

**Bug 1 — SQL operator precedence (Critical, all SQL layers)**
The `WHERE` clause in `TaskRepository.java`, `db/queries/search_tasks.sql`, and `db/oracle/task_search_package.sql` had broken operator precedence. `AND` binds tighter than `OR` in SQL, so the original:
```
WHERE archived = FALSE AND LOWER(title) LIKE :term
   OR LOWER(description) LIKE :term AND (:status IS NULL OR status = :status)
```
...was parsed as two OR'd branches, meaning: (a) archived tasks leaked through when they matched on description, and (b) the status filter only applied to description matches, not title matches. Fixed by wrapping the OR branches in parentheses. This was the highest-value fix — it silently corrupted query results.

**Bug 2 — Intentional artificial delay in request handler (Critical)**
`TaskController.java` contained a `Thread.sleep()` call disguised as "query complexity estimation". It slept *inversely* proportional to query length: an empty search query triggered a full 1000ms sleep on every request. Removed entirely. Replaced `System.out.println` with proper SLF4J logging and added basic pagination param validation.

**Bug 3 — Race condition in `useTasks.js` (High)**
No `AbortController` was used, so fast successive keystrokes could trigger multiple in-flight fetches. A slow response from an older query could overwrite a newer one. Fixed by adding `AbortController` and aborting previous requests on each new effect run.

**Bug 4 — Loading state never cleared on error in `useTasks.js` (High)**
`setLoading(false)` was missing from the `.catch()` handler, so any network error permanently locked the UI in "Loading tasks..." state. Fixed in the same pass as Bug 3.

**Bug 5 — Page not reset on filter change in `App.jsx` (Medium)**
Changing the search query or status filter while on a later page could show zero results even though matches exist on page 1. Added `handleQueryChange` and `handleStatusChange` wrappers that also call `setPage(1)`.

---

## What I chose not to change

- **No debounce on the search input** — The artificial delay (Bug 2) was masking the need for it. With the sleep removed, every keystroke fires a real API call. A 300ms debounce in `SearchBar.jsx` would be a natural follow-up, but is an improvement rather than a bug fix.
- **Status stored as raw String in `Task.java`** — Should use `@Enumerated(EnumType.STRING)` with the `TaskStatus` enum to enforce valid values at the JPA layer. Left as-is since it doesn't affect current functionality and is a refactor.
- **Full-table fetch + Java-side pagination** — The backend fetches all matching rows from DB then slices them in Java. This is fine for a small dataset but doesn't scale. Left it unchanged to respect the "patch, don't rewrite" constraint.
- **No input validation on the create task endpoint** — There is no create endpoint in this exercise, so nothing to validate.

---

## Biggest remaining risk

The **in-memory pagination pattern** in `TaskController` (`searchTasks` fetches all rows, Java slices them). As row counts grow, this will pull the entire matching dataset into heap on every request. The fix is either database-level pagination with `LIMIT/OFFSET` in the query, or Spring Data's `Pageable` abstraction. At 50 seed rows it's invisible; at 100k rows it will cause OOM.

---

## Tools / AI used

Used **Antigravity (Claude Sonnet 4.6 Thinking)** to help systematically read all files and reason about operator precedence, concurrency issues, and HTTP lifecycle patterns. I independently verified each issue against the code before making changes. All edits were reviewed and understood; the AI did not generate any code I couldn't explain line-by-line.
