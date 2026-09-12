import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Learn | Rialo Arena",
  description:
    "A visual field manual for the systems, primitives, and experiments behind Rialo.",
};

const chapters: LearnChapterNavItem[] = [
  { id: "chapter-rialo", label: "Rialo", number: "01", available: true },
  {
    id: "chapter-architecture",
    label: "Architecture",
    number: "02",
    available: true,
  },
  {
    id: "chapter-reactive",
    label: "Reactive",
    number: "03",
    available: true,
  },
  {
    id: "chapter-stake-for-service",
    label: "Stake-for-Service",
    number: "04",
    available: true,
  },
  {
    id: "chapter-project-1337",
    label: "Project 1337",
    number: "05",
    available: true,
  },
  {
    id: "chapter-agent-economy",
    label: "Agent Economy",
    number: "06",
    available: true,
  },
  { id: "chapter-latch", label: "Latch", number: "07", available: true },
  { id: "chapter-agp", label: "AGP", number: "08", available: true },
];

const rialoFacts: ChapterFact[] = [
  {
    label: "Native connectivity",
    value: "Programs can interact with external APIs and real-world systems.",
  },
  {
    label: "Reactive execution",
    value: "Conditions can wake and advance logic without a keeper loop.",
  },
  {
    label: "Private computation",
    value: "Sensitive inputs can be processed without publishing every detail.",
  },
  {
    label: "Supermodular design",
    value: "Protocol primitives are integrated when their value compounds together.",
  },
];

const rialoNotes: StudyNote[] = [
  {
    title: "Real-world means bidirectional",
    body: (
      <p>
        The goal is broader than importing a data feed. Programs should be able
        to read verified external information, react to it, and securely drive
        actions back into real-world systems.
      </p>
    ),
  },
  {
    title: "The chain becomes an application backend",
    body: (
      <p>
        Connectivity, workflow, privacy, execution, and consensus are treated
        as coordinated parts of one programming environment rather than a set
        of integrations every application must rebuild.
      </p>
    ),
  },
  {
    title: "Integration is selective, not ideological",
    body: (
      <p>
        Rialo&apos;s supermodular framing asks whether two capabilities reinforce
        one another in production. Functions that create new value together
        are candidates for protocol-level integration.
      </p>
    ),
  },
];

const architectureFacts: ChapterFact[] = [
  {
    label: "Rialo Edge",
    value: "Bidirectional Web2 interaction lets programs communicate with external services without a middleware stack.",
  },
  {
    label: "Workflow and Stream",
    value: "Native automation coordinates complex sequences while continuous feeds supply real-world data to applications.",
  },
  {
    label: "Read Path",
    value: "Applications can access state directly from validators, reducing latency and separate read infrastructure.",
  },
  {
    label: "Execution Engine",
    value: "Event-driven execution, Conditional Transactions, and hybrid concurrency coordinate dynamic workloads.",
  },
  {
    label: "Rialo VM",
    value: "The VM is RISC-V based, compatible with SVM, with EVM and MoveVM compatibility stated as future direction.",
  },
  {
    label: "REX",
    value: "Rialo Extended Execution supports confidential computation over sensitive inputs with verifiable results.",
  },
  {
    label: "Cruise",
    value: "Native gasless transaction support creates a low to zero fee user path.",
  },
  {
    label: "Omni Account",
    value: "One account provides account continuity across multiple networks.",
  },
  {
    label: "Interop",
    value: "Native interoperability handles cross-network movement and communication as a distinct system capability.",
  },
  {
    label: "IPC",
    value: "Identity, Privacy, and Compliance remain first-class capabilities inside the architecture.",
  },
  {
    label: "Consensus",
    value: "A high-throughput parallel multi-proposer consensus path establishes transaction order and shared state.",
  },
];

const architectureNotes: StudyNote[] = [
  {
    title: "Three different data paths",
    body: (
      <p>
        Edge is the bidirectional boundary for external services, Stream brings
        continuous external inputs into applications, and Read Path gives apps
        fast validator-to-app state access. They connect different kinds of
        information flow to the same machine.
      </p>
    ),
  },
  {
    title: "Workflow and Reactive are related, not identical",
    body: (
      <p>
        Workflow composes autonomous multi-step processes. Reactive and
        Conditional Transactions let work wait for future state, data, or time
        conditions before it continues.
      </p>
    ),
  },
  {
    title: "Execution Engine is not the VM",
    body: (
      <p>
        The Execution Engine coordinates events, conditions, and hybrid
        concurrency. Rialo VM executes program instructions through its RISC-V
        runtime and SVM compatibility. EVM and MoveVM remain stated as future
        compatibility direction.
      </p>
    ),
  },
  {
    title: "REX extends execution guarantees",
    body: (
      <p>
        REX adds a protected environment for confidential computation. It keeps
        sensitive inputs from ordinary visibility while preserving verifiable
        results for the surrounding system.
      </p>
    ),
  },
  {
    title: "Cruise and Stake-for-Service solve different friction",
    body: (
      <p>
        Cruise addresses the user transaction path with native gasless support.
        Stake-for-Service addresses recurring service funding by routing future
        staking rewards. Both improve usability at different layers.
      </p>
    ),
  },
  {
    title: "Account continuity is not interoperability",
    body: (
      <p>
        Omni Account describes who acts across network contexts. Interop
        describes how value and messages move across network boundaries. The
        capabilities reinforce each other without being the same mechanism.
      </p>
    ),
  },
  {
    title: "IPC and Consensus close different trust loops",
    body: (
      <p>
        Identity, Privacy, and Compliance provide application-facing trust
        controls. Consensus gives validators a shared order and committed state
        for the work moving through the architecture.
      </p>
    ),
  },
];

const reactiveFacts: ChapterFact[] = [
  {
    label: "Protocol-native automation",
    value: "Conditions are evaluated and triggered by Rialo's execution path without bots, keepers, cron jobs, or separate schedulers.",
  },
  {
    label: "Signal range",
    value: "Predicates can reference onchain state and events, validator-attested external data, and time conditions.",
  },
  {
    label: "Stored condition",
    value: "A predicate defines when its associated executable transaction becomes eligible to run.",
  },
  {
    label: "Deterministic agreement",
    value: "Validators evaluate affected predicates against shared state and arrive at the same result.",
  },
  {
    label: "Automatic execution",
    value: "A true predicate enqueues its transaction for execution in dependency order.",
  },
];

const reactiveNotes: StudyNote[] = [
  {
    title: "Dependency-aware evaluation",
    body: (
      <p>
        Predicates can depend on state, events, validator-attested external data,
        block height, timestamps, or earlier workflow results. Validators only
        reevaluate affected conditions and reach the same result from shared state.
      </p>
    ),
  },
  {
    title: "Triggering respects execution order",
    body: (
      <p>
        A true predicate enqueues its associated transaction. The action can run
        in the same block or a following block according to dependency ordering,
        so automatic does not mean outside protocol sequencing.
      </p>
    ),
  },
  {
    title: "Long-running workflows",
    body: (
      <p>
        A triggered transaction can create later conditional steps. This lets a
        workflow wait, resume, and span many blocks without an external watcher
        keeping it alive.
      </p>
    ),
  },
];

const stakeServiceFacts: ChapterFact[] = [
  {
    label: "Principal preserved",
    value: "The RLO principal remains staked and continues securing the network while producing rewards.",
  },
  {
    label: "Future yield routing",
    value: "A chosen routing fraction directs only part of future staking rewards toward services.",
  },
  {
    label: "ServicePaymaster",
    value: "Routed rewards go directly to the ServicePaymaster, which mints an equivalent quantity of service credits.",
  },
  {
    label: "Bound utility",
    value: "Credits are non-transferable outside service use and cannot become a speculative asset.",
  },
  {
    label: "Network services",
    value: "Credits can fund gas, storage, and scheduled execution across Rialo.",
  },
  {
    label: "Recurring operations",
    value: "Yield-funded credits can sustain Reactive Transactions without repeated balance monitoring or manual top-ups.",
  },
];

const stakeServiceNotes: StudyNote[] = [
  {
    title: "Position and routing boundary",
    body: (
      <p>
        An SfS position records the principal, validator or pool, and routing
        fraction. Only the selected share of future rewards enters the service
        path; principal remains in the staking position.
      </p>
    ),
  },
  {
    title: "ServicePaymaster accounting",
    body: (
      <p>
        Routed rewards back an equivalent quantity of credits. As services
        consume credits, validators and providers receive the corresponding RLO
        payout through the network&apos;s accounting path.
      </p>
    ),
  },
  {
    title: "Why credits stay service-bound",
    body: (
      <p>
        Credits are programmable vouchers for network work, not transferable
        assets. That boundary keeps routed yield directed toward gas, storage,
        scheduled execution, and other supported services.
      </p>
    ),
  },
  {
    title: "Composition with Reactive Transactions",
    body: (
      <p>
        Reactive Transactions supply condition-aware execution. Stake-for-Service
        supplies renewable service funding, allowing recurring workflows to run
        without a manually maintained gas balance.
      </p>
    ),
  },
];

const project1337Facts: ChapterFact[] = [
  {
    label: "Live source",
    value: "Project 1337 ingested real-time financial-market updates from Massive's WebSocket feed.",
  },
  {
    label: "Derived signal",
    value: "Rialo processed the feed into a market-maker-style best-estimate price instead of publishing raw ticks unchanged.",
  },
  {
    label: "Compact output",
    value: "Preprocessing condensed fast-moving market activity into meaningful values suitable for onchain use.",
  },
  {
    label: "Cryptographic origin",
    value: "Each update was signed to bind the published result to Massive data and the applied preprocessing.",
  },
  {
    label: "Financial rails",
    value: "The experiment targeted high-speed infrastructure for perpetuals, real-world assets, and synthetic markets.",
  },
];

const project1337Notes: StudyNote[] = [
  {
    title: "Raw feed versus derived market signal",
    body: (
      <p>
        Massive supplied a live WebSocket stream across thousands of stocks and
        indices. Project 1337 processed those fast, noisy updates into compact
        best-estimate prices rather than relaying every tick unchanged.
      </p>
    ),
  },
  {
    title: "Signing establishes provenance",
    body: (
      <p>
        Cryptographic signing bound each output to Massive data and the declared
        preprocessing path. Consumers could verify where a derived result came
        from without treating an operator&apos;s reputation as the proof.
      </p>
    ),
  },
  {
    title: "Why the experiment mattered",
    body: (
      <p>
        The goal was not a chart dashboard. It tested whether dense, precise,
        frequently updated financial signals could support perpetuals, RWAs, and
        synthetic markets on high-speed onchain rails.
      </p>
    ),
  },
];

const scaleFacts: ChapterFact[] = [
  {
    label: "Simple labor contract",
    value: "SCALE means Simple Contracts for Agent Labor Execution.",
  },
  {
    label: "Explicit terms",
    value: "Each task names the prompt, offered payment, delivery deadline, and third-party judge.",
  },
  {
    label: "Onchain escrow",
    value: "The offered RLO is escrowed automatically when the SCALE task is minted.",
  },
  {
    label: "Agent discovery",
    value: "A requester can find a capable worker through the Rialo Agent Registry and communicate over A2A.",
  },
  {
    label: "Timer enforcement",
    value: "Rialo's native timers can refund the requester automatically when delivery misses the deadline.",
  },
  {
    label: "Verdict settlement",
    value: "A passing judge verdict releases payment, while a failed verdict refunds the requester.",
  },
];

const scaleNotes: StudyNote[] = [
  {
    title: "Terms and escrow",
    body: (
      <p>
        A SCALE task packages the prompt, payment, deadline, and judge into one
        agreement. Minting commits the offered RLO to program-controlled escrow
        before a worker begins.
      </p>
    ),
  },
  {
    title: "Discovery and delivery",
    body: (
      <p>
        A requester can find a capable worker through Rialo&apos;s Agent Registry
        and send the task address over Agent2Agent communication. The worker can
        inspect the terms before accepting and submit back to the task address.
      </p>
    ),
  },
  {
    title: "Judgment and time are separate settlement paths",
    body: (
      <p>
        The named judge evaluates submitted work and a passing verdict releases
        payment. If delivery never arrives before the deadline, a native Rialo
        timer can trigger refund without an external scheduler.
      </p>
    ),
  },
  {
    title: "The demonstration boundary",
    body: (
      <p>
        SCALE demonstrates a compact pattern for agent labor coordination. Its
        registry, communication, escrow, judging, and timer pieces remain
        explicit so applications can reason about authority and settlement.
      </p>
    ),
  },
];

const latchFacts: ChapterFact[] = [
  {
    label: "Credential boundary",
    value: "The agent receives a scoped lat_ token, never the real API credential stored as a Secret.",
  },
  {
    label: "First deny wins",
    value: "Request filters evaluate in order and the first denial stops evaluation before credential injection or upstream access.",
  },
  {
    label: "Two-sided policy",
    value: "Request filters govern action before upstream; response filters can block or redact what returns.",
  },
  {
    label: "Composable delegation",
    value: "Multi-mount and child Latches scope access across services while inherited policy can narrow authority further.",
  },
  {
    label: "Hardware-bound identity",
    value: "The identity filter can bind authority to enrolled agent keys, limiting the value of a stolen token.",
  },
  {
    label: "Attested protection",
    value: "For stronger isolation, policy can evaluate encrypted payloads inside an attested execution environment.",
  },
  {
    label: "Audit trail",
    value: "Allowed and denied calls record the deciding filter and reason in one activity trace.",
  },
];
const latchNotes: StudyNote[] = [
  {
    title: "Secret and Latch have different lifecycles",
    body: (
      <p>
        A Secret is the encrypted, write-only upstream credential. Rotate it once
        and dependent Latches use the replacement. Disable one Latch to revoke a
        caller without rotating the shared credential.
      </p>
    ),
  },
  {
    title: "Request and response policy have different consequences",
    body: (
      <p>
        A request denial prevents Secret injection and upstream access. Response
        policy runs only after upstream and controls what the caller can learn,
        including status blocking and selected JSON redaction.
      </p>
    ),
  },
  {
    title: "Inheritance can narrow authority",
    body: (
      <p>
        A child Latch inherits its parent chain and can add restrictions. Live
        inheritance means tightening or disabling a parent can affect descendants
        without allowing a child to widen the original boundary.
      </p>
    ),
  },
  {
    title: "Multi-mount scopes every destination",
    body: (
      <p>
        Unique path prefixes can map one token to several upstream services.
        Each mount retains its own Secret and ordered pipeline while activity
        remains visible through one audit trail.
      </p>
    ),
  },
  {
    title: "Identity and enclave protection are additive",
    body: (
      <p>
        Hardware-bound keys can make token possession alone insufficient. When
        stronger isolation is selected, encrypted payloads can be evaluated in
        an attested environment that records which protected path ran.
      </p>
    ),
  },
  {
    title: "Infrastructure as policy",
    body: (
      <p>
        The Terraform provider manages Secrets, Latches, policies, mounts, and
        KV connections as reviewed configuration. Terraform 1.11 or newer keeps
        credential arguments write-only so they stay out of plan and state.
      </p>
    ),
  },
];

const agpFacts: ChapterFact[] = [
  {
    label: "Hidden checkpoints",
    value: "Agents must identify each concealed point before moving through the circuit.",
  },
  {
    label: "Oracle dialogue",
    value: "Only yes-or-no questions are used to reduce the possible answer space.",
  },
  {
    label: "Formal guess",
    value: "A committed answer, not another question, is required to claim a checkpoint.",
  },
  {
    label: "Metered reasoning",
    value: "Question spend can be measured onchain, rewarding efficient strategies.",
  },
];

const agpNotes: StudyNote[] = [
  {
    title: "The control loop",
    body: (
      <p>
        The agent repeats a compact cycle: ask, update its beliefs, decide when
        uncertainty is low enough, and submit a formal guess. A correct guess
        advances the circuit; a wrong one leaves the checkpoint unresolved.
      </p>
    ),
  },
  {
    title: "Why questions carry cost",
    body: (
      <p>
        Pricing each query makes information efficiency visible. The strongest
        strategy is not exhaustive search, but choosing questions that remove
        the largest part of the answer space.
      </p>
    ),
  },
  {
    title: "The operating stack",
    body: (
      <p>
        AGP is played over MCP. Sigil meters spend, OpenRouter supplies the
        Oracle&apos;s model path, and Latch constrains the agent&apos;s access and budget.
      </p>
    ),
  },
];

function RialoField() {
  return (
    <div className={styles.rialoField} aria-hidden="true">
      <div className={`${styles.orbit} ${styles.orbitOuter}`} />
      <div className={`${styles.orbit} ${styles.orbitMiddle}`} />
      <div className={`${styles.orbit} ${styles.orbitInner}`} />

      <span className={`${styles.fieldNode} ${styles.nodeWeb}`}>World / API</span>
      <span className={`${styles.fieldNode} ${styles.nodeData}`}>Attested data</span>
      <span className={`${styles.fieldNode} ${styles.nodeReact}`}>Reactive logic</span>
      <span className={`${styles.fieldNode} ${styles.nodePrivate}`}>Private compute</span>

      <div className={styles.rialoCore}>
        <Image
          src="/brand/rialo/rialo-symbol-a9ddd3.svg"
          alt=""
          width={303}
          height={331}
          priority
        />
        <span>Protocol core</span>
      </div>
    </div>
  );
}

export default function LearnPage() {
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
              <span className={styles.chapterMarker}>Chapter 01 / Rialo</span>
              <span className={styles.systemType}>Protocol foundation</span>
              <p className={styles.chapterThesis}>The real-world blockchain</p>
              <h1 id="rialo-title">The chain meets the world.</h1>
              <p className={styles.chapterIntro}>
                Rialo brings Web3 to the users, apps, and services of the real
                world while keeping execution decentralized and results verifiable.
              </p>
              <div className={styles.scrollCue} aria-hidden="true">
                <span /> Scroll to trace the system
              </div>
            </header>
            <RialoField />
          </div>

          <div className={styles.chapterKnowledge}>
            <ChapterFacts facts={rialoFacts} headingId="rialo-facts-title" />
            <StudyNotes
              notes={rialoNotes}
              headingId="rialo-notes-title"
              sourceHref="https://www.rialo.io/posts/introducing-rialo/"
              sourceLabel="Introducing Rialo"
              sourceType="Official overview"
            />
          </div>

          <div className={styles.chapterTransition} aria-hidden="true">
            <span>01</span>
            <i />
            <strong>Foundations become one connected machine</strong>
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
              sourceLabel="Rialo architecture overview"
              sourceType="Official overview"
            />
          </div>

          <div className={styles.chapterTransition} aria-hidden="true">
            <span>02</span>
            <i />
            <strong>Execution becomes condition-aware</strong>
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
              sourceLabel="Reactive Transactions"
              sourceType="Technical article"
            />
          </div>

          <div className={styles.chapterTransition} aria-hidden="true">
            <span>03</span>
            <i />
            <strong>Autonomous execution needs autonomous funding</strong>
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
              sourceLabel="Stake for Service"
              sourceType="Technical article"
            />
          </div>

          <div className={styles.chapterTransition} aria-hidden="true">
            <span>04</span>
            <i />
            <strong>Verified data tells funded systems what to act on</strong>
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
              sourceLabel="Project 1337: The Recap"
              sourceType="Experiment recap"
            />
          </div>

          <div className={styles.chapterTransition} aria-hidden="true">
            <span>05</span>
            <i />
            <strong>Machine-readable data becomes machine-coordinated work</strong>
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
              sourceLabel="Making the Agent Economy Simple and Safe"
              sourceType="Applied demo / overview"
            />
          </div>

          <div className={styles.chapterTransition} aria-hidden="true">
            <span>06</span>
            <i />
            <strong>Delegated work creates delegated authority</strong>
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
              sourceLabel="Latch documentation"
              sourceType="Product documentation"
            />
          </div>

          <div className={styles.chapterTransition} aria-hidden="true">
            <span>07</span>
            <i />
            <strong>Constrained, metered agents enter the circuit</strong>
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
              sourceType="Applied demo / overview"
            />
          </div>
        </section>

        <section className={styles.routeReadingCta} aria-labelledby="continue-study-title">
          <span>Continue learning</span>
          <h2 id="continue-study-title">Take the model into the source.</h2>
          <p>
            Learn gives you the model. Explore Rialo&apos;s official material for
            deeper technical detail before taking the Arena quiz.
          </p>
          <a
            href="https://rialo.io/for-devs"
            target="_blank"
            rel="noopener noreferrer"
          >
            Study official Rialo material <span aria-hidden="true">↗</span>
          </a>
        </section>

        <footer className={styles.learnFooter}>
          <Image
            src="/brand/rialo/rialo-symbol-off-white.svg"
            alt=""
            width={303}
            height={331}
          />
          <span>Rialo Arena / Field manual foundation</span>
          <a href="#chapter-rialo">Return to chapter 01 ↑</a>
        </footer>
      </main>
    </div>
  );
}
