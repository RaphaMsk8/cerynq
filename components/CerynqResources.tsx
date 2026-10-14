
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CerynqSidebar,
  CerynqMobileHeader,
} from "./CerynqSidebar";

type Topic = {
  id: string;
  title: string;
  meaning: string;
  importance: string;
  check: string;
  limitation: string;
};

type TopicGroup = {
  id: string;
  title: string;
  description: string;
  accent: "cyan" | "chrome" | "green";
  topics: Topic[];
};

const CHROME =
  "linear-gradient(112deg,#61778b 0%,#f7fcff 14%,#8398ac 27%,#d5e4f0 39%,#ffffff 50%,#70879c 65%,#a9c2d4 83%,#f4faff 100%)";

const groups: TopicGroup[] = [
  {
    id: "assessment",
    title: "Risk assessment",
    description:
      "Understand how the current model communicates findings.",
    accent: "cyan",
    topics: [
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
    ],
  },
  {
    id: "controls",
    title: "Security controls",
    description:
      "Understand the supported contract-control checks.",
    accent: "chrome",
    topics: [
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
    ],
  },
  {
    id: "evidence",
    title: "Evidence and infrastructure",
    description:
      "Explore verification, architecture and source provenance.",
    accent: "green",
    topics: [
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
    ],
  },
];

const topicIds = new Set(
  groups.flatMap((group) =>
    group.topics.map((topic) => topic.id)
  )
);

function TopicCard({
  topic,
  selected,
}: {
  topic: Topic;
  selected: boolean;
}) {
  const details = [
    {
      heading: "What does this mean?",
      value: topic.meaning,
      color: "text-[#e9f3ff]",
      rule: "bg-gradient-to-b from-white via-[#d9e9f5] to-[#67869e]",
    },
    {
      heading: "Why does it matter?",
      value: topic.importance,
      color: "text-[#55d9eb]",
      rule: "bg-[#35cbe5]",
    },
    {
      heading: "What should you check?",
      value: topic.check,
      color: "text-[#39e6b1]",
      rule: "bg-[#2bdaa1]",
    },
    {
      heading: "Limitations",
      value: topic.limitation,
      color: "text-[#ff9d55]",
      rule: "bg-[#ff7829]",
    },
  ];

  return (
    <article
      id={topic.id}
      tabIndex={-1}
      aria-labelledby={`${topic.id}-title`}
      className={`relative scroll-mt-12 overflow-hidden rounded-xl border p-5 outline-none transition-[border-color,background-color,box-shadow] duration-300 sm:p-6 ${
        selected
          ? "border-[#d0e6f4] bg-[#182330] shadow-[inset_0_1px_0_#ffffff2a,0_0_0_1px_#839fa644,0_18px_36px_#00000055]"
          : "border-[#374454] bg-[#111923] hover:border-[#9cafc0]"
      }`}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-[2px] ${
          selected ? "opacity-100" : "opacity-55"
        }`}
        style={{ background: CHROME }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#dcebf5]/[0.055] to-transparent"
      />

      <div className="relative flex flex-wrap items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg p-px shadow-[0_3px_12px_#00000070]"
          style={{ background: CHROME }}
        >
          <span className="flex h-full w-full items-center justify-center rounded-[7px] bg-gradient-to-br from-[#334a5b] via-[#162330] to-[#090f18] shadow-[inset_0_1px_0_#ffffff35]">
            <span
              className={`h-2 w-2 rounded-full ${
                selected
                  ? "bg-[#5df6d0] shadow-[0_0_12px_#34e7bf]"
                  : "bg-[#e5f1fc]"
              }`}
            />
          </span>
        </span>

        <h3
          id={`${topic.id}-title`}
          className="min-w-0 flex-1 text-base font-semibold tracking-tight text-[#f3f7fc] sm:text-lg"
        >
          {topic.title}
        </h3>

        {selected && (
          <span className="rounded-md border border-[#bfcfdc] bg-gradient-to-br from-[#e7f3ff]/20 to-[#657c91]/15 px-2.5 py-1 text-[10px] font-semibold text-[#f1faff] shadow-[inset_0_1px_0_#ffffff42]">
            Selected topic
          </span>
        )}
      </div>

      <div className="relative mt-5 grid gap-x-8 gap-y-5 border-t border-[#4d5e6d]/55 pt-5 md:grid-cols-2">
        {details.map((detail) => (
          <div key={detail.heading}>
            <div className="flex items-center gap-2">
              <span
                className={`h-4 w-[3px] shrink-0 rounded-full ${detail.rule}`}
              />
              <h4
                className={`text-[11px] font-semibold uppercase tracking-[0.09em] ${detail.color}`}
              >
                {detail.heading}
              </h4>
            </div>

            <p className="mt-2 text-[13px] leading-6 text-[#bfccda]">
              {detail.value}
            </p>
          </div>
        ))}
      </div>

      <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#445465]/60 pt-4">
        <span className="text-[11px] text-[#90a2b5]">
          Cerynq Knowledge Base · Public Beta
        </span>

        <Link
          href="/scan"
          className="text-xs font-medium text-[#5bd8e9] hover:text-white"
        >
          Return to Scan →
        </Link>
      </div>
    </article>
  );
}

function ResourceHeroArt() {
  return (
    <div className="relative hidden min-h-[265px] md:block">
      <div className="absolute inset-3 -right-8 overflow-hidden rounded-l-2xl border-y border-l border-[#a9c1d4]/45 bg-[#111e29] shadow-[-15px_0_55px_#00000045,inset_0_1px_0_#f0f8ff30]">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center opacity-85"
          style={{
            backgroundImage: "url('/cerynq-cover.png')",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#111923]/90 via-[#0b1422]/25 to-[#050b13]/10" />

        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: CHROME }}
        />

        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#070c14] to-transparent" />

        <div className="absolute bottom-4 left-5 flex items-center gap-2 rounded-md border border-[#a6bdcb]/45 bg-[#0a121b]/85 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#eef7ff] shadow-[inset_0_1px_0_#ffffff24]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#39e3b1] shadow-[0_0_10px_#35e6ae]" />
          Evidence · Sources · Context
        </div>
      </div>

      <div
        aria-hidden="true"
        className="absolute -left-2 top-7 h-[72%] w-px opacity-85"
        style={{ background: CHROME }}
      />

      <div
        className="absolute right-3 top-0 h-[2px] w-[65%]"
        style={{ background: CHROME }}
      />
    </div>
  );
}

export function CerynqResources() {
  const [activeTopic, setActiveTopic] = useState("risk-model");

  useEffect(() => {
    function synchronizeHash() {
      let hash = "";

      try {
        hash = decodeURIComponent(
          window.location.hash.slice(1)
        );
      } catch {
        return;
      }

      if (!topicIds.has(hash)) return;

      setActiveTopic(hash);

      window.requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({
          block: "center",
          behavior: "auto",
        });
      });
    }

    synchronizeHash();

    window.addEventListener("hashchange", synchronizeHash);
    window.addEventListener("popstate", synchronizeHash);

    return () => {
      window.removeEventListener("hashchange", synchronizeHash);
      window.removeEventListener("popstate", synchronizeHash);
    };
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const center = window.innerHeight / 2;

        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              Math.abs(
                a.boundingClientRect.top +
                  a.boundingClientRect.height / 2 -
                  center
              ) -
              Math.abs(
                b.boundingClientRect.top +
                  b.boundingClientRect.height / 2 -
                  center
              )
          );

        const current = visible[0]?.target.id;

        if (current) setActiveTopic(current);
      },
      {
        rootMargin: "-35% 0px -35% 0px",
        threshold: 0,
      }
    );

    topicIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  function selectTopic(id: string) {
    if (!topicIds.has(id)) return;

    setActiveTopic(id);

    window.history.pushState(null, "", `#${id}`);

    const element = document.getElementById(id);
    if (!element) return;

    element.focus({ preventScroll: true });

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    element.scrollIntoView({
      block: "center",
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }

  return (
    <main className="min-h-screen bg-[#070c14] text-[#f4f7ff]">
      <div className="mx-auto flex min-h-screen max-w-[1850px]">
        <CerynqSidebar />

        <div className="min-w-0 flex-1">
          <CerynqMobileHeader />

          <div className="mx-auto max-w-[1500px] px-4 pb-[30vh] pt-4 sm:px-6">

            {/* HERO — CHROME FRAME / OFFICIAL COVER */}

            <div
              className="rounded-2xl p-px"
              style={{ background: CHROME }}
            >
              <section className="relative grid overflow-hidden rounded-[15px] bg-[#0d1622] md:grid-cols-[minmax(0,1fr)_minmax(300px,0.78fr)]">
                <div className="relative z-10 px-6 py-9 sm:px-9 sm:py-11">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#60ddeb]">
                      Cerynq Knowledge Base
                    </p>

                    <span className="rounded-full border border-[#a2b7c8]/55 bg-[#b9cddd]/10 px-2.5 py-1 text-[10px] font-medium text-[#e9f3fd]">
                      Public Beta
                    </span>
                  </div>

                  <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                    Understand the risk.
                    <span className="mt-1 block bg-gradient-to-r from-[#ffffff] via-[#f7fbff] to-[#8fa9bf] bg-clip-text text-transparent">
                      Verify the evidence.
                    </span>
                  </h1>

                  <p className="mt-4 max-w-xl text-sm leading-7 text-[#c2cfdf]">
                    Explore the controls, evidence sources and
                    limitations behind Cerynq&apos;s analysis on
                    Arc Mainnet.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <span className="rounded-lg border border-[#8396a7]/55 bg-[#182535] px-3 py-2 text-[11px] text-[#f0f6fe] shadow-[inset_0_1px_0_#ffffff20]">
                      10 explained topics
                    </span>

                    <span className="rounded-lg border border-[#25ca99]/45 bg-[#0b392c]/60 px-3 py-2 text-[11px] text-[#58edbc]">
                      Explainable methodology
                    </span>

                    <span className="rounded-lg border border-[#a9becd]/55 bg-[#22313c]/65 px-3 py-2 text-[11px] text-[#edf7ff]">
                      Source transparency
                    </span>
                  </div>
                </div>

                <ResourceHeroArt />
              </section>
            </div>

            {/* NAVIGATION AND KNOWLEDGE CONTENT */}

            <div className="mt-5 grid items-start gap-4 lg:grid-cols-[245px_minmax(0,1fr)]">

              {/* TOPIC NAVIGATION */}

              <aside className="rounded-xl border border-[#465566] bg-[#101822] p-3 lg:sticky lg:top-5">
                <div className="border-b border-[#526272]/60 px-2 pb-3">
                  <p className="bg-gradient-to-r from-white via-[#dbe9f3] to-[#7c96a9] bg-clip-text text-xs font-semibold uppercase tracking-[0.15em] text-transparent">
                    Explore topics
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-[#91a6b9]">
                    Select a topic to view its explanation.
                  </p>
                </div>

                <nav
                  aria-label="Resource topics"
                  className="mt-3 space-y-4"
                >
                  {groups.map((group) => (
                    <div key={group.id}>
                      <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-[#9fadb9]">
                        {group.title}
                      </p>

                      <div className="space-y-1">
                        {group.topics.map((topic) => {
                          const active =
                            activeTopic === topic.id;

                          return (
                            <a
                              key={topic.id}
                              href={`#${topic.id}`}
                              aria-current={
                                active ? "location" : undefined
                              }
                              onClick={(event) => {
                                event.preventDefault();
                                selectTopic(topic.id);
                              }}
                              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] leading-5 transition-colors ${
                                active
                                  ? "border-[#c9dce9] bg-gradient-to-r from-[#2d4351] to-[#16252f] font-semibold text-white shadow-[inset_0_1px_0_#ffffff4d,0_0_15px_#5cbfca22]"
                                  : "border-transparent text-[#afbfcb] hover:border-[#647e8d] hover:bg-[#1b2b37] hover:text-white"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                  active
                                    ? "bg-[#50edb9] shadow-[0_0_9px_#25e2a9]"
                                    : "bg-[#788c9c]"
                                }`}
                              />

                              <span className="min-w-0 flex-1">
                                {topic.title}
                              </span>

                              {active && (
                                <span className="text-[#e8f5ff]">
                                  ›
                                </span>
                              )}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </nav>

                <div className="mt-4 border-t border-[#536575]/55 px-2 pt-3">
                  <p className="text-[11px] leading-5 text-[#91a6b8]">
                    The active topic is highlighted in both
                    the menu and its explanation card.
                  </p>
                </div>
              </aside>

              {/* EXPLANATORY CONTENT */}

              <div className="min-w-0 space-y-7">
                <section className="relative overflow-hidden rounded-xl border border-[#9a5635] bg-[#241b1a] p-5 shadow-[inset_0_1px_0_#ffb37a16]">
                  <span className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-[#ffc18e] via-[#ff792a] to-[#b43b13]" />

                  <p className="text-sm font-semibold text-[#ffac6f]">
                    Interpreting results responsibly
                  </p>

                  <p className="mt-2 text-[13px] leading-6 text-[#ddd1ce]">
                    <strong className="text-white">
                      Detected
                    </strong>{" "}
                    means a supported signal was identified.{" "}
                    <strong className="text-white">
                      Not detected
                    </strong>{" "}
                    means no supported signal was identified in
                    the available evidence.{" "}
                    <strong className="text-white">
                      Unknown
                    </strong>{" "}
                    means evidence was insufficient to classify
                    the check.
                  </p>

                  <p className="mt-2 text-xs leading-5 text-[#c9b7b3]">
                    Findings are not safety guarantees, fraud
                    determinations or substitutes for independent
                    due diligence.
                  </p>
                </section>

                {groups.map((group) => (
                  <section
                    key={group.id}
                    aria-labelledby={`${group.id}-heading`}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-8 w-1 rounded-full ${
                          group.accent === "green"
                            ? "bg-[#2de5ac]"
                            : group.accent === "chrome"
                              ? "bg-gradient-to-b from-[#ffffff] via-[#bad0df] to-[#5a7388]"
                              : "bg-[#3ed1e7]"
                        }`}
                      />

                      <div>
                        <h2
                          id={`${group.id}-heading`}
                          className="text-lg font-semibold text-[#f2f7fd]"
                        >
                          {group.title}
                        </h2>

                        <p className="mt-1 text-xs text-[#98aabb]">
                          {group.description}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {group.topics.map((topic) => (
                        <TopicCard
                          key={topic.id}
                          topic={topic}
                          selected={
                            activeTopic === topic.id
                          }
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[#536879]/65 pt-5 text-xs text-[#91a4b6]">
              <span>
                Cerynq Public Beta · Arc Mainnet · Risk Model v0.1
              </span>

              <Link
                href="/scan"
                className="text-[#61d8e7] hover:text-white"
              >
                Return to scanner →
              </Link>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
