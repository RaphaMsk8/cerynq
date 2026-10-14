
import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Resources | Cerynq",
  description:
    "Understand Cerynq's onchain risk signals, evidence, and limitations.",
};

const controls = [
  {
    id: "ownership",
    title: "Ownership Control",
    meaning:
      "Checks for recognized ownership mechanisms that may grant administrative authority over a contract.",
    importance:
      "An owner may have permissions that affect how a protocol operates.",
    check:
      "Identify the owner and review how administrative permissions are managed.",
    limitation:
      "Ownership alone does not indicate malicious behavior. Not finding a recognized owner does not prove that no administrative control exists.",
  },
  {
    id: "pause",
    title: "Pause Capability",
    meaning:
      "Checks whether available contract evidence exposes recognized mechanisms for pausing operations.",
    importance:
      "Pause controls can protect users during emergencies but may also interrupt normal operations.",
    check:
      "Review who can activate a pause and under what conditions.",
    limitation:
      "A missing pause signal does not guarantee that operations cannot be restricted by other mechanisms.",
  },
  {
    id: "blacklist",
    title: "Blacklist Capability",
    meaning:
      "Checks for recognized mechanisms that may restrict certain addresses from interacting with a contract.",
    importance:
      "Address restrictions can support security or compliance policies but may also affect user access.",
    check:
      "Review who can manage restrictions and which operations may be affected.",
    limitation:
      "Detecting a capability does not mean that any address is currently blocked.",
  },
  {
    id: "whitelist",
    title: "Whitelist Capability",
    meaning:
      "Checks for recognized mechanisms that may limit access to approved addresses.",
    importance:
      "Allowlist controls can determine who is permitted to use specific contract functions.",
    check:
      "Identify who manages access permissions and whether restrictions are documented.",
    limitation:
      "An allowlist mechanism does not necessarily restrict every operation or every user.",
  },
  {
    id: "privileged",
    title: "Privileged Functions",
    meaning:
      "Identifies supported patterns of functions or permissions that may provide elevated contract control.",
    importance:
      "Privileged operations can introduce operational dependencies and governance risks.",
    check:
      "Review the permissions, their controllers, and safeguards such as multisignature authorization or timelocks.",
    limitation:
      "The detector does not establish the complete permission structure or guarantee that every privileged operation has been identified.",
  },
];

const evidence = [
  {
    id: "verified-contract",
    title: "Contract Verification",
    meaning:
      "Indicates when supported sources provide evidence that deployed contract code has been verified.",
    importance:
      "Verification improves transparency and enables deeper examination of the deployed code.",
    check:
      "Review the verified source and distinguish contract verification from an independent security audit.",
    limitation:
      "Verified source code does not guarantee that a contract is safe.",
  },
  {
    id: "proxy",
    title: "Proxy Detection",
    meaning:
      "Identifies supported proxy patterns in which a contract delegates execution to another implementation.",
    importance:
      "The implementation may contain the logic that matters most for risk analysis.",
    check:
      "Inspect the implementation and determine whether the specific proxy architecture supports upgrades.",
    limitation:
      "Not every proxy is upgradeable. An EIP-1167 minimal proxy, by itself, does not establish upgrade authority.",
  },
  {
    id: "implementation",
    title: "Implementation Resolution",
    meaning:
      "Indicates whether Cerynq could identify the implementation address associated with a supported proxy.",
    importance:
      "Resolving the implementation helps associate the proxy with its underlying contract logic.",
    check:
      "Inspect the resolved address and the available verification evidence.",
    limitation:
      "Successful resolution does not prove that the implementation is secure.",
  },
  {
    id: "provenance",
    title: "Evidence Provenance",
    meaning:
      "Describes the available sources and traceability of information used in an analysis.",
    importance:
      "Provenance helps users understand where findings originated and evaluate evidence quality.",
    check:
      "Inspect the reported sources, verification status, and any missing information.",
    limitation:
      "Traceable evidence does not guarantee that every risk has been identified or that every conclusion is complete.",
  },
];

const modelTopics = [
  {
    id: "risk-model",
    title: "Reading the Risk Assessment",
    meaning:
      "Risk Model v0.1 summarizes a limited set of privileged-control signals. Its numeric score is normalized to a 0–100 scale and is not an overall security rating.",
    importance:
      "A visible score is only meaningful alongside the assessment status, evidence confidence, and coverage of supported checks.",
    check:
      "Review detected findings individually, examine any Unknown results, and inspect evidence before making a decision. Partial assessments reflect only resolved checks.",
    limitation:
      "A low score is not proof of safety, and an elevated score does not establish fraud. The model does not replace an audit or cover every onchain risk.",
  },
];

type Topic = (typeof controls)[number];
const topics: Topic[] = [...modelTopics, ...controls, ...evidence];

function BrandWordmark() {
  return (
    <span
      role="img"
      aria-label="Cerynq"
      className="block h-[29px] w-[145px] shrink-0 bg-no-repeat mix-blend-screen"
      style={{
        backgroundImage: "url('/cerynq-cover.png')",
        backgroundSize: "410px 137px",
        backgroundPosition: "-114px -46px",
      }}
    />
  );
}

function TopicCard({ topic }: { topic: Topic }) {
  return (
    <article
      id={topic.id}
      tabIndex={-1}
      className="group scroll-mt-[34vh] rounded-2xl border border-[#26535b] bg-[#0d1932] p-5 shadow-[0_12px_45px_#00000020] outline-none transition-colors duration-300 sm:p-7 target:border-cyan-400/80 target:bg-[#153a45] target:shadow-[0_0_0_1px_#34d6e850,0_0_44px_#00bfd022]"
    >
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 rounded-full bg-cyan-400 opacity-50 group-target:opacity-100 group-target:shadow-[0_0_14px_#34d6e8]" />
        <h3 className="text-lg font-semibold text-white sm:text-xl">
          {topic.title}
        </h3>
        <span className="ml-auto rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-200 opacity-0 transition-opacity group-target:opacity-100">
          Selected topic
        </span>
      </div>

      <div className="mt-5 grid gap-x-8 gap-y-5 border-t border-[#23545c] pt-5 md:grid-cols-2">
        {[
          ["What does this mean?", topic.meaning],
          ["Why does it matter?", topic.importance],
          ["What should you check?", topic.check],
          ["Limitations", topic.limitation],
        ].map(([label, value]) => (
          <div key={label}>
            <h4 className="text-xs font-semibold uppercase tracking-[0.09em] text-cyan-300">
              {label}
            </h4>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-[#23545c] pt-4">
        <Link
          href="/"
          className="text-xs font-medium text-cyan-300 hover:text-cyan-100"
        >
          ← Return to Cerynq analysis
        </Link>
      </div>
    </article>
  );
}

export default function ResourcesPage() {
  return (
    <main className="min-h-screen bg-[#03090c] pb-[32vh] text-[#f5f8ff]">
      <div className="sticky top-0 z-30 border-b border-[#1e454e] bg-[#06171b]/95 backdrop-blur-xl">
        <header className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link
            href="/"
            aria-label="Return to Cerynq home"
            className="flex items-center gap-2.5 font-semibold tracking-tight"
          >
            <Image
              src="/cerynq-logo.png"
              alt="Official Cerynq shield"
              width={52}
              height={52}
              className="h-12 w-12 object-contain mix-blend-screen"
            />
            <BrandWordmark />
            <span className="hidden rounded-full border border-cyan-500/30 px-2 py-1 text-[10px] font-medium text-cyan-300 sm:inline">
              Resources
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <a
              href="https://x.com/Cerynq"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Cerynq on X"
              title="Cerynq on X"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2c5660] bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
            >
              𝕏
            </a>
            <Link
              href="/"
              className="text-xs font-medium text-cyan-300 hover:text-white sm:text-sm"
            >
              ← Back to analysis
            </Link>
          </div>
        </header>
      </div>

      <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
        <section className="relative mt-7 overflow-hidden rounded-2xl border border-[#1d4b57] bg-[#07191d] px-6 py-10 sm:px-10">
          <svg
            aria-hidden="true"
            viewBox="0 0 520 290"
            preserveAspectRatio="xMidYMid slice"
            className="pointer-events-none absolute inset-y-0 right-0 h-full w-[70%] opacity-15"
          >
            <defs>
              <pattern
                id="resources-grid"
                width="36"
                height="36"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M36 0H0V36"
                  stroke="#73b3f9"
                  strokeOpacity="0.22"
                  fill="none"
                />
              </pattern>
            </defs>
            <rect width="520" height="290" fill="url(#resources-grid)" />
            <g stroke="#64b1ff" strokeWidth="1.4" fill="none">
              <path d="M0 260h160l60-95h115l85-90h100" />
              <path d="M170 0v80l90 85h170" />
              <path d="M75 0v115l125 55h320" />
            </g>
            <g fill="#88c7ff">
              <circle cx="220" cy="165" r="4" />
              <circle cx="335" cy="165" r="3" />
              <circle cx="420" cy="75" r="4" />
              <circle cx="200" cy="170" r="3" />
              <circle cx="260" cy="165" r="4" />
            </g>
          </svg>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-cover bg-right opacity-35"
            style={{
              backgroundImage: "url('/cerynq-cover.png')",
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#07191d] via-[#07191d]/95 to-[#07191d]/55" />

          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-400">
              Cerynq Knowledge Base
            </p>
            <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
              Understand the risk. Verify the evidence.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              Clear explanations of controls, evidence sources, and the
              limits of Cerynq Risk Model v0.1 on Arc Mainnet.
            </p>
          </div>
        </section>

        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-[#1e454e] bg-[#07191d] p-5 lg:sticky lg:top-24">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">
              Explore topics
            </p>

            <nav
              aria-label="Resource topics"
              className="flex flex-wrap gap-1.5 lg:flex-col"
            >
              {topics.map((topic) => (
                <a
                  key={topic.id}
                  href={`#${topic.id}`}
                  className="rounded-lg border border-[#2c5660]/70 px-3 py-2 text-xs leading-5 text-slate-300 transition hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-white"
                >
                  {topic.title}
                </a>
              ))}
            </nav>

            <p className="mt-5 border-t border-[#28535c] pt-4 text-xs leading-5 text-slate-400">
              Select any topic to jump to its explanation. The selected
              card will be highlighted.
            </p>
          </aside>

          <div className="min-w-0 space-y-8">
            <div className="rounded-xl border border-[#255460] bg-[#103039] p-5">
              <h2 className="text-sm font-semibold text-cyan-200">
                Interpreting results responsibly
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                <strong>Detected</strong> means a supported signal was found.{" "}
                <strong>Not detected</strong> means no supported signal was
                identified in the available evidence.{" "}
                <strong>Unknown</strong> means evidence was insufficient to
                classify that check.
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                A finding is not a security guarantee, fraud determination,
                or substitute for independent due diligence.
              </p>
            </div>

            <section className="space-y-4" aria-labelledby="assessment-section">
              <h2
                id="assessment-section"
                className="text-lg font-semibold text-white"
              >
                Risk assessment
              </h2>
              {modelTopics.map((topic) => (
                <TopicCard key={topic.id} topic={topic} />
              ))}
            </section>

            <section className="space-y-4" aria-labelledby="controls-section">
              <h2
                id="controls-section"
                className="text-lg font-semibold text-white"
              >
                Security controls
              </h2>
              {controls.map((topic) => (
                <TopicCard key={topic.id} topic={topic} />
              ))}
            </section>

            <section className="space-y-4" aria-labelledby="evidence-section">
              <h2
                id="evidence-section"
                className="text-lg font-semibold text-white"
              >
                Evidence and infrastructure
              </h2>
              {evidence.map((topic) => (
                <TopicCard key={topic.id} topic={topic} />
              ))}
            </section>
          </div>
        </div>

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[#20515c] pt-6 text-xs text-slate-500">
          <span>Cerynq Public Beta · Arc Mainnet · Risk Model v0.1</span>
          <a
            href="https://x.com/Cerynq"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-300 hover:text-cyan-100"
          >
            Cerynq on X ↗
          </a>
        </footer>
      </div>
    </main>
  );
}
