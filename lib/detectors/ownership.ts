import { zeroAddress } from "viem";

import { arcClient } from "@/lib/arc/client";

import {
  getAbiEvidenceSource,
  type ArcAbiEvidenceSource,
  type ArcAbiSource,
  type ArcEvidenceProvider,
} from "@/lib/arc/evidence";

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

export type OwnershipFinding = {
  id: "A1";
  name: "Active Ownership";

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

  ownerAddress: string | null;

  renounced: boolean | null;

  evidence: {
    type:
      | "fully_verified_abi"
      | "rpc_call";

    method: "owner()";

    source:
      | ArcAbiEvidenceSource
      | "Arc Mainnet RPC";

    interfaceSource:
      | ArcAbiEvidenceSource
      | null;
  };

  explanation: string;
};

type DetectOwnershipOptions = {
  hasOwnerFunction: boolean | null;

  abiProvider:
    ArcEvidenceProvider;

  abiSource:
    ArcAbiSource;
};

export async function detectOwnership(
  address: `0x${string}`,
  options: DetectOwnershipOptions
): Promise<OwnershipFinding> {
  const interfaceSource =
    getAbiEvidenceSource(
      options.abiProvider,
      options.abiSource
    );

  if (
    options.hasOwnerFunction === false
  ) {
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
        type:
          "fully_verified_abi",

        method:
          "owner()",

        source:
          interfaceSource,

        interfaceSource,
      },

      explanation:
        "No standard owner() interface was identified in the fully verified analyzed ABI. This does not rule out other ownership or administrative mechanisms.",
    };
  }

  try {
    const owner =
      await arcClient.readContract({
        address,
        abi: ownerAbi,
        functionName:
          "owner",
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
          type:
            "rpc_call",

          method:
            "owner()",

          source:
            "Arc Mainnet RPC",

          interfaceSource:
            options
                .hasOwnerFunction ===
              true
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
        type:
          "rpc_call",

        method:
          "owner()",

        source:
          "Arc Mainnet RPC",

        interfaceSource:
          options
              .hasOwnerFunction ===
            true
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
        type:
          "rpc_call",

        method:
          "owner()",

        source:
          "Arc Mainnet RPC",

        interfaceSource:
          options
              .hasOwnerFunction ===
            true
            ? interfaceSource
            : null,
      },

      explanation:
        "Cerynq could not resolve owner() through Arc Mainnet RPC, so the ownership state could not be classified from the available evidence.",
    };
  }
}