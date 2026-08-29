import type { NextRequest } from "next/server";
import { z } from "zod";

import { getGlobalLeaderboard } from "@/server/leaderboard/queries";
import {
  invalidLeaderboardRequest,
  leaderboardFailure,
  leaderboardResponse,
} from "@/server/leaderboard/http";

const DEFAULT_LIMIT = 50;
const limitSchema = z.coerce.number().int().min(1).max(100);

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const limitValues = request.nextUrl.searchParams.getAll("limit");

  if (limitValues.length > 1) {
    return invalidLeaderboardRequest();
  }

  const parsedLimit = limitValues.length === 0
    ? { success: true as const, data: DEFAULT_LIMIT }
    : limitSchema.safeParse(limitValues[0]);

  if (!parsedLimit.success) {
    return invalidLeaderboardRequest();
  }

  try {
    return leaderboardResponse(
      await getGlobalLeaderboard(parsedLimit.data),
    );
  } catch {
    return leaderboardFailure();
  }
}
