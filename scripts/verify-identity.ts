import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";

import { NextRequest } from "next/server";
import type { Pool } from "pg";

import {
  buildXAvatarUrl,
  normalizeXUsername,
} from "../src/lib/identity/username";
import type { PersonalBestStats } from "../src/lib/leaderboard/api-types";
import type * as IdentityModule from "../src/server/identity/session";
import type * as QuizEngineModule from "../src/server/quiz/engine";
import type { QuizEngineError } from "../src/server/quiz/types";
import { createToolingPool } from "./lib/database";
import { cleanupVerifierRateLimits } from "./lib/rate-limit";

const IDENTITY_VERIFIER_IP = "2001:db8::101";

type Identity = typeof IdentityModule;
type QuizEngine = typeof QuizEngineModule;

type ProtectedDatabaseState = {
  questionCount: number;
  questionFingerprint: string;
  attemptCount: number;
  attemptQuestionCount: number;
};

async function getProtectedDatabaseState(
  pool: Pool,
): Promise<ProtectedDatabaseState> {
  const result = await pool.query<ProtectedDatabaseState>(
    `SELECT
       (SELECT count(*)::integer FROM questions) AS "questionCount",
       (
         SELECT md5(
           coalesce(
             jsonb_agg(
               jsonb_build_array(
                 id,
                 question_text,
                 option_a,
                 option_b,
                 option_c,
                 option_d,
                 correct_option,
                 category,
                 is_active,
                 version
               ) ORDER BY id
             )::text,
             '[]'
           )
         )
         FROM questions
       ) AS "questionFingerprint",
       (SELECT count(*)::integer FROM quiz_attempts) AS "attemptCount",
       (SELECT count(*)::integer FROM attempt_questions) AS "attemptQuestionCount"`,
  );
  const state = result.rows[0];

  assert.ok(state, "Protected database state could not be read");
  return state;
}

function verifyUsernameDomain() {
  assert.equal(normalizeXUsername(" @Mama_Reza "), "mama_reza");
  assert.equal(normalizeXUsername("A"), "a");
  assert.equal(buildXAvatarUrl("@Mama_Reza"), "https://unavatar.io/x/mama_reza?fallback=false");

  for (const invalidUsername of [
    "",
    "@",
    "bad handle",
    "bad-handle",
    "https://x.com/rialo",
    "rialo/hq",
    "abcdefghijklmnop",
  ]) {
    assert.throws(() => normalizeXUsername(invalidUsername));
  }
}

function request(
  pathname: string,
  options: {
    method?: "GET" | "POST";
    sessionToken?: string;
    body?: unknown;
  } = {},
) {
  const headers = new Headers();
  headers.set("x-forwarded-for", IDENTITY_VERIFIER_IP);

  if (options.sessionToken) {
    headers.set("cookie", `rialo_session=${options.sessionToken}`);
  }
  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
  }

  return new NextRequest(`http://localhost${pathname}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

function getIssuedSessionToken(response: Response) {
  const setCookie = response.headers.get("set-cookie");
  const token = setCookie?.match(/(?:^|,\s*)rialo_session=([^;]+)/)?.[1];

  assert.ok(token, "Profile confirmation did not issue an Arena session");
  return token;
}

async function readStats(response: Response) {
  assert.equal(response.status, 200);
  return await response.json() as PersonalBestStats;
}

async function expectEngineError(
  operation: () => Promise<unknown>,
  expectedCode: string,
) {
  try {
    await operation();
    assert.fail(`Expected quiz-engine error ${expectedCode}`);
  } catch (error) {
    const quizError = error as QuizEngineError;
    assert.equal(quizError.name, "QuizEngineError");
    assert.equal(quizError.code, expectedCode);
  }
}

async function insertCompletedAttempt(
  pool: Pool,
  input: {
    userId: string;
    score: number;
    correctCount: number;
    timeoutCount: number;
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
       completed_at
     ) VALUES (
       $1,
       'completed',
       $2,
       $3,
       $4,
       clock_timestamp() - interval '1 minute',
       clock_timestamp()
     )`,
    [input.userId, input.score, input.correctCount, input.timeoutCount],
  );
}

async function cleanupVerifierIdentity(
  pool: Pool,
  userIds: string[],
  usernames: string[],
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `CREATE TEMP TABLE identity_verifier_users ON COMMIT DROP AS
       SELECT id
       FROM users
       WHERE id = ANY($1::uuid[]) OR x_username = ANY($2::text[])`,
      [userIds, usernames],
    );
    await client.query(
      `DELETE FROM attempt_questions
       WHERE attempt_id IN (
         SELECT id FROM quiz_attempts
         WHERE user_id IN (SELECT id FROM identity_verifier_users)
       )`,
    );
    await client.query(
      `DELETE FROM quiz_attempts
       WHERE user_id IN (SELECT id FROM identity_verifier_users)`,
    );
    await client.query(
      `DELETE FROM sessions
       WHERE user_id IN (SELECT id FROM identity_verifier_users)`,
    );
    await client.query(
      "DELETE FROM users WHERE id IN (SELECT id FROM identity_verifier_users)",
    );
    await cleanupVerifierRateLimits(client, {
      clientIps: [IDENTITY_VERIFIER_IP],
      userIds,
    });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function verifyIdentityIntegration(
  identity: Identity,
  engine: QuizEngine,
  pool: Pool,
) {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 6);
  const sharedUsername = `iv_${suffix}_a`;
  const existingUsername = `iv_${suffix}_b`;
  const testUsernames = [sharedUsername, existingUsername];
  const userIds: string[] = [];
  const mixedCaseInput = ` @${sharedUsername.toUpperCase()} `;
  const expectedAvatarUrl = `https://unavatar.io/x/${sharedUsername}?fallback=false`;
  const protectedStateBefore = await getProtectedDatabaseState(pool);

  try {
    const firstConfirmation = await identity.confirmProfile(mixedCaseInput);
    userIds.push(firstConfirmation.user.id);
    const secondConfirmation = await identity.confirmProfile(sharedUsername);
    userIds.push(secondConfirmation.user.id);
    const existingIdentity = await identity.confirmProfile(existingUsername);
    userIds.push(existingIdentity.user.id);

    assert.equal(firstConfirmation.user.xUsername, sharedUsername);
    assert.equal(firstConfirmation.profile.username, sharedUsername);
    assert.equal(firstConfirmation.profile.profileImageUrl, expectedAvatarUrl);
    assert.equal(firstConfirmation.rawSessionToken.length, 43);
    assert.notEqual(firstConfirmation.user.id, secondConfirmation.user.id);
    assert.notEqual(
      firstConfirmation.rawSessionToken,
      secondConfirmation.rawSessionToken,
    );

    const duplicateResult = await pool.query<{
      userCount: number;
    }>(
      `SELECT
         count(*)::integer AS "userCount"
       FROM users
       WHERE x_username = $1`,
      [sharedUsername],
    );
    assert.equal(duplicateResult.rows[0]?.userCount, 2);

    const expectedFirstHash = createHash("sha256")
      .update(firstConfirmation.rawSessionToken)
      .digest("hex");
    const firstSessionResult = await pool.query<{
      tokenHash: string;
      expiresAt: Date;
      createdAt: Date;
    }>(
      `SELECT
         token_hash AS "tokenHash",
         expires_at AS "expiresAt",
         created_at AS "createdAt"
       FROM sessions
       WHERE user_id = $1`,
      [firstConfirmation.user.id],
    );
    const firstSession = firstSessionResult.rows[0];

    assert.ok(firstSession, "Session was not stored");
    assert.notEqual(firstSession.tokenHash, firstConfirmation.rawSessionToken);
    assert.equal(firstSession.tokenHash, expectedFirstHash);
    assert.ok(
      Math.abs(
        firstSession.expiresAt.getTime() -
          firstSession.createdAt.getTime() -
          identity.SESSION_DURATION_SECONDS * 1000,
      ) < 1_000,
      "Session duration differs from 30 days",
    );

    const resolvedUser = await identity.resolveSessionToken(
      firstConfirmation.rawSessionToken,
    );
    assert.deepEqual(resolvedUser, firstConfirmation.user);
    assert.deepEqual(
      await identity.resolveSessionToken(secondConfirmation.rawSessionToken),
      secondConfirmation.user,
    );

    const firstAttempt = await engine.startQuizAttempt(firstConfirmation.user.id);
    const secondAttempt = await engine.startQuizAttempt(secondConfirmation.user.id);

    await expectEngineError(
      () => engine.getQuizState(secondConfirmation.user.id, firstAttempt.attemptId),
      "ATTEMPT_NOT_FOUND",
    );
    await expectEngineError(
      () => engine.getQuizState(firstConfirmation.user.id, secondAttempt.attemptId),
      "ATTEMPT_NOT_FOUND",
    );

    await insertCompletedAttempt(pool, {
      userId: firstConfirmation.user.id,
      score: 1234,
      correctCount: 7,
      timeoutCount: 1,
    });
    await insertCompletedAttempt(pool, {
      userId: secondConfirmation.user.id,
      score: 2345,
      correctCount: 12,
      timeoutCount: 1,
    });

    const statsRoute = await import("../src/app/api/stats/me/route");
    const firstStats = await readStats(
      await statsRoute.GET(
        request("/api/stats/me", {
          sessionToken: firstConfirmation.rawSessionToken,
        }),
      ),
    );
    const secondStats = await readStats(
      await statsRoute.GET(
        request("/api/stats/me", {
          sessionToken: secondConfirmation.rawSessionToken,
        }),
      ),
    );
    assert.equal(firstStats.personalBest?.score, 1234);
    assert.equal(secondStats.personalBest?.score, 2345);

    const profileRoute = await import("../src/app/api/profile/confirm/route");
    const updateResponse = await profileRoute.POST(
      request("/api/profile/confirm", {
        method: "POST",
        sessionToken: firstConfirmation.rawSessionToken,
        body: { username: existingUsername },
      }),
    );
    assert.equal(updateResponse.status, 200);
    assert.equal(updateResponse.headers.get("set-cookie"), null);
    assert.deepEqual(await updateResponse.json(), {
      username: existingUsername,
      profileImageUrl: `https://unavatar.io/x/${existingUsername}?fallback=false`,
    });

    const updatedFirstUser = await identity.resolveSessionToken(
      firstConfirmation.rawSessionToken,
    );
    const unchangedExistingUser = await identity.resolveSessionToken(
      existingIdentity.rawSessionToken,
    );
    assert.equal(updatedFirstUser?.id, firstConfirmation.user.id);
    assert.equal(updatedFirstUser?.xUsername, existingUsername);
    assert.equal(unchangedExistingUser?.id, existingIdentity.user.id);
    assert.equal(unchangedExistingUser?.xUsername, existingUsername);
    assert.notEqual(updatedFirstUser?.id, unchangedExistingUser?.id);

    const statsAfterProfileChange = await readStats(
      await statsRoute.GET(
        request("/api/stats/me", {
          sessionToken: firstConfirmation.rawSessionToken,
        }),
      ),
    );
    assert.deepEqual(statsAfterProfileChange, firstStats);

    const currentSessionCount = await pool.query<{ count: number }>(
      `SELECT count(*)::integer AS count
       FROM sessions
       WHERE user_id = $1`,
      [firstConfirmation.user.id],
    );
    assert.equal(currentSessionCount.rows[0]?.count, 1);

    assert.equal(await identity.resolveSessionToken("not-a-session-token"), null);

    await pool.query(
      `UPDATE sessions
       SET
         created_at = clock_timestamp() - interval '31 days',
         expires_at = clock_timestamp() - interval '1 second'
       WHERE token_hash = $1`,
      [expectedFirstHash],
    );
    assert.equal(
      await identity.resolveSessionToken(firstConfirmation.rawSessionToken),
      null,
    );

    const expiredSessionResponse = await profileRoute.POST(
      request("/api/profile/confirm", {
        method: "POST",
        sessionToken: firstConfirmation.rawSessionToken,
        body: { username: existingUsername },
      }),
    );
    assert.equal(expiredSessionResponse.status, 200);
    const expiredReplacementToken = getIssuedSessionToken(expiredSessionResponse);
    const expiredReplacementUser = await identity.resolveSessionToken(
      expiredReplacementToken,
    );
    assert.ok(expiredReplacementUser);
    userIds.push(expiredReplacementUser.id);
    assert.notEqual(expiredReplacementUser.id, firstConfirmation.user.id);
    assert.notEqual(expiredReplacementUser.id, existingIdentity.user.id);

    const invalidSessionResponse = await profileRoute.POST(
      request("/api/profile/confirm", {
        method: "POST",
        sessionToken: "not-a-session-token",
        body: { username: existingUsername },
      }),
    );
    assert.equal(invalidSessionResponse.status, 200);
    const invalidReplacementToken = getIssuedSessionToken(invalidSessionResponse);
    const invalidReplacementUser = await identity.resolveSessionToken(
      invalidReplacementToken,
    );
    assert.ok(invalidReplacementUser);
    userIds.push(invalidReplacementUser.id);
    assert.notEqual(invalidReplacementUser.id, firstConfirmation.user.id);
    assert.notEqual(invalidReplacementUser.id, existingIdentity.user.id);

    await identity.revokeSessionToken(secondConfirmation.rawSessionToken);
    assert.equal(
      await identity.resolveSessionToken(secondConfirmation.rawSessionToken),
      null,
    );

    console.log("Verified username normalization and validation.");
    console.log("Verified deterministic browser-direct avatar URL derivation.");
    console.log("Verified same-username clients receive isolated Arena identities.");
    console.log("Verified session-owned attempt and personal-stat isolation.");
    console.log("Verified authenticated profile changes preserve identity and history.");
    console.log("Verified invalid and expired sessions create new Arena identities.");
    console.log("Verified opaque 30-day sessions, SHA-256 storage, expiry, and revocation.");
  } finally {
    await cleanupVerifierIdentity(pool, userIds, testUsernames);
    const protectedStateAfter = await getProtectedDatabaseState(pool);
    assert.deepEqual(protectedStateAfter, protectedStateBefore);

    const cleanupResult = await pool.query<{
      userCount: number;
      sessionCount: number;
    }>(
      `SELECT
         (SELECT count(*)::integer FROM users WHERE x_username = ANY($1::text[])) AS "userCount",
         (
           SELECT count(*)::integer
           FROM sessions
           WHERE user_id IN (
             SELECT id FROM users WHERE x_username = ANY($1::text[])
           )
         ) AS "sessionCount"`,
      [testUsernames],
    );
    assert.deepEqual(cleanupResult.rows[0], { userCount: 0, sessionCount: 0 });
    console.log("Verified cleanup and no quiz question/attempt modifications.");
  }
}

async function main() {
  verifyUsernameDomain();
  const pool = createToolingPool();

  try {
    const identity = await import("../src/server/identity/session");
    const engine = await import("../src/server/quiz/engine");
    await verifyIdentityIntegration(identity, engine, pool);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? `Identity verification failed: ${error.message}`
      : "Identity verification failed.",
  );
  process.exitCode = 1;
});
