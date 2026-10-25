import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import localFont from "next/font/local";

import { LeaderboardView } from "./leaderboard-view";

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
  return { title: t("Leaderboard | Rialo Arena"), description: t("See the top completed runs in Rialo Arena.") };
}

export default function LeaderboardPage() {
  return <LeaderboardView className={arenaPressure.variable} />;
}
