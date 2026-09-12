"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import styles from "../learn.module.css";
import { createMobileCinematic, mobileCinematicQuery } from "./mobile-cinematic";
import { RialoFieldBackground } from "./rialo-field-background";

const phases = [
  {
    code: "START",
    eyebrow: "01 / Enter",
    title: "Hidden points. One finish.",
    body: "Agents enter a circuit whose checkpoints have not been revealed.",
  },
  {
    code: "QUESTION",
    eyebrow: "02 / Oracle",
    title: "Ask what divides the field.",
    body: "The Oracle answers yes or no. Each useful question removes possibilities.",
  },
  {
    code: "NARROW",
    eyebrow: "03 / Reason",
    title: "Spend with intent.",
    body: "Efficient questions win. Exhaustive search consumes a metered budget.",
  },
  {
    code: "GUESS",
    eyebrow: "04 / Commit",
    title: "Claim the checkpoint.",
    body: "Only a formal guess converts inference into forward progress.",
  },
  {
    code: "FINISH",
    eyebrow: "05 / Stack",
    title: "Race the reasoning loop.",
    body: "AGP runs over MCP with Sigil, OpenRouter, and Latch.",
  },
] as const;

type RaceCarProps = {
  variant: "mint" | "paper";
  dataName: string;
};

function RaceCar({ variant, dataName }: RaceCarProps) {
  const accent = variant === "mint" ? "#a9ddd3" : "#e8e3d5";

  return (
    <g className={styles.agpCar} data-agp-car={dataName}>
      <ellipse cx="0" cy="3" rx="45" ry="18" fill="#010101" opacity=".72" />
      <path d="M-44-15H-19L-12-9H27L34-14H45V14H34L27 9H-12L-19 15H-44Z" fill="#010101" stroke={accent} strokeWidth="1.4" />
      <path d="M-30-11H-17L-10-7H19L28-11V11L19 7H-10L-17 11H-30Z" fill={accent} opacity=".16" />
      <path d="M-11-8H15L23-4V4L15 8H-11L-19 4V-4Z" fill={accent} />
      <path d="M-6-6H9L15-3V3L9 6H-6L-11 3V-3Z" fill="#010101" />
      <path d="M32-12V12M39-14V14M-34-13V13" stroke={accent} strokeWidth="2" />
      <rect x="-28" y="-19" width="13" height="5" rx="1" fill={accent} />
      <rect x="-28" y="14" width="13" height="5" rx="1" fill={accent} />
      <rect x="20" y="-18" width="12" height="5" rx="1" fill={accent} />
      <rect x="20" y="13" width="12" height="5" rx="1" fill={accent} />
      <circle cx="4" cy="0" r="2.2" fill={accent} />
    </g>
  );
}

export function AgpCinematic() {
  const rootRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add(
        "(min-width: 1101px) and (prefers-reduced-motion: no-preference)",
        () => {
          const phasePanels = gsap.utils.toArray<HTMLElement>("[data-agp-phase]");
          const phaseSteps = gsap.utils.toArray<HTMLElement>("[data-agp-step]");

          gsap.set(phasePanels.slice(1), { autoAlpha: 0 });
          gsap.set(phaseSteps.slice(1), { opacity: 0.28 });
          gsap.set("[data-agp-reveal]", { autoAlpha: 0, scale: 0.82 });
          gsap.set("[data-agp-finish]", { autoAlpha: 0, scaleX: 0.2 });
          gsap.set("[data-agp-stage-wash]", { opacity: 0 });
          gsap.set("[data-agp-race-content]", { autoAlpha: 0 });
          gsap.set("[data-agp-scene-release]", { autoAlpha: 0 });
          gsap.set("[data-agp-world]", {
            xPercent: -10,
            yPercent: 8,
            scale: 0.92,
            opacity: 0.62,
          });

          const timeline = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: "[data-agp-trigger]",
              start: "top top",
              end: "bottom bottom",
              scrub: 0.75,
              invalidateOnRefresh: true,
            },
          });

          timeline
            .addLabel("approach", 0)
            .to(
              "[data-agp-world]",
              { xPercent: -4, yPercent: 4, scale: 1.1, opacity: 1, duration: 1.5 },
              0,
            )
            .to("[data-agp-scene-intro]", { autoAlpha: 0, yPercent: -7, duration: 0.55 }, 0.65)
            .to("[data-agp-race-content]", { autoAlpha: 1, duration: 0.4 }, 0.8)
            .addLabel("start", 1.5)
            .to("[data-agp-route-progress]", { "--agp-route-offset": 0, duration: 10 }, 1.5)
            .to(
              '[data-agp-car="lead"]',
              {
                motionPath: {
                  path: "[data-agp-route]",
                  align: "[data-agp-route]",
                  alignOrigin: [0.5, 0.5],
                  autoRotate: true,
                  start: 0.005,
                  end: 0.99,
                },
                duration: 10,
              },
              1.5,
            )
            .to(
              '[data-agp-car="chaser"]',
              {
                motionPath: {
                  path: "[data-agp-route]",
                  align: "[data-agp-route]",
                  alignOrigin: [0.5, 0.5],
                  autoRotate: true,
                  start: 0,
                  end: 0.925,
                },
                duration: 10,
              },
              1.5,
            )
            .addLabel("question", 3.5)
            .to("[data-agp-world]", { xPercent: 7, yPercent: -2, scale: 1.2, duration: 2.1 }, 3.5)
            .to('[data-agp-reveal="checkpoint-1"]', { autoAlpha: 1, scale: 1, duration: 0.35 }, 3.55)
            .to('[data-agp-reveal="yes"]', { autoAlpha: 1, scale: 1, duration: 0.4 }, 3.95)
            .addLabel("narrow", 5.5)
            .to("[data-agp-world]", { xPercent: -8, yPercent: 5, scale: 1.28, duration: 2.1 }, 5.5)
            .to('[data-agp-reveal="checkpoint-2"]', { autoAlpha: 1, scale: 1, duration: 0.35 }, 5.55)
            .to('[data-agp-reveal="no"]', { autoAlpha: 1, scale: 1, duration: 0.4 }, 5.85)
            .addLabel("guess", 7.5)
            .to("[data-agp-world]", { xPercent: 6, yPercent: 7, scale: 1.34, duration: 2.1 }, 7.5)
            .to('[data-agp-reveal="checkpoint-3"]', { autoAlpha: 1, scale: 1, duration: 0.35 }, 7.55)
            .to('[data-agp-reveal="guess"]', { autoAlpha: 1, scale: 1, duration: 0.45 }, 7.9)
            .addLabel("finish", 9.5)
            .to("[data-agp-world]", { xPercent: -4, yPercent: 1, scale: 1.08, duration: 2 }, 9.5)
            .to("[data-agp-finish]", { autoAlpha: 1, scaleX: 1, duration: 0.5 }, 9.85)
            .to("[data-agp-finish-glow]", { opacity: 0.16, duration: 0.65 }, 10.15)
            .to("[data-agp-world]", { opacity: 0.38, filter: "blur(2px)", duration: 0.9 }, 10.65)
            .to("[data-agp-stage-wash]", { opacity: 1, duration: 0.9 }, 10.65)
            .fromTo(
              "[data-agp-scene-release]",
              { autoAlpha: 0, yPercent: 5 },
              { autoAlpha: 1, yPercent: 0, duration: 1.2 },
              11.55,
            )
            .to("[data-agp-race-content]", { autoAlpha: 0, duration: 0.45 }, 11.75);

          [3.5, 5.5, 7.5, 9.5].forEach((position, index) => {
            const previous = phasePanels[index];
            const next = phasePanels[index + 1];
            timeline
              .set(next, { autoAlpha: 1 }, position)
              .set(previous, { autoAlpha: 0 }, position)
              .set(phaseSteps[index], { opacity: 0.28 }, position)
              .set(phaseSteps[index + 1], { opacity: 1 }, position);
          });

          return () => timeline.scrollTrigger?.kill();
        },
      );
      media.add(mobileCinematicQuery, () =>
        createMobileCinematic(root, {
          world: "[data-agp-world]",
          phases: "[data-agp-phase]",
          draw: "[data-agp-route-progress]",
          reveal: "[data-agp-reveal], [data-agp-finish]",
          travel: [
            { element: '[data-agp-car="lead"]', path: "[data-agp-route]", start: 0.005, end: 0.99 },
            { element: '[data-agp-car="chaser"]', path: "[data-agp-route]", end: 0.925 },
          ],
        }),
      );
    }, root);

    return () => {
      media.revert();
      context.revert();
    };
  }, []);

  return (
    <section ref={rootRef} className={styles.agpCinematic} aria-labelledby="agp-title">
      <div className={`${styles.cinematicSequence} ${styles.agpPinSequence}`} data-agp-trigger data-cinematic-sequence="agp">
        <div className={`${styles.cinematicStage} ${styles.agpPinnedScene}`} data-agp-pin data-cinematic-stage>
          <RialoFieldBackground intensity="stage" />
          <div className={styles.agpWorldViewport}>
            <div className={styles.agpWorld} data-agp-world>
              <svg className={styles.agpCircuit} viewBox="0 0 1200 720" role="presentation" aria-hidden="true">
              <defs>
                <filter id="agp-track-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="8" />
                </filter>
                <pattern id="agp-finish-pattern" width="16" height="16" patternUnits="userSpaceOnUse">
                  <rect width="8" height="8" fill="#e8e3d5" />
                  <rect x="8" y="8" width="8" height="8" fill="#e8e3d5" />
                </pattern>
              </defs>

              <g className={styles.agpTopography}>
                <path d="M34 600C190 470 252 658 408 540S686 371 841 464s244 16 353-92" />
                <path d="M-30 645C175 496 277 706 443 575s298-171 461-61 245 12 340-91" />
                <path d="M63 540C192 430 278 580 397 490S659 310 812 405s236 5 344-76" />
              </g>

              <path className={styles.agpRouteGlow} d="M118 548C40 430 134 315 290 350C422 380 400 520 556 518C710 516 769 404 713 311C659 221 489 268 483 165C477 69 668 74 803 124C939 175 1064 134 1084 69" />
              <path className={styles.agpRouteBase} d="M118 548C40 430 134 315 290 350C422 380 400 520 556 518C710 516 769 404 713 311C659 221 489 268 483 165C477 69 668 74 803 124C939 175 1064 134 1084 69" />
              <path className={styles.agpRouteCenter} d="M118 548C40 430 134 315 290 350C422 380 400 520 556 518C710 516 769 404 713 311C659 221 489 268 483 165C477 69 668 74 803 124C939 175 1064 134 1084 69" />
              <path
                className={styles.agpRouteProgress}
                data-agp-route-progress
                d="M118 548C40 430 134 315 290 350C422 380 400 520 556 518C710 516 769 404 713 311C659 221 489 268 483 165C477 69 668 74 803 124C939 175 1064 134 1084 69"
              />
              <path data-agp-route d="M118 548C40 430 134 315 290 350C422 380 400 520 556 518C710 516 769 404 713 311C659 221 489 268 483 165C477 69 668 74 803 124C939 175 1064 134 1084 69" fill="none" stroke="transparent" />

              <g className={styles.agpCheckpoint} data-agp-reveal="checkpoint-1" transform="translate(288 350)">
                <circle r="35" /><circle r="7" /><text x="0" y="-49" textAnchor="middle">CP 01</text>
              </g>
              <g className={styles.agpCheckpoint} data-agp-reveal="checkpoint-2" transform="translate(704 302)">
                <circle r="35" /><circle r="7" /><text x="0" y="-49" textAnchor="middle">CP 02</text>
              </g>
              <g className={styles.agpCheckpoint} data-agp-reveal="checkpoint-3" transform="translate(490 155)">
                <circle r="35" /><circle r="7" /><text x="0" y="-49" textAnchor="middle">CP 03</text>
              </g>

              <g className={styles.agpOracleSignal} data-agp-reveal="yes" transform="translate(390 414)">
                <path d="M0 0H122V42H39L24 58V42H0Z" /><text x="61" y="26" textAnchor="middle">ORACLE / YES</text>
              </g>
              <g className={styles.agpOracleSignal} data-agp-reveal="no" transform="translate(700 201)">
                <path d="M0 0H116V42H76L92 58V42H0Z" /><text x="58" y="26" textAnchor="middle">ORACLE / NO</text>
              </g>
              <g className={styles.agpGuessSignal} data-agp-reveal="guess" transform="translate(610 112)">
                <circle r="49" /><circle r="34" /><text y="4" textAnchor="middle">GUESS</text>
              </g>

              <g className={styles.agpFinish} data-agp-finish transform="translate(1050 32) rotate(19)">
                <rect width="16" height="100" fill="url(#agp-finish-pattern)" />
                <text x="8" y="-13" textAnchor="middle">FIN</text>
              </g>
              <circle className={styles.agpFinishGlow} data-agp-finish-glow cx="1084" cy="69" r="150" />

              <RaceCar variant="mint" dataName="lead" />
              <RaceCar variant="paper" dataName="chaser" />
              </svg>
            </div>
          </div>
          <div className={styles.agpStageWash} data-agp-stage-wash aria-hidden="true" />

          <div className={styles.agpContentLayer} data-agp-content-layer>
            <div className={styles.agpSceneIntro} data-agp-scene-intro>
              <div className={styles.agpApproachCopy}>
                <span>Chapter 08 / Field test</span>
                <span className={styles.systemType}>Applied agent demonstration</span>
                <p>Reasoning enters the circuit.</p>
                <small>
                  Hidden checkpoints turn every question into distance, cost,
                  and commitment.
                </small>
              </div>
            </div>

            <div className={styles.agpRaceContent} data-agp-race-content>
              <header className={styles.agpSceneHeader}>
                <span className={styles.chapterMarker}>Chapter 08 / AGP</span>
                <p className={styles.chapterThesis}>Agent Grand Prix</p>
                <h2 id="agp-title">21 Questions meets F1 for AI agents.</h2>
              </header>

              <div className={styles.agpPhaseDeck}>
                {phases.map((phase, index) => (
                  <article className={styles.agpPhase} data-agp-phase key={phase.code}>
                    <span>{phase.eyebrow}</span>
                    <h3>{phase.title}</h3>
                    <p>{phase.body}</p>
                    <small>{String(index + 1).padStart(2, "0")} / 05</small>
                  </article>
                ))}
              </div>

              <ol className={styles.agpPhaseRail} aria-label="AGP race phases">
                {phases.map((phase) => (
                  <li data-agp-step key={phase.code}>{phase.code}</li>
                ))}
              </ol>
            </div>

            <div className={styles.agpSceneRelease} data-agp-scene-release>
              <div className={styles.agpReleaseCopy}>
                <span>Finish / Signal resolved</span>
                <p>The race makes efficient reasoning visible.</p>
                <small>MCP / Sigil / OpenRouter / Latch</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
