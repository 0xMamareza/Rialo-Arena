CREATE TABLE "rate_limit_buckets" (
	"scope" text NOT NULL,
	"key_hash" text NOT NULL,
	"request_count" integer DEFAULT 1 NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "rate_limit_buckets_scope_key_hash_pk" PRIMARY KEY("scope","key_hash"),
	CONSTRAINT "rate_limit_buckets_key_hash_check" CHECK ("rate_limit_buckets"."key_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "rate_limit_buckets_request_count_check" CHECK ("rate_limit_buckets"."request_count" >= 1),
	CONSTRAINT "rate_limit_buckets_expiry_check" CHECK ("rate_limit_buckets"."expires_at" > "rate_limit_buckets"."window_started_at")
);
--> statement-breakpoint
CREATE INDEX "rate_limit_buckets_expires_at_idx" ON "rate_limit_buckets" USING btree ("expires_at");