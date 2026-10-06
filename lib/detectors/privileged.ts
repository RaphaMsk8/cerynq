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

export type PrivilegedFinding = {
  id: "A5";
  name: "Other Privileged Controls";
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

type DetectPrivilegedOptions = {
  abi: AbiItem[] | null;
  abiSource: AbiSource;
};

function getEvidenceSource(
  abiSource: AbiSource
): PrivilegedFinding["evidence"]["source"] {
  if (abiSource === "implementation") {
    return "Arc Explorer Implementation ABI";
  }

  if (abiSource === "contract") {
    return "Arc Explorer Contract ABI";
  }

  return "Arc Explorer ABI";
}

const administrativeMethodNames = new Set([
  "grantrole",
  "revokerole",
  "setroleadmin",
  "changeadmin",
  "setadmin",
]);

const readOnlyIndicatorNames = new Set([
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

function isReadOnly(item: AbiItem): boolean {
  return (
    item.stateMutability === "view" ||
    item.stateMutability === "pure"
  );
}

export function detectOtherPrivilegedControls(
  options: DetectPrivilegedOptions
): PrivilegedFinding {
  const { abi, abiSource } = options;

  const evidenceSource =
    getEvidenceSource(abiSource);

  if (abi === null) {
    return {
      id: "A5",
      name: "Other Privileged Controls",
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
        "Cerynq could not inspect an analyzed ABI for additional administrative signals, so this check could not be classified.",
    };
  }

  const relevantFunctions = abi.filter(
    (item) => {
      if (
        item.type !== "function" ||
        typeof item.name !== "string"
      ) {
        return false;
      }

      const normalizedName =
        normalizeMethodName(item.name);

      return (
        administrativeMethodNames.has(
          normalizedName
        ) ||
        readOnlyIndicatorNames.has(
          normalizedName
        )
      );
    }
  );

  const evidenceMethods = [
    ...new Set(
      relevantFunctions.map(
        (item) => item.name as string
      )
    ),
  ];

  const stateChangingControls =
    relevantFunctions.filter((item) => {
      if (
        typeof item.name !== "string"
      ) {
        return false;
      }

      const normalizedName =
        normalizeMethodName(item.name);

      return (
        administrativeMethodNames.has(
          normalizedName
        ) &&
        !isReadOnly(item)
      );
    });

  if (stateChangingControls.length > 0) {
    return {
      id: "A5",
      name: "Other Privileged Controls",
      status: "detected",
      severity: "medium",
      scoreImpact: 3,
      confidence: "high",
      evidence: {
        type: "verified_abi",
        methods: evidenceMethods,
        source: evidenceSource,
      },
      explanation:
        "The analyzed ABI exposes supported state-changing administrative methods related to roles or administrative authority. Caller restrictions and runtime behavior are not determined by this detector.",
    };
  }

  if (evidenceMethods.length > 0) {
    return {
      id: "A5",
      name: "Other Privileged Controls",
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
        "Administrative interface signals were identified, but no supported state-changing methods for modifying roles or administrative authority were identified in the analyzed ABI.",
    };
  }

  return {
    id: "A5",
    name: "Other Privileged Controls",
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
      "No supported state-changing methods for modifying roles or administrative authority were identified in the analyzed ABI.",
  };
}