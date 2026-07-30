// bench-redis.js — time the SAME feed, served pre-encoded from Redis.
// The feed was stored once by seed.js under key feed:user:42.
// Warms up (untimed), then measures 100 runs and prints the percentiles.
//
//   node bench-redis.js

import Redis from "ioredis";
import "dotenv/config";

const redis = new Redis(process.env.REDIS_URL);
const KEY = "feed:user:42";

function percentile(sorted, p) {
  return sorted[Math.ceil((p / 100) * sorted.length) - 1];
}

async function run() {
  const exists = await redis.get(KEY);
  if (!exists) {
    console.error(`Key ${KEY} not found. Run 'node src/seed.js' first.`);
    redis.quit();
    process.exit(1);
  }

  // 1. WARM-UP (not measured)
  for (let i = 0; i < 10; i++) await redis.get(KEY);

  // 2. MEASURE 100 times — one GET, then parse the blob (as real code would)
  const samples = [];
  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    const json = await redis.get(KEY);
    JSON.parse(json);
    samples.push(performance.now() - start);
  }

  const sorted = samples.sort((a, b) => a - b);
  console.log("Redis GET feed:user:42 (100 runs)");
  console.log("  p50:", percentile(sorted, 50).toFixed(2), "ms");
  console.log("  p95:", percentile(sorted, 95).toFixed(2), "ms");

  redis.quit();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
