import { MAX_QUESTION_POINTS } from "./domain";

export const QUESTION_TIME_LIMIT_MS = 20_000;

export type QuestionOutcome = "correct" | "incorrect" | "timed_out";

export function calculateQuestionPoints(
  outcome: QuestionOutcome,
  remainingMs: number,
) {
  if (
    outcome !== "correct" ||
    !Number.isFinite(remainingMs) ||
    remainingMs <= 0
  ) {
    return 0;
  }

  const clampedRemainingMs = Math.min(remainingMs, QUESTION_TIME_LIMIT_MS);
  const points =
    100 +
    Math.floor((100 * clampedRemainingMs) / QUESTION_TIME_LIMIT_MS);

  return Math.min(points, MAX_QUESTION_POINTS);
}
