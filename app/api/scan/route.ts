import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { z } from "zod";

import { arcClient } from "@/lib/arc/client";
import { getArcExplorerMetadata } from "@/lib/arc/explorer";
import { detectOwnership } from "@/lib/detectors/ownership";

const scanSchema = z.object({
  address: z.string().refine(isAddress, {
    message: "Invalid EVM address",
  }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = scanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid address",
        },
        { status: 400 }
      );
    }

    const address = parsed.data.address;

    const bytecode = await arcClient.getBytecode({
      address,
    });
let explorerMetadata = null;

try {
  explorerMetadata = await getArcExplorerMetadata(address);
} catch (error) {
  console.error("Arc Explorer metadata error:", error);
}
    const isContract = Boolean(bytecode && bytecode !== "0x");
const bytecodeSize = bytecode ? Math.max((bytecode.length - 2) / 2, 0) : 0;

const ownershipFinding = isContract
  ? await detectOwnership(address, {
      hasOwnerFunction: explorerMetadata?.hasOwnerFunction ?? null,
    })
  : null;

return NextResponse.json({
  ok: true,
  network: "Arc Mainnet",
  chainId: 5042,
  address,
  isContract,
  contractType: isContract ? "contract" : "eoa",
  bytecodeDetected: isContract,
  bytecodeSize,

  explorer: {
  available: explorerMetadata !== null,
  isVerified: explorerMetadata?.isVerified ?? null,
  contractName: explorerMetadata?.contractName ?? null,
  proxyType: explorerMetadata?.proxyType ?? null,
  implementationAddress:
    explorerMetadata?.implementationAddress ?? null,
  abiAvailable: explorerMetadata?.abi !== null,
  hasOwnerFunction: explorerMetadata?.hasOwnerFunction ?? null,
},

ownership: ownershipFinding,

});
  } catch (error) {
    console.error("Cerynq scan error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Unable to query Arc Mainnet",
      },
      { status: 500 }
    );
  }
}