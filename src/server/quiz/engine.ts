import "server-only";

import { randomInt } from "node:crypto";

import { and, eq, sql, type ExtractTablesWithRelations } from "drizzle-orm";
import type { NodePgTransaction } from "drizzle-orm/node-postgres";

import { db } from "@/db";
import * as databaseSchema from "@/db/schema";
import { attemptQuestions, quizAttempts } from "@/db/schema";
import {
  ANSWER_OPTIONS,
  QUIZ_QUESTION_COUNT,
  type AnswerOption,
  type QuizAttemptStatus,
} from "@/lib/quiz/domain";
import {
  calculateQuestionPoints,
  QUESTION_TIME_LIMIT_MS,
} from "@/lib/quiz/scoring";

import {
  QuizEngineError,
  type ActivePlayerQuizState,
  type CompletedPlayerQuizState,
  type DisplayChoiceIndex,
  type DisplayChoiceLabel,
  type PlayerQuizState,
  type SubmitQuizAnswerInput,
} from "./types";

type QuizTransaction = NodePgTransaction<
  typeof databaseSchema,
  ExtractTablesWithRelations<typeof databaseSchema>
>;

type AttemptRecord = {
  id: string;
  userId: string;
  status: QuizAttemptStatus;
  totalScore: number;
  correctCount: number;
  timeoutCount: number;
  startedAt: Date | string | null;
  completedAt: Date | string | null;
};

type SelectedQuestionRecord = {
  id: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  version: number;
};

type PlayerQuestionRecord = {
  attemptQuestionId: string;
  position: number;
  optionOrder: AnswerOption[];
  activatedAt: Date | string | null;
  deadlineAt: Date | string | null;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
};

type AnswerQuestionRecord = PlayerQuestionRecord & {
  correctOption: AnswerOption;
};

type PendingQuestionRecord = {
  attemptQuestionId: string;
  position: number;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DISPLAY_LABELS: readonly DisplayChoiceLabel[] = ["A", "B", "C", "D"];

function invalidState(message: string): never {
  throw new QuizEngineError("INVALID_STATE", message);
}

function validateUuid(value: string, fieldName: string) {
  if (!UUID_PATTERN.test(value)) {
    throw new QuizEngineError(
      "INVALID_IDENTIFIER",
      `${fieldName} must be a valid UUID.`,
    );
  }
}

function validateChoiceIndex(choiceIndex: number): asserts choiceIndex is DisplayChoiceIndex {
  if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex > 3) {
    throw new QuizEngineError(
      "INVALID_CHOICE",
      "choiceIndex must be an integer from 0 through 3.",
    );
  }
}

function shuffleAnswerOptions() {
  const shuffled = [...ANSWER_OPTIONS];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function assertOptionPermutation(
  optionOrder: AnswerOption[],
): asserts optionOrder is [AnswerOption, AnswerOption, AnswerOption, AnswerOption] {
  if (
    optionOrder.length !== ANSWER_OPTIONS.length ||
    new Set(optionOrder).size !== ANSWER_OPTIONS.length ||
    !ANSWER_OPTIONS.every((option) => optionOrder.includes(option))
  ) {
    invalidState("Persisted option order is not a valid answer permutation.");
  }
}

function addQuestionWindow(activatedAt: Date) {
  return new Date(activatedAt.getTime() + QUESTION_TIME_LIMIT_MS);
}

function parseDatabaseTimestamp(
  value: Date | string | null,
  fieldName: string,
) {
  if (value === null) {
    invalidState(`${fieldName} is missing.`);
  }

  const timestamp = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    invalidState(`${fieldName} is not a valid timestamp.`);
  }

  return timestamp;
}

async function getDatabaseTime(transaction: QuizTransaction) {
  const result = await transaction.execute<{ serverNow: string }>(
    sql`SELECT clock_timestamp()::text AS "serverNow"`,
  );
  const serverNow = result.rows[0]?.serverNow;

  if (!serverNow) {
    invalidState("Database clock did not return a timestamp.");
  }

  return parseDatabaseTimestamp(serverNow, "Database clock");
}

async function lockUserForLiveAttempt(
  transaction: QuizTransaction,
  userId: string,
) {
  const result = await transaction.execute<{ id: string }>(sql`
    SELECT id
    FROM users
    WHERE id = ${userId}
    FOR UPDATE
  `);

  if (!result.rows[0]) {
    throw new QuizEngineError("USER_NOT_FOUND", "User was not found.");
  }
}

async function lockLiveAttempt(
  transaction: QuizTransaction,
  userId: string,
) {
  const result = await transaction.execute<AttemptRecord>(sql`
    SELECT
      id,
      user_id AS "userId",
      status,
      total_score AS "totalScore",
      correct_count AS "correctCount",
      timeout_count AS "timeoutCount",
      started_at::text AS "startedAt",
      completed_at::text AS "completedAt"
    FROM quiz_attempts
    WHERE user_id = ${userId} AND status = 'active'
    ORDER BY created_at DESC, id ASC
    LIMIT 2
    FOR UPDATE
  `);

  if (result.rows.length > 1) {
    invalidState("User has more than one active quiz attempt.");
  }

  return result.rows[0] ?? null;
}

async function lockOwnedAttempt(
  transaction: QuizTransaction,
  userId: string,
  attemptId: string,
) {
  const result = await transaction.execute<AttemptRecord>(
    sql`
      SELECT
        id,
        user_id AS "userId",
        status,
        total_score AS "totalScore",
        correct_count AS "correctCount",
        timeout_count AS "timeoutCount",
        started_at::text AS "startedAt",
        completed_at::text AS "completedAt"
      FROM quiz_attempts
      WHERE id = ${attemptId} AND user_id = ${userId}
      FOR UPDATE
    `,
  );
  const attempt = result.rows[0];

  if (!attempt) {
    throw new QuizEngineError(
      "ATTEMPT_NOT_FOUND",
      "Quiz attempt was not found for this user.",
    );
  }

  return attempt;
}

async function getPlayerQuestion(
  transaction: QuizTransaction,
  attemptId: string,
) {
  const result = await transaction.execute<PlayerQuestionRecord>(
    sql`
      SELECT
        attempt_questions.id AS "attemptQuestionId",
        attempt_questions.position,
        attempt_questions.option_order::text[] AS "optionOrder",
        attempt_questions.activated_at::text AS "activatedAt",
        attempt_questions.deadline_at::text AS "deadlineAt",
        questions.question_text AS "questionText",
        questions.option_a AS "optionA",
        questions.option_b AS "optionB",
        questions.option_c AS "optionC",
        questions.option_d AS "optionD"
      FROM attempt_questions
      INNER JOIN questions ON questions.id = attempt_questions.question_id
      WHERE attempt_questions.attempt_id = ${attemptId}
        AND attempt_questions.status = 'active'
      ORDER BY attempt_questions.position
      LIMIT 2
    `,
  );

  if (result.rows.length !== 1) {
    invalidState("Active attempt must have exactly one active question.");
  }

  return result.rows[0];
}

async function getAnswerQuestion(
  transaction: QuizTransaction,
  attemptId: string,
) {
  const result = await transaction.execute<AnswerQuestionRecord>(
    sql`
      SELECT
        attempt_questions.id AS "attemptQuestionId",
        attempt_questions.position,
        attempt_questions.option_order::text[] AS "optionOrder",
        attempt_questions.activated_at::text AS "activatedAt",
        attempt_questions.deadline_at::text AS "deadlineAt",
        questions.question_text AS "questionText",
        questions.option_a AS "optionA",
        questions.option_b AS "optionB",
        questions.option_c AS "optionC",
        questions.option_d AS "optionD",
        questions.correct_option AS "correctOption"
      FROM attempt_questions
      INNER JOIN questions ON questions.id = attempt_questions.question_id
      WHERE attempt_questions.attempt_id = ${attemptId}
        AND attempt_questions.status = 'active'
      ORDER BY attempt_questions.position
      LIMIT 2
      FOR UPDATE OF attempt_questions
    `,
  );

  if (result.rows.length > 1) {
    invalidState("Active attempt has more than one active question.");
  }

  return result.rows[0] ?? null;
}

async function getNextPendingQuestion(
  transaction: QuizTransaction,
  attemptId: string,
) {
  const result = await transaction.execute<PendingQuestionRecord>(
    sql`
      SELECT id AS "attemptQuestionId", position
      FROM attempt_questions
      WHERE attempt_id = ${attemptId} AND status = 'pending'
      ORDER BY position
      LIMIT 1
      FOR UPDATE
    `,
  );

  return result.rows[0] ?? null;
}

async function finalizeAttempt(
  transaction: QuizTransaction,
  attemptId: string,
  completedAt: Date,
) {
  const aggregateResult = await transaction.execute<{
      totalScore: number;
      correctCount: number;
      timeoutCount: number;
      terminalCount: number;
    }>(
    sql`
      SELECT
        coalesce(sum(points), 0)::integer AS "totalScore",
        count(*) FILTER (WHERE is_correct = true)::integer AS "correctCount",
        count(*) FILTER (WHERE status = 'timed_out')::integer AS "timeoutCount",
        count(*) FILTER (WHERE status IN ('answered', 'timed_out'))::integer AS "terminalCount"
      FROM attempt_questions
      WHERE attempt_id = ${attemptId}
    `,
  );
  const aggregates = aggregateResult.rows[0];

  if (!aggregates || aggregates.terminalCount !== QUIZ_QUESTION_COUNT) {
    invalidState("Cannot complete an attempt before all questions are terminal.");
  }

  const [attempt] = await transaction
    .update(quizAttempts)
    .set({
      status: "completed",
      completedAt,
      totalScore: aggregates.totalScore,
      correctCount: aggregates.correctCount,
      timeoutCount: aggregates.timeoutCount,
    })
    .where(eq(quizAttempts.id, attemptId))
    .returning({
      id: quizAttempts.id,
      userId: quizAttempts.userId,
      status: quizAttempts.status,
      totalScore: quizAttempts.totalScore,
      correctCount: quizAttempts.correctCount,
      timeoutCount: quizAttempts.timeoutCount,
      startedAt: quizAttempts.startedAt,
      completedAt: quizAttempts.completedAt,
    });

  if (!attempt) {
    invalidState("Attempt disappeared during completion.");
  }

  return attempt;
}

async function settleExpiredQuestions(
  transaction: QuizTransaction,
  initialAttempt: AttemptRecord,
  serverNow: Date,
) {
  let attempt = initialAttempt;

  while (attempt.status === "active") {
    const currentQuestion = await getAnswerQuestion(transaction, attempt.id);

    if (!currentQuestion) {
      invalidState("Active attempt has no active question.");
    }

    parseDatabaseTimestamp(
      currentQuestion.activatedAt,
      "Active question activation time",
    );
    const deadlineAt = parseDatabaseTimestamp(
      currentQuestion.deadlineAt,
      "Active question deadline",
    );

    if (serverNow.getTime() < deadlineAt.getTime()) {
      return attempt;
    }

    const [timedOutQuestion] = await transaction
      .update(attemptQuestions)
      .set({ status: "timed_out", points: 0 })
      .where(
        and(
          eq(attemptQuestions.id, currentQuestion.attemptQuestionId),
          eq(attemptQuestions.status, "active"),
        ),
      )
      .returning({ id: attemptQuestions.id });

    if (!timedOutQuestion) {
      invalidState("Active question changed during timeout settlement.");
    }

    const nextQuestion = await getNextPendingQuestion(transaction, attempt.id);

    if (!nextQuestion) {
      return finalizeAttempt(
        transaction,
        attempt.id,
        deadlineAt,
      );
    }

    const nextActivatedAt = deadlineAt;
    const [activatedQuestion] = await transaction
      .update(attemptQuestions)
      .set({
        status: "active",
        activatedAt: nextActivatedAt,
        deadlineAt: addQuestionWindow(nextActivatedAt),
      })
      .where(
        and(
          eq(attemptQuestions.id, nextQuestion.attemptQuestionId),
          eq(attemptQuestions.status, "pending"),
        ),
      )
      .returning({ id: attemptQuestions.id });

    if (!activatedQuestion) {
      invalidState("Next pending question could not be activated.");
    }

    const [updatedAttempt] = await transaction
      .update(quizAttempts)
      .set({ timeoutCount: sql`${quizAttempts.timeoutCount} + 1` })
      .where(eq(quizAttempts.id, attempt.id))
      .returning({
        id: quizAttempts.id,
        userId: quizAttempts.userId,
        status: quizAttempts.status,
        totalScore: quizAttempts.totalScore,
        correctCount: quizAttempts.correctCount,
        timeoutCount: quizAttempts.timeoutCount,
        startedAt: quizAttempts.startedAt,
        completedAt: quizAttempts.completedAt,
      });

    if (!updatedAttempt) {
      invalidState("Attempt disappeared during timeout settlement.");
    }

    attempt = updatedAttempt;
  }

  return attempt;
}

function buildActiveState(
  attempt: AttemptRecord,
  serverNow: Date,
  question: PlayerQuestionRecord,
): ActivePlayerQuizState {
  if (
    attempt.status !== "active" ||
    !question.activatedAt ||
    !question.deadlineAt
  ) {
    invalidState("Cannot build active state from non-active records.");
  }

  assertOptionPermutation(question.optionOrder);
  const activatedAt = parseDatabaseTimestamp(
    question.activatedAt,
    "Active question activation time",
  );
  const deadlineAt = parseDatabaseTimestamp(
    question.deadlineAt,
    "Active question deadline",
  );

  const optionText: Record<AnswerOption, string> = {
    A: question.optionA,
    B: question.optionB,
    C: question.optionC,
    D: question.optionD,
  };

  return {
    attemptId: attempt.id,
    status: "active",
    position: question.position,
    questionCount: QUIZ_QUESTION_COUNT,
    totalScore: attempt.totalScore,
    correctCount: attempt.correctCount,
    timeoutCount: attempt.timeoutCount,
    serverNow: serverNow.toISOString(),
    currentQuestion: {
      attemptQuestionId: question.attemptQuestionId,
      position: question.position,
      questionText: question.questionText,
      options: question.optionOrder.map((canonicalOption, index) => ({
        index: index as DisplayChoiceIndex,
        label: DISPLAY_LABELS[index],
        text: optionText[canonicalOption],
      })),
      activatedAt: activatedAt.toISOString(),
      deadlineAt: deadlineAt.toISOString(),
    },
  };
}

function buildCompletedState(
  attempt: AttemptRecord,
  serverNow: Date,
): CompletedPlayerQuizState {
  if (attempt.status !== "completed" || !attempt.completedAt) {
    invalidState("Cannot build completion state before attempt completion.");
  }

  const incorrectCount =
    QUIZ_QUESTION_COUNT - attempt.correctCount - attempt.timeoutCount;
  const completedAt = parseDatabaseTimestamp(
    attempt.completedAt,
    "Attempt completion time",
  );

  if (incorrectCount < 0) {
    invalidState("Attempt aggregate counts are inconsistent.");
  }

  return {
    attemptId: attempt.id,
    status: "completed",
    questionCount: QUIZ_QUESTION_COUNT,
    totalScore: attempt.totalScore,
    correctCount: attempt.correctCount,
    timeoutCount: attempt.timeoutCount,
    incorrectCount,
    completedAt: completedAt.toISOString(),
    serverNow: serverNow.toISOString(),
  };
}

async function buildSettledAttemptState(
  transaction: QuizTransaction,
  initialAttempt: AttemptRecord,
  serverNow: Date,
) {
  let attempt = initialAttempt;

  if (attempt.status === "completed") {
    return buildCompletedState(attempt, serverNow);
  }

  if (attempt.status !== "active") {
    invalidState("Quiz attempt is not active or completed.");
  }

  attempt = await settleExpiredQuestions(transaction, attempt, serverNow);

  if (attempt.status === "completed") {
    return buildCompletedState(attempt, serverNow);
  }

  const currentQuestion = await getPlayerQuestion(transaction, attempt.id);
  return buildActiveState(attempt, serverNow, currentQuestion);
}

async function protectEngineOperation<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof QuizEngineError) {
      throw error;
    }

    throw new QuizEngineError(
      "INTERNAL_ERROR",
      "Quiz operation could not be completed.",
    );
  }
}

export function startQuizAttempt(userId: string): Promise<PlayerQuizState> {
  return protectEngineOperation(async () => {
    validateUuid(userId, "userId");

    return db.transaction(async (transaction) => {
      await lockUserForLiveAttempt(transaction, userId);
      const serverNow = await getDatabaseTime(transaction);
      const liveAttempt = await lockLiveAttempt(transaction, userId);

      if (liveAttempt) {
        return buildSettledAttemptState(transaction, liveAttempt, serverNow);
      }

      const selectedResult = await transaction.execute<SelectedQuestionRecord>(
        sql`
          SELECT
            id,
            question_text AS "questionText",
            option_a AS "optionA",
            option_b AS "optionB",
            option_c AS "optionC",
            option_d AS "optionD",
            version
          FROM questions
          WHERE is_active = true
          ORDER BY random()
          LIMIT ${QUIZ_QUESTION_COUNT}
        `,
      );
      const selectedQuestions = selectedResult.rows;

      if (selectedQuestions.length !== QUIZ_QUESTION_COUNT) {
        throw new QuizEngineError(
          "INSUFFICIENT_ACTIVE_QUESTIONS",
          `At least ${QUIZ_QUESTION_COUNT} active questions are required.`,
        );
      }

      const [attempt] = await transaction
        .insert(quizAttempts)
        .values({
          userId,
          status: "active",
          startedAt: serverNow,
        })
        .returning({
          id: quizAttempts.id,
          userId: quizAttempts.userId,
          status: quizAttempts.status,
          totalScore: quizAttempts.totalScore,
          correctCount: quizAttempts.correctCount,
          timeoutCount: quizAttempts.timeoutCount,
          startedAt: quizAttempts.startedAt,
          completedAt: quizAttempts.completedAt,
        });

      if (!attempt) {
        invalidState("Attempt could not be created.");
      }

      const insertedQuestions = await transaction
        .insert(attemptQuestions)
        .values(
          selectedQuestions.map((question, index) => ({
            attemptId: attempt.id,
            questionId: question.id,
            position: index + 1,
            questionVersion: question.version,
            optionOrder: shuffleAnswerOptions(),
            status: index === 0 ? ("active" as const) : ("pending" as const),
            activatedAt: index === 0 ? serverNow : null,
            deadlineAt: index === 0 ? addQuestionWindow(serverNow) : null,
          })),
        )
        .returning({ id: attemptQuestions.id });

      if (insertedQuestions.length !== QUIZ_QUESTION_COUNT) {
        invalidState("Attempt questions were not created completely.");
      }

      const currentQuestion = await getPlayerQuestion(transaction, attempt.id);
      return buildActiveState(attempt, serverNow, currentQuestion);
    });
  });
}

export function getLiveQuizState(
  userId: string,
): Promise<PlayerQuizState | null> {
  return protectEngineOperation(async () => {
    validateUuid(userId, "userId");

    return db.transaction(async (transaction) => {
      await lockUserForLiveAttempt(transaction, userId);
      const liveAttempt = await lockLiveAttempt(transaction, userId);

      if (!liveAttempt) {
        return null;
      }

      const serverNow = await getDatabaseTime(transaction);
      return buildSettledAttemptState(transaction, liveAttempt, serverNow);
    });
  });
}

export function getQuizState(
  userId: string,
  attemptId: string,
): Promise<PlayerQuizState> {
  return protectEngineOperation(async () => {
    validateUuid(userId, "userId");
    validateUuid(attemptId, "attemptId");

    return db.transaction(async (transaction) => {
      const attempt = await lockOwnedAttempt(transaction, userId, attemptId);
      const serverNow = await getDatabaseTime(transaction);
      return buildSettledAttemptState(transaction, attempt, serverNow);
    });
  });
}

export function submitQuizAnswer(
  input: SubmitQuizAnswerInput,
): Promise<PlayerQuizState> {
  return protectEngineOperation(async () => {
    validateUuid(input.userId, "userId");
    validateUuid(input.attemptId, "attemptId");
    validateUuid(input.attemptQuestionId, "attemptQuestionId");
    validateChoiceIndex(input.choiceIndex);

    const result = await db.transaction(async (transaction) => {
      let attempt = await lockOwnedAttempt(
        transaction,
        input.userId,
        input.attemptId,
      );

      if (attempt.status === "completed") {
        throw new QuizEngineError(
          "ATTEMPT_COMPLETED",
          "Quiz attempt is already completed.",
        );
      }

      if (attempt.status !== "active") {
        invalidState("Quiz attempt is not active.");
      }

      const serverNow = await getDatabaseTime(transaction);
      attempt = await settleExpiredQuestions(transaction, attempt, serverNow);

      if (attempt.status === "completed") {
        return {
          error: new QuizEngineError(
            "STALE_QUESTION",
            "Submitted question is no longer current.",
          ),
        } as const;
      }

      const currentQuestion = await getAnswerQuestion(transaction, attempt.id);

      if (
        !currentQuestion ||
        currentQuestion.attemptQuestionId !== input.attemptQuestionId
      ) {
        return {
          error: new QuizEngineError(
            "STALE_QUESTION",
            "Submitted question is no longer current.",
          ),
        } as const;
      }

      const deadlineAt = parseDatabaseTimestamp(
        currentQuestion.deadlineAt,
        "Active question deadline",
      );
      parseDatabaseTimestamp(
        currentQuestion.activatedAt,
        "Active question activation time",
      );

      assertOptionPermutation(currentQuestion.optionOrder);
      const selectedOption = currentQuestion.optionOrder[input.choiceIndex];
      const isCorrect = selectedOption === currentQuestion.correctOption;
      const remainingMs =
        deadlineAt.getTime() - serverNow.getTime();
      const points = calculateQuestionPoints(
        isCorrect ? "correct" : "incorrect",
        remainingMs,
      );

      const [answeredQuestion] = await transaction
        .update(attemptQuestions)
        .set({
          status: "answered",
          answeredAt: serverNow,
          selectedOption,
          isCorrect,
          points,
        })
        .where(
          and(
            eq(attemptQuestions.id, currentQuestion.attemptQuestionId),
            eq(attemptQuestions.status, "active"),
          ),
        )
        .returning({ id: attemptQuestions.id });

      if (!answeredQuestion) {
        return {
          error: new QuizEngineError(
            "STALE_QUESTION",
            "Submitted question is no longer current.",
          ),
        } as const;
      }

      const nextQuestion = await getNextPendingQuestion(transaction, attempt.id);

      if (!nextQuestion) {
        attempt = await finalizeAttempt(transaction, attempt.id, serverNow);
        return { state: buildCompletedState(attempt, serverNow) } as const;
      }

      const [activatedQuestion] = await transaction
        .update(attemptQuestions)
        .set({
          status: "active",
          activatedAt: serverNow,
          deadlineAt: addQuestionWindow(serverNow),
        })
        .where(
          and(
            eq(attemptQuestions.id, nextQuestion.attemptQuestionId),
            eq(attemptQuestions.status, "pending"),
          ),
        )
        .returning({ id: attemptQuestions.id });

      if (!activatedQuestion) {
        invalidState("Next pending question could not be activated.");
      }

      const [updatedAttempt] = await transaction
        .update(quizAttempts)
        .set({
          totalScore: sql`${quizAttempts.totalScore} + ${points}`,
          correctCount: isCorrect
            ? sql`${quizAttempts.correctCount} + 1`
            : quizAttempts.correctCount,
        })
        .where(eq(quizAttempts.id, attempt.id))
        .returning({
          id: quizAttempts.id,
          userId: quizAttempts.userId,
          status: quizAttempts.status,
          totalScore: quizAttempts.totalScore,
          correctCount: quizAttempts.correctCount,
          timeoutCount: quizAttempts.timeoutCount,
          startedAt: quizAttempts.startedAt,
          completedAt: quizAttempts.completedAt,
        });

      if (!updatedAttempt) {
        invalidState("Attempt disappeared while applying the answer.");
      }

      const playerQuestion = await getPlayerQuestion(
        transaction,
        updatedAttempt.id,
      );

      return {
        state: buildActiveState(updatedAttempt, serverNow, playerQuestion),
      } as const;
    });

    if ("error" in result) {
      throw result.error;
    }

    return result.state;
  });
}
