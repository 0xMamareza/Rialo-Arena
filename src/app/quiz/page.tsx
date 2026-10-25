import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import localFont from "next/font/local";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/server/identity/current-user";

import { QuizPlayer } from "./quiz-player";

const arenaPressure = localFont({
  src: "../fonts/roboto-flex/RobotoFlex-Variable.ttf",
  display: "swap",
  variable: "--font-arena-pressure",
  weight: "100 1000",
  style: "normal",
  fallback: ["Arial Narrow", "Arial", "sans-serif"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Play | Rialo Arena"), description: t("Take the 15-question Rialo Arena knowledge challenge.") };
}

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<{ attempt?: string | string[] }>;
}) {
  const [currentUser, query] = await Promise.all([
    getCurrentUser(),
    searchParams,
  ]);
  const attemptId =
    typeof query.attempt === "string" ? query.attempt : null;

  if (!currentUser) {
    const identityDestination = attemptId
      ? `/?quiz=1&attempt=${encodeURIComponent(attemptId)}`
      : "/?quiz=1";
    redirect(identityDestination);
  }

  return (
    <QuizPlayer
      className={arenaPressure.variable}
      initialAttemptId={attemptId}
      profile={{
        username: currentUser.xUsername,
        profileImageUrl: currentUser.profileImageUrl,
      }}
    />
  );
}
