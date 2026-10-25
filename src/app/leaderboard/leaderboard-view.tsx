"use client";

import { useI18n } from "@/app/_components/language-provider";
import { LanguageSelector } from "@/app/_components/language-selector";

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
  const { t, locale, direction } = useI18n();
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
    <main lang={locale} dir={direction} className={`${styles.page} ${className}`}>
      <div className={styles.background} aria-hidden="true" />

      <header className={styles.header}>
        <Link href="/" aria-label={t("Return to Rialo Arena")}>
          <Image
            src="/brand/rialo/rialo-lockup-off-white.svg"
            alt="Rialo"
            width={496}
            height={182}
            priority
          />
        </Link>
        <div className={styles.headerActions}>
          <nav aria-label={t("Product navigation")}>
            <Link href="/">Arena</Link>
            <Link href="/learn">{t("Learn")}</Link>
            <Link href="/quiz">{t("Start quiz")}</Link>
          </nav>
          <LanguageSelector />
        </div>
      </header>

      <section className={styles.content} aria-labelledby="leaderboard-title">
        <div className={styles.intro}>
          <div>
            <span className={styles.eyebrow}>{t("Global standings")}</span>
            <h1 id="leaderboard-title">{t("Leaderboard")}</h1>
          </div>
          <p>{t("Each player is represented by their best completed Arena run.")}</p>
        </div>

        <div className={styles.disclosure}>
          <span>{t("Profiles are unverified.")}</span>
          <span>
            {t("Arena tiers are progression labels, not official Rialo status.")}
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
              <p>{t("Loading the top 50")}</p>
            </div>
          ) : null}

          {loadState.status === "error" ? (
            <div className={styles.state} role="alert">
              <span className={styles.stateCode}>{t("Connection state")}</span>
              <h2>{t("Standings unavailable.")}</h2>
              <p>{t(loadState.message)}</p>
              {loadState.retryAfterSeconds ? (
                <small>{t("Try again in {seconds} seconds.", { seconds: loadState.retryAfterSeconds.toLocaleString(locale) })}</small>
              ) : null}
              <button
                type="button"
                onClick={() => setRequestVersion((version) => version + 1)}
              >
                {t("Retry")}
              </button>
            </div>
          ) : null}

          {loadState.status === "ready" && loadState.entries.length === 0 ? (
            <div className={styles.state}>
              <span className={styles.stateCode}>{t("No completed runs")}</span>
              <h2>{t("The board is open.")}</h2>
              <p>{t("Complete an Arena run to establish the first score.")}</p>
              <Link href="/quiz">{t("Start quiz")}</Link>
            </div>
          ) : null}

          {loadState.status === "ready" && loadState.entries.length > 0 ? (
            <>
              <div className={styles.columns} aria-hidden="true">
                <span>{t("Rank")}</span>
                <span>{t("Player")}</span>
                <span>{t("Score")}</span>
                <span>{t("Tier")}</span>
                <span>{t("Run")}</span>
              </div>
              <ol className={styles.entries}>
                {loadState.entries.map((entry) => (
                  <li className={styles.entry} key={entry.rank}>
                    <span className={styles.rank}>
                      {entry.rank.toLocaleString(locale, { minimumIntegerDigits: 2, useGrouping: false })}
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
                      <strong dir="ltr">@{entry.xUsername}</strong>
                    </div>
                    <div className={styles.score}>
                      <strong>{entry.score.toLocaleString(locale)}</strong>
                      <span>/ {(3000).toLocaleString(locale)}</span>
                    </div>
                    <span className={styles.tier}>{t(entry.tier)}</span>
                    <div className={styles.runStats}>
                      <span>{t("{count} correct", { count: entry.correctCount.toLocaleString(locale) })}</span>
                      <span>{t("{count} timeout", { count: entry.timeoutCount.toLocaleString(locale) })}</span>
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
