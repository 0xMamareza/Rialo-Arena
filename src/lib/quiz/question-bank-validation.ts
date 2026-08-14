import { z } from "zod";

import {
  ANSWER_OPTIONS,
  answerOptionSchema,
  type AnswerOption,
} from "./domain";

export const APPROVED_QUESTION_COUNT = 89;

const nonBlankStringSchema = z.string().refine(
  (value) => value.trim().length > 0,
  "Must contain non-whitespace text",
);

const questionOptionsSchema = z
  .object({
    A: nonBlankStringSchema,
    B: nonBlankStringSchema,
    C: nonBlankStringSchema,
    D: nonBlankStringSchema,
  })
  .strict();

export const canonicalQuestionSchema = z
  .object({
    id: z.number().int().min(1).max(APPROVED_QUESTION_COUNT),
    category: nonBlankStringSchema,
    question: nonBlankStringSchema,
    options: questionOptionsSchema,
    correctOption: answerOptionSchema,
  })
  .strict()
  .superRefine((question, context) => {
    const optionTextOwners = new Map<string, AnswerOption>();

    for (const option of ANSWER_OPTIONS) {
      const normalizedText = question.options[option]
        .trim()
        .toLocaleLowerCase("en-US");
      const existingOption = optionTextOwners.get(normalizedText);

      if (existingOption) {
        context.addIssue({
          code: "custom",
          path: ["options", option],
          message: `Option ${option} duplicates option ${existingOption} after normalization`,
        });
      } else {
        optionTextOwners.set(normalizedText, option);
      }
    }

    if (!Object.hasOwn(question.options, question.correctOption)) {
      context.addIssue({
        code: "custom",
        path: ["correctOption"],
        message: "Correct option must reference an existing answer option",
      });
    }
  });

const questionBankNotesSchema = z
  .object({
    categoryVisibility: nonBlankStringSchema,
    source: nonBlankStringSchema,
  })
  .strict();

export const questionBankSchema = z
  .object({
    title: nonBlankStringSchema.optional(),
    version: z.number().int().min(1).optional(),
    questionCount: z.number().int().min(0).optional(),
    notes: questionBankNotesSchema.optional(),
    questions: z
      .array(canonicalQuestionSchema)
      .length(APPROVED_QUESTION_COUNT),
  })
  .strict()
  .superRefine((bank, context) => {
    if (
      bank.questionCount !== undefined &&
      bank.questionCount !== bank.questions.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["questionCount"],
        message: `Metadata says ${bank.questionCount}, but the bank contains ${bank.questions.length} questions`,
      });
    }

    const idOwners = new Map<number, number>();
    const questionTextOwners = new Map<string, number>();

    bank.questions.forEach((question, index) => {
      const existingIdIndex = idOwners.get(question.id);

      if (existingIdIndex !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["questions", index, "id"],
          message: `Duplicate ID ${question.id}; first used at questions.${existingIdIndex}.id`,
        });
      } else {
        idOwners.set(question.id, index);
      }

      const trimmedQuestion = question.question.trim();
      const existingTextId = questionTextOwners.get(trimmedQuestion);

      if (existingTextId !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["questions", index, "question"],
          message: `Duplicate trimmed question text; first used by ID ${existingTextId}`,
        });
      } else {
        questionTextOwners.set(trimmedQuestion, question.id);
      }
    });

    const missingIds = Array.from(
      { length: APPROVED_QUESTION_COUNT },
      (_, index) => index + 1,
    ).filter((id) => !idOwners.has(id));

    if (missingIds.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["questions"],
        message: `Missing question IDs: ${missingIds.join(", ")}`,
      });
    }
  });

export type CanonicalQuestion = z.infer<typeof canonicalQuestionSchema>;
export type CanonicalQuestionBank = z.infer<typeof questionBankSchema>;

export type QuestionBankAudit = {
  questionCount: number;
  categoryCounts: Record<string, number>;
  answerKeyCounts: Record<AnswerOption, number>;
};

export function parseQuestionBank(input: unknown): CanonicalQuestionBank {
  const result = questionBankSchema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "bank";
      return `- ${path}: ${issue.message}`;
    });

    throw new Error(`Rialo question bank validation failed:\n${issues.join("\n")}`);
  }

  return result.data;
}

export function auditQuestionBank(
  bank: CanonicalQuestionBank,
): QuestionBankAudit {
  const categoryCounts: Record<string, number> = {};
  const answerKeyCounts: Record<AnswerOption, number> = {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
  };

  for (const question of bank.questions) {
    categoryCounts[question.category] =
      (categoryCounts[question.category] ?? 0) + 1;
    answerKeyCounts[question.correctOption] += 1;
  }

  return {
    questionCount: bank.questions.length,
    categoryCounts,
    answerKeyCounts,
  };
}
