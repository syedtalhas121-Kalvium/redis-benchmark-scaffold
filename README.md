# Threadbase Benchmark Scaffold — Postgres vs Redis

The same homepage feed for one user, measured against **Postgres** and **Redis** on your own machine. Part of Module 4, LU 4.2 — *The Benchmark: Pair Up and Make the Numbers Real*.

You **read and run** these scripts — you don't write them.

## What's here

| File | What it does |
|---|---|
| `src/seed.js` | Creates a small Threadbase dataset in Postgres, then pre-encodes the feed for user 42 into Redis under `feed:user:42`. Run once. |
| `bench-pg.js` | Warms up, then times the feed query (posts ⋈ users ⋈ votes) **100×** and prints p50 / p95. |
| `bench-redis.js` | Warms up, then times a single `GET feed:user:42` **100×** and prints p50 / p95. |

## Prerequisites

- **Node.js 18+** (uses `performance.now()` and ES modules)
- **Postgres** running (from Modules 1–2)
- **Local Redis** running (from the M4 setup lesson): `docker start redis-m4`

## Setup

```bash
npm install
cp .env.example .env      # then edit .env with your DATABASE_URL and REDIS_URL
npm run seed              # one-time: load Postgres + encode the feed into Redis
```

## Run the benchmark

```bash
node bench-pg.js
node bench-redis.js
```

Expected **shape** (your exact numbers will differ by machine):

```
Postgres feed query (100 runs)
  p50: ~2-3 ms
  p95: ~10-12 ms      <- long tail, several times its own p50

Redis GET feed:user:42 (100 runs)
  p50: ~0.1-0.2 ms
  p95: ~0.2 ms        <- barely above its p50
```

If your numbers are **10× off** this shape, check that Redis is local, Postgres is seeded, and you ran `npm run seed` first — then talk to your mentor.

## Why the gap?

Postgres parses, plans, joins three tables, and reads pages before returning rows. Redis does a hash lookup and copies an already-built value out of RAM. Redis is fast *because it does less* — which is also why it can't replace Postgres. That gap is the whole point of Module 4.
