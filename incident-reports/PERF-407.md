# Incident Report: PERF-407 – Transaction Retrieval Slowdown

## Summary
- Reporter: DevOps  
- Priority: High  
- Description: The system slowed dramatically when loading transaction history during peak usage.

## Impact
- Users experienced long wait times when viewing recent transactions, especially accounts with dozens of entries.
- Increased CPU load on the API due to redundant database queries.

## Detection
- DevOps observed elevated query counts per request in monitoring. Profiling the `/transactions` view showed the backend issuing N+1 queries for every transaction row.

## Root Cause
1. `accountRouter.getTransactions` fetched all transactions, then looped over each row and executed a separate database query to retrieve the same account info (`accounts` table) repeatedly.
2. For accounts with many transactions, this resulted in dozens/hundreds of extra queries per request.

## Resolution
- Reused the already-fetched account record (retrieved before the loop) and removed the per-transaction `accounts` lookup. The resolver now maps each transaction to the known `account.accountType` without additional database calls.

## Verification
- Manual profiling shows the query count dropped from 1 + N to 1. Transaction pages load significantly faster, even for large histories.

## Lessons Learned
1. Watch for N+1 query patterns—especially when data ownership is already known.
2. Add instrumentation/tests to ensure expensive loops don’t regress in future changes.
3. Consider eager loading or joins when additional data is needed for each transaction.
