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

export type WhitelistFinding = {
  id: "A4";
  name: "Whitelist Capability";
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

type DetectWhitelistOptions = {
  abi: AbiItem[] | null;
  abiSource: AbiSource;
};

function getEvidenceSource(
  abiSource: AbiSource
): WhitelistFinding["evidence"]["source"] {
  if (abiSource === "implementation") {
    return "Arc Explorer Implementation ABI";
  }

  if (abiSource === "contract") {
    return "Arc Explorer Contract ABI";
  }

  return "Arc Explorer ABI";
}

const administrativeMethodNames = new Set([
  "whitelist",
  "unwhitelist",
  "addwhitelist",
  "removewhitelist",
  "addtowhitelist",
  "removefromwhitelist",
  "setwhitelist",
  "setwhitelisted",
  "setallowed",
  "allowaddress",
  "disallowaddress",
]);

const readOnlyIndicatorNames = new Set([
  "iswhitelisted",
  "whitelisted",
  "getwhiteliststatus",
  "isallowed",
  "allowed",
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

export function detectWhitelistCapability(
  options: DetectWhitelistOptions
): WhitelistFinding {
  const { abi, abiSource } = options;

  const evidenceSource =
    getEvidenceSource(abiSource);

  if (abi === null) {
    return {
      id: "A4",
      name: "Whitelist Capability",
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
        "Cerynq could not inspect an analyzed ABI for whitelist-related signals, so this check could not be classified.",
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
      id: "A4",
      name: "Whitelist Capability",
      status: "detected",
      severity: "medium",
      scoreImpact: 4,
      confidence: "high",
      evidence: {
        type: "verified_abi",
        methods: evidenceMethods,
        source: evidenceSource,
      },
      explanation:
        "The analyzed ABI exposes supported state-changing whitelist-related methods. These methods may support restricting access or activity to approved addresses; caller restrictions and runtime behavior are not determined by this detector.",
    };
  }

  if (evidenceMethods.length > 0) {
    return {
      id: "A4",
      name: "Whitelist Capability",
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
        "Whitelist-related interface signals were identified, but no supported state-changing administrative methods were identified in the analyzed ABI.",
    };
  }

  return {
    id: "A4",
    name: "Whitelist Capability",
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
      "No supported state-changing whitelist-related methods were identified in the analyzed ABI.",
  };
}