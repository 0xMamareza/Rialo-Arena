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
  { code: "WORLD", eyebrow: "01 / External world", title: "The machine begins outside the chain.", body: "APIs, real-time data, users, and other networks become inputs to one connected system." },
  { code: "EDGE", eyebrow: "02 / Rialo Edge", title: "Traffic crosses both directions.", body: "Native bidirectional Web2 interaction lets programs call external services without middleware." },
  { code: "WORKFLOW", eyebrow: "03 / Workflow", title: "Complex logic keeps moving.", body: "Autonomous multi-step workflows model real-world processes inside the protocol." },
  { code: "READ", eyebrow: "04 / Read Path", title: "Applications read from validators.", body: "The direct read path reduces the infrastructure and latency between state and an application." },
  { code: "STREAM", eyebrow: "05 / Stream", title: "Data arrives as a living feed.", body: "Native streams continuously deliver external data for DeFi, RWAs, and other applications." },
  { code: "EXECUTION", eyebrow: "06 / Execution Engine", title: "Events become coordinated work.", body: "Event-driven execution, Conditional Transactions, and hybrid concurrency organize dynamic workloads." },
  { code: "VM", eyebrow: "07 / Rialo VM", title: "Instructions enter a flexible runtime.", body: "The RISC-V VM supports SVM compatibility, with EVM and MoveVM compatibility still stated as future direction." },
  { code: "REX", eyebrow: "08 / REX", title: "Sensitive work enters a protected chamber.", body: "Extended execution processes encrypted inputs and exposes verifiable results without revealing the private data." },
  { code: "CRUISE", eyebrow: "09 / Cruise", title: "The user path sheds gas friction.", body: "Cruise provides native gasless transactions with low to zero fees." },
  { code: "OMNI", eyebrow: "10 / Omni Account", title: "One account reaches many networks.", body: "Omni Account preserves one account experience across multiple network contexts." },
  { code: "INTEROP", eyebrow: "11 / Interop", title: "Networks exchange value and messages.", body: "Native interoperability handles cross-network movement and communication separately from account identity." },
  { code: "IPC", eyebrow: "12 / IPC", title: "Trust controls become first-class.", body: "Identity, Privacy, and Compliance sit inside the architecture instead of being rebuilt around it." },
  { code: "CONSENSUS", eyebrow: "13 / Consensus", title: "Validators converge on one order.", body: "Parallel proposers feed an ordered block path that anchors the machine's shared guarantees." },
] as const;

const moduleNodes = [
  ["world", "EXTERNAL WORLD", 180, 310, "APIs / DATA / NETWORKS"],
  ["edge", "RIALO EDGE", 510, 310, "BIDIRECTIONAL WEB2"],
  ["workflow", "WORKFLOW", 830, 210, "AUTONOMOUS SEQUENCES"],
  ["read", "READ PATH", 830, 410, "VALIDATOR TO APP"],
  ["stream", "STREAM", 830, 610, "CONTINUOUS FEEDS"],
  ["execution", "EXECUTION ENGINE", 1160, 230, "EVENTS / CONDITIONS / CONCURRENCY"],
  ["vm", "RIALO VM", 1160, 450, "RISC-V / SVM"],
  ["rex", "REX", 1460, 190, "CONFIDENTIAL EXECUTION"],
  ["cruise", "CRUISE", 1460, 450, "GASLESS PATH"],
  ["omni", "OMNI ACCOUNT", 1760, 190, "ACCOUNT CONTINUITY"],
  ["interop", "INTEROP", 1760, 410, "CROSS-NETWORK MOVEMENT"],
  ["ipc", "IPC", 1760, 610, "IDENTITY / PRIVACY / COMPLIANCE"],
  ["consensus", "CONSENSUS", 2110, 390, "ORDERED SHARED STATE"],
] as const;

function MachineNode({ id, label, x, y, detail }: { id: string; label: string; x: number; y: number; detail: string }) {
  const { t } = useI18n();
  return (
    <g className={styles.machineNode} data-architecture-module={id} transform={`translate(${x} ${y})`}>
      <rect className={styles.machineNodeHalo} x="-102" y="-70" width="204" height="140" rx="70" />
      <rect className={styles.machineNodeBody} x="-88" y="-56" width="176" height="112" rx="4" />
      <circle className={styles.machineNodePort} cx="-88" r="5" />
      <circle className={styles.machineNodePort} cx="88" r="5" />
      <DiagramText maxWidth={150} className={styles.machineNodeLabel} y="-5" textAnchor="middle">{t(String(label))}</DiagramText>
      <DiagramText maxWidth={150} className={styles.machineNodeDetail} y="17" textAnchor="middle">{t(detail)}</DiagramText>
      <path className={styles.machineNodeMeter} d="M-52 36H52" />
    </g>
  );
}

function ArchitectureTopology() {
  const { t } = useI18n();
  return (
    <svg direction="ltr" className={styles.architectureMachineSvg} viewBox="0 0 2360 820" role="img" aria-label={t("Diagram: external services connect to Rialo execution, privacy, accounts, interoperability, and consensus.")}>
      <defs>
        <filter id="machine-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="10" /></filter>
        <linearGradient id="machine-route" x1="0" x2="1"><stop stopColor="#a9ddd3" stopOpacity=".08" /><stop offset=".48" stopColor="#a9ddd3" /><stop offset="1" stopColor="#e8e3d5" stopOpacity=".58" /></linearGradient>
        <pattern id="machine-grid" width="44" height="44" patternUnits="userSpaceOnUse"><path d="M44 0H0V44" fill="none" stroke="#e8e3d5" strokeOpacity=".03" /></pattern>
      </defs>
      <rect width="2360" height="820" fill="url(#machine-grid)" />

      <g className={styles.machineRoutes}>
        <path data-machine-route="world-edge" d="M268 310H422" />
        <path data-machine-route="edge-workflow" d="M598 310C680 310 707 210 742 210" />
        <path data-machine-route="edge-read" d="M598 310H742" />
        <path data-machine-route="edge-stream" d="M598 310C680 310 707 610 742 610" />
        <path data-machine-route="workflow-execution" d="M918 210C1010 210 1025 230 1072 230" />
        <path data-machine-route="read-execution" d="M918 410C1010 410 1025 230 1072 230" />
        <path data-machine-route="stream-execution" d="M918 610C1010 610 1025 230 1072 230" />
        <path data-machine-route="execution-vm" d="M1160 286V394" />
        <path data-machine-route="vm-rex" d="M1248 450C1324 450 1330 190 1372 190" />
        <path data-machine-route="vm-cruise" d="M1248 450H1372" />
        <path data-machine-route="rex-omni" d="M1548 190H1672" />
        <path data-machine-route="cruise-omni" d="M1548 450C1632 450 1642 190 1672 190" />
        <path data-machine-route="omni-interop" d="M1760 246V354" />
        <path data-machine-route="omni-ipc" d="M1760 246V554" />
        <path data-machine-route="interop-consensus" d="M1848 410H2022" />
        <path data-machine-route="ipc-consensus" d="M1848 610C1960 610 1980 390 2022 390" />
      </g>

      {moduleNodes.map(([id, label, x, y, detail]) => <MachineNode id={id} label={label} x={x} y={y} detail={detail} key={id} />)}

      <g className={styles.edgeTraffic} data-machine-micro="edge">
        <circle data-edge-packet="out" r="7" /><circle data-edge-packet="in" r="5" />
        <DiagramText maxWidth={230} x="510" y="228" textAnchor="middle">{t("REQUEST / RESPONSE")}</DiagramText>
      </g>

      <g className={styles.workflowSteps} data-machine-micro="workflow">
        {[0, 1, 2, 3].map((step) => <g data-workflow-step key={step} transform={`translate(${776 + step * 36} 282)`}><circle r="7" /><text y="24" textAnchor="middle">{step + 1}</text></g>)}
      </g>

      <g className={styles.readPulse} data-machine-micro="read"><path d="M768 466H892" /><circle data-read-packet r="7" /></g>

      <g className={styles.streamBands} data-machine-micro="stream">
        {[0, 1, 2].map((line) => <path data-stream-line key={line} d={`M938 ${520 + line * 42}C972 ${488 + line * 54} 1024 ${558 + line * 22} 1062 ${520 + line * 42}`} />)}
        <DiagramText maxWidth={240} x="1000" y="656" textAnchor="middle">{t("CONTINUOUS LIVE FEED")}</DiagramText>
      </g>

      <g className={styles.executionEngine} data-machine-micro="execution">
        <path d="M1098 320H1222" />
        {["EVENT", "CONDITION", "HYBRID"].map((label, index) => <g data-execution-pulse key={label} transform={`translate(${1104 + index * 56} 320)`}><circle r="8" /><DiagramText maxWidth={50} y="27" textAnchor="middle">{t(String(label))}</DiagramText></g>)}
      </g>

      <g className={styles.vmInstructions} data-machine-micro="vm">
        {[0, 1, 2, 3, 4].map((line) => <rect data-vm-instruction key={line} x={1102 + line * 24} y="520" width="14" height={18 + line * 7} rx="2" />)}
        <DiagramText maxWidth={220} x="1160" y="585" textAnchor="middle">{t("RISC-V INSTRUCTION FLOW")}</DiagramText>
      </g>

      <g className={styles.rexChamber} data-machine-micro="rex" transform="translate(1460 190)">
        <path d="M-38 0A38 38 0 0 1 38 0V50H-38Z" /><rect x="-50" y="-2" width="100" height="74" rx="8" /><circle data-rex-core cy="34" r="12" />
      </g>

      <g className={styles.cruisePath} data-machine-micro="cruise" transform="translate(1460 450)">
        <path d="M-54 84C-28 48 30 48 56 84" /><circle data-cruise-packet cx="-54" cy="84" r="7" /><DiagramText maxWidth={120} y="108" textAnchor="middle">{t("GAS / 0")}</DiagramText>
      </g>

      <g className={styles.omniBranches} data-machine-micro="omni">
        <path data-omni-branch d="M1760 190C1844 124 1884 110 1930 110" /><path data-omni-branch d="M1760 190H1930" /><path data-omni-branch d="M1760 190C1844 256 1884 270 1930 270" />
        {[[1930,110,"NET A"],[1930,190,"NET B"],[1930,270,"NET C"]].map(([x,y,label]) => <g data-omni-network key={String(label)} transform={`translate(${x} ${y})`}><circle r="22" /><DiagramText maxWidth={38} y="4" textAnchor="middle">{t(String(label))}</DiagramText></g>)}
      </g>

      <g className={styles.interopFlow} data-machine-micro="interop">
        <path d="M1842 472H1982" /><path d="M1982 504H1842" />
        <circle data-interop-packet="out" cx="1842" cy="472" r="7" />
        <circle data-interop-packet="in" cx="1982" cy="504" r="7" />
        <DiagramText maxWidth={200} x="1912" y="536" textAnchor="middle">{t("VALUE / MESSAGE")}</DiagramText>
      </g>

      <g className={styles.ipcLayers} data-machine-micro="ipc">
        {[["IDENTITY", 1648], ["PRIVACY", 1760], ["COMPLIANCE", 1872]].map(([label,x]) => <g data-ipc-layer key={String(label)} transform={`translate(${x} 720)`}><rect x="-45" y="-21" width="90" height="42" rx="21" /><DiagramText maxWidth={84} y="4" textAnchor="middle">{t(String(label))}</DiagramText></g>)}
      </g>

      <g className={styles.consensusValidators} data-machine-micro="consensus">
        {[[2020,260],[2110,230],[2200,260],[2020,520],[2110,550],[2200,520]].map(([x,y], index) => <g data-validator key={`${x}-${y}`} transform={`translate(${x} ${y})`}><circle r="17" /><text y="4" textAnchor="middle">V{index + 1}</text></g>)}
        <rect data-consensus-block x="2051" y="462" width="118" height="46" rx="3" /><DiagramText maxWidth={100} x="2110" y="490" textAnchor="middle">{t("ORDERED BLOCK")}</DiagramText>
      </g>

      <g className={styles.machineSignal} data-machine-signal><circle r="7" /><circle className={styles.machineSignalGlow} r="24" /></g>
    </svg>
  );
}

const cameraStates = [
  { x: 0, scale: 0.69 }, { x: -80, scale: 0.78 }, { x: -280, scale: 0.86 },
  { x: -300, scale: 0.88 }, { x: -320, scale: 0.86 }, { x: -545, scale: 0.9 },
  { x: -545, scale: 0.9 }, { x: -760, scale: 0.94 }, { x: -760, scale: 0.91 },
  { x: -955, scale: 0.9 }, { x: -975, scale: 0.9 }, { x: -975, scale: 0.88 },
  { x: -1175, scale: 0.88 },
] as const;

export function ArchitectureMachine() {
  const { t } = useI18n();
  const rootRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add("(min-width: 1101px) and (prefers-reduced-motion: no-preference)", () => {
        const panels = gsap.utils.toArray<HTMLElement>("[data-architecture-phase]");
        const steps = gsap.utils.toArray<HTMLElement>("[data-architecture-step]");
        const modules = gsap.utils.toArray<SVGGElement>("[data-architecture-module]");
        const routes = gsap.utils.toArray<SVGPathElement>("[data-machine-route]");
        gsap.set(panels.slice(1), { autoAlpha: 0 });
        gsap.set(steps.slice(1), { opacity: 0.25 });
        gsap.set(modules, { opacity: 0.2 });
        gsap.set(routes, { strokeDashoffset: 380 });
        gsap.set("[data-machine-micro]", { opacity: 0.16 });
        gsap.set("[data-machine-signal]", { autoAlpha: 0 });
        gsap.set("[data-architecture-content]", { autoAlpha: 0 });
        gsap.set("[data-architecture-release]", { autoAlpha: 0, yPercent: 5 });
        gsap.set("[data-architecture-world]", { x: 100, scale: 0.64, opacity: 0.66, transformOrigin: "center center" });

        const timeline = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: "[data-architecture-trigger-zone]", start: "top top", end: "bottom bottom", scrub: 0.65, invalidateOnRefresh: true } });
        timeline
          .to("[data-architecture-world]", { x: cameraStates[0].x, scale: cameraStates[0].scale, opacity: 1, duration: 1.1 }, 0)
          .to("[data-architecture-intro]", { autoAlpha: 0, yPercent: -5, duration: 0.45 }, 0.58)
          .to("[data-architecture-content]", { autoAlpha: 1, duration: 0.38 }, 0.72)
          .to('[data-architecture-module="world"]', { opacity: 1, duration: 0.34 }, 0.8);

        phases.slice(1).forEach((phase, index) => {
          const phaseIndex = index + 1;
          const position = 1.45 + index * 1.16;
          const moduleId = phase.code.toLowerCase();
          const actualId = moduleId === "read" ? "read" : moduleId;
          const previousId = phases[phaseIndex - 1].code.toLowerCase();
          timeline
            .to("[data-architecture-world]", { x: cameraStates[phaseIndex].x, scale: cameraStates[phaseIndex].scale, duration: 0.72 }, position)
            .to(`[data-architecture-module="${previousId}"]`, { opacity: 0.38, duration: 0.22 }, position)
            .to(`[data-architecture-module="${actualId}"]`, { opacity: 1, duration: 0.26 }, position + 0.12)
            .to(`[data-machine-micro="${actualId}"]`, { opacity: 1, duration: 0.25 }, position + 0.18)
            .set(panels[phaseIndex], { autoAlpha: 1 }, position + 0.12)
            .set(panels[phaseIndex - 1], { autoAlpha: 0 }, position + 0.12)
            .set(steps[phaseIndex], { opacity: 1 }, position + 0.12)
            .set(steps[phaseIndex - 1], { opacity: 0.25 }, position + 0.12);
        });

        timeline
          .to('[data-machine-route="world-edge"]', { strokeDashoffset: 0, duration: 0.62 }, 1.4)
          .set('[data-machine-signal]', { autoAlpha: 1 }, 1.5)
          .to('[data-machine-signal]', { motionPath: { path: '[data-machine-route="world-edge"]', align: '[data-machine-route="world-edge"]', alignOrigin: [0.5, 0.5] }, duration: 0.72 }, 1.5)
          .to('[data-edge-packet="out"]', { x: 150, repeat: 2, yoyo: true, duration: 0.28 }, 1.7)
          .to('[data-edge-packet="in"]', { x: -130, repeat: 2, yoyo: true, duration: 0.3 }, 1.72)
          .to('[data-machine-route="edge-workflow"], [data-machine-route="edge-read"], [data-machine-route="edge-stream"]', { strokeDashoffset: 0, duration: 0.86, stagger: 0.08 }, 2.5)
          .to('[data-workflow-step]', { opacity: 1, scale: 1.3, transformOrigin: "center", duration: 0.18, stagger: 0.12, yoyo: true, repeat: 1 }, 2.75)
          .to('[data-read-packet]', { x: 124, duration: 0.72 }, 3.8)
          .to('[data-stream-line]', { strokeDashoffset: 0, duration: 0.82, stagger: 0.1 }, 4.92)
          .to('[data-machine-route="workflow-execution"], [data-machine-route="read-execution"], [data-machine-route="stream-execution"]', { strokeDashoffset: 0, duration: 0.76, stagger: 0.07 }, 5.65)
          .to('[data-execution-pulse]', { opacity: 1, scale: 1.35, transformOrigin: "center", duration: 0.2, stagger: 0.1, yoyo: true, repeat: 1 }, 6.02)
          .to('[data-machine-route="execution-vm"]', { strokeDashoffset: 0, duration: 0.7 }, 6.82)
          .to('[data-vm-instruction]', { opacity: 1, scaleY: 1.55, transformOrigin: "bottom", duration: 0.2, stagger: 0.1, yoyo: true, repeat: 1 }, 7.05)
          .to('[data-machine-route="vm-rex"]', { strokeDashoffset: 0, duration: 0.7 }, 7.92)
          .to('[data-rex-core]', { scale: 1.75, opacity: 0.35, transformOrigin: "center", duration: 0.35, yoyo: true, repeat: 2 }, 8.15)
          .to('[data-machine-route="vm-cruise"]', { strokeDashoffset: 0, duration: 0.7 }, 9.05)
          .to('[data-cruise-packet]', { x: 110, duration: 0.74 }, 9.32)
          .to('[data-machine-route="rex-omni"], [data-machine-route="cruise-omni"]', { strokeDashoffset: 0, duration: 0.72, stagger: 0.1 }, 10.1)
          .to('[data-omni-branch]', { strokeDashoffset: 0, duration: 0.7, stagger: 0.1 }, 10.32)
          .to('[data-omni-network]', { opacity: 1, duration: 0.25, stagger: 0.1 }, 10.72)
          .to('[data-machine-route="omni-interop"]', { strokeDashoffset: 0, duration: 0.68 }, 11.18)
          .to('[data-interop-packet="out"]', { x: 140, duration: 0.72 }, 11.4)
          .to('[data-interop-packet="in"]', { x: -140, duration: 0.72 }, 11.4)
          .to('[data-machine-route="omni-ipc"]', { strokeDashoffset: 0, duration: 0.68 }, 12.34)
          .to('[data-ipc-layer]', { opacity: 1, y: -8, duration: 0.25, stagger: 0.12 }, 12.56)
          .to('[data-machine-route="interop-consensus"], [data-machine-route="ipc-consensus"]', { strokeDashoffset: 0, duration: 0.85, stagger: 0.1 }, 13.42)
          .to('[data-validator]', { opacity: 1, x: (index) => index % 3 === 0 ? 24 : index % 3 === 2 ? -24 : 0, y: (index) => index < 3 ? 34 : -34, duration: 0.42, stagger: 0.07 }, 13.7)
          .to('[data-consensus-block]', { opacity: 1, scale: 1.08, transformOrigin: "center", duration: 0.28, yoyo: true, repeat: 1 }, 14.22)
          .to('[data-architecture-world]', { opacity: 0.5, scale: 0.83, duration: 0.82 }, 15.06)
          .to('[data-architecture-release]', { autoAlpha: 1, yPercent: 0, duration: 0.7 }, 15.18)
          .to('[data-architecture-content]', { autoAlpha: 0, duration: 0.42 }, 15.28);

        return () => timeline.scrollTrigger?.kill();
      });
      media.add(mobileCinematicQuery, () =>
        createMobileCinematic(root, {
          world: "[data-architecture-world]",
          phases: "[data-architecture-phase]",
          draw: "[data-machine-route], [data-stream-line], [data-omni-branch]",
          reveal: "[data-architecture-module], [data-machine-micro]",
          horizontalCamera: true,
        }),
      );
    }, root);
    return () => { media.revert(); context.revert(); };
  }, []);

  return (
    <section ref={rootRef} className={styles.architectureMachine} aria-labelledby="architecture-title">
      <div className={`${styles.cinematicSequence} ${styles.architectureMachineSequence}`} data-cinematic-sequence="architecture" data-architecture-trigger-zone>
        <div className={`${styles.cinematicStage} ${styles.architectureMachineStage}`} data-cinematic-stage>
          <RialoFieldBackground intensity="stage" />
          <div className={styles.architectureMachineWorld} data-architecture-world><ArchitectureTopology /></div>
          <div className={styles.architectureMachineContent}>
            <header className={styles.architectureMachineIntro} data-architecture-intro>
              <span className={styles.chapterMarker}>{t("Chapter 02 / Architecture")}</span>
              <span className={styles.systemType}>{t("Core architecture")}</span>
              <p className={styles.chapterThesis}>{t("One living system")}</p>
              <h2 id="architecture-title">{t("Enter the Rialo machine.")}</h2>
              <p>{t("Follow a signal from the external world to shared consensus.")}</p>
            </header>
            <div className={styles.architectureMachineScene} data-architecture-content>
              <header className={styles.architectureMachineHeader}><span>{t("Architecture / Connected topology")}</span><strong>{t("Every capability compounds.")}</strong></header>
              <div className={styles.architectureMachinePhases}>{phases.map((phase, index) => <article className={styles.architectureMachinePhase} data-architecture-phase key={phase.code}><span>{t(phase.eyebrow)}</span><h3>{t(phase.title)}</h3><p>{t(phase.body)}</p><small>{String(index + 1).padStart(2, "0")} / {phases.length}</small></article>)}</div>
              <ol className={styles.architectureMachineRail} aria-label={t("Architecture machine phases")}>{phases.map((phase) => <li data-architecture-step key={phase.code}><i /><span>{t(phase.code)}</span></li>)}</ol>
            </div>
            <div className={styles.architectureMachineRelease} data-architecture-release><span>{t("World / Execution / Agreement")}</span><p>{t("One machine. Shared guarantees.")}</p></div>
          </div>
        </div>
      </div>
    </section>
  );
}
