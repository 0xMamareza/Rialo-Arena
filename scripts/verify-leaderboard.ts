import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { NextRequest } from "next/server";
import type { Pool } from "pg";

import type {
  LeaderboardEntry,
  LeaderboardResponse,
  PersonalBestStats,
} from "../src/lib/leaderboard/api-types";
import { createToolingPool } from "./lib/database";

const FORBIDDEN_KEYS = new Set([
  "attemptId",
  "userId",
  "sessionId",
  "tokenHash",
  "rawSessionToken",
  "status",
  "completedAt",
  "questionId",
  "category",
  "correctOption",
]);

type Identity = Awaited<
  ReturnType<typeof import("../src/server/identity/session")["confirmProfile"]>
>;

function request(
  pathname: string,
  options: { sessionToken?: string } = {},
) {
  const headers = new Headers();

  if (options.sessionToken) {
    headers.set("cookie", `rialo_session=${options.sessionToken}`);
  }

  return new NextRequest(`http://localhost${pathname}`, { headers });
}

async function readJson<T>(response: Response) {
  return {
    response,
    body: await response.json() as T,
  };
}

function assertNoLeaks(value: unknown, rawTokens: string[]) {
  const serialized = JSON.stringify(value);

  for (const token of rawTokens) {
    assert.equal(serialized.includes(token), false, "API leaked a session token");
  }

  const visit = (candidate: unknown): void => {
    if (Array.isArray(candidate)) {
      candidate.forEach(visit);
      return;
    }

    if (!candidate || typeof candidate !== "object") {
      return;
    }

    for (const [key, child] of Object.entries(candidate)) {
      assert.equal(FORBIDDEN_KEYS.has(key), false, `API exposed ${key}`);
      visit(child);
    }
  };

  visit(value);
}

function assertLeaderboardEntry(entry: LeaderboardEntry) {
  assert.deepEqual(
    Object.keys(entry).sort(),
    [
      "correctCount",
      "profileImageUrl",
      "rank",
      "score",
      "tier",
      "timeoutCount",
      "xUsername",
    ].sort(),
  );
  assert.ok(Number.isInteger(entry.rank) && entry.rank > 0);
}

async function insertAttempt(
  pool: Pool,
  input: {
    userId: string;
    status: "active" | "completed" | "expired" | "abandoned";
    score: number;
    correctCount: number;
    timeoutCount: number;
    completedAt?: Date;
  },
) {
  await pool.query(
    `INSERT INTO quiz_attempts (
       user_id,
       status,
       total_score,
       correct_count,
       timeout_count,
       started_at,
       completed_at,
       created_at
     ) VALUES (
       $1,
       $2::quiz_attempt_status,
       $3,
       $4,
       $5,
       clock_timestamp() - interval '1 minute',
       $6,
       clock_timestamp() - interval '2 minutes'
     )`,
    [
      input.userId,
      input.status,
      input.score,
      input.correctCount,
      input.timeoutCount,
      input.completedAt ?? null,
    ],
  );
}

async function cleanup(pool: Pool, identities: Identity[]) {
  const userIds = identities.map((identity) => identity.user.id);

  if (userIds.length === 0) return;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM attempt_questions
       WHERE attempt_id IN (
         SELECT id FROM quiz_attempts WHERE user_id = ANY($1::uuid[])
       )`,
      [userIds],
    );
    await client.query(
      "DELETE FROM quiz_attempts WHERE user_id = ANY($1::uuid[])",
      [userIds],
    );
    await client.query(
      "DELETE FROM sessions WHERE user_id = ANY($1::uuid[])",
      [userIds],
    );
    await client.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [userIds]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function verifyCleanup(pool: Pool, identities: Identity[]) {
  const userIds = identities.map((identity) => identity.user.id);
  const result = await pool.query<{
    users: number;
    sessions: number;
    attempts: number;
    questions: number;
  }>(
    `SELECT
       (SELECT count(*)::integer FROM users WHERE id = ANY($1::uuid[])) AS users,
       (
         SELECT count(*)::integer
         FROM sessions
         WHERE user_id = ANY($1::uuid[])
       ) AS sessions,
       (
         SELECT count(*)::integer
         FROM quiz_attempts
         WHERE user_id = ANY($1::uuid[])
       ) AS attempts,
       (
         SELECT count(*)::integer
         FROM attempt_questions
         WHERE attempt_id IN (
           SELECT id FROM quiz_attempts WHERE user_id = ANY($1::uuid[])
         )
       ) AS questions`,
    [userIds],
  );

  assert.deepEqual(result.rows[0], {
    users: 0,
    sessions: 0,
    attempts: 0,
    questions: 0,
  });
}

async function main() {
  const pool = createToolingPool();
  const identities: Identity[] = [];

  try {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const identity = await import("../src/server/identity/session");
    const queries = await import("../src/server/leaderboard/queries");
    const rankTiers = await import(
      "../src/server/leaderboard/rank-tiers"
    );
    const leaderboardRoute = await import("../src/app/api/leaderboard/route");
    const statsRoute = await import("../src/app/api/stats/me/route");
    const createIdentity = async (username: string) => {
      const confirmed = await identity.confirmProfile(username);
      identities.push(confirmed);
      return confirmed;
    };

    const lowerScoreUser = await createIdentity(`lba_${suffix}`);
    const duplicateUsername = `lbb_${suffix}`;
    const tiedUserA = await createIdentity(duplicateUsername);
    const tiedUserB = await createIdentity(duplicateUsername);
    const noCompletedRunUser = await createIdentity(`lbd_${suffix}`);

    assert.notEqual(tiedUserA.user.id, tiedUserB.user.id);
    assert.equal(tiedUserA.user.xUsername, tiedUserB.user.xUsername);

    for (const [score, expectedTier] of [
      [0, "Explorer"],
      [999, "Explorer"],
      [1000, "Builder"],
      [1499, "Builder"],
      [1500, "Operator"],
      [1999, "Operator"],
      [2000, "Architect"],
      [2399, "Architect"],
      [2400, "Vanguard"],
      [2699, "Vanguard"],
      [2700, "Apex"],
      [3000, "Apex"],
    ] as const) {
      assert.equal(rankTiers.getArenaRankTier(score), expectedTier);
    }

    for (const impossibleScore of [-1, 3001, 1.5, Number.NaN]) {
      assert.throws(
        () => rankTiers.getArenaRankTier(impossibleScore),
        RangeError,
      );
    }

    const firstPlaceTimestamp = new Date("2000-01-01T00:00:00.000Z");
    const lowerScoreTimestamp = new Date("2000-01-05T00:00:00.000Z");

    await insertAttempt(pool, {
      userId: lowerScoreUser.user.id,
      status: "completed",
      score: 2800,
      correctCount: 13,
      timeoutCount: 1,
      completedAt: new Date("2000-01-03T00:00:00.000Z"),
    });
    await insertAttempt(pool, {
      userId: lowerScoreUser.user.id,
      status: "completed",
      score: 2990,
      correctCount: 13,
      timeoutCount: 0,
      completedAt: new Date("2000-01-04T00:00:00.000Z"),
    });
    await insertAttempt(pool, {
      userId: lowerScoreUser.user.id,
      status: "completed",
      score: 2990,
      correctCount: 14,
      timeoutCount: 0,
      completedAt: lowerScoreTimestamp,
    });
    await insertAttempt(pool, {
      userId: lowerScoreUser.user.id,
      status: "active",
      score: 3000,
      correctCount: 15,
      timeoutCount: 0,
    });
    await insertAttempt(pool, {
      userId: lowerScoreUser.user.id,
      status: "abandoned",
      score: 3000,
      correctCount: 15,
      timeoutCount: 0,
    });

    for (const tiedUser of [tiedUserA, tiedUserB]) {
      await insertAttempt(pool, {
        userId: tiedUser.user.id,
        status: "completed",
        score: 3000,
        correctCount: 15,
        timeoutCount: 0,
        completedAt: firstPlaceTimestamp,
      });
    }

    await insertAttempt(pool, {
      userId: noCompletedRunUser.user.id,
      status: "expired",
      score: 3000,
      correctCount: 15,
      timeoutCount: 0,
    });

    const allEntries = await queries.getGlobalLeaderboard(1_000_000);
    const verifierEntries = allEntries.filter((entry) =>
      identities.some(
        (candidate) => candidate.user.xUsername === entry.xUsername,
      ),
    );

    assert.deepEqual(
      verifierEntries.map((entry) => entry.xUsername),
      [
        tiedUserA.user.xUsername,
        tiedUserB.user.xUsername,
        lowerScoreUser.user.xUsername,
      ],
    );
    verifierEntries.forEach(assertLeaderboardEntry);
    assert.equal(verifierEntries[0]?.score, 3000);
    assert.equal(verifierEntries[0]?.tier, "Apex");
    assert.equal(verifierEntries[1]?.score, 3000);
    assert.equal(verifierEntries[2]?.score, 2990);
    assert.equal(verifierEntries[2]?.correctCount, 14);
    assert.equal(
      verifierEntries.some(
        (entry) => entry.xUsername === noCompletedRunUser.user.xUsername,
      ),
      false,
    );

    const leaderboardApi = await readJson<LeaderboardResponse>(
      await leaderboardRoute.GET(request("/api/leaderboard?limit=2")),
    );
    assert.equal(leaderboardApi.response.status, 200);
    assert.equal(leaderboardApi.body.entries.length, 2);
    assert.deepEqual(leaderboardApi.body.entries, allEntries.slice(0, 2));

    for (const invalidLimit of ["0", "101", "1.5", "not-a-number"]) {
      const invalidResponse = await leaderboardRoute.GET(
        request(`/api/leaderboard?limit=${invalidLimit}`),
      );
      assert.equal(invalidResponse.status, 400);
    }
    const duplicateLimitResponse = await leaderboardRoute.GET(
      request("/api/leaderboard?limit=1&limit=2"),
    );
    assert.equal(duplicateLimitResponse.status, 400);

    const unauthorizedStats = await statsRoute.GET(request("/api/stats/me"));
    assert.equal(unauthorizedStats.status, 401);

    const lowerScoreStats = await readJson<PersonalBestStats>(
      await statsRoute.GET(
        request("/api/stats/me", {
          sessionToken: lowerScoreUser.rawSessionToken,
        }),
      ),
    );
    assert.equal(lowerScoreStats.response.status, 200);
    assert.deepEqual(lowerScoreStats.body.personalBest, {
      score: 2990,
      correctCount: 14,
      timeoutCount: 0,
    });
    assert.equal(lowerScoreStats.body.completedAttemptsCount, 3);
    assert.equal(
      lowerScoreStats.body.globalRank,
      verifierEntries[2]?.rank,
    );
    assert.equal(lowerScoreStats.body.tier, "Apex");

    const emptyStats = await readJson<PersonalBestStats>(
      await statsRoute.GET(
        request("/api/stats/me", {
          sessionToken: noCompletedRunUser.rawSessionToken,
        }),
      ),
    );
    assert.equal(emptyStats.response.status, 200);
    assert.deepEqual(emptyStats.body, {
      personalBest: null,
      completedAttemptsCount: 0,
      globalRank: null,
      tier: null,
    });

    const rawTokens = identities.map((entry) => entry.rawSessionToken);
    assertNoLeaks(leaderboardApi.body, rawTokens);
    assertNoLeaks(lowerScoreStats.body, rawTokens);
    assertNoLeaks(emptyStats.body, rawTokens);

    console.log("Verified one best completed attempt per user.");
    console.log("Verified deterministic ties and incomplete-attempt exclusion.");
    console.log("Verified duplicate display usernames remain separate entries.");
    console.log("Verified bounded leaderboard API validation and safe DTOs.");
    console.log("Verified authenticated personal best and zero-run state.");
    console.log("Verified every Arena rank-tier boundary and invalid scores.");
  } finally {
    await cleanup(pool, identities);
    await verifyCleanup(pool, identities);
    await pool.end();
  }

  console.log("Verified cleanup of all temporary leaderboard data.");
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? `Leaderboard verification failed: ${error.message}`
      : "Leaderboard verification failed.",
  );
  process.exitCode = 1;
});
