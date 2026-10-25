import { getI18n } from "@/lib/i18n/server";
import Image from "next/image";
import localFont from "next/font/local";
import Link from "next/link";

import { ArenaIntro } from "./_components/arena-intro";
import { LanguageSelector } from "./_components/language-selector";
import { ProfilePanel } from "./_components/profile-panel";
import { getCurrentUser } from "@/server/identity/current-user";
import styles from "./page.module.css";

const arenaPressure = localFont({
  src: "./fonts/roboto-flex/RobotoFlex-Variable.ttf",
  display: "swap",
  variable: "--font-arena-pressure",
  weight: "100 1000",
  style: "normal",
  fallback: ["Arial Narrow", "Arial", "sans-serif"],
});

const challengeFacts = [
  { value: 15, label: "random questions" },
  { value: 20, unit: "sec", label: "for each answer" },
  { value: 3000, label: "maximum points" },
];

const externalLinks = [
  { label: "DISCORD", href: "https://discord.gg/7vYcMa4DS" },
  { label: "TWITTER", href: "https://x.com/RialoHQ" },
  { label: "GITHUB", href: "https://github.com/SubzeroLabs" },
  { label: "RIALO", href: "https://rialo.io/" },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    quiz?: string | string[];
    attempt?: string | string[];
  }>;
}) {
  const { t, locale, direction } = await getI18n();
  const [currentUser, query] = await Promise.all([
    getCurrentUser(),
    searchParams,
  ]);
  const initialProfile = currentUser
    ? {
        username: currentUser.xUsername,
        profileImageUrl: currentUser.profileImageUrl,
      }
    : null;

  return (
    <ArenaIntro fontVariableClassName={arenaPressure.variable}>
      <main lang={locale} dir={direction} className={styles.platform} id="arena-platform" tabIndex={-1}>
        <header className={styles.header}>
          <Image
            src="/brand/rialo/rialo-lockup-off-white.svg"
            alt="Rialo"
            width={496}
            height={182}
            className={styles.lockup}
            priority
          />
          <div className={styles.headerActions}>
            <nav className={styles.externalNav} aria-label={t("Rialo links")}>
              {externalLinks.map((link) => (
                <a
                  href={link.href}
                  key={link.label}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <LanguageSelector />
          </div>
        </header>

        <section className={styles.hero} aria-labelledby="platform-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{t("The Rialo knowledge challenge")}</p>
            <h1 id="platform-title" className={styles.title}>
              <span>Rialo</span>
              <span>Arena</span>
            </h1>
            <p className={styles.description}>
              {t("Prove how well you know Rialo. Accuracy gets you through; speed moves you up.")}
            </p>
          </div>

          <div className={styles.heroRail}>
            <aside className={styles.learnCta} aria-labelledby="learn-cta-title">
              <div className={styles.learnSignal} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <p className={styles.learnEyebrow}>{t("Learn the system")}</p>
              <h2 id="learn-cta-title">{t("New to Rialo? Start with Learn")}</h2>
              <p className={styles.learnDescription}>
                {t("Understand the architecture, primitives, and products behind Rialo before you enter the Arena.")}
              </p>
              <div className={styles.learnActions}>
                <Link href="/learn">
                  {t("Open Learn")}
                  <span aria-hidden="true">↗</span>
                </Link>
                <span>{t("Field manual. Cinematic walkthroughs. Official reading.")}</span>
              </div>
            </aside>

            <div className={styles.challenge}>
              <dl className={styles.facts}>
                {challengeFacts.map((fact) => (
                  <div className={styles.fact} key={fact.label}>
                    <dt>{t(fact.label)}</dt>
                    <dd>
                      {fact.value.toLocaleString(locale)}
                      {fact.unit ? <small>{t(fact.unit)}</small> : null}
                    </dd>
                  </div>
                ))}
              </dl>

              <ProfilePanel
                initialProfile={initialProfile}
                quizEntryRequested={query.quiz === "1"}
                quizAttemptId={
                  typeof query.attempt === "string" ? query.attempt : null
                }
              />
            </div>
          </div>
        </section>

        <footer className={styles.footer}>
          <span>{t("Built for the Rialo community")}</span>
          <nav className={styles.productNav} aria-label={t("Arena navigation")}>
            <Link href="/quiz">{t("Quiz")}</Link>
            <Link href="/learn">{t("Learn")}</Link>
            <Link href="/leaderboard">{t("Leaderboard")}</Link>
          </nav>
          <a
            className={styles.avatarAttribution}
            href="https://unavatar.io"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("Avatars provided by Unavatar")}
          </a>
        </footer>
      </main>
    </ArenaIntro>
  );
}
