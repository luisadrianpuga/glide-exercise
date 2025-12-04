# Incident Report: PERF-401 – Account Creation Error

## Summary
- Reporter: Support Team  
- Priority: Critical  
- Description: When the insert/fetch logic in `accountRouter.createAccount` failed, the server returned a fabricated account object with a `$100` balance and `pending` status. The UI displayed this bogus data even though no row existed in the database.

## Impact
- Customers saw phantom accounts funded with $100 despite the creation having failed, causing confusion and inaccurate balances.
- Support could not easily reconcile which accounts existed because client and database states diverged.

## Detection
- Support ticket PERF-401 noted multiple “new” accounts appearing with $100 balances immediately after an error message surfaced. Investigation showed the fallback object was being sent back to clients.

## Root Cause
- After attempting to insert the account, the code fetched the row and, if not found, returned a hard-coded object (id 0, $100 balance) instead of surfacing the failure.

## Resolution
- Removed the fallback response in `support-engineer-interview-main/server/routers/account.ts` and replaced it with an `INTERNAL_SERVER_ERROR` if the post-insert fetch returns nothing. Successful creations now always return the real database row.

## Verification
- Manual reasoning/tests: forcing an insert failure (e.g., DB unavailable) now results in an error to the client rather than a fake account, preventing incorrect balances from appearing.
- Suggested follow-up: add integration tests for account creation and consider transactional handling/logging to detect partial failures.

## Lessons Learned
1. Never fabricate financial data to mask backend errors; propagate failures so clients can react appropriately.
2. After insert operations, treat missing rows as fatal conditions rather than returning placeholders.
3. Enhance monitoring/alerting for insert failures to catch issues before they reach customers.
