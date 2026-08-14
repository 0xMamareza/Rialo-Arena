import { APPROVED_QUESTION_COUNT } from "../src/lib/quiz/question-bank-validation";
import { createToolingPool } from "./lib/database";
import { loadCanonicalQuestionRows } from "./lib/question-bank";

const COLUMN_COUNT = 10;

async function seedQuestions() {
  const canonicalRows = await loadCanonicalQuestionRows();
  const pool = createToolingPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("LOCK TABLE questions IN EXCLUSIVE MODE");

    const existingResult = await client.query<{ questionCount: number }>(
      'SELECT count(*)::integer AS "questionCount" FROM questions',
    );
    const existingCount = existingResult.rows[0]?.questionCount ?? 0;

    if (existingCount !== 0) {
      throw new Error(
        `Question seed refused: questions contains ${existingCount} row(s); expected an empty table.`,
      );
    }

    const values: unknown[] = [];
    const placeholders = canonicalRows.map((question, rowIndex) => {
      values.push(
        question.id,
        question.questionText,
        question.optionA,
        question.optionB,
        question.optionC,
        question.optionD,
        question.correctOption,
        question.category,
        question.isActive,
        question.version,
      );

      const parameterOffset = rowIndex * COLUMN_COUNT;
      const rowParameters = Array.from(
        { length: COLUMN_COUNT },
        (_, columnIndex) => `$${parameterOffset + columnIndex + 1}`,
      );

      return `(${rowParameters.join(", ")})`;
    });

    const insertResult = await client.query(
      `INSERT INTO questions (
        id,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_option,
        category,
        is_active,
        version
      )
      OVERRIDING SYSTEM VALUE
      VALUES ${placeholders.join(",\n")}`,
      values,
    );

    if (insertResult.rowCount !== APPROVED_QUESTION_COUNT) {
      throw new Error(
        `Question seed inserted ${insertResult.rowCount ?? 0} rows; expected ${APPROVED_QUESTION_COUNT}.`,
      );
    }

    await client.query(
      "SELECT setval(pg_get_serial_sequence('questions', 'id'), (SELECT max(id) FROM questions), true)",
    );

    const finalResult = await client.query<{
      questionCount: number;
      minimumId: number;
      maximumId: number;
    }>(
      `SELECT
        count(*)::integer AS "questionCount",
        min(id)::integer AS "minimumId",
        max(id)::integer AS "maximumId"
      FROM questions`,
    );
    const finalState = finalResult.rows[0];

    if (
      !finalState ||
      finalState.questionCount !== APPROVED_QUESTION_COUNT ||
      finalState.minimumId !== 1 ||
      finalState.maximumId !== APPROVED_QUESTION_COUNT
    ) {
      throw new Error("Question seed post-insert verification failed.");
    }

    await client.query("COMMIT");
    console.log(
      `Seeded ${APPROVED_QUESTION_COUNT} canonical questions with IDs 1–${APPROVED_QUESTION_COUNT}.`,
    );
    console.log("Advanced the questions identity sequence past the seeded range.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedQuestions().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
