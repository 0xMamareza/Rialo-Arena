import { z } from "zod";

export const ANSWER_OPTIONS = ["A", "B", "C", "D"] as const;
export const QUIZ_ATTEMPT_STATUSES = [
  "created",
  "active",
  "completed",
  "expired",
  "abandoned",
] as const;
export const ATTEMPT_QUESTION_STATUSES = [
  "pending",
  "active",
  "answered",
  "timed_out",
] as const;

export const QUIZ_QUESTION_COUNT = 15;
export const MAX_QUESTION_POINTS = 200;
export const MAX_QUIZ_SCORE = QUIZ_QUESTION_COUNT * MAX_QUESTION_POINTS;

export const answerOptionSchema = z.enum(ANSWER_OPTIONS);
export const quizAttemptStatusSchema = z.enum(QUIZ_ATTEMPT_STATUSES);
export const attemptQuestionStatusSchema = z.enum(
  ATTEMPT_QUESTION_STATUSES,
);
export const quizPositionSchema = z
  .number()
  .int()
  .min(1)
  .max(QUIZ_QUESTION_COUNT);
export const questionPointsSchema = z
  .number()
  .int()
  .min(0)
  .max(MAX_QUESTION_POINTS);
export const quizScoreSchema = z
  .number()
  .int()
  .min(0)
  .max(MAX_QUIZ_SCORE);

export type AnswerOption = z.infer<typeof answerOptionSchema>;
export type QuizAttemptStatus = z.infer<typeof quizAttemptStatusSchema>;
export type AttemptQuestionStatus = z.infer<
  typeof attemptQuestionStatusSchema
>;
