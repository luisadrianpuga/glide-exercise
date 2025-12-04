# Incident Report: PERF-405 – Missing Transactions in History

## Summary
- Reporter: Multiple Users  
- Priority: Critical  
- Description: After funding an account several times, only the first transaction appeared in the UI, making it look like deposits vanished.

## Impact
- Users could not reconcile balances because the transaction list omitted recent deposits.
- Support faced escalations alleging lost funds due to incomplete history.

## Detection
- Reproduced by funding an account multiple times without refreshing; subsequent deposits never showed up because the server returned the oldest transaction (limit 1 ascending) and the history endpoint didn’t order results.

## Root Cause
1. `fundAccount` retrieved `orderBy(transactions.createdAt).limit(1)` **without filtering by account and in ascending order**, so every mutation returned the first transaction ever created rather than the latest deposit.
2. The history query (`getTransactions`) performed no ordering, so depending on SQLite’s default ordering, new rows sometimes fell outside the range fetched by the client.

## Resolution
- Updated `fundAccount` to:
  - Filter by `accountId`.
  - Order by `createdAt` descending when fetching the transaction to return to the caller.
  - Throw an error if the insert cannot be read back, rather than returning stale data.
- Updated `getTransactions` to sort by `createdAt` descending so all transactions are returned in a deterministic order.

## Verification
- Manual reasoning/tests: funding an account multiple times now returns the newest transaction each time, and the history view lists all deposits in reverse chronological order. No transactions disappear after repeated funding.
- Recommended follow-up: add automated tests around the funding flow to ensure inserts and retrieval ordering stay consistent if pagination is added later.

## Lessons Learned
1. Always include explicit ordering and filters when fetching recently inserted rows.
2. Transaction histories must be deterministic; rely on timestamps/ids rather than SQLites default ordering.
3. Cover critical financial flows with integration tests to catch regressions early.
