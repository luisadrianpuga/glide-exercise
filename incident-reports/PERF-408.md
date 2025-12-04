# Incident Report: PERF-408 – Database Connection Leak

## Summary
- Reporter: System Monitoring  
- Priority: Critical  
- Description: Each request to `initDb` opened a new SQLite connection (pushed into `connections`) that was never closed, leading to file locks and resource exhaustion.

## Impact
- Long-running processes eventually hit OS file descriptor limits, causing API downtime.
- Locked database files prevented new instances from starting cleanly.

## Detection
- Monitoring alerted on steadily increasing open file handles. Investigations showed multiple active SQLite connections per process with no lifecycle management.

## Root Cause
1. `initDb` instantiated a new `Database` instance and stored it in an array, but the code never used or closed these handles.
2. No shutdown hook existed to release the primary `sqlite` connection when the Node process exited, so hot reloads and tests leaked descriptors.

## Resolution
- Simplified `lib/db/index.ts` to create a single `better-sqlite3` connection on startup, run migrations once, and register a `beforeExit` handler to close the handle.
- Removed the unused `connections` array and helper functions that re-instantiated the DB.

## Verification
- Manual reasoning/tests: reloading the server no longer increases open connection count; inspecting the process confirms only one SQLite handle exists. When the process exits, the hook closes the file cleanly.
- Recommended follow-up: add health checks or integration tests to ensure the DB connection is properly closed during test teardown.

## Lessons Learned
1. Manage database connections explicitly—avoid creating new handles without lifecycle controls.
2. Register shutdown hooks (`beforeExit`, `SIGTERM`) to release resources in Node services.
3. Include resource-leak monitoring in CI or local development to catch regressions early.
