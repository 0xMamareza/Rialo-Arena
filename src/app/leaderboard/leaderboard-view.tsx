"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import type {
  LeaderboardEntry,
  LeaderboardResponse,
} from "@/lib/leaderboard/api-types";

import styles from "./leaderboard.module.css";

const ARENA_TIERS = new Set([
  "Explorer",
  "Builder",
  "Operator",
  "Architect",
  "Vanguard",
  "Apex",
]);

type LeaderboardViewProps = {
  className: string;
};

type LoadState =
  | { status: "loading" }
  | { status: "ready"; entries: LeaderboardEntry[] }
  | { status: "error"; message: string; retryAfterSeconds: number | null };

function isLeaderboardEntry(value: unknown): value is LeaderboardEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;

  return (
    Number.isInteger(entry.rank) &&
    Number(entry.rank) > 0 &&
    typeof entry.xUsername === "string" &&
    typeof entry.profileImageUrl === "string" &&
    Number.isInteger(entry.score) &&
    Number(entry.score) >= 0 &&
    Number(entry.score) <= 3_000 &&
    Number.isInteger(entry.correctCount) &&
    Number(entry.correctCount) >= 0 &&
    Number.isInteger(entry.timeoutCount) &&
    Number(entry.timeoutCount) >= 0 &&
    typeof entry.tier === "string" &&
    ARENA_TIERS.has(entry.tier)
  );
}

function isLeaderboardResponse(value: unknown): value is LeaderboardResponse {
  if (!value || typeof value !== "object") return false;
  const response = value as Record<string, unknown>;

  return (
    Array.isArray(response.entries) &&
    response.entries.length <= 50 &&
    response.entries.every(isLeaderboardEntry)
  );
}

function readRetryAfter(response: Response) {
  const rawValue = response.headers.get("retry-after");
  if (!rawValue) return null;
  const seconds = Number.parseInt(rawValue, 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

export function LeaderboardView({ className }: LeaderboardViewProps) {
  const [requestVersion, setRequestVersion] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    async function loadLeaderboard() {
      setLoadState({ status: "loading" });

      try {
        const response = await fetch("/api/leaderboard?limit=50", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        const body: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          const retryAfterSeconds =
            response.status === 429 ? readRetryAfter(response) : null;
          setLoadState({
            status: "error",
            message:
              response.status === 429
                ? "The public board is receiving heavy traffic."
                : "The leaderboard could not be loaded.",
            retryAfterSeconds,
          });
          return;
        }

        if (!isLeaderboardResponse(body)) {
          throw new Error("Invalid leaderboard response.");
        }

        setLoadState({ status: "ready", entries: body.entries });
      } catch (error) {
        if (controller.signal.aborted) return;
        setLoadState({
          status: "error",
          message:
            error instanceof Error
              ? "The leaderboard could not be loaded."
              : "The leaderboard is temporarily unavailable.",
          retryAfterSeconds: null,
        });
      }
    }

    void loadLeaderboard();
    return () => controller.abort();
  }, [requestVersion]);

  return (
    <main className={`${styles.page} ${className}`}>
      <div className={styles.background} aria-hidden="true" />

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
        <nav aria-label="Product navigation">
          <Link href="/">Arena</Link>
          <Link href="/learn">Learn</Link>
          <Link href="/quiz">Start quiz</Link>
        </nav>
      </header>

      <section className={styles.content} aria-labelledby="leaderboard-title">
        <div className={styles.intro}>
          <div>
            <span className={styles.eyebrow}>Global standings</span>
            <h1 id="leaderboard-title">Leaderboard</h1>
          </div>
          <p>Each player is represented by their best completed Arena run.</p>
        </div>

        <div className={styles.disclosure}>
          <span>Profiles are unverified.</span>
          <span>
            Arena tiers are progression labels, not official Rialo status.
          </span>
        </div>

        <div
          className={styles.board}
          aria-live="polite"
          aria-busy={loadState.status === "loading"}
        >
          {loadState.status === "loading" ? (
            <div className={styles.state}>
              <span className={styles.loadingMark} aria-hidden="true" />
              <p>Loading the top 50</p>
            </div>
          ) : null}

          {loadState.status === "error" ? (
            <div className={styles.state} role="alert">
              <span className={styles.stateCode}>Connection state</span>
              <h2>Standings unavailable.</h2>
              <p>{loadState.message}</p>
              {loadState.retryAfterSeconds ? (
                <small>Try again in {loadState.retryAfterSeconds} seconds.</small>
              ) : null}
              <button
                type="button"
                onClick={() => setRequestVersion((version) => version + 1)}
              >
                Retry
              </button>
            </div>
          ) : null}

          {loadState.status === "ready" && loadState.entries.length === 0 ? (
            <div className={styles.state}>
              <span className={styles.stateCode}>No completed runs</span>
              <h2>The board is open.</h2>
              <p>Complete an Arena run to establish the first score.</p>
              <Link href="/quiz">Start quiz</Link>
            </div>
          ) : null}

          {loadState.status === "ready" && loadState.entries.length > 0 ? (
            <>
              <div className={styles.columns} aria-hidden="true">
                <span>Rank</span>
                <span>Player</span>
                <span>Score</span>
                <span>Tier</span>
                <span>Run</span>
              </div>
              <ol className={styles.entries}>
                {loadState.entries.map((entry) => (
                  <li className={styles.entry} key={entry.rank}>
                    <span className={styles.rank}>
                      {String(entry.rank).padStart(2, "0")}
                    </span>
                    <div className={styles.identity}>
                      <span className={styles.avatar}>
                        <span aria-hidden="true">
                          {entry.xUsername.charAt(0).toUpperCase() || "R"}
                        </span>
                        {/* Profile URLs follow the existing browser-direct identity flow. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={entry.profileImageUrl}
                          alt=""
                          width="48"
                          height="48"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(event) => {
                            event.currentTarget.hidden = true;
                          }}
                        />
                      </span>
                      <strong>@{entry.xUsername}</strong>
                    </div>
                    <div className={styles.score}>
                      <strong>{entry.score.toLocaleString("en-US")}</strong>
                      <span>/ 3,000</span>
                    </div>
                    <span className={styles.tier}>{entry.tier}</span>
                    <div className={styles.runStats}>
                      <span>{entry.correctCount} correct</span>
                      <span>{entry.timeoutCount} timeout</span>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}
