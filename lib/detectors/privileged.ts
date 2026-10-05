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

export type PrivilegedFinding = {
  id: "A5";
  name: "Other Privileged Controls";
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

function normalizeMethodName(name: string): string {
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

  const evidenceSource = getEvidenceSource(abiSource);

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
        "Cerynq could not inspect a verified ABI for additional privileged administrative controls.",
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
        "The verified ABI exposes additional administrative controls that may allow privileged actors to manage roles or administrative authority.",
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
        "The verified ABI exposes read-only administrative indicators, but Cerynq did not find standard methods that can modify roles or administrative authority.",
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
      "The verified ABI does not expose standard additional privileged administrative controls.",
  };
}