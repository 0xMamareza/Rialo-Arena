import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";

import { NextRequest } from "next/server";
import type { Pool } from "pg";

import { QUIZ_QUESTION_COUNT } from "../src/lib/quiz/domain";
import type { QuizApiPlayerState } from "../src/lib/quiz/api-types";
import { createToolingPool } from "./lib/database";
import { cleanupVerifierRateLimits } from "./lib/rate-limit";

const FORBIDDEN_KEYS = new Set([
  "correctOption",
  "optionOrder",
  "category",
  "questionId",
  "questionVersion",
  "attemptQuestionId",
  "selectedOption",
  "futureQuestions",
  "rawSessionToken",
]);
const QUIZ_CACHE_CONTROL = "private, no-store, no-transform";

type Identity = Awaited<
  ReturnType<typeof import("../src/server/identity/session")["confirmProfile"]>
>;

type RouteResponse = {
  response: Response;
  body: unknown;
};

function request(
  pathname: string,
  options: {
    method?: "GET" | "POST";
    sessionToken?: string;
    body?: unknown;
    etag?: string;
    origin?: string | null;
  } = {},
) {
  const headers = new Headers();
  const method = options.method ?? "GET";

  if (method === "POST" && options.origin !== null) {
    headers.set("origin", options.origin ?? "http://localhost");
  }

  if (options.sessionToken) {
    headers.set("cookie", `rialo_session=${options.sessionToken}`);
  }
  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
  }
  if (options.etag) {
    headers.set("if-match", options.etag);
  }

  return new NextRequest(`http://localhost${pathname}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

async function readResponse(response: Response): Promise<RouteResponse> {
  return { response, body: await response.json() };
}

function assertQuizCachePolicy(response: Response) {
  assert.equal(response.headers.get("cache-control"), QUIZ_CACHE_CONTROL);
}

function assertSafeState(body: unknown, rawSessionTokens: string[]) {
  assert.ok(body && typeof body === "object" && !Array.isArray(body));
  const state = body as QuizApiPlayerState;
  const serialized = JSON.stringify(body);

  for (const rawToken of rawSessionTokens) {
    assert.equal(serialized.includes(rawToken), false, "API leaked a raw session token");
  }

  const visit = (candidate: unknown): void => {
    if (Array.isArray(candidate)) {
      candidate.forEach(visit);
      return;
    }
    if (!candidate || typeof candidate !== "object") {
      return;
    }

    for (const [key, value] of Object.entries(candidate)) {
      assert.equal(FORBIDDEN_KEYS.has(key), false, `API exposed ${key}`);
      visit(value);
    }
  };

  visit(body);
  assert.equal(state.questionCount, QUIZ_QUESTION_COUNT);

  if (state.status === "active") {
    assert.deepEqual(
      Object.keys(state).sort(),
      [
        "attemptId",
        "correctCount",
        "currentQuestion",
        "position",
        "questionCount",
        "serverNow",
        "status",
        "timeoutCount",
        "totalScore",
      ].sort(),
    );
    assert.deepEqual(
      Object.keys(state.currentQuestion).sort(),
      [
        "activatedAt",
        "deadlineAt",
        "options",
        "position",
        "questionText",
      ].sort(),
    );
    assert.equal(state.currentQuestion.options.length, 4);
    assert.deepEqual(
      state.currentQuestion.options.map((option) => option.index),
      [0, 1, 2, 3],
    );
    assert.deepEqual(
      state.currentQuestion.options.map((option) => option.label),
      ["A", "B", "C", "D"],
    );
    assert.equal(Object.hasOwn(state, "questions"), false);
    assert.equal(Object.hasOwn(state, "review"), false);
    assert.equal(serialized.includes("correctChoiceIndex"), false);
  } else if (state.status === "review") {
    assert.deepEqual(
      Object.keys(state).sort(),
      [
        "attemptId",
        "correctCount",
        "currentQuestion",
        "position",
        "questionCount",
        "review",
        "serverNow",
        "status",
        "timeoutCount",
        "totalScore",
      ].sort(),
    );
    assert.deepEqual(
      Object.keys(state.currentQuestion).sort(),
      ["options", "position", "questionText"].sort(),
    );
    assert.deepEqual(
      Object.keys(state.review).sort(),
      [
        "correctChoiceIndex",
        "reviewEndsAt",
        "selectedChoiceIndex",
        "wasCorrect",
      ].sort(),
    );
    const remainingReviewMs =
      new Date(state.review.reviewEndsAt).getTime() -
      new Date(state.serverNow).getTime();
    assert.ok(remainingReviewMs > 0 && remainingReviewMs <= 3_000);
  }

  return state;
}

async function expireCurrentReview(pool: Pool, attemptId: string) {
  const result = await pool.query<{ id: string }>(
    `UPDATE attempt_questions
     SET answered_at = clock_timestamp() - interval '3100 milliseconds'
     WHERE id = (
       SELECT id
       FROM attempt_questions
       WHERE attempt_id = $1 AND status = 'answered'
       ORDER BY position DESC
       LIMIT 1
     )
     RETURNING id`,
    [attemptId],
  );

  assert.ok(result.rows[0]?.id, "Review row was not available to expire");
}

async function cleanup(pool: Pool, identities: Identity[]) {
  const userIds = identities.map((identity) => identity.user.id);

  if (userIds.length === 0) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM attempt_questions
       WHERE attempt_id IN (SELECT id FROM quiz_attempts WHERE user_id = ANY($1::uuid[]))`,
      [userIds],
    );
    await client.query("DELETE FROM quiz_attempts WHERE user_id = ANY($1::uuid[])", [userIds]);
    await client.query("DELETE FROM sessions WHERE user_id = ANY($1::uuid[])", [userIds]);
    await client.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [userIds]);
    await cleanupVerifierRateLimits(client, { userIds });
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

  if (userIds.length === 0) return;

  const result = await pool.query<{
    users: number;
    sessions: number;
    attempts: number;
    questions: number;
  }>(
    `SELECT
       (SELECT count(*)::integer FROM users WHERE id = ANY($1::uuid[])) AS users,
       (SELECT count(*)::integer FROM sessions WHERE user_id = ANY($1::uuid[])) AS sessions,
       (SELECT count(*)::integer FROM quiz_attempts WHERE user_id = ANY($1::uuid[])) AS attempts,
       (
         SELECT count(*)::integer FROM attempt_questions
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
    const identity = await import("../src/server/identity/session");
    const startRoute = await import("../src/app/api/quiz/start/route");
    const attemptRoute = await import(
      "../src/app/api/quiz/attempt/[attemptId]/route"
    );
    const answerRoute = await import("../src/app/api/quiz/answer/[attemptId]/route");

    const owner = await identity.confirmProfile(`qa_${randomUUID().slice(0, 8)}`);
    const nonOwner = await identity.confirmProfile(`qb_${randomUUID().slice(0, 8)}`);
    identities.push(owner, nonOwner);
    const rawTokens = identities.map((entry) => entry.rawSessionToken);

    const unauthorizedStart = await readResponse(
      await startRoute.POST(request("/api/quiz/start", { method: "POST" })),
    );
    assert.equal(unauthorizedStart.response.status, 401);
    assertQuizCachePolicy(unauthorizedStart.response);
    const unauthorizedRecovery = await startRoute.GET(
      request("/api/quiz/start"),
    );
    assert.equal(unauthorizedRecovery.status, 401);

    const rejectedForeignStart = await readResponse(
      await startRoute.POST(
        request("/api/quiz/start", {
          method: "POST",
          origin: "https://foreign.example",
          sessionToken: owner.rawSessionToken,
        }),
      ),
    );
    assert.equal(rejectedForeignStart.response.status, 403);
    assert.equal(
      (rejectedForeignStart.body as { error?: { code?: string } }).error?.code,
      "ORIGIN_FORBIDDEN",
    );
    const attemptsAfterRejectedStart = await pool.query<{ count: number }>(
      `SELECT count(*)::integer AS count
       FROM quiz_attempts
       WHERE user_id = $1`,
      [owner.user.id],
    );
    assert.equal(attemptsAfterRejectedStart.rows[0]?.count, 0);

    const emptyRecovery = await startRoute.GET(
      request("/api/quiz/start", {
        sessionToken: owner.rawSessionToken,
      }),
    );
    assert.equal(emptyRecovery.status, 204);
    assertQuizCachePolicy(emptyRecovery);

    const start = await readResponse(
      await startRoute.POST(
        request("/api/quiz/start", {
          method: "POST",
          sessionToken: owner.rawSessionToken,
        }),
      ),
    );
    assert.equal(start.response.status, 200);
    assertQuizCachePolicy(start.response);
    const initialState = assertSafeState(start.body, rawTokens);
    assert.equal(initialState.status, "active");
    const initialEtag = start.response.headers.get("etag");
    assert.ok(initialEtag, "Start response did not include an ETag");
    const activeQuestionResult = await pool.query<{ id: string }>(
      `SELECT id
       FROM attempt_questions
       WHERE attempt_id = $1 AND status = 'active'`,
      [initialState.attemptId],
    );
    const initialAttemptQuestionId = activeQuestionResult.rows[0]?.id;
    assert.ok(initialAttemptQuestionId);
    assert.equal(
      initialEtag,
      `"${createHash("sha256")
        .update(initialAttemptQuestionId)
        .digest("base64url")}"`,
    );

    const repeatedStart = await readResponse(
      await startRoute.POST(
        request("/api/quiz/start", {
          method: "POST",
          sessionToken: owner.rawSessionToken,
        }),
      ),
    );
    assert.equal(repeatedStart.response.status, 200);
    assert.equal(
      assertSafeState(repeatedStart.body, rawTokens).attemptId,
      initialState.attemptId,
    );
    assert.equal(repeatedStart.response.headers.get("etag"), initialEtag);

    const concurrentStarts = await Promise.all([
      startRoute.POST(
        request("/api/quiz/start", {
          method: "POST",
          sessionToken: owner.rawSessionToken,
        }),
      ),
      startRoute.POST(
        request("/api/quiz/start", {
          method: "POST",
          sessionToken: owner.rawSessionToken,
        }),
      ),
    ]);
    const concurrentStartStates = await Promise.all(
      concurrentStarts.map(async (response) => ({
        response,
        state: assertSafeState(await response.json(), rawTokens),
      })),
    );
    assert.ok(concurrentStartStates.every(({ response }) => response.status === 200));
    assert.ok(
      concurrentStartStates.every(
        ({ response, state }) =>
          state.attemptId === initialState.attemptId &&
          response.headers.get("etag") === initialEtag,
      ),
    );

    const recoveredStart = await readResponse(
      await startRoute.GET(
        request("/api/quiz/start", {
          sessionToken: owner.rawSessionToken,
        }),
      ),
    );
    assert.equal(recoveredStart.response.status, 200);
    assert.equal(
      assertSafeState(recoveredStart.body, rawTokens).attemptId,
      initialState.attemptId,
    );
    assert.equal(recoveredStart.response.headers.get("etag"), initialEtag);

    const nonOwnerRecovery = await startRoute.GET(
      request("/api/quiz/start", {
        sessionToken: nonOwner.rawSessionToken,
      }),
    );
    assert.equal(nonOwnerRecovery.status, 204);

    const activeAttemptCount = await pool.query<{ count: number }>(
      `SELECT count(*)::integer AS count
       FROM quiz_attempts
       WHERE user_id = $1 AND status = 'active'`,
      [owner.user.id],
    );
    assert.equal(activeAttemptCount.rows[0]?.count, 1);

    const attemptId = initialState.attemptId;
    const context = { params: Promise.resolve({ attemptId }) };
    const ownerFetch = await readResponse(
      await attemptRoute.GET(
        request(`/api/quiz/attempt/${attemptId}`, {
          sessionToken: owner.rawSessionToken,
        }),
        context,
      ),
    );
    assert.equal(ownerFetch.response.status, 200);
    assertSafeState(ownerFetch.body, rawTokens);
    assertQuizCachePolicy(ownerFetch.response);

    const rejectedForeignAnswer = await readResponse(
      await answerRoute.POST(
        request(`/api/quiz/answer/${attemptId}`, {
          method: "POST",
          origin: "https://foreign.example",
          sessionToken: owner.rawSessionToken,
          etag: initialEtag,
          body: { choiceIndex: 0 },
        }),
        context,
      ),
    );
    assert.equal(rejectedForeignAnswer.response.status, 403);
    assert.equal(
      (rejectedForeignAnswer.body as { error?: { code?: string } }).error?.code,
      "ORIGIN_FORBIDDEN",
    );
    const stateAfterRejectedAnswer = await readResponse(
      await attemptRoute.GET(
        request(`/api/quiz/attempt/${attemptId}`, {
          sessionToken: owner.rawSessionToken,
        }),
        context,
      ),
    );
    assert.equal(stateAfterRejectedAnswer.response.headers.get("etag"), initialEtag);
    const rejectedAnswerState = assertSafeState(
      stateAfterRejectedAnswer.body,
      rawTokens,
    );
    assert.equal(rejectedAnswerState.status, "active");
    if (rejectedAnswerState.status !== "active") {
      assert.fail("Rejected answer changed the attempt out of active state");
    }
    assert.equal(
      rejectedAnswerState.position,
      initialState.position,
    );

    const missingId = randomUUID();
    const nonOwnerFetch = await readResponse(
      await attemptRoute.GET(
        request(`/api/quiz/attempt/${attemptId}`, {
          sessionToken: nonOwner.rawSessionToken,
        }),
        context,
      ),
    );
    const missingFetch = await readResponse(
      await attemptRoute.GET(
        request(`/api/quiz/attempt/${missingId}`, {
          sessionToken: nonOwner.rawSessionToken,
        }),
        { params: Promise.resolve({ attemptId: missingId }) },
      ),
    );
    assert.equal(nonOwnerFetch.response.status, 404);
    assert.equal(missingFetch.response.status, 404);
    assert.deepEqual(nonOwnerFetch.body, missingFetch.body);

    const invalidChoice = await readResponse(
      await answerRoute.POST(
        request(`/api/quiz/answer/${attemptId}`, {
          method: "POST",
          sessionToken: owner.rawSessionToken,
          etag: initialEtag,
          body: { choiceIndex: 4 },
        }),
        context,
      ),
    );
    assert.equal(invalidChoice.response.status, 400);

    const missingPrecondition = await readResponse(
      await answerRoute.POST(
        request(`/api/quiz/answer/${attemptId}`, {
          method: "POST",
          sessionToken: owner.rawSessionToken,
          body: { choiceIndex: 0 },
        }),
        context,
      ),
    );
    assert.equal(missingPrecondition.response.status, 428);
    assertQuizCachePolicy(missingPrecondition.response);

    const answer = await readResponse(
      await answerRoute.POST(
        request(`/api/quiz/answer/${attemptId}`, {
          method: "POST",
          sessionToken: owner.rawSessionToken,
          etag: initialEtag,
          body: { choiceIndex: 0 },
        }),
        context,
      ),
    );
    assert.equal(answer.response.status, 200);
    assertQuizCachePolicy(answer.response);
    const reviewState = assertSafeState(answer.body, rawTokens);
    assert.equal(reviewState.status, "review");
    if (reviewState.status !== "review") {
      assert.fail("Accepted answer did not return review state");
    }
    assert.equal(
      new Date(reviewState.review.reviewEndsAt).getTime() -
        new Date(reviewState.serverNow).getTime(),
      3_000,
    );
    const reviewEtag = answer.response.headers.get("etag");
    assert.ok(reviewEtag);
    assert.equal(
      reviewEtag,
      `"${createHash("sha256")
        .update(`${initialAttemptQuestionId}:${reviewState.review.reviewEndsAt}`)
        .digest("base64url")}"`,
    );
    assert.notEqual(reviewEtag, initialEtag);

    const restoredReview = await readResponse(
      await attemptRoute.GET(
        request(`/api/quiz/attempt/${attemptId}`, {
          sessionToken: owner.rawSessionToken,
        }),
        context,
      ),
    );
    assert.equal(restoredReview.response.status, 200);
    const restoredReviewState = assertSafeState(restoredReview.body, rawTokens);
    assert.equal(restoredReviewState.status, "review");
    assert.equal(restoredReview.response.headers.get("etag"), reviewEtag);

    const staleReplay = await readResponse(
      await answerRoute.POST(
        request(`/api/quiz/answer/${attemptId}`, {
          method: "POST",
          sessionToken: owner.rawSessionToken,
          etag: initialEtag,
          body: { choiceIndex: 0 },
        }),
        context,
      ),
    );
    assert.equal(staleReplay.response.status, 409);
    assertQuizCachePolicy(staleReplay.response);

    await expireCurrentReview(pool, attemptId);

    const currentFetch = await readResponse(
      await attemptRoute.GET(
        request(`/api/quiz/attempt/${attemptId}`, {
          sessionToken: owner.rawSessionToken,
        }),
        context,
      ),
    );
    const activeAfterReview = assertSafeState(currentFetch.body, rawTokens);
    assert.equal(activeAfterReview.status, "active");
    if (activeAfterReview.status !== "active") {
      assert.fail("Expired review did not activate the next question");
    }
    assert.equal(
      new Date(activeAfterReview.currentQuestion.deadlineAt).getTime() -
        new Date(activeAfterReview.currentQuestion.activatedAt).getTime(),
      20_000,
    );
    const concurrentEtag = currentFetch.response.headers.get("etag");
    assert.ok(concurrentEtag);

    const concurrent = await Promise.all([
      answerRoute.POST(
        request(`/api/quiz/answer/${attemptId}`, {
          method: "POST",
          sessionToken: owner.rawSessionToken,
          etag: concurrentEtag,
          body: { choiceIndex: 1 },
        }),
        context,
      ),
      answerRoute.POST(
        request(`/api/quiz/answer/${attemptId}`, {
          method: "POST",
          sessionToken: owner.rawSessionToken,
          etag: concurrentEtag,
          body: { choiceIndex: 1 },
        }),
        context,
      ),
    ]);
    assert.deepEqual(concurrent.map((response) => response.status).sort(), [200, 409]);
    const accepted = concurrent.find((response) => response.status === 200);
    assert.ok(accepted);
    const acceptedState = assertSafeState(await accepted.json(), rawTokens);
    assert.equal(acceptedState.status, "review");

    await expireCurrentReview(pool, attemptId);
    const afterConcurrentReview = await readResponse(
      await attemptRoute.GET(
        request(`/api/quiz/attempt/${attemptId}`, {
          sessionToken: owner.rawSessionToken,
        }),
        context,
      ),
    );
    assert.equal(afterConcurrentReview.response.status, 200);
    assert.equal(
      assertSafeState(afterConcurrentReview.body, rawTokens).status,
      "active",
    );

    await pool.query(
      `WITH authoritative_now AS (SELECT clock_timestamp() AS value)
       UPDATE attempt_questions
       SET activated_at = authoritative_now.value - interval '61 seconds',
           deadline_at = authoritative_now.value - interval '41 seconds'
       FROM authoritative_now
       WHERE id = $1 AND status = 'active'`,
      [
        (
          await pool.query<{ id: string }>(
            `SELECT id FROM attempt_questions
             WHERE attempt_id = $1 AND status = 'active'`,
            [attemptId],
          )
        ).rows[0]?.id,
      ],
    );

    const settled = await readResponse(
      await attemptRoute.GET(
        request(`/api/quiz/attempt/${attemptId}`, {
          sessionToken: owner.rawSessionToken,
        }),
        context,
      ),
    );
    assert.equal(settled.response.status, 200);
    const settledState = assertSafeState(settled.body, rawTokens);
    assert.equal(settledState.status, "active");
    assert.equal(settledState.timeoutCount, 3);

    const timeoutRows = await pool.query<{ count: number; nonzero: number }>(
      `SELECT
         count(*)::integer AS count,
         count(*) FILTER (WHERE points <> 0)::integer AS nonzero
       FROM attempt_questions
       WHERE attempt_id = $1 AND status = 'timed_out'`,
      [attemptId],
    );
    assert.deepEqual(timeoutRows.rows[0], { count: 3, nonzero: 0 });

    console.log("Verified unauthenticated rejection and session-bound access.");
    console.log("Verified idempotent and concurrent start convergence.");
    console.log("Verified read-only active-attempt discovery and isolation.");
    console.log("Verified 15-question safe state contract and hidden-field exclusions.");
    console.log("Verified owner access and indistinguishable non-owner lookup.");
    console.log("Verified strict choice validation and ETag preconditions.");
    console.log("Verified stale and concurrent answer safety.");
    console.log("Verified timeout settlement persistence through the GET route.");
    console.log("Verified API responses expose no question identifiers.");
  } finally {
    await cleanup(pool, identities);
    await verifyCleanup(pool, identities);
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
