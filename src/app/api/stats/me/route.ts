import type { NextRequest } from "next/server";

import { getPersonalBestStats } from "@/server/leaderboard/queries";
import { withAuthenticatedStatsRequest } from "@/server/leaderboard/http";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  return withAuthenticatedStatsRequest(request, getPersonalBestStats);
}
