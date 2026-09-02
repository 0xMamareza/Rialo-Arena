import type { ArenaRankTier } from "@/server/leaderboard/rank-tiers";

export type QuizApiChoiceIndex = 0 | 1 | 2 | 3;
export type QuizApiChoiceLabel = "A" | "B" | "C" | "D";

type QuizApiTotals = {
  attemptId: string;
  questionCount: number;
  totalScore: number;
  correctCount: number;
  timeoutCount: number;
  serverNow: string;
};

export type QuizApiActiveState = QuizApiTotals & {
  status: "active";
  position: number;
  currentQuestion: {
    position: number;
    questionText: string;
    options: Array<{
      index: QuizApiChoiceIndex;
      label: QuizApiChoiceLabel;
      text: string;
    }>;
    activatedAt: string;
    deadlineAt: string;
  };
};

export type QuizApiReviewState = QuizApiTotals & {
  status: "review";
  position: number;
  currentQuestion: {
    position: number;
    questionText: string;
    options: Array<{
      index: QuizApiChoiceIndex;
      label: QuizApiChoiceLabel;
      text: string;
    }>;
  };
  review: {
    selectedChoiceIndex: QuizApiChoiceIndex;
    correctChoiceIndex: QuizApiChoiceIndex;
    wasCorrect: boolean;
    reviewEndsAt: string;
  };
};

export type QuizApiCompletedState = QuizApiTotals & {
  status: "completed";
  incorrectCount: number;
  tier: ArenaRankTier;
  completedAt: string;
};

export type QuizApiPlayerState =
  | QuizApiActiveState
  | QuizApiReviewState
  | QuizApiCompletedState;

export type QuizApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
};
