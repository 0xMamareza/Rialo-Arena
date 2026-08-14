CREATE TYPE "public"."answer_option" AS ENUM('A', 'B', 'C', 'D');--> statement-breakpoint
CREATE TYPE "public"."attempt_question_status" AS ENUM('pending', 'active', 'answered', 'timed_out');--> statement-breakpoint
CREATE TYPE "public"."quiz_attempt_status" AS ENUM('created', 'active', 'completed', 'expired', 'abandoned');--> statement-breakpoint
CREATE TABLE "attempt_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"question_id" integer NOT NULL,
	"position" smallint NOT NULL,
	"question_version" integer NOT NULL,
	"option_order" "answer_option"[] NOT NULL,
	"status" "attempt_question_status" DEFAULT 'pending' NOT NULL,
	"activated_at" timestamp with time zone,
	"deadline_at" timestamp with time zone,
	"answered_at" timestamp with time zone,
	"selected_option" "answer_option",
	"is_correct" boolean,
	"points" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attempt_questions_attempt_position_unique" UNIQUE("attempt_id","position"),
	CONSTRAINT "attempt_questions_attempt_question_unique" UNIQUE("attempt_id","question_id"),
	CONSTRAINT "attempt_questions_position_check" CHECK ("attempt_questions"."position" between 1 and 15),
	CONSTRAINT "attempt_questions_points_check" CHECK ("attempt_questions"."points" between 0 and 200),
	CONSTRAINT "attempt_questions_question_version_check" CHECK ("attempt_questions"."question_version" >= 1),
	CONSTRAINT "attempt_questions_answered_integrity_check" CHECK ("attempt_questions"."status" <> 'answered' or ("attempt_questions"."selected_option" is not null and "attempt_questions"."answered_at" is not null and "attempt_questions"."is_correct" is not null)),
	CONSTRAINT "attempt_questions_timeout_points_check" CHECK ("attempt_questions"."status" <> 'timed_out' or "attempt_questions"."points" = 0),
	CONSTRAINT "attempt_questions_timing_order_check" CHECK ("attempt_questions"."activated_at" is null or "attempt_questions"."deadline_at" is null or "attempt_questions"."deadline_at" >= "attempt_questions"."activated_at"),
	CONSTRAINT "attempt_questions_option_order_check" CHECK (array_ndims("attempt_questions"."option_order") = 1 and cardinality("attempt_questions"."option_order") = 4 and "attempt_questions"."option_order" @> ARRAY['A', 'B', 'C', 'D']::answer_option[])
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "questions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"question_text" text NOT NULL,
	"option_a" text NOT NULL,
	"option_b" text NOT NULL,
	"option_c" text NOT NULL,
	"option_d" text NOT NULL,
	"correct_option" "answer_option" NOT NULL,
	"category" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "questions_version_check" CHECK ("questions"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "quiz_attempt_status" DEFAULT 'created' NOT NULL,
	"scoring_version" integer DEFAULT 1 NOT NULL,
	"total_score" integer DEFAULT 0 NOT NULL,
	"correct_count" smallint DEFAULT 0 NOT NULL,
	"timeout_count" smallint DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quiz_attempts_total_score_check" CHECK ("quiz_attempts"."total_score" between 0 and 3000),
	CONSTRAINT "quiz_attempts_correct_count_check" CHECK ("quiz_attempts"."correct_count" between 0 and 15),
	CONSTRAINT "quiz_attempts_timeout_count_check" CHECK ("quiz_attempts"."timeout_count" between 0 and 15),
	CONSTRAINT "quiz_attempts_count_sum_check" CHECK ("quiz_attempts"."correct_count" + "quiz_attempts"."timeout_count" <= 15),
	CONSTRAINT "quiz_attempts_scoring_version_check" CHECK ("quiz_attempts"."scoring_version" >= 1),
	CONSTRAINT "quiz_attempts_completed_at_check" CHECK ("quiz_attempts"."status" <> 'completed' or "quiz_attempts"."completed_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"x_account_id" text NOT NULL,
	"x_username" text NOT NULL,
	"display_name" text NOT NULL,
	"profile_image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_x_account_id_unique" UNIQUE("x_account_id")
);
--> statement-breakpoint
ALTER TABLE "attempt_questions" ADD CONSTRAINT "attempt_questions_attempt_id_quiz_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_questions" ADD CONSTRAINT "attempt_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attempt_questions_one_active_per_attempt_idx" ON "attempt_questions" USING btree ("attempt_id") WHERE "attempt_questions"."status" = 'active';--> statement-breakpoint
CREATE INDEX "quiz_attempts_user_created_idx" ON "quiz_attempts" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "quiz_attempts_completed_score_idx" ON "quiz_attempts" USING btree ("total_score" DESC NULLS LAST,"completed_at" DESC NULLS LAST) WHERE "quiz_attempts"."status" = 'completed';--> statement-breakpoint
CREATE INDEX "quiz_attempts_user_completed_score_idx" ON "quiz_attempts" USING btree ("user_id","total_score" DESC NULLS LAST,"completed_at" DESC NULLS LAST) WHERE "quiz_attempts"."status" = 'completed';