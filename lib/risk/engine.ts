export type RiskFindingStatus =
  | "detected"
  | "not_detected"
  | "unknown";

export type RiskFindingConfidence =
  | "high"
  | "medium"
  | "low";

export type RiskAssessmentStatus =
  | "complete"
  | "partial"
  | "insufficient";

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
  assessmentStatus: RiskAssessmentStatus;
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

function getAssessmentStatus(
  totalFindings: number,
  knownFindings: number,
  unknownFindings: number
): RiskAssessmentStatus {
  if (
    totalFindings === 0 ||
    knownFindings === 0
  ) {
    return "insufficient";
  }

  if (unknownFindings > 0) {
    return "partial";
  }

  return "complete";
}

function getEvidenceConfidence(
  findings: RiskFindingInput[]
): RiskFindingConfidence {
  const knownFindings = findings.filter(
    (finding) => finding.status !== "unknown"
  );

  if (knownFindings.length === 0) {
    return "low";
  }

  const hasLowConfidence = knownFindings.some(
    (finding) => finding.confidence === "low"
  );

  if (hasLowConfidence) {
    return "low";
  }

  const hasMediumConfidence =
    knownFindings.some(
      (finding) =>
        finding.confidence === "medium"
    );

  if (hasMediumConfidence) {
    return "medium";
  }

  return "high";
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
          (knownFindings / totalFindings) *
            100
        )
      : 0;

  const assessmentStatus =
    getAssessmentStatus(
      totalFindings,
      knownFindings,
      unknownFindings.length
    );

  const rawScore = findings
    .filter(
      (finding) =>
        finding.status === "detected"
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
    assessmentStatus === "complete"
      ? getRiskLevel(normalizedScore)
      : "unknown";

  const confidence =
    getEvidenceConfidence(findings);

  const detectedFindings = findings
    .filter(
      (finding) =>
        finding.status === "detected"
    )
    .map((finding) => finding.id);

  let explanation: string;

  if (totalFindings === 0) {
    explanation =
      "Cerynq could not produce an assessment because no risk findings were available.";
  } else if (
    assessmentStatus === "insufficient"
  ) {
    explanation =
      "Cerynq could not determine a risk level because none of the current model checks could be resolved with the available evidence.";
  } else if (
    assessmentStatus === "partial"
  ) {
    explanation =
      "The observed score reflects only the checks Cerynq could resolve. One or more checks remain unknown, so the overall risk level is not classified.";
  } else {
    explanation =
      "The score summarizes the privileged-control signals evaluated by the current Cerynq risk model. All current model checks produced known results.";
  }

  return {
    version: "0.1",
    assessmentStatus,
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