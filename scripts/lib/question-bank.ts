import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { AnswerOption } from "../../src/lib/quiz/domain";
import { parseQuestionBank } from "../../src/lib/quiz/question-bank-validation";

export type CanonicalQuestionRow = {
  id: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: AnswerOption;
  category: string;
  isActive: true;
  version: 1;
};

export async function loadCanonicalQuestionRows() {
  const bankPath = resolve(
    process.cwd(),
    "data/quiz/rialo-community-quiz-89.json",
  );
  const rawBank: unknown = JSON.parse(await readFile(bankPath, "utf8"));
  const bank = parseQuestionBank(rawBank);

  return bank.questions.map<CanonicalQuestionRow>((question) => ({
    id: question.id,
    questionText: question.question,
    optionA: question.options.A,
    optionB: question.options.B,
    optionC: question.options.C,
    optionD: question.options.D,
    correctOption: question.correctOption,
    category: question.category,
    isActive: true,
    version: 1,
  }));
}
