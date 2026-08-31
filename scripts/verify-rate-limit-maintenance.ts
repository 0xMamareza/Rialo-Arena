import assert from "node:assert/strict";
import { createHash, createHmac, randomUUID } from "node:crypto";

import { NextRequest } from "next/server";
import type { Pool } from "pg";

import type { RateLimitPolicy } from "../src/server/rate-limit/limiter";
import { createToolingPool } from "./lib/database";

type Identity = Awaited<
  ReturnType<typeof import("../src/server/identity/session")["confirmProfile"]>
>;

function request(
  pathname: string,
  options: {
    body?: unknown;
    clientIp?: string;
    method?: "GET" | "POST";
    sessionToken?: string;
  } = {},
) {
  const headers = new Headers();
  const method = options.method ?? "GET";

  if (method === "POST") {
    headers.set("origin", "http://localhost");
  }

  if (options.sessionToken) {
    headers.set("cookie", `rialo_session=${options.sessionToken}`);
  }
  if (options.clientIp) {
    headers.set("x-real-ip", options.clientIp);
  }
  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
  }

  return new NextRequest(`http://localhost${pathname}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

async function assertRateLimited(
  response: Response,
  style: "profile" | "standard",
) {
  assert.equal(response.status, 429);
  const retryAfter = Number(response.headers.get("retry-after"));
  assert.ok(Number.isInteger(retryAfter) && retryAfter >= 1);
  const body = await response.json() as {
    error?: string | { code?: string; message?: string };
  };

  if (style === "profile") {
    assert.equal(typeof body.error, "string");
  } else {
    assert.equal(typeof body.error, "object");
    assert.equal(
      typeof body.error === "object" ? body.error?.code : null,
      "RATE_LIMITED",
    );
  }

  assert.equal(JSON.stringify(body).includes("keyHash"), false);
}

async function cleanup(
  pool: Pool,
  userIds: string[],
  testUsernames: string[],
  bucketKeys: Array<{ keyHash: string; scope: string }>,
) {
  const usernameUsers = testUsernames.length === 0
    ? []
    : (
        await pool.query<{ id: string }>(
          "SELECT id FROM users WHERE x_username = ANY($1::text[])",
          [testUsernames],
        )
      ).rows.map((row) => row.id);
  const allUserIds = [...new Set([...userIds, ...usernameUsers])];
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (allUserIds.length > 0) {
      await client.query(
        `DELETE FROM attempt_questions
         WHERE attempt_id IN (
           SELECT id FROM quiz_attempts WHERE user_id = ANY($1::uuid[])
         )`,
        [allUserIds],
      );
      await client.query(
        "DELETE FROM quiz_attempts WHERE user_id = ANY($1::uuid[])",
        [allUserIds],
      );
      await client.query(
        "DELETE FROM sessions WHERE user_id = ANY($1::uuid[])",
        [allUserIds],
      );
      await client.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [
        allUserIds,
      ]);
    }

    if (bucketKeys.length > 0) {
      await client.query(
        `DELETE FROM rate_limit_buckets
         USING unnest($1::text[], $2::text[]) AS verifier_keys(scope, key_hash)
         WHERE rate_limit_buckets.scope = verifier_keys.scope
           AND rate_limit_buckets.key_hash = verifier_keys.key_hash`,
        [
          bucketKeys.map((key) => key.scope),
          bucketKeys.map((key) => key.keyHash),
        ],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const pool = createToolingPool();
  const identities: Identity[] = [];
  const testUsernames: string[] = [];
  const bucketKeys: Array<{ keyHash: string; scope: string }> = [];

  try {
    const identity = await import("../src/server/identity/session");
    const engine = await import("../src/server/quiz/engine");
    const maintenance = await import(
      "../src/server/maintenance/run-maintenance"
    );
    const limiter = await import("../src/server/rate-limit/limiter");
    const clientIp = await import("../src/server/rate-limit/client-ip");
    const profileRoute = await import("../src/app/api/profile/confirm/route");
    const startRoute = await import("../src/app/api/quiz/start/route");
    const answerRoute = await import(
      "../src/app/api/quiz/answer/[attemptId]/route"
    );
    const attemptRoute = await import(
      "../src/app/api/quiz/attempt/[attemptId]/route"
    );
    const leaderboardRoute = await import(
      "../src/app/api/leaderboard/route"
    );
    const statsRoute = await import("../src/app/api/stats/me/route");
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const ipA = `2001:db8:${suffix.slice(0, 4)}:${suffix.slice(4)}::1`;
    const ipB = `2001:db8:${suffix.slice(0, 4)}:${suffix.slice(4)}::2`;

    const spoofedRequest = new NextRequest("http://localhost/api/leaderboard", {
      headers: { "x-forwarded-for": ipA },
    });
    assert.equal(
      clientIp.getClientIpRateLimitKey(spoofedRequest),
      clientIp.UNAVAILABLE_CLIENT_IP,
    );
    const trustedProxyRequest = new NextRequest(
      "http://localhost/api/leaderboard",
      { headers: { "x-forwarded-for": ipA, "x-real-ip": ipB } },
    );
    assert.equal(clientIp.getClientIpRateLimitKey(trustedProxyRequest), ipB);

    const rememberBucket = (policy: RateLimitPolicy, rawKey: string) => {
      const key = {
        scope: policy.scope,
        keyHash: limiter.hashRateLimitKey(policy, rawKey),
      };
      bucketKeys.push(key);
      return key;
    };

    assert.deepEqual(limiter.PROFILE_CONFIRM_RATE_LIMIT, {
      scope: "profile-confirm:ip",
      limit: 10,
      windowSeconds: 600,
    });
    assert.deepEqual(limiter.QUIZ_START_RATE_LIMIT, {
      scope: "quiz-start:user",
      limit: 10,
      windowSeconds: 60,
    });
    assert.deepEqual(limiter.QUIZ_ANSWER_RATE_LIMIT, {
      scope: "quiz-answer:user",
      limit: 60,
      windowSeconds: 60,
    });
    assert.deepEqual(limiter.QUIZ_STATE_RATE_LIMIT, {
      scope: "quiz-state:user",
      limit: 120,
      windowSeconds: 60,
    });
    assert.deepEqual(limiter.LEADERBOARD_RATE_LIMIT, {
      scope: "leaderboard:ip",
      limit: 120,
      windowSeconds: 60,
    });
    assert.deepEqual(limiter.PERSONAL_STATS_RATE_LIMIT, {
      scope: "personal-stats:user",
      limit: 60,
      windowSeconds: 60,
    });

    rememberBucket(limiter.PROFILE_CONFIRM_RATE_LIMIT, ipA);
    rememberBucket(limiter.PROFILE_CONFIRM_RATE_LIMIT, ipB);

    for (let index = 0; index < 10; index += 1) {
      const username = `rp${index}_${suffix}`;
      testUsernames.push(username);
      const response = await profileRoute.POST(
        request("/api/profile/confirm", {
          method: "POST",
          clientIp: ipA,
          body: { username },
        }),
      );
      assert.equal(response.status, 200);
    }

    await assertRateLimited(
      await profileRoute.POST(
        request("/api/profile/confirm", {
          method: "POST",
          clientIp: ipA,
          body: { username: `rpx_${suffix}` },
        }),
      ),
      "profile",
    );
    const isolatedProfileUsername = `rpy_${suffix}`;
    testUsernames.push(isolatedProfileUsername);
    assert.equal(
      (
        await profileRoute.POST(
          request("/api/profile/confirm", {
            method: "POST",
            clientIp: ipB,
            body: { username: isolatedProfileUsername },
          }),
        )
      ).status,
      200,
    );

    const owner = await identity.confirmProfile(`rlu_${suffix}`);
    const otherUser = await identity.confirmProfile(`rlv_${suffix}`);
    const maintenanceUser = await identity.confirmProfile(`rlm_${suffix}`);
    identities.push(owner, otherUser, maintenanceUser);

    rememberBucket(limiter.QUIZ_START_RATE_LIMIT, owner.user.id);
    rememberBucket(limiter.QUIZ_START_RATE_LIMIT, otherUser.user.id);
    const startResponses = await Promise.all(
      Array.from({ length: 10 }, () =>
        startRoute.GET(request("/api/quiz/start", {
          sessionToken: owner.rawSessionToken,
        })),
      ),
    );
    assert.ok(startResponses.every((response) => response.status === 204));
    await assertRateLimited(
      await startRoute.GET(request("/api/quiz/start", {
        sessionToken: owner.rawSessionToken,
      })),
      "standard",
    );
    assert.equal(
      (
        await startRoute.GET(request("/api/quiz/start", {
          sessionToken: otherUser.rawSessionToken,
        }))
      ).status,
      204,
    );

    rememberBucket(limiter.QUIZ_ANSWER_RATE_LIMIT, owner.user.id);
    rememberBucket(limiter.QUIZ_ANSWER_RATE_LIMIT, otherUser.user.id);
    const answerContext = {
      params: Promise.resolve({ attemptId: randomUUID() }),
    };
    const answerResponses = await Promise.all(
      Array.from({ length: 60 }, () =>
        answerRoute.POST(
          request("/api/quiz/answer/unused", {
            method: "POST",
            sessionToken: owner.rawSessionToken,
            body: { choiceIndex: 4 },
          }),
          answerContext,
        ),
      ),
    );
    assert.ok(answerResponses.every((response) => response.status === 400));
    await assertRateLimited(
      await answerRoute.POST(
        request("/api/quiz/answer/unused", {
          method: "POST",
          sessionToken: owner.rawSessionToken,
          body: { choiceIndex: 4 },
        }),
        answerContext,
      ),
      "standard",
    );
    assert.equal(
      (
        await answerRoute.POST(
          request("/api/quiz/answer/unused", {
            method: "POST",
            sessionToken: otherUser.rawSessionToken,
            body: { choiceIndex: 4 },
          }),
          answerContext,
        )
      ).status,
      400,
    );

    rememberBucket(limiter.LEADERBOARD_RATE_LIMIT, ipA);
    rememberBucket(limiter.LEADERBOARD_RATE_LIMIT, ipB);
    const leaderboardResponses = await Promise.all(
      Array.from({ length: 120 }, () =>
        leaderboardRoute.GET(
          request("/api/leaderboard?limit=0", { clientIp: ipA }),
        ),
      ),
    );
    assert.ok(
      leaderboardResponses.every((response) => response.status === 400),
    );
    await assertRateLimited(
      await leaderboardRoute.GET(
        request("/api/leaderboard?limit=0", { clientIp: ipA }),
      ),
      "standard",
    );
    assert.equal(
      (
        await leaderboardRoute.GET(
          request("/api/leaderboard?limit=0", { clientIp: ipB }),
        )
      ).status,
      400,
    );

    rememberBucket(limiter.PERSONAL_STATS_RATE_LIMIT, owner.user.id);
    rememberBucket(limiter.PERSONAL_STATS_RATE_LIMIT, otherUser.user.id);
    const statsResponses = await Promise.all(
      Array.from({ length: 60 }, () =>
        statsRoute.GET(request("/api/stats/me", {
          sessionToken: owner.rawSessionToken,
        })),
      ),
    );
    assert.ok(statsResponses.every((response) => response.status === 200));
    await assertRateLimited(
      await statsRoute.GET(request("/api/stats/me", {
        sessionToken: owner.rawSessionToken,
      })),
      "standard",
    );
    assert.equal(
      (
        await statsRoute.GET(request("/api/stats/me", {
          sessionToken: otherUser.rawSessionToken,
        }))
      ).status,
      200,
    );

    const storedIpBucket = await pool.query<{ keyHash: string }>(
      `SELECT key_hash AS "keyHash"
       FROM rate_limit_buckets
       WHERE scope = $1 AND key_hash = $2`,
      [
        limiter.PROFILE_CONFIRM_RATE_LIMIT.scope,
        limiter.hashRateLimitKey(limiter.PROFILE_CONFIRM_RATE_LIMIT, ipA),
      ],
    );
    assert.match(storedIpBucket.rows[0]?.keyHash ?? "", /^[0-9a-f]{64}$/);
    assert.notEqual(storedIpBucket.rows[0]?.keyHash, ipA);

    const hmacSecretA = "a".repeat(32);
    const hmacSecretB = "b".repeat(32);
    const hmacKeyA = limiter.createRateLimitKeyHash(
      limiter.PROFILE_CONFIRM_RATE_LIMIT,
      ipA,
      hmacSecretA,
    );
    assert.equal(
      hmacKeyA,
      createHmac("sha256", hmacSecretA)
        .update(
          `rialo-arena-rate-limit:v1:${limiter.PROFILE_CONFIRM_RATE_LIMIT.scope}:${ipA}`,
        )
        .digest("hex"),
    );
    assert.notEqual(
      hmacKeyA,
      limiter.createRateLimitKeyHash(
        limiter.PROFILE_CONFIRM_RATE_LIMIT,
        ipA,
        hmacSecretB,
      ),
    );

    rememberBucket(limiter.QUIZ_STATE_RATE_LIMIT, owner.user.id);
    rememberBucket(limiter.QUIZ_STATE_RATE_LIMIT, otherUser.user.id);
    const missingAttemptId = randomUUID();
    const attemptContext = {
      params: Promise.resolve({ attemptId: missingAttemptId }),
    };
    const attemptStateResponses = await Promise.all(
      Array.from({ length: 120 }, () =>
        attemptRoute.GET(
          request(`/api/quiz/attempt/${missingAttemptId}`, {
            sessionToken: owner.rawSessionToken,
          }),
          attemptContext,
        ),
      ),
    );
    assert.ok(
      attemptStateResponses.every((response) => response.status === 404),
    );
    await assertRateLimited(
      await attemptRoute.GET(
        request(`/api/quiz/attempt/${missingAttemptId}`, {
          sessionToken: owner.rawSessionToken,
        }),
        attemptContext,
      ),
      "standard",
    );
    assert.equal(
      (
        await attemptRoute.GET(
          request(`/api/quiz/attempt/${missingAttemptId}`, {
            sessionToken: otherUser.rawSessionToken,
          }),
          attemptContext,
        )
      ).status,
      404,
    );

    const concurrencyPolicy = {
      scope: `verify-concurrency:${suffix}`,
      limit: 5,
      windowSeconds: 60,
    } satisfies RateLimitPolicy;
    const concurrentKey = `concurrent:${suffix}`;
    const isolatedKey = `isolated:${suffix}`;
    const concurrentBucket = rememberBucket(concurrencyPolicy, concurrentKey);
    rememberBucket(concurrencyPolicy, isolatedKey);
    const decisions = await Promise.all(
      Array.from({ length: 20 }, () =>
        limiter.consumeRateLimit(concurrencyPolicy, concurrentKey),
      ),
    );
    assert.equal(decisions.filter((decision) => decision.allowed).length, 5);
    assert.equal(
      (await limiter.consumeRateLimit(concurrencyPolicy, isolatedKey)).allowed,
      true,
    );

    await pool.query(
      `UPDATE rate_limit_buckets
       SET
         window_started_at = clock_timestamp() - interval '2 minutes',
         expires_at = clock_timestamp() - interval '1 minute'
       WHERE scope = $1 AND key_hash = $2`,
      [concurrentBucket.scope, concurrentBucket.keyHash],
    );
    const resetDecision = await limiter.consumeRateLimit(
      concurrencyPolicy,
      concurrentKey,
    );
    assert.equal(resetDecision.allowed, true);
    assert.equal(resetDecision.remaining, 4);

    const maintenanceAttempt = await engine.startQuizAttempt(
      maintenanceUser.user.id,
    );
    assert.equal(maintenanceAttempt.status, "active");
    await pool.query(
      `WITH authoritative_now AS (SELECT clock_timestamp() AS value)
       UPDATE attempt_questions
       SET
         activated_at = authoritative_now.value - interval '321 seconds',
         deadline_at = authoritative_now.value - interval '301 seconds'
       FROM authoritative_now
       WHERE attempt_id = $1 AND status = 'active'`,
      [maintenanceAttempt.attemptId],
    );

    const expiredSessionHash = createHash("sha256")
      .update(`expired-session:${suffix}`)
      .digest("hex");
    await pool.query(
      `INSERT INTO sessions (
         user_id,
         token_hash,
         created_at,
         expires_at
       ) VALUES (
         $1,
         $2,
         clock_timestamp() - interval '2 hours',
         clock_timestamp() - interval '1 hour'
       )`,
      [maintenanceUser.user.id, expiredSessionHash],
    );

    const expiredBucketPolicy = {
      scope: `verify-expired:${suffix}`,
      limit: 3,
      windowSeconds: 60,
    } satisfies RateLimitPolicy;
    const validBucketPolicy = {
      scope: `verify-valid:${suffix}`,
      limit: 3,
      windowSeconds: 60,
    } satisfies RateLimitPolicy;
    const expiredBucket = rememberBucket(expiredBucketPolicy, "expired");
    const validBucket = rememberBucket(validBucketPolicy, "valid");
    await limiter.consumeRateLimit(expiredBucketPolicy, "expired");
    await limiter.consumeRateLimit(validBucketPolicy, "valid");
    await pool.query(
      `UPDATE rate_limit_buckets
       SET
         window_started_at = clock_timestamp() - interval '2 minutes',
         expires_at = clock_timestamp() - interval '1 minute'
       WHERE scope = $1 AND key_hash = $2`,
      [expiredBucket.scope, expiredBucket.keyHash],
    );

    const firstMaintenance = await maintenance.runMaintenance();
    assert.ok(firstMaintenance.overdueAttemptsVisited >= 1);
    assert.ok(firstMaintenance.overdueAttemptsCompleted >= 1);
    assert.ok(firstMaintenance.expiredSessionsDeleted >= 1);
    assert.ok(firstMaintenance.expiredRateLimitBucketsDeleted >= 1);

    const lifecycleState = await pool.query<{
      expiredBucketCount: number;
      expiredSessionCount: number;
      status: string;
      timeoutCount: number;
      validBucketCount: number;
    }>(
      `SELECT
         quiz_attempts.status,
         quiz_attempts.timeout_count AS "timeoutCount",
         (
           SELECT count(*)::integer
           FROM sessions
           WHERE token_hash = $2
         ) AS "expiredSessionCount",
         (
           SELECT count(*)::integer
           FROM rate_limit_buckets
           WHERE scope = $3 AND key_hash = $4
         ) AS "expiredBucketCount",
         (
           SELECT count(*)::integer
           FROM rate_limit_buckets
           WHERE scope = $5 AND key_hash = $6
         ) AS "validBucketCount"
       FROM quiz_attempts
       WHERE quiz_attempts.id = $1`,
      [
        maintenanceAttempt.attemptId,
        expiredSessionHash,
        expiredBucket.scope,
        expiredBucket.keyHash,
        validBucket.scope,
        validBucket.keyHash,
      ],
    );
    assert.deepEqual(lifecycleState.rows[0], {
      status: "completed",
      timeoutCount: 15,
      expiredSessionCount: 0,
      expiredBucketCount: 0,
      validBucketCount: 1,
    });
    assert.ok(
      await identity.resolveSessionToken(maintenanceUser.rawSessionToken),
    );

    const reviewAttempt = await engine.startQuizAttempt(
      maintenanceUser.user.id,
    );
    assert.equal(reviewAttempt.status, "active");
    if (reviewAttempt.status !== "active") {
      assert.fail("Maintenance review attempt did not start active");
    }
    const reviewState = await engine.submitQuizAnswer({
      userId: maintenanceUser.user.id,
      attemptId: reviewAttempt.attemptId,
      attemptQuestionId: reviewAttempt.currentQuestion.attemptQuestionId,
      choiceIndex: 0,
    });
    assert.equal(reviewState.status, "review");
    await pool.query(
      `UPDATE attempt_questions
       SET answered_at = clock_timestamp() - interval '3100 milliseconds'
       WHERE attempt_id = $1 AND status = 'answered'`,
      [reviewAttempt.attemptId],
    );

    const reviewMaintenance = await maintenance.runMaintenance();
    assert.ok(reviewMaintenance.overdueAttemptsVisited >= 1);
    const resumedAfterReview = await engine.getQuizState(
      maintenanceUser.user.id,
      reviewAttempt.attemptId,
    );
    assert.equal(resumedAfterReview.status, "active");
    if (resumedAfterReview.status !== "active") {
      assert.fail("Maintenance did not release an expired answer review");
    }
    assert.equal(resumedAfterReview.position, 2);
    assert.equal(
      new Date(resumedAfterReview.currentQuestion.deadlineAt).getTime() -
        new Date(resumedAfterReview.currentQuestion.activatedAt).getTime(),
      20_000,
    );

    const completedBeforeRerun = await pool.query(
      `SELECT status, total_score, correct_count, timeout_count, completed_at
       FROM quiz_attempts
       WHERE id = $1`,
      [maintenanceAttempt.attemptId],
    );
    await maintenance.runMaintenance();
    const completedAfterRerun = await pool.query(
      `SELECT status, total_score, correct_count, timeout_count, completed_at
       FROM quiz_attempts
       WHERE id = $1`,
      [maintenanceAttempt.attemptId],
    );
    assert.deepEqual(completedAfterRerun.rows, completedBeforeRerun.rows);

    console.log("Verified every configured endpoint limit and Retry-After response.");
    console.log("Verified atomic concurrency, key isolation, and expired-window reuse.");
    console.log("Verified trusted proxy extraction ignores spoofed forwarding chains.");
    console.log("Verified persisted client IP keys are secret-keyed HMACs only.");
    console.log("Verified authenticated attempt-state GET throttling.");
    console.log("Verified maintenance expires transient state and settles quiz timeouts.");
    console.log("Verified maintenance releases expired answer reviews.");
    console.log("Verified maintenance reruns preserve completed attempt history.");
  } finally {
    await cleanup(
      pool,
      identities.map((entry) => entry.user.id),
      testUsernames,
      bucketKeys,
    );
    await pool.end();
  }

  console.log("Verified cleanup of all temporary limiter and lifecycle data.");
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? `Rate-limit/maintenance verification failed: ${error.message}`
      : "Rate-limit/maintenance verification failed.",
  );
  process.exitCode = 1;
});
