type AbiItem = {
  type?: string;
  name?: string;
  stateMutability?: string;
  inputs?: Array<{
    name?: string;
    type?: string;
  }>;
  outputs?: Array<{
    name?: string;
    type?: string;
  }>;
};

type AbiSource = "contract" | "implementation" | null;

export type PauseFinding = {
  id: "A2";
  name: "Pause Capability";
  status: "detected" | "not_detected" | "unknown";
  severity: "low" | "medium";
  scoreImpact: number;
  confidence: "high" | "medium" | "low";
  evidence: {
    type: "verified_abi";
    methods: string[];
    source:
      | "Arc Explorer Contract ABI"
      | "Arc Explorer Implementation ABI"
      | "Arc Explorer ABI";
  };
  explanation: string;
};

type DetectPauseOptions = {
  abi: AbiItem[] | null;
  abiSource: AbiSource;
};

function getEvidenceSource(
  abiSource: AbiSource
): PauseFinding["evidence"]["source"] {
  if (abiSource === "implementation") {
    return "Arc Explorer Implementation ABI";
  }

  if (abiSource === "contract") {
    return "Arc Explorer Contract ABI";
  }

  return "Arc Explorer ABI";
}

export function detectPauseCapability(
  options: DetectPauseOptions
): PauseFinding {
  const { abi, abiSource } = options;

  const evidenceSource = getEvidenceSource(abiSource);

  if (abi === null) {
    return {
      id: "A2",
      name: "Pause Capability",
      status: "unknown",
      severity: "low",
      scoreImpact: 0,
      confidence: "low",
      evidence: {
        type: "verified_abi",
        methods: [],
        source: evidenceSource,
      },
      explanation:
        "Cerynq could not inspect a verified ABI for pause-related controls.",
    };
  }

  const pauseMethods = abi
    .filter(
      (item) =>
        item.type === "function" &&
        typeof item.name === "string" &&
        ["pause", "unpause", "paused"].includes(item.name)
    )
    .map((item) => item.name as string);

  const uniqueMethods = [...new Set(pauseMethods)];

  const hasPauseControl =
    uniqueMethods.includes("pause") ||
    uniqueMethods.includes("unpause");

  if (hasPauseControl) {
    return {
      id: "A2",
      name: "Pause Capability",
      status: "detected",
      severity: "medium",
      scoreImpact: 5,
      confidence: "high",
      evidence: {
        type: "verified_abi",
        methods: uniqueMethods,
        source: evidenceSource,
      },
      explanation:
        "The verified ABI exposes pause-related administrative controls that may allow privileged actors to halt or resume contract activity.",
    };
  }

  return {
    id: "A2",
    name: "Pause Capability",
    status: "not_detected",
    severity: "low",
    scoreImpact: 0,
    confidence: "high",
    evidence: {
      type: "verified_abi",
      methods: uniqueMethods,
      source: evidenceSource,
    },
    explanation:
      "The verified ABI does not expose standard pause() or unpause() administrative controls.",
  };
}