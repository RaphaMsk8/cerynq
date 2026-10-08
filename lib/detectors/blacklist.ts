import {
  getAbiEvidenceSource,
  type ArcAbiEvidenceQuality,
  type ArcAbiEvidenceSource,
  type ArcAbiItem,
  type ArcAbiSource,
  type ArcEvidenceProvider,
} from "@/lib/arc/evidence";

export type BlacklistFinding = {
  id: "A3";
  name: "Blacklist / Freeze Capability";

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

type DetectBlacklistOptions = {
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
): BlacklistFinding["evidence"]["type"] {
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

const administrativeMethodNames =
  new Set([
    "blacklist",
    "unblacklist",
    "addblacklist",
    "removeblacklist",
    "freeze",
    "unfreeze",
    "freezeaccount",
    "unfreezeaccount",
    "setfrozen",
    "setblacklist",
    "setblacklisted",
  ]);

const readOnlyIndicatorNames =
  new Set([
    "isblacklisted",
    "blacklisted",
    "getblackliststatus",
    "frozen",
    "isfrozen",
  ]);

function normalizeMethodName(
  name: string
): string {
  return name.toLowerCase();
}

function isReadOnly(
  item: ArcAbiItem
): boolean {
  return (
    item.stateMutability === "view" ||
    item.stateMutability === "pure"
  );
}

export function detectBlacklistCapability(
  options: DetectBlacklistOptions
): BlacklistFinding {
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
      id: "A3",
      name:
        "Blacklist / Freeze Capability",
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
        "Cerynq could not inspect an analyzed ABI for blacklist or freeze-related signals, so this check could not be classified.",
    };
  }

  const relevantFunctions =
    abi.filter((item) => {
      if (
        item.type !== "function" ||
        typeof item.name !== "string"
      ) {
        return false;
      }

      const normalizedName =
        normalizeMethodName(
          item.name
        );

      return (
        administrativeMethodNames.has(
          normalizedName
        ) ||
        readOnlyIndicatorNames.has(
          normalizedName
        )
      );
    });

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
      (item) => {
        if (
          typeof item.name !==
          "string"
        ) {
          return false;
        }

        const normalizedName =
          normalizeMethodName(
            item.name
          );

        return (
          administrativeMethodNames.has(
            normalizedName
          ) &&
          !isReadOnly(item)
        );
      }
    );

  // Positive interface evidence remains meaningful with
  // limited ABI provenance, but confidence is reduced.
  if (
    stateChangingControls.length > 0
  ) {
    return {
      id: "A3",
      name:
        "Blacklist / Freeze Capability",
      status: "detected",
      severity: "medium",
      scoreImpact: 8,

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
          ? "The analyzed ABI exposes supported state-changing blacklist or freeze-related methods. These methods may support restricting specific addresses or accounts; caller restrictions and runtime behavior are not determined by this detector."
          : "The available ABI exposes supported state-changing blacklist or freeze-related methods. This is a positive interface signal, but ABI provenance is limited, so caller restrictions and complete runtime behavior are not determined by this detector.",
    };
  }

  // Absence from limited-provenance ABI data is not enough
  // to classify a capability as absent.
  if (
    abiEvidenceQuality !== "full"
  ) {
    return {
      id: "A3",
      name:
        "Blacklist / Freeze Capability",
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
          ? "Blacklist or freeze-related interface signals were present in the available ABI, but no supported state-changing administrative method was identified. Because the ABI provenance is limited, Cerynq cannot reliably classify the absence of blacklist or freeze capability."
          : "No supported blacklist or freeze-related methods were identified in the available ABI. Because the ABI provenance is limited, absence from this ABI is not sufficient evidence to conclude that blacklist or freeze capability is not present.",
    };
  }

  if (
    evidenceMethods.length > 0
  ) {
    return {
      id: "A3",
      name:
        "Blacklist / Freeze Capability",
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
        "Blacklist or freeze-related interface signals were identified, but no supported state-changing administrative methods were identified in the fully verified analyzed ABI.",
    };
  }

  return {
    id: "A3",
    name:
      "Blacklist / Freeze Capability",
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
      "No supported state-changing blacklist or freeze-related methods were identified in the fully verified analyzed ABI.",
  };
}