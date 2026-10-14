
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";

type FindingStatus = "detected" | "not_detected" | "unknown";
type Confidence = "high" | "medium" | "low";
type Verification =
  | "fully_verified"
  | "partially_verified"
  | "verified"
  | "unverified"
  | "unknown";
type Assessment = "complete" | "partial" | "insufficient";
type Operational = "normal" | "degraded" | "limited" | "unavailable";

type Finding = {
  id: string;
  name: string;
  status: FindingStatus;
  severity: "low" | "medium";
  scoreImpact: number;
  confidence: Confidence;
  explanation: string;
  evidence: {
    type: string;
    source: string;
    method?: string;
    methods?: string[];
    interfaceSource?: string | null;
  };
  ownerAddress?: string | null;
  renounced?: boolean | null;
};

type Intelligence = {
  proxyType: string | null;
  proxyResolutionSource:
    | "onchain_bytecode"
    | "blockscout"
    | "sourcify"
    | null;
  implementationAddress: string | null;
  implementationResolutionSource:
    | "onchain_bytecode"
    | "blockscout"
    | "sourcify"
    | null;
  implementationAddresses: string[];
  hasMultipleImplementations: boolean;
  contractName: string | null;
  implementationContractName: string | null;
  abiAvailable: boolean;
  abiProvider: "blockscout" | "sourcify" | null;
  abiSource: "contract" | "implementation" | null;
  abiVerificationStatus: Verification;
  abiEvidenceQuality: "full" | "limited" | "unknown";
  hasOwnerFunction: boolean | null;
  contractVerificationStatus: Verification;
  implementationVerificationStatus: Verification;
};

type Risk = {
  version: "0.1";
  assessmentStatus: Assessment;
  rawScore: number;
  maxScore: number;
  normalizedScore: number;
  riskLevel: "unknown" | "low" | "moderate" | "high" | "critical";
  confidence: Confidence;
  coverage: {
    totalFindings: number;
    knownFindings: number;
    unknownFindings: number;
    percentage: number;
  };
  detectedFindings: string[];
  explanation: string;
};

type ScanResult = {
  ok: true;
  network: string;
  chainId: number;
  address: string;
  operationalStatus: "normal" | "degraded" | "limited";
  isContract: boolean;
  contractType: "contract" | "eoa";
  bytecodeDetected: boolean;
  bytecodeSize: number;
  providers: {
    blockscout: { status: string; usedForAbi: boolean };
    sourcify: { status: string; usedForAbi: boolean };
  };
  intelligence: Intelligence;
  ownership: Finding | null;
  pause: Finding | null;
  blacklist: Finding | null;
  whitelist: Finding | null;
  privileged: Finding | null;
  risk: Risk | null;
};

type ScanResponse =
  | ScanResult
  | {
      ok: false;
      error?: string;
      operationalStatus?: Operational;
    };

const controlTopics: Record<string, string> = {
  A1: "ownership",
  A2: "pause",
  A3: "blacklist",
  A4: "whitelist",
  A5: "privileged",
};

const infoUrl = (topic: string) => `/resources#${topic}`;

const statusText = (value: FindingStatus) =>
  value === "detected"
    ? "Identified"
    : value === "not_detected"
      ? "Not identified"
      : "Unknown";

const statusStyle = (value: FindingStatus) =>
  value === "detected"
    ? "border-amber-500/30 bg-amber-400/10 text-amber-300"
    : value === "unknown"
      ? "border-cyan-500/30 bg-cyan-400/10 text-cyan-300"
      : "border-slate-500/30 bg-slate-400/10 text-slate-300";

const verified = (value: Verification) =>
  value === "fully_verified"
    ? "Fully verified"
    : value === "partially_verified"
      ? "Partially verified"
      : value === "verified"
        ? "Verified (tier not reported)"
        : value === "unverified"
          ? "Unverified"
          : "Unknown";

const methodText = (finding: Finding) =>
  finding.evidence.type === "abi_unavailable"
    ? "ABI unavailable"
    : finding.evidence.methods?.length
      ? finding.evidence.methods.join(", ")
      : finding.evidence.method ?? "No supported methods identified";

const titleCase = (text: string) =>
  text.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());

const proxyText = (value: string | null) =>
  value === "eip1167"
    ? "EIP-1167 minimal proxy"
    : value === "eip1967"
      ? "EIP-1967"
      : value ?? "Not identified";

const sourceText = (value: string | null) =>
  value === "onchain_bytecode"
    ? "Onchain bytecode"
    : value === "blockscout"
      ? "Blockscout"
      : value === "sourcify"
        ? "Sourcify"
        : "Unavailable";

function Glyph({
  name,
  size = 18,
}: {
  name: string;
  size?: number;
}) {
  const paths: Record<string, ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v12h14V9" />
        <path d="M9 21v-8h6v8" />
      </>
    ),
    scan: (
      <>
        <circle cx="10.8" cy="10.8" r="7" />
        <path d="m16 16 5 5" />
      </>
    ),
    pulse: <path d="M2 12h5l3-7 4 14 3-7h5" />,
    nodes: (
      <>
        <circle cx="12" cy="4" r="2" />
        <circle cx="4" cy="20" r="2" />
        <circle cx="20" cy="20" r="2" />
        <path d="m11 6-6 12m8-12 6 12M6 20h12" />
      </>
    ),
    building: (
      <>
        <path d="m3 10 9-6 9 6M5 10h14M6 20V10m4 10V10m4 10V10m4 10V10M3 21h18" />
      </>
    ),
    book: (
      <>
        <path d="M12 6c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1ZM12 6v15" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6M12 7.5h.01" />
      </>
    ),
    arrow: <path d="M4 12h16m-7-7 7 7-7 7" />,
    check: <path d="m4 12 5 5L20 6" />,
    shield: (
      <>
        <path d="m12 2 8 4v6c0 5-3 8-8 10-5-2-8-5-8-10V6l8-4Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    layers: (
      <>
        <path d="m12 2 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 17l9 5 9-5" />
      </>
    ),
    x: <path d="M4 4l16 16M20 4 4 20" />,
  };

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] ?? paths.info}
    </svg>
  );
}

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

function SocialLinks({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "mt-4"}`}>
      <a
        href="https://x.com/Cerynq"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Cerynq on X"
        title="Follow Cerynq on X"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/25 bg-cyan-500/10 text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-500/20"
      >
        <Glyph name="x" size={15} />
      </a>
      <span
        title="Discord community link will be available later"
        className={`${compact ? "hidden" : "inline-flex"} h-9 items-center gap-1.5 rounded-lg border border-slate-600/25 px-2.5 text-[11px] text-slate-500`}
      >
        Discord <span className="text-[9px]">Soon</span>
      </span>
    </div>
  );
}

function Help({ topic, label }: { topic: string; label: string }) {
  return (
    <Link
      href={infoUrl(topic)}
      aria-label={`Learn more about ${label}`}
      title={`Explain ${label} in Resources`}
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-cyan-400 transition hover:bg-cyan-400/15 hover:text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
    >
      <Glyph name="info" size={15} />
    </Link>
  );
}

function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "blue" | "amber";
}) {
  const color =
    tone === "blue"
      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
      : tone === "amber"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : "border-white/10 bg-white/[0.04] text-slate-300";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${color}`}
    >
      {children}
    </span>
  );
}

function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[#1e454e] bg-[#0b1b21]/90 shadow-[0_14px_45px_rgba(0,0,0,0.17)] ${className}`}
    >
      {children}
    </section>
  );
}

function Datum({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-100">
        {value}
      </dd>
    </div>
  );
}

function EvidenceTile({
  title,
  detail,
  result,
  tone,
  topic,
}: {
  title: string;
  detail: string;
  result: string;
  tone: "observed" | "unknown" | "neutral";
  topic: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[#26535b] bg-[#102932]/80 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full ${
            tone === "observed"
              ? "bg-emerald-400/15 text-emerald-300"
              : tone === "unknown"
                ? "bg-cyan-400/15 text-cyan-300"
                : "bg-slate-400/15 text-slate-300"
          }`}
        >
          <Glyph
            name={tone === "observed" ? "check" : "info"}
            size={15}
          />
        </span>
        <Help topic={topic} label={title} />
      </div>
      <p className="mt-3 text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs font-medium text-cyan-200">{result}</p>
      <p className="mt-1.5 text-xs leading-5 text-slate-400">
        {detail}
      </p>
    </div>
  );
}

export default function Home() {
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorOperationalStatus, setErrorOperationalStatus] =
    useState<Operational | null>(null);

  const ARGUS_ADDRESS = "0xeCe5cA8bf9220718E5727754026757512212cb3c";

  async function performScan(targetAddress: string) {
    if (loading) return;

    setLoading(true);
    setError("");
    setErrorOperationalStatus(null);
    setResult(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address: targetAddress.trim() }),
      });

      const data: ScanResponse = await response.json();

      if (!data.ok) {
        setErrorOperationalStatus(data.operationalStatus ?? null);
        setError(data.error ?? "Unable to analyze address.");
        return;
      }

      if (!response.ok) {
        setError("Unable to analyze address.");
        return;
      }

      setResult(data);
      requestAnimationFrame(() =>
        document
          .getElementById("results")
          ?.scrollIntoView({ behavior: "smooth", block: "start" })
      );
    } catch {
      setError("Unable to connect to the Cerynq scan service.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void performScan(address);
  }

  const findings = result
    ? [
        result.ownership,
        result.pause,
        result.blacklist,
        result.whitelist,
        result.privileged,
      ].filter((f): f is Finding => f != null)
    : [];

  const observed = findings.filter((f) => f.status === "detected");
  const unknown = findings.filter((f) => f.status === "unknown");
  const risk = result?.risk;
  const score = risk?.normalizedScore ?? 0;

  const scoreAccent =
    risk?.assessmentStatus !== "complete"
      ? "#34d6e8"
      : risk?.riskLevel === "critical" || risk?.riskLevel === "high"
        ? "#fb7185"
        : risk?.riskLevel === "moderate"
          ? "#fbbf24"
          : "#34d399";

  const riskHeadline =
    risk?.assessmentStatus === "insufficient"
      ? "Insufficient evidence for a risk assessment."
      : unknown.length > 0
        ? "Some contract controls remain unresolved."
        : observed.length > 0
          ? `${observed.length} privileged-control signal${
              observed.length > 1 ? "s" : ""
            } identified.`
          : "No supported privileged-control signals identified.";

  const riskExplanation =
    risk?.assessmentStatus === "partial"
      ? "This score reflects only resolved checks. Unknown results prevent an overall risk classification."
      : risk?.assessmentStatus === "insufficient"
        ? "The available evidence is insufficient to classify the current model checks."
        : risk?.explanation ??
          "The result reflects supported controls, not a guarantee of contract safety.";

  const sourcePresent = result?.intelligence.abiProvider != null;

  return (
    <main className="min-h-screen bg-[#030b0d] text-[#f5f8ff]">
      <div className="mx-auto flex min-h-screen max-w-[1800px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[#183840] bg-[#071114] px-4 py-6 lg:flex">
          <Link
            href="#home"
            className="mb-12 flex items-center gap-2.5 px-2"
          >
            <Image
              src="/cerynq-logo.png"
              alt="Official Cerynq shield"
              width={56}
              height={56}
              className="h-14 w-14 object-contain mix-blend-screen"
              priority
            />
            <BrandWordmark />
          </Link>

          <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Workspace
          </p>

          <nav aria-label="Main navigation" className="space-y-1.5">
            <Link
              href="#home"
              className="flex items-center gap-3 rounded-xl bg-cyan-600/20 px-3 py-3 text-sm font-semibold text-cyan-100"
            >
              <Glyph name="home" /> Home
            </Link>
            <Link
              href="#scan"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-300 transition hover:bg-white/5"
            >
              <Glyph name="scan" /> Scan
            </Link>
            <div
              className="flex items-center gap-3 px-3 py-3 text-sm text-slate-500"
              title="Planned feature"
            >
              <Glyph name="pulse" /> Monitor
              <span className="ml-auto text-[10px]">Soon</span>
            </div>
            <div
              className="flex items-center gap-3 px-3 py-3 text-sm text-slate-500"
              title="Planned feature"
            >
              <Glyph name="nodes" /> Investigations
              <span className="ml-auto text-[10px]">Soon</span>
            </div>
            <a
              href="#roadmap"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-300 transition hover:bg-white/5"
            >
              <Glyph name="building" /> Institutional
            </a>
          </nav>

          <div className="my-6 border-t border-[#183840]" />

          <nav aria-label="Information" className="space-y-1.5">
            <a
              href="#arc"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-300 transition hover:bg-white/5"
            >
              <Glyph name="globe" /> Arc Mainnet
            </a>
            <Link
              href="/resources"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-300 transition hover:bg-white/5"
            >
              <Glyph name="book" /> Resources
            </Link>
          </nav>

          <div className="mt-auto overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#102a31] to-[#061317] p-4">
            <div
              className="relative h-24 overflow-hidden rounded-lg bg-[#071329] bg-cover bg-right"
              style={{
                backgroundImage: "url('/cerynq-cover.png')",
              }}
              role="img"
              aria-label="Cerynq official network artwork"
            />
            <p className="mt-3 text-sm font-semibold">
              Trust through evidence.
            </p>
            <p className="mt-2 text-xs leading-5 text-cyan-100/60">
              Clarity for every onchain decision.
            </p>
            <SocialLinks />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex h-16 items-center justify-between border-b border-[#183840] px-5 lg:hidden">
            <Link href="#home" className="flex items-center gap-2 font-semibold">
              <Image
                src="/cerynq-logo.png"
                alt="Official Cerynq shield"
                width={48}
                height={48}
                className="h-10 w-10 mix-blend-screen"
              />
              <BrandWordmark />
            </Link>
            <div className="flex items-center gap-3">
              <SocialLinks compact />
              <Link
                href="/resources"
                className="text-sm font-medium text-cyan-300"
              >
                Resources
              </Link>
            </div>
          </header>

          <div className="mx-auto w-full max-w-[1500px] px-4 pb-20 pt-5 sm:px-6 lg:px-7">
            <section
              id="home"
              className="relative isolate overflow-hidden rounded-2xl border border-[#1d4b57] bg-[#071a20] px-6 pb-7 pt-8 sm:px-9 sm:pt-9"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-cover bg-right opacity-60"
                style={{
                  backgroundImage: "url('/cerynq-cover.png')",
                }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#061418] via-[#061418]/95 to-[#061418]/30"
              />

              <div className="relative z-10">
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-400">
                  Trust through evidence
                </p>
                <h1 className="mt-4 max-w-5xl text-3xl font-bold tracking-[-0.035em] text-white sm:text-4xl 2xl:text-[48px] 2xl:leading-[1.09]">
                  Onchain Risk Intelligence for Arc
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-cyan-100/75 sm:text-base">
                  Verified evidence. Explainable risk. Clearer decisions
                  for onchain users and teams.
                </p>

                <div id="scan" className="scroll-mt-6 pt-5">
                  <form
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-2 rounded-xl border border-cyan-500/50 bg-[#0a2026]/90 p-2 shadow-[0_0_30px_#00bfd015] sm:flex-row"
                  >
                    <label htmlFor="contract-address" className="sr-only">
                      Arc contract address
                    </label>
                    <input
                      id="contract-address"
                      value={address}
                      disabled={loading}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        setError("");
                      }}
                      placeholder="Paste an Arc smart-contract address (0x...)"
                      className="h-12 min-w-0 flex-1 rounded-lg bg-transparent px-3 font-mono text-sm text-white outline-none placeholder:font-sans placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 px-6 text-sm font-semibold text-white transition hover:from-cyan-500 hover:to-teal-500 disabled:cursor-wait disabled:opacity-60"
                    >
                      {loading ? "Analyzing..." : "Analyze contract"}
                      <Glyph name="arrow" size={16} />
                    </button>
                  </form>

                  {error && (
                    <div
                      role="alert"
                      className="mt-3 rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-200"
                    >
                      {errorOperationalStatus === "unavailable"
                        ? "Arc Mainnet unavailable: "
                        : ""}
                      {error}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-cyan-100/65">
                    <span>Arc Mainnet</span>
                    <span>Risk Model v0.1</span>
                    <span>Explainable evidence</span>
                    <span className="text-cyan-300">Public Beta</span>
                  </div>
                </div>
              </div>
            </section>

            <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_270px]">
              <div className="min-w-0">

                {!result && (
                  <Card className="p-5 sm:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="max-w-xl">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                          Welcome to Cerynq
                        </p>

                        <h2 className="mt-2 text-xl font-semibold text-white">
                          Understand risk before interacting.
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          Explore supported smart-contract controls,
                          review evidence, and understand the limitations
                          behind each result on Arc Mainnet.
                        </p>
                      </div>

                      <Tag tone="blue">Public Beta</Tag>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      {[
                        {
                          title: "1. Analyze",
                          body: "Enter an Arc smart-contract address.",
                          icon: "scan"
                        },
                        {
                          title: "2. Understand",
                          body: "Review supported signals and model coverage.",
                          icon: "shield"
                        },
                        {
                          title: "3. Verify",
                          body: "Explore the supporting evidence in Resources.",
                          icon: "book"
                        }
                      ].map((item) => (
                        <div
                          key={item.title}
                          className="rounded-xl border border-[#25525c] bg-[#102932]/70 p-4"
                        >
                          <span className="text-cyan-300">
                            <Glyph name={item.icon} size={20} />
                          </span>

                          <h3 className="mt-3 text-sm font-semibold text-white">
                            {item.title}
                          </h3>

                          <p className="mt-1 text-xs leading-5 text-slate-400">
                            {item.body}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[#204650] pt-5">
                      <div className="max-w-lg">
                        <p className="text-sm font-semibold text-white">
                          Explore a real analysis: Argus
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          Analyze a real contract using the same Cerynq
                          scanner. Results are retrieved from the live API.
                        </p>

                        <Link
                          href="/resources"
                          className="mt-2 inline-block text-xs font-medium text-cyan-300 hover:text-cyan-100"
                        >
                          Learn how to interpret the results →
                        </Link>
                      </div>

                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setAddress(ARGUS_ADDRESS);
                          void performScan(ARGUS_ADDRESS);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-500/50 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25 disabled:opacity-60"
                      >
                        {loading ? "Analyzing Argus..." : "Analyze example: Argus"}
                        <Glyph name="arrow" size={16} />
                      </button>
                    </div>
                  </Card>
                )}
                {result && (
                  <div
                    id="results"
                    className="mt-0 scroll-mt-4 space-y-4"
                  >
                    <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-600/10 text-cyan-300">
                          <Glyph name="shield" size={23} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-white">
                            {result.intelligence.contractName ??
                              (result.isContract
                                ? "Smart contract"
                                : "Account address")}
                          </p>
                          <p className="break-all font-mono text-[11px] text-slate-400">
                            {result.address}
                          </p>
                        </div>
                      </div>
                      <Tag tone="blue">
                        Arc Mainnet · {result.chainId}
                      </Tag>
                    </Card>

                    {result.operationalStatus !== "normal" && (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-400/10 p-4 text-sm text-amber-200">
                        <strong className="capitalize">
                          {result.operationalStatus} evidence mode.
                        </strong>{" "}
                        {result.operationalStatus === "degraded"
                          ? "Fallback evidence from Sourcify was used because the primary metadata source was unavailable or incomplete."
                          : "ABI evidence was insufficient; some checks may remain Unknown."}
                        {" "}Blockscout:{" "}
                        {titleCase(result.providers.blockscout.status)}
                        {" · "}Sourcify:{" "}
                        {titleCase(result.providers.sourcify.status)}.
                      </div>
                    )}

                    {!result.isContract && (
                      <Card className="p-6">
                        <h2 className="font-semibold">
                          No smart-contract bytecode detected
                        </h2>
                        <p className="mt-2 text-sm text-slate-400">
                          This appears to be an externally owned account.
                          The contract risk model was not applied.
                        </p>
                      </Card>
                    )}

                    {risk && (
                      <Card className="overflow-hidden p-5 sm:p-7">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                              Risk Overview
                            </p>
                            <h2 className="mt-1.5 text-xl font-bold">
                              What the evidence indicates
                            </h2>
                          </div>
                          <Tag
                            tone={
                              risk.assessmentStatus === "complete"
                                ? "amber"
                                : "blue"
                            }
                          >
                            {risk.assessmentStatus === "complete"
                              ? `${titleCase(risk.riskLevel)} signal risk`
                              : risk.assessmentStatus === "partial"
                                ? "Partial assessment"
                                : "Insufficient evidence"}
                          </Tag>
                        </div>

                        <div className="mt-6 grid gap-4 lg:grid-cols-2">
                          <div className="flex flex-col gap-5 rounded-xl border border-[#2d5660] bg-[#0e272f] p-5 sm:flex-row sm:items-center">
                            <div
                              className="relative mx-auto h-32 w-32 shrink-0 rounded-full p-[9px] sm:mx-0"
                              style={{
                                background: `conic-gradient(${scoreAccent} ${
                                  risk.assessmentStatus === "insufficient"
                                    ? 0
                                    : score
                                }%, #334463 0)`,
                              }}
                            >
                              <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#0e272f]">
                                <strong className="text-3xl font-bold">
                                  {risk.assessmentStatus === "insufficient"
                                    ? "N/A"
                                    : score}
                                </strong>
                                <span className="text-xs text-slate-400">
                                  {risk.assessmentStatus === "insufficient"
                                    ? "No score"
                                    : "/ 100"}
                                </span>
                              </div>
                            </div>
                            <div className="min-w-0">
                              <p className="text-base font-semibold leading-snug">
                                {riskHeadline}
                              </p>
                              <p className="mt-2 text-sm leading-6 text-slate-400">
                                {riskExplanation}
                              </p>
                              <p className="mt-3 text-xs text-cyan-300">
                                {risk.assessmentStatus === "complete"
                                  ? "Privileged-control signal score"
                                  : "Observed signal score — incomplete coverage"}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-xl border border-[#2d5660] bg-[#0e272f] p-5">
                            <div className="flex items-center gap-2">
                              <Glyph name="info" size={18} />
                              <h3 className="font-semibold">
                                What to verify next
                              </h3>
                            </div>
                            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                              <li>
                                • Identify who controls administrative permissions.
                              </li>
                              <li>
                                • Review the resolved implementation and its
                                verification status.
                              </li>
                              <li>
                                • Investigate unknown checks before assuming
                                a capability is absent.
                              </li>
                            </ul>
                            <Link
                              href={infoUrl("risk-model")}
                              className="mt-4 inline-block text-sm font-medium text-cyan-300 hover:text-cyan-200"
                            >
                              Understand the risk model →
                            </Link>
                          </div>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#204650] pt-5 sm:grid-cols-4">
                          <Datum
                            label="Model coverage"
                            value={`${risk.coverage.percentage}% (${risk.coverage.knownFindings}/${risk.coverage.totalFindings})`}
                          />
                          <Datum
                            label="Resolved confidence"
                            value={titleCase(risk.confidence)}
                          />
                          <Datum
                            label="Signals identified"
                            value={`${risk.detectedFindings.length}/${risk.coverage.totalFindings}`}
                          />
                          <Datum
                            label="Unknown checks"
                            value={risk.coverage.unknownFindings}
                          />
                        </div>

                        {risk.assessmentStatus !== "complete" && (
                          <p className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-3 text-xs leading-6 text-amber-200/90">
                            This is not a complete risk classification.
                            ABI verification is{" "}
                            {result.intelligence.abiEvidenceQuality};
                            unavailable or limited evidence must not be
                            interpreted as proof of safety.
                          </p>
                        )}
                      </Card>
                    )}

                    {result.isContract && (
                      <Card className="p-5 sm:p-7">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300">
                              Evidence intelligence
                            </p>
                            <h2 className="mt-2 text-xl font-bold">
                              What Cerynq observed
                            </h2>
                            <p className="mt-1.5 text-sm text-slate-400">
                              Evidence from Arc Mainnet and supported
                              metadata sources — not an audit.
                            </p>
                          </div>
                          <Tag>Arc Mainnet</Tag>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          <EvidenceTile
                            title="Contract Verification"
                            topic="verified-contract"
                            result={verified(
                              result.intelligence.contractVerificationStatus
                            )}
                            detail="Source-code verification reported by supported providers."
                            tone={
                              [
                                "fully_verified",
                                "partially_verified",
                                "verified",
                              ].includes(
                                result.intelligence.contractVerificationStatus
                              )
                                ? "observed"
                                : "unknown"
                            }
                          />
                          <EvidenceTile
                            title="Proxy Structure"
                            topic="proxy"
                            result={proxyText(result.intelligence.proxyType)}
                            detail={
                              result.intelligence.proxyResolutionSource
                                ? `Source: ${sourceText(
                                    result.intelligence.proxyResolutionSource
                                  )}`
                                : "No supported proxy type identified."
                            }
                            tone={
                              result.intelligence.proxyType
                                ? "observed"
                                : "neutral"
                            }
                          />
                          <EvidenceTile
                            title="Implementation"
                            topic="implementation"
                            result={
                              result.intelligence.implementationAddress
                                ? "Resolved"
                                : "Not resolved"
                            }
                            detail={
                              result.intelligence.implementationAddress
                                ? `${result.intelligence.implementationAddress.slice(
                                    0,
                                    10
                                  )}…`
                                : "No implementation address resolved."
                            }
                            tone={
                              result.intelligence.implementationAddress
                                ? "observed"
                                : "unknown"
                            }
                          />
                          <EvidenceTile
                            title="Ownership Control"
                            topic="ownership"
                            result={
                              result.ownership
                                ? statusText(result.ownership.status)
                                : "Unavailable"
                            }
                            detail="Recognized owner mechanisms and direct RPC evidence."
                            tone={
                              result.ownership?.status === "detected"
                                ? "observed"
                                : "unknown"
                            }
                          />
                          <EvidenceTile
                            title="Pause Capability"
                            topic="pause"
                            result={
                              result.pause
                                ? statusText(result.pause.status)
                                : "Unavailable"
                            }
                            detail="Supported pause-related ABI signals."
                            tone={
                              result.pause?.status === "detected"
                                ? "observed"
                                : "unknown"
                            }
                          />
                          <EvidenceTile
                            title="Evidence Provenance"
                            topic="provenance"
                            result={
                              sourcePresent
                                ? `Source: ${sourceText(
                                    result.intelligence.abiProvider
                                  )}`
                                : "Source unavailable"
                            }
                            detail={`ABI evidence: ${titleCase(
                              result.intelligence.abiEvidenceQuality
                            )}.`}
                            tone={sourcePresent ? "observed" : "unknown"}
                          />
                        </div>
                      </Card>
                    )}

                    {result.isContract && (
                      <Card className="p-5 sm:p-7">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300">
                              Risk Findings
                            </p>
                            <h2 className="mt-2 text-xl font-bold">
                              Explainable controls
                            </h2>
                            <p className="mt-2 text-sm text-slate-400">
                              Each finding retains its original evidence,
                              classification and limitations.
                            </p>
                          </div>
                          <Link
                            href="/resources"
                            className="text-sm text-cyan-300 hover:text-cyan-200"
                          >
                            Explore Resources →
                          </Link>
                        </div>

                        <div className="mt-5 space-y-3">
                          {findings.map((f) => (
                            <article
                              key={f.id}
                              className="rounded-xl border border-[#25525c] bg-[#10262e] p-4 sm:p-5"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-1">
                                  <h3 className="text-sm font-semibold text-white sm:text-base">
                                    {f.name}
                                  </h3>
                                  {controlTopics[f.id] && (
                                    <Help
                                      topic={controlTopics[f.id]}
                                      label={f.name}
                                    />
                                  )}
                                </div>
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusStyle(
                                    f.status
                                  )}`}
                                >
                                  {statusText(f.status)}
                                </span>
                              </div>

                              <p className="mt-3 text-sm leading-6 text-slate-400">
                                {f.explanation}
                              </p>

                              <details className="group mt-4 border-t border-[#20515c] pt-3">
                                <summary className="cursor-pointer text-xs font-semibold text-cyan-300 hover:text-cyan-200">
                                  View supporting evidence
                                  <span
                                    aria-hidden="true"
                                    className="ml-1 group-open:hidden"
                                  >
                                    +
                                  </span>
                                  <span
                                    aria-hidden="true"
                                    className="ml-1 hidden group-open:inline"
                                  >
                                    −
                                  </span>
                                </summary>

                                <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                  <Datum
                                    label="Evidence confidence"
                                    value={titleCase(f.confidence)}
                                  />
                                  <Datum
                                    label="Score contribution"
                                    value={
                                      f.scoreImpact > 0
                                        ? `+${f.scoreImpact}`
                                        : "0"
                                    }
                                  />
                                  <Datum
                                    label="Methods observed"
                                    value={
                                      <span className="font-mono text-xs">
                                        {methodText(f)}
                                      </span>
                                    }
                                  />
                                  <Datum
                                    label="Evidence source"
                                    value={
                                      <>
                                        <span>{f.evidence.source}</span>
                                        <span className="block text-xs font-normal text-slate-400">
                                          {titleCase(f.evidence.type)}
                                        </span>
                                      </>
                                    }
                                  />

                                  {f.id === "A1" && (
                                    <>
                                      <Datum
                                        label="Owner address"
                                        value={
                                          <span className="break-all font-mono text-xs">
                                            {f.ownerAddress ?? "Unknown"}
                                          </span>
                                        }
                                      />
                                      <Datum
                                        label="Interface source"
                                        value={
                                          f.evidence.interfaceSource ??
                                          "Unavailable"
                                        }
                                      />
                                      <Datum
                                        label="Ownership renounced"
                                        value={
                                          f.renounced === null ||
                                          f.renounced === undefined
                                            ? "Unknown"
                                            : f.renounced
                                              ? "Yes"
                                              : "No"
                                        }
                                      />
                                    </>
                                  )}
                                </dl>
                              </details>
                            </article>
                          ))}
                        </div>
                      </Card>
                    )}

                    <Card className="p-5 sm:p-7">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300">
                            Technical details
                          </p>
                          <h2 className="mt-2 text-lg font-semibold">
                            Traceable contract data
                          </h2>
                        </div>
                        <Help
                          topic="implementation"
                          label="technical implementation details"
                        />
                      </div>

                      <details className="group mt-4 rounded-xl border border-[#20515c] bg-[#10262e] p-4">
                        <summary className="cursor-pointer text-sm font-medium text-cyan-300">
                          View advanced evidence and contract metadata
                        </summary>
                        <dl className="mt-5 grid gap-5 border-t border-[#20515c] pt-5 sm:grid-cols-2 lg:grid-cols-3">
                          <Datum
                            label="Contract name"
                            value={result.intelligence.contractName ?? "Unknown"}
                          />
                          <Datum
                            label="Address"
                            value={
                              <span className="break-all font-mono text-xs">
                                {result.address}
                              </span>
                            }
                          />
                          <Datum label="Chain ID" value={result.chainId} />
                          <Datum
                            label="Address type"
                            value={result.contractType}
                          />
                          <Datum
                            label="Bytecode"
                            value={
                              result.bytecodeDetected
                                ? `${result.bytecodeSize} bytes`
                                : "Not detected"
                            }
                          />
                          <Datum
                            label="Operational status"
                            value={titleCase(result.operationalStatus)}
                          />
                          <Datum
                            label="ABI provider"
                            value={sourceText(
                              result.intelligence.abiProvider
                            )}
                          />
                          <Datum
                            label="ABI source"
                            value={
                              result.intelligence.abiSource ?? "Unavailable"
                            }
                          />
                          <Datum
                            label="ABI quality"
                            value={titleCase(
                              result.intelligence.abiEvidenceQuality
                            )}
                          />
                          <Datum
                            label="ABI verification"
                            value={verified(
                              result.intelligence.abiVerificationStatus
                            )}
                          />
                          <Datum
                            label="Implementation verification"
                            value={verified(
                              result.intelligence
                                .implementationVerificationStatus
                            )}
                          />
                          <Datum
                            label="Implementation name"
                            value={
                              result.intelligence
                                .implementationContractName ?? "Unknown"
                            }
                          />
                          <Datum
                            label="Implementation address"
                            value={
                              <span className="break-all font-mono text-xs">
                                {result.intelligence.implementationAddress ??
                                  "Unresolved"}
                              </span>
                            }
                          />
                          <Datum
                            label="Implementation source"
                            value={sourceText(
                              result.intelligence
                                .implementationResolutionSource
                            )}
                          />
                          <Datum
                            label="Multiple implementations"
                            value={
                              result.intelligence.hasMultipleImplementations
                                ? `Yes (${result.intelligence.implementationAddresses.length} reported)`
                                : "Not reported"
                            }
                          />
                          <Datum
                            label="Owner ABI function"
                            value={
                              result.intelligence.hasOwnerFunction === null
                                ? "Unknown"
                                : result.intelligence.hasOwnerFunction
                                  ? "Present"
                                  : "Not identified"
                            }
                          />
                          <Datum
                            label="Blockscout status"
                            value={titleCase(
                              result.providers.blockscout.status
                            )}
                          />
                          <Datum
                            label="Sourcify status"
                            value={titleCase(
                              result.providers.sourcify.status
                            )}
                          />
                        </dl>

                        {result.intelligence.hasMultipleImplementations && (
                          <p className="mt-5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3 text-xs leading-6 text-cyan-200">
                            Multiple implementations were reported. The beta
                            does not reduce this structure to a single ABI;
                            related checks may remain unresolved.
                          </p>
                        )}
                      </details>
                    </Card>

                    <p className="px-2 text-xs leading-6 text-slate-500">
                      Cerynq provides informational evidence about supported
                      control patterns. Results are not a security audit, a
                      fraud determination or financial, legal or investment advice.
                    </p>
                  </div>
                )}
              </div>

              <section
                id="roadmap"
                className="scroll-mt-6 rounded-2xl border border-[#1e454e] bg-gradient-to-br from-[#0b2026] to-[#061317] p-5 xl:sticky xl:top-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300">
                      Beyond a single scan
                    </p>
                    <h2 className="mt-2 text-xl font-bold">
                      A foundation for broader risk intelligence
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                      The public beta focuses on explainable contract
                      analysis. The capabilities below are part of the
                      product vision, not active features.
                    </p>
                  </div>
                  <Tag tone="blue">Roadmap</Tag>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  {[
                    {
                      name: "Continuous monitoring",
                      desc: "Track changes to supported contracts and risk signals over time.",
                      icon: "pulse",
                    },
                    {
                      name: "Wallet investigations",
                      desc: "Investigate flagged wallets, counterparties and exposure patterns.",
                      icon: "nodes",
                    },
                    {
                      name: "Institutional intelligence",
                      desc: "Explore risk workflows, investigations and future integration APIs.",
                      icon: "building",
                    },
                  ].map((item) => (
                    <div
                      key={item.name}
                      className="rounded-xl border border-[#25525c] bg-[#102932]/70 p-4"
                    >
                      <div className="flex items-center justify-between text-cyan-300">
                        <Glyph name={item.icon} size={22} />
                        <span className="text-[10px] text-slate-400">
                          Planned
                        </span>
                      </div>
                      <h3 className="mt-3 text-sm font-semibold">
                        {item.name}
                      </h3>
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <footer
              id="arc"
              className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-[#204650] pt-5 text-xs text-slate-500"
            >
              <span>
                Cerynq Public Beta · Arc Mainnet · Risk Model v0.1
              </span>
              <div className="flex items-center gap-4">
                <a
                  href="https://x.com/Cerynq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white"
                  aria-label="Cerynq on X"
                >
                  <Glyph name="x" size={14} /> X
                </a>
                <Link
                  href="/resources"
                  className="text-cyan-300 hover:text-cyan-200"
                >
                  Methodology & Resources →
                </Link>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
