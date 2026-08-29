WITH "ranked_active_attempts" AS (
	SELECT
		"id",
		row_number() OVER (
			PARTITION BY "user_id"
			ORDER BY "created_at" DESC, "id" ASC
		) AS "active_rank"
	FROM "quiz_attempts"
	WHERE "status" = 'active'
)
UPDATE "quiz_attempts"
SET "status" = 'abandoned'
FROM "ranked_active_attempts"
WHERE "quiz_attempts"."id" = "ranked_active_attempts"."id"
	AND "ranked_active_attempts"."active_rank" > 1;
--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_attempts_one_active_per_user_idx" ON "quiz_attempts" USING btree ("user_id") WHERE "quiz_attempts"."status" = 'active';
