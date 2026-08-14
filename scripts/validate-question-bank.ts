import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  APPROVED_QUESTION_COUNT,
  auditQuestionBank,
  parseQuestionBank,
} from "../src/lib/quiz/question-bank-validation";

const bankPath = resolve(
  process.cwd(),
  "data/quiz/rialo-community-quiz-89.json",
);

try {
  const rawBank: unknown = JSON.parse(readFileSync(bankPath, "utf8"));
  const bank = parseQuestionBank(rawBank);
  const audit = auditQuestionBank(bank);

  const categorySummary = Object.entries(audit.categoryCounts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([category, count]) => `${category}: ${count}`)
    .join("; ");
  const answerKeySummary = Object.entries(audit.answerKeyCounts)
    .map(([option, count]) => `${option}: ${count}`)
    .join("; ");

  console.log(`✓ ${audit.questionCount} questions validated`);
  console.log(
    `✓ IDs 1–${APPROVED_QUESTION_COUNT} complete; no duplicate IDs or question text`,
  );
  console.log("✓ Valid A/B/C/D options and answer keys");
  console.log(`Categories: ${categorySummary}`);
  console.log(`Answer keys: ${answerKeySummary}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
