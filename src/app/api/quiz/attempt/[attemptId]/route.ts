import type { NextRequest } from "next/server";

import { getQuizState } from "@/server/quiz/engine";
import {
  quizStateResponse,
  withAuthenticatedQuizRequest,
} from "@/server/quiz/http";
import { QUIZ_STATE_RATE_LIMIT } from "@/server/rate-limit/limiter";

type AttemptRouteContext = {
  params: Promise<{ attemptId: string }>;
};

export const runtime = "nodejs";

export function GET(request: NextRequest, context: AttemptRouteContext) {
  return withAuthenticatedQuizRequest(
    request,
    async (userId) => {
      const { attemptId } = await context.params;
      const state = await getQuizState(userId, attemptId);
      return quizStateResponse(state);
    },
    QUIZ_STATE_RATE_LIMIT,
  );
}
