-- H2-compatible task search query
-- Used by the Spring Data repository layer
--
-- Parameters:
--   :term   — search term wrapped in wildcards, e.g. '%api%'
--   :status — status filter or NULL for all statuses
--
-- BUG FIX: Original query had broken operator precedence.
-- AND binds tighter than OR in SQL, so the original:
--   WHERE archived = FALSE AND LOWER(title) LIKE :term
--      OR LOWER(description) LIKE :term AND (:status IS NULL OR status = :status)
-- was being parsed as:
--   (archived=FALSE AND title LIKE term) OR (description LIKE term AND status filter)
--
-- This caused two problems:
--   1. Archived tasks leaked through when they matched on description.
--   2. The status filter was NOT applied to title matches at all.
--
-- Fix: parenthesise the OR branches so filters apply to both.

SELECT *
FROM tasks
WHERE archived = FALSE
  AND (LOWER(title) LIKE :term OR LOWER(description) LIKE :term)
  AND (:status IS NULL OR status = :status)
ORDER BY created_at DESC;
