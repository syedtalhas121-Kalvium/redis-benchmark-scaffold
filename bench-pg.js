// bench-pg.js — time the Threadbase homepage feed query against Postgres.
// Warms up (untimed), then measures 100 runs and prints the percentiles.
//
//   node bench-pg.js

import pg from "pg";
import "dotenv/config";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const USER_ID = 42;

const FEED_SQL = `
  SELECT p.id, p.title, u.username, COUNT(v.id) AS votes
  FROM posts p
  JOIN users u ON u.id = p.author_id
  LEFT JOIN votes v ON v.post_id = p.id
  WHERE p.author_id = $1
  GROUP BY p.id, u.username
  ORDER BY votes DESC
  LIMIT 20;`;

function percentile(sorted, p) {
  return sorted[Math.ceil((p / 100) * sorted.length) - 1];
}

async function run() {
  // 1. WARM-UP — open the connection, let caches fill (not measured)
  for (let i = 0; i < 10; i++) await pool.query(FEED_SQL, [USER_ID]);

  // 2. MEASURE 100 times
  const samples = [];
  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    await pool.query(FEED_SQL, [USER_ID]);
    samples.push(performance.now() - start);
  }

  const sorted = samples.sort((a, b) => a - b);
  console.log("Postgres feed query (100 runs)");
  console.log("  p50:", percentile(sorted, 50).toFixed(2), "ms");
  console.log("  p95:", percentile(sorted, 95).toFixed(2), "ms");

  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
