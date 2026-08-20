import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";

import type { Pool } from "pg";

import {
  buildXAvatarUrl,
  normalizeXUsername,
} from "../src/lib/identity/username";
import type * as IdentityModule from "../src/server/identity/session";
import { createToolingPool } from "./lib/database";

type Identity = typeof IdentityModule;

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

async function cleanupVerifierIdentity(pool: Pool, username: string) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM sessions
       WHERE user_id IN (SELECT id FROM users WHERE x_username = $1)`,
      [username],
    );
    await client.query("DELETE FROM users WHERE x_username = $1", [username]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function verifyIdentityIntegration(identity: Identity, pool: Pool) {
  const username = `iv_${randomUUID().replaceAll("-", "").slice(0, 10)}`;
  const mixedCaseInput = ` @${username.toUpperCase()} `;
  const expectedAvatarUrl = `https://unavatar.io/x/${username}?fallback=false`;
  const protectedStateBefore = await getProtectedDatabaseState(pool);

  try {
    const firstConfirmation = await identity.confirmProfile(mixedCaseInput);
    assert.equal(firstConfirmation.user.xUsername, username);
    assert.equal(firstConfirmation.profile.username, username);
    assert.equal(firstConfirmation.profile.profileImageUrl, expectedAvatarUrl);
    assert.equal(firstConfirmation.rawSessionToken.length, 43);

    const userResult = await pool.query<{
      id: string;
      xUsername: string;
      profileImageUrl: string;
      updatedAt: Date;
    }>(
      `SELECT
         id,
         x_username AS "xUsername",
         profile_image_url AS "profileImageUrl",
         updated_at AS "updatedAt"
       FROM users
       WHERE x_username = $1`,
      [username],
    );
    const storedUser = userResult.rows[0];

    assert.ok(storedUser, "Confirmed user was not stored");
    assert.equal(storedUser.id, firstConfirmation.user.id);
    assert.equal(storedUser.xUsername, username);
    assert.equal(storedUser.profileImageUrl, expectedAvatarUrl);

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
      [storedUser.id],
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

    const secondConfirmation = await identity.confirmProfile(username);
    assert.equal(secondConfirmation.user.id, storedUser.id);
    assert.notEqual(
      secondConfirmation.rawSessionToken,
      firstConfirmation.rawSessionToken,
    );

    const reuseResult = await pool.query<{
      userCount: number;
      sessionCount: number;
      updatedAt: Date;
    }>(
      `SELECT
         (SELECT count(*)::integer FROM users WHERE x_username = $1) AS "userCount",
         (SELECT count(*)::integer FROM sessions WHERE user_id = $2) AS "sessionCount",
         (SELECT updated_at FROM users WHERE id = $2) AS "updatedAt"`,
      [username, storedUser.id],
    );
    const reuse = reuseResult.rows[0];

    assert.ok(reuse, "Reused profile state could not be read");
    assert.equal(reuse.userCount, 1);
    assert.equal(reuse.sessionCount, 2);
    assert.ok(reuse.updatedAt.getTime() >= storedUser.updatedAt.getTime());

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

    await identity.revokeSessionToken(secondConfirmation.rawSessionToken);
    assert.equal(
      await identity.resolveSessionToken(secondConfirmation.rawSessionToken),
      null,
    );

    console.log("Verified username normalization and validation.");
    console.log("Verified deterministic browser-direct avatar URL derivation.");
    console.log("Verified profile creation, lowercase storage, and same-username reuse.");
    console.log("Verified opaque 30-day sessions, SHA-256 storage, expiry, and revocation.");
  } finally {
    await cleanupVerifierIdentity(pool, username);
    const protectedStateAfter = await getProtectedDatabaseState(pool);
    assert.deepEqual(protectedStateAfter, protectedStateBefore);

    const cleanupResult = await pool.query<{
      userCount: number;
      sessionCount: number;
    }>(
      `SELECT
         (SELECT count(*)::integer FROM users WHERE x_username = $1) AS "userCount",
         (
           SELECT count(*)::integer
           FROM sessions
           WHERE user_id IN (SELECT id FROM users WHERE x_username = $1)
         ) AS "sessionCount"`,
      [username],
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
    await verifyIdentityIntegration(identity, pool);
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
