import type { NextRequest } from "next/server";

import { getLiveQuizState, startQuizAttempt } from "@/server/quiz/engine";
import {
  noLiveQuizAttemptResponse,
  quizStateResponse,
  withAuthenticatedQuizRequest,
} from "@/server/quiz/http";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  return withAuthenticatedQuizRequest(request, async (userId) => {
    const state = await getLiveQuizState(userId);
    return state ? quizStateResponse(state) : noLiveQuizAttemptResponse();
  });
}

export function POST(request: NextRequest) {
  return withAuthenticatedQuizRequest(request, async (userId) => {
    const state = await startQuizAttempt(userId);
    return quizStateResponse(state);
  });
}
