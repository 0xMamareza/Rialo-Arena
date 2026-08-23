import type { Metadata } from "next";
import Image from "next/image";
import localFont from "next/font/local";

import { AgpCinematic } from "./_components/agp-cinematic";
import { LatchCinematic } from "./_components/latch-cinematic";
import { ReactiveCinematic } from "./_components/reactive-cinematic";
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
    available: false,
  },
  {
    id: "chapter-agent-economy",
    label: "Agent Economy",
    number: "06",
    available: false,
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
    label: "External inputs",
    value: "Authenticated web calls and attested data extend what programs can observe.",
  },
  {
    label: "Workflow",
    value: "Predicates and event-driven execution let programs wait, resume, and react.",
  },
  {
    label: "Execution",
    value: "Public and protected computation serve different data and privacy needs.",
  },
  {
    label: "Shared guarantees",
    value: "Integrated services coordinate through the protocol's execution and consensus path.",
  },
];

const architectureNotes: StudyNote[] = [
  {
    title: "Integrate the supermodulars",
    body: (
      <p>
        A capability belongs close to execution when improving it raises the
        value of the other integrated capabilities. Native automation becomes
        more useful with trusted data; trusted data becomes more useful when
        programs can act on it immediately.
      </p>
    ),
  },
  {
    title: "Commoditize the complements",
    body: (
      <p>
        Not every data source or service needs to live inside the protocol.
        Rialo&apos;s model keeps commodity inputs external while integrating the
        attestation, protected computation, and execution paths that make those
        inputs safe and useful.
      </p>
    ),
  },
  {
    title: "Look for emergent workflows",
    body: (
      <p>
        The architecture matters most where composition creates something no
        isolated component could provide: recurring operations, hybrid
        chain-to-world workflows, and verifiable computation over external data.
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

function ArchitectureMap() {
  return (
    <div className={styles.architectureMap} aria-hidden="true">
      <svg viewBox="0 0 760 680" role="presentation">
        <defs>
          <pattern id="architecture-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 0H0V32" fill="none" stroke="currentColor" strokeOpacity=".08" />
          </pattern>
          <linearGradient id="architecture-flow" x1="0" x2="1">
            <stop offset="0" stopColor="#a9ddd3" stopOpacity="0" />
            <stop offset=".5" stopColor="#a9ddd3" />
            <stop offset="1" stopColor="#a9ddd3" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect width="760" height="680" fill="url(#architecture-grid)" />
        <path className={styles.architectureFlow} d="M88 110H672M150 110V235M380 110V235M610 110V235M150 333V440M380 333V440M610 333V440M150 538V610H610V538" />

        <g className={styles.architectureBand}>
          <rect x="44" y="54" width="672" height="112" rx="2" />
          <text x="70" y="84">REAL-WORLD INPUTS</text>
          <text className={styles.architectureModule} x="150" y="126" textAnchor="middle">WEB / API</text>
          <text className={styles.architectureModule} x="380" y="126" textAnchor="middle">ONCHAIN STATE</text>
          <text className={styles.architectureModule} x="610" y="126" textAnchor="middle">TIME / EVENTS</text>
        </g>

        <g className={`${styles.architectureBand} ${styles.architectureBandActive}`}>
          <rect x="44" y="220" width="672" height="128" rx="2" />
          <text x="70" y="250">PROTOCOL SERVICES</text>
          <text className={styles.architectureModule} x="150" y="304" textAnchor="middle">EDGE + STREAM</text>
          <text className={styles.architectureModule} x="380" y="304" textAnchor="middle">WORKFLOW</text>
          <text className={styles.architectureModule} x="610" y="304" textAnchor="middle">ATTESTATION</text>
        </g>

        <g className={styles.architectureBand}>
          <rect x="44" y="425" width="672" height="128" rx="2" />
          <text x="70" y="455">EXECUTION</text>
          <text className={styles.architectureModule} x="150" y="510" textAnchor="middle">RIALO VM</text>
          <text className={styles.architectureModule} x="380" y="510" textAnchor="middle">REX</text>
          <text className={styles.architectureModule} x="610" y="510" textAnchor="middle">STATE</text>
        </g>

        <g className={styles.architectureBase}>
          <rect x="150" y="600" width="460" height="44" rx="22" />
          <text x="380" y="627" textAnchor="middle">CONSENSUS / SHARED GUARANTEES</text>
        </g>
      </svg>
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
          <div className={`${styles.chapterLead} ${styles.architectureLead}`}>
            <RialoFieldBackground intensity="stage" />
            <header className={styles.chapterCopy}>
              <span className={styles.chapterMarker}>Chapter 02 / Architecture</span>
              <p className={styles.chapterThesis}>Supermodular by design</p>
              <h2 id="architecture-title">Integrate what compounds.</h2>
              <p className={styles.chapterIntro}>
                Rialo&apos;s architecture is not a vote for monolithic or modular.
                It is a decision system: bring complementary capabilities close
                to execution when their combination creates new utility.
              </p>
            </header>
            <ArchitectureMap />
          </div>

          <div className={styles.architectureStatement}>
            <span>Architecture principle / 01</span>
            <div>
              <p>One system. More capability.</p>
              <small>
                Data, workflow, privacy, and execution become more useful when
                they share one coordinated path.
              </small>
            </div>
          </div>

          <div className={styles.chapterKnowledge}>
            <ChapterFacts
              facts={architectureFacts}
              headingId="architecture-facts-title"
            />
            <StudyNotes
              notes={architectureNotes}
              headingId="architecture-notes-title"
              sourceHref="https://www.rialo.io/posts/rialo-foundations-ii-supermodularity/"
              sourceLabel="Rialo Foundations II"
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
            <strong>Funding enters bounded authority</strong>
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
