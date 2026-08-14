import Image from "next/image";
import localFont from "next/font/local";

import { ArenaIntro } from "./_components/arena-intro";
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
  { value: "15", label: "random questions" },
  { value: "20", unit: "sec", label: "for each answer" },
  { value: "3,000", label: "maximum points" },
];

export default function Home() {
  return (
    <ArenaIntro fontVariableClassName={arenaPressure.variable}>
      <main className={styles.platform} id="arena-platform" tabIndex={-1}>
        <header className={styles.header}>
          <Image
            src="/brand/rialo/rialo-lockup-off-white.svg"
            alt="Rialo"
            width={496}
            height={182}
            className={styles.lockup}
            priority
          />
          <p className={styles.issue}>Arena / Challenge 001</p>
        </header>

        <section className={styles.hero} aria-labelledby="platform-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>The Rialo knowledge challenge</p>
            <h1 id="platform-title" className={styles.title}>
              <span>Rialo</span>
              <span>Arena</span>
            </h1>
            <p className={styles.description}>
              Prove how well you know Rialo. Accuracy gets you through;
              speed moves you up.
            </p>
          </div>

          <div className={styles.challenge}>
            <dl className={styles.facts}>
              {challengeFacts.map((fact) => (
                <div className={styles.fact} key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>
                    {fact.value}
                    {fact.unit ? <small>{fact.unit}</small> : null}
                  </dd>
                </div>
              ))}
            </dl>

            <div className={styles.action}>
              <button
                className={styles.connectButton}
                type="button"
                disabled
                aria-describedby="connect-note"
              >
                Connect X
                <span aria-hidden="true">↗</span>
              </button>
              <p id="connect-note">
                X connection is required to compete. Coming soon.
              </p>
            </div>
          </div>
        </section>

        <footer className={styles.footer}>
          <span>Speed-based scoring</span>
          <span aria-hidden="true">R / A</span>
        </footer>
      </main>
    </ArenaIntro>
  );
}
