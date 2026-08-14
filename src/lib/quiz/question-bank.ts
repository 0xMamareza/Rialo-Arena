import "server-only";

import rawQuestionBank from "../../../data/quiz/rialo-community-quiz-89.json";

import type { AnswerOption } from "./domain";
import {
  parseQuestionBank,
  type CanonicalQuestion,
} from "./question-bank-validation";

const validatedQuestionBank = parseQuestionBank(rawQuestionBank);

for (const question of validatedQuestionBank.questions) {
  Object.freeze(question.options);
  Object.freeze(question);
}

Object.freeze(validatedQuestionBank.questions);
if (validatedQuestionBank.notes) {
  Object.freeze(validatedQuestionBank.notes);
}

export const rialoQuestionBank = Object.freeze(validatedQuestionBank);

export type QuestionSeedData = {
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

export function toQuestionSeedData(
  question: CanonicalQuestion,
): QuestionSeedData {
  return {
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
  };
}

export const rialoQuestionSeedData = Object.freeze(
  rialoQuestionBank.questions.map((question) =>
    Object.freeze(toQuestionSeedData(question)),
  ),
);
