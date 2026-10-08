import type { Hex } from "viem";

import {
  createAsyncTtlCache,
} from "@/lib/arc/cache";

import {
  getArcExplorerMetadata,
  type ArcExplorerMetadata,
} from "@/lib/arc/explorer";

import {
  type ArcAbiEvidenceQuality,
  type ArcAbiItem,
  type ArcAbiSource,
  type ArcResolvedAbiEvidence,
} from "@/lib/arc/evidence";

import {
  getProviderFailureStatus,
  type ArcProviderOperationalStatus,
  type ArcProviderState,
} from "@/lib/arc/provider";

import {
  resolveEip1167Proxy,
  type ArcProxyResolution,
} from "@/lib/arc/proxy";

import {
  getSourcifyContractMetadata,
  type SourcifyContractMetadata,
} from "@/lib/arc/sourcify";

const PROVIDER_CACHE_TTL_MS =
  60_000;

const PROVIDER_CACHE_MAX_ENTRIES =
  200;

const blockscoutCache =
  createAsyncTtlCache<
    ArcExplorerMetadata | null
  >({
    ttlMs:
      PROVIDER_CACHE_TTL_MS,

    maxEntries:
      PROVIDER_CACHE_MAX_ENTRIES,
  });

const sourcifyCache =
  createAsyncTtlCache<
    SourcifyContractMetadata | null
  >({
    ttlMs:
      PROVIDER_CACHE_TTL_MS,

    maxEntries:
      PROVIDER_CACHE_MAX_ENTRIES,
  });

export type ArcEvidenceResolution = {
  blockscout:
    | ArcExplorerMetadata
    | null;

  sourcify:
    | SourcifyContractMetadata
    | null;

  providers: {
    blockscout:
      ArcProviderState;

    sourcify:
      ArcProviderState;
  };

  onchainProxy:
    | ArcProxyResolution
    | null;

  abiEvidence:
    ArcResolvedAbiEvidence;

  hasOwnerFunction:
    boolean | null;
};

function getAddressCacheKey(
  address: string
): string {
  return address.toLowerCase();
}

async function getCachedBlockscoutMetadata(
  address: string
): Promise<
  ArcExplorerMetadata | null
> {
  const key =
    getAddressCacheKey(
      address
    );

  return blockscoutCache
    .getOrCreate(
      key,
      async () => {
        console.info(
          "Cerynq provider fetch:",
          {
            provider:
              "blockscout",

            address,
          }
        );

        return getArcExplorerMetadata(
          address
        );
      }
    );
}

async function getCachedSourcifyMetadata(
  address: string
): Promise<
  SourcifyContractMetadata | null
> {
  const key =
    getAddressCacheKey(
      address
    );

  return sourcifyCache
    .getOrCreate(
      key,
      async () => {
        console.info(
          "Cerynq provider fetch:",
          {
            provider:
              "sourcify",

            address,
          }
        );

        return getSourcifyContractMetadata(
          address
        );
      }
    );
}

function detectOwnerFunction(
  abi: ArcAbiItem[] | null,
  quality: ArcAbiEvidenceQuality
): boolean | null {
  if (abi === null) {
    return null;
  }

  const ownerFound =
    abi.some(
      (item) =>
        item.type ===
          "function" &&
        item.name ===
          "owner" &&
        (
          item.inputs?.length ??
          0
        ) === 0
    );

  if (ownerFound) {
    return true;
  }

  if (
    quality === "full"
  ) {
    return false;
  }

  return null;
}

function emptyAbiEvidence():
  ArcResolvedAbiEvidence {
  return {
    abi:
      null,

    provider:
      null,

    source:
      null,

    verificationStatus:
      "unknown",

    quality:
      "unknown",
  };
}

function addressesMatch(
  first: string,
  second: string
): boolean {
  return (
    first.toLowerCase() ===
    second.toLowerCase()
  );
}

function getBlockscoutEvidence(
  metadata:
    ArcExplorerMetadata,

  onchainProxy:
    | ArcProxyResolution
    | null
): ArcResolvedAbiEvidence | null {
  if (
    metadata.abi === null ||
    metadata.abiSource === null
  ) {
    return null;
  }

  /*
   * When runtime bytecode independently proves a
   * canonical EIP-1167 proxy, only implementation-level
   * ABI evidence matching the onchain implementation is
   * accepted.
   */
  if (onchainProxy) {
    if (
      metadata.abiSource !==
      "implementation"
    ) {
      return null;
    }

    if (
      !metadata
        .implementationAddress ||
      !addressesMatch(
        metadata
          .implementationAddress,

        onchainProxy
          .implementationAddress
      )
    ) {
      console.warn(
        "Cerynq proxy implementation mismatch:",
        {
          provider:
            "blockscout",

          onchainImplementation:
            onchainProxy
              .implementationAddress,

          providerImplementation:
            metadata
              .implementationAddress,
        }
      );

      return null;
    }
  }

  return {
    abi:
      metadata.abi,

    provider:
      "blockscout",

    source:
      metadata.abiSource,

    verificationStatus:
      metadata
        .abiVerificationStatus,

    quality:
      metadata
        .abiEvidenceQuality,
  };
}

function getSourcifySource(
  requestedAddress: string,
  originalAddress: string
): ArcAbiSource {
  return addressesMatch(
    requestedAddress,
    originalAddress
  )
    ? "contract"
    : "implementation";
}

function logProviderFailure(
  provider:
    | "blockscout"
    | "sourcify",

  status:
    ArcProviderOperationalStatus
) {
  console.warn(
    "Cerynq provider unavailable:",
    {
      provider,
      status,
    }
  );
}

export async function resolveArcEvidence(
  address: string,
  bytecode: Hex | undefined
): Promise<ArcEvidenceResolution> {
  const onchainProxy =
    resolveEip1167Proxy(
      bytecode
    );

  let blockscout:
    | ArcExplorerMetadata
    | null = null;

  let blockscoutStatus:
    ArcProviderOperationalStatus;

  try {
    blockscout =
      await getCachedBlockscoutMetadata(
        address
      );

    blockscoutStatus =
      blockscout
        ? "available"
        : "not_found";
  } catch (error) {
    blockscoutStatus =
      getProviderFailureStatus(
        "blockscout",
        error
      );

    logProviderFailure(
      "blockscout",
      blockscoutStatus
    );
  }

  const blockscoutEvidence =
    blockscout
      ? getBlockscoutEvidence(
          blockscout,
          onchainProxy
        )
      : null;

  if (
    blockscout &&
    blockscoutEvidence
  ) {
    return {
      blockscout,

      sourcify:
        null,

      providers: {
        blockscout: {
          status:
            blockscoutStatus,

          usedForAbi:
            true,
        },

        sourcify: {
          status:
            "not_used",

          usedForAbi:
            false,
        },
      },

      onchainProxy,

      abiEvidence:
        blockscoutEvidence,

      hasOwnerFunction:
        blockscout
          .hasOwnerFunction,
    };
  }

  /*
   * Prefer the implementation independently resolved
   * from canonical EIP-1167 runtime bytecode.
   *
   * If that is unavailable, use a single implementation
   * reported by Blockscout. Otherwise query the original
   * contract address.
   */
  const sourcifyAddress =
    onchainProxy
      ?.implementationAddress ??
    blockscout
      ?.implementationAddress ??
    address;

  let sourcify:
    | SourcifyContractMetadata
    | null = null;

  let sourcifyStatus:
    ArcProviderOperationalStatus;

  try {
    sourcify =
      await getCachedSourcifyMetadata(
        sourcifyAddress
      );

    sourcifyStatus =
      sourcify
        ? "available"
        : "not_found";
  } catch (error) {
    sourcifyStatus =
      getProviderFailureStatus(
        "sourcify",
        error
      );

    logProviderFailure(
      "sourcify",
      sourcifyStatus
    );
  }

  if (
    !sourcify ||
    sourcify.abi === null
  ) {
    return {
      blockscout,

      sourcify,

      providers: {
        blockscout: {
          status:
            blockscoutStatus,

          usedForAbi:
            false,
        },

        sourcify: {
          status:
            sourcifyStatus,

          usedForAbi:
            false,
        },
      },

      onchainProxy,

      abiEvidence:
        emptyAbiEvidence(),

      hasOwnerFunction:
        null,
    };
  }

  const source =
    getSourcifySource(
      sourcifyAddress,
      address
    );

  const abiEvidence:
    ArcResolvedAbiEvidence = {
      abi:
        sourcify.abi,

      provider:
        "sourcify",

      source,

      verificationStatus:
        sourcify
          .verificationStatus,

      quality:
        sourcify
          .abiEvidenceQuality,
    };

  return {
    blockscout,

    sourcify,

    providers: {
      blockscout: {
        status:
          blockscoutStatus,

        usedForAbi:
          false,
      },

      sourcify: {
        status:
          sourcifyStatus,

        usedForAbi:
          true,
      },
    },

    onchainProxy,

    abiEvidence,

    hasOwnerFunction:
      detectOwnerFunction(
        abiEvidence.abi,
        abiEvidence.quality
      ),
  };
}