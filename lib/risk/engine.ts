export type RiskFindingStatus =
  | "detected"
  | "not_detected"
  | "unknown";

export type RiskFindingConfidence =
  | "high"
  | "medium"
  | "low";

export type RiskFindingInput = {
  id: string;
  status: RiskFindingStatus;
  scoreImpact: number;
  confidence: RiskFindingConfidence;
};

export type RiskLevel =
  | "unknown"
  | "low"
  | "moderate"
  | "high"
  | "critical";

export type RiskEngineResult = {
  version: "0.1";
  rawScore: number;
  maxScore: number;
  normalizedScore: number;
  riskLevel: RiskLevel;
  confidence: RiskFindingConfidence;
  coverage: {
    totalFindings: number;
    knownFindings: number;
    unknownFindings: number;
    percentage: number;
  };
  detectedFindings: string[];
  explanation: string;
};

const CURRENT_MAX_SCORE = 25;

function getRiskLevel(
  normalizedScore: number
): RiskLevel {
  if (normalizedScore >= 75) {
    return "critical";
  }

  if (normalizedScore >= 50) {
    return "high";
  }

  if (normalizedScore >= 25) {
    return "moderate";
  }

  return "low";
}

function getAggregateConfidence(
  coveragePercentage: number,
  findings: RiskFindingInput[]
): RiskFindingConfidence {
  if (findings.length === 0) {
    return "low";
  }

  const knownFindings = findings.filter(
    (finding) => finding.status !== "unknown"
  );

  if (knownFindings.length === 0) {
    return "low";
  }

  const hasLowConfidence = knownFindings.some(
    (finding) => finding.confidence === "low"
  );

  const hasMediumConfidence = knownFindings.some(
    (finding) => finding.confidence === "medium"
  );

  if (
    coveragePercentage >= 80 &&
    !hasLowConfidence &&
    !hasMediumConfidence
  ) {
    return "high";
  }

  if (
    coveragePercentage >= 50 &&
    !hasLowConfidence
  ) {
    return "medium";
  }

  return "low";
}

export function calculateRisk(
  findings: RiskFindingInput[]
): RiskEngineResult {
  const totalFindings = findings.length;

  const unknownFindings = findings.filter(
    (finding) => finding.status === "unknown"
  );

  const knownFindings =
    totalFindings - unknownFindings.length;

  const coveragePercentage =
    totalFindings > 0
      ? Math.round(
          (knownFindings / totalFindings) * 100
        )
      : 0;

  const rawScore = findings
    .filter(
      (finding) => finding.status === "detected"
    )
    .reduce(
      (total, finding) =>
        total + finding.scoreImpact,
      0
    );

  const normalizedScore = Math.min(
    100,
    Math.round(
      (rawScore / CURRENT_MAX_SCORE) * 100
    )
  );

  const riskLevel =
  coveragePercentage === 0
    ? "unknown"
    : getRiskLevel(normalizedScore);

  const confidence =
    getAggregateConfidence(
      coveragePercentage,
      findings
    );

  const detectedFindings = findings
    .filter(
      (finding) => finding.status === "detected"
    )
    .map((finding) => finding.id);

  let explanation: string;

  if (totalFindings === 0) {
    explanation =
      "Cerynq could not calculate contract risk because no findings were available.";
  } else if (coveragePercentage === 0) {
    explanation =
      "Cerynq could not determine the current risk level because all evaluated findings are unknown.";
  } else if (unknownFindings.length > 0) {
    explanation =
      "The risk score is based on the findings Cerynq could evaluate. Some controls remain unknown, so the score should be interpreted together with coverage and confidence.";
  } else {
    explanation =
      "The risk score summarizes the currently evaluated privileged-control findings. All findings in the current risk model were successfully evaluated.";
  }

  return {
    version: "0.1",
    rawScore,
    maxScore: CURRENT_MAX_SCORE,
    normalizedScore,
    riskLevel,
    confidence,
    coverage: {
      totalFindings,
      knownFindings,
      unknownFindings:
        unknownFindings.length,
      percentage: coveragePercentage,
    },
    detectedFindings,
    explanation,
  };
}