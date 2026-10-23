# Benchmark Assignment — Postgres vs Redis

## Results

Run these commands locally after configuring `.env` and running `npm run seed`:

```bash
node bench-pg.js
node bench-redis.js
```

Record the actual values from your terminal here (do not use example values):

- Postgres p50: **[your measured value] ms**
- Postgres p95: **[your measured value] ms**
- Redis p50: **[your measured value] ms**
- Redis p95: **[your measured value] ms**

## Explanation

Postgres takes longer because each request runs a query pipeline: it parses and plans the SQL, joins posts with users and votes, groups and sorts rows, and accesses database pages. Redis returns a feed value that was already built and stored in memory, so the request is essentially a single key lookup rather than rebuilding the feed on every call. Postgres p95 is typically much higher than its p50 because occasional slow queries, scheduling, cache or I/O effects stretch the tail latency. Redis does much less work per request, so its p95 usually stays close to its p50 and the latency is more consistent.

## Evidence required for submission

Attach one terminal screenshot showing both benchmark outputs and all four measured percentiles, then combine that screenshot and the explanation above into a single PDF. The numbers must come from your own local run.
