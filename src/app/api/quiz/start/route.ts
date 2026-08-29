import type { NextRequest } from "next/server";

import { startQuizAttempt } from "@/server/quiz/engine";
import {
  quizStateResponse,
  withAuthenticatedQuizRequest,
} from "@/server/quiz/http";

export const runtime = "nodejs";

export function POST(request: NextRequest) {
  return withAuthenticatedQuizRequest(request, async (userId) => {
    const state = await startQuizAttempt(userId);
    return quizStateResponse(state);
  });
}