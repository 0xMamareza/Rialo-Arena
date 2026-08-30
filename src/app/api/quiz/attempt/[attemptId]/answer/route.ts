import type { NextRequest } from "next/server";
import { z } from "zod";

import { readLimitedJson } from "@/server/http/json-body";
import { getQuizState, submitQuizAnswer } from "@/server/quiz/engine";
import { QuizEngineError } from "@/server/quiz/types";
import { QUIZ_ANSWER_RATE_LIMIT } from "@/server/rate-limit/limiter";
import {
  invalidQuizRequest,
  quizPreconditionRequired,
  quizRequestTooLarge,
  quizStateResponse,
  requestMatchesQuizState,
  staleQuizState,
  withAuthenticatedQuizRequest,
} from "@/server/quiz/http";
import { validateMutationOrigin } from "@/server/security/mutation-origin";

type AttemptRouteContext = {
  params: Promise<{ attemptId: string }>;
};

const answerRequestSchema = z
  .object({ choiceIndex: z.number().int().min(0).max(3) })
  .strict();

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: AttemptRouteContext) {
  const originRejection = validateMutationOrigin(request);

  if (originRejection) {
    return originRejection;
  }

  const jsonBody = await readLimitedJson(request);

  if (!jsonBody.ok) {
    return jsonBody.reason === "too-large"
      ? quizRequestTooLarge()
      : invalidQuizRequest();
  }

  return withAuthenticatedQuizRequest(
    request,
    async (userId) => {
      const parsedBody = answerRequestSchema.safeParse(jsonBody.value);

      if (!parsedBody.success) {
        return invalidQuizRequest("choiceIndex must be 0, 1, 2, or 3.");
      }

      const { attemptId } = await context.params;
      const currentState = await getQuizState(userId, attemptId);

      if (currentState.status === "completed") {
        throw new QuizEngineError(
          "ATTEMPT_COMPLETED",
          "Quiz attempt is already completed.",
        );
      }

      if (!request.headers.has("if-match")) {
        return quizPreconditionRequired();
      }

      if (!requestMatchesQuizState(request, currentState)) {
        return staleQuizState();
      }

      const state = await submitQuizAnswer({
        userId,
        attemptId,
        attemptQuestionId: currentState.currentQuestion.attemptQuestionId,
        choiceIndex: parsedBody.data.choiceIndex,
      });

      return quizStateResponse(state);
    },
    QUIZ_ANSWER_RATE_LIMIT,
  );
}
