# glide-exercise
# Luis Puga

## Incident Reports & Fixes

- Every customer ticket I investigated now has a written summary under `incident-reports/`. Each file is named after the ticket ID (`VAL-2xx`, `SEC-30x`, `PERF-40x`, `UI-101`, etc.) and documents the impact, root cause, remediation, verification, and lessons learned.
- Code changes live inside `support-engineer-interview-main/`, primarily within `app/signup/page.tsx`, `server/routers/auth.ts`, `server/routers/account.ts`, shared validators under `lib/validation/`, and global styles for UI fixes.

## Issue Prioritization (main.py)

- `main.py` parses `reported_issues.txt`, normalizes the tickets into Python objects, and sorts them by priority (Critical → Medium → Low).
- Running it helped us stay focused: I loaded all tickets, saw the prioritized summary grouped by category (UI, Validation, Security, Performance), and then worked down the list in that order.
- The script also supports an interactive “next issue” loop so we could review one ticket at a time, document the fix, and immediately move on to the next highest priority item without getting lost in the backlog.

## Testing

- Run `python3 test.py` from the repo root to bundle and execute `support-engineer-interview-main/tests/critical_validation.test.ts`. The script uses `esbuild` to transpile the TypeScript test (covering VAL-204 phone validation) and prints the outcome. All results are logged in `tests_documentation.md`.

## Lessons Learned & Future Contributions

- Keep validation logic centralized so the frontend and backend never drift.
- Never rely on `Math.random()` or similar weak primitives for security-sensitive data; the crypto module is available everywhere.
- Order queries deterministically and avoid N+1 loops for performance.
- Next up I would suggest to:
  - Finish the automated test suite outlined above to cement extra credit.
  - Add tooling (lint rules/tests) that catch insecure randomness or missing validation.
  - Explore UI regression tests (Playwright) to cover dark-mode fixes and future theming work.
