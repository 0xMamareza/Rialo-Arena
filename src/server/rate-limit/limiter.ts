import "server-only";

import { createHash } from "node:crypto";

import { sql } from "drizzle-orm";

import { db } from "@/db";

export type RateLimitPolicy = {
  scope: string;
  limit: number;
  windowSeconds: number;
};

export const PROFILE_CONFIRM_RATE_LIMIT = {
  scope: "profile-confirm:ip",
  limit: 10,
  windowSeconds: 10 * 60,
} as const satisfies RateLimitPolicy;

export const QUIZ_START_RATE_LIMIT = {
  scope: "quiz-start:user",
  limit: 10,
  windowSeconds: 60,
} as const satisfies RateLimitPolicy;

export const QUIZ_ANSWER_RATE_LIMIT = {
  scope: "quiz-answer:user",
  limit: 60,
  windowSeconds: 60,
} as const satisfies RateLimitPolicy;

export const LEADERBOARD_RATE_LIMIT = {
  scope: "leaderboard:ip",
  limit: 120,
  windowSeconds: 60,
} as const satisfies RateLimitPolicy;

export const PERSONAL_STATS_RATE_LIMIT = {
  scope: "personal-stats:user",
  limit: 60,
  windowSeconds: 60,
} as const satisfies RateLimitPolicy;

export type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

export function hashRateLimitKey(policy: RateLimitPolicy, rawKey: string) {
  return createHash("sha256")
    .update(`rialo-arena-rate-limit:v1:${policy.scope}:${rawKey}`)
    .digest("hex");
}

export async function consumeRateLimit(
  policy: RateLimitPolicy,
  rawKey: string,
): Promise<RateLimitDecision> {
  if (
    !rawKey ||
    !Number.isInteger(policy.limit) ||
    policy.limit < 1 ||
    !Number.isInteger(policy.windowSeconds) ||
    policy.windowSeconds < 1
  ) {
    throw new Error("Rate-limit policy or key is invalid.");
  }

  const keyHash = hashRateLimitKey(policy, rawKey);
  const saturatedCount = policy.limit + 1;
  const result = await db.execute<{
    requestCount: number;
    retryAfterSeconds: number;
  }>(sql`
    WITH limiter_clock AS (
      SELECT clock_timestamp() AS now
    ), upserted_bucket AS (
      INSERT INTO rate_limit_buckets (
        scope,
        key_hash,
        request_count,
        window_started_at,
        expires_at
      )
      SELECT
        ${policy.scope},
        ${keyHash},
        1,
        limiter_clock.now,
        limiter_clock.now + make_interval(secs => ${policy.windowSeconds})
      FROM limiter_clock
      ON CONFLICT (scope, key_hash) DO UPDATE
      SET
        request_count = CASE
          WHEN rate_limit_buckets.expires_at <= EXCLUDED.window_started_at THEN 1
          ELSE least(rate_limit_buckets.request_count + 1, ${saturatedCount})
        END,
        window_started_at = CASE
          WHEN rate_limit_buckets.expires_at <= EXCLUDED.window_started_at
            THEN EXCLUDED.window_started_at
          ELSE rate_limit_buckets.window_started_at
        END,
        expires_at = CASE
          WHEN rate_limit_buckets.expires_at <= EXCLUDED.window_started_at
            THEN EXCLUDED.expires_at
          ELSE rate_limit_buckets.expires_at
        END
      RETURNING request_count, expires_at
    )
    SELECT
      upserted_bucket.request_count AS "requestCount",
      greatest(
        1,
        ceil(
          extract(
            epoch FROM upserted_bucket.expires_at - limiter_clock.now
          )
        )
      )::integer AS "retryAfterSeconds"
    FROM upserted_bucket
    CROSS JOIN limiter_clock
  `);
  const bucket = result.rows[0];

  if (!bucket) {
    throw new Error("Rate-limit bucket could not be updated.");
  }

  return {
    allowed: bucket.requestCount <= policy.limit,
    limit: policy.limit,
    remaining: Math.max(0, policy.limit - bucket.requestCount),
    retryAfterSeconds: bucket.retryAfterSeconds,
  };
}
