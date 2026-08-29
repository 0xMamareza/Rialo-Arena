import type { ArenaRankTier } from "@/server/leaderboard/rank-tiers";

export type LeaderboardEntry = {
  rank: number;
  xUsername: string;
  profileImageUrl: string;
  score: number;
  correctCount: number;
  timeoutCount: number;
  tier: ArenaRankTier;
};

export type LeaderboardResponse = {
  entries: LeaderboardEntry[];
};

export type PersonalBestRun = {
  score: number;
  correctCount: number;
  timeoutCount: number;
};

export type PersonalBestStats = {
  personalBest: PersonalBestRun | null;
  completedAttemptsCount: number;
  globalRank: number | null;
  tier: ArenaRankTier | null;
};

export type LeaderboardApiErrorBody = {
  error: {
    code:
      | "UNAUTHORIZED"
      | "INVALID_REQUEST"
      | "RATE_LIMITED"
      | "INTERNAL_ERROR";
    message: string;
  };
};
