import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import type { Pool } from "pg";

import { QUIZ_QUESTION_COUNT, type AnswerOption } from "../src/lib/quiz/domain";
import {
  calculateQuestionPoints,
  QUESTION_TIME_LIMIT_MS,
} from "../src/lib/quiz/scoring";
import type {
  ActivePlayerQuizState,
  PlayerQuizState,
  QuizEngineError,
} from "../src/server/quiz/types";
import { createToolingPool } from "./lib/database";

type Engine = typeof import("../src/server/quiz/engine");

type TemporaryUser = {
  id: string;
};

type InternalAttemptQuestion = {
  id: string;
  questionId: number;
  position: number;
  optionOrder: AnswerOption[];
  status: "pending" | "active" | "answered" | "timed_out";
  activatedAt: Date | null;
  deadlineAt: Date | null;
  isActive: boolean;
};

type ChoiceMapping = {
  optionOrder: AnswerOption[];
  correctOption: AnswerOption;
};

const FORBIDDEN_PLAYER_KEYS = new Set([
  "correctOption",
  "optionOrder",
  "category",
  "questionId",
  "questionVersion",
  "selectedOption",
  "futureQuestions",
]);

function verifyPureScoring() {
  assert.equal(calculateQuestionPoints("correct", 20_000), 200);
  assert.equal(calculateQuestionPoints("correct", 15_000), 175);
  assert.equal(calculateQuestionPoints("correct", 10_000), 150);
  assert.equal(calculateQuestionPoints("correct", 5_000), 125);
  assert.equal(calculateQuestionPoints("correct", 1_000), 105);
  assert.equal(calculateQuestionPoints("correct", 0), 0);
  assert.equal(calculateQuestionPoints("incorrect", 20_000), 0);
  assert.equal(calculateQuestionPoints("timed_out", 20_000), 0);
  assert.equal(calculateQuestionPoints("correct", Number.POSITIVE_INFINITY), 0);
  assert.ok(calculateQuestionPoints("correct", 50_000) <= 200);
}

function assertSafePlayerState(value: PlayerQuizState) {
  const visit = (candidate: unknown): void => {
    if (Array.isArray(candidate)) {
      candidate.forEach(visit);
      return;
    }

    if (!candidate || typeof candidate !== "object") {
      return;
    }

    for (const [key, nestedValue] of Object.entries(candidate)) {
      assert.ok(!FORBIDDEN_PLAYER_KEYS.has(key), `Player DTO exposed ${key}`);
      visit(nestedValue);
    }
  };

  visit(value);

  if (value.status === "active") {
    assert.equal(value.currentQuestion.position, value.position);
    assert.equal(value.currentQuestion.options.length, 4);
    assert.equal(
      Object.hasOwn(value, "questions"),
      false,
      "Player DTO exposed future questions",
    );
  } else {
    assert.equal(Object.hasOwn(value, "currentQuestion"), false);
  }
}

async function createTemporaryUser(
  pool: Pool,
  marker: string,
): Promise<TemporaryUser> {
  const xUsername = `qv_${marker}_${randomUUID().replaceAll("-", "").slice(0, 6)}`;
  const result = await pool.query<{ id: string }>(
    `INSERT INTO users (x_username, profile_image_url)
     VALUES ($1, $2)
     RETURNING id`,
    [xUsername, `https://unavatar.io/x/${xUsername}?fallback=false`],
  );
  const id = result.rows[0]?.id;

  assert.ok(id, "Temporary verifier user was not created");
  return { id };
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

async function getAttemptQuestions(pool: Pool, attemptId: string) {
  const result = await pool.query<InternalAttemptQuestion>(
    `SELECT
       attempt_questions.id,
       attempt_questions.question_id AS "questionId",
       attempt_questions.position,
       attempt_questions.option_order::text[] AS "optionOrder",
       attempt_questions.status,
       attempt_questions.activated_at AS "activatedAt",
       attempt_questions.deadline_at AS "deadlineAt",
       questions.is_active AS "isActive"
     FROM attempt_questions
     INNER JOIN questions ON questions.id = attempt_questions.question_id
     WHERE attempt_questions.attempt_id = $1
     ORDER BY attempt_questions.position`,
    [attemptId],
  );

  return result.rows;
}

async function getChoiceMapping(pool: Pool, attemptQuestionId: string) {
  const result = await pool.query<ChoiceMapping>(
    `SELECT
       attempt_questions.option_order::text[] AS "optionOrder",
       questions.correct_option AS "correctOption"
     FROM attempt_questions
     INNER JOIN questions ON questions.id = attempt_questions.question_id
     WHERE attempt_questions.id = $1`,
    [attemptQuestionId],
  );
  const mapping = result.rows[0];

  assert.ok(mapping, "Internal verifier choice mapping was not found");
  return mapping;
}

function getCorrectChoiceIndex(mapping: ChoiceMapping) {
  const index = mapping.optionOrder.indexOf(mapping.correctOption);
  assert.ok(index >= 0 && index <= 3, "Correct choice mapping is invalid");
  return index;
}

function getIncorrectChoiceIndex(mapping: ChoiceMapping) {
  const correctIndex = getCorrectChoiceIndex(mapping);
  const index = [0, 1, 2, 3].find((candidate) => candidate !== correctIndex);

  if (index === undefined) {
    assert.fail("Incorrect choice mapping is unavailable");
  }

  return index;
}

async function cleanupVerifierData(pool: Pool, userIds: string[]) {
  if (userIds.length === 0) {
    return;
  }

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

async function verifyCleanup(pool: Pool, userIds: string[]) {
  const result = await pool.query<{
    userCount: number;
    attemptCount: number;
    attemptQuestionCount: number;
  }>(
    `SELECT
       (SELECT count(*)::integer FROM users WHERE id = ANY($1::uuid[])) AS "userCount",
       (SELECT count(*)::integer FROM quiz_attempts WHERE user_id = ANY($1::uuid[])) AS "attemptCount",
       (
         SELECT count(*)::integer
         FROM attempt_questions
         WHERE attempt_id IN (
           SELECT id FROM quiz_attempts WHERE user_id = ANY($1::uuid[])
         )
       ) AS "attemptQuestionCount"`,
    [userIds],
  );

  assert.deepEqual(result.rows[0], {
    userCount: 0,
    attemptCount: 0,
    attemptQuestionCount: 0,
  });
}

async function runIntegrationVerification(engine: Engine, pool: Pool) {
  const temporaryUserIds: string[] = [];
  let finalCounts = { timeoutCount: 0, correctCount: 0, incorrectCount: 0 };

  try {
    const owner = await createTemporaryUser(pool, "owner");
    temporaryUserIds.push(owner.id);
    const otherUser = await createTemporaryUser(pool, "other");
    temporaryUserIds.push(otherUser.id);

    const initialState = await engine.startQuizAttempt(owner.id);
    assert.equal(initialState.status, "active");
    assertSafePlayerState(initialState);

    const initialQuestions = await getAttemptQuestions(
      pool,
      initialState.attemptId,
    );
    assert.equal(initialQuestions.length, QUIZ_QUESTION_COUNT);
    assert.deepEqual(
      initialQuestions.map((question) => question.position),
      Array.from({ length: QUIZ_QUESTION_COUNT }, (_, index) => index + 1),
    );
    assert.equal(
      new Set(initialQuestions.map((question) => question.questionId)).size,
      QUIZ_QUESTION_COUNT,
    );
    assert.ok(initialQuestions.every((question) => question.isActive));
    assert.ok(
      initialQuestions.every(
        (question) =>
          question.optionOrder.length === 4 &&
          new Set(question.optionOrder).size === 4 &&
          (["A", "B", "C", "D"] as const).every((option) =>
            question.optionOrder.includes(option),
          ),
      ),
    );
    assert.equal(
      initialQuestions.filter((question) => question.status === "active").length,
      1,
    );
    assert.equal(
      initialQuestions.filter((question) => question.status === "pending").length,
      QUIZ_QUESTION_COUNT - 1,
    );
    const firstQuestion = initialQuestions[0];
    assert.ok(firstQuestion?.activatedAt && firstQuestion.deadlineAt);
    assert.equal(
      firstQuestion.deadlineAt.getTime() - firstQuestion.activatedAt.getTime(),
      QUESTION_TIME_LIMIT_MS,
    );

    await expectEngineError(
      () => engine.getQuizState(otherUser.id, initialState.attemptId),
      "ATTEMPT_NOT_FOUND",
    );
    await expectEngineError(
      () =>
        engine.submitQuizAnswer({
          userId: otherUser.id,
          attemptId: initialState.attemptId,
          attemptQuestionId: initialState.currentQuestion.attemptQuestionId,
          choiceIndex: 0,
        }),
      "ATTEMPT_NOT_FOUND",
    );

    await pool.query(
      `WITH authoritative_now AS (SELECT clock_timestamp() AS value)
       UPDATE attempt_questions
       SET
         activated_at = authoritative_now.value - interval '61 seconds',
         deadline_at = authoritative_now.value - interval '41 seconds'
       FROM authoritative_now
       WHERE id = $1 AND status = 'active'`,
      [initialState.currentQuestion.attemptQuestionId],
    );

    const afterTimeouts = await engine.getQuizState(
      owner.id,
      initialState.attemptId,
    );
    assert.equal(afterTimeouts.status, "active");
    assert.equal(afterTimeouts.position, 4);
    assert.equal(afterTimeouts.timeoutCount, 3);
    assertSafePlayerState(afterTimeouts);

    const timeoutRows = await getAttemptQuestions(
      pool,
      initialState.attemptId,
    );
    assert.ok(
      timeoutRows
        .slice(0, 3)
        .every(
          (question) => question.status === "timed_out" && question.position <= 3,
        ),
    );
    assert.equal(timeoutRows[3]?.status, "active");

    await expectEngineError(
      () =>
        engine.submitQuizAnswer({
          userId: owner.id,
          attemptId: initialState.attemptId,
          attemptQuestionId: initialState.currentQuestion.attemptQuestionId,
          choiceIndex: 0,
        }),
      "STALE_QUESTION",
    );

    const replayQuestionId = afterTimeouts.currentQuestion.attemptQuestionId;
    const replayMapping = await getChoiceMapping(pool, replayQuestionId);
    const wrongChoiceIndex = getIncorrectChoiceIndex(replayMapping);
    const concurrentResults = await Promise.allSettled([
      engine.submitQuizAnswer({
        userId: owner.id,
        attemptId: initialState.attemptId,
        attemptQuestionId: replayQuestionId,
        choiceIndex: wrongChoiceIndex,
      }),
      engine.submitQuizAnswer({
        userId: owner.id,
        attemptId: initialState.attemptId,
        attemptQuestionId: replayQuestionId,
        choiceIndex: wrongChoiceIndex,
      }),
    ]);
    const fulfilled = concurrentResults.filter(
      (result) => result.status === "fulfilled",
    );
    const rejected = concurrentResults.filter(
      (result) => result.status === "rejected",
    );
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    const replayError = (rejected[0] as PromiseRejectedResult).reason as QuizEngineError;
    assert.equal(replayError.code, "STALE_QUESTION");

    const wrongAnswerResult = await pool.query<{
      status: string;
      isCorrect: boolean;
      points: number;
    }>(
      `SELECT status, is_correct AS "isCorrect", points
       FROM attempt_questions WHERE id = $1`,
      [replayQuestionId],
    );
    assert.deepEqual(wrongAnswerResult.rows[0], {
      status: "answered",
      isCorrect: false,
      points: 0,
    });

    const state = fulfilled[0] as PromiseFulfilledResult<PlayerQuizState>;
    assert.equal(state.value.status, "active");
    assertSafePlayerState(state.value);

    const firstCorrectState = state.value as ActivePlayerQuizState;
    const correctMapping = await getChoiceMapping(
      pool,
      firstCorrectState.currentQuestion.attemptQuestionId,
    );
    const correctResult = await engine.submitQuizAnswer({
      userId: owner.id,
      attemptId: initialState.attemptId,
      attemptQuestionId: firstCorrectState.currentQuestion.attemptQuestionId,
      choiceIndex: getCorrectChoiceIndex(correctMapping),
    });
    assertSafePlayerState(correctResult);

    const correctRowResult = await pool.query<{
      isCorrect: boolean;
      points: number;
    }>(
      `SELECT is_correct AS "isCorrect", points
       FROM attempt_questions WHERE id = $1`,
      [firstCorrectState.currentQuestion.attemptQuestionId],
    );
    assert.equal(correctRowResult.rows[0]?.isCorrect, true);
    assert.ok((correctRowResult.rows[0]?.points ?? 0) >= 100);
    assert.ok((correctRowResult.rows[0]?.points ?? 0) <= 200);

    let currentState = correctResult;

    while (currentState.status === "active") {
      const mapping = await getChoiceMapping(
        pool,
        currentState.currentQuestion.attemptQuestionId,
      );
      currentState = await engine.submitQuizAnswer({
        userId: owner.id,
        attemptId: initialState.attemptId,
        attemptQuestionId: currentState.currentQuestion.attemptQuestionId,
        choiceIndex: getCorrectChoiceIndex(mapping),
      });
      assertSafePlayerState(currentState);
    }

    assert.equal(currentState.status, "completed");
    assert.ok(currentState.completedAt);

    const aggregateResult = await pool.query<{
      status: string;
      totalScore: number;
      correctCount: number;
      timeoutCount: number;
      completedAt: Date | null;
      pointSum: number;
      correctRows: number;
      timeoutRows: number;
      terminalRows: number;
      activeRows: number;
      maximumPoints: number;
    }>(
      `SELECT
         quiz_attempts.status,
         quiz_attempts.total_score AS "totalScore",
         quiz_attempts.correct_count AS "correctCount",
         quiz_attempts.timeout_count AS "timeoutCount",
         quiz_attempts.completed_at AS "completedAt",
         coalesce(sum(attempt_questions.points), 0)::integer AS "pointSum",
         count(*) FILTER (WHERE attempt_questions.is_correct = true)::integer AS "correctRows",
         count(*) FILTER (WHERE attempt_questions.status = 'timed_out')::integer AS "timeoutRows",
         count(*) FILTER (
           WHERE attempt_questions.status IN ('answered', 'timed_out')
         )::integer AS "terminalRows",
         count(*) FILTER (WHERE attempt_questions.status = 'active')::integer AS "activeRows",
         max(attempt_questions.points)::integer AS "maximumPoints"
       FROM quiz_attempts
       INNER JOIN attempt_questions
         ON attempt_questions.attempt_id = quiz_attempts.id
       WHERE quiz_attempts.id = $1
       GROUP BY quiz_attempts.id`,
      [initialState.attemptId],
    );
    const aggregate = aggregateResult.rows[0];
    assert.ok(aggregate, "Completed attempt aggregate was not found");
    assert.equal(aggregate.status, "completed");
    assert.equal(aggregate.terminalRows, QUIZ_QUESTION_COUNT);
    assert.equal(aggregate.activeRows, 0);
    assert.equal(aggregate.totalScore, aggregate.pointSum);
    assert.equal(aggregate.correctCount, aggregate.correctRows);
    assert.equal(aggregate.timeoutCount, aggregate.timeoutRows);
    assert.ok(aggregate.completedAt);
    assert.ok(aggregate.maximumPoints <= 200);

    const finalState = await engine.getQuizState(owner.id, initialState.attemptId);
    assert.equal(finalState.status, "completed");
    assertSafePlayerState(finalState);
    assert.equal(finalState.totalScore, aggregate.totalScore);
    assert.equal(finalState.correctCount, aggregate.correctCount);
    assert.equal(finalState.timeoutCount, aggregate.timeoutCount);
    assert.equal(
      finalState.incorrectCount,
      QUIZ_QUESTION_COUNT - aggregate.correctCount - aggregate.timeoutCount,
    );

    finalCounts = {
      timeoutCount: finalState.timeoutCount,
      correctCount: finalState.correctCount,
      incorrectCount: finalState.incorrectCount,
    };

    console.log("Verified start transaction and safe single-question player DTO.");
    console.log("Verified continuous three-question timeout cascade.");
    console.log("Verified concurrent replay: one accepted, one rejected.");
    console.log("Verified ownership isolation for reads and submissions.");
    console.log(
      `Verified completion totals: ${finalCounts.correctCount} correct, ${finalCounts.incorrectCount} incorrect, ${finalCounts.timeoutCount} timed out.`,
    );
  } finally {
    await cleanupVerifierData(pool, temporaryUserIds);
    await verifyCleanup(pool, temporaryUserIds);
  }

  return finalCounts;
}

async function main() {
  verifyPureScoring();
  console.log("Verified authoritative scoring boundaries and 200-point cap.");

  const pool = createToolingPool();

  try {
    const engine = await import("../src/server/quiz/engine");
    await runIntegrationVerification(engine, pool);
    console.log("Verified cleanup of all temporary quiz-engine data.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? `Quiz engine verification failed: ${error.message}`
      : "Quiz engine verification failed.",
  );
  process.exitCode = 1;
});
