import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import { getQuizState } from "@/server/quiz/engine";

export type MaintenanceResult = {
  overdueAttemptsVisited: number;
  overdueAttemptsCompleted: number;
  expiredSessionsDeleted: number;
  expiredRateLimitBucketsDeleted: number;
};

export async function runMaintenance(): Promise<MaintenanceResult> {
  const overdueAttempts = await db.execute<{
    attemptId: string;
    userId: string;
  }>(sql`
    SELECT
      quiz_attempts.id AS "attemptId",
      quiz_attempts.user_id AS "userId"
    FROM quiz_attempts
    INNER JOIN attempt_questions
      ON attempt_questions.attempt_id = quiz_attempts.id
    WHERE quiz_attempts.status = 'active'
      AND attempt_questions.status = 'active'
      AND attempt_questions.deadline_at <= clock_timestamp()
    ORDER BY quiz_attempts.created_at, quiz_attempts.id
  `);

  let overdueAttemptsCompleted = 0;

  for (const attempt of overdueAttempts.rows) {
    const state = await getQuizState(attempt.userId, attempt.attemptId);

    if (state.status === "completed") {
      overdueAttemptsCompleted += 1;
    }
  }

  const expiredSessions = await db.execute<{ id: string }>(sql`
    DELETE FROM sessions
    WHERE expires_at <= clock_timestamp()
    RETURNING id
  `);
  const expiredRateLimitBuckets = await db.execute<{
    keyHash: string;
    scope: string;
  }>(sql`
    DELETE FROM rate_limit_buckets
    WHERE expires_at <= clock_timestamp()
    RETURNING key_hash AS "keyHash", scope
  `);

  return {
    overdueAttemptsVisited: overdueAttempts.rows.length,
    overdueAttemptsCompleted,
    expiredSessionsDeleted: expiredSessions.rows.length,
    expiredRateLimitBucketsDeleted: expiredRateLimitBuckets.rows.length,
  };
}
