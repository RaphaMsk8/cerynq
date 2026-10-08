import {
  getAbiEvidenceSource,
  type ArcAbiEvidenceQuality,
  type ArcAbiEvidenceSource,
  type ArcAbiItem,
  type ArcAbiSource,
  type ArcEvidenceProvider,
} from "@/lib/arc/evidence";

export type PrivilegedFinding = {
  id: "A5";
  name: "Other Privileged Controls";

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

type DetectPrivilegedOptions = {
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
): PrivilegedFinding["evidence"]["type"] {
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
    "grantrole",
    "revokerole",
    "setroleadmin",
    "changeadmin",
    "setadmin",
  ]);

const readOnlyIndicatorNames =
  new Set([
    "hasrole",
    "getroleadmin",
    "isadmin",
    "admin",
    "default_admin_role",
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

export function detectOtherPrivilegedControls(
  options: DetectPrivilegedOptions
): PrivilegedFinding {
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
      id: "A5",
      name:
        "Other Privileged Controls",
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
        "Cerynq could not inspect an analyzed ABI for additional administrative signals, so this check could not be classified.",
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
      id: "A5",
      name:
        "Other Privileged Controls",
      status: "detected",
      severity: "medium",
      scoreImpact: 3,

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
          ? "The analyzed ABI exposes supported state-changing administrative methods related to roles or administrative authority. Caller restrictions and runtime behavior are not determined by this detector."
          : "The available ABI exposes supported state-changing administrative methods related to roles or administrative authority. This is a positive interface signal, but ABI provenance is limited, so caller restrictions and complete runtime behavior are not determined by this detector.",
    };
  }

  // Absence from limited-provenance ABI data is not enough
  // to classify a capability as absent.
  if (
    abiEvidenceQuality !== "full"
  ) {
    return {
      id: "A5",
      name:
        "Other Privileged Controls",
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
          ? "Administrative interface signals were present in the available ABI, but no supported state-changing method for modifying roles or administrative authority was identified. Because the ABI provenance is limited, Cerynq cannot reliably classify the absence of other privileged controls."
          : "No supported state-changing administrative methods were identified in the available ABI. Because the ABI provenance is limited, absence from this ABI is not sufficient evidence to conclude that other privileged controls are not present.",
    };
  }

  if (
    evidenceMethods.length > 0
  ) {
    return {
      id: "A5",
      name:
        "Other Privileged Controls",
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
        "Administrative interface signals were identified, but no supported state-changing methods for modifying roles or administrative authority were identified in the fully verified analyzed ABI.",
    };
  }

  return {
    id: "A5",
    name:
      "Other Privileged Controls",
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
      "No supported state-changing methods for modifying roles or administrative authority were identified in the fully verified analyzed ABI.",
  };
}