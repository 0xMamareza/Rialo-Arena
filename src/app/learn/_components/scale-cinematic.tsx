"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import styles from "../learn.module.css";
import { RialoFieldBackground } from "./rialo-field-background";

const phases = [
  { code: "CONTRACT", eyebrow: "01 / Define", title: "The work begins with explicit terms.", body: "A SCALE task records the prompt, payment, deadline, and independent judge." },
  { code: "DISCOVER", eyebrow: "02 / Discover", title: "The registry resolves capability.", body: "A requester can discover a suitable worker through Rialo's Agent Registry." },
  { code: "ESCROW", eyebrow: "03 / Commit", title: "Payment waits onchain, not on trust.", body: "The offered RLO is escrowed when the task is minted and shared with the worker over A2A." },
  { code: "JUDGE", eyebrow: "04 / Verify", title: "Delivery faces a named quality gate.", body: "The judge checks the submitted work against the prompt and returns a verdict." },
  { code: "SETTLE", eyebrow: "05 / Settle", title: "Code closes the agreement.", body: "A pass releases payment. A failed verdict or missed deadline returns funds." },
] as const;

const nodes = [
  ["REQUESTER", 150, 390], ["TASK", 335, 390], ["AGENT REGISTRY", 515, 280],
  ["WORKER", 690, 390], ["ESCROW", 870, 280], ["DEADLINE", 870, 500],
  ["JUDGE", 1050, 390],
] as const;

function ScaleDiagram() {
  return (
    <svg className={styles.scaleDiagram} viewBox="0 0 1440 820" aria-hidden="true">
      <defs><filter id="scale-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="8" /></filter><linearGradient id="scale-route" x1="0" x2="1"><stop stopColor="#a9ddd3" stopOpacity=".08" /><stop offset=".5" stopColor="#a9ddd3" /><stop offset="1" stopColor="#e8e3d5" stopOpacity=".75" /></linearGradient><pattern id="scale-grid" width="54" height="54" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#a9ddd3" fillOpacity=".08" /></pattern></defs>
      <rect width="1440" height="820" fill="url(#scale-grid)" />
      <path className={styles.scaleWorkflowRoute} data-scale-route d="M150 390H335C390 390 455 280 515 280C575 280 630 390 690 390C760 390 795 280 870 280C946 280 975 390 1050 390H1210" />
      <path className={styles.scaleDeadlineRoute} data-scale-deadline-route d="M690 390C760 390 795 500 870 500C945 500 976 390 1050 390" />
      {nodes.map(([label, x, y], index) => (
        <g className={styles.scaleNode} data-scale-node={label} key={label} transform={`translate(${x} ${y})`}>
          <circle r={label === "TASK" || label === "JUDGE" ? 44 : 34} /><circle className={styles.scaleNodePulse} r={label === "TASK" || label === "JUDGE" ? 54 : 44} />
          <text y={label === "TASK" || label === "JUDGE" ? 4 : 3} textAnchor="middle">{index === 2 ? "REGISTRY" : label}</text>
          {index === 2 ? <text y="17" textAnchor="middle">AGENT</text> : null}
        </g>
      ))}
      <g className={styles.scaleTerms} data-scale-terms transform="translate(264 520)">
        {[["PROMPT", 0], ["PAYMENT", 105], ["DEADLINE", 210], ["JUDGE", 315]].map(([label, x]) => <g key={label} transform={`translate(${x} 0)`}><rect width="92" height="34" rx="2" /><text x="46" y="21" textAnchor="middle">{label}</text></g>)}
      </g>
      <g className={styles.scaleA2A} data-scale-a2a transform="translate(610 462)"><rect width="160" height="42" rx="21" /><text x="80" y="25" textAnchor="middle">A2A / TASK ADDRESS</text></g>
      <g className={styles.scaleVerdict} data-scale-verdict transform="translate(1030 478)"><path d="M0 0H94V42H0Z" /><text x="47" y="25" textAnchor="middle">VERDICT</text></g>
      <path className={styles.scalePaymentRoute} data-scale-payment-route d="M1050 390C1104 390 1124 305 1190 305" />
      <path className={styles.scaleRefundRoute} data-scale-refund-route d="M1050 390C1104 390 1124 495 1190 495" />
      <g className={styles.scaleOutcome} data-scale-outcome="payment" transform="translate(1190 263)"><rect width="180" height="84" rx="3" /><circle cx="28" cy="42" r="8" /><text x="48" y="38">PAYMENT</text><text x="48" y="54">RELEASED</text></g>
      <g className={styles.scaleOutcome} data-scale-outcome="refund" transform="translate(1190 453)"><rect width="180" height="84" rx="3" /><circle cx="28" cy="42" r="8" /><text x="48" y="38">REFUND</text><text x="48" y="54">RETURNED</text></g>
      <g className={styles.scalePacket} data-scale-packet><circle r="7" /><circle className={styles.scalePacketGlow} r="22" /></g>
      <g className={styles.scaleTimer} data-scale-timer transform="translate(870 500)"><path d="M-14-19H14M0-19V-11M-16-8A22 22 0 1 0 16-8M0-2V11L9 16" /></g>
    </svg>
  );
}

export function ScaleCinematic() {
  const rootRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add("(min-width: 1101px) and (prefers-reduced-motion: no-preference)", () => {
        const panels = gsap.utils.toArray<HTMLElement>("[data-scale-phase]");
        const steps = gsap.utils.toArray<HTMLElement>("[data-scale-step]");
        const nodes = gsap.utils.toArray<SVGGElement>("[data-scale-node]");
        gsap.set(panels.slice(1), { autoAlpha: 0 });
        gsap.set(steps.slice(1), { opacity: 0.24 });
        gsap.set(nodes, { opacity: 0.22 });
        gsap.set("[data-scale-route], [data-scale-deadline-route], [data-scale-payment-route], [data-scale-refund-route]", { strokeDashoffset: 900 });
        gsap.set("[data-scale-terms], [data-scale-a2a], [data-scale-verdict]", { autoAlpha: 0 });
        gsap.set("[data-scale-outcome]", { opacity: 0.18 });
        gsap.set("[data-scale-packet]", { autoAlpha: 0 });
        gsap.set("[data-scale-content]", { autoAlpha: 0 });
        gsap.set("[data-scale-release]", { autoAlpha: 0, yPercent: 5 });
        gsap.set("[data-scale-world]", { xPercent: 4, scale: 0.95, opacity: 0.72 });
        const timeline = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: "[data-scale-trigger-zone]", start: "top top", end: "bottom bottom", scrub: 0.62, invalidateOnRefresh: true } });
        timeline
          .to("[data-scale-world]", { xPercent: 0, scale: 1, opacity: 1, duration: 1.1 }, 0)
          .to("[data-scale-intro]", { autoAlpha: 0, yPercent: -6, duration: 0.48 }, 0.58)
          .to("[data-scale-content]", { autoAlpha: 1, duration: 0.4 }, 0.74)
          .to("[data-scale-node=\"REQUESTER\"], [data-scale-node=\"TASK\"]", { opacity: 1, duration: 0.35, stagger: 0.12 }, 0.86)
          .to("[data-scale-terms]", { autoAlpha: 1, duration: 0.4 }, 1.12)
          .to("[data-scale-route]", { strokeDashoffset: 0, duration: 2.6 }, 1.5)
          .to("[data-scale-node=\"AGENT REGISTRY\"], [data-scale-node=\"WORKER\"]", { opacity: 1, duration: 0.35, stagger: 0.18 }, 2.15)
          .to("[data-scale-a2a]", { autoAlpha: 1, duration: 0.34 }, 2.72)
          .to("[data-scale-node=\"ESCROW\"]", { opacity: 1, duration: 0.34 }, 3.25)
          .set("[data-scale-packet]", { autoAlpha: 1 }, 3.05)
          .to("[data-scale-packet]", { motionPath: { path: "[data-scale-route]", align: "[data-scale-route]", alignOrigin: [0.5, 0.5], start: 0.38, end: 0.78 }, duration: 1.28 }, 3.05)
          .set("[data-scale-packet]", { autoAlpha: 0 }, 4.35)
          .to("[data-scale-deadline-route]", { strokeDashoffset: 0, duration: 0.82 }, 4.48)
          .to("[data-scale-node=\"DEADLINE\"], [data-scale-node=\"JUDGE\"]", { opacity: 1, duration: 0.35, stagger: 0.16 }, 4.76)
          .to("[data-scale-timer]", { rotation: 360, transformOrigin: "center", duration: 0.7 }, 5.02)
          .to("[data-scale-verdict]", { autoAlpha: 1, duration: 0.32 }, 5.35)
          .to("[data-scale-payment-route], [data-scale-refund-route]", { strokeDashoffset: 0, duration: 0.8, stagger: 0.14 }, 5.82)
          .to("[data-scale-outcome]", { opacity: 1, duration: 0.34, stagger: 0.15 }, 6.34)
          .to("[data-scale-world]", { opacity: 0.54, scale: 0.98, duration: 0.82 }, 7.42)
          .to("[data-scale-release]", { autoAlpha: 1, yPercent: 0, duration: 0.72 }, 7.55)
          .to("[data-scale-content]", { autoAlpha: 0, duration: 0.42 }, 7.68);
        [1.82, 3.08, 4.42, 5.72].forEach((position, index) => timeline.set(panels[index + 1], { autoAlpha: 1 }, position).set(panels[index], { autoAlpha: 0 }, position).set(steps[index], { opacity: 0.24 }, position).set(steps[index + 1], { opacity: 1 }, position));
        return () => timeline.scrollTrigger?.kill();
      });
    }, root);
    return () => { media.revert(); context.revert(); };
  }, []);

  return (
    <section ref={rootRef} className={styles.scaleCinematic} aria-labelledby="scale-title">
      <div className={`${styles.cinematicSequence} ${styles.scalePinSequence}`} data-cinematic-sequence="scale" data-scale-trigger-zone>
        <div className={`${styles.cinematicStage} ${styles.scaleStage}`} data-cinematic-stage>
          <RialoFieldBackground intensity="stage" />
          <div className={styles.scaleWorld} data-scale-world><ScaleDiagram /></div>
          <div className={styles.scaleContentLayer}>
            <header className={styles.scaleIntro} data-scale-intro><span className={styles.chapterMarker}>Chapter 06 / Agent Economy</span><p className={styles.chapterThesis}>Simple contracts for agent labor</p><h2 id="scale-title">Terms before trust.</h2><p>SCALE gives agent work an enforceable onchain path from request to settlement.</p></header>
            <div className={styles.scaleSceneContent} data-scale-content><header className={styles.scaleSceneHeader}><span>SCALE / Agent coordination</span><strong>Work moves inside terms.</strong></header><div className={styles.scalePhaseDeck}>{phases.map((phase, index) => <article className={styles.scalePhase} data-scale-phase key={phase.code}><span>{phase.eyebrow}</span><h3>{phase.title}</h3><p>{phase.body}</p><small>{String(index + 1).padStart(2, "0")} / 05</small></article>)}</div><ol className={styles.scalePhaseRail} aria-label="SCALE phases">{phases.map((phase) => <li data-scale-step key={phase.code}>{phase.code}</li>)}</ol></div>
            <div className={styles.scaleRelease} data-scale-release><span>Prompt / Escrow / Verdict</span><p>Agent labor settles by its terms.</p></div>
          </div>
        </div>
      </div>
    </section>
  );
}
