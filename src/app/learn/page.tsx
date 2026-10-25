import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import Image from "next/image";
import localFont from "next/font/local";

import { AgpCinematic } from "./_components/agp-cinematic";
import { ArchitectureMachine } from "./_components/architecture-machine";
import { LatchCinematic } from "./_components/latch-cinematic";
import { Project1337Cinematic } from "./_components/project-1337-cinematic";
import { ReactiveCinematic } from "./_components/reactive-cinematic";
import { ScaleCinematic } from "./_components/scale-cinematic";
import { StakeServiceCinematic } from "./_components/stake-service-cinematic";
import {
  ChapterFacts,
  StudyNotes,
  type ChapterFact,
  type StudyNote,
} from "./_components/chapter-elements";
import {
  LearnNavigation,
  type LearnChapterNavItem,
} from "./_components/learn-navigation";
import { LearnMotionCoordinator } from "./_components/learn-motion-coordinator";
import { RialoFieldBackground } from "./_components/rialo-field-background";
import styles from "./learn.module.css";

const learnDisplay = localFont({
  src: "../fonts/roboto-flex/RobotoFlex-Variable.ttf",
  display: "swap",
  variable: "--font-learn-display",
  weight: "100 1000",
  style: "normal",
  fallback: ["Arial Narrow", "Arial", "sans-serif"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t("Learn | Rialo Arena"),
    description: t("A visual field manual for the systems, primitives, and experiments behind Rialo."),
  };
}

async function RialoField() {
  const { t } = await getI18n();
  return (
    <div className={styles.rialoField} aria-hidden="true">
      <div className={`${styles.orbit} ${styles.orbitOuter}`} />
      <div className={`${styles.orbit} ${styles.orbitMiddle}`} />
      <div className={`${styles.orbit} ${styles.orbitInner}`} />

      <span className={`${styles.fieldNode} ${styles.nodeWeb}`}>{t("World / API")}</span>
      <span className={`${styles.fieldNode} ${styles.nodeData}`}>{t("Attested data")}</span>
      <span className={`${styles.fieldNode} ${styles.nodeReact}`}>{t("Reactive logic")}</span>
      <span className={`${styles.fieldNode} ${styles.nodePrivate}`}>{t("Private compute")}</span>

      <div className={styles.rialoCore}>
        <Image
          src="/brand/rialo/rialo-symbol-a9ddd3.svg"
          alt=""
          width={303}
          height={331}
          priority
        />
        <span>{t("Protocol core")}</span>
      </div>
    </div>
  );
}

export default async function LearnPage() {
  const { t } = await getI18n();
  const chapters: LearnChapterNavItem[] = [
    { id: "chapter-rialo", label: t("Rialo"), number: "01", available: true },
    {
      id: "chapter-architecture",
      label: t("Architecture"),
      number: "02",
      available: true,
    },
    {
      id: "chapter-reactive",
      label: t("Reactive"),
      number: "03",
      available: true,
    },
    {
      id: "chapter-stake-for-service",
      label: t("Stake-for-Service"),
      number: "04",
      available: true,
    },
    {
      id: "chapter-project-1337",
      label: t("Project 1337"),
      number: "05",
      available: true,
    },
    {
      id: "chapter-agent-economy",
      label: t("Agent Economy"),
      number: "06",
      available: true,
    },
    { id: "chapter-latch", label: t("Latch"), number: "07", available: true },
    { id: "chapter-agp", label: t("AGP"), number: "08", available: true },
  ];

  const rialoFacts: ChapterFact[] = [
    {
      label: t("Native connectivity"),
      value: t("Programs can interact with external APIs and real-world systems."),
    },
    {
      label: t("Reactive execution"),
      value: t("Conditions can wake and advance logic without a keeper loop."),
    },
    {
      label: t("Private computation"),
      value: t("Sensitive inputs can be processed without publishing every detail."),
    },
    {
      label: t("Supermodular design"),
      value: t("Protocol primitives are integrated when their value compounds together."),
    },
  ];

  const rialoNotes: StudyNote[] = [
    {
      title: t("Real-world means bidirectional"),
      body: (
        <p>{t("The goal is broader than importing a data feed. Programs should be able to read verified external information, react to it, and securely drive actions back into real-world systems.")}</p>
      ),
    },
    {
      title: t("The chain becomes an application backend"),
      body: (
        <p>{t("Connectivity, workflow, privacy, execution, and consensus are treated as coordinated parts of one programming environment rather than a set of integrations every application must rebuild.")}</p>
      ),
    },
    {
      title: t("Integration is selective, not ideological"),
      body: (
        <p>{t("Rialo's supermodular framing asks whether two capabilities reinforce one another in production. Functions that create new value together are candidates for protocol-level integration.")}</p>
      ),
    },
  ];

  const architectureFacts: ChapterFact[] = [
    {
      label: t("Rialo Edge"),
      value: t("Bidirectional Web2 interaction lets programs communicate with external services without a middleware stack."),
    },
    {
      label: t("Workflow and Stream"),
      value: t("Native automation coordinates complex sequences while continuous feeds supply real-world data to applications."),
    },
    {
      label: t("Read Path"),
      value: t("Applications can access state directly from validators, reducing latency and separate read infrastructure."),
    },
    {
      label: t("Execution Engine"),
      value: t("Event-driven execution, Conditional Transactions, and hybrid concurrency coordinate dynamic workloads."),
    },
    {
      label: t("Rialo VM"),
      value: t("The VM is RISC-V based, compatible with SVM, with EVM and MoveVM compatibility stated as future direction."),
    },
    {
      label: t("REX"),
      value: t("Rialo Extended Execution supports confidential computation over sensitive inputs with verifiable results."),
    },
    {
      label: t("Cruise"),
      value: t("Native gasless transaction support creates a low to zero fee user path."),
    },
    {
      label: t("Omni Account"),
      value: t("One account provides account continuity across multiple networks."),
    },
    {
      label: t("Interop"),
      value: t("Native interoperability handles cross-network movement and communication as a distinct system capability."),
    },
    {
      label: t("IPC"),
      value: t("Identity, Privacy, and Compliance remain first-class capabilities inside the architecture."),
    },
    {
      label: t("Consensus"),
      value: t("A high-throughput parallel multi-proposer consensus path establishes transaction order and shared state."),
    },
  ];

  const architectureNotes: StudyNote[] = [
    {
      title: t("Three different data paths"),
      body: (
        <p>{t("Edge is the bidirectional boundary for external services, Stream brings continuous external inputs into applications, and Read Path gives apps fast validator-to-app state access. They connect different kinds of information flow to the same machine.")}</p>
      ),
    },
    {
      title: t("Workflow and Reactive are related, not identical"),
      body: (
        <p>{t("Workflow composes autonomous multi-step processes. Reactive and Conditional Transactions let work wait for future state, data, or time conditions before it continues.")}</p>
      ),
    },
    {
      title: t("Execution Engine is not the VM"),
      body: (
        <p>{t("The Execution Engine coordinates events, conditions, and hybrid concurrency. Rialo VM executes program instructions through its RISC-V runtime and SVM compatibility. EVM and MoveVM remain stated as future compatibility direction.")}</p>
      ),
    },
    {
      title: t("REX extends execution guarantees"),
      body: (
        <p>{t("REX adds a protected environment for confidential computation. It keeps sensitive inputs from ordinary visibility while preserving verifiable results for the surrounding system.")}</p>
      ),
    },
    {
      title: t("Cruise and Stake-for-Service solve different friction"),
      body: (
        <p>{t("Cruise addresses the user transaction path with native gasless support. Stake-for-Service addresses recurring service funding by routing future staking rewards. Both improve usability at different layers.")}</p>
      ),
    },
    {
      title: t("Account continuity is not interoperability"),
      body: (
        <p>{t("Omni Account describes who acts across network contexts. Interop describes how value and messages move across network boundaries. The capabilities reinforce each other without being the same mechanism.")}</p>
      ),
    },
    {
      title: t("IPC and Consensus close different trust loops"),
      body: (
        <p>{t("Identity, Privacy, and Compliance provide application-facing trust controls. Consensus gives validators a shared order and committed state for the work moving through the architecture.")}</p>
      ),
    },
  ];

  const reactiveFacts: ChapterFact[] = [
    {
      label: t("Protocol-native automation"),
      value: t("Conditions are evaluated and triggered by Rialo's execution path without bots, keepers, cron jobs, or separate schedulers."),
    },
    {
      label: t("Signal range"),
      value: t("Predicates can reference onchain state and events, validator-attested external data, and time conditions."),
    },
    {
      label: t("Stored condition"),
      value: t("A predicate defines when its associated executable transaction becomes eligible to run."),
    },
    {
      label: t("Deterministic agreement"),
      value: t("Validators evaluate affected predicates against shared state and arrive at the same result."),
    },
    {
      label: t("Automatic execution"),
      value: t("A true predicate enqueues its transaction for execution in dependency order."),
    },
  ];

  const reactiveNotes: StudyNote[] = [
    {
      title: t("Dependency-aware evaluation"),
      body: (
        <p>{t("Predicates can depend on state, events, validator-attested external data, block height, timestamps, or earlier workflow results. Validators only reevaluate affected conditions and reach the same result from shared state.")}</p>
      ),
    },
    {
      title: t("Triggering respects execution order"),
      body: (
        <p>{t("A true predicate enqueues its associated transaction. The action can run in the same block or a following block according to dependency ordering, so automatic does not mean outside protocol sequencing.")}</p>
      ),
    },
    {
      title: t("Long-running workflows"),
      body: (
        <p>{t("A triggered transaction can create later conditional steps. This lets a workflow wait, resume, and span many blocks without an external watcher keeping it alive.")}</p>
      ),
    },
  ];

  const stakeServiceFacts: ChapterFact[] = [
    {
      label: t("Principal preserved"),
      value: t("The RLO principal remains staked and continues securing the network while producing rewards."),
    },
    {
      label: t("Future yield routing"),
      value: t("A chosen routing fraction directs only part of future staking rewards toward services."),
    },
    {
      label: t("ServicePaymaster"),
      value: t("Routed rewards go directly to the ServicePaymaster, which mints an equivalent quantity of service credits."),
    },
    {
      label: t("Bound utility"),
      value: t("Credits are non-transferable outside service use and cannot become a speculative asset."),
    },
    {
      label: t("Network services"),
      value: t("Credits can fund gas, storage, and scheduled execution across Rialo."),
    },
    {
      label: t("Recurring operations"),
      value: t("Yield-funded credits can sustain Reactive Transactions without repeated balance monitoring or manual top-ups."),
    },
  ];

  const stakeServiceNotes: StudyNote[] = [
    {
      title: t("Position and routing boundary"),
      body: (
        <p>{t("An SfS position records the principal, validator or pool, and routing fraction. Only the selected share of future rewards enters the service path; principal remains in the staking position.")}</p>
      ),
    },
    {
      title: t("ServicePaymaster accounting"),
      body: (
        <p>{t("Routed rewards back an equivalent quantity of credits. As services consume credits, validators and providers receive the corresponding RLO payout through the network's accounting path.")}</p>
      ),
    },
    {
      title: t("Why credits stay service-bound"),
      body: (
        <p>{t("Credits are programmable vouchers for network work, not transferable assets. That boundary keeps routed yield directed toward gas, storage, scheduled execution, and other supported services.")}</p>
      ),
    },
    {
      title: t("Composition with Reactive Transactions"),
      body: (
        <p>{t("Reactive Transactions supply condition-aware execution. Stake-for-Service supplies renewable service funding, allowing recurring workflows to run without a manually maintained gas balance.")}</p>
      ),
    },
  ];

  const project1337Facts: ChapterFact[] = [
    {
      label: t("Live source"),
      value: t("Project 1337 ingested real-time financial-market updates from Massive's WebSocket feed."),
    },
    {
      label: t("Derived signal"),
      value: t("Rialo processed the feed into a market-maker-style best-estimate price instead of publishing raw ticks unchanged."),
    },
    {
      label: t("Compact output"),
      value: t("Preprocessing condensed fast-moving market activity into meaningful values suitable for onchain use."),
    },
    {
      label: t("Cryptographic origin"),
      value: t("Each update was signed to bind the published result to Massive data and the applied preprocessing."),
    },
    {
      label: t("Financial rails"),
      value: t("The experiment targeted high-speed infrastructure for perpetuals, real-world assets, and synthetic markets."),
    },
  ];

  const project1337Notes: StudyNote[] = [
    {
      title: t("Raw feed versus derived market signal"),
      body: (
        <p>{t("Massive supplied a live WebSocket stream across thousands of stocks and indices. Project 1337 processed those fast, noisy updates into compact best-estimate prices rather than relaying every tick unchanged.")}</p>
      ),
    },
    {
      title: t("Signing establishes provenance"),
      body: (
        <p>{t("Cryptographic signing bound each output to Massive data and the declared preprocessing path. Consumers could verify where a derived result came from without treating an operator's reputation as the proof.")}</p>
      ),
    },
    {
      title: t("Why the experiment mattered"),
      body: (
        <p>{t("The goal was not a chart dashboard. It tested whether dense, precise, frequently updated financial signals could support perpetuals, RWAs, and synthetic markets on high-speed onchain rails.")}</p>
      ),
    },
  ];

  const scaleFacts: ChapterFact[] = [
    {
      label: t("Simple labor contract"),
      value: t("SCALE means Simple Contracts for Agent Labor Execution."),
    },
    {
      label: t("Explicit terms"),
      value: t("Each task names the prompt, offered payment, delivery deadline, and third-party judge."),
    },
    {
      label: t("Onchain escrow"),
      value: t("The offered RLO is escrowed automatically when the SCALE task is minted."),
    },
    {
      label: t("Agent discovery"),
      value: t("A requester can find a capable worker through the Rialo Agent Registry and communicate over A2A."),
    },
    {
      label: t("Timer enforcement"),
      value: t("Rialo's native timers can refund the requester automatically when delivery misses the deadline."),
    },
    {
      label: t("Verdict settlement"),
      value: t("A passing judge verdict releases payment, while a failed verdict refunds the requester."),
    },
  ];

  const scaleNotes: StudyNote[] = [
    {
      title: t("Terms and escrow"),
      body: (
        <p>{t("A SCALE task packages the prompt, payment, deadline, and judge into one agreement. Minting commits the offered RLO to program-controlled escrow before a worker begins.")}</p>
      ),
    },
    {
      title: t("Discovery and delivery"),
      body: (
        <p>{t("A requester can find a capable worker through Rialo's Agent Registry and send the task address over Agent2Agent communication. The worker can inspect the terms before accepting and submit back to the task address.")}</p>
      ),
    },
    {
      title: t("Judgment and time are separate settlement paths"),
      body: (
        <p>{t("The named judge evaluates submitted work and a passing verdict releases payment. If delivery never arrives before the deadline, a native Rialo timer can trigger refund without an external scheduler.")}</p>
      ),
    },
    {
      title: t("The demonstration boundary"),
      body: (
        <p>{t("SCALE demonstrates a compact pattern for agent labor coordination. Its registry, communication, escrow, judging, and timer pieces remain explicit so applications can reason about authority and settlement.")}</p>
      ),
    },
  ];

  const latchFacts: ChapterFact[] = [
    {
      label: t("Credential boundary"),
      value: t("The agent receives a scoped lat_ token, never the real API credential stored as a Secret."),
    },
    {
      label: t("First deny wins"),
      value: t("Request filters evaluate in order and the first denial stops evaluation before credential injection or upstream access."),
    },
    {
      label: t("Two-sided policy"),
      value: t("Request filters govern action before upstream; response filters can block or redact what returns."),
    },
    {
      label: t("Composable delegation"),
      value: t("Multi-mount and child Latches scope access across services while inherited policy can narrow authority further."),
    },
    {
      label: t("Hardware-bound identity"),
      value: t("The identity filter can bind authority to enrolled agent keys, limiting the value of a stolen token."),
    },
    {
      label: t("Attested protection"),
      value: t("For stronger isolation, policy can evaluate encrypted payloads inside an attested execution environment."),
    },
    {
      label: t("Audit trail"),
      value: t("Allowed and denied calls record the deciding filter and reason in one activity trace."),
    },
  ];
  const latchNotes: StudyNote[] = [
    {
      title: t("Secret and Latch have different lifecycles"),
      body: (
        <p>{t("A Secret is the encrypted, write-only upstream credential. Rotate it once and dependent Latches use the replacement. Disable one Latch to revoke a caller without rotating the shared credential.")}</p>
      ),
    },
    {
      title: t("Request and response policy have different consequences"),
      body: (
        <p>{t("A request denial prevents Secret injection and upstream access. Response policy runs only after upstream and controls what the caller can learn, including status blocking and selected JSON redaction.")}</p>
      ),
    },
    {
      title: t("Inheritance can narrow authority"),
      body: (
        <p>{t("A child Latch inherits its parent chain and can add restrictions. Live inheritance means tightening or disabling a parent can affect descendants without allowing a child to widen the original boundary.")}</p>
      ),
    },
    {
      title: t("Multi-mount scopes every destination"),
      body: (
        <p>{t("Unique path prefixes can map one token to several upstream services. Each mount retains its own Secret and ordered pipeline while activity remains visible through one audit trail.")}</p>
      ),
    },
    {
      title: t("Identity and enclave protection are additive"),
      body: (
        <p>{t("Hardware-bound keys can make token possession alone insufficient. When stronger isolation is selected, encrypted payloads can be evaluated in an attested environment that records which protected path ran.")}</p>
      ),
    },
    {
      title: t("Infrastructure as policy"),
      body: (
        <p>{t("The Terraform provider manages Secrets, Latches, policies, mounts, and KV connections as reviewed configuration. Terraform 1.11 or newer keeps credential arguments write-only so they stay out of plan and state.")}</p>
      ),
    },
  ];

  const agpFacts: ChapterFact[] = [
    {
      label: t("Hidden checkpoints"),
      value: t("Agents must identify each concealed point before moving through the circuit."),
    },
    {
      label: t("Oracle dialogue"),
      value: t("Only yes-or-no questions are used to reduce the possible answer space."),
    },
    {
      label: t("Formal guess"),
      value: t("A committed answer, not another question, is required to claim a checkpoint."),
    },
    {
      label: t("Metered reasoning"),
      value: t("Question spend can be measured onchain, rewarding efficient strategies."),
    },
  ];

  const agpNotes: StudyNote[] = [
    {
      title: t("The control loop"),
      body: (
        <p>{t("The agent repeats a compact cycle: ask, update its beliefs, decide when uncertainty is low enough, and submit a formal guess. A correct guess advances the circuit; a wrong one leaves the checkpoint unresolved.")}</p>
      ),
    },
    {
      title: t("Why questions carry cost"),
      body: (
        <p>{t("Pricing each query makes information efficiency visible. The strongest strategy is not exhaustive search, but choosing questions that remove the largest part of the answer space.")}</p>
      ),
    },
    {
      title: t("The operating stack"),
      body: (
        <p>{t("AGP is played over MCP. Sigil meters spend, OpenRouter supplies the Oracle's model path, and Latch constrains the agent's access and budget.")}</p>
      ),
    },
  ];


  return (
    <div className={`${styles.learnPage} ${learnDisplay.variable}`}>
      <RialoFieldBackground />
      <LearnMotionCoordinator />
      <LearnNavigation chapters={chapters} />

      <main className={styles.learnMain}>
        <section
          className={`${styles.chapter} ${styles.rialoChapter}`}
          id="chapter-rialo"
          data-learn-chapter
          aria-labelledby="rialo-title"
        >
          <div className={`${styles.chapterLead} ${styles.rialoLead}`}>
            <RialoFieldBackground intensity="stage" />
            <header className={styles.chapterCopy}>
              <span className={styles.chapterMarker}>{t("Chapter 01 / Rialo")}</span>
              <span className={styles.systemType}>{t("Protocol foundation")}</span>
              <p className={styles.chapterThesis}>{t("The real-world blockchain")}</p>
              <h1 id="rialo-title">{t("The chain meets the world.")}</h1>
              <p className={styles.chapterIntro}>{t("Rialo brings Web3 to the users, apps, and services of the real world while keeping execution decentralized and results verifiable.")}</p>
              <div className={styles.scrollCue} aria-hidden="true">
                <span />{t("Scroll to trace the system")}</div>
            </header>
            <RialoField />
          </div>

          <div className={styles.chapterKnowledge}>
            <ChapterFacts facts={rialoFacts} headingId="rialo-facts-title" />
            <StudyNotes
              notes={rialoNotes}
              headingId="rialo-notes-title"
              sourceHref="https://www.rialo.io/posts/introducing-rialo/"
              sourceLabel={t("Introducing Rialo")}
              sourceType={t("Official overview")}
            />
          </div>

          <div className={styles.chapterTransition} aria-hidden="true">
            <span>01</span>
            <i />
            <strong>{t("Foundations become one connected machine")}</strong>
            <i />
            <span>02</span>
          </div>
        </section>

        <section
          className={`${styles.chapter} ${styles.architectureChapter}`}
          id="chapter-architecture"
          data-learn-chapter
          aria-labelledby="architecture-title"
        >
          <ArchitectureMachine />

          <div className={styles.chapterKnowledge}>
            <ChapterFacts
              facts={architectureFacts}
              headingId="architecture-facts-title"
            />
            <StudyNotes
              notes={architectureNotes}
              headingId="architecture-notes-title"
              sourceHref="https://rialo.io/for-devs"
              sourceLabel={t("Rialo architecture overview")}
              sourceType={t("Official overview")}
            />
          </div>

          <div className={styles.chapterTransition} aria-hidden="true">
            <span>02</span>
            <i />
            <strong>{t("Execution becomes condition-aware")}</strong>
            <i />
            <span>03</span>
          </div>
        </section>

        <section
          className={styles.chapter}
          id="chapter-reactive"
          data-learn-chapter
          aria-labelledby="reactive-title"
        >
          <ReactiveCinematic />

          <div className={styles.chapterKnowledge}>
            <ChapterFacts facts={reactiveFacts} headingId="reactive-facts-title" />
            <StudyNotes
              notes={reactiveNotes}
              headingId="reactive-notes-title"
              sourceHref="https://www.rialo.io/posts/reactive-transactions-a-model-for-native-automation-on-rialo/"
              sourceLabel={t("Reactive Transactions")}
              sourceType={t("Technical article")}
            />
          </div>

          <div className={styles.chapterTransition} aria-hidden="true">
            <span>03</span>
            <i />
            <strong>{t("Autonomous execution needs autonomous funding")}</strong>
            <i />
            <span>04</span>
          </div>
        </section>

        <section
          className={styles.chapter}
          id="chapter-stake-for-service"
          data-learn-chapter
          aria-labelledby="sfs-title"
        >
          <StakeServiceCinematic />

          <div className={styles.chapterKnowledge}>
            <ChapterFacts facts={stakeServiceFacts} headingId="sfs-facts-title" />
            <StudyNotes
              notes={stakeServiceNotes}
              headingId="sfs-notes-title"
              sourceHref="https://www.rialo.io/posts/stake-for-service/"
              sourceLabel={t("Stake for Service")}
              sourceType={t("Technical article")}
            />
          </div>

          <div className={styles.chapterTransition} aria-hidden="true">
            <span>04</span>
            <i />
            <strong>{t("Verified data tells funded systems what to act on")}</strong>
            <i />
            <span>05</span>
          </div>
        </section>

        <section
          className={styles.chapter}
          id="chapter-project-1337"
          data-learn-chapter
          aria-labelledby="p1337-title"
        >
          <Project1337Cinematic />

          <div className={styles.chapterKnowledge}>
            <ChapterFacts facts={project1337Facts} headingId="p1337-facts-title" />
            <StudyNotes
              notes={project1337Notes}
              headingId="p1337-notes-title"
              sourceHref="https://www.rialo.io/posts/project-1337/"
              sourceLabel={t("Project 1337: The Recap")}
              sourceType={t("Experiment recap")}
            />
          </div>

          <div className={styles.chapterTransition} aria-hidden="true">
            <span>05</span>
            <i />
            <strong>{t("Machine-readable data becomes machine-coordinated work")}</strong>
            <i />
            <span>06</span>
          </div>
        </section>

        <section
          className={styles.chapter}
          id="chapter-agent-economy"
          data-learn-chapter
          aria-labelledby="scale-title"
        >
          <ScaleCinematic />

          <div className={styles.chapterKnowledge}>
            <ChapterFacts facts={scaleFacts} headingId="scale-facts-title" />
            <StudyNotes
              notes={scaleNotes}
              headingId="scale-notes-title"
              sourceHref="https://www.rialo.io/posts/making-the-agent-economy-simple-and-safe-with-rialo/"
              sourceLabel={t("Making the Agent Economy Simple and Safe")}
              sourceType={t("Applied demo / overview")}
            />
          </div>

          <div className={styles.chapterTransition} aria-hidden="true">
            <span>06</span>
            <i />
            <strong>{t("Delegated work creates delegated authority")}</strong>
            <i />
            <span>07</span>
          </div>
        </section>

        <section
          className={`${styles.chapter} ${styles.latchChapter}`}
          id="chapter-latch"
          data-learn-chapter
          aria-labelledby="latch-title"
        >
          <LatchCinematic />

          <div className={styles.chapterKnowledge}>
            <ChapterFacts facts={latchFacts} headingId="latch-facts-title" />
            <StudyNotes
              notes={latchNotes}
              headingId="latch-notes-title"
              sourceHref="https://onlatch.com/docs/"
              sourceLabel={t("Latch documentation")}
              sourceType={t("Product documentation")}
            />
          </div>

          <div className={styles.chapterTransition} aria-hidden="true">
            <span>07</span>
            <i />
            <strong>{t("Constrained, metered agents enter the circuit")}</strong>
            <i />
            <span>08</span>
          </div>
        </section>

        <section
          className={styles.chapter}
          id="chapter-agp"
          data-learn-chapter
          aria-labelledby="agp-title"
        >
          <AgpCinematic />

          <div className={styles.chapterKnowledge}>
            <ChapterFacts facts={agpFacts} headingId="agp-facts-title" />
            <StudyNotes
              notes={agpNotes}
              headingId="agp-notes-title"
              sourceHref="https://agp.onlatch.com/"
              sourceLabel="Agent Grand Prix"
              sourceType={t("Applied demo / overview")}
            />
          </div>
        </section>

        <section className={styles.routeReadingCta} aria-labelledby="continue-study-title">
          <span>{t("Continue learning")}</span>
          <h2 id="continue-study-title">{t("Take the model into the source.")}</h2>
          <p>{t("Learn gives you the model. Explore Rialo's official material for deeper technical detail before taking the Arena quiz.")}</p>
          <a
            href="https://rialo.io/for-devs"
            target="_blank"
            rel="noopener noreferrer"
          >{t("Study official Rialo material")}<span aria-hidden="true">↗</span>
          </a>
        </section>

        <footer className={styles.learnFooter}>
          <Image
            src="/brand/rialo/rialo-symbol-off-white.svg"
            alt=""
            width={303}
            height={331}
          />
          <span>{t("Rialo Arena / Field manual foundation")}</span>
          <a href="#chapter-rialo">{t("Return to chapter 01 ↑")}</a>
        </footer>
      </main>
    </div>
  );
}
