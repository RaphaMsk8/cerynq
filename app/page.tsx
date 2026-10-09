"use client";



import Image from "next/image";

import {

  FormEvent,

  useEffect,

  useId,

  useRef,

  useState,

} from "react";

import type { ReactNode } from "react";



type FindingStatus =

  | "detected"

  | "not_detected"

  | "unknown";



type FindingConfidence =

  | "high"

  | "medium"

  | "low";



type VerificationStatus =

  | "fully_verified"

  | "partially_verified"

  | "verified"

  | "unverified"

  | "unknown";



type AbiEvidenceQuality =

  | "full"

  | "limited"

  | "unknown";



type FindingEvidence = {

  type: string;

  source: string;

  method?: string;

  methods?: string[];

  interfaceSource?: string | null;

};



type BaseFinding = {

  id: string;

  name: string;

  status: FindingStatus;

  severity: "low" | "medium";

  scoreImpact: number;

  confidence: FindingConfidence;

  evidence: FindingEvidence;

  explanation: string;

};



type OwnershipFinding = BaseFinding & {

  id: "A1";

  name: "Active Ownership";

  ownerAddress: string | null;

  renounced: boolean | null;

};



type AssessmentStatus =

  | "complete"

  | "partial"

  | "insufficient";



type RiskResult = {

  version: "0.1";

  assessmentStatus: AssessmentStatus;

  rawScore: number;

  maxScore: number;

  normalizedScore: number;

  riskLevel:

    | "unknown"

    | "low"

    | "moderate"

    | "high"

    | "critical";

  confidence: FindingConfidence;

  coverage: {

    totalFindings: number;

    knownFindings: number;

    unknownFindings: number;

    percentage: number;

  };

  detectedFindings: string[];

  explanation: string;

};



type OperationalStatus =
  | "normal"
  | "degraded"
  | "limited"
  | "unavailable";

type ProviderOperationalStatus =
  | "available"
  | "not_found"
  | "rate_limited"
  | "unauthorized"
  | "timeout"
  | "server_error"
  | "network_error"
  | "configuration_error"
  | "invalid_response"
  | "http_error"
  | "error"
  | "not_used";

type ProviderState = {
  status: ProviderOperationalStatus;
  usedForAbi: boolean;
};

type AbiProvider =
  | "blockscout"
  | "sourcify"
  | null;

type AbiSource =
  | "contract"
  | "implementation"
  | null;

type ResolutionSource =
  | "onchain_bytecode"
  | "blockscout"
  | "sourcify"
  | null;

type IntelligenceResult = {
  proxyType: string | null;
  proxyResolutionSource: ResolutionSource;
  implementationAddress: string | null;
  implementationResolutionSource: ResolutionSource;
  implementationAddresses: string[];
  hasMultipleImplementations: boolean;
  contractName: string | null;
  implementationContractName: string | null;
  abiAvailable: boolean;
  abiProvider: AbiProvider;
  abiSource: AbiSource;
  abiVerificationStatus: VerificationStatus;
  abiEvidenceQuality: AbiEvidenceQuality;
  hasOwnerFunction: boolean | null;
  contractVerificationStatus: VerificationStatus;
  implementationVerificationStatus: VerificationStatus;
};

type ScanResult = {
  ok: true;
  network: string;
  chainId: number;
  address: string;
  operationalStatus:
    | "normal"
    | "degraded"
    | "limited";
  isContract: boolean;
  contractType: "contract" | "eoa";
  bytecodeDetected: boolean;
  bytecodeSize: number;

  providers: {
    blockscout: ProviderState;
    sourcify: ProviderState;
  };

  intelligence: IntelligenceResult;

  ownership: OwnershipFinding | null;
  pause: BaseFinding | null;
  blacklist: BaseFinding | null;
  whitelist: BaseFinding | null;
  privileged: BaseFinding | null;

  risk: RiskResult | null;
};

type ScanErrorResult = {
  ok: false;
  network?: string;
  chainId?: number;
  address?: string;
  operationalStatus?: OperationalStatus;
  error?: string;
};

type ScanResponse =
  | ScanResult
  | ScanErrorResult;


type InfoTooltipProps = {

  title: string;

  children: ReactNode;

};



function InfoTooltip({

  title,

  children,

}: InfoTooltipProps) {

  const [open, setOpen] = useState(false);

  const containerRef =

    useRef<HTMLSpanElement | null>(null);

  const tooltipId = useId();



  useEffect(() => {

    function handlePointerDown(

      event: MouseEvent | TouchEvent

    ) {

      if (

        containerRef.current &&

        !containerRef.current.contains(

          event.target as Node

        )

      ) {

        setOpen(false);

      }

    }



    function handleKeyDown(

      event: KeyboardEvent

    ) {

      if (event.key === "Escape") {

        setOpen(false);

      }

    }



    document.addEventListener(

      "mousedown",

      handlePointerDown

    );



    document.addEventListener(

      "touchstart",

      handlePointerDown

    );



    document.addEventListener(

      "keydown",

      handleKeyDown

    );



    return () => {

      document.removeEventListener(

        "mousedown",

        handlePointerDown

      );



      document.removeEventListener(

        "touchstart",

        handlePointerDown

      );



      document.removeEventListener(

        "keydown",

        handleKeyDown

      );

    };

  }, []);



  return (

    <span

      ref={containerRef}

      className="group relative inline-flex"

      onMouseEnter={() => setOpen(true)}

      onMouseLeave={() => setOpen(false)}

      onBlur={(event) => {

        if (

          !event.currentTarget.contains(

            event.relatedTarget as Node | null

          )

        ) {

          setOpen(false);

        }

      }}

    >

      <button

        type="button"

        aria-label={`Information about ${title}`}

        aria-describedby={

          open ? tooltipId : undefined

        }

        aria-expanded={open}

        onClick={() =>

          setOpen((value) => !value)

        }

        onFocus={() => setOpen(true)}

        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 transition hover:text-zinc-200 focus:text-zinc-200 focus:outline-none"

      >

        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-zinc-700 text-[10px] font-medium">

          i

        </span>

      </button>



      <span

        id={tooltipId}

        role="tooltip"

        className={`absolute left-1/2 top-8 z-50 w-72 max-w-[calc(100vw-3rem)] -translate-x-1/2 rounded-lg border border-zinc-700 bg-zinc-900 p-4 text-left shadow-2xl transition ${

          open

            ? "visible opacity-100"

            : "invisible opacity-0"

        }`}

      >

        <span className="block text-xs font-medium text-zinc-200">

          {title}

        </span>



        <span className="mt-2 block text-xs leading-5 text-zinc-400">

          {children}

        </span>

      </span>

    </span>

  );

}



function MetricLabel({

  label,

  tooltipTitle,

  children,

}: {

  label: string;

  tooltipTitle: string;

  children: ReactNode;

}) {

  return (

    <div className="flex items-center gap-1">

      <span className="text-sm text-zinc-400">

        {label}

      </span>



      <InfoTooltip title={tooltipTitle}>

        {children}

      </InfoTooltip>

    </div>

  );

}



function formatStatus(

  status: FindingStatus

) {

  if (status === "detected") {

    return "Identified";

  }



  if (status === "not_detected") {

    return "Not identified";

  }



  return "Unknown";

}



function formatConfidence(

  confidence?: FindingConfidence

) {

  if (!confidence) {

    return "Unknown";

  }



  return (

    confidence.charAt(0).toUpperCase() +

    confidence.slice(1)

  );

}



function formatVerificationStatus(

  status?: VerificationStatus

) {

  if (status === "fully_verified") {

    return "Fully verified";

  }



  if (status === "partially_verified") {

    return "Partially verified";

  }



  if (status === "verified") {

    return "Verified (tier not reported)";

  }



  if (status === "unverified") {

    return "Unverified";

  }



  return "Unknown";

}



function formatAbiEvidenceQuality(

  quality?: AbiEvidenceQuality

) {

  if (quality === "full") {

    return "Full";

  }



  if (quality === "limited") {

    return "Limited";

  }



  return "Unknown";

}



function formatOperationalStatus(
  status?: OperationalStatus
) {
  if (status === "normal") {
    return "Normal";
  }

  if (status === "degraded") {
    return "Degraded";
  }

  if (status === "limited") {
    return "Limited";
  }

  if (status === "unavailable") {
    return "Unavailable";
  }

  return "Unknown";
}

function formatAbiProvider(
  provider?: AbiProvider
) {
  if (provider === "blockscout") {
    return "Blockscout";
  }

  if (provider === "sourcify") {
    return "Sourcify";
  }

  return "Unavailable";
}

function formatProviderStatus(
  status?: ProviderOperationalStatus
) {
  if (!status) {
    return "Unknown";
  }

  return status
    .replaceAll("_", " ")
    .replace(/^./, (character) =>
      character.toUpperCase()
    );
}

function getOperationalStatusClasses(
  status: Exclude<
    OperationalStatus,
    "unavailable"
  >
) {
  if (status === "degraded") {
    return "border-amber-900/50 bg-amber-950/20 text-amber-200/80";
  }

  if (status === "limited") {
    return "border-sky-900/50 bg-sky-950/20 text-sky-200/80";
  }

  return "border-zinc-800 bg-zinc-950 text-zinc-300";
}


function formatEvidenceType(

  type: string

) {

  if (type === "rpc_call") {

    return "Direct RPC observation";

  }



  if (type === "fully_verified_abi") {

    return "Fully verified ABI";

  }



  if (type === "limited_abi") {

    return "Limited-provenance ABI";

  }



  if (type === "abi_unavailable") {

    return "ABI unavailable";

  }



  return type

    .replaceAll("_", " ")

    .replace(/^./, (character) =>
      character.toUpperCase()
    );

}



function formatRiskLevel(

  riskLevel: RiskResult["riskLevel"]

) {

  if (riskLevel === "low") {

    return "Low";

  }



  if (riskLevel === "moderate") {

    return "Moderate";

  }



  if (riskLevel === "high") {

    return "High";

  }



  if (riskLevel === "critical") {

    return "Critical";

  }



  return "Unknown";

}



function formatProxyType(

  proxyType?: string | null

) {

  if (!proxyType) {

    return "Not identified";

  }



  const normalizedProxyType =
    proxyType.toLowerCase();



  if (normalizedProxyType === "eip1167") {

    return "EIP-1167";

  }



  if (normalizedProxyType === "eip1967") {

    return "EIP-1967";

  }



  return proxyType;

}



function formatResolutionSource(

  source?: ResolutionSource

) {

  if (source === "onchain_bytecode") {

    return "Resolved from onchain bytecode";

  }



  if (source === "blockscout") {

    return "Reported by Blockscout";

  }



  if (source === "sourcify") {

    return "Reported by Sourcify";

  }



  return "Unavailable";

}



function getStatusClasses(

  status: FindingStatus

) {

  if (status === "detected") {

    return "border-amber-800/70 bg-amber-950/30 text-amber-300";

  }



  if (status === "unknown") {

    return "border-sky-900/70 bg-sky-950/20 text-sky-300";

  }



  return "border-zinc-800 bg-zinc-900/50 text-zinc-400";

}



function getRiskClasses(

  riskLevel: RiskResult["riskLevel"]

) {

  if (riskLevel === "critical") {

    return "border-red-800/70 bg-red-950/30 text-red-300";

  }



  if (riskLevel === "high") {

    return "border-orange-800/70 bg-orange-950/30 text-orange-300";

  }



  if (riskLevel === "moderate") {

    return "border-amber-800/70 bg-amber-950/30 text-amber-300";

  }



  return "border-zinc-700 bg-zinc-900 text-zinc-300";

}



function getAssessmentClasses(

  status: AssessmentStatus

) {

  if (status === "partial") {

    return "border-amber-800/70 bg-amber-950/30 text-amber-300";

  }



  if (status === "insufficient") {

    return "border-sky-900/70 bg-sky-950/20 text-sky-300";

  }



  return "border-zinc-700 bg-zinc-900 text-zinc-300";

}



function getEvidenceMethods(

  finding: BaseFinding

) {

  if (

    finding.evidence.type ===

    "abi_unavailable"

  ) {

    return "ABI unavailable";

  }



  if (

    finding.evidence.methods &&

    finding.evidence.methods.length > 0

  ) {

    return finding.evidence.methods.join(", ");

  }



  if (finding.evidence.method) {

    return finding.evidence.method;

  }



  return "No supported methods identified";

}



function getAssessmentLabel(

  risk: RiskResult

) {

  if (

    risk.assessmentStatus === "partial"

  ) {

    return "Partial assessment";

  }



  if (

    risk.assessmentStatus ===

    "insufficient"

  ) {

    return "Insufficient evidence";

  }



  return formatRiskLevel(risk.riskLevel);

}



function getScoreLabel(

  risk: RiskResult

) {

  if (

    risk.assessmentStatus === "partial"

  ) {

    return "Observed signal score";

  }



  return "Privileged-control risk score";

}



export default function Home() {

  const [address, setAddress] =

    useState("");



  const [result, setResult] =

    useState<ScanResult | null>(null);



  const [loading, setLoading] =

    useState(false);



  const [error, setError] =

    useState("");



  const [
    errorOperationalStatus,
    setErrorOperationalStatus,
  ] = useState<OperationalStatus | null>(
    null
  );



  async function handleSubmit(

    event: FormEvent<HTMLFormElement>

  ) {

    event.preventDefault();



    setLoading(true);

    setError("");

    setErrorOperationalStatus(null);

    setResult(null);



    try {

      const response = await fetch(

        "/api/scan",

        {

          method: "POST",

          headers: {

            "Content-Type":

              "application/json",

          },

          body: JSON.stringify({

            address: address.trim(),

          }),

        }

      );



      const data: ScanResponse =

        await response.json();



      if (!data.ok) {
        setErrorOperationalStatus(
          data.operationalStatus ??
            null
        );

        setError(

          data.error ??

            "Unable to analyze address."

        );

        return;

      }



      if (!response.ok) {
        setErrorOperationalStatus(null);

        setError(
          "Unable to analyze address."
        );

        return;

      }



      setResult(data);

    } catch {

      setErrorOperationalStatus(null);

      setError(

        "Unable to connect to the Cerynq scan service."

      );

    } finally {

      setLoading(false);

    }

  }




  const findings: BaseFinding[] =

    result?.ok

      ? [

          result.ownership,

          result.pause,

          result.blacklist,

          result.whitelist,

          result.privileged,

        ].filter(

          (

            finding

          ): finding is BaseFinding =>

            finding !== null &&

            finding !== undefined

        )

      : [];



  return (

    <main className="min-h-screen bg-black text-white">

      <div className="mx-auto w-full max-w-6xl px-6">

        <header className="flex h-24 items-center justify-between border-b border-zinc-900">

          <div className="flex items-center gap-3">

            <Image

              src="/cerynq-logo.png"

              alt="Cerynq"

              width={52}

              height={52}

              priority

              className="h-12 w-12 object-contain sm:h-[52px] sm:w-[52px]"

            />



            <div className="flex items-center gap-3">

              <span className="bg-gradient-to-b from-white via-zinc-200 to-zinc-500 bg-clip-text text-xl font-semibold tracking-wide text-transparent sm:text-2xl">

                Cerynq

              </span>



              <span className="rounded-full border border-cyan-900/70 bg-cyan-950/20 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.16em] text-cyan-400">

                Beta

              </span>

            </div>

          </div>



          <div className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-400">

            Arc Mainnet

          </div>

        </header>



        <div className="mx-auto max-w-4xl pb-20 pt-16">

          <section className="text-center">

            <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">

              Built on Arc

            </p>



            <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">

              Explainable onchain risk

              intelligence.

            </h1>



            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">

              Analyze smart contracts on Arc

              and understand privileged

              controls, proxy structure and

              the evidence behind every risk

              signal.

            </p>

          </section>



          <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-2xl shadow-black/20 sm:p-6">

            <div className="mb-5">

              <p className="text-sm font-medium text-zinc-200">

                Analyze an Arc smart contract

              </p>



              <p className="mt-1 text-sm leading-6 text-zinc-500">

                Enter a contract address to

                inspect supported

                privileged-control signals and

                their evidence.

              </p>

            </div>



            <form

              onSubmit={handleSubmit}

              className="flex flex-col gap-3 sm:flex-row"

            >

              <input

                type="text"

                value={address}

                disabled={loading}

                onChange={(event) => {

                  setAddress(

                    event.target.value

                  );



                  if (result) {

                    setResult(null);

                  }



                  if (error) {

                    setError("");

                    setErrorOperationalStatus(
                      null
                    );

                  }

                }}

                placeholder="0x..."

                className="h-12 flex-1 rounded-lg border border-zinc-800 bg-black px-4 font-mono text-sm text-white outline-none placeholder:text-zinc-700 focus:border-zinc-600 disabled:opacity-60"

              />



              <button

                type="submit"

                disabled={loading}

                className="h-12 rounded-lg bg-white px-7 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"

              >

                {loading

                  ? "Analyzing..."

                  : "Analyze"}

              </button>

            </form>



            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-zinc-900 pt-5 text-xs text-zinc-500">

              <span>

                Proxy-aware analysis

              </span>



              <span>

                Traceable evidence

              </span>



              <span>

                Built on Arc

              </span>

            </div>



            {error && (

              <div className="mt-5 rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-left">

                {errorOperationalStatus ===
                  "unavailable" && (
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-red-300">

                    Arc Mainnet unavailable

                  </p>
                )}

                <p className={`text-sm text-red-300 ${
                  errorOperationalStatus ===
                  "unavailable"
                    ? "mt-2"
                    : ""
                }`}>

                  {error}

                </p>

              </div>

            )}

          </section>



          {result && (

            <div className="mt-8 space-y-6">

              {result.operationalStatus !==
                "normal" && (

                <section
                  className={`rounded-2xl border p-5 text-left ${getOperationalStatusClasses(
                    result.operationalStatus
                  )}`}
                >

                  <p className="text-xs font-medium uppercase tracking-[0.14em]">

                    {formatOperationalStatus(
                      result.operationalStatus
                    )}{" "}
                    evidence mode

                  </p>

                  <p className="mt-2 text-sm leading-6">

                    {result.operationalStatus ===
                    "degraded"
                      ? "The primary metadata source was unavailable or did not provide usable ABI evidence. Cerynq completed this scan with fallback evidence from Sourcify."
                      : "Arc Mainnet remained reachable, but no supported ABI evidence was available from Blockscout or Sourcify. ABI-based checks may remain Unknown."}

                  </p>

                  <p className="mt-2 text-xs opacity-70">

                    Blockscout:{" "}
                    {formatProviderStatus(
                      result.providers
                        .blockscout.status
                    )}{" "}
                    · Sourcify:{" "}
                    {formatProviderStatus(
                      result.providers
                        .sourcify.status
                    )}

                  </p>

                </section>

              )}

              {!result.isContract && (

                <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-left">

                  <p className="text-sm font-medium text-zinc-200">

                    No smart-contract bytecode detected

                  </p>



                  <p className="mt-2 text-sm leading-6 text-zinc-500">

                    This address appears to be

                    an externally owned account,

                    so the current contract risk

                    model was not applied.

                  </p>

                </section>

              )}



              {result.risk && (

                <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-left sm:p-7">

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                    <div>

                      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">

                        Risk Summary

                      </p>



                      <p className="mt-2 text-sm text-zinc-500">

                        Risk Model v

                        {result.risk.version}

                      </p>

                    </div>



                    <span

                      className={`w-fit rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] ${

                        result.risk

                          .assessmentStatus ===

                        "complete"

                          ? getRiskClasses(

                              result.risk

                                .riskLevel

                            )

                          : getAssessmentClasses(

                              result.risk

                                .assessmentStatus

                            )

                      }`}

                    >

                      {getAssessmentLabel(

                        result.risk

                      )}

                    </span>

                  </div>



                  <div className="mt-7 flex flex-col gap-7 border-b border-zinc-800 pb-7 sm:flex-row sm:items-end sm:justify-between">

                    <div>

                      <div className="flex items-center gap-1">

                        <p className="text-sm text-zinc-400">

                          {result.risk

                            .assessmentStatus ===

                          "insufficient"

                            ? "Risk score"

                            : getScoreLabel(

                                result.risk

                              )}

                        </p>



                        <InfoTooltip title="Privileged-control risk score">

                          A weighted score of

                          privileged-control

                          signals identified by

                          Risk Model v0.1,

                          normalized to 0-100.

                          It is not a complete

                          security rating or

                          smart-contract audit.

                        </InfoTooltip>

                      </div>



                      {result.risk

                        .assessmentStatus ===

                      "insufficient" ? (

                        <div className="mt-2 text-5xl font-semibold tracking-tight text-zinc-300">

                          N/A

                        </div>

                      ) : (

                        <div className="mt-2 flex items-end gap-2">

                          <span className="text-6xl font-semibold tracking-tight">

                            {

                              result.risk

                                .normalizedScore

                            }

                          </span>



                          <span className="pb-2 text-lg text-zinc-600">

                            / 100

                          </span>

                        </div>

                      )}

                    </div>



                    <div className="max-w-sm text-sm leading-6 text-zinc-400">

                      {result.risk.explanation}

                    </div>

                  </div>



                  <div className="mt-7 grid grid-cols-1 gap-6 sm:grid-cols-3">

                    <div>

                      <MetricLabel

                        label="Resolved evidence confidence"

                        tooltipTitle="Resolved evidence confidence"

                      >

                        Confidence reflects only

                        findings that Cerynq

                        successfully classified.

                        Unknown checks are excluded

                        from this metric, so read

                        it together with Model

                        coverage. It does not

                        measure contract safety.

                      </MetricLabel>



                      <p className="mt-2 text-lg font-medium text-zinc-100">

                        {formatConfidence(

                          result.risk.confidence

                        )}

                      </p>

                    </div>



                    <div>

                      <MetricLabel

                        label="Model coverage"

                        tooltipTitle="Model coverage"

                      >

                        Shows how many checks in

                        the current Cerynq model

                        returned a known result.

                        100% means all current

                        checks were resolved,

                        not that the entire

                        contract was analyzed.

                      </MetricLabel>



                      <p className="mt-2 text-lg font-medium text-zinc-100">

                        {

                          result.risk.coverage

                            .percentage

                        }

                        %

                      </p>



                      <p className="mt-1 text-xs text-zinc-500">

                        {

                          result.risk.coverage

                            .knownFindings

                        }{" "}

                        of{" "}

                        {

                          result.risk.coverage

                            .totalFindings

                        }{" "}

                        checks resolved

                      </p>

                    </div>



                    <div>

                      <MetricLabel

                        label="Signals identified"

                        tooltipTitle="Signals identified"

                      >

                        The number of current

                        model checks that

                        identified a supported

                        risk signal. It is not a

                        count of all possible

                        contract risks.

                      </MetricLabel>



                      <p className="mt-2 text-lg font-medium text-zinc-100">

                        {

                          result.risk

                            .detectedFindings

                            .length

                        }{" "}

                        /{" "}

                        {

                          result.risk.coverage

                            .totalFindings

                        }

                      </p>

                    </div>

                  </div>



                  {result.risk

                    .assessmentStatus ===

                    "partial" && (

                    <div className="mt-7 rounded-lg border border-amber-900/50 bg-amber-950/20 p-4 text-sm leading-6 text-amber-200/80">

                      <p>

                        One or more current model

                        checks remain Unknown.

                        The displayed score

                        reflects only resolved

                        checks and should not be

                        interpreted as a complete

                        risk classification.

                      </p>



                      {result.intelligence

                        .abiEvidenceQuality ===

                        "limited" && (

                        <p className="mt-2">

                          The analyzed ABI has

                          limited verification

                          provenance, so missing

                          methods are not treated

                          as evidence that a

                          capability is absent.

                        </p>

                      )}

                    </div>

                  )}



                  {result.risk

                    .assessmentStatus ===

                    "insufficient" && (

                    <div className="mt-7 rounded-lg border border-sky-900/50 bg-sky-950/20 p-4 text-sm leading-6 text-sky-200/80">

                      The available evidence was

                      insufficient to resolve

                      the current model checks.

                      No risk level is assigned.

                    </div>

                  )}



                  <div className="mt-7 rounded-lg border border-zinc-800 bg-black/30 p-4">

                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">

                      Beta scope

                    </p>



                    <p className="mt-2 text-xs leading-5 text-zinc-500">

                      Cerynq Beta currently

                      evaluates a defined set of

                      privileged-control signals

                      using Arc Mainnet data,

                      analyzed ABI information

                      and resolved implementation

                      evidence when available.

                      It does not replace a full

                      smart-contract security

                      audit.

                    </p>

                  </div>

                </section>

              )}



              <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-left sm:p-7">

                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                  <div>

                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">

                      Contract Intelligence

                    </p>



                    <h2 className="mt-2 text-xl font-medium">

                      {result.intelligence

                        .contractName ??

                        (result.isContract

                          ? "Smart Contract"

                          : "Externally Owned Account")}

                    </h2>

                  </div>



                  <span className="w-fit rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">

                    {result.network}

                  </span>

                </div>



                <dl className="space-y-5 text-sm">

                  <div>

                    <dt className="text-zinc-500">

                      Address

                    </dt>



                    <dd className="mt-1 break-all font-mono text-zinc-200">

                      {result.address}

                    </dd>

                  </div>



                  <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">

                    <div>

                      <dt className="text-zinc-500">

                        Chain ID

                      </dt>



                      <dd className="mt-1 text-zinc-200">

                        {result.chainId}

                      </dd>

                    </div>



                    <div>

                      <dt className="text-zinc-500">

                        Type

                      </dt>



                      <dd className="mt-1 capitalize text-zinc-200">

                        {result.contractType}

                      </dd>

                    </div>



                    <div>

                      <dt className="text-zinc-500">

                        Bytecode

                      </dt>



                      <dd className="mt-1 text-zinc-200">

                        {result.bytecodeDetected

                          ? "Detected"

                          : "Not detected"}

                      </dd>

                    </div>



                    <div>

                      <dt className="text-zinc-500">

                        Bytecode size

                      </dt>



                      <dd className="mt-1 text-zinc-200">

                        {result.bytecodeSize}{" "}

                        bytes

                      </dd>

                    </div>

                  </div>

                </dl>



                <div className="mt-7 border-t border-zinc-800 pt-7">

                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">

                    Evidence Intelligence

                  </p>



                  <div className="mt-5 grid grid-cols-1 gap-5 text-sm sm:grid-cols-2 lg:grid-cols-3">

                    <div>

                      <p className="text-zinc-500">

                        Operational status

                      </p>



                      <p className="mt-1 text-zinc-200">

                        {formatOperationalStatus(

                          result.operationalStatus

                        )}

                      </p>

                    </div>



                    <div>

                      <p className="text-zinc-500">

                        Contract verification

                      </p>



                      <p className="mt-1 text-zinc-200">

                        {formatVerificationStatus(

                          result.intelligence

                            .contractVerificationStatus

                        )}

                      </p>

                    </div>



                    <div>

                      <p className="text-zinc-500">

                        Proxy

                      </p>



                      <p className="mt-1 text-zinc-200">

                        {formatProxyType(

                          result.intelligence

                            .proxyType

                        )}

                      </p>



                      {result.intelligence

                        .proxyResolutionSource && (

                        <p className="mt-1 text-xs text-zinc-600">

                          {formatResolutionSource(

                            result.intelligence

                              .proxyResolutionSource

                          )}

                        </p>

                      )}

                    </div>



                    <div>

                      <p className="text-zinc-500">

                        ABI provider

                      </p>



                      <p className="mt-1 text-zinc-200">

                        {formatAbiProvider(

                          result.intelligence

                            .abiProvider

                        )}

                      </p>

                    </div>



                    <div>

                      <p className="text-zinc-500">

                        ABI source

                      </p>



                      <p className="mt-1 text-zinc-200">

                        {result.intelligence

                          .abiSource ===

                        "implementation"

                          ? "Implementation"

                          : result.intelligence

                                .abiSource ===

                              "contract"

                            ? "Contract"

                            : "Unavailable"}

                      </p>

                    </div>



                    <div>

                      <p className="text-zinc-500">

                        ABI evidence

                      </p>



                      <p className="mt-1 text-zinc-200">

                        {formatAbiEvidenceQuality(

                          result.intelligence

                            .abiEvidenceQuality

                        )}

                      </p>

                    </div>

                  </div>



                  {result.intelligence

                    .hasMultipleImplementations && (

                    <div className="mt-5 rounded-lg border border-sky-900/50 bg-sky-950/20 p-4">

                      <p className="text-sm font-medium text-sky-200">

                        Multiple implementations reported

                      </p>



                      <p className="mt-2 text-sm leading-6 text-sky-200/70">

                        Available provider metadata

                        reported{" "}

                        {

                          result.intelligence

                            .implementationAddresses

                            .length

                        }{" "}

                        implementations. Cerynq Beta

                        does not reduce a

                        multi-implementation proxy to

                        a single ABI, so ABI-based

                        checks remain unresolved.

                      </p>

                    </div>

                  )}



                  {result.intelligence

                    .implementationAddress && (

                    <div className="mt-5 rounded-lg border border-zinc-900 bg-black/30 p-4">

                      <p className="text-sm text-zinc-500">

                        Analyzed implementation

                      </p>



                      <p className="mt-2 break-all font-mono text-sm text-zinc-200">

                        {

                          result.intelligence

                            .implementationAddress

                        }

                      </p>



                      {result.intelligence

                        .implementationResolutionSource && (

                        <p className="mt-1 text-xs text-zinc-600">

                          Source:{" "}

                          {formatResolutionSource(

                            result.intelligence

                              .implementationResolutionSource

                          )}

                        </p>

                      )}



                      {result.intelligence

                        .implementationContractName && (

                        <p className="mt-2 text-sm text-zinc-500">

                          {

                            result.intelligence

                              .implementationContractName

                          }

                        </p>

                      )}



                      <div className="mt-4 grid gap-4 border-t border-zinc-900 pt-4 text-xs sm:grid-cols-2">

                        <div>

                          <p className="text-zinc-600">

                            Verification

                          </p>



                          <p className="mt-1 text-zinc-400">

                            {formatVerificationStatus(

                              result.intelligence

                                .implementationVerificationStatus

                            )}

                          </p>

                        </div>



                        <div>

                          <p className="text-zinc-600">

                            ABI evidence

                          </p>



                          <p className="mt-1 text-zinc-400">

                            {formatAbiEvidenceQuality(

                              result.intelligence

                                .abiEvidenceQuality

                            )}

                          </p>

                        </div>

                      </div>

                    </div>

                  )}

                </div>

              </section>



              {findings.length > 0 && (

                <section className="space-y-4">

                  <div className="px-1 text-left">

                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">

                      Risk Findings

                    </p>



                    <h2 className="mt-2 text-2xl font-medium">

                      Explainable controls

                    </h2>



                    <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">

                      Review the classification,

                      supporting evidence and

                      limitations behind each

                      current model check.

                    </p>

                  </div>



                  {findings.map(

                    (finding) => (

                      <article

                        key={finding.id}

                        className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-left"

                      >

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                          <div>

                            <h3 className="text-lg font-medium">

                              {finding.name}

                            </h3>



                            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">

                              {

                                finding.explanation

                              }

                            </p>

                          </div>



                          <span

                            className={`w-fit rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-wide ${getStatusClasses(

                              finding.status

                            )}`}

                          >

                            {formatStatus(

                              finding.status

                            )}

                          </span>

                        </div>



                        <div className="mt-6 grid grid-cols-1 gap-5 border-t border-zinc-800 pt-6 text-sm sm:grid-cols-2 lg:grid-cols-4">

                          <div>

                            <MetricLabel

                              label="Evidence confidence"

                              tooltipTitle="Finding evidence confidence"

                            >

                              Indicates how

                              strongly the

                              available evidence

                              supports this

                              specific

                              classification. It

                              does not prove the

                              absence of other

                              mechanisms or

                              behaviors.

                            </MetricLabel>



                            <p className="mt-2 text-zinc-200">

                              {formatConfidence(

                                finding.confidence

                              )}

                            </p>

                          </div>



                          <div>

                            <MetricLabel

                              label="Score contribution"

                              tooltipTitle="Score contribution"

                            >

                              Raw contribution

                              from this signal to

                              Risk Model v0.1.

                              The combined raw

                              score is normalized

                              to a 0-100 scale.

                            </MetricLabel>



                            <p className="mt-2 text-zinc-200">

                              {finding.scoreImpact >

                              0

                                ? `+${finding.scoreImpact}`

                                : "0"}

                            </p>

                          </div>



                          <div>

                            <MetricLabel

                              label="Evidence"

                              tooltipTitle="Evidence"

                            >

                              The observable

                              function or ABI

                              signal used by this

                              detector.

                              Interface-level

                              evidence does not

                              describe every

                              possible runtime

                              behavior.

                            </MetricLabel>



                            <p className="mt-2 break-words font-mono text-zinc-200">

                              {getEvidenceMethods(

                                finding

                              )}

                            </p>

                          </div>



                          <div>

                            <MetricLabel

                              label="Evidence source"

                              tooltipTitle="Evidence source"

                            >

                              Where Cerynq

                              obtained the

                              evidence, such as a

                              resolved

                              implementation ABI

                              or Arc Mainnet RPC.

                            </MetricLabel>



                            <p className="mt-2 text-zinc-200">

                              {

                                finding.evidence

                                  .source

                              }

                            </p>



                            <p className="mt-1 text-xs text-zinc-500">

                              {formatEvidenceType(

                                finding.evidence.type

                              )}

                            </p>

                          </div>

                        </div>



                        {finding.id ===

                          "A1" && (

                          <div className="mt-6 grid gap-5 border-t border-zinc-800 pt-6 text-sm sm:grid-cols-2">

                            <div>

                              <p className="text-zinc-500">

                                Owner address

                              </p>



                              <p className="mt-2 break-all font-mono text-zinc-200">

                                {

                                  (

                                    finding as OwnershipFinding

                                  )

                                    .ownerAddress ??

                                  "Unknown"

                                }

                              </p>

                            </div>



                            {finding.evidence

                              .interfaceSource && (

                              <div>

                                <p className="text-zinc-500">

                                  Interface source

                                </p>



                                <p className="mt-2 text-zinc-200">

                                  {

                                    finding

                                      .evidence

                                      .interfaceSource

                                  }

                                </p>

                              </div>

                            )}

                          </div>

                        )}

                      </article>

                    )

                  )}

                </section>

              )}



              <section className="rounded-xl border border-zinc-900 bg-zinc-950/50 p-5 text-left">

                <p className="text-xs leading-5 text-zinc-500">

                  Cerynq analyzes available

                  Arc Mainnet and external verification

                  evidence to surface supported

                  risk signals. Results are

                  informational and do not

                  constitute a complete security

                  audit or financial, legal or

                  investment advice.

                </p>

              </section>

            </div>

          )}



          <footer className="mt-10 flex flex-col gap-2 border-t border-zinc-900 pt-6 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between">

            <span>

              Cerynq - Explainable onchain risk

              intelligence

            </span>



            <span>

              Arc Mainnet - Risk Model v0.1

            </span>

          </footer>

        </div>

      </div>

    </main>

  );

}