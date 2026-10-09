export type ArcEvidenceProvider =
  | "blockscout"
  | "sourcify"
  | null;

export type ArcAbiSource =
  | "contract"
  | "implementation"
  | null;

export type ArcVerificationStatus =
  | "fully_verified"
  | "partially_verified"
  | "verified"
  | "unverified"
  | "unknown";

export type ArcAbiEvidenceQuality =
  | "full"
  | "limited"
  | "unknown";

export type ArcAbiItem = {
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

export type ArcAbiEvidenceSource =
  | "Blockscout Contract ABI"
  | "Blockscout Implementation ABI"
  | "Blockscout ABI"
  | "Sourcify Contract ABI"
  | "Sourcify Implementation ABI"
  | "Sourcify ABI"
  | "ABI source unavailable";

export type ArcResolvedAbiEvidence = {
  abi: ArcAbiItem[] | null;

  provider: ArcEvidenceProvider;

  source: ArcAbiSource;

  verificationStatus:
    ArcVerificationStatus;

  quality:
    ArcAbiEvidenceQuality;
};

export function getAbiEvidenceSource(
  provider: ArcEvidenceProvider,
  source: ArcAbiSource
): ArcAbiEvidenceSource {
  if (provider === "blockscout") {
    if (source === "implementation") {
      return "Blockscout Implementation ABI";
    }

    if (source === "contract") {
      return "Blockscout Contract ABI";
    }

    return "Blockscout ABI";
  }

  if (provider === "sourcify") {
    if (source === "implementation") {
      return "Sourcify Implementation ABI";
    }

    if (source === "contract") {
      return "Sourcify Contract ABI";
    }

    return "Sourcify ABI";
  }

  return "ABI source unavailable";
}
