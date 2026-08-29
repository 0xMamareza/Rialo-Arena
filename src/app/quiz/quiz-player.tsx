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

import type {
  QuizApiChoiceIndex,
  QuizApiErrorBody,
  QuizApiPlayerState,
} from "@/lib/quiz/api-types";

import styles from "./quiz.module.css";

const DISPLAY_QUESTION_WINDOW_MS = 20_000;
const MAXIMUM_SCORE = 3_000;

type QuizScreen = "ready" | "loading" | "playing" | "completed" | "error";

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
      typeof candidate.completedAt === "string"
    );
  }

  if (candidate.status !== "active" || typeof candidate.position !== "number") {
    return false;
  }

  const question = candidate.currentQuestion;
  if (!question || typeof question !== "object") return false;
  const current = question as Record<string, unknown>;

  return (
    typeof current.position === "number" &&
    typeof current.questionText === "string" &&
    typeof current.activatedAt === "string" &&
    typeof current.deadlineAt === "string" &&
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
    })
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

export function QuizPlayer({
  className,
  initialAttemptId,
  profile,
}: QuizPlayerProps) {
  const router = useRouter();
  const [screen, setScreen] = useState<QuizScreen>(
    initialAttemptId ? "loading" : "ready",
  );
  const [quizState, setQuizState] = useState<QuizApiPlayerState | null>(null);
  const [remainingMs, setRemainingMs] = useState(DISPLAY_QUESTION_WINDOW_MS);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestPending, setRequestPending] = useState(false);
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

      if (state.status === "active") {
        const serverNowMs = Date.parse(state.serverNow);
        const deadlineMs = Date.parse(state.currentQuestion.deadlineAt);
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
    async (attemptId: string, reason: "restore" | "resync" | "timeout") => {
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
    async (reason: "resync" | "timeout") => {
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
    if (screen !== "playing" || quizState?.status !== "active") return;

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
        void resyncCurrentAttempt("timeout");
      }
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 100);
    return () => window.clearInterval(interval);
  }, [quizState, resyncCurrentAttempt, screen]);

  useEffect(() => {
    if (screen !== "playing" || quizState?.status !== "active") return;

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
        `/api/quiz/attempt/${encodeURIComponent(quizState.attemptId)}/answer`,
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
      setNotice(result.state.status === "active" ? "Answer recorded." : null);
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
    }
  };

  const activeState = quizState?.status === "active" ? quizState : null;
  const secondsRemaining = Math.max(0, Math.ceil(remainingMs / 1_000));
  const timerProgress = Math.max(
    0,
    Math.min(1, remainingMs / DISPLAY_QUESTION_WINDOW_MS),
  );
  const timerStyle = {
    "--timer-progress": `${timerProgress * 360}deg`,
  } as CSSProperties;

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

      {screen === "playing" && activeState ? (
        <section className={styles.play} aria-labelledby="current-question">
          <div className={styles.runMeta}>
            <div>
              <span>Question</span>
              <strong>{formatQuestionPosition(activeState.position, activeState.questionCount)}</strong>
            </div>
            <div>
              <span>Current score</span>
              <strong>{activeState.totalScore.toLocaleString("en-US")}</strong>
            </div>
          </div>

          <div className={styles.progress} aria-label={`${activeState.position} of ${activeState.questionCount} questions`}>
            {Array.from({ length: activeState.questionCount }, (_, index) => (
              <span
                key={index}
                data-state={
                  index + 1 < activeState.position
                    ? "complete"
                    : index + 1 === activeState.position
                      ? "current"
                      : "upcoming"
                }
              />
            ))}
          </div>

          <div className={styles.questionLayout}>
            <div className={styles.questionCopy}>
              <span className={styles.eyebrow}>Choose one answer</span>
              <h1 id="current-question">{activeState.currentQuestion.questionText}</h1>
            </div>

            <div className={styles.timer} style={timerStyle} data-low={secondsRemaining <= 5 || undefined}>
              <div>
                <time>{String(secondsRemaining).padStart(2, "0")}</time>
                <span>seconds</span>
              </div>
            </div>
          </div>

          <div className={styles.choices} aria-busy={requestPending}>
            {activeState.currentQuestion.options.map((option) => (
              <button
                type="button"
                key={option.index}
                disabled={
                  requestPending || remainingMs <= 0 || Boolean(errorMessage)
                }
                onClick={() => void submitChoice(option.index)}
              >
                <span>{option.label}</span>
                <strong>{option.text}</strong>
                <i aria-hidden="true">↗</i>
              </button>
            ))}
          </div>

          <div className={styles.runStatus} aria-live="polite">
            <span>{requestPending ? "Server check in progress" : "Server time is authoritative"}</span>
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
          <div className={styles.finalScore}>
            <strong>{quizState.totalScore.toLocaleString("en-US")}</strong>
            <span>/ {MAXIMUM_SCORE.toLocaleString("en-US")}</span>
          </div>
          <dl>
            <div><dt>Correct</dt><dd>{quizState.correctCount}</dd></div>
            <div><dt>Timed out</dt><dd>{quizState.timeoutCount}</dd></div>
            <div><dt>Completed</dt><dd>15 / 15</dd></div>
          </dl>
          <div className={styles.resultActions}>
            <button type="button" onClick={startAttempt} disabled={requestPending}>
              {requestPending ? "Preparing attempt" : "Play again"}
              <span aria-hidden="true">→</span>
            </button>
            <Link href="/">Return to Arena</Link>
          </div>
        </section>
      ) : null}
    </main>
  );
}
