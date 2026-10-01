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

export type OwnershipFinding = {
  id: "A1";
  name: "Privileged Owner";
  status: "detected" | "not_detected" | "unknown";
  severity: "low" | "medium";
  scoreImpact: number;
  confidence: "high" | "medium" | "low";
  ownerAddress: string | null;
  renounced: boolean | null;
  evidence: {
    type: "verified_abi" | "rpc_call";
    method: "owner()";
    source: "Arc Explorer ABI" | "Arc Mainnet RPC";
  };
  explanation: string;
};

type DetectOwnershipOptions = {
  hasOwnerFunction: boolean | null;
};

export async function detectOwnership(
  address: `0x${string}`,
  options: DetectOwnershipOptions
): Promise<OwnershipFinding> {
  if (options.hasOwnerFunction === false) {
    return {
      id: "A1",
      name: "Privileged Owner",
      status: "not_detected",
      severity: "low",
      scoreImpact: 0,
      confidence: "high",
      ownerAddress: null,
      renounced: null,
      evidence: {
        type: "verified_abi",
        method: "owner()",
        source: "Arc Explorer ABI",
      },
      explanation:
        "The verified ABI does not expose the standard owner() interface. This does not rule out other administrative control mechanisms.",
    };
  }

  try {
    const owner = await arcClient.readContract({
      address,
      abi: ownerAbi,
      functionName: "owner",
    });

    const renounced = owner.toLowerCase() === zeroAddress.toLowerCase();

    if (renounced) {
      return {
        id: "A1",
        name: "Privileged Owner",
        status: "not_detected",
        severity: "low",
        scoreImpact: 0,
        confidence: "high",
        ownerAddress: owner,
        renounced: true,
        evidence: {
          type:
            options.hasOwnerFunction === true
              ? "verified_abi"
              : "rpc_call",
          method: "owner()",
          source:
            options.hasOwnerFunction === true
              ? "Arc Explorer ABI"
              : "Arc Mainnet RPC",
        },
        explanation:
          "The contract exposes owner(), but ownership is set to the zero address.",
      };
    }

    return {
      id: "A1",
      name: "Privileged Owner",
      status: "detected",
      severity: "medium",
      scoreImpact: 5,
      confidence: "high",
      ownerAddress: owner,
      renounced: false,
      evidence: {
        type:
          options.hasOwnerFunction === true
            ? "verified_abi"
            : "rpc_call",
        method: "owner()",
        source:
          options.hasOwnerFunction === true
            ? "Arc Explorer ABI"
            : "Arc Mainnet RPC",
      },
      explanation:
        "The contract exposes an active owner address with privileged control.",
    };
  } catch {
    return {
      id: "A1",
      name: "Privileged Owner",
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
      },
      explanation:
        "Cerynq could not confirm the standard owner() interface. Other administrative control mechanisms may still exist.",
    };
  }
}