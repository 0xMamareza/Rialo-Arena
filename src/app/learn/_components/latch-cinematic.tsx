"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import styles from "../learn.module.css";
import { RialoFieldBackground } from "./rialo-field-background";

const pipelinePhases = [
  {
    code: "SCOPE",
    eyebrow: "01 / Token boundary",
    title: "Delegate access, not the credential.",
    body: "The agent holds a scoped lat_ token. The real API credential remains a write-only Secret inside Latch.",
  },
  {
    code: "ALLOW",
    eyebrow: "02 / Allowed run",
    title: "Policy clears before authority appears.",
    body: "Method, endpoint, identity, rate, and spend controls pass in order. Only then is the Secret injected for upstream.",
  },
  {
    code: "403",
    eyebrow: "03 / Policy denial",
    title: "First deny stops the request.",
    body: "An endpoint denial returns 403. Later filters do not run, the credential is not used, and upstream sees nothing.",
  },
  {
    code: "429",
    eyebrow: "04 / Rate denial",
    title: "Live limits close the gate.",
    body: "A sliding-window cap returns 429 with Retry-After. The denied request never crosses the policy boundary.",
  },
  {
    code: "RETURN",
    eyebrow: "05 / Response control",
    title: "Control what comes back.",
    body: "The response filter runs after upstream and can block or redact sensitive fields before the caller sees them.",
  },
] as const;

const filterLabels = ["METHOD", "ENDPOINT", "IDENTITY", "RATE LIMIT", "SPEND LIMIT"] as const;

function PipelineDiagram() {
  return (
    <svg className={styles.latchPipelineSvg} viewBox="0 0 1440 820" aria-hidden="true">
      <defs>
        <filter id="latch-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <linearGradient id="latch-trace-gradient" x1="0" x2="1">
          <stop offset="0" stopColor="#a9ddd3" stopOpacity=".12" />
          <stop offset=".5" stopColor="#a9ddd3" />
          <stop offset="1" stopColor="#a9ddd3" stopOpacity=".2" />
        </linearGradient>
        <pattern id="latch-grid" width="34" height="34" patternUnits="userSpaceOnUse">
          <path d="M34 0H0V34" fill="none" stroke="#e8e3d5" strokeOpacity=".035" />
        </pattern>
      </defs>

      <rect width="1440" height="820" fill="url(#latch-grid)" />
      <path className={styles.latchPipelineRail} d="M104 392H1294" />
      <path
        className={styles.latchEntryTrace}
        data-latch-entry-trace
        d="M104 392H382"
      />
      <path
        className={styles.latchPipelineTrace}
        data-latch-trace
        d="M104 392H1294"
      />
      <path
        className={styles.latchResponseRail}
        data-latch-response-route
        d="M1294 548C1090 548 984 634 790 634H220"
      />

      <g className={styles.latchTerminal} transform="translate(74 332)">
        <rect width="112" height="120" rx="2" />
        <circle cx="56" cy="42" r="15" />
        <path d="M31 89C36 68 76 68 81 89" />
        <text x="56" y="108" textAnchor="middle">AGENT</text>
      </g>

      <g className={styles.latchTokenNode} transform="translate(213 344)">
        <rect width="142" height="96" rx="48" />
        <circle cx="24" cy="48" r="5" />
        <text x="45" y="43">SCOPED TOKEN</text>
        <text className={styles.latchTokenValue} x="45" y="63">lat_7F2A...</text>
      </g>

      <g className={styles.latchPolicyBoundary}>
        <path d="M382 272V510" />
        <text x="397" y="294">ORDERED POLICY PIPELINE</text>
      </g>

      {filterLabels.map((label, index) => {
        const x = 420 + index * 130;
        const key = label.toLowerCase().replace(" ", "-");
        return (
          <g
            className={styles.latchFilter}
            data-latch-filter={key}
            key={label}
            transform={`translate(${x} 332)`}
          >
            <rect width="106" height="120" rx="3" />
            <path d="M18 34H88M18 42H72" />
            <circle cx="53" cy="67" r="12" />
            <path d="M47 67L51 71L60 62" />
            <text x="53" y="101" textAnchor="middle">{label}</text>
          </g>
        );
      })}

      <g className={styles.latchSecretNode} data-latch-secret transform="translate(1086 320)">
        <rect width="116" height="144" rx="4" />
        <path className={styles.latchVaultDoor} data-latch-vault-door d="M18 18H98V100H18Z" />
        <circle cx="58" cy="59" r="13" />
        <path d="M58 72V84" />
        <text x="58" y="124" textAnchor="middle">SECRET</text>
        <text x="58" y="137" textAnchor="middle">WRITE ONLY</text>
      </g>

      <path className={styles.latchInjectTrace} data-latch-inject d="M1070 392H1086" />

      <g className={styles.latchUpstreamNode} data-latch-upstream transform="translate(1240 332)">
        <rect width="126" height="120" rx="3" />
        <path d="M28 43H98M28 60H86M28 77H76" />
        <text x="63" y="103" textAnchor="middle">UPSTREAM</text>
      </g>

      <g className={styles.latchPacket} data-latch-packet="allowed">
        <circle r="10" />
        <circle className={styles.latchPacketGlow} r="24" />
      </g>
      <g className={styles.latchPacket} data-latch-packet="denied">
        <circle className={styles.latchStopHalo} r="24" />
        <rect x="-9" y="-9" width="18" height="18" rx="2" />
        <path className={styles.latchStopMark} d="M-4-4L4 4M4-4L-4 4" />
      </g>
      <g className={styles.latchPacket} data-latch-packet="rate">
        <circle className={styles.latchRateRing} r="24" />
        <circle r="10" />
      </g>
      <g className={`${styles.latchPacket} ${styles.latchEntryPacket}`} data-latch-packet="entry">
        <circle r="11" />
        <circle className={styles.latchPacketGlow} r="28" />
      </g>
      <g className={`${styles.latchPacket} ${styles.latchResponsePacket}`} data-latch-packet="response">
        <circle r="10" />
      </g>

      <g className={styles.latchOutcome} data-latch-outcome="allowed" transform="translate(1239 284)">
        <rect width="127" height="31" rx="15.5" />
        <text x="63.5" y="20" textAnchor="middle">200 / FORWARDED</text>
      </g>
      <g className={styles.latchOutcome} data-latch-outcome="403" transform="translate(540 470)">
        <path d="M0 0H142V50H48L32 65V50H0Z" />
        <text x="71" y="22" textAnchor="middle">403 / DENIED</text>
        <text x="71" y="37" textAnchor="middle">ENDPOINT</text>
      </g>
      <g className={styles.latchOutcome} data-latch-outcome="429" transform="translate(800 470)">
        <path d="M0 0H152V50H104L120 65V50H0Z" />
        <text x="76" y="22" textAnchor="middle">429 / RETRY AFTER</text>
        <text x="76" y="37" textAnchor="middle">RATE LIMIT</text>
      </g>

      <g className={styles.latchRedaction} data-latch-redaction transform="translate(798 574)">
        <rect width="250" height="78" rx="3" />
        <text x="18" y="23">RESPONSE FILTER</text>
        <text x="18" y="45">email</text>
        <rect x="76" y="35" width="150" height="13" rx="2" />
        <text x="18" y="64">ssn</text>
        <rect x="76" y="54" width="112" height="13" rx="2" />
      </g>

      <g className={styles.latchAuditTrace} transform="translate(420 704)">
        <text x="0" y="0">AUDIT TRACE</text>
        <path d="M92-4H944" />
        <circle cx="230" cy="-4" r="3" />
        <circle cx="480" cy="-4" r="3" />
        <circle cx="730" cy="-4" r="3" />
        <text x="944" y="0" textAnchor="end">ALLOW + DENY + FILTER REASON</text>
      </g>
      <text className={styles.latchResponseLabel} x="1176" y="581">RETURNING RESPONSE</text>
    </svg>
  );
}

function MultiMountDiagram() {
  const services = [
    { name: "MODEL", path: "/openai", y: 178 },
    { name: "PAYMENTS", path: "/stripe", y: 354 },
    { name: "MESSAGING", path: "/slack", y: 530 },
  ] as const;

  return (
    <svg className={styles.latchMountSvg} viewBox="0 0 1040 700" aria-hidden="true">
      <defs>
        <linearGradient id="latch-branch-gradient" x1="0" x2="1">
          <stop offset="0" stopColor="#a9ddd3" />
          <stop offset="1" stopColor="#a9ddd3" stopOpacity=".2" />
        </linearGradient>
      </defs>

      <g className={styles.latchMountToken}>
        <circle cx="126" cy="354" r="76" />
        <circle cx="126" cy="354" r="53" />
        <text x="126" y="346" textAnchor="middle">ONE TOKEN</text>
        <text x="126" y="369" textAnchor="middle">lat_...</text>
      </g>

      {services.map((service, index) => (
        <g className={styles.latchMountService} data-latch-mount={index} key={service.name}>
          <path
            className={styles.latchMountBranch}
            data-latch-mount-branch
            d={`M202 354C310 354 320 ${service.y} 424 ${service.y}`}
          />
          <g transform={`translate(424 ${service.y - 56})`}>
            <rect className={styles.latchMountPipeline} width="250" height="112" rx="3" />
            <text x="18" y="25">{service.path}</text>
            <text className={styles.latchMountServiceName} x="18" y="52">{service.name}</text>
            <path d="M18 77H62M74 77H118M130 77H174M186 77H230" />
            <circle cx="62" cy="77" r="3" />
            <circle cx="118" cy="77" r="3" />
            <circle cx="174" cy="77" r="3" />
          </g>
          <g className={styles.latchMountSecret} transform={`translate(704 ${service.y - 40})`}>
            <rect width="106" height="80" rx="3" />
            <path d="M31 36V27C31 15 75 15 75 27V36" />
            <rect x="25" y="36" width="56" height="29" rx="2" />
            <text x="53" y="76" textAnchor="middle">SECRET {index + 1}</text>
          </g>
          <g className={styles.latchMountUpstream} transform={`translate(840 ${service.y - 40})`}>
            <rect width="142" height="80" rx="3" />
            <path d="M20 27H122M20 40H106M20 53H88" />
            <text x="71" y="71" textAnchor="middle">UPSTREAM {index + 1}</text>
          </g>
        </g>
      ))}

      <g className={styles.latchSharedAudit} data-latch-audit>
        <path d="M424 632H982" />
        <text x="424" y="661">ONE AUDIT TRAIL</text>
        <text x="982" y="661" textAnchor="end">MOUNT + DECISION + FILTER TRACE</text>
      </g>
    </svg>
  );
}

export function LatchCinematic() {
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
          const pinnedScene = root.querySelector<HTMLElement>("[data-latch-pin]");
          const phases = gsap.utils.toArray<HTMLElement>("[data-latch-phase]");
          const steps = gsap.utils.toArray<HTMLElement>("[data-latch-step]");
          const filters = gsap.utils.toArray<SVGElement>("[data-latch-filter]");

          gsap.set(phases.slice(1), { autoAlpha: 0 });
          gsap.set(steps.slice(1), { opacity: 0.28 });
          gsap.set(filters, { opacity: 0.34 });
          gsap.set("[data-latch-packet]", { autoAlpha: 0 });
          gsap.set("[data-latch-outcome]", { autoAlpha: 0, scale: 0.82 });
          gsap.set("[data-latch-redaction]", { autoAlpha: 0, y: 12 });
          gsap.set("[data-latch-secret]", { opacity: 0.24 });
          gsap.set("[data-latch-upstream]", { opacity: 0.24 });
          gsap.set("[data-latch-inject]", { strokeDashoffset: 28 });
          gsap.set("[data-latch-trace]", { strokeDashoffset: 1220 });
          gsap.set("[data-latch-entry-trace]", { strokeDashoffset: 280 });
          gsap.set("[data-latch-scene-content]", { autoAlpha: 0 });

          const timeline = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: "[data-latch-trigger]",
              start: "top top",
              end: "bottom bottom",
              scrub: 0.55,
              invalidateOnRefresh: true,
              onUpdate: ({ progress }) => {
                if (!pinnedScene) return;

                let run = "scope";
                let activeFilter = "token";

                if (progress >= 0.742) {
                  run = "response";
                  activeFilter = "response";
                } else if (progress >= 0.558) {
                  run = "429";
                  activeFilter = "rate-limit";
                } else if (progress >= 0.399) {
                  run = "403";
                  activeFilter = "endpoint";
                } else if (progress >= 0.124) {
                  run = "allow";
                  activeFilter = progress >= 0.303
                    ? "secret"
                    : progress >= 0.263
                      ? "spend-limit"
                      : progress >= 0.222
                        ? "rate-limit"
                        : progress >= 0.182
                          ? "identity"
                          : progress >= 0.142
                            ? "endpoint"
                            : "method";
                }

                pinnedScene.dataset.latchRun = run;
                pinnedScene.dataset.latchActiveFilter = activeFilter;
              },
            },
          });

          timeline
            .set('[data-latch-packet="entry"]', { autoAlpha: 1 }, 0)
            .to("[data-latch-entry-trace]", { strokeDashoffset: 0, duration: 0.82 }, 0)
            .to(
              '[data-latch-packet="entry"]',
              {
                motionPath: {
                  path: "[data-latch-entry-trace]",
                  align: "[data-latch-entry-trace]",
                  alignOrigin: [0.5, 0.5],
                  start: 0,
                  end: 0.9,
                },
                duration: 0.82,
              },
              0,
            )
            .set('[data-latch-packet="entry"]', { autoAlpha: 0 }, 0.96)
            .to("[data-latch-world]", { scale: 1, xPercent: 0, opacity: 1, duration: 1.2 }, 0)
            .to("[data-latch-intro]", { autoAlpha: 0, yPercent: -6, duration: 0.48 }, 0.62)
            .to("[data-latch-scene-content]", { autoAlpha: 1, duration: 0.4 }, 0.78)
            .to("[data-latch-trace]", { strokeDashoffset: 0, duration: 3.2 }, 1)
            .set('[data-latch-packet="allowed"]', { autoAlpha: 1 }, 1.05)
            .to(
              '[data-latch-packet="allowed"]',
              {
                motionPath: {
                  path: "[data-latch-trace]",
                  align: "[data-latch-trace]",
                  alignOrigin: [0.5, 0.5],
                  start: 0,
                  end: 1,
                },
                duration: 3.2,
              },
              1.05,
            );

          filters.forEach((filter, index) => {
            timeline.to(filter, { opacity: 1, duration: 0.28 }, 1.65 + index * 0.47);
          });

          timeline
            .to("[data-latch-secret]", { opacity: 1, duration: 0.38 }, 3.82)
            .to("[data-latch-vault-door]", { scaleX: 0.16, transformOrigin: "right center", duration: 0.45 }, 3.88)
            .to("[data-latch-inject]", { strokeDashoffset: 0, duration: 0.28 }, 4.05)
            .to("[data-latch-upstream]", { opacity: 1, duration: 0.32 }, 4.12)
            .to('[data-latch-outcome="allowed"]', { autoAlpha: 1, scale: 1, duration: 0.35 }, 4.2)
            .set('[data-latch-packet="allowed"]', { autoAlpha: 0 }, 4.55)
            .to('[data-latch-outcome="allowed"]', { autoAlpha: 0, duration: 0.2 }, 4.55)
            .to("[data-latch-secret]", { opacity: 0.24, duration: 0.2 }, 4.55)
            .to("[data-latch-upstream]", { opacity: 0.24, duration: 0.2 }, 4.55)
            .to("[data-latch-vault-door]", { scaleX: 1, duration: 0.2 }, 4.55)
            .to("[data-latch-inject]", { strokeDashoffset: 28, duration: 0.2 }, 4.55)
            .set('[data-latch-outcome="allowed"]', { autoAlpha: 0 }, 4.65)
            .set("[data-latch-secret]", { opacity: 0.24 }, 4.65)
            .set("[data-latch-upstream]", { opacity: 0.24 }, 4.65)
            .set("[data-latch-vault-door]", { scaleX: 1 }, 4.65)
            .set("[data-latch-inject]", { strokeDashoffset: 28 }, 4.65)
            .set('[data-latch-packet="denied"]', { autoAlpha: 1 }, 4.7)
            .to(
              '[data-latch-packet="denied"]',
              {
                motionPath: {
                  path: "[data-latch-trace]",
                  align: "[data-latch-trace]",
                  alignOrigin: [0.5, 0.5],
                  start: 0,
                  end: 0.42,
                },
                duration: 1.35,
              },
              4.7,
            )
            .to('[data-latch-filter="endpoint"]', { opacity: 1, scale: 1.06, transformOrigin: "center", duration: 0.25 }, 5.85)
            .to('[data-latch-outcome="403"]', { autoAlpha: 1, scale: 1, duration: 0.3 }, 5.9)
            .set('[data-latch-packet="denied"]', { autoAlpha: 0 }, 6.45)
            .to('[data-latch-outcome="403"]', { autoAlpha: 0, duration: 0.2 }, 6.45)
            .to('[data-latch-filter="endpoint"]', { scale: 1, duration: 0.2 }, 6.45)
            .set('[data-latch-outcome="403"]', { autoAlpha: 0 }, 6.5)
            .set('[data-latch-packet="rate"]', { autoAlpha: 1 }, 6.55)
            .to(
              '[data-latch-packet="rate"]',
              {
                motionPath: {
                  path: "[data-latch-trace]",
                  align: "[data-latch-trace]",
                  alignOrigin: [0.5, 0.5],
                  start: 0,
                  end: 0.64,
                },
                duration: 1.65,
              },
              6.55,
            )
            .to('[data-latch-filter="rate-limit"]', { opacity: 1, scale: 1.06, transformOrigin: "center", duration: 0.25 }, 7.95)
            .to('[data-latch-outcome="429"]', { autoAlpha: 1, scale: 1, duration: 0.3 }, 8)
            .set('[data-latch-packet="rate"]', { autoAlpha: 0 }, 8.55)
            .to('[data-latch-outcome="429"]', { autoAlpha: 0, duration: 0.2 }, 8.55)
            .to('[data-latch-filter="rate-limit"]', { scale: 1, duration: 0.2 }, 8.55)
            .to("[data-latch-secret]", { opacity: 1, duration: 0.3 }, 8.55)
            .to("[data-latch-upstream]", { opacity: 1, duration: 0.3 }, 8.55)
            .to("[data-latch-vault-door]", { scaleX: 0.16, duration: 0.3 }, 8.55)
            .to("[data-latch-inject]", { strokeDashoffset: 0, duration: 0.25 }, 8.55)
            .set('[data-latch-outcome="429"]', { autoAlpha: 0 }, 8.65)
            .set("[data-latch-secret]", { opacity: 1 }, 8.65)
            .set("[data-latch-upstream]", { opacity: 1 }, 8.65)
            .set("[data-latch-vault-door]", { scaleX: 0.16 }, 8.65)
            .set("[data-latch-inject]", { strokeDashoffset: 0 }, 8.65)
            .set('[data-latch-packet="response"]', { autoAlpha: 1 }, 8.7)
            .to(
              '[data-latch-packet="response"]',
              {
                motionPath: {
                  path: "[data-latch-response-route]",
                  align: "[data-latch-response-route]",
                  alignOrigin: [0.5, 0.5],
                  start: 0,
                  end: 0.79,
                },
                duration: 2.25,
              },
              8.7,
            )
            .to("[data-latch-redaction]", { autoAlpha: 1, y: 0, duration: 0.4 }, 9.55)
            .to("[data-latch-world]", { opacity: 0.58, scale: 0.97, duration: 0.9 }, 10.75)
            .to("[data-latch-release]", { autoAlpha: 1, yPercent: 0, duration: 0.75 }, 10.9)
            .to("[data-latch-scene-content]", { autoAlpha: 0, duration: 0.45 }, 11.05);

          [1.45, 4.65, 6.5, 8.65].forEach((position, index) => {
            timeline
              .set(phases[index + 1], { autoAlpha: 1 }, position)
              .set(phases[index], { autoAlpha: 0 }, position)
              .set(steps[index], { opacity: 0.28 }, position)
              .set(steps[index + 1], { opacity: 1 }, position);
          });

          gsap.set("[data-latch-release]", { autoAlpha: 0, yPercent: 5 });

          const mountTimeline = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: "[data-latch-mount-scene]",
              start: "top 82%",
              end: "bottom 22%",
              scrub: 0.55,
              invalidateOnRefresh: true,
            },
          });

          gsap.set("[data-latch-mount]", { opacity: 0.24 });
          gsap.set("[data-latch-mount-branch]", { strokeDashoffset: 430 });
          gsap.set("[data-latch-audit]", { opacity: 0.24 });

          mountTimeline
            .to("[data-latch-mount-branch]", { strokeDashoffset: 0, duration: 3 }, 0)
            .to("[data-latch-mount]", { opacity: 1, duration: 0.9, stagger: 0.55 }, 0.35)
            .to("[data-latch-audit]", { opacity: 1, duration: 0.7 }, 2.15);

          return () => {
            if (pinnedScene) {
              pinnedScene.dataset.latchRun = "scope";
              pinnedScene.dataset.latchActiveFilter = "token";
            }
            timeline.scrollTrigger?.kill();
            mountTimeline.scrollTrigger?.kill();
          };
        },
      );
    }, root);

    return () => {
      media.revert();
      context.revert();
    };
  }, []);

  return (
    <section ref={rootRef} className={styles.latchCinematic} aria-labelledby="latch-title">
      <div className={`${styles.cinematicSequence} ${styles.latchPinSequence}`} data-latch-trigger data-cinematic-sequence="latch">
        <div
          className={`${styles.cinematicStage} ${styles.latchPinnedScene}`}
          data-cinematic-stage
          data-latch-active-filter="token"
          data-latch-pin
          data-latch-run="scope"
        >
          <RialoFieldBackground intensity="stage" />
          <div className={styles.latchWorld} data-latch-world>
            <PipelineDiagram />
          </div>

          <div className={styles.latchContentLayer}>
            <header className={styles.latchIntro} data-latch-intro>
              <span className={styles.chapterMarker}>Chapter 07 / Latch</span>
              <span className={styles.systemType}>Security product</span>
              <p className={styles.chapterThesis}>Programmable authority</p>
              <h2 id="latch-title">The key never crosses the line.</h2>
              <p>
                Scoped authority enters. Hardware identity can bind the caller,
                while attested policy can protect encrypted requests. The real
                credential never leaves Latch.
              </p>
            </header>

            <div className={styles.latchSceneContent} data-latch-scene-content>
              <header className={styles.latchSceneHeader}>
                <span>Latch / Request control</span>
                <strong>First deny wins.</strong>
              </header>

              <div className={styles.latchPhaseDeck}>
                {pipelinePhases.map((phase, index) => (
                  <article className={styles.latchPhase} data-latch-phase key={phase.code}>
                    <span>{phase.eyebrow}</span>
                    <h3>{phase.title}</h3>
                    <p>{phase.body}</p>
                    <small>{String(index + 1).padStart(2, "0")} / 05</small>
                  </article>
                ))}
              </div>

              <ol className={styles.latchPhaseRail} aria-label="Latch request phases">
                {pipelinePhases.map((phase) => (
                  <li data-latch-step={phase.code.toLowerCase()} key={phase.code}>{phase.code}</li>
                ))}
              </ol>
            </div>

            <div className={styles.latchRelease} data-latch-release>
              <span>Every decision leaves a trace.</span>
              <p>Authority stays bounded. The credential stays hidden.</p>
            </div>
          </div>
        </div>
      </div>

      <section className={styles.latchMountScene} data-latch-mount-scene aria-labelledby="latch-mount-title">
        <RialoFieldBackground intensity="stage" />
        <header className={styles.latchMountCopy}>
          <span>Scene 02 / Multi-mount</span>
          <h3 id="latch-mount-title">One token. Separate authority.</h3>
          <p>
            A mount routes each path to its own upstream, Secret, and policy
            pipeline while every decision joins one audit trail.
          </p>
          <small>
            Child Latches can inherit policy and narrow authority further.
          </small>
        </header>
        <MultiMountDiagram />
      </section>

      <div className={styles.latchStaticRuns} aria-label="Latch policy outcomes">
        <div><span>200</span><p>Allowed requests pass every request filter before Secret injection and forwarding.</p></div>
        <div><span>403</span><p>A policy denial stops at its first failing filter and never reaches upstream.</p></div>
        <div><span>429</span><p>A rate limit denial returns Retry-After without using the real credential.</p></div>
        <div><span>RETURN</span><p>A response filter can block or redact data after upstream replies.</p></div>
      </div>
    </section>
  );
}
