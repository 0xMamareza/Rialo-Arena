import "server-only";

import { MAX_QUIZ_SCORE } from "@/lib/quiz/domain";

const arenaRankTiers = [
  { name: "Explorer", minimumScore: 0, maximumScore: 999 },
  { name: "Builder", minimumScore: 1000, maximumScore: 1499 },
  { name: "Operator", minimumScore: 1500, maximumScore: 1999 },
  { name: "Architect", minimumScore: 2000, maximumScore: 2399 },
  { name: "Vanguard", minimumScore: 2400, maximumScore: 2699 },
  { name: "Apex", minimumScore: 2700, maximumScore: 3000 },
] as const;

export type ArenaRankTier = (typeof arenaRankTiers)[number]["name"];

export function getArenaRankTier(score: number): ArenaRankTier {
  if (
    !Number.isInteger(score) ||
    score < 0 ||
    score > MAX_QUIZ_SCORE
  ) {
    throw new RangeError(
      `Arena rank score must be an integer between 0 and ${MAX_QUIZ_SCORE}.`,
    );
  }

  const tier = arenaRankTiers.find(
    ({ minimumScore, maximumScore }) =>
      score >= minimumScore && score <= maximumScore,
  );

  if (!tier) {
    throw new RangeError("Arena rank score does not map to a tier.");
  }

  return tier.name;
}
