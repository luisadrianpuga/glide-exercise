# Incident Report: PERF-402 – Logout Issues

## Summary
- Reporter: QA Team  
- Priority: Medium  
- Description: The logout endpoint always returned `{ success: true }` even when no active session was removed. Cookies stayed valid and users believed they logged out when they had not.

## Impact
- Users could continue making authenticated requests after “logging out,” creating a security risk if they walked away from shared devices.

## Detection
- QA noticed repeated logout calls reported success even with invalid/expired tokens. Database rows in `sessions` weren’t removed, confirming the API response was misleading.

## Root Cause
1. `logout` only attempted to delete the session if `ctx.user` was set, so unauthenticated requests never touched the DB.
2. The response always returned `success: true`, regardless of whether a session row was deleted.

## Resolution
- Added a helper to extract the `session` cookie from every logout request, regardless of `ctx.user`.
- Attempt deletion using `db.delete(...).returning()` and base the response on whether a session record was actually removed.
- Logout now returns `{ success: false, message: "No active session to log out" }` when nothing was deleted, and still clears the cookie in all cases.

## Verification
- QA confirmed that logging out without an active session now returns `success: false`, while valid sessions are removed and subsequent API calls fail as expected.

## Lessons Learned
1. Don’t rely solely on request context flags to determine session state—use the actual token.
2. Responses should reflect real outcomes so users know whether further action is needed.
3. Include automated tests for logout workflows to ensure session rows are removed.
