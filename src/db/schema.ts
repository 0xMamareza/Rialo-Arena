import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  ANSWER_OPTIONS,
  ATTEMPT_QUESTION_STATUSES,
  MAX_QUESTION_POINTS,
  MAX_QUIZ_SCORE,
  QUIZ_ATTEMPT_STATUSES,
  QUIZ_QUESTION_COUNT,
} from "../lib/quiz/domain";

export const answerOptionEnum = pgEnum("answer_option", ANSWER_OPTIONS);
export const quizAttemptStatusEnum = pgEnum(
  "quiz_attempt_status",
  QUIZ_ATTEMPT_STATUSES,
);
export const attemptQuestionStatusEnum = pgEnum(
  "attempt_question_status",
  ATTEMPT_QUESTION_STATUSES,
);

const quizQuestionCountSql = sql.raw(String(QUIZ_QUESTION_COUNT));
const maxQuestionPointsSql = sql.raw(String(MAX_QUESTION_POINTS));
const maxQuizScoreSql = sql.raw(String(MAX_QUIZ_SCORE));

// defaultNow() initializes timestamps only; update paths must maintain updatedAt.
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    xUsername: text("x_username").notNull(),
    profileImageUrl: text("profile_image_url").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "users_x_username_normalized_check",
      sql`char_length(${table.xUsername}) between 1 and 15 and ${table.xUsername} = lower(${table.xUsername}) and ${table.xUsername} ~ '^[a-z0-9_]+$'`,
    ),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "sessions_token_hash_check",
      sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "sessions_expiry_check",
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
    index("sessions_user_id_idx").on(table.userId),
  ],
);

// Referenced question content, options, and correct answers are append-only.
// Corrections deactivate the old row and insert a replacement.
// Category remains internal metadata and is never shown to players.
export const questions = pgTable(
  "questions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    questionText: text("question_text").notNull(),
    optionA: text("option_a").notNull(),
    optionB: text("option_b").notNull(),
    optionC: text("option_c").notNull(),
    optionD: text("option_d").notNull(),
    correctOption: answerOptionEnum("correct_option").notNull(),
    category: text("category"),
    isActive: boolean("is_active").default(true).notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check("questions_version_check", sql`${table.version} >= 1`),
  ],
);

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: quizAttemptStatusEnum("status").default("created").notNull(),
    scoringVersion: integer("scoring_version").default(1).notNull(),
    totalScore: integer("total_score").default(0).notNull(),
    correctCount: smallint("correct_count").default(0).notNull(),
    timeoutCount: smallint("timeout_count").default(0).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "quiz_attempts_total_score_check",
      sql`${table.totalScore} between 0 and ${maxQuizScoreSql}`,
    ),
    check(
      "quiz_attempts_correct_count_check",
      sql`${table.correctCount} between 0 and ${quizQuestionCountSql}`,
    ),
    check(
      "quiz_attempts_timeout_count_check",
      sql`${table.timeoutCount} between 0 and ${quizQuestionCountSql}`,
    ),
    check(
      "quiz_attempts_count_sum_check",
      sql`${table.correctCount} + ${table.timeoutCount} <= ${quizQuestionCountSql}`,
    ),
    check(
      "quiz_attempts_scoring_version_check",
      sql`${table.scoringVersion} >= 1`,
    ),
    check(
      "quiz_attempts_completed_at_check",
      sql`${table.status} <> 'completed' or ${table.completedAt} is not null`,
    ),
    index("quiz_attempts_user_created_idx").on(
      table.userId,
      table.createdAt.desc(),
    ),
    uniqueIndex("quiz_attempts_one_active_per_user_idx")
      .on(table.userId)
      .where(sql`${table.status} = 'active'`),
    index("quiz_attempts_completed_score_idx")
      .on(table.totalScore.desc(), table.completedAt.desc())
      .where(sql`${table.status} = 'completed'`),
    index("quiz_attempts_user_completed_score_idx")
      .on(table.userId, table.totalScore.desc(), table.completedAt.desc())
      .where(sql`${table.status} = 'completed'`),
  ],
);

export const attemptQuestions = pgTable(
  "attempt_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => quizAttempts.id, { onDelete: "restrict" }),
    questionId: integer("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "restrict" }),
    position: smallint("position").notNull(),
    questionVersion: integer("question_version").notNull(),
    optionOrder: answerOptionEnum("option_order").array().notNull(),
    status: attemptQuestionStatusEnum("status").default("pending").notNull(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    deadlineAt: timestamp("deadline_at", { withTimezone: true }),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
    selectedOption: answerOptionEnum("selected_option"),
    isCorrect: boolean("is_correct"),
    points: integer("points").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "attempt_questions_position_check",
      sql`${table.position} between 1 and ${quizQuestionCountSql}`,
    ),
    check(
      "attempt_questions_points_check",
      sql`${table.points} between 0 and ${maxQuestionPointsSql}`,
    ),
    check(
      "attempt_questions_question_version_check",
      sql`${table.questionVersion} >= 1`,
    ),
    check(
      "attempt_questions_answered_integrity_check",
      sql`${table.status} <> 'answered' or (${table.selectedOption} is not null and ${table.answeredAt} is not null and ${table.isCorrect} is not null)`,
    ),
    check(
      "attempt_questions_timeout_points_check",
      sql`${table.status} <> 'timed_out' or ${table.points} = 0`,
    ),
    check(
      "attempt_questions_timing_order_check",
      sql`${table.activatedAt} is null or ${table.deadlineAt} is null or ${table.deadlineAt} >= ${table.activatedAt}`,
    ),
    check(
      "attempt_questions_option_order_check",
      sql`array_ndims(${table.optionOrder}) = 1 and cardinality(${table.optionOrder}) = 4 and ${table.optionOrder} @> ARRAY['A', 'B', 'C', 'D']::answer_option[]`,
    ),
    unique("attempt_questions_attempt_position_unique").on(
      table.attemptId,
      table.position,
    ),
    unique("attempt_questions_attempt_question_unique").on(
      table.attemptId,
      table.questionId,
    ),
    uniqueIndex("attempt_questions_one_active_per_attempt_idx")
      .on(table.attemptId)
      .where(sql`${table.status} = 'active'`),
  ],
);
