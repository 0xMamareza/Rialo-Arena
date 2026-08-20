import { drizzle } from "drizzle-orm/node-postgres";

import { APPROVED_QUESTION_COUNT } from "../src/lib/quiz/question-bank-validation";
import { createToolingPool } from "./lib/database";
import {
  loadCanonicalQuestionRows,
  type CanonicalQuestionRow,
} from "./lib/question-bank";

const COMPARED_FIELDS = [
  "id",
  "questionText",
  "optionA",
  "optionB",
  "optionC",
  "optionD",
  "correctOption",
  "category",
  "isActive",
  "version",
] as const satisfies readonly (keyof CanonicalQuestionRow)[];

type StoredQuestionRow = CanonicalQuestionRow;

async function verifyDatabase() {
  const canonicalRows = await loadCanonicalQuestionRows();
  const pool = createToolingPool();
  const database = drizzle({ client: pool });

  try {
    const relationsResult = await pool.query<{
      users: string | null;
      sessions: string | null;
      questions: string | null;
      quizAttempts: string | null;
      attemptQuestions: string | null;
      migrations: string | null;
    }>(
      `SELECT
        to_regclass('public.users')::text AS "users",
        to_regclass('public.sessions')::text AS "sessions",
        to_regclass('public.questions')::text AS "questions",
        to_regclass('public.quiz_attempts')::text AS "quizAttempts",
        to_regclass('public.attempt_questions')::text AS "attemptQuestions",
        to_regclass('drizzle.__drizzle_migrations')::text AS "migrations"`,
    );
    const relations = relationsResult.rows[0];

    if (!relations || Object.values(relations).some((relation) => !relation)) {
      throw new Error("Expected database tables or Drizzle bookkeeping are missing.");
    }

    const migrationResult = await pool.query<{ migrationCount: number }>(
      'SELECT count(*)::integer AS "migrationCount" FROM drizzle.__drizzle_migrations',
    );

    if ((migrationResult.rows[0]?.migrationCount ?? 0) !== 2) {
      throw new Error("Expected exactly two applied Drizzle migrations.");
    }

    const storedResult = await database.execute<StoredQuestionRow>(
      `SELECT
        id,
        question_text AS "questionText",
        option_a AS "optionA",
        option_b AS "optionB",
        option_c AS "optionC",
        option_d AS "optionD",
        correct_option AS "correctOption",
        category,
        is_active AS "isActive",
        version
      FROM questions
      ORDER BY id`,
    );
    const storedRows = storedResult.rows;

    if (storedRows.length !== APPROVED_QUESTION_COUNT) {
      throw new Error(
        `Database contains ${storedRows.length} questions; expected ${APPROVED_QUESTION_COUNT}.`,
      );
    }

    storedRows.forEach((storedRow, index) => {
      const canonicalRow = canonicalRows[index];

      if (!canonicalRow || storedRow.id !== index + 1) {
        throw new Error(`Question ID sequence differs at row ${index + 1}.`);
      }

      for (const field of COMPARED_FIELDS) {
        if (storedRow[field] !== canonicalRow[field]) {
          throw new Error(
            `Stored question ${storedRow.id} differs from the canonical bank in field ${field}.`,
          );
        }
      }
    });

    const sequenceResult = await pool.query<{
      lastValue: string;
      isCalled: boolean;
      incrementBy: string;
    }>(
      `SELECT
        sequence_state.last_value::text AS "lastValue",
        sequence_state.is_called AS "isCalled",
        sequence_metadata.increment_by::text AS "incrementBy"
      FROM questions_id_seq AS sequence_state
      CROSS JOIN pg_sequences AS sequence_metadata
      WHERE sequence_metadata.schemaname = 'public'
        AND sequence_metadata.sequencename = 'questions_id_seq'`,
    );
    const sequence = sequenceResult.rows[0];

    if (
      !sequence ||
      !sequence.isCalled ||
      BigInt(sequence.lastValue) + BigInt(sequence.incrementBy) <=
        BigInt(APPROVED_QUESTION_COUNT)
    ) {
      throw new Error("Questions identity sequence is not beyond the seeded range.");
    }

    console.log(
      `Verified ${APPROVED_QUESTION_COUNT} exact canonical question matches with IDs 1–${APPROVED_QUESTION_COUNT}.`,
    );
    console.log("Verified two applied Drizzle migrations and all expected tables.");
    console.log("Verified the next generated question ID is beyond the seeded range.");
  } finally {
    await pool.end();
  }
}

verifyDatabase().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
