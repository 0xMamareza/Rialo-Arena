import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUserFromRequest } from "@/server/identity/current-user";

import {
  QuizEngineError,
  type ActivePlayerQuizState,
  type CompletedPlayerQuizState,
  type PlayerCurrentQuestion,
  type PlayerQuizState,
} from "./types";

export type QuizApiPlayerState =
  | (Omit<ActivePlayerQuizState, "currentQuestion"> & {
      currentQuestion: Omit<PlayerCurrentQuestion, "attemptQuestionId">;
    })
  | CompletedPlayerQuizState;

export type QuizApiErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_REQUEST"
  | "ATTEMPT_NOT_FOUND"
  | "ATTEMPT_COMPLETED"
  | "STALE_QUESTION"
  | "PRECONDITION_REQUIRED"
  | "QUIZ_UNAVAILABLE"
  | "INTERNAL_ERROR";

type QuizApiErrorBody = {
  error: {
    code: QuizApiErrorCode;
    message: string;
  };
};

const JSON_HEADERS = { "Cache-Control": "private, no-store" } as const;

function errorResponse(code: QuizApiErrorCode, message: string, status: number) {
  return NextResponse.json<QuizApiErrorBody>(
    { error: { code, message } },
    { status, headers: JSON_HEADERS },
  );
}

export function invalidQuizRequest(message = "Request body is invalid.") {
  return errorResponse("INVALID_REQUEST", message, 400);
}

export function quizStateTag(state: PlayerQuizState) {
  const source = state.status === "active"
    ? state.currentQuestion.attemptQuestionId
    : `${state.attemptId}:${state.completedAt}`;
  const digest = createHash("sha256").update(source).digest("base64url");

  return `"${digest}"`;
}

export function quizStateResponse(state: PlayerQuizState) {
  let playerState: QuizApiPlayerState = state;

  if (state.status === "active") {
    playerState = {
      ...state,
      currentQuestion: {
        position: state.currentQuestion.position,
        questionText: state.currentQuestion.questionText,
        options: state.currentQuestion.options,
        activatedAt: state.currentQuestion.activatedAt,
        deadlineAt: state.currentQuestion.deadlineAt,
      },
    };
  }

  return NextResponse.json(playerState, {
    headers: {
      ...JSON_HEADERS,
      ETag: quizStateTag(state),
    },
  });
}

export function requestMatchesQuizState(request: NextRequest, state: PlayerQuizState) {
  const candidate = request.headers.get("if-match");

  if (!candidate) {
    return false;
  }

  const expected = Buffer.from(quizStateTag(state));
  const received = Buffer.from(candidate.trim());

  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function withAuthenticatedQuizRequest(
  request: NextRequest,
  operation: (userId: string) => Promise<NextResponse>,
) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return errorResponse("UNAUTHORIZED", "Authentication is required.", 401);
    }

    return await operation(user.id);
  } catch (error) {
    if (!(error instanceof QuizEngineError)) {
      return errorResponse(
        "INTERNAL_ERROR",
        "The quiz request could not be completed.",
        500,
      );
    }

    switch (error.code) {
      case "INVALID_IDENTIFIER":
      case "INVALID_CHOICE":
        return invalidQuizRequest();
      case "ATTEMPT_NOT_FOUND":
        return errorResponse(
          "ATTEMPT_NOT_FOUND",
          "Quiz attempt was not found.",
          404,
        );
      case "ATTEMPT_COMPLETED":
        return errorResponse(
          "ATTEMPT_COMPLETED",
          "Quiz attempt is already completed.",
          409,
        );
      case "STALE_QUESTION":
        return errorResponse(
          "STALE_QUESTION",
          "The submitted question is no longer current.",
          409,
        );
      case "INSUFFICIENT_ACTIVE_QUESTIONS":
        return errorResponse(
          "QUIZ_UNAVAILABLE",
          "The quiz is temporarily unavailable.",
          503,
        );
      case "USER_NOT_FOUND":
        return errorResponse("UNAUTHORIZED", "Authentication is required.", 401);
      case "INVALID_STATE":
      case "INTERNAL_ERROR":
      default:
        return errorResponse(
          "INTERNAL_ERROR",
          "The quiz request could not be completed.",
          500,
        );
    }
  }
}

export function quizPreconditionRequired() {
  return errorResponse(
    "PRECONDITION_REQUIRED",
    "Refresh the current quiz state before answering.",
    428,
  );
}

export function staleQuizState() {
  return errorResponse(
    "STALE_QUESTION",
    "The submitted question is no longer current.",
    409,
  );
}