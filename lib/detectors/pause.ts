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

type AbiSource =
  | "contract"
  | "implementation"
  | null;

export type PauseFinding = {
  id: "A2";
  name: "Pause Capability";
  status:
    | "detected"
    | "not_detected"
    | "unknown";
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

function isReadOnly(item: AbiItem): boolean {
  return (
    item.stateMutability === "view" ||
    item.stateMutability === "pure"
  );
}

export function detectPauseCapability(
  options: DetectPauseOptions
): PauseFinding {
  const { abi, abiSource } = options;

  const evidenceSource =
    getEvidenceSource(abiSource);

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
        "Cerynq could not inspect an analyzed ABI for pause-related signals, so this check could not be classified.",
    };
  }

  const relevantFunctions = abi.filter(
    (item) =>
      item.type === "function" &&
      typeof item.name === "string" &&
      ["pause", "unpause", "paused"].includes(
        item.name
      )
  );

  const evidenceMethods = [
    ...new Set(
      relevantFunctions.map(
        (item) => item.name as string
      )
    ),
  ];

  const stateChangingControls =
    relevantFunctions.filter(
      (item) =>
        typeof item.name === "string" &&
        ["pause", "unpause"].includes(
          item.name
        ) &&
        !isReadOnly(item)
    );

  if (stateChangingControls.length > 0) {
    return {
      id: "A2",
      name: "Pause Capability",
      status: "detected",
      severity: "medium",
      scoreImpact: 5,
      confidence: "high",
      evidence: {
        type: "verified_abi",
        methods: evidenceMethods,
        source: evidenceSource,
      },
      explanation:
        "The analyzed ABI exposes supported state-changing pause() and/or unpause() functions. These functions may support halting or resuming contract activity; caller restrictions are not determined by this detector.",
    };
  }

  if (evidenceMethods.length > 0) {
    return {
      id: "A2",
      name: "Pause Capability",
      status: "not_detected",
      severity: "low",
      scoreImpact: 0,
      confidence: "high",
      evidence: {
        type: "verified_abi",
        methods: evidenceMethods,
        source: evidenceSource,
      },
      explanation:
        "Pause-related interface signals were identified, but no supported state-changing pause() or unpause() methods were identified in the analyzed ABI.",
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
      methods: [],
      source: evidenceSource,
    },
    explanation:
      "No supported state-changing pause() or unpause() methods were identified in the analyzed ABI.",
  };
}