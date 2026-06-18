# Test Search Quality

Run search quality tests against the current index.

Arguments: $ARGUMENTS

## Usage

```
/test-search                  # Run all search quality tests
/test-search <query>          # Test a specific query
/test-search --report         # Generate full quality report
```

## Execution

### Default (no arguments)

1. Run the search quality test suite:
   ```
   npm test
   ```
   Or if a dedicated search test exists:
   ```
   npm run test:search
   ```

2. Report pass/fail counts and any degraded queries.

### Single query mode

1. Execute a single search query against the index
2. Display top 5 results with scores
3. Show which chunks matched and why

### --report mode

1. Run the full test suite
2. Generate a quality report:
   - Total queries tested
   - Pass rate
   - Top degraded queries (expected result not in top 3)
   - Score distribution
