import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { NextRequest } from "next/server";
import type { Pool } from "pg";

import type { QuizApiPlayerState } from "../src/lib/quiz/api-types";
import type { QuizEngineError } from "../src/server/quiz/types";
import { createToolingPool } from "./lib/database";

type Identity = Awaited<
  ReturnType<typeof import("../src/server/identity/session")["confirmProfile"]>
>;

function request(sessionToken?: string, method: "GET" | "POST" = "GET") {
  const headers = new Headers();

  if (sessionToken) {
    headers.set("cookie", `rialo_session=${sessionToken}`);
  }

  return new NextRequest("http://localhost/api/quiz/start", {
    method,
    headers,
  });
}

async function readState(response: Response) {
  assert.equal(response.status, 200);
  const state = await response.json() as QuizApiPlayerState;
  const etag = response.headers.get("etag");

  assert.ok(etag, "Quiz state response did not include an ETag");
  return { state, etag };
}

async function expectAttemptNotFound(operation: () => Promise<unknown>) {
  try {
    await operation();
    assert.fail("Expected cross-user attempt access to fail");
  } catch (error) {
    const quizError = error as QuizEngineError;
    assert.equal(quizError.name, "QuizEngineError");
    assert.equal(quizError.code, "ATTEMPT_NOT_FOUND");
  }
}

async function countActiveAttempts(pool: Pool, userId: string) {
  const result = await pool.query<{ count: number }>(
    `SELECT count(*)::integer AS count
     FROM quiz_attempts
     WHERE user_id = $1 AND status = 'active'`,
    [userId],
  );

  return result.rows[0]?.count ?? 0;
}

async function cleanup(pool: Pool, identities: Identity[]) {
  const userIds = identities.map((identity) => identity.user.id);
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
    await client.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [
      userIds,
    ]);
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
    attemptQuestions: number;
  }>(
    `SELECT
       (SELECT count(*)::integer FROM users WHERE id = ANY($1::uuid[])) AS users,
       (SELECT count(*)::integer FROM sessions WHERE user_id = ANY($1::uuid[])) AS sessions,
       (SELECT count(*)::integer FROM quiz_attempts WHERE user_id = ANY($1::uuid[])) AS attempts,
       (
         SELECT count(*)::integer
         FROM attempt_questions
         WHERE attempt_id IN (
           SELECT id FROM quiz_attempts WHERE user_id = ANY($1::uuid[])
         )
       ) AS "attemptQuestions"`,
    [userIds],
  );

  assert.deepEqual(result.rows[0], {
    users: 0,
    sessions: 0,
    attempts: 0,
    attemptQuestions: 0,
  });
}

async function main() {
  const pool = createToolingPool();
  const identities: Identity[] = [];

  try {
    const identity = await import("../src/server/identity/session");
    const engine = await import("../src/server/quiz/engine");
    const startRoute = await import("../src/app/api/quiz/start/route");
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const owner = await identity.confirmProfile(`qsa_${suffix}`);
    const otherUser = await identity.confirmProfile(`qsb_${suffix}`);
    identities.push(owner, otherUser);

    const noLiveAttempt = await startRoute.GET(
      request(owner.rawSessionToken),
    );
    assert.equal(noLiveAttempt.status, 204);

    const first = await readState(
      await startRoute.POST(request(owner.rawSessionToken, "POST")),
    );
    assert.equal(first.state.status, "active");
    assert.equal(await countActiveAttempts(pool, owner.user.id), 1);

    const repeated = await readState(
      await startRoute.POST(request(owner.rawSessionToken, "POST")),
    );
    assert.equal(repeated.state.attemptId, first.state.attemptId);
    assert.equal(repeated.etag, first.etag);

    const concurrentResponses = await Promise.all([
      startRoute.POST(request(owner.rawSessionToken, "POST")),
      startRoute.POST(request(owner.rawSessionToken, "POST")),
    ]);
    const concurrentStates = await Promise.all(
      concurrentResponses.map(readState),
    );
    assert.ok(
      concurrentStates.every(
        ({ state, etag }) =>
          state.attemptId === first.state.attemptId && etag === first.etag,
      ),
    );
    assert.equal(await countActiveAttempts(pool, owner.user.id), 1);

    const lostResponse = await startRoute.POST(
      request(owner.rawSessionToken, "POST"),
    );
    assert.equal(lostResponse.status, 200);
    const recoveredRetry = await readState(
      await startRoute.POST(request(owner.rawSessionToken, "POST")),
    );
    assert.equal(recoveredRetry.state.attemptId, first.state.attemptId);

    const discovered = await readState(
      await startRoute.GET(request(owner.rawSessionToken)),
    );
    assert.equal(discovered.state.attemptId, first.state.attemptId);
    assert.equal(discovered.etag, first.etag);
    assert.equal(
      (await startRoute.GET(request(otherUser.rawSessionToken))).status,
      204,
    );

    await expectAttemptNotFound(() =>
      engine.getQuizState(otherUser.user.id, first.state.attemptId),
    );

    let duplicateRejected = false;

    try {
      await pool.query(
        `INSERT INTO quiz_attempts (user_id, status, started_at)
         VALUES ($1, 'active', clock_timestamp())`,
        [owner.user.id],
      );
    } catch (error) {
      duplicateRejected = (error as { code?: string }).code === "23505";
    }

    assert.equal(duplicateRejected, true);
    assert.equal(await countActiveAttempts(pool, owner.user.id), 1);

    await pool.query(
      `WITH authoritative_now AS (SELECT clock_timestamp() AS value)
       UPDATE attempt_questions
       SET
         activated_at = authoritative_now.value - interval '321 seconds',
         deadline_at = authoritative_now.value - interval '301 seconds'
       FROM authoritative_now
       WHERE attempt_id = $1 AND status = 'active'`,
      [first.state.attemptId],
    );
    const completed = await engine.getQuizState(
      owner.user.id,
      first.state.attemptId,
    );
    assert.equal(completed.status, "completed");
    assert.equal(
      (await startRoute.GET(request(owner.rawSessionToken))).status,
      204,
    );

    const fresh = await readState(
      await startRoute.POST(request(owner.rawSessionToken, "POST")),
    );
    assert.equal(fresh.state.status, "active");
    assert.notEqual(fresh.state.attemptId, first.state.attemptId);
    const repeatedFresh = await readState(
      await startRoute.POST(request(owner.rawSessionToken, "POST")),
    );
    assert.equal(repeatedFresh.state.attemptId, fresh.state.attemptId);
    assert.equal(await countActiveAttempts(pool, owner.user.id), 1);

    console.log("Verified first, repeated, lost-response, and concurrent starts.");
    console.log("Verified authenticated live-attempt discovery and isolation.");
    console.log("Verified database rejection of duplicate active attempts.");
    console.log("Verified completed attempts release a fresh start.");
  } finally {
    await cleanup(pool, identities);
    await verifyCleanup(pool, identities);
    await pool.end();
  }

  console.log("Verified cleanup of all temporary start-concurrency data.");
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? `Quiz start verification failed: ${error.message}`
      : "Quiz start verification failed.",
  );
  process.exitCode = 1;
});
