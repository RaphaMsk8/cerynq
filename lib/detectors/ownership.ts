import { zeroAddress } from "viem";

import { arcClient } from "@/lib/arc/client";

const ownerAbi = [
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

type AbiSource =
  | "contract"
  | "implementation"
  | null;

type ExplorerEvidenceSource =
  | "Arc Explorer Contract ABI"
  | "Arc Explorer Implementation ABI"
  | "Arc Explorer ABI";

export type OwnershipFinding = {
  id: "A1";
  name: "Active Ownership";
  status:
    | "detected"
    | "not_detected"
    | "unknown";
  severity: "low" | "medium";
  scoreImpact: number;
  confidence: "high" | "medium" | "low";
  ownerAddress: string | null;
  renounced: boolean | null;
  evidence: {
    type: "verified_abi" | "rpc_call";
    method: "owner()";
    source:
      | ExplorerEvidenceSource
      | "Arc Mainnet RPC";
    interfaceSource:
      | ExplorerEvidenceSource
      | null;
  };
  explanation: string;
};

type DetectOwnershipOptions = {
  hasOwnerFunction: boolean | null;
  abiSource: AbiSource;
};

function getExplorerEvidenceSource(
  abiSource: AbiSource
): ExplorerEvidenceSource {
  if (abiSource === "implementation") {
    return "Arc Explorer Implementation ABI";
  }

  if (abiSource === "contract") {
    return "Arc Explorer Contract ABI";
  }

  return "Arc Explorer ABI";
}

export async function detectOwnership(
  address: `0x${string}`,
  options: DetectOwnershipOptions
): Promise<OwnershipFinding> {
  const interfaceSource =
    getExplorerEvidenceSource(
      options.abiSource
    );

  if (options.hasOwnerFunction === false) {
    return {
      id: "A1",
      name: "Active Ownership",
      status: "not_detected",
      severity: "low",
      scoreImpact: 0,
      confidence: "high",
      ownerAddress: null,
      renounced: null,
      evidence: {
        type: "verified_abi",
        method: "owner()",
        source: interfaceSource,
        interfaceSource,
      },
      explanation:
        "No standard owner() interface was identified in the analyzed ABI. This does not rule out other ownership or administrative mechanisms.",
    };
  }

  try {
    const owner = await arcClient.readContract({
      address,
      abi: ownerAbi,
      functionName: "owner",
    });

    const renounced =
      owner.toLowerCase() ===
      zeroAddress.toLowerCase();

    if (renounced) {
      return {
        id: "A1",
        name: "Active Ownership",
        status: "not_detected",
        severity: "low",
        scoreImpact: 0,
        confidence: "high",
        ownerAddress: owner,
        renounced: true,
        evidence: {
          type: "rpc_call",
          method: "owner()",
          source: "Arc Mainnet RPC",
          interfaceSource:
            options.hasOwnerFunction === true
              ? interfaceSource
              : null,
        },
        explanation:
          "owner() returned the zero address, indicating ownership is renounced under the standard owner() interface. This does not rule out other administrative mechanisms.",
      };
    }

    return {
      id: "A1",
      name: "Active Ownership",
      status: "detected",
      severity: "medium",
      scoreImpact: 5,
      confidence: "high",
      ownerAddress: owner,
      renounced: false,
      evidence: {
        type: "rpc_call",
        method: "owner()",
        source: "Arc Mainnet RPC",
        interfaceSource:
          options.hasOwnerFunction === true
            ? interfaceSource
            : null,
      },
      explanation:
        "owner() returned a non-zero address, indicating active ownership under the standard owner() interface. The permissions associated with that owner depend on the contract implementation.",
    };
  } catch {
    return {
      id: "A1",
      name: "Active Ownership",
      status: "unknown",
      severity: "low",
      scoreImpact: 0,
      confidence: "low",
      ownerAddress: null,
      renounced: null,
      evidence: {
        type: "rpc_call",
        method: "owner()",
        source: "Arc Mainnet RPC",
        interfaceSource:
          options.hasOwnerFunction === true
            ? interfaceSource
            : null,
      },
      explanation:
        "Cerynq could not resolve owner() through Arc Mainnet RPC, so the ownership state could not be classified from the available evidence.",
    };
  }
}