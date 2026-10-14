
"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  CerynqSidebar,
  CerynqMobileHeader,
} from "../../components/CerynqSidebar";

const ARGUS =
  "0xeCe5cA8bf9220718E5727754026757512212cb3c";

type Status = "detected" | "not_detected" | "unknown";
type Confidence = "high" | "medium" | "low";

type Verification =
  | "fully_verified"
  | "partially_verified"
  | "verified"
  | "unverified"
  | "unknown";

type Operation =
  | "normal"
  | "degraded"
  | "limited"
  | "unavailable";

type Finding = {
  id: string;
  name: string;
  status: Status;
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
  proxyResolutionSource: string | null;
  implementationAddress: string | null;
  implementationResolutionSource: string | null;
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
  assessmentStatus: "complete" | "partial" | "insufficient";
  rawScore: number;
  maxScore: number;
  normalizedScore: number;
  riskLevel:
    | "unknown"
    | "low"
    | "moderate"
    | "high"
    | "critical";
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

type Result = {
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
    blockscout: {
      status: string;
      usedForAbi: boolean;
    };
    sourcify: {
      status: string;
      usedForAbi: boolean;
    };
  };
  intelligence: Intelligence;
  ownership: Finding | null;
  pause: Finding | null;
  blacklist: Finding | null;
  whitelist: Finding | null;
  privileged: Finding | null;
  risk: Risk | null;
};

type Response =
  | Result
  | {
      ok: false;
      error?: string;
      operationalStatus?: Operation;
    };

type Evidence = {
  id: string;
  label: string;
  value: string;
  detail: string;
  state: "confirmed" | "neutral" | "unknown" | "caution";
  facts: {
    label: string;
    value: string;
  }[];
};

const pretty = (value?: string | null) =>
  value
    ? value
        .replaceAll("_", " ")
        .replace(/^./, (character) => character.toUpperCase())
    : "Unavailable";

const verification = (value: Verification) =>
  ({
    fully_verified: "Fully verified",
    partially_verified: "Partially verified",
    verified: "Verified (tier unreported)",
    unverified: "Unverified",
    unknown: "Unknown",
  })[value];

const verified = (value: Verification) =>
  value === "fully_verified" ||
  value === "partially_verified" ||
  value === "verified";

const status = (value?: Status) =>
  value === "detected"
    ? "Detected"
    : value === "not_detected"
      ? "Not detected"
      : "Unknown";

const proxy = (value: string | null) =>
  value === "eip1167"
    ? "EIP-1167 minimal proxy"
    : value === "eip1967"
      ? "EIP-1967"
      : value || "Not identified";

const provider = (value?: string | null) =>
  value === "blockscout"
    ? "Blockscout"
    : value === "sourcify"
      ? "Sourcify"
      : value === "onchain_bytecode"
        ? "Onchain bytecode"
        : "Unavailable";

const topicId: Record<string, string> = {
  A1: "ownership",
  A2: "pause",
  A3: "blacklist",
  A4: "whitelist",
  A5: "privileged",
};

type IconName =
  | "scan"
  | "arrow"
  | "check"
  | "info"
  | "copy"
  | "refresh"
  | "shield"
  | "layers"
  | "book"
  | "database"
  | "code";

function Icon({
  name,
  size = 18,
}: {
  name: IconName;
  size?: number;
}) {
  const paths: Record<IconName, ReactNode> = {
    scan: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    arrow: <path d="M4 12h16m-7-7 7 7-7 7" />,
    check: <path d="m4 12 5 5L20 6" />,
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6m0-10h.01" />
      </>
    ),
    copy: (
      <>
        <rect x="8" y="8" width="12" height="12" rx="2" />
        <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 10a8 8 0 1 0-2 7" />
        <path d="M20 4v6h-6" />
      </>
    ),
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
    book: (
      <path d="M12 6c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1ZM12 6v15" />
    ),
    database: (
      <>
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v14c0 4 18 4 18 0V5M3 12c0 4 18 4 18 0" />
      </>
    ),
    code: (
      <path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 3l-4 18" />
    ),
  };

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 rounded-xl border border-[#2a456d] bg-[linear-gradient(145deg,#0d1c36,#08142b_85%)] shadow-[inset_0_1px_0_#b9e5ff0d,0_14px_32px_#00071930] ${className}`}
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
      <dt className="text-[10px] uppercase tracking-[.1em] text-[#8da8c9]">
        {label}
      </dt>
      <dd className="mt-1 break-all text-xs font-medium text-[#e2efff]">
        {value}
      </dd>
    </div>
  );
}

function Help({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  return (
    <Link
      href={`/resources#${id}`}
      aria-label={`Learn about ${label}`}
      title={`Learn about ${label}`}
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#66ccff] hover:bg-cyan-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
    >
      <Icon name="info" size={14} />
    </Link>
  );
}

function EvidenceCard({
  item,
  selected,
  toggle,
}: {
  item: Evidence;
  selected: boolean;
  toggle: () => void;
}) {
  const dot =
    item.state === "confirmed"
      ? "border-[#26b692]/55 bg-[#0c453e]/70 text-[#41edb7] shadow-[0_0_16px_#17c99524]"
      : item.state === "caution"
        ? "border-[#e3a05b]/55 bg-[#51311c]/75 text-[#ffb76d] shadow-[0_0_14px_#f59e0b19]"
        : item.state === "unknown"
          ? "border-[#45536f] bg-[#26364d]/75 text-[#a2b0ca]"
          : "border-[#3b6487] bg-[#183c58] text-[#92d3ff]";

  return (
    <div
      className={`relative rounded-lg border bg-[linear-gradient(165deg,#102943,#0b1c35)] transition-all ${
        selected
          ? "border-[#52d8dd] ring-1 ring-cyan-300/20"
          : "border-[#254663] hover:border-[#4b8fbd]"
      }`}
    >
      <button
        type="button"
        aria-expanded={selected}
        onClick={toggle}
        className="flex min-h-[138px] w-full flex-col items-start p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
      >
        <span
          className={`mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full border ${dot}`}
        >
          <Icon
            name={
              item.state === "confirmed"
                ? "check"
                : "info"
            }
            size={17}
          />
        </span>

        <strong className="pr-3 text-[12px] leading-4 text-[#f6fbff]">
          {item.label}
        </strong>

        <span className="mt-1 text-[11px] font-medium leading-4 text-[#91ddff]">
          {item.value}
        </span>

        <span className="mt-1 text-[10px] leading-4 text-[#93abc6]">
          {item.detail}
        </span>
      </button>

      <span className="absolute right-1 top-1">
        <Help id={item.id} label={item.label} />
      </span>
    </div>
  );
}

export default function ScanPage() {
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorOperation, setErrorOperation] =
    useState<Operation | null>(null);

  const [openEvidence, setOpenEvidence] =
    useState<string | null>(null);

  const [copied, setCopied] = useState(false);

  const autoStarted = useRef(false);
  const busy = useRef(false);

  const performScan = useCallback(async (target: string) => {
    if (busy.current) return;

    busy.current = true;
    setLoading(true);
    setError("");
    setErrorOperation(null);
    setResult(null);
    setOpenEvidence(null);
    setCopied(false);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: target.trim(),
        }),
      });

      const data: Response = await response.json();

      if (!data.ok) {
        setError(
          data.error ?? "Unable to analyze this address."
        );
        setErrorOperation(
          data.operationalStatus ?? null
        );
        return;
      }

      if (!response.ok) {
        setError("Unable to analyze this address.");
        return;
      }

      setResult(data);
    } catch {
      setError(
        "Unable to connect to the Cerynq scan service."
      );
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoStarted.current) return;

    const requested = new URLSearchParams(
      window.location.search
    ).get("example");

    if (requested !== ARGUS) return;

    autoStarted.current = true;
    queueMicrotask(() => {
      setAddress(ARGUS);
      void performScan(ARGUS);
    });
  }, [performScan]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void performScan(address);
  }

  async function copyAddress() {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result.address);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const findings = result
    ? [
        result.ownership,
        result.pause,
        result.blacklist,
        result.whitelist,
        result.privileged,
      ].filter((finding): finding is Finding => finding != null)
    : [];

  const risk = result?.risk;

  const evidence: Evidence[] = result
    ? [
        {
          id: "verified-contract",
          label: "Contract verification",
          value: verification(
            result.intelligence.contractVerificationStatus
          ),
          detail: "Source verification status",
          state: verified(
            result.intelligence.contractVerificationStatus
          )
            ? "confirmed"
            : "unknown",
          facts: [
            {
              label: "Verification",
              value: verification(
                result.intelligence.contractVerificationStatus
              ),
            },
            {
              label: "ABI verification",
              value: verification(
                result.intelligence.abiVerificationStatus
              ),
            },
            {
              label: "ABI provider",
              value: provider(
                result.intelligence.abiProvider
              ),
            },
          ],
        },
        {
          id: "proxy",
          label: "Proxy structure",
          value: proxy(
            result.intelligence.proxyType
          ),
          detail: "Recognized contract structure",
          state: result.intelligence.proxyType
            ? "confirmed"
            : "neutral",
          facts: [
            {
              label: "Proxy",
              value: proxy(
                result.intelligence.proxyType
              ),
            },
            {
              label: "Resolution source",
              value: provider(
                result.intelligence.proxyResolutionSource
              ),
            },
          ],
        },
        {
          id: "implementation",
          label: "Implementation",
          value: result.intelligence.implementationAddress
            ? "Resolved"
            : "Unresolved",
          detail: "Underlying logic address",
          state: result.intelligence.implementationAddress
            ? "confirmed"
            : "unknown",
          facts: [
            {
              label: "Address",
              value:
                result.intelligence.implementationAddress ??
                "Unavailable",
            },
            {
              label: "Resolution source",
              value: provider(
                result.intelligence.implementationResolutionSource
              ),
            },
            {
              label: "Verification",
              value: verification(
                result.intelligence.implementationVerificationStatus
              ),
            },
          ],
        },
        {
          id: "ownership",
          label: "Ownership control",
          value: status(
            result.ownership?.status
          ),
          detail: "Supported ownership signal",

          state:
            result.ownership?.status === "detected"
              ? "caution"
              : result.ownership?.status === "not_detected"
                ? "neutral"
                : "unknown",

          facts: [
            {
              label: "Owner address",
              value:
                result.ownership?.ownerAddress ??
                "Unknown",
            },
            {
              label: "Evidence source",
              value:
                result.ownership?.evidence.source ??
                "Unavailable",
            },
            {
              label: "Confidence",
              value: pretty(
                result.ownership?.confidence
              ),
            },
          ],
        },
        {
          id: "pause",
          label: "Pause capability",
          value: status(
            result.pause?.status
          ),
          detail: "Supported pause signal",
          state:
            result.pause?.status === "detected"
              ? "confirmed"
              : result.pause?.status === "not_detected"
                ? "neutral"
                : "unknown",
          facts: [
            {
              label: "Status",
              value: status(
                result.pause?.status
              ),
            },
            {
              label: "Evidence source",
              value:
                result.pause?.evidence.source ??
                "Unavailable",
            },
            {
              label: "Confidence",
              value: pretty(
                result.pause?.confidence
              ),
            },
          ],
        },
        {
          id: "provenance",
          label: "Evidence provenance",
          value: result.intelligence.abiProvider
            ? "Source available"
            : "Unavailable",
          detail: "ABI origin and limitations",
          state: result.intelligence.abiProvider
            ? "confirmed"
            : "unknown",
          facts: [
            {
              label: "ABI provider",
              value: provider(
                result.intelligence.abiProvider
              ),
            },
            {
              label: "ABI source",
              value: pretty(
                result.intelligence.abiSource
              ),
            },
            {
              label: "ABI quality",
              value: pretty(
                result.intelligence.abiEvidenceQuality
              ),
            },
            {
              label: "Blockscout",
              value: pretty(
                result.providers.blockscout.status
              ),
            },
            {
              label: "Sourcify",
              value: pretty(
                result.providers.sourcify.status
              ),
            },
          ],
        },
      ]
    : [];

  const opened = evidence.find(
    (item) => item.id === openEvidence
  );

  const score = Math.min(
    100,
    Math.max(0, risk?.normalizedScore ?? 0)
  );

  const accent =
    risk?.assessmentStatus === "complete"
      ? risk.riskLevel === "high" ||
        risk.riskLevel === "critical"
        ? "#fb7373"
        : risk.riskLevel === "moderate"
          ? "#ffad43"
          : "#42dfae"
      : "#ffa53b";

  return (
    <main className="min-h-screen bg-[#030918] text-[#f4f8ff]">
      <div className="mx-auto flex min-h-screen max-w-[1850px]">
        <CerynqSidebar />

        <div className="min-w-0 flex-1">
          <CerynqMobileHeader />

          <div className="mx-auto max-w-[1590px] px-3 pb-12 sm:px-5">

            {/* SCANNER HERO */}

            <section className="relative isolate -mx-3 overflow-hidden border-b border-[#24598e] bg-[#06152c] px-5 pb-5 pt-8 sm:-mx-5 sm:px-7">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 w-[78%] bg-no-repeat opacity-90 [background-size:auto_230%] [background-position:right_center]"
                style={{
                  backgroundImage:
                    "url('/cerynq-cover.png')",
                }}
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#061126_0%,#061126f2_34%,#07152bd1_56%,#07152b26_100%)]"
              />

              <div className="relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-[.25em] text-[#4bdaef]">
                  Trust through evidence
                </p>

                <h1 className="mt-2 max-w-[880px] text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl 2xl:text-[36px]">
                  Onchain Risk Intelligence for Arc
                </h1>

                <p className="mt-2 text-xs leading-6 text-[#c6d6ec] sm:text-sm">
                  Verified evidence. Explainable risk.
                  Decision support, not a security verdict.
                </p>

                <form
                  id="scan"
                  onSubmit={submit}
                  className="mt-5 flex flex-col gap-2 rounded-lg border border-[#3b92fc] bg-[#071d40]/95 p-1.5 shadow-[0_0_0_1px_#50baff24,0_0_24px_#2274ef30] sm:flex-row"
                >
                  <label
                    htmlFor="scan-address"
                    className="sr-only"
                  >
                    Arc Mainnet smart-contract address
                  </label>

                  <input
                    id="scan-address"
                    value={address}
                    disabled={loading}
                    onChange={(event) => {
                      setAddress(event.target.value);
                      setError("");
                    }}
                    placeholder="Paste a smart-contract address on Arc Mainnet (0x...)"
                    className="h-10 min-w-0 flex-1 rounded-md bg-[#0b2143]/70 px-3 font-mono text-xs text-white outline-none placeholder:font-sans placeholder:text-[#91b1d9] focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-60"
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-[#2d7df7] px-6 text-sm font-semibold text-white shadow-[0_2px_18px_#2768ff45] transition hover:bg-[#5099ff] disabled:opacity-60"
                  >
                    {loading ? "Analyzing..." : "Analyze"}
                    <Icon name="arrow" size={16} />
                  </button>
                </form>

                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#adc7e7]">
                  <span>Arc Mainnet</span>
                  <span>•</span>
                  <span>Contract controls</span>
                  <span>•</span>
                  <span>Risk Model v0.1</span>
                  <span>•</span>

                  <Link
                    href="/resources"
                    className="text-[#7bdcff] hover:text-white"
                  >
                    Methodology ↗
                  </Link>
                </div>

                {error && (
                  <p
                    role="alert"
                    className="mt-3 rounded-lg border border-[#ff855b]/40 bg-[#4c261e]/70 p-3 text-xs text-[#ffd2c0]"
                  >
                    {errorOperation === "unavailable"
                      ? "Arc Mainnet unavailable: "
                      : ""}
                    {error}
                  </p>
                )}
              </div>
            </section>

            {/* DASHBOARD */}

            <div className="mt-4">
              <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-w-0 space-y-3">

                  {/* BEFORE FIRST SCAN */}

                  {!result && (
                    <Panel className="p-5 sm:p-6">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[.19em] text-[#4bd7ee]">
                            Contract scanner
                          </p>

                          <h2 className="mt-2 text-xl font-semibold text-white">
                            Understand the evidence before
                            interacting.
                          </h2>
                        </div>

                        <span className="rounded-full border border-[#2c5c91] px-3 py-1 text-[10px] text-[#afcee9]">
                          Arc Mainnet
                        </span>
                      </div>

                      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#b1c6e0]">
                        Supported checks make contract control
                        signals visible. Unknown results remain
                        unknown, and scores are not security
                        guarantees.
                      </p>

                      <div className="mt-5 grid gap-2 sm:grid-cols-3">
                        {[
                          {
                            n: "01",
                            title: "Analyze",
                            text: "Paste a contract address.",
                          },
                          {
                            n: "02",
                            title: "Understand",
                            text: "Review evidence and coverage.",
                          },
                          {
                            n: "03",
                            title: "Verify",
                            text: "Inspect provenance and limitations.",
                          },
                        ].map((item) => (
                          <div
                            key={item.n}
                            className="rounded-lg border border-[#2d507e] bg-[#11274a] p-4"
                          >
                            <span className="text-xs font-bold text-[#54d9ed]">
                              {item.n}
                            </span>

                            <h3 className="mt-2 text-sm font-semibold">
                              {item.title}
                            </h3>

                            <p className="mt-1 text-xs leading-5 text-[#abc3df]">
                              {item.text}
                            </p>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setAddress(ARGUS);
                          void performScan(ARGUS);
                        }}
                        className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[#3c92db] bg-[#104072]/70 px-4 py-3 text-xs font-semibold text-white hover:bg-[#1e568f] disabled:opacity-60"
                      >
                        Analyze example: Argus
                        <Icon name="arrow" size={15} />
                      </button>
                    </Panel>
                  )}

                  {/* LIVE RESULTS */}

                  {result && (
                    <div
                      id="results"
                      className="space-y-3"
                    >

                      {/* CONTRACT HEADER */}

                      <Panel className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#366de0] bg-[#103b83] text-2xl font-extrabold text-[#a9dfff] shadow-[0_0_14px_#2255b737]"
                            aria-label="Contract name initial, not an official project logo"
                          >
                            {(
                              result.intelligence.contractName ??
                              (result.isContract
                                ? "Smart contract"
                                : "Account")
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <p className="text-lg font-bold">
                              {result.intelligence.contractName ??
                                (result.isContract
                                  ? "Smart contract"
                                  : "Account")}
                            </p>

                            <div className="flex items-center gap-2">
                              <span className="max-w-[260px] truncate font-mono text-[11px] text-[#9fb4d1]">
                                {result.address}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  void copyAddress()
                                }
                                title={
                                  copied
                                    ? "Copied"
                                    : "Copy address"
                                }
                                aria-label="Copy address"
                                className="text-[#80d7ff]"
                              >
                                <Icon
                                  name={
                                    copied
                                      ? "check"
                                      : "copy"
                                  }
                                  size={14}
                                />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="rounded-md border border-[#31496f] bg-[#101d35] px-2 py-1 text-[10px] text-[#a8c7e7]">
                            Arc Mainnet
                          </span>

                          <button
                            type="button"
                            disabled={loading}
                            onClick={() =>
                              void performScan(
                                result.address
                              )
                            }
                            className="flex items-center gap-2 rounded-md border border-[#4281c6] px-3 py-2 text-xs text-[#c1e6ff] hover:bg-[#163b68] disabled:opacity-50"
                          >
                            <Icon
                              name="refresh"
                              size={14}
                            />
                            Re-scan
                          </button>
                        </div>
                      </Panel>

                      {/* PROVIDER STATUS */}

                      {result.operationalStatus !== "normal" && (
                        <p className="rounded-lg border border-[#ec9a50]/40 bg-[#3a271c]/45 p-3 text-xs text-[#f8c89a]">
                          {pretty(result.operationalStatus)}
                          {" "}evidence mode. Some checks may
                          be unknown. Blockscout:{" "}
                          {pretty(
                            result.providers.blockscout.status
                          )}
                          {" · "}Sourcify:{" "}
                          {pretty(
                            result.providers.sourcify.status
                          )}
                          .
                        </p>
                      )}

                      {!result.isContract && (
                        <Panel className="p-4">
                          <h2 className="font-semibold">
                            No smart-contract bytecode detected
                          </h2>

                          <p className="mt-2 text-xs text-[#aabdd5]">
                            This appears to be an EOA.
                            Contract Risk Model v0.1 was
                            not applied.
                          </p>
                        </Panel>
                      )}

                      {/* RISK OVERVIEW */}

                      {risk && (
                        <Panel className="p-3 sm:p-4">
                          <div className="grid gap-2 lg:grid-cols-2">
                            <div className="rounded-lg border border-[#2e507b] bg-[#0e2341] p-3">
                              <div className="flex items-center gap-2 text-sm font-semibold">
                                Risk Overview

                                <Help
                                  id="risk-model"
                                  label="Risk Model"
                                />
                              </div>

                              <div className="mt-3 flex items-center gap-4">
                                <div
                                  className="h-[118px] w-[118px] shrink-0 rounded-full p-[10px] shadow-[0_0_26px_#ff9f3425]"
                                  style={{
                                    background: `conic-gradient(${accent} ${
                                      risk.assessmentStatus ===
                                      "insufficient"
                                        ? 0
                                        : score
                                    }%, #354860 0)`,
                                  }}
                                >
                                  <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#0a1c38]">
                                    <strong className="text-[28px] leading-none text-white">
                                      {risk.assessmentStatus ===
                                      "insufficient"
                                        ? "N/A"
                                        : score}
                                    </strong>

                                    <span className="mt-1 text-[10px] text-[#a9b9d0]">
                                      / 100
                                    </span>
                                  </div>
                                </div>

                                <div className="min-w-0">
                                  <h3 className="text-[13px] font-semibold leading-5">
                                    {risk.assessmentStatus ===
                                    "partial"
                                      ? "Some controls remain unresolved."
                                      : risk.assessmentStatus ===
                                          "insufficient"
                                        ? "Insufficient evidence for classification."
                                        : `${risk.detectedFindings.length} supported signals identified.`}
                                  </h3>

                                  <p className="mt-2 text-[11px] leading-5 text-[#b0c3df]">
                                    {risk.assessmentStatus ===
                                    "partial"
                                      ? `Only ${risk.coverage.knownFindings} of ${risk.coverage.totalFindings} modeled checks resolved. ${risk.coverage.unknownFindings} unknown. This score is not an overall risk classification.`
                                      : risk.explanation}
                                  </p>

                                  <span
                                    className={`mt-2 inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold ${
                                      risk.assessmentStatus ===
                                      "complete"
                                        ? "border-[#3a6591] bg-[#153151] text-[#b5dcf7]"
                                        : "border-[#bc872d]/60 bg-[#603e16]/45 text-[#ffca75]"
                                    }`}
                                  >
                                    {risk.assessmentStatus ===
                                    "complete"
                                      ? `${pretty(
                                          risk.riskLevel
                                        )} signal level`
                                      : risk.assessmentStatus ===
                                          "partial"
                                        ? "Partial assessment"
                                        : "Insufficient evidence"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-lg border border-[#2e507b] bg-[#0e2341] p-3">
                              <h3 className="flex items-center gap-2 text-sm font-semibold text-[#85d6ff]">
                                <Icon
                                  name="info"
                                  size={16}
                                />
                                What this means
                              </h3>

                              <ul className="mt-3 space-y-3 text-[11px] leading-4 text-[#c6d6ec]">
                                <li className="flex gap-2">
                                  <span className="text-[#7accff]">
                                    ◆
                                  </span>
                                  Review who controls administrative
                                  permissions
                                </li>

                                <li className="flex gap-2">
                                  <span className="text-[#7accff]">
                                    ◆
                                  </span>
                                  Check contract and implementation
                                  verification
                                </li>

                                <li className="flex gap-2">
                                  <span className="text-[#7accff]">
                                    ◆
                                  </span>
                                  Examine unknown and unresolved
                                  checks
                                </li>

                                <li className="flex gap-2 text-[#ffb46e]">
                                  <span>▲</span>
                                  Never treat a score as a
                                  safety verdict
                                </li>
                              </ul>
                            </div>
                          </div>

                          <details className="mt-3 border-t border-[#294867] pt-3 text-xs">
                            <summary className="cursor-pointer font-medium text-[#80daff]">
                              Assessment coverage and limitations
                            </summary>

                            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                              <Datum
                                label="Coverage"
                                value={`${risk.coverage.percentage}% (${risk.coverage.knownFindings}/${risk.coverage.totalFindings})`}
                              />

                              <Datum
                                label="Confidence"
                                value={pretty(
                                  risk.confidence
                                )}
                              />

                              <Datum
                                label="Detected"
                                value={
                                  risk.detectedFindings.length
                                }
                              />

                              <Datum
                                label="Unknown"
                                value={
                                  risk.coverage.unknownFindings
                                }
                              />
                            </dl>

                            <p className="mt-3 text-[#ffca92]">
                              Partial assessments do not
                              establish overall safety.
                            </p>
                          </details>
                        </Panel>
                      )}

                      {/* EVIDENCE */}

                      {result.isContract && (
                        <Panel className="p-3">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="rounded-md border border-[#238c73]/40 bg-[#0e443f] p-1 text-[#40e8b0]">
                                <Icon
                                  name="shield"
                                  size={17}
                                />
                              </span>

                              <h2 className="text-sm font-semibold">
                                Evidence
                              </h2>

                              <span className="hidden text-[11px] text-[#9eb7d6] sm:inline">
                                Real observations with traceable
                                limitations
                              </span>
                            </div>

                            <span className="rounded-full border border-[#23654d] bg-[#0c342e] px-2 py-1 text-[10px] text-[#4be9b8]">
                              {evidence.length} evidence categories
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 2xl:grid-cols-6">
                            {evidence.map((item) => (
                              <EvidenceCard
                                key={item.id}
                                item={item}
                                selected={
                                  openEvidence === item.id
                                }
                                toggle={() =>
                                  setOpenEvidence(
                                    openEvidence === item.id
                                      ? null
                                      : item.id
                                  )
                                }
                              />
                            ))}
                          </div>

                          {opened && (
                            <div className="mt-3 rounded-lg border border-[#3f929a] bg-[#0d2941] p-4">
                              <div className="flex items-center justify-between">
                                <h3 className="font-semibold">
                                  {opened.label}
                                </h3>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenEvidence(null)
                                  }
                                  className="rounded border border-[#477395] px-2 py-1 text-xs"
                                >
                                  Close
                                </button>
                              </div>

                              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                                {opened.facts.map((fact) => (
                                  <Datum
                                    key={fact.label}
                                    label={fact.label}
                                    value={fact.value}
                                  />
                                ))}
                              </dl>

                              <p className="mt-3 text-xs text-[#adc2d9]">
                                Observed signals are not a
                                complete security audit.
                              </p>

                              <Link
                                href={`/resources#${opened.id}`}
                                className="mt-3 inline-block text-xs text-[#64d9f0] hover:text-white"
                              >
                                Read evidence limitations →
                              </Link>
                            </div>
                          )}
                        </Panel>
                      )}

                      {/* TECHNICAL DETAILS */}

                      <Panel className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="flex items-center gap-2 text-sm font-semibold">
                            <Icon
                              name="code"
                              size={16}
                            />
                            Technical Details
                          </h2>

                          <span className="text-[10px] text-[#8cb6dc]">
                            Risk Model v
                            {risk?.version ?? "0.1"}
                          </span>
                        </div>

                        <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-[#274261] pt-3 sm:grid-cols-4">
                          <Datum
                            label="Network"
                            value={result.network}
                          />

                          <Datum
                            label="Source"
                            value={`${provider(
                              result.intelligence.abiProvider
                            )} / RPC`}
                          />

                          <Datum
                            label="Proxy type"
                            value={proxy(
                              result.intelligence.proxyType
                            )}
                          />

                          <Datum
                            label="Verification"
                            value={verification(
                              result.intelligence.contractVerificationStatus
                            )}
                          />
                        </dl>

                        <details className="mt-3 border-t border-[#274261] pt-3">
                          <summary className="cursor-pointer text-xs text-[#80d4fb]">
                            Show all technical metadata
                          </summary>

                          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                            <Datum
                              label="Address"
                              value={result.address}
                            />

                            <Datum
                              label="Chain ID"
                              value={result.chainId}
                            />

                            <Datum
                              label="Type"
                              value={result.contractType}
                            />

                            <Datum
                              label="Bytecode"
                              value={`${result.bytecodeSize} bytes`}
                            />

                            <Datum
                              label="ABI provider"
                              value={provider(
                                result.intelligence.abiProvider
                              )}
                            />

                            <Datum
                              label="ABI source"
                              value={pretty(
                                result.intelligence.abiSource
                              )}
                            />

                            <Datum
                              label="ABI quality"
                              value={pretty(
                                result.intelligence.abiEvidenceQuality
                              )}
                            />

                            <Datum
                              label="ABI verification"
                              value={verification(
                                result.intelligence.abiVerificationStatus
                              )}
                            />

                            <Datum
                              label="Implementation"
                              value={
                                result.intelligence
                                  .implementationAddress ??
                                "Unresolved"
                              }
                            />

                            <Datum
                              label="Implementation verification"
                              value={verification(
                                result.intelligence.implementationVerificationStatus
                              )}
                            />

                            <Datum
                              label="Implementation resolution"
                              value={provider(
                                result.intelligence.implementationResolutionSource
                              )}
                            />

                            <Datum
                              label="Multiple implementations"
                              value={
                                result.intelligence
                                  .hasMultipleImplementations
                                  ? `${result.intelligence.implementationAddresses.length} reported`
                                  : "Not reported"
                              }
                            />

                            <Datum
                              label="Blockscout"
                              value={pretty(
                                result.providers.blockscout.status
                              )}
                            />

                            <Datum
                              label="Sourcify"
                              value={pretty(
                                result.providers.sourcify.status
                              )}
                            />
                          </dl>
                        </details>
                      </Panel>

                      {/* RISK FINDINGS */}

                      {result.isContract && (
                        <Panel className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#7ac8ff]">
                                Risk Findings
                              </p>

                              <h2 className="mt-1 text-lg font-semibold">
                                Explainable controls
                              </h2>
                            </div>

                            <Link
                              href="/resources"
                              className="text-xs text-[#74dafa]"
                            >
                              Resources ↗
                            </Link>
                          </div>

                          <p className="mt-2 text-xs text-[#9db3cd]">
                            All known and unknown detector
                            outcomes are shown below.
                          </p>

                          <div className="mt-4 space-y-2">
                            {findings.map((finding) => (
                              <article
                                key={finding.id}
                                className="rounded-lg border border-[#2a4c70] bg-[#0d2440] p-3"
                              >
                                <div className="flex justify-between gap-3">
                                  <h3 className="flex items-center gap-1 text-sm font-semibold">
                                    {finding.name}

                                    <Help
                                      id={
                                        topicId[finding.id] ??
                                        "risk-model"
                                      }
                                      label={finding.name}
                                    />
                                  </h3>

                                  <span
                                    className={`shrink-0 rounded-md border px-2 py-1 text-[10px] ${
                                      finding.status ===
                                      "detected"
                                        ? "border-[#b47d32] bg-[#49301e] text-[#ffbf75]"
                                        : "border-[#36536f] bg-[#152b46] text-[#adc7e0]"
                                    }`}
                                  >
                                    {status(
                                      finding.status
                                    )}
                                  </span>
                                </div>

                                <p className="mt-2 text-xs leading-5 text-[#bdcce0]">
                                  {finding.explanation}
                                </p>

                                <details className="mt-3 border-t border-[#304a65] pt-2">
                                  <summary className="cursor-pointer text-xs text-[#79d4ff]">
                                    View supporting evidence
                                  </summary>

                                  <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                                    <Datum
                                      label="Confidence"
                                      value={pretty(
                                        finding.confidence
                                      )}
                                    />

                                    <Datum
                                      label="Impact"
                                      value={
                                        finding.scoreImpact
                                      }
                                    />

                                    <Datum
                                      label="Evidence source"
                                      value={
                                        finding.evidence.source
                                      }
                                    />

                                    <Datum
                                      label="Evidence type"
                                      value={pretty(
                                        finding.evidence.type
                                      )}
                                    />

                                    <Datum
                                      label="Methods"
                                      value={
                                        finding.evidence.methods?.join(
                                          ", "
                                        ) ??
                                        finding.evidence.method ??
                                        "Not identified"
                                      }
                                    />

                                    {finding.id === "A1" && (
                                      <>
                                        <Datum
                                          label="Owner address"
                                          value={
                                            finding.ownerAddress ??
                                            "Unknown"
                                          }
                                        />

                                        <Datum
                                          label="Interface source"
                                          value={
                                            finding.evidence
                                              .interfaceSource ??
                                            "Unavailable"
                                          }
                                        />
                                      </>
                                    )}
                                  </dl>
                                </details>
                              </article>
                            ))}
                          </div>
                        </Panel>
                      )}

                      <p className="px-2 text-[11px] leading-5 text-[#8ca4c2]">
                        Cerynq reports supported onchain risk
                        signals, not independent security audits,
                        fraud verdicts or investment advice.
                      </p>
                    </div>
                  )}
                </div>

                {/* ANALYSIS CONTEXT */}

                <aside
                  id="scan-context"
                  className="overflow-hidden rounded-xl border border-[#29528a] bg-[linear-gradient(165deg,#0b2044,#07162c_85%)] p-3 shadow-[inset_0_1px_0_#c5ebff12,0_0_24px_#1258ba1b] xl:sticky xl:top-3"
                >
                  <h2 className="text-sm font-semibold text-white">
                    Analysis context
                  </h2>

                  <p className="mt-2 text-xs leading-5 text-[#adc8e6]">
                    Understand the limits of a single
                    contract scan.
                  </p>

                  <div className="mt-4 space-y-2">

                    {/* MODEL COVERAGE */}

                    <div className="rounded-lg border border-[#2a5278] bg-[#102846] p-3">
                      <div className="flex items-center gap-2 text-[#65d6ff]">
                        <Icon
                          name="layers"
                          size={18}
                        />

                        <strong className="text-xs text-white">
                          Model coverage
                        </strong>
                      </div>

                      <p className="mt-2 text-xs text-[#a9c2dc]">
                        {risk
                          ? `${risk.coverage.knownFindings} of ${risk.coverage.totalFindings} checks resolved`
                          : "Available after an analysis"}
                      </p>
                    </div>

                    {/* UNKNOWN CHECKS */}

                    <div className="rounded-lg border border-[#2a5278] bg-[#102846] p-3">
                      <div className="flex items-center gap-2 text-[#ffb66d]">
                        <Icon
                          name="info"
                          size={18}
                        />

                        <strong className="text-xs text-white">
                          Unknown checks
                        </strong>
                      </div>

                      <p className="mt-2 text-xs text-[#a9c2dc]">
                        {risk
                          ? `${risk.coverage.unknownFindings} unresolved`
                          : "Missing evidence is not a safety signal"}
                      </p>
                    </div>

                    {/* EVIDENCE SOURCES */}

                    <div className="rounded-lg border border-[#2a5278] bg-[#102846] p-3">
                      <div className="flex items-center gap-2 text-[#42e2aa]">
                        <Icon
                          name="database"
                          size={18}
                        />

                        <strong className="text-xs text-white">
                          Evidence sources
                        </strong>
                      </div>

                      <p className="mt-2 text-xs leading-5 text-[#a9c2dc]">
                        {result
                          ? `ABI: ${provider(
                              result.intelligence.abiProvider
                            )} · Blockscout: ${pretty(
                              result.providers.blockscout.status
                            )} · Sourcify: ${pretty(
                              result.providers.sourcify.status
                            )}`
                          : "Arc Mainnet RPC, Blockscout and Sourcify when available"}
                      </p>
                    </div>

                    {/* INTERPRETATION */}

                    <div className="rounded-lg border border-[#2a5278] bg-[#102846] p-3">
                      <div className="flex items-center gap-2 text-[#94c9ff]">
                        <Icon
                          name="shield"
                          size={18}
                        />

                        <strong className="text-xs text-white">
                          Interpretation
                        </strong>
                      </div>

                      <p className="mt-2 text-xs leading-5 text-[#a9c2dc]">
                        {risk
                          ? risk.assessmentStatus ===
                            "complete"
                            ? "All modeled checks resolved; this is still not a security audit."
                            : "Assessment incomplete: do not infer an overall risk level."
                          : "Detected, Not detected and Unknown describe supported evidence."}
                      </p>
                    </div>
                  </div>

                  {/* METHODOLOGY LINK */}

                  <div className="relative mt-4 overflow-hidden rounded-lg border border-[#2a618f] bg-[#06182e] px-4 py-5">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 right-0 w-[90%] bg-cover bg-right opacity-35"
                      style={{
                        backgroundImage:
                          "url('/cerynq-cover.png')",
                      }}
                    />

                    <p className="relative max-w-[190px] text-xs font-medium leading-5 text-[#d4efff]">
                      Traceable evidence. Clear limitations.
                    </p>

                    <Link
                      href="/resources"
                      className="relative mt-3 inline-flex items-center gap-1 text-xs text-[#81dbff] hover:text-white"
                    >
                      Explore Resources
                      <Icon
                        name="arrow"
                        size={13}
                      />
                    </Link>
                  </div>
                </aside>
              </div>
            </div>

            {/* FOOTER */}

            <footer className="mt-5 flex flex-wrap justify-between gap-2 border-t border-[#213b5f] pt-4 text-[11px] text-[#819dbb]">
              <span>
                Cerynq · Arc Mainnet · Risk Model v0.1
              </span>

              <Link
                href="/resources"
                className="text-[#82d9ff]"
              >
                Methodology & Resources →
              </Link>
            </footer>

          </div>
        </div>
      </div>
    </main>
  );
}
