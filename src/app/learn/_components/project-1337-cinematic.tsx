"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import styles from "../learn.module.css";
import { RialoFieldBackground } from "./rialo-field-background";

const phases = [
  { code: "FEED", eyebrow: "01 / Ingest", title: "The market arrives as motion.", body: "Massive streams live symbols, prices, and timestamps into Rialo's data path." },
  { code: "PROCESS", eyebrow: "02 / Process", title: "Noise becomes a useful estimate.", body: "The pipeline evaluates the fast-moving feed instead of forwarding every raw tick." },
  { code: "ESTIMATE", eyebrow: "03 / Estimate", title: "One compact price carries the signal.", body: "A market-maker-style best estimate accounts for movement such as momentum." },
  { code: "SIGN", eyebrow: "04 / Sign", title: "The derived output carries its proof.", body: "Cryptographic signing binds the published value to Massive data and its preprocessing." },
  { code: "PUBLISH", eyebrow: "05 / Publish", title: "Financial systems receive verified speed.", body: "Perpetuals, RWA markets, and synthetic markets can consume the onchain output." },
] as const;

function MarketEngineDiagram() {
  const ticks = [
    ["AAPL", "225.43", "+0.18"], ["NVDA", "146.71", "+0.42"],
    ["EURUSD", "1.0482", "-0.03"], ["GOLD", "2648.9", "+0.11"],
    ["TSLA", "421.06", "+0.27"], ["SPX", "5981.2", "+0.09"],
  ] as const;

  return (
    <svg className={styles.p1337Diagram} viewBox="0 0 1440 820" aria-hidden="true">
      <defs>
        <filter id="p1337-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="8" /></filter>
        <linearGradient id="p1337-stream" x1="0" x2="1"><stop stopColor="#a9ddd3" stopOpacity=".08" /><stop offset=".5" stopColor="#a9ddd3" /><stop offset="1" stopColor="#e8e3d5" stopOpacity=".75" /></linearGradient>
        <pattern id="p1337-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#e8e3d5" strokeOpacity=".03" /></pattern>
      </defs>
      <rect width="1440" height="820" fill="url(#p1337-grid)" />

      <g className={styles.p1337Feed} data-p1337-feed transform="translate(210 220)">
        <text className={styles.p1337SectionLabel} x="0" y="-28">MASSIVE / LIVE MARKET FEED</text>
        {ticks.map((tick, index) => (
          <g className={styles.p1337Tick} data-p1337-tick key={tick[0]} transform={`translate(0 ${index * 52})`}>
            <path d="M0 34H272" />
            <text x="0" y="20">{tick[0]}</text><text x="92" y="20">{tick[1]}</text><text x="190" y="20">{tick[2]}</text>
            <circle cx="260" cy="16" r="3" />
          </g>
        ))}
      </g>

      <path className={styles.p1337MainRoute} data-p1337-route d="M486 374C552 374 558 410 620 410" />
      <g className={styles.p1337Packet} data-p1337-packet><rect x="-28" y="-10" width="56" height="20" rx="2" /><text y="3" textAnchor="middle">TICK</text></g>

      <g className={styles.p1337Processor} data-p1337-processor transform="translate(620 278)">
        <path className={styles.p1337ProcessorShell} d="M0 0H250V264H0Z" />
        <text x="125" y="30" textAnchor="middle">PRICE PROCESSING</text>
        {[0, 1, 2, 3].map((line) => <path data-p1337-process-line key={line} d={`M34 ${76 + line * 39}C78 ${42 + line * 48} 166 ${112 + line * 20} 216 ${70 + line * 42}`} />)}
        <text x="34" y="238">MOMENTUM</text><text x="151" y="238">DENSITY</text>
      </g>

      <path className={styles.p1337OutputRoute} data-p1337-output-route d="M870 410H1000" />
      <g className={styles.p1337Estimate} data-p1337-estimate transform="translate(1000 330)">
        <rect width="170" height="160" rx="85" />
        <text x="85" y="34" textAnchor="middle">BEST ESTIMATE</text>
        <text className={styles.p1337Price} x="85" y="92" textAnchor="middle">225.47</text>
        <text x="85" y="126" textAnchor="middle">DERIVED / COMPACT</text>
      </g>

      <path className={styles.p1337SignRoute} data-p1337-sign-route d="M1170 410H1250" />
      <g className={styles.p1337Signature} data-p1337-signature transform="translate(1250 365)">
        <rect width="145" height="90" rx="3" /><path d="M20 57C42 18 65 76 89 37S121 35 127 22" />
        <text x="72" y="76" textAnchor="middle">SIGNED OUTPUT</text>
      </g>

      <g className={styles.p1337Destinations} data-p1337-destinations>
        {[["PERPETUALS", 955], ["RWA MARKETS", 1130], ["SYNTHETICS", 1305]].map(([label, x]) => (
          <g data-p1337-destination key={label} transform={`translate(${x} 650)`}>
            <rect x="-70" y="-24" width="140" height="48" rx="2" /><circle cx="-48" r="4" /><text x="-34" y="4">{label}</text>
          </g>
        ))}
        <path data-p1337-publish-route d="M1322 455C1322 570 1130 560 1130 626M1130 626H955M1130 626H1305" />
      </g>
      <circle className={styles.p1337Pulse} data-p1337-pulse r="8" />
    </svg>
  );
}

export function Project1337Cinematic() {
  const rootRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add("(min-width: 1101px) and (prefers-reduced-motion: no-preference)", () => {
        const panels = gsap.utils.toArray<HTMLElement>("[data-p1337-phase]");
        const steps = gsap.utils.toArray<HTMLElement>("[data-p1337-step]");
        const ticks = gsap.utils.toArray<SVGGElement>("[data-p1337-tick]");
        const processLines = gsap.utils.toArray<SVGPathElement>("[data-p1337-process-line]");
        const destinations = gsap.utils.toArray<SVGGElement>("[data-p1337-destination]");
        gsap.set(panels.slice(1), { autoAlpha: 0 });
        gsap.set(steps.slice(1), { opacity: 0.24 });
        gsap.set(ticks, { opacity: 0.24, x: -24 });
        gsap.set(processLines, { strokeDashoffset: 260 });
        gsap.set("[data-p1337-packet]", { autoAlpha: 0 });
        gsap.set("[data-p1337-processor]", { opacity: 0.22 });
        gsap.set("[data-p1337-output-route], [data-p1337-sign-route], [data-p1337-publish-route]", { strokeDashoffset: 420 });
        gsap.set("[data-p1337-estimate], [data-p1337-signature]", { opacity: 0.2 });
        gsap.set(destinations, { opacity: 0.18 });
        gsap.set("[data-p1337-pulse]", { autoAlpha: 0 });
        gsap.set("[data-p1337-content]", { autoAlpha: 0 });
        gsap.set("[data-p1337-release]", { autoAlpha: 0, yPercent: 5 });
        gsap.set("[data-p1337-world]", { xPercent: 4, scale: 0.95, opacity: 0.72 });

        const timeline = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: "[data-p1337-trigger-zone]", start: "top top", end: "bottom bottom", scrub: 0.58, invalidateOnRefresh: true } });
        timeline
          .to("[data-p1337-world]", { xPercent: 0, scale: 1, opacity: 1, duration: 1.1 }, 0)
          .to("[data-p1337-intro]", { autoAlpha: 0, yPercent: -6, duration: 0.48 }, 0.58)
          .to("[data-p1337-content]", { autoAlpha: 1, duration: 0.4 }, 0.74)
          .to(ticks, { opacity: 1, x: 0, duration: 0.32, stagger: 0.08 }, 0.84)
          .set("[data-p1337-packet]", { autoAlpha: 1 }, 1.34)
          .to("[data-p1337-packet]", { motionPath: { path: "[data-p1337-route]", align: "[data-p1337-route]", alignOrigin: [0.5, 0.5] }, duration: 1.28 }, 1.34)
          .set("[data-p1337-packet]", { autoAlpha: 0 }, 2.64)
          .to("[data-p1337-processor]", { opacity: 1, duration: 0.35 }, 2.28)
          .to(processLines, { strokeDashoffset: 0, duration: 0.62, stagger: 0.12 }, 2.42)
          .to("[data-p1337-output-route]", { strokeDashoffset: 0, duration: 0.72 }, 3.78)
          .to("[data-p1337-estimate]", { opacity: 1, scale: 1.04, transformOrigin: "center", duration: 0.32 }, 4.16)
          .to("[data-p1337-estimate]", { scale: 1, duration: 0.24 }, 4.48)
          .to("[data-p1337-sign-route]", { strokeDashoffset: 0, duration: 0.58 }, 5.08)
          .to("[data-p1337-signature]", { opacity: 1, duration: 0.34 }, 5.42)
          .to("[data-p1337-publish-route]", { strokeDashoffset: 0, duration: 0.9 }, 6.16)
          .to(destinations, { opacity: 1, duration: 0.3, stagger: 0.13 }, 6.54)
          .set("[data-p1337-pulse]", { autoAlpha: 1 }, 6.2)
          .to("[data-p1337-pulse]", { motionPath: { path: "[data-p1337-publish-route]", align: "[data-p1337-publish-route]", alignOrigin: [0.5, 0.5] }, duration: 1.05 }, 6.2)
          .set("[data-p1337-pulse]", { autoAlpha: 0 }, 7.28)
          .to("[data-p1337-world]", { opacity: 0.54, scale: 0.98, duration: 0.8 }, 7.72)
          .to("[data-p1337-release]", { autoAlpha: 1, yPercent: 0, duration: 0.7 }, 7.84)
          .to("[data-p1337-content]", { autoAlpha: 0, duration: 0.42 }, 7.96);
        [1.92, 3.3, 4.78, 6.0].forEach((position, index) => timeline.set(panels[index + 1], { autoAlpha: 1 }, position).set(panels[index], { autoAlpha: 0 }, position).set(steps[index], { opacity: 0.24 }, position).set(steps[index + 1], { opacity: 1 }, position));
        return () => timeline.scrollTrigger?.kill();
      });
    }, root);
    return () => { media.revert(); context.revert(); };
  }, []);

  return (
    <section ref={rootRef} className={styles.p1337Cinematic} aria-labelledby="p1337-title">
      <div className={`${styles.cinematicSequence} ${styles.p1337PinSequence}`} data-cinematic-sequence="p1337" data-p1337-trigger-zone>
        <div className={`${styles.cinematicStage} ${styles.p1337Stage}`} data-cinematic-stage>
          <RialoFieldBackground intensity="stage" />
          <div className={styles.p1337World} data-p1337-world><MarketEngineDiagram /></div>
          <div className={styles.p1337ContentLayer}>
            <header className={styles.p1337Intro} data-p1337-intro><span className={styles.chapterMarker}>Chapter 05 / Project 1337</span><p className={styles.chapterThesis}>Live markets into verified state</p><h2 id="p1337-title">Price moves. Rialo keeps pace.</h2><p>A high-speed pipeline turns financial-market motion into signed onchain output.</p></header>
            <div className={styles.p1337SceneContent} data-p1337-content>
              <header className={styles.p1337SceneHeader}><span>Project 1337 / Market engine</span><strong>Signal, not raw noise.</strong></header>
              <div className={styles.p1337PhaseDeck}>{phases.map((phase, index) => <article className={styles.p1337Phase} data-p1337-phase key={phase.code}><span>{phase.eyebrow}</span><h3>{phase.title}</h3><p>{phase.body}</p><small>{String(index + 1).padStart(2, "0")} / 05</small></article>)}</div>
              <ol className={styles.p1337PhaseRail} aria-label="Project 1337 phases">{phases.map((phase) => <li data-p1337-step key={phase.code}>{phase.code}</li>)}</ol>
            </div>
            <div className={styles.p1337Release} data-p1337-release><span>Ingest / Derive / Verify</span><p>Market speed becomes onchain infrastructure.</p></div>
          </div>
        </div>
      </div>
    </section>
  );
}
