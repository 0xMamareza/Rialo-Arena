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
    label: "Omni Account and IPC",
    value: "One account can transact across networks while Identity, Privacy, and Compliance remain first-class capabilities.",
  },
  {
    label: "Consensus",
    value: "A high-throughput parallel multi-proposer consensus path establishes transaction order and shared state.",
  },
];

const architectureNotes: StudyNote[] = [
  {
    title: "External world and Rialo Edge",
    body: (
      <p>
        Rialo Edge is the chain&apos;s bidirectional Web2 boundary. Programs can
        reach APIs and external systems, then use returned data inside onchain
        logic without assembling a separate middleware network.
      </p>
    ),
  },
  {
    title: "Workflow, Read Path, and Stream",
    body: (
      <p>
        Workflow provides native automation for multi-step processes. Stream
        supplies continuous data feeds for use cases such as DeFi and RWAs.
        Read Path lets applications access data and state updates directly from
        validators, reducing latency and operational infrastructure.
      </p>
    ),
  },
  {
    title: "Execution and the Rialo VM",
    body: (
      <p>
        The execution engine handles event-driven and dynamic workloads. Rialo
        VM uses RISC-V and supports SVM compatibility. Rialo&apos;s official
        architecture overview lists EVM and MoveVM compatibility as direction
        that is still to follow.
      </p>
    ),
  },
  {
    title: "REX protected execution",
    body: (
      <p>
        REX is the extended execution environment for confidential work.
        Sensitive inputs can be encrypted, processed inside the protected
        environment, and cleared while the resulting computation remains
        verifiable without exposing the underlying private data.
      </p>
    ),
  },
  {
    title: "Cruise and user execution",
    body: (
      <p>
        Rialo Cruise provides a native gasless transaction path with low to
        zero fees. It removes a user-facing source of friction while remaining
        connected to the same execution and settlement machine.
      </p>
    ),
  },
  {
    title: "Omni Account",
    body: (
      <p>
        Rialo Omni Account gives a user one account that can transact across
        multiple networks. The architecture treats cross-network reach as part
        of the account experience rather than a separate identity for every
        destination.
      </p>
    ),
  },
  {
    title: "Identity, Privacy, and Compliance",
    body: (
      <p>
        IPC names three first-class capabilities in Rialo: Identity, Privacy,
        and Compliance. Their placement inside the system allows applications
        to compose trust controls with execution instead of rebuilding them as
        disconnected application services.
      </p>
    ),
  },
  {
    title: "Consensus closes the loop",
    body: (
      <p>
        Rialo describes a high-throughput, parallel multi-proposer consensus
        design. Consensus orders the work that enters execution and gives the
        connected architecture a shared view of committed state.
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
    title: "Predicate and action",
    body: (
      <p>
        A reactive transaction registers a logical predicate with the program
        that should run when that predicate becomes true. The condition waits
        in chain state instead of depending on an external watcher.
      </p>
    ),
  },
  {
    title: "Signals that can wake execution",
    body: (
      <p>
        Inputs can include balances, state transitions, emitted events,
        validator-attested oracle or API data, block height, timestamps, and
        results produced by earlier workflow steps.
      </p>
    ),
  },
  {
    title: "Validator evaluation",
    body: (
      <p>
        During block execution, validators evaluate predicates whose
        dependencies may have changed. Evaluation is deterministic, so the
        network reaches one conclusion from the same state.
      </p>
    ),
  },
  {
    title: "Trigger and execution order",
    body: (
      <p>
        When a predicate becomes true, Rialo marks the transaction as triggered
        and enqueues it. The action can run in the same block or a following
        block according to dependency ordering.
      </p>
    ),
  },
  {
    title: "Long-running workflows",
    body: (
      <p>
        A reactive transaction can create later conditional steps, allowing a
        workflow to wait, resume, and span many blocks while remaining inside
        the protocol&apos;s execution model.
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
    title: "The SfS position",
    body: (
      <p>
        A Stake-for-Service position records the staked principal, its validator
        or pool, and the fraction of future rewards allocated to service use.
        The principal itself stays in the staking position.
      </p>
    ),
  },
  {
    title: "Routing future rewards",
    body: (
      <p>
        At each reward interval, the selected share bypasses user custody and
        flows to the ServicePaymaster. The remaining reward follows the normal
        path back to the staker.
      </p>
    ),
  },
  {
    title: "ServicePaymaster accounting",
    body: (
      <p>
        The ServicePaymaster mints credits with equivalent backing and tracks
        balances and consumption. When services consume credits, validators and
        providers receive the corresponding RLO payout.
      </p>
    ),
  },
  {
    title: "Why credits stay service-bound",
    body: (
      <p>
        Credits behave as programmable vouchers for network work. They cannot
        be transferred outside the service context, which keeps routed rewards
        directed toward productive network activity.
      </p>
    ),
  },
  {
    title: "Services the flow can fund",
    body: (
      <p>
        The same credit system can pay for gas, storage, scheduled tasks, and
        future service categories integrated into Rialo&apos;s network accounting.
      </p>
    ),
  },
  {
    title: "Composition with Reactive Transactions",
    body: (
      <p>
        Reactive Transactions provide native scheduling and condition-based
        execution. Stake-for-Service supplies a renewable funding stream, so a
        recurring workflow can continue without a manually maintained gas balance.
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
    title: "The Massive feed",
    body: (
      <p>
        Massive supplied a live WebSocket stream containing symbols, prices,
        and timestamps for thousands of stocks and indices. The pipeline ran
        continuously under live market conditions.
      </p>
    ),
  },
  {
    title: "Why raw publishing was not enough",
    body: (
      <p>
        Fast feeds contain both signal and noise. Project 1337 applied
        preprocessing so the onchain report represented a useful best estimate
        rather than a blind relay of every incoming message.
      </p>
    ),
  },
  {
    title: "Best-estimate pricing",
    body: (
      <p>
        The experiment used market-maker-style processing that considered
        factors such as momentum. This produced compact derived values while
        preserving the financial information applications needed.
      </p>
    ),
  },
  {
    title: "Signing the result",
    body: (
      <p>
        Cryptographic signing confirmed that the reported output came from
        Massive data after the declared preprocessing. Consumers could verify
        authenticity without relying on an operator&apos;s reputation.
      </p>
    ),
  },
  {
    title: "High-speed onchain markets",
    body: (
      <p>
        Dense, precise, frequently updated prices are foundational for
        perpetual markets, RWA instruments, and synthetic assets that must
        track real-world markets without stale-data risk.
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
    title: "SCALE task terms",
    body: (
      <p>
        A SCALE task packages the requested work, payment amount, deadline, and
        judge into one onchain agreement. The worker can inspect these terms
        before accepting the task.
      </p>
    ),
  },
  {
    title: "Discovering a worker",
    body: (
      <p>
        The requester can query Rialo&apos;s Agent Registry for an agent with the
        required capability. The task address is then delivered to that worker
        using Agent2Agent communication.
      </p>
    ),
  },
  {
    title: "Escrow before execution",
    body: (
      <p>
        Minting the task places the offered RLO into program-controlled escrow.
        The funds are therefore committed before work begins but remain locked
        until the contract reaches a valid settlement path.
      </p>
    ),
  },
  {
    title: "Submission and judging",
    body: (
      <p>
        The worker submits its result to the task address. Rialo can use native
        webcalls and A2A to ask the named judge whether that work meets the
        prompt and quality requirements.
      </p>
    ),
  },
  {
    title: "Deadline enforcement",
    body: (
      <p>
        If no work arrives before the recorded deadline, a Rialo timer can
        trigger the refund path automatically. No external scheduler must wake
        the agreement.
      </p>
    ),
  },
  {
    title: "Payment or refund",
    body: (
      <p>
        A passing verdict releases escrow to the worker. A failed verdict
        returns it to the requester, creating a compact quality-assurance loop
        for agent-to-agent commerce.
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
    label: "Ordered control",
    value: "Request filters evaluate in pipeline order and the first denial short-circuits the run.",
  },
  {
    label: "Safe forwarding",
    value: "Secret injection happens only after request policy passes, immediately before the upstream call.",
  },
  {
    label: "Controlled return",
    value: "The response filter runs after upstream and can block or redact before data reaches the caller.",
  },
  {
    label: "Multi-mount",
    value: "One token can route to multiple services with a separate Secret and policy pipeline per mount.",
  },
  {
    label: "Full trace",
    value: "Allowed and denied calls share an audit trail with the deciding filter and its reason.",
  },
];

const latchNotes: StudyNote[] = [
  {
    title: "Secret",
    body: (
      <p>
        A Secret is the real credential. Latch stores it encrypted and treats the
        value as write-only. It is injected in the configured header, query, or
        body position only when an allowed request is forwarded.
      </p>
    ),
  },
  {
    title: "Latch token",
    body: (
      <p>
        A lat_ token identifies a scoped Latch with its own upstream, policy,
        and lifetime. The caller holds this token instead of the credential, so
        the token cannot be turned back into the upstream key.
      </p>
    ),
  },
  {
    title: "Ordered pipeline",
    body: (
      <p>
        Filters run in order. The first denial stops evaluation, skips every
        later filter, avoids credential injection, and prevents an upstream
        call. Ordinary policy denials return 403 with the deciding filter.
      </p>
    ),
  },
  {
    title: "Request and response filters",
    body: (
      <p>
        Request filters govern what a caller can do before upstream runs. The
        response filter governs what the caller can learn after upstream runs,
        including blocking statuses or redacting selected JSON paths.
      </p>
    ),
  },
  {
    title: "Extension and inheritance",
    body: (
      <p>
        A child Latch inherits the parent chain and can narrow authority by
        adding restrictions. Live inheritance resolves policy on each request,
        so tightening or disabling a parent can affect descendants immediately.
      </p>
    ),
  },
  {
    title: "Multi-mount",
    body: (
      <p>
        A mount table maps unique path prefixes to separate upstream services.
        Each mount owns its upstream URL, bound Secret, and pipeline while the
        Latch keeps one token and one activity trail.
      </p>
    ),
  },
  {
    title: "Credential rotation and revocation",
    body: (
      <p>
        Rotate a Secret once and every Latch derived from it uses the new
        credential without issuing new lat_ tokens. Revoke or disable one Latch
        to cut off that caller without rotating the shared credential.
      </p>
    ),
  },
  {
    title: "Terraform provider",
    body: (
      <p>
        The official provider manages Secrets, Latches, policies, mounts, and
        KV connections as reviewed configuration. Terraform 1.11 or newer keeps
        credential arguments write-only so they do not appear in plan or state.
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
              <p className={styles.chapterThesis}>The real-world blockchain</p>
              <h1 id="rialo-title">The chain meets the world.</h1>
              <p className={styles.chapterIntro}>
                Rialo joins real data, timing, private inputs, and reliable
                execution in one programmable system.
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
            />
          </div>

          <div className={styles.chapterTransition} aria-hidden="true">
            <span>01</span>
            <i />
            <strong>From capability to composition</strong>
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
            />
          </div>

          <div className={styles.chapterTransition} aria-hidden="true">
            <span>02</span>
            <i />
            <strong>Conditions enter execution</strong>
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
            />
          </div>

          <div className={styles.chapterTransition} aria-hidden="true">
            <span>03</span>
            <i />
            <strong>Execution gains a funding loop</strong>
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
            />
          </div>

          <div className={styles.chapterTransition} aria-hidden="true">
            <span>04</span>
            <i />
            <strong>Live markets enter verified state</strong>
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
            />
          </div>

          <div className={styles.chapterTransition} aria-hidden="true">
            <span>05</span>
            <i />
            <strong>Markets give way to agent labor</strong>
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
            />
          </div>

          <div className={styles.chapterTransition} aria-hidden="true">
            <span>06</span>
            <i />
            <strong>Agent authority enters policy</strong>
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
            />
          </div>

          <div className={styles.chapterTransition} aria-hidden="true">
            <span>07</span>
            <i />
            <strong>Policy enters the circuit</strong>
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
            />
          </div>
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
