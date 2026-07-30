// seed.js — one-time setup for the benchmark.
// Creates a small Threadbase dataset in Postgres, then pre-encodes the
// homepage feed for user 42 into Redis under the key feed:user:42.
//
//   node src/seed.js
//
// Run this ONCE before benchmarking. Re-running is safe (it resets the data).

import pg from "pg";
import Redis from "ioredis";
import "dotenv/config";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const redis = new Redis(process.env.REDIS_URL);

const USER_ID = 42;
const NUM_POSTS = 200;      // enough rows that the join does real work
const MAX_VOTES = 300;

async function seed() {
  console.log("Seeding Postgres…");

  await pool.query(`DROP TABLE IF EXISTS votes, posts, users CASCADE;`);
  await pool.query(`
    CREATE TABLE users (
      id       SERIAL PRIMARY KEY,
      username TEXT NOT NULL
    );
    CREATE TABLE posts (
      id        SERIAL PRIMARY KEY,
      author_id INTEGER NOT NULL REFERENCES users(id),
      title     TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE votes (
      id      SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL REFERENCES posts(id)
    );
    CREATE INDEX ON posts(author_id);
    CREATE INDEX ON votes(post_id);
  `);

  // one author (user 42) plus some others to make users a real table
  await pool.query(`INSERT INTO users (id, username) VALUES ($1, $2)`, [USER_ID, "ada"]);
  for (let i = 1; i <= 20; i++) {
    if (i === USER_ID) continue;
    await pool.query(`INSERT INTO users (id, username) VALUES ($1, $2)`, [i, "user" + i]);
  }

  // posts by user 42, each with a random number of votes
  for (let p = 0; p < NUM_POSTS; p++) {
    const { rows } = await pool.query(
      `INSERT INTO posts (author_id, title) VALUES ($1, $2) RETURNING id`,
      [USER_ID, "Post #" + (p + 1) + " about in-memory databases"]
    );
    const postId = rows[0].id;
    const voteCount = Math.floor(Math.random() * MAX_VOTES);
    for (let v = 0; v < voteCount; v++) {
      await pool.query(`INSERT INTO votes (post_id) VALUES ($1)`, [postId]);
    }
  }

  console.log(`  ${NUM_POSTS} posts + votes inserted for user ${USER_ID}.`);

  // Build the exact feed the benchmark serves, then store it in Redis as JSON.
  console.log("Encoding feed into Redis…");
  const { rows: feed } = await pool.query(FEED_SQL, [USER_ID]);
  await redis.set("feed:user:" + USER_ID, JSON.stringify(feed));
  console.log(`  feed:user:${USER_ID} set (${feed.length} rows, ${JSON.stringify(feed).length} bytes).`);

  await pool.end();
  redis.quit();
  console.log("Done. Now run:  node bench-pg.js   and   node bench-redis.js");
}

// The one feed query both the seed and bench-pg.js use.
export const FEED_SQL = `
  SELECT p.id, p.title, u.username, COUNT(v.id) AS votes
  FROM posts p
  JOIN users u ON u.id = p.author_id
  LEFT JOIN votes v ON v.post_id = p.id
  WHERE p.author_id = $1
  GROUP BY p.id, u.username
  ORDER BY votes DESC
  LIMIT 20;`;

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
