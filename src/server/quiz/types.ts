export const QUIZ_ENGINE_ERROR_CODES = [
  "USER_NOT_FOUND",
  "ATTEMPT_NOT_FOUND",
  "ATTEMPT_COMPLETED",
  "INVALID_IDENTIFIER",
  "INVALID_CHOICE",
  "STALE_QUESTION",
  "INSUFFICIENT_ACTIVE_QUESTIONS",
  "INVALID_STATE",
  "INTERNAL_ERROR",
] as const;

export type QuizEngineErrorCode = (typeof QUIZ_ENGINE_ERROR_CODES)[number];

export class QuizEngineError extends Error {
  readonly code: QuizEngineErrorCode;

  constructor(code: QuizEngineErrorCode, message: string) {
    super(message);
    this.name = "QuizEngineError";
    this.code = code;
  }
}

export type DisplayChoiceIndex = 0 | 1 | 2 | 3;
export type DisplayChoiceLabel = "A" | "B" | "C" | "D";

export type PlayerQuestionOption = {
  index: DisplayChoiceIndex;
  label: DisplayChoiceLabel;
  text: string;
};

export type PlayerCurrentQuestion = {
  attemptQuestionId: string;
  position: number;
  questionText: string;
  options: PlayerQuestionOption[];
  activatedAt: string;
  deadlineAt: string;
};

export type PlayerReviewQuestion = Omit<
  PlayerCurrentQuestion,
  "activatedAt" | "deadlineAt"
>;

type PlayerQuizTotals = {
  attemptId: string;
  questionCount: number;
  totalScore: number;
  correctCount: number;
  timeoutCount: number;
  serverNow: string;
};

export type ActivePlayerQuizState = PlayerQuizTotals & {
  status: "active";
  position: number;
  currentQuestion: PlayerCurrentQuestion;
};

export type ReviewPlayerQuizState = PlayerQuizTotals & {
  status: "review";
  position: number;
  currentQuestion: PlayerReviewQuestion;
  review: {
    selectedChoiceIndex: DisplayChoiceIndex;
    correctChoiceIndex: DisplayChoiceIndex;
    wasCorrect: boolean;
    reviewEndsAt: string;
  };
};

export type CompletedPlayerQuizState = PlayerQuizTotals & {
  status: "completed";
  incorrectCount: number;
  completedAt: string;
};

export type PlayerQuizState =
  | ActivePlayerQuizState
  | ReviewPlayerQuizState
  | CompletedPlayerQuizState;

export type SubmitQuizAnswerInput = {
  userId: string;
  attemptId: string;
  attemptQuestionId: string;
  choiceIndex: number;
};
