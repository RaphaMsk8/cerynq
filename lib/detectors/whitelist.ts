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

export type WhitelistFinding = {
  id: "A4";
  name: "Whitelist Capability";
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

function normalizeMethodName(name: string): string {
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

  const evidenceSource = getEvidenceSource(abiSource);

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
        "Cerynq could not inspect a verified ABI for whitelist-related controls.",
    };
  }

  const relevantFunctions = abi.filter((item) => {
    if (
      item.type !== "function" ||
      typeof item.name !== "string"
    ) {
      return false;
    }

    const normalizedName = normalizeMethodName(item.name);

    return (
      administrativeMethodNames.has(normalizedName) ||
      readOnlyIndicatorNames.has(normalizedName)
    );
  });

  const evidenceMethods = [
    ...new Set(
      relevantFunctions.map((item) => item.name as string)
    ),
  ];

  const administrativeControls = relevantFunctions.filter(
    (item) => {
      if (typeof item.name !== "string") {
        return false;
      }

      const normalizedName = normalizeMethodName(item.name);

      return (
        administrativeMethodNames.has(normalizedName) &&
        !isReadOnly(item)
      );
    }
  );

  if (administrativeControls.length > 0) {
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
        "The verified ABI exposes whitelist-related administrative controls that may allow privileged actors to restrict access or activity to approved addresses.",
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
        "The verified ABI exposes whitelist-related read-only indicators, but Cerynq did not find standard administrative methods that can modify that state.",
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
      "The verified ABI does not expose standard whitelist-related administrative controls.",
  };
}