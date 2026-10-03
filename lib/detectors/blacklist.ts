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

export type BlacklistFinding = {
  id: "A3";
  name: "Blacklist / Freeze Capability";
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

type DetectBlacklistOptions = {
  abi: AbiItem[] | null;
  abiSource: AbiSource;
};

function getEvidenceSource(
  abiSource: AbiSource
): BlacklistFinding["evidence"]["source"] {
  if (abiSource === "implementation") {
    return "Arc Explorer Implementation ABI";
  }

  if (abiSource === "contract") {
    return "Arc Explorer Contract ABI";
  }

  return "Arc Explorer ABI";
}

const administrativeMethodNames = new Set([
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

const readOnlyIndicatorNames = new Set([
  "isblacklisted",
  "blacklisted",
  "getblackliststatus",
  "frozen",
  "isfrozen",
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

export function detectBlacklistCapability(
  options: DetectBlacklistOptions
): BlacklistFinding {
  const { abi, abiSource } = options;

  const evidenceSource = getEvidenceSource(abiSource);

  if (abi === null) {
    return {
      id: "A3",
      name: "Blacklist / Freeze Capability",
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
        "Cerynq could not inspect a verified ABI for blacklist or freeze-related controls.",
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
      id: "A3",
      name: "Blacklist / Freeze Capability",
      status: "detected",
      severity: "medium",
      scoreImpact: 8,
      confidence: "high",
      evidence: {
        type: "verified_abi",
        methods: evidenceMethods,
        source: evidenceSource,
      },
      explanation:
        "The verified ABI exposes blacklist or freeze-related administrative controls that may allow privileged actors to restrict specific addresses or accounts.",
    };
  }

  if (evidenceMethods.length > 0) {
    return {
      id: "A3",
      name: "Blacklist / Freeze Capability",
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
        "The verified ABI exposes blacklist or freeze-related read-only indicators, but Cerynq did not find standard administrative methods that can modify that state.",
    };
  }

  return {
    id: "A3",
    name: "Blacklist / Freeze Capability",
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
      "The verified ABI does not expose standard blacklist or freeze-related administrative controls.",
  };
}