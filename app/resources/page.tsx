
import Link from "next/link";

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

type Topic = (typeof controls)[number];

function TopicCard({ topic }: { topic: Topic }) {
  return (
    <article
      id={topic.id}
      className="scroll-mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
    >
      <h3 className="text-xl font-semibold text-white">
        {topic.title}
      </h3>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {[
          ["What does this mean?", topic.meaning],
          ["Why does it matter?", topic.importance],
          ["What should you check?", topic.check],
          ["Limitations", topic.limitation],
        ].map(([label, value]) => (
          <div key={label}>
            <h4 className="text-sm font-medium text-blue-400">
              {label}
            </h4>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {value}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function ResourcesPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <Link
            href="/"
            className="text-xl font-semibold tracking-tight text-white"
          >
            Cerynq
          </Link>

          <Link
            href="/"
            className="text-sm text-blue-400 transition hover:text-blue-300"
          >
            ← Back to analysis
          </Link>
        </header>

        <section className="py-12">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-400">
            Knowledge Base
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Understand the risk. Verify the evidence.
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-400">
            Learn how Cerynq interprets contract controls,
            identifies technical structures, and communicates
            evidence and limitations on Arc Mainnet.
          </p>

          <div className="mt-8 rounded-xl border border-blue-900/50 bg-blue-950/20 p-5">
            <h2 className="font-medium text-blue-300">
              Understanding detection results
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Detected means a supported signal was found.
              Not detected means no supported signal was
              identified within the available evidence.
              Unknown means the evidence was insufficient
              for a reliable classification.
            </p>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              These results are not security guarantees,
              fraud determinations, or substitutes for
              independent due diligence.
            </p>
          </div>
        </section>

        <nav
          aria-label="Resource topics"
          className="mb-12 flex flex-wrap gap-2"
        >
          {[...controls, ...evidence].map((topic) => (
            <a
              key={topic.id}
              href={`#${topic.id}`}
              className="rounded-full border border-zinc-800 px-4 py-2 text-xs text-zinc-300 transition hover:border-blue-500 hover:text-white"
            >
              {topic.title}
            </a>
          ))}
        </nav>

        <section className="space-y-5">
          <h2 className="pb-2 text-2xl font-semibold">
            Security Controls
          </h2>

          {controls.map((topic) => (
            <TopicCard key={topic.id} topic={topic} />
          ))}
        </section>

        <section className="mt-16 space-y-5">
          <h2 className="pb-2 text-2xl font-semibold">
            Evidence & Infrastructure
          </h2>

          {evidence.map((topic) => (
            <TopicCard key={topic.id} topic={topic} />
          ))}
        </section>

        <footer className="mt-16 border-t border-zinc-800 py-8 text-sm text-zinc-500">
          Cerynq Public Beta — Arc Mainnet
          <p className="mt-2">
            Explainable onchain risk intelligence.
            Findings depend on available evidence and
            supported detection methods.
          </p>
        </footer>
      </div>
    </main>
  );
}
