import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import type {
  LeaderboardEntry,
  PersonalBestStats,
} from "@/lib/leaderboard/api-types";
import { getArenaRankTier } from "@/server/leaderboard/rank-tiers";

const rankedLeaderboardCtes = sql`
  WITH ranked_attempts AS (
    SELECT
      quiz_attempts.id,
      quiz_attempts.user_id,
      quiz_attempts.total_score,
      quiz_attempts.correct_count,
      quiz_attempts.timeout_count,
      quiz_attempts.completed_at,
      row_number() OVER (
        PARTITION BY quiz_attempts.user_id
        ORDER BY
          quiz_attempts.total_score DESC,
          quiz_attempts.completed_at DESC,
          quiz_attempts.id ASC
      ) AS attempt_rank
    FROM quiz_attempts
    WHERE quiz_attempts.status = 'completed'
  ),
  best_attempts AS (
    SELECT
      id,
      user_id,
      total_score,
      correct_count,
      timeout_count,
      completed_at
    FROM ranked_attempts
    WHERE attempt_rank = 1
  ),
  leaderboard AS (
    SELECT
      users.id AS user_id,
      users.x_username,
      users.profile_image_url,
      best_attempts.total_score,
      best_attempts.correct_count,
      best_attempts.timeout_count,
      best_attempts.completed_at,
      (row_number() OVER (
        ORDER BY
          best_attempts.total_score DESC,
          best_attempts.completed_at DESC,
          users.x_username ASC,
          users.id ASC
      ))::integer AS rank
    FROM best_attempts
    INNER JOIN users ON users.id = best_attempts.user_id
  )
`;

export async function getGlobalLeaderboard(
  limit: number,
): Promise<LeaderboardEntry[]> {
  const result = await db.execute<Omit<LeaderboardEntry, "tier">>(sql`
    ${rankedLeaderboardCtes}
    SELECT
      rank,
      x_username AS "xUsername",
      profile_image_url AS "profileImageUrl",
      total_score AS score,
      correct_count AS "correctCount",
      timeout_count AS "timeoutCount"
    FROM leaderboard
    ORDER BY rank
    LIMIT ${limit}
  `);

  return result.rows.map((entry) => ({
    ...entry,
    tier: getArenaRankTier(entry.score),
  }));
}

type PersonalBestRow = {
  score: number | null;
  correctCount: number | null;
  timeoutCount: number | null;
  completedAttemptsCount: number;
  globalRank: number | null;
};

export async function getPersonalBestStats(
  userId: string,
): Promise<PersonalBestStats> {
  const result = await db.execute<PersonalBestRow>(sql`
    ${rankedLeaderboardCtes},
    completed_attempt_counts AS (
      SELECT
        user_id,
        count(*)::integer AS completed_attempts_count
      FROM quiz_attempts
      WHERE status = 'completed'
      GROUP BY user_id
    )
    SELECT
      leaderboard.total_score AS score,
      leaderboard.correct_count AS "correctCount",
      leaderboard.timeout_count AS "timeoutCount",
      coalesce(
        completed_attempt_counts.completed_attempts_count,
        0
      )::integer AS "completedAttemptsCount",
      leaderboard.rank AS "globalRank"
    FROM users
    LEFT JOIN leaderboard ON leaderboard.user_id = users.id
    LEFT JOIN completed_attempt_counts
      ON completed_attempt_counts.user_id = users.id
    WHERE users.id = ${userId}::uuid
    LIMIT 1
  `);
  const row = result.rows[0];

  if (!row) {
    throw new Error("Current user could not be found.");
  }

  return {
    personalBest: row.score === null
      ? null
      : {
          score: row.score,
          correctCount: row.correctCount ?? 0,
          timeoutCount: row.timeoutCount ?? 0,
        },
    completedAttemptsCount: row.completedAttemptsCount,
    globalRank: row.globalRank,
    tier: row.score === null ? null : getArenaRankTier(row.score),
  };
}
