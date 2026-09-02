"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { RIALO_AVATAR_FALLBACK_PATH } from "@/lib/identity/username";
import type { PersonalBestStats } from "@/lib/leaderboard/api-types";
import { ANSWER_REVIEW_DURATION_MS } from "@/lib/quiz/domain";
import type {
  QuizApiChoiceIndex,
  QuizApiErrorBody,
  QuizApiPlayerState,
} from "@/lib/quiz/api-types";

import { ResultCardGenerator } from "./_components/result-card-generator";
import styles from "./quiz.module.css";

const DISPLAY_QUESTION_WINDOW_MS = 20_000;
const MAXIMUM_SCORE = 3_000;

type QuizScreen = "ready" | "loading" | "playing" | "completed" | "error";

type PersonalStatsLoadState =
  | { status: "idle" }
  | { status: "ready"; attemptId: string; stats: PersonalBestStats }
  | { status: "error"; attemptId: string };

type QuizPlayerProps = {
  className: string;
  initialAttemptId: string | null;
  profile: {
    username: string;
    profileImageUrl: string;
  };
};

type SyncedClock = {
  serverNowMs: number;
  deadlineMs: number;
  receivedAt: number;
};

class QuizRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "QuizRequestError";
    this.status = status;
    this.code = code;
  }
}

function isQuizApiState(value: unknown): value is QuizApiPlayerState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.attemptId !== "string" ||
    candidate.questionCount !== 15 ||
    typeof candidate.totalScore !== "number" ||
    typeof candidate.correctCount !== "number" ||
    typeof candidate.timeoutCount !== "number" ||
    typeof candidate.serverNow !== "string"
  ) {
    return false;
  }

  if (candidate.status === "completed") {
    return (
      typeof candidate.incorrectCount === "number" &&
      typeof candidate.tier === "string" &&
      ARENA_TIERS.has(candidate.tier) &&
      typeof candidate.completedAt === "string"
    );
  }

  if (
    (candidate.status !== "active" && candidate.status !== "review") ||
    typeof candidate.position !== "number"
  ) {
    return false;
  }

  const question = candidate.currentQuestion;
  if (!question || typeof question !== "object") return false;
  const current = question as Record<string, unknown>;

  const questionIsValid =
    typeof current.position === "number" &&
    typeof current.questionText === "string" &&
    Array.isArray(current.options) &&
    current.options.length === 4 &&
    current.options.every((option, index) => {
      if (!option || typeof option !== "object") return false;
      const choice = option as Record<string, unknown>;
      return (
        choice.index === index &&
        choice.label === ["A", "B", "C", "D"][index] &&
        typeof choice.text === "string"
      );
    });

  if (!questionIsValid) return false;

  if (candidate.status === "active") {
    return (
      typeof current.activatedAt === "string" &&
      typeof current.deadlineAt === "string"
    );
  }

  const review = candidate.review;
  if (!review || typeof review !== "object") return false;
  const result = review as Record<string, unknown>;

  return (
    Number.isInteger(result.selectedChoiceIndex) &&
    Number(result.selectedChoiceIndex) >= 0 &&
    Number(result.selectedChoiceIndex) <= 3 &&
    Number.isInteger(result.correctChoiceIndex) &&
    Number(result.correctChoiceIndex) >= 0 &&
    Number(result.correctChoiceIndex) <= 3 &&
    typeof result.wasCorrect === "boolean" &&
    typeof result.reviewEndsAt === "string"
  );
}

async function parseQuizResponse(response: Response) {
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const apiError = body as QuizApiErrorBody | null;
    throw new QuizRequestError(
      response.status,
      apiError?.error?.code ?? "INTERNAL_ERROR",
      apiError?.error?.message ?? "The Arena could not complete this request.",
    );
  }

  if (!isQuizApiState(body)) {
    throw new QuizRequestError(
      500,
      "INVALID_RESPONSE",
      "The Arena returned an invalid player state.",
    );
  }

  const etag = response.headers.get("etag");
  if (!etag) {
    throw new QuizRequestError(
      500,
      "INVALID_RESPONSE",
      "The Arena returned a state without a concurrency tag.",
    );
  }

  return { state: body, etag };
}

function formatQuestionPosition(position: number, count: number) {
  return `${String(position).padStart(2, "0")} / ${String(count).padStart(2, "0")}`;
}

const ARENA_TIERS = new Set([
  "Explorer",
  "Builder",
  "Operator",
  "Architect",
  "Vanguard",
  "Apex",
]);

function isPersonalBestStats(value: unknown): value is PersonalBestStats {
  if (!value || typeof value !== "object") return false;
  const stats = value as Record<string, unknown>;
  const best = stats.personalBest;
  const bestRecord = best as Record<string, unknown> | null;
  const bestIsValid =
    best === null ||
    (best !== null &&
      typeof best === "object" &&
      typeof bestRecord?.score === "number" &&
      Number.isInteger(bestRecord.score) &&
      bestRecord.score >= 0 &&
      bestRecord.score <= MAXIMUM_SCORE &&
      typeof bestRecord.correctCount === "number" &&
      Number.isInteger(bestRecord.correctCount) &&
      typeof bestRecord.timeoutCount === "number" &&
      Number.isInteger(bestRecord.timeoutCount));
  const tierIsValid =
    stats.tier === null ||
    (typeof stats.tier === "string" && ARENA_TIERS.has(stats.tier));

  return (
    bestIsValid &&
    typeof stats.completedAttemptsCount === "number" &&
    Number.isInteger(stats.completedAttemptsCount) &&
    stats.completedAttemptsCount >= 0 &&
    (stats.globalRank === null ||
      (typeof stats.globalRank === "number" &&
        Number.isInteger(stats.globalRank) &&
        stats.globalRank > 0)) &&
    tierIsValid
  );
}

export function QuizPlayer({
  className,
  initialAttemptId,
  profile,
}: QuizPlayerProps) {
  const router = useRouter();
  const [screen, setScreen] = useState<QuizScreen>("loading");
  const [quizState, setQuizState] = useState<QuizApiPlayerState | null>(null);
  const [remainingMs, setRemainingMs] = useState(DISPLAY_QUESTION_WINDOW_MS);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestPending, setRequestPending] = useState(false);
  const [personalStatsState, setPersonalStatsState] =
    useState<PersonalStatsLoadState>({ status: "idle" });
  const etagRef = useRef<string | null>(null);
  const attemptIdRef = useRef<string | null>(initialAttemptId);
  const clockRef = useRef<SyncedClock | null>(null);
  const pendingRef = useRef(false);
  const timeoutSyncTagRef = useRef<string | null>(null);

  const routeToIdentity = useCallback(() => {
    const identityDestination = attemptIdRef.current
      ? `/?quiz=1&attempt=${encodeURIComponent(attemptIdRef.current)}`
      : "/?quiz=1";
    router.replace(identityDestination);
  }, [router]);

  const applyAuthoritativeState = useCallback(
    (state: QuizApiPlayerState, etag: string) => {
      etagRef.current = etag;
      attemptIdRef.current = state.attemptId;
      timeoutSyncTagRef.current = null;
      setQuizState(state);
      setErrorMessage(null);

      if (state.status === "active" || state.status === "review") {
        const serverNowMs = Date.parse(state.serverNow);
        const deadlineMs = Date.parse(
          state.status === "active"
            ? state.currentQuestion.deadlineAt
            : state.review.reviewEndsAt,
        );
        clockRef.current = {
          serverNowMs,
          deadlineMs,
          receivedAt: performance.now(),
        };
        setRemainingMs(Math.max(0, deadlineMs - serverNowMs));
        setScreen("playing");
      } else {
        clockRef.current = null;
        setRemainingMs(0);
        setScreen("completed");
      }
    },
    [],
  );

  const fetchAttempt = useCallback(
    async (
      attemptId: string,
      reason: "restore" | "resync" | "timeout" | "review",
    ) => {
      const response = await fetch(
        `/api/quiz/attempt/${encodeURIComponent(attemptId)}`,
        {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        },
      );
      const result = await parseQuizResponse(response);
      applyAuthoritativeState(result.state, result.etag);

      if (reason === "timeout") {
        setNotice("Time expired. The server advanced the attempt.");
      } else if (reason === "review") {
        setNotice(null);
      } else if (reason === "resync") {
        setNotice("Attempt synchronized with the server.");
      }

      return result.state;
    },
    [applyAuthoritativeState],
  );

  const handleRequestFailure = useCallback(
    (error: unknown, fallback: string) => {
      if (error instanceof QuizRequestError && error.status === 401) {
        routeToIdentity();
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : fallback);
    },
    [routeToIdentity],
  );

  const discoverLiveAttempt = useCallback(async () => {
    const response = await fetch("/api/quiz/start", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    });

    if (response.status === 204) {
      etagRef.current = null;
      attemptIdRef.current = null;
      clockRef.current = null;
      setQuizState(null);
      setNotice(null);
      setErrorMessage(null);
      setScreen("ready");
      return null;
    }

    const result = await parseQuizResponse(response);
    applyAuthoritativeState(result.state, result.etag);
    router.replace(
      `/quiz?attempt=${encodeURIComponent(result.state.attemptId)}`,
      { scroll: false },
    );
    return result.state;
  }, [applyAuthoritativeState, router]);

  useEffect(() => {
    if (initialAttemptId) return;

    let cancelled = false;
    const recoveryTask = window.setTimeout(() => {
      void discoverLiveAttempt().catch((error: unknown) => {
        if (cancelled) return;
        handleRequestFailure(
          error,
          "The Arena could not check for an active attempt.",
        );
        setScreen("error");
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(recoveryTask);
    };
  }, [discoverLiveAttempt, handleRequestFailure, initialAttemptId]);

  useEffect(() => {
    if (!initialAttemptId || quizState?.attemptId === initialAttemptId) return;

    let cancelled = false;
    const restoreTask = window.setTimeout(() => {
      void fetchAttempt(initialAttemptId, "restore").catch((error: unknown) => {
        if (cancelled) return;

        if (error instanceof QuizRequestError && error.status === 404) {
          attemptIdRef.current = null;
          setQuizState(null);
          setScreen("ready");
          setErrorMessage(
            "That attempt is unavailable. Start a new Arena run when ready.",
          );
          router.replace("/quiz");
          return;
        }

        handleRequestFailure(error, "The Arena could not restore this attempt.");
        setScreen("error");
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(restoreTask);
    };
  }, [
    fetchAttempt,
    handleRequestFailure,
    initialAttemptId,
    quizState?.attemptId,
    router,
  ]);

  const completedAttemptId =
    quizState?.status === "completed" ? quizState.attemptId : null;

  useEffect(() => {
    if (!completedAttemptId) return;

    const attemptId = completedAttemptId;
    const controller = new AbortController();

    async function loadPersonalStats() {
      try {
        const response = await fetch("/api/stats/me", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        const body: unknown = await response.json().catch(() => null);

        if (!response.ok || !isPersonalBestStats(body)) {
          throw new Error("Personal stats are unavailable.");
        }

        setPersonalStatsState({
          status: "ready",
          attemptId,
          stats: body,
        });
      } catch {
        if (controller.signal.aborted) return;
        setPersonalStatsState({
          status: "error",
          attemptId,
        });
      }
    }

    void loadPersonalStats();
    return () => controller.abort();
  }, [completedAttemptId]);

  const startAttempt = async () => {
    if (pendingRef.current) return;

    const previousScreen = screen;
    pendingRef.current = true;
    setRequestPending(true);
    setNotice(null);
    setErrorMessage(null);
    setScreen("loading");

    try {
      const response = await fetch("/api/quiz/start", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
      });
      const result = await parseQuizResponse(response);
      applyAuthoritativeState(result.state, result.etag);
      router.replace(`/quiz?attempt=${encodeURIComponent(result.state.attemptId)}`, {
        scroll: false,
      });
    } catch (error) {
      handleRequestFailure(error, "The Arena could not start a new attempt.");
      setScreen(previousScreen === "completed" ? "completed" : "ready");
    } finally {
      pendingRef.current = false;
      setRequestPending(false);
    }
  };

  const resyncCurrentAttempt = useCallback(
    async (reason: "resync" | "timeout" | "review") => {
      if (!quizState || pendingRef.current) return;

      pendingRef.current = true;
      setRequestPending(true);
      try {
        await fetchAttempt(quizState.attemptId, reason);
      } catch (error) {
      handleRequestFailure(
        error,
        "The Arena could not synchronize this attempt.",
      );
      } finally {
        pendingRef.current = false;
        setRequestPending(false);
      }
    },
    [fetchAttempt, handleRequestFailure, quizState],
  );

  useEffect(() => {
    if (
      screen !== "playing" ||
      (quizState?.status !== "active" && quizState?.status !== "review")
    ) {
      return;
    }

    const updateCountdown = () => {
      const clock = clockRef.current;
      if (!clock) return;

      const estimatedServerNow =
        clock.serverNowMs + (performance.now() - clock.receivedAt);
      const nextRemaining = Math.max(0, clock.deadlineMs - estimatedServerNow);
      setRemainingMs(nextRemaining);

      if (
        nextRemaining === 0 &&
        !pendingRef.current &&
        timeoutSyncTagRef.current !== etagRef.current
      ) {
        timeoutSyncTagRef.current = etagRef.current;
        void resyncCurrentAttempt(
          quizState.status === "review" ? "review" : "timeout",
        );
      }
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 100);
    return () => window.clearInterval(interval);
  }, [quizState, resyncCurrentAttempt, screen]);

  useEffect(() => {
    if (
      screen !== "playing" ||
      (quizState?.status !== "active" && quizState?.status !== "review")
    ) {
      return;
    }

    const synchronizeAfterInterruption = () => {
      if (document.visibilityState === "visible" && !pendingRef.current) {
        void resyncCurrentAttempt("resync");
      }
    };

    document.addEventListener("visibilitychange", synchronizeAfterInterruption);
    window.addEventListener("pageshow", synchronizeAfterInterruption);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        synchronizeAfterInterruption,
      );
      window.removeEventListener("pageshow", synchronizeAfterInterruption);
    };
  }, [quizState, resyncCurrentAttempt, screen]);

  const submitChoice = async (choiceIndex: QuizApiChoiceIndex) => {
    if (
      pendingRef.current ||
      quizState?.status !== "active" ||
      remainingMs <= 0 ||
      !etagRef.current
    ) {
      return;
    }

    pendingRef.current = true;
    setRequestPending(true);
    setNotice("Locking answer with the server...");
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/quiz/answer/${encodeURIComponent(quizState.attemptId)}`,
        {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "If-Match": etagRef.current,
          },
          body: JSON.stringify({ choiceIndex }),
        },
      );

      if (response.status === 409 || response.status === 428) {
        await fetchAttempt(quizState.attemptId, "resync");
        setNotice("The attempt already advanced. Authoritative state restored.");
        return;
      }

      const result = await parseQuizResponse(response);
      applyAuthoritativeState(result.state, result.etag);
      setNotice(
        result.state.status === "review"
          ? result.state.review.wasCorrect
            ? "Correct. Next question in three seconds."
            : "Answer recorded. Correct option shown."
          : null,
      );
    } catch (error) {
      if (error instanceof QuizRequestError && error.status === 401) {
        routeToIdentity();
        return;
      }

      setNotice("Connection interrupted. Synchronize before trying again.");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The Arena could not record this answer.",
      );
    } finally {
      pendingRef.current = false;
      setRequestPending(false);
    }
  };

  const retrySynchronization = async () => {
    if (quizState) {
      await resyncCurrentAttempt("resync");
    } else if (initialAttemptId) {
      setScreen("loading");
      try {
        await fetchAttempt(initialAttemptId, "restore");
      } catch (error) {
        handleRequestFailure(error, "The Arena could not restore this attempt.");
        setScreen("error");
      }
    } else {
      setScreen("loading");
      try {
        await discoverLiveAttempt();
      } catch (error) {
        handleRequestFailure(
          error,
          "The Arena could not check for an active attempt.",
        );
        setScreen("error");
      }
    }
  };

  const questionState =
    quizState?.status === "active" || quizState?.status === "review"
      ? quizState
      : null;
  const isReview = questionState?.status === "review";
  const secondsRemaining = Math.max(0, Math.ceil(remainingMs / 1_000));
  const displayedWindowMs = isReview
    ? ANSWER_REVIEW_DURATION_MS
    : DISPLAY_QUESTION_WINDOW_MS;
  const timerProgress = Math.max(
    0,
    Math.min(1, remainingMs / displayedWindowMs),
  );
  const timerStyle = {
    "--timer-progress": `${timerProgress * 360}deg`,
  } as CSSProperties;
  const displayedPersonalStatsState =
    personalStatsState.status !== "idle" &&
    personalStatsState.attemptId === completedAttemptId
      ? personalStatsState
      : ({ status: "loading" } as const);

  return (
    <main className={`${styles.quizPage} ${className}`}>
      <div className={styles.background} aria-hidden="true">
        <Image
          src="/arena/rialo-arena-background.png"
          alt=""
          fill
          priority
          sizes="100vw"
        />
      </div>

      <header className={styles.header}>
        <Link href="/" aria-label="Return to Rialo Arena">
          <Image
            src="/brand/rialo/rialo-lockup-off-white.svg"
            alt="Rialo"
            width={496}
            height={182}
            priority
          />
        </Link>
        <span className={styles.arenaLabel}>Arena / Live run</span>
        <div className={styles.profile}>
          {/* Browser-direct avatar matches the existing identity flow. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.profileImageUrl}
            alt=""
            width="36"
            height="36"
            referrerPolicy="no-referrer"
            onError={(event) => {
              event.currentTarget.src = RIALO_AVATAR_FALLBACK_PATH;
            }}
          />
          <span>@{profile.username}</span>
        </div>
      </header>

      {screen === "ready" ? (
        <section className={styles.entry} aria-labelledby="quiz-entry-title">
          <span className={styles.eyebrow}>Authenticated challenge</span>
          <h1 id="quiz-entry-title">Enter when focused.</h1>
          <p>
            Fifteen random questions. Twenty seconds each. Once a question is
            active, the server clock keeps moving.
          </p>
          {errorMessage ? <p className={styles.error} role="alert">{errorMessage}</p> : null}
          <button type="button" onClick={startAttempt} disabled={requestPending}>
            {requestPending ? "Preparing attempt" : "Start quiz"}
            <span aria-hidden="true">→</span>
          </button>
          <Link href="/">Return to Arena</Link>
        </section>
      ) : null}

      {screen === "loading" ? (
        <section className={styles.loading} aria-live="polite" aria-busy="true">
          <span className={styles.loadingMark} />
          <p>Synchronizing with the Arena</p>
        </section>
      ) : null}

      {screen === "error" ? (
        <section className={styles.errorState} role="alert">
          <span className={styles.eyebrow}>Connection state</span>
          <h1>Run paused.</h1>
          <p>{errorMessage ?? "The Arena could not restore this attempt."}</p>
          <button type="button" onClick={retrySynchronization} disabled={requestPending}>
            Retry synchronization
          </button>
          <Link href="/">Return to Arena</Link>
        </section>
      ) : null}

      {screen === "playing" && questionState ? (
        <section className={styles.play} aria-labelledby="current-question">
          <div className={styles.runMeta}>
            <div>
              <span>Question</span>
              <strong>{formatQuestionPosition(questionState.position, questionState.questionCount)}</strong>
            </div>
            <div>
              <span>Current score</span>
              <strong>{questionState.totalScore.toLocaleString("en-US")}</strong>
            </div>
          </div>

          <div className={styles.progress} aria-label={`${questionState.position} of ${questionState.questionCount} questions`}>
            {Array.from({ length: questionState.questionCount }, (_, index) => (
              <span
                key={index}
                data-state={
                  index + 1 < questionState.position
                    ? "complete"
                    : index + 1 === questionState.position
                      ? "current"
                      : "upcoming"
                }
              />
            ))}
          </div>

          <div className={styles.questionLayout}>
            <div className={styles.questionCopy}>
              <span className={styles.eyebrow}>
                {isReview
                  ? questionState.review.wasCorrect
                    ? "Correct answer"
                    : "Answer review"
                  : "Choose one answer"}
              </span>
              <h1 id="current-question">{questionState.currentQuestion.questionText}</h1>
            </div>

            <div
              className={styles.timer}
              style={timerStyle}
              data-low={!isReview && secondsRemaining <= 5 || undefined}
              data-review={isReview || undefined}
            >
              <div>
                <time>{String(secondsRemaining).padStart(2, "0")}</time>
                <span>{isReview ? "review" : "seconds"}</span>
              </div>
            </div>
          </div>

          <div className={styles.choices} aria-busy={requestPending}>
            {questionState.currentQuestion.options.map((option) => {
              const result = isReview
                ? option.index === questionState.review.correctChoiceIndex
                  ? "correct"
                  : option.index === questionState.review.selectedChoiceIndex
                    ? "wrong"
                    : "subdued"
                : undefined;

              return (
              <button
                type="button"
                key={option.index}
                data-result={result}
                disabled={
                  isReview ||
                  requestPending ||
                  remainingMs <= 0 ||
                  Boolean(errorMessage)
                }
                onClick={() => void submitChoice(option.index)}
              >
                <span>{option.label}</span>
                <strong>{option.text}</strong>
                <i aria-hidden="true">
                  {result === "correct" ? "✓" : result === "wrong" ? "×" : "↗"}
                </i>
              </button>
              );
            })}
          </div>

          <div className={styles.runStatus} aria-live="polite">
            <span>
              {requestPending
                ? "Server check in progress"
                : isReview
                  ? "Authoritative answer review"
                  : "Server time is authoritative"}
            </span>
            {notice ? <p>{notice}</p> : null}
            {errorMessage ? (
              <button type="button" onClick={retrySynchronization} disabled={requestPending}>
                Synchronize state
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {screen === "completed" && quizState?.status === "completed" ? (
        <section className={styles.results} aria-labelledby="results-title">
          <span className={styles.eyebrow}>Attempt completed</span>
          <h1 id="results-title">Run recorded.</h1>
          <span className={styles.currentRunLabel}>Current run</span>
          <div className={styles.finalScore}>
            <strong>{quizState.totalScore.toLocaleString("en-US")}</strong>
            <span>/ {MAXIMUM_SCORE.toLocaleString("en-US")}</span>
          </div>
          <dl className={styles.runBreakdown}>
            <div><dt>Correct</dt><dd>{quizState.correctCount}</dd></div>
            <div><dt>Timed out</dt><dd>{quizState.timeoutCount}</dd></div>
            <div><dt>Completed</dt><dd>15 / 15</dd></div>
          </dl>
          <section
            className={styles.personalBest}
            aria-labelledby="personal-best-title"
            aria-live="polite"
          >
            <div className={styles.personalBestHeading}>
              <span id="personal-best-title">All-time Personal Best</span>
              <span>Server ranked</span>
            </div>

            {displayedPersonalStatsState.status === "loading" ? (
              <p className={styles.personalBestStatus}>Loading your record...</p>
            ) : null}

            {displayedPersonalStatsState.status === "error" ? (
              <p className={styles.personalBestStatus} role="status">
                Personal Best is temporarily unavailable. Your run is still
                recorded.
              </p>
            ) : null}

            {displayedPersonalStatsState.status === "ready" &&
            displayedPersonalStatsState.stats.personalBest ? (
              <div className={styles.personalBestGrid}>
                <div className={styles.personalBestScore}>
                  <span>Best score</span>
                  <strong>
                    {displayedPersonalStatsState.stats.personalBest.score.toLocaleString(
                      "en-US",
                    )}
                    <small> / 3,000</small>
                  </strong>
                </div>
                <div>
                  <span>Arena tier</span>
                  <strong>
                    {displayedPersonalStatsState.stats.tier ?? "Unranked"}
                  </strong>
                </div>
                <div>
                  <span>Global rank</span>
                  <strong>
                    {displayedPersonalStatsState.stats.globalRank
                      ? `#${displayedPersonalStatsState.stats.globalRank}`
                      : "Unranked"}
                  </strong>
                </div>
                <div>
                  <span>Completed runs</span>
                  <strong>
                    {displayedPersonalStatsState.stats.completedAttemptsCount}
                  </strong>
                </div>
              </div>
            ) : null}

            {displayedPersonalStatsState.status === "ready" &&
            !displayedPersonalStatsState.stats.personalBest ? (
              <p className={styles.personalBestStatus}>
                No completed Personal Best is available yet.
              </p>
            ) : null}
          </section>
          {displayedPersonalStatsState.status === "ready" &&
          displayedPersonalStatsState.stats.personalBest ? (
            <div className={styles.cardGenerator}>
              <ResultCardGenerator
                data={{
                  username: profile.username,
                  profileImageUrl: profile.profileImageUrl,
                  score: quizState.totalScore,
                  personalBestScore:
                    displayedPersonalStatsState.stats.personalBest.score,
                  correctCount: quizState.correctCount,
                  timeoutCount: quizState.timeoutCount,
                  completedRuns:
                    displayedPersonalStatsState.stats.completedAttemptsCount,
                  globalRank: displayedPersonalStatsState.stats.globalRank,
                  tier: quizState.tier,
                  isPersonalBest:
                    quizState.totalScore ===
                    displayedPersonalStatsState.stats.personalBest.score,
                }}
              />
            </div>
          ) : null}
          <div className={styles.resultActions}>
            <button type="button" onClick={startAttempt} disabled={requestPending}>
              {requestPending ? "Preparing attempt" : "Play again"}
              <span aria-hidden="true">→</span>
            </button>
            <Link href="/leaderboard">View Leaderboard</Link>
            <Link href="/">Return to Arena</Link>
          </div>
        </section>
      ) : null}
    </main>
  );
}
