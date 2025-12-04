# Incident Report: PERF-404 – Transaction Sorting

## Summary
- Reporter: Jane Doe  
- Priority: Medium  
- Description: Users observed transactions appearing in random order when viewing history, even though deposits/withdrawals should be newest-first.

## Impact
- Confusion during balance reviews; users couldn’t find the latest transaction quickly.

## Detection
- Support ticket noted inconsistent ordering; after several deposits, entries appeared shuffled.

## Root Cause
1. The `getTransactions` query ordered by `createdAt` descending, but the inserted rows sometimes shared identical timestamps (SQLite second precision), leading to nondeterministic ordering.

## Resolution
- Updated the transactions query to order by `createdAt DESC, id DESC`, ensuring consistent newest-first ordering even if timestamps match.

## Verification
- Manual testing after multiple rapid transactions confirmed the history now shows strictly newest-to-oldest.

## Lessons Learned
1. Always include a deterministic tie breaker (e.g., primary key) when ordering by timestamps.
2. Consider higher resolution timestamps or audit columns if ordering precision matters.
