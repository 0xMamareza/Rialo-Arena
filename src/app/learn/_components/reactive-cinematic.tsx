"use client";

import { useI18n } from "@/app/_components/language-provider";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { DiagramText } from "./diagram-text";
import styles from "../learn.module.css";
import { createMobileCinematic, mobileCinematicQuery } from "./mobile-cinematic";
import { RialoFieldBackground } from "./rialo-field-background";

const phases = [
  {
    code: "SIGNALS",
    eyebrow: "01 / Observe",
    title: "State gives the workflow a reason to wake.",
    body: "Onchain changes, attested external data, and time can all feed the same condition.",
  },
  {
    code: "PREDICATE",
    eyebrow: "02 / Define",
    title: "The predicate names the exact moment.",
    body: "Executable logic waits until its stored condition becomes true.",
  },
  {
    code: "EVALUATE",
    eyebrow: "03 / Agree",
    title: "Validators reach one deterministic result.",
    body: "Affected predicates are evaluated against shared state inside the chain's execution path.",
  },
  {
    code: "TRIGGER",
    eyebrow: "04 / Trigger",
    title: "Truth becomes a protocol event.",
    body: "The eligible transaction is marked and queued without an external actor racing to submit it.",
  },
  {
    code: "EXECUTE",
    eyebrow: "05 / Execute",
    title: "The action advances automatically.",
    body: "Its effects enter shared state in dependency order, within the same block or a following block.",
  },
] as const;

function ReactiveDiagram() {
  const { t } = useI18n();
  return (
    <svg direction="ltr" className={styles.reactiveDiagram} viewBox="0 0 1440 820" role="img" aria-label={t("Diagram: signals become a condition, validator agreement, and automatic execution.")}>
      <defs>
        <filter id="reactive-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <linearGradient id="reactive-flow" x1="0" x2="1">
          <stop offset="0" stopColor="#a9ddd3" stopOpacity=".12" />
          <stop offset=".55" stopColor="#a9ddd3" />
          <stop offset="1" stopColor="#e8e3d5" stopOpacity=".7" />
        </linearGradient>
        <pattern id="reactive-grid" width="38" height="38" patternUnits="userSpaceOnUse">
          <path d="M38 0H0V38" fill="none" stroke="#e8e3d5" strokeOpacity=".035" />
        </pattern>
      </defs>

      <rect width="1440" height="820" fill="url(#reactive-grid)" />

      <g className={styles.reactiveSignal} data-reactive-signal="onchain" transform="translate(238 238)">
        <circle r="49" />
        <path d="M-18-10H18M-18 0H10M-18 10H15" />
        <DiagramText maxWidth={210} y="72" textAnchor="middle">{t("ONCHAIN")}</DiagramText>
        <DiagramText maxWidth={210} y="88" textAnchor="middle">{t("STATE + EVENTS")}</DiagramText>
      </g>
      <g className={styles.reactiveSignal} data-reactive-signal="data" transform="translate(182 410)">
        <circle r="49" />
        <path d="M-21 8C-10-15 12-15 23 8M-13 8C-6-4 6-4 13 8M0 8V19" />
        <DiagramText maxWidth={210} y="72" textAnchor="middle">{t("OFFCHAIN / DATA")}</DiagramText>
        <DiagramText maxWidth={210} y="88" textAnchor="middle">{t("VALIDATOR ATTESTED")}</DiagramText>
      </g>
      <g className={styles.reactiveSignal} data-reactive-signal="time" transform="translate(238 582)">
        <circle r="49" />
        <circle r="20" />
        <path d="M0-20V0L14 10" />
        <DiagramText maxWidth={210} y="72" textAnchor="middle">{t("TIME")}</DiagramText>
        <DiagramText maxWidth={210} y="88" textAnchor="middle">{t("HEIGHT + TIMESTAMP")}</DiagramText>
      </g>

      <path className={styles.reactiveSignalRoute} data-reactive-route="onchain" d="M287 238C420 238 405 344 548 390" />
      <path className={styles.reactiveSignalRoute} data-reactive-route="data" d="M231 410H548" />
      <path className={styles.reactiveSignalRoute} data-reactive-route="time" d="M287 582C420 582 405 476 548 430" />

      {(["onchain", "data", "time"] as const).map((signal) => (
        <g className={styles.reactivePacket} data-reactive-packet={signal} key={signal}>
          <circle r="7" />
          <circle className={styles.reactivePacketGlow} r="22" />
        </g>
      ))}

      <g className={styles.reactivePredicate} data-reactive-predicate transform="translate(548 325)">
        <rect width="206" height="170" rx="4" />
        <DiagramText maxWidth={180} x="103" y="30" textAnchor="middle">{t("PREDICATE")}</DiagramText>
        <path d="M35 62H171M35 96H171M35 130H171" />
        <circle cx="58" cy="62" r="6" />
        <circle cx="58" cy="96" r="6" />
        <circle cx="58" cy="130" r="6" />
        <DiagramText maxWidth={180} className={styles.reactivePredicateValue} data-reactive-predicate-value x="128" y="101" textAnchor="middle">{t("TRUE")}</DiagramText>
      </g>

      <path className={styles.reactiveConsensusRoute} data-reactive-consensus-route d="M754 410H940" />
      <g className={styles.reactiveValidators} data-reactive-validators transform="translate(790 282)">
        <rect width="180" height="256" rx="90" />
        <DiagramText maxWidth={165} x="90" y="32" textAnchor="middle">{t("VALIDATOR EVALUATION")}</DiagramText>
        {[72, 112, 152, 192].map((y, index) => (
          <g className={styles.reactiveValidator} data-reactive-validator key={y} transform={`translate(40 ${y})`}>
            <circle r="12" />
            <path d="M-5 0L-1 4L7-5" />
            <DiagramText maxWidth={115} x="28" y="4">{t("NODE {number}", { number: String(index + 1).padStart(2, "0") })}</DiagramText>
          </g>
        ))}
        <DiagramText maxWidth={165} className={styles.reactiveAgreement} data-reactive-agreement x="90" y="232" textAnchor="middle">{t("DETERMINISTIC / TRUE")}</DiagramText>
      </g>

      <path className={styles.reactiveExecutionRoute} data-reactive-execution-route d="M970 410H1192" />
      <g className={styles.reactiveTrigger} data-reactive-trigger transform="translate(1044 410)">
        <circle className={styles.reactiveTriggerRing} r="35" />
        <circle className={styles.reactiveTriggerRing} r="57" />
        <circle className={styles.reactiveTriggerCore} r="12" />
        <path d="M-3-19L-14 2H-3L-8 22L15-7H4L10-19Z" />
        <DiagramText maxWidth={150} y="84" textAnchor="middle">{t("TRIGGER")}</DiagramText>
      </g>

      <g className={styles.reactiveExecution} data-reactive-execution transform="translate(1192 330)">
        <rect width="170" height="160" rx="4" />
        <path d="M35 52H135M35 80H106M35 108H124" />
        <circle cx="137" cy="108" r="8" />
        <DiagramText maxWidth={180} x="85" y="139" textAnchor="middle">{t("EXECUTION")}</DiagramText>
      </g>

      <g className={styles.reactiveBlockRail}>
        <DiagramText maxWidth={150} x="548" y="660">{t("BLOCK EXECUTION")}</DiagramText>
        <path d="M548 680H1362" />
        {[650, 824, 998, 1172, 1346].map((x, index) => (
          <g key={x} transform={`translate(${x} 680)`}>
            <circle r="4" />
            <text y="25" textAnchor="middle">B{index + 1}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

export function ReactiveCinematic() {
  const { t } = useI18n();
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
          const phases = gsap.utils.toArray<HTMLElement>("[data-reactive-phase]");
          const steps = gsap.utils.toArray<HTMLElement>("[data-reactive-step]");
          const signals = gsap.utils.toArray<SVGElement>("[data-reactive-signal]");
          const validators = gsap.utils.toArray<SVGElement>("[data-reactive-validator]");

          gsap.set(phases.slice(1), { autoAlpha: 0 });
          gsap.set(steps.slice(1), { opacity: 0.24 });
          gsap.set(signals, { opacity: 0.3 });
          gsap.set(validators, { opacity: 0.2 });
          gsap.set("[data-reactive-packet]", { autoAlpha: 0 });
          gsap.set("[data-reactive-predicate]", { opacity: 0.32 });
          gsap.set("[data-reactive-consensus-route]", { strokeDashoffset: 190 });
          gsap.set("[data-reactive-execution-route]", { strokeDashoffset: 230 });
          gsap.set("[data-reactive-agreement]", { opacity: 0 });
          gsap.set("[data-reactive-trigger]", { autoAlpha: 0, scale: 0.45 });
          gsap.set("[data-reactive-execution]", { opacity: 0.22 });
          gsap.set("[data-reactive-content]", { autoAlpha: 0 });
          gsap.set("[data-reactive-release]", { autoAlpha: 0, yPercent: 5 });
          gsap.set("[data-reactive-trigger-flash]", { opacity: 0 });
          gsap.set("[data-reactive-world]", { xPercent: 4, scale: 0.95, opacity: 0.72 });
          gsap.set("[data-reactive-predicate-value]", { textContent: t("WAIT") });

          const timeline = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: "[data-reactive-trigger-zone]",
              start: "top top",
              end: "bottom bottom",
              scrub: 0.6,
              invalidateOnRefresh: true,
            },
          });

          timeline
            .to("[data-reactive-world]", { xPercent: 0, scale: 1, opacity: 1, duration: 1.15 }, 0)
            .to("[data-reactive-intro]", { autoAlpha: 0, yPercent: -6, duration: 0.48 }, 0.58)
            .to("[data-reactive-content]", { autoAlpha: 1, duration: 0.4 }, 0.74)
            .to(signals, { opacity: 1, duration: 0.5, stagger: 0.14 }, 0.82);

          (["onchain", "data", "time"] as const).forEach((signal, index) => {
            timeline
              .set(`[data-reactive-packet="${signal}"]`, { autoAlpha: 1 }, 1.05 + index * 0.16)
              .to(
                `[data-reactive-packet="${signal}"]`,
                {
                  motionPath: {
                    path: `[data-reactive-route="${signal}"]`,
                    align: `[data-reactive-route="${signal}"]`,
                    alignOrigin: [0.5, 0.5],
                    start: 0,
                    end: 1,
                  },
                  duration: 1.45,
                },
                1.05 + index * 0.16,
              )
              .set(`[data-reactive-packet="${signal}"]`, { autoAlpha: 0 }, 2.7);
          });

          timeline
            .to("[data-reactive-predicate]", { opacity: 1, duration: 0.35 }, 2.35)
            .set("[data-reactive-predicate-value]", { textContent: t("TRUE") }, 2.62)
            .to("[data-reactive-consensus-route]", { strokeDashoffset: 0, duration: 1.05 }, 3.05)
            .to(validators, { opacity: 1, duration: 0.28, stagger: 0.18 }, 3.25)
            .to("[data-reactive-agreement]", { opacity: 1, duration: 0.35 }, 4.05)
            .to("[data-reactive-trigger]", { autoAlpha: 1, scale: 1, duration: 0.32 }, 5.05)
            .to("[data-reactive-trigger-flash]", { opacity: 0.7, duration: 0.12 }, 5.08)
            .to("[data-reactive-trigger-flash]", { opacity: 0, duration: 0.55 }, 5.2)
            .to("[data-reactive-execution-route]", { strokeDashoffset: 0, duration: 0.72 }, 5.35)
            .to("[data-reactive-execution]", { opacity: 1, duration: 0.36 }, 5.82)
            .to("[data-reactive-execution]", { scale: 1.035, transformOrigin: "center", duration: 0.16 }, 6.04)
            .to("[data-reactive-execution]", { scale: 1, duration: 0.3 }, 6.2)
            .to("[data-reactive-world]", { opacity: 0.54, scale: 0.98, duration: 0.8 }, 7.55)
            .to("[data-reactive-release]", { autoAlpha: 1, yPercent: 0, duration: 0.75 }, 7.68)
            .to("[data-reactive-content]", { autoAlpha: 0, duration: 0.42 }, 7.82);

          [2.45, 3.65, 5.05, 6.15].forEach((position, index) => {
            timeline
              .set(phases[index + 1], { autoAlpha: 1 }, position)
              .set(phases[index], { autoAlpha: 0 }, position)
              .set(steps[index], { opacity: 0.24 }, position)
              .set(steps[index + 1], { opacity: 1 }, position);
          });

          return () => timeline.scrollTrigger?.kill();
        },
      );
      media.add(mobileCinematicQuery, () =>
        createMobileCinematic(root, {
          world: "[data-reactive-world]",
          phases: "[data-reactive-phase]",
          draw: "[data-reactive-route], [data-reactive-consensus-route], [data-reactive-execution-route]",
          reveal: "[data-reactive-signal], [data-reactive-predicate], [data-reactive-validator], [data-reactive-trigger], [data-reactive-execution]",
          travel: [
            { element: '[data-reactive-packet="onchain"]', path: '[data-reactive-route="onchain"]' },
            { element: '[data-reactive-packet="data"]', path: '[data-reactive-route="data"]' },
            { element: '[data-reactive-packet="time"]', path: '[data-reactive-route="time"]' },
          ],
        }),
      );
    }, root);

    return () => {
      media.revert();
      context.revert();
    };
  }, [t]);

  return (
    <section ref={rootRef} className={styles.reactiveCinematic} aria-labelledby="reactive-title">
      <div
        className={`${styles.cinematicSequence} ${styles.reactivePinSequence}`}
        data-cinematic-sequence="reactive"
        data-reactive-trigger-zone
      >
        <div className={`${styles.cinematicStage} ${styles.reactiveStage}`} data-cinematic-stage>
          <RialoFieldBackground intensity="stage" />
          <div className={styles.reactiveWorld} data-reactive-world>
            <ReactiveDiagram />
          </div>
          <div className={styles.reactiveTriggerFlash} data-reactive-trigger-flash />

          <div className={styles.reactiveContentLayer}>
            <header className={styles.reactiveIntro} data-reactive-intro>
              <span className={styles.chapterMarker}>{t("Chapter 03 / Reactive transactions")}</span>
              <span className={styles.systemType}>{t("Protocol primitive")}</span>
              <p className={styles.chapterThesis}>{t("Native blockchain automation")}</p>
              <h2 id="reactive-title">{t("The chain knows when to act.")}</h2>
              <p>{t("Define the condition once. Validators carry the workflow forward.")}</p>
            </header>

            <div className={styles.reactiveSceneContent} data-reactive-content>
              <header className={styles.reactiveSceneHeader}>
                <span>{t("Reactive / Condition system")}</span>
                <strong>{t("No keeper in the loop.")}</strong>
              </header>

              <div className={styles.reactivePhaseDeck}>
                {phases.map((phase, index) => (
                  <article className={styles.reactivePhase} data-reactive-phase key={phase.code}>
                    <span>{t(phase.eyebrow)}</span>
                    <h3>{t(phase.title)}</h3>
                    <p>{t(phase.body)}</p>
                    <small>{String(index + 1).padStart(2, "0")} / 05</small>
                  </article>
                ))}
              </div>

              <ol className={styles.reactivePhaseRail} aria-label={t("Reactive transaction phases")}>
                {phases.map((phase) => (
                  <li data-reactive-step key={phase.code}>{t(phase.code)}</li>
                ))}
              </ol>
            </div>

            <div className={styles.reactiveRelease} data-reactive-release>
              <span>{t("Condition / Agreed / Executed")}</span>
              <p>{t("The waiting is native. The action is automatic.")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
