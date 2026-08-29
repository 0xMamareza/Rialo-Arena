import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import type {
  LeaderboardApiErrorBody,
  LeaderboardResponse,
  PersonalBestStats,
} from "@/lib/leaderboard/api-types";
import { getCurrentUserFromRequest } from "@/server/identity/current-user";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" } as const;
const PUBLIC_HEADERS = { "Cache-Control": "no-store" } as const;

function errorResponse(
  code: LeaderboardApiErrorBody["error"]["code"],
  message: string,
  status: number,
) {
  return NextResponse.json<LeaderboardApiErrorBody>(
    { error: { code, message } },
    { status, headers: PRIVATE_HEADERS },
  );
}

export function invalidLeaderboardRequest() {
  return errorResponse(
    "INVALID_REQUEST",
    "limit must be an integer between 1 and 100.",
    400,
  );
}

export function leaderboardResponse(entries: LeaderboardResponse["entries"]) {
  return NextResponse.json<LeaderboardResponse>(
    { entries },
    { headers: PUBLIC_HEADERS },
  );
}

export async function withAuthenticatedStatsRequest(
  request: NextRequest,
  operation: (userId: string) => Promise<PersonalBestStats>,
) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return errorResponse("UNAUTHORIZED", "Authentication is required.", 401);
    }

    return NextResponse.json(await operation(user.id), {
      headers: PRIVATE_HEADERS,
    });
  } catch {
    return errorResponse(
      "INTERNAL_ERROR",
      "Player statistics could not be loaded.",
      500,
    );
  }
}

export function leaderboardFailure() {
  return errorResponse(
    "INTERNAL_ERROR",
    "The leaderboard could not be loaded.",
    500,
  );
}
