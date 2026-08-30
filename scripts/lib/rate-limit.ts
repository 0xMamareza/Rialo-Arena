import type { Pool, PoolClient } from "pg";

import {
  hashRateLimitKey,
  LEADERBOARD_RATE_LIMIT,
  PERSONAL_STATS_RATE_LIMIT,
  PROFILE_CONFIRM_RATE_LIMIT,
  QUIZ_ANSWER_RATE_LIMIT,
  QUIZ_STATE_RATE_LIMIT,
  QUIZ_START_RATE_LIMIT,
} from "../../src/server/rate-limit/limiter";

export async function cleanupVerifierRateLimits(
  database: Pool | PoolClient,
  options: { clientIps?: string[]; userIds?: string[] },
) {
  const bucketKeys = [
    ...(options.clientIps ?? []).flatMap((clientIp) => [
      {
        scope: PROFILE_CONFIRM_RATE_LIMIT.scope,
        keyHash: hashRateLimitKey(PROFILE_CONFIRM_RATE_LIMIT, clientIp),
      },
      {
        scope: LEADERBOARD_RATE_LIMIT.scope,
        keyHash: hashRateLimitKey(LEADERBOARD_RATE_LIMIT, clientIp),
      },
    ]),
    ...(options.userIds ?? []).flatMap((userId) => [
      {
        scope: QUIZ_START_RATE_LIMIT.scope,
        keyHash: hashRateLimitKey(QUIZ_START_RATE_LIMIT, userId),
      },
      {
        scope: QUIZ_ANSWER_RATE_LIMIT.scope,
        keyHash: hashRateLimitKey(QUIZ_ANSWER_RATE_LIMIT, userId),
      },
      {
        scope: QUIZ_STATE_RATE_LIMIT.scope,
        keyHash: hashRateLimitKey(QUIZ_STATE_RATE_LIMIT, userId),
      },
      {
        scope: PERSONAL_STATS_RATE_LIMIT.scope,
        keyHash: hashRateLimitKey(PERSONAL_STATS_RATE_LIMIT, userId),
      },
    ]),
  ];

  if (bucketKeys.length === 0) return;

  await database.query(
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
