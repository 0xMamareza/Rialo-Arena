import type { NextRequest } from "next/server";

import { getLiveQuizState, startQuizAttempt } from "@/server/quiz/engine";
import {
  noLiveQuizAttemptResponse,
  quizStateResponse,
  withAuthenticatedQuizRequest,
} from "@/server/quiz/http";
import { QUIZ_START_RATE_LIMIT } from "@/server/rate-limit/limiter";
import { validateMutationOrigin } from "@/server/security/mutation-origin";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  return withAuthenticatedQuizRequest(
    request,
    async (userId) => {
      const state = await getLiveQuizState(userId);
      return state ? quizStateResponse(state) : noLiveQuizAttemptResponse();
    },
    QUIZ_START_RATE_LIMIT,
  );
}

export function POST(request: NextRequest) {
  const originRejection = validateMutationOrigin(request);

  if (originRejection) {
    return originRejection;
  }

  return withAuthenticatedQuizRequest(
    request,
    async (userId) => {
      const state = await startQuizAttempt(userId);
      return quizStateResponse(state);
    },
    QUIZ_START_RATE_LIMIT,
  );
}
