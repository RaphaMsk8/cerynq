import {
  getAddress,
  isAddress,
  type Address,
  type Hex,
} from "viem";

const EIP1167_RUNTIME_PREFIX =
  "363d3d373d3d3d363d73";

const EIP1167_RUNTIME_SUFFIX =
  "5af43d82803e903d91602b57fd5bf3";

const EIP1167_RUNTIME_BYTES = 45;

export type ArcProxyResolution = {
  proxyType: "eip1167";
  implementationAddress: Address;
};

export function resolveEip1167Proxy(
  bytecode: Hex | undefined
): ArcProxyResolution | null {
  if (
    !bytecode ||
    bytecode === "0x"
  ) {
    return null;
  }

  const runtimeBytecode =
    bytecode
      .slice(2)
      .toLowerCase();

  if (
    runtimeBytecode.length !==
    EIP1167_RUNTIME_BYTES * 2
  ) {
    return null;
  }

  if (
    !runtimeBytecode.startsWith(
      EIP1167_RUNTIME_PREFIX
    ) ||
    !runtimeBytecode.endsWith(
      EIP1167_RUNTIME_SUFFIX
    )
  ) {
    return null;
  }

  const implementationStart =
    EIP1167_RUNTIME_PREFIX.length;

  const implementationEnd =
    implementationStart + 40;

  const rawImplementationAddress =
    `0x${runtimeBytecode.slice(
      implementationStart,
      implementationEnd
    )}`;

  if (
    !isAddress(
      rawImplementationAddress
    )
  ) {
    return null;
  }

  return {
    proxyType: "eip1167",

    implementationAddress:
      getAddress(
        rawImplementationAddress
      ),
  };
}