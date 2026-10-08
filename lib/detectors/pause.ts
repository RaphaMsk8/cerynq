import {
  getAbiEvidenceSource,
  type ArcAbiEvidenceQuality,
  type ArcAbiEvidenceSource,
  type ArcAbiItem,
  type ArcAbiSource,
  type ArcEvidenceProvider,
} from "@/lib/arc/evidence";

export type PauseFinding = {
  id: "A2";
  name: "Pause Capability";

  status:
    | "detected"
    | "not_detected"
    | "unknown";

  severity:
    | "low"
    | "medium";

  scoreImpact: number;

  confidence:
    | "high"
    | "medium"
    | "low";

  evidence: {
    type:
      | "fully_verified_abi"
      | "limited_abi"
      | "abi_unavailable";

    methods: string[];

    source:
      ArcAbiEvidenceSource;
  };

  explanation: string;
};

type DetectPauseOptions = {
  abi:
    | ArcAbiItem[]
    | null;

  abiProvider:
    ArcEvidenceProvider;

  abiSource:
    ArcAbiSource;

  abiEvidenceQuality:
    ArcAbiEvidenceQuality;
};

function getEvidenceType(
  abi: ArcAbiItem[] | null,
  abiEvidenceQuality:
    ArcAbiEvidenceQuality
): PauseFinding["evidence"]["type"] {
  if (abi === null) {
    return "abi_unavailable";
  }

  if (
    abiEvidenceQuality === "full"
  ) {
    return "fully_verified_abi";
  }

  return "limited_abi";
}

function isReadOnly(
  item: ArcAbiItem
): boolean {
  return (
    item.stateMutability === "view" ||
    item.stateMutability === "pure"
  );
}

export function detectPauseCapability(
  options: DetectPauseOptions
): PauseFinding {
  const {
    abi,
    abiProvider,
    abiSource,
    abiEvidenceQuality,
  } = options;

  const evidenceSource =
    getAbiEvidenceSource(
      abiProvider,
      abiSource
    );

  const evidenceType =
    getEvidenceType(
      abi,
      abiEvidenceQuality
    );

  if (abi === null) {
    return {
      id: "A2",
      name: "Pause Capability",
      status: "unknown",
      severity: "low",
      scoreImpact: 0,
      confidence: "low",

      evidence: {
        type: evidenceType,
        methods: [],
        source: evidenceSource,
      },

      explanation:
        "Cerynq could not inspect an analyzed ABI for pause-related signals, so this check could not be classified.",
    };
  }

  const relevantFunctions =
    abi.filter(
      (item) =>
        item.type === "function" &&
        typeof item.name === "string" &&
        [
          "pause",
          "unpause",
          "paused",
        ].includes(
          item.name
        )
    );

  const evidenceMethods = [
    ...new Set(
      relevantFunctions.map(
        (item) =>
          item.name as string
      )
    ),
  ];

  const stateChangingControls =
    relevantFunctions.filter(
      (item) =>
        typeof item.name ===
          "string" &&
        [
          "pause",
          "unpause",
        ].includes(
          item.name
        ) &&
        !isReadOnly(item)
    );

  // Positive interface evidence remains meaningful with
  // limited ABI provenance, but confidence is reduced.
  if (
    stateChangingControls.length > 0
  ) {
    return {
      id: "A2",
      name: "Pause Capability",
      status: "detected",
      severity: "medium",
      scoreImpact: 5,

      confidence:
        abiEvidenceQuality === "full"
          ? "high"
          : "medium",

      evidence: {
        type: evidenceType,
        methods: evidenceMethods,
        source: evidenceSource,
      },

      explanation:
        abiEvidenceQuality === "full"
          ? "The analyzed ABI exposes supported state-changing pause() and/or unpause() functions. These functions may support halting or resuming contract activity; caller restrictions are not determined by this detector."
          : "The available ABI exposes supported state-changing pause() and/or unpause() functions. This is a positive interface signal, but ABI provenance is limited, so caller restrictions and complete contract behavior are not determined by this detector.",
    };
  }

  // Absence from limited-provenance ABI data is not enough
  // to classify a capability as absent.
  if (
    abiEvidenceQuality !== "full"
  ) {
    return {
      id: "A2",
      name: "Pause Capability",
      status: "unknown",
      severity: "low",
      scoreImpact: 0,
      confidence: "medium",

      evidence: {
        type: evidenceType,
        methods: evidenceMethods,
        source: evidenceSource,
      },

      explanation:
        evidenceMethods.length > 0
          ? "Pause-related interface signals were present in the available ABI, but no supported state-changing pause() or unpause() method was identified. Because the ABI provenance is limited, Cerynq cannot reliably classify the absence of pause capability."
          : "No supported pause-related methods were identified in the available ABI. Because the ABI provenance is limited, absence from this ABI is not sufficient evidence to conclude that pause capability is not present.",
    };
  }

  if (
    evidenceMethods.length > 0
  ) {
    return {
      id: "A2",
      name: "Pause Capability",
      status: "not_detected",
      severity: "low",
      scoreImpact: 0,
      confidence: "high",

      evidence: {
        type: evidenceType,
        methods: evidenceMethods,
        source: evidenceSource,
      },

      explanation:
        "Pause-related interface signals were identified, but no supported state-changing pause() or unpause() methods were identified in the fully verified analyzed ABI.",
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
      type: evidenceType,
      methods: [],
      source: evidenceSource,
    },

    explanation:
      "No supported state-changing pause() or unpause() methods were identified in the fully verified analyzed ABI.",
  };
}