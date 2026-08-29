"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import styles from "../learn.module.css";
import { RialoFieldBackground } from "./rialo-field-background";

const phases = [
  {
    code: "STAKE",
    eyebrow: "01 / Principal",
    title: "Capital stays at work.",
    body: "The principal remains staked, securing the network and producing future rewards.",
  },
  {
    code: "YIELD",
    eyebrow: "02 / Future rewards",
    title: "Route a fraction of what comes next.",
    body: "The position selects how much future yield should flow toward services.",
  },
  {
    code: "PAYMASTER",
    eyebrow: "03 / Convert",
    title: "Yield becomes a service budget.",
    body: "Routed rewards enter the ServicePaymaster, which mints equivalent service credits.",
  },
  {
    code: "CREDITS",
    eyebrow: "04 / Consume",
    title: "Credits fund useful work.",
    body: "Gas, storage, and scheduled execution draw from credits that stay bound to service use.",
  },
  {
    code: "AUTOMATE",
    eyebrow: "05 / Sustain",
    title: "Automation gains a continuous funding loop.",
    body: "Stake-for-Service can keep Reactive Transactions operating without repeated manual top-ups.",
  },
] as const;

function StakeServiceDiagram() {
  return (
    <svg className={styles.sfsDiagram} viewBox="0 0 1440 820" aria-hidden="true">
      <defs>
        <filter id="sfs-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <linearGradient id="sfs-stream" x1="0" x2="1">
          <stop offset="0" stopColor="#e8e3d5" stopOpacity=".18" />
          <stop offset=".48" stopColor="#a9ddd3" />
          <stop offset="1" stopColor="#a9ddd3" stopOpacity=".25" />
        </linearGradient>
        <radialGradient id="sfs-reservoir">
          <stop offset="0" stopColor="#a9ddd3" stopOpacity=".2" />
          <stop offset=".7" stopColor="#a9ddd3" stopOpacity=".04" />
          <stop offset="1" stopColor="#010101" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g className={styles.sfsPrincipal} data-sfs-principal transform="translate(232 386)">
        <circle className={styles.sfsReservoirGlow} r="122" fill="url(#sfs-reservoir)" />
        <circle className={styles.sfsReservoirOuter} r="86" />
        <circle className={styles.sfsReservoirInner} r="61" />
        <path d="M-38 8C-18-16 19-16 39 8M-29 25C-11 9 12 9 30 25" />
        <text y="-10" textAnchor="middle">STAKED</text>
        <text className={styles.sfsNodeTitle} y="12" textAnchor="middle">PRINCIPAL</text>
        <text y="116" textAnchor="middle">REMAINS STAKED</text>
      </g>

      <path className={styles.sfsYieldRoute} data-sfs-yield-route d="M318 386C405 386 411 304 497 304" />
      <path className={styles.sfsReturnRoute} d="M318 386C405 386 411 468 497 468" />
      <text className={styles.sfsRouteLabel} x="392" y="322">SELECTED YIELD</text>
      <text className={styles.sfsRouteLabel} x="390" y="485">REMAINDER / STANDARD PATH</text>

      <g className={styles.sfsYieldPacket} data-sfs-yield-packet>
        <circle r="8" />
        <circle className={styles.sfsYieldGlow} r="24" />
      </g>

      <g className={styles.sfsRouter} data-sfs-router transform="translate(497 235)">
        <rect width="190" height="224" rx="95" />
        <circle cx="95" cy="97" r="54" />
        <path className={styles.sfsRouterArc} data-sfs-router-arc d="M63 123A43 43 0 1 1 132 119" />
        <path d="M95 97L126 74" />
        <text x="95" y="31" textAnchor="middle">ROUTING FRACTION</text>
        <text className={styles.sfsRouterValue} data-sfs-router-value x="95" y="104" textAnchor="middle">ROUTED</text>
        <text x="95" y="190" textAnchor="middle">FUTURE REWARDS ONLY</text>
      </g>

      <path className={styles.sfsPaymasterRoute} data-sfs-paymaster-route d="M687 347C750 347 763 386 816 386" />
      <g className={styles.sfsPaymaster} data-sfs-paymaster transform="translate(816 285)">
        <rect width="230" height="202" rx="5" />
        <path d="M30 61H200M30 141H200" />
        <circle cx="115" cy="101" r="31" />
        <path d="M99 101H131M115 85V117" />
        <text x="115" y="35" textAnchor="middle">SERVICEPAYMASTER</text>
        <text className={styles.sfsNodeTitle} x="115" y="175" textAnchor="middle">MINT CREDITS 1:1</text>
      </g>

      <g className={styles.sfsCreditBurst} data-sfs-credit-burst transform="translate(1075 386)">
        <circle r="42" />
        <circle r="25" />
        <text y="4" textAnchor="middle">CREDITS</text>
        <text y="69" textAnchor="middle">SERVICE-BOUND</text>
      </g>
      <path className={styles.sfsCreditRoute} data-sfs-credit-route d="M1046 386H1075" />

      <path className={styles.sfsServiceBranch} data-sfs-service-branch="gas" d="M1117 386C1180 386 1177 254 1260 254" />
      <path className={styles.sfsServiceBranch} data-sfs-service-branch="storage" d="M1117 386H1260" />
      <path className={styles.sfsServiceBranch} data-sfs-service-branch="scheduled" d="M1117 386C1180 386 1177 518 1260 518" />

      {(["gas", "storage", "scheduled"] as const).map((service, index) => (
        <g className={styles.sfsService} data-sfs-service={service} key={service} transform={`translate(1260 ${210 + index * 132})`}>
          <rect width="134" height="88" rx="3" />
          <circle cx="24" cy="44" r="8" />
          <text x="43" y="48">{service === "scheduled" ? "SCHEDULED" : service.toUpperCase()}</text>
          {service === "scheduled" ? <text x="43" y="62">EXECUTION</text> : null}
        </g>
      ))}

      <path className={styles.sfsReactiveBridge} data-sfs-reactive-bridge d="M1260 650C1080 720 780 726 610 650" />
      <g className={styles.sfsReactiveNode} data-sfs-reactive-node transform="translate(610 620)">
        <rect width="260" height="64" rx="32" />
        <circle cx="31" cy="32" r="8" />
        <text x="55" y="29">REACTIVE TRANSACTIONS</text>
        <text x="55" y="45">CONTINUOUSLY FUNDED</text>
      </g>

      {[0, 1, 2, 3].map((index) => (
        <g className={styles.sfsFlowParticle} data-sfs-flow-particle key={index}>
          <circle r={index % 2 === 0 ? 6 : 4} />
        </g>
      ))}
    </svg>
  );
}

export function StakeServiceCinematic() {
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
          const phasePanels = gsap.utils.toArray<HTMLElement>("[data-sfs-phase]");
          const phaseSteps = gsap.utils.toArray<HTMLElement>("[data-sfs-step]");
          const services = gsap.utils.toArray<SVGElement>("[data-sfs-service]");
          const branches = gsap.utils.toArray<SVGPathElement>("[data-sfs-service-branch]");
          const particles = gsap.utils.toArray<SVGGElement>("[data-sfs-flow-particle]");

          gsap.set(phasePanels.slice(1), { autoAlpha: 0 });
          gsap.set(phaseSteps.slice(1), { opacity: 0.24 });
          gsap.set("[data-sfs-router]", { opacity: 0.24 });
          gsap.set("[data-sfs-paymaster]", { opacity: 0.2 });
          gsap.set("[data-sfs-credit-burst]", { opacity: 0.18, scale: 0.7 });
          gsap.set(services, { opacity: 0.18 });
          gsap.set(branches, { strokeDashoffset: 240 });
          gsap.set("[data-sfs-paymaster-route]", { strokeDashoffset: 150 });
          gsap.set("[data-sfs-credit-route]", { strokeDashoffset: 40 });
          gsap.set("[data-sfs-reactive-bridge]", { strokeDashoffset: 760 });
          gsap.set("[data-sfs-reactive-node]", { autoAlpha: 0, y: 14 });
          gsap.set("[data-sfs-yield-packet]", { autoAlpha: 0 });
          gsap.set(particles, { autoAlpha: 0 });
          gsap.set("[data-sfs-content]", { autoAlpha: 0 });
          gsap.set("[data-sfs-release]", { autoAlpha: 0, yPercent: 5 });
          gsap.set("[data-sfs-world]", { xPercent: 3, yPercent: 2, scale: 0.95, opacity: 0.72 });
          gsap.set("[data-sfs-router-value]", { textContent: "SELECT" });

          const timeline = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: "[data-sfs-trigger-zone]",
              start: "top top",
              end: "bottom bottom",
              scrub: 0.62,
              invalidateOnRefresh: true,
            },
          });

          timeline
            .to("[data-sfs-world]", { xPercent: 0, yPercent: 0, scale: 1, opacity: 1, duration: 1.1 }, 0)
            .to("[data-sfs-intro]", { autoAlpha: 0, yPercent: -6, duration: 0.48 }, 0.58)
            .to("[data-sfs-content]", { autoAlpha: 1, duration: 0.4 }, 0.74)
            .to("[data-sfs-principal]", { scale: 1.035, transformOrigin: "center", duration: 0.28 }, 0.9)
            .to("[data-sfs-principal]", { scale: 1, duration: 0.38 }, 1.18)
            .set("[data-sfs-yield-packet]", { autoAlpha: 1 }, 1.42)
            .to(
              "[data-sfs-yield-packet]",
              {
                motionPath: {
                  path: "[data-sfs-yield-route]",
                  align: "[data-sfs-yield-route]",
                  alignOrigin: [0.5, 0.5],
                  start: 0,
                  end: 1,
                },
                duration: 1.3,
              },
              1.42,
            )
            .to("[data-sfs-router]", { opacity: 1, duration: 0.36 }, 2.25)
            .to("[data-sfs-router-arc]", { strokeDashoffset: 0, duration: 0.65 }, 2.32)
            .set("[data-sfs-router-value]", { textContent: "ROUTED" }, 2.72)
            .set("[data-sfs-yield-packet]", { autoAlpha: 0 }, 2.9)
            .to("[data-sfs-paymaster-route]", { strokeDashoffset: 0, duration: 0.78 }, 3.25)
            .to("[data-sfs-paymaster]", { opacity: 1, duration: 0.38 }, 3.72)
            .to("[data-sfs-credit-route]", { strokeDashoffset: 0, duration: 0.3 }, 4.3)
            .to("[data-sfs-credit-burst]", { opacity: 1, scale: 1, duration: 0.42 }, 4.42)
            .to(branches, { strokeDashoffset: 0, duration: 0.82, stagger: 0.12 }, 5.02)
            .to(services, { opacity: 1, duration: 0.34, stagger: 0.14 }, 5.42);

          particles.forEach((particle, index) => {
            const service = (["gas", "storage", "scheduled"] as const)[index % 3];
            timeline
              .set(particle, { autoAlpha: 1 }, 5.05 + index * 0.16)
              .to(
                particle,
                {
                  motionPath: {
                    path: `[data-sfs-service-branch="${service}"]`,
                    align: `[data-sfs-service-branch="${service}"]`,
                    alignOrigin: [0.5, 0.5],
                    start: 0,
                    end: 1,
                  },
                  duration: 1.05,
                },
                5.05 + index * 0.16,
              )
              .set(particle, { autoAlpha: 0 }, 6.55);
          });

          timeline
            .to("[data-sfs-reactive-bridge]", { strokeDashoffset: 0, duration: 1.15 }, 6.48)
            .to("[data-sfs-reactive-node]", { autoAlpha: 1, y: 0, duration: 0.46 }, 7.08)
            .to("[data-sfs-world]", { opacity: 0.55, scale: 0.98, duration: 0.82 }, 8.05)
            .to("[data-sfs-release]", { autoAlpha: 1, yPercent: 0, duration: 0.72 }, 8.17)
            .to("[data-sfs-content]", { autoAlpha: 0, duration: 0.42 }, 8.28);

          [1.72, 3.12, 4.62, 6.38].forEach((position, index) => {
            timeline
              .set(phasePanels[index + 1], { autoAlpha: 1 }, position)
              .set(phasePanels[index], { autoAlpha: 0 }, position)
              .set(phaseSteps[index], { opacity: 0.24 }, position)
              .set(phaseSteps[index + 1], { opacity: 1 }, position);
          });

          return () => timeline.scrollTrigger?.kill();
        },
      );
    }, root);

    return () => {
      media.revert();
      context.revert();
    };
  }, []);

  return (
    <section ref={rootRef} className={styles.sfsCinematic} aria-labelledby="sfs-title">
      <div
        className={`${styles.cinematicSequence} ${styles.sfsPinSequence}`}
        data-cinematic-sequence="sfs"
        data-sfs-trigger-zone
      >
        <div className={`${styles.cinematicStage} ${styles.sfsStage}`} data-cinematic-stage>
          <RialoFieldBackground intensity="stage" />
          <div className={styles.sfsWorld} data-sfs-world>
            <StakeServiceDiagram />
          </div>

          <div className={styles.sfsContentLayer}>
            <header className={styles.sfsIntro} data-sfs-intro>
              <span className={styles.chapterMarker}>Chapter 04 / Stake-for-Service</span>
              <span className={styles.systemType}>Economic mechanism</span>
              <p className={styles.chapterThesis}>Yield into utility</p>
              <h2 id="sfs-title">Keep the stake. Route the rewards.</h2>
              <p>Future yield becomes a renewable budget for network services.</p>
            </header>

            <div className={styles.sfsSceneContent} data-sfs-content>
              <header className={styles.sfsSceneHeader}>
                <span>Stake-for-Service / Capital flow</span>
                <strong>Principal stays. Utility flows.</strong>
              </header>

              <div className={styles.sfsPhaseDeck}>
                {phases.map((phase, index) => (
                  <article className={styles.sfsPhase} data-sfs-phase key={phase.code}>
                    <span>{phase.eyebrow}</span>
                    <h3>{phase.title}</h3>
                    <p>{phase.body}</p>
                    <small>{String(index + 1).padStart(2, "0")} / 05</small>
                  </article>
                ))}
              </div>

              <ol className={styles.sfsPhaseRail} aria-label="Stake-for-Service phases">
                {phases.map((phase) => (
                  <li data-sfs-step key={phase.code}>{phase.code}</li>
                ))}
              </ol>
            </div>

            <div className={styles.sfsRelease} data-sfs-release>
              <span>Stake-for-Service + Reactive Transactions</span>
              <p>Automation can fund its next execution.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
