# Incident Report: PERF-406 – Balance Calculation Drift

## Summary
- Reporter: Finance Team  
- Priority: Critical  
- Description: After many funding events, account balances diverged from the actual sum of transactions. The API response showed values that didn’t match the database.

## Impact
- Users and internal teams could not rely on displayed balances, creating critical financial discrepancies.
- Reconciliation required manual review, delaying payouts and eroding trust.

## Detection
- Finance noticed discrepancies between transaction totals and the reported balance field after repeated deposits. Investigating the `fundAccount` mutation exposed a loop that approximated the balance client-side.

## Root Cause
- After updating the balance in the database, the code attempted to compute `newBalance` locally by incrementally adding `amount / 100` one hundred times. This floating-point loop introduced rounding errors and didn’t reflect the DB’s true value.

## Resolution
- Removed the manual loop and now rely on the updated row returned from the database update. `fundAccount` calls `.returning()` to fetch the authoritative balance and returns that directly.

## Verification
- Manual reasoning/tests: multiple deposits now yield consistent balances because the API returns the exact value persisted in the database, eliminating the drift from floating-point math.
- Recommended follow-up: add automated integration tests verifying that balances equal the sum of transactions over many updates.

## Lessons Learned
1. Always source financial totals from the database rather than recomputing with ad-hoc loops.
2. Avoid floating-point accumulation for currency—prefer integer (cents) arithmetic or authoritative persisted values.
3. Add guardrails/tests around critical financial endpoints to catch precision issues early.
