import type {
  ArcAbiEvidenceQuality,
  ArcAbiItem,
  ArcAbiSource,
  ArcVerificationStatus,
} from "@/lib/arc/evidence";

import {
  ArcProviderError,
  type ArcProviderFailureReason,
} from "@/lib/arc/provider";

export type {
  ArcAbiEvidenceQuality,
  ArcAbiSource,
  ArcVerificationStatus,
} from "@/lib/arc/evidence";

const DEFAULT_BLOCKSCOUT_BASE_URL =
  "https://api.blockscout.com/5042/api/v2";

const BLOCKSCOUT_TIMEOUT_MS = 8_000;

function getBlockscoutBaseUrl(): string {
  const configuredBaseUrl =
    process.env.BLOCKSCOUT_BASE_URL?.trim();

  return (
    configuredBaseUrl ||
    DEFAULT_BLOCKSCOUT_BASE_URL
  ).replace(/\/+$/, "");
}

const blockscoutBaseUrl =
  getBlockscoutBaseUrl();

type AddressInfo = {
  is_contract?: boolean;
  is_verified?: boolean;
  name?: string | null;
};

type SmartContractInfo = {
  name?: string | null;

  is_verified?: boolean;
  is_fully_verified?: boolean;
  is_partially_verified?: boolean;
  is_verified_via_sourcify?: boolean;
  is_verified_via_eth_bytecode_db?: boolean;

  proxy_type?: string | null;

  implementations?: Array<{
    address_hash?: string;
    name?: string | null;
  }>;

  abi?: unknown;
};

export type ArcExplorerMetadata = {
  isContract: boolean | null;

  verificationStatus:
    ArcVerificationStatus;

  isVerifiedViaSourcify:
    boolean | null;

  isVerifiedViaEthBytecodeDb:
    boolean | null;

  contractName: string | null;

  proxyType: string | null;

  implementationAddress:
    string | null;

  implementationAddresses:
    string[];

  hasMultipleImplementations:
    boolean;

  implementationVerificationStatus:
    ArcVerificationStatus;

  implementationIsVerifiedViaSourcify:
    boolean | null;

  implementationIsVerifiedViaEthBytecodeDb:
    boolean | null;

  implementationContractName:
    string | null;

  abi:
    | ArcAbiItem[]
    | null;

  abiSource:
    ArcAbiSource;

  abiVerificationStatus:
    ArcVerificationStatus;

  abiEvidenceQuality:
    ArcAbiEvidenceQuality;

  hasOwnerFunction:
    boolean | null;
};

function getApiKey(): string {
  const apiKey =
    process.env.BLOCKSCOUT_API_KEY?.trim();

  if (!apiKey) {
    throw new ArcProviderError(
      "blockscout",
      "configuration_error",
      "BLOCKSCOUT_API_KEY is not configured"
    );
  }

  return apiKey;
}

function getHttpFailureReason(
  status: number
): ArcProviderFailureReason {
  if (
    status === 401 ||
    status === 403
  ) {
    return "unauthorized";
  }

  if (status === 408) {
    return "timeout";
  }

  if (status === 429) {
    return "rate_limited";
  }

  if (status >= 500) {
    return "server_error";
  }

  return "http_error";
}

async function fetchBlockscoutJson<T>(
  endpoint: string,
  apiKey: string
): Promise<T | null> {
  const controller =
    new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, BLOCKSCOUT_TIMEOUT_MS);

  try {
    const separator =
      endpoint.includes("?")
        ? "&"
        : "?";

    const response = await fetch(
      `${blockscoutBaseUrl}${endpoint}${separator}apikey=${encodeURIComponent(
        apiKey
      )}`,
      {
        headers: {
          Accept:
            "application/json",
        },

        cache:
          "no-store",

        signal:
          controller.signal,
      }
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const reason =
        getHttpFailureReason(
          response.status
        );

      throw new ArcProviderError(
        "blockscout",
        reason,
        `Blockscout request failed with status ${response.status} for ${endpoint}`,
        response.status
      );
    }

    try {
      return (
        await response.json()
      ) as T;
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        throw new ArcProviderError(
          "blockscout",
          "timeout",
          `Blockscout request timed out after ${BLOCKSCOUT_TIMEOUT_MS}ms`
        );
      }

      throw new ArcProviderError(
        "blockscout",
        "invalid_response",
        `Blockscout returned invalid JSON for ${endpoint}`
      );
    }
  } catch (error) {
    if (
      error instanceof
      ArcProviderError
    ) {
      throw error;
    }

    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new ArcProviderError(
        "blockscout",
        "timeout",
        `Blockscout request timed out after ${BLOCKSCOUT_TIMEOUT_MS}ms`
      );
    }

    throw new ArcProviderError(
      "blockscout",
      "network_error",
      `Blockscout network request failed for ${endpoint}`
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchAddressInfo(
  address: string,
  apiKey: string
): Promise<AddressInfo | null> {
  return fetchBlockscoutJson<AddressInfo>(
    `/addresses/${address}`,
    apiKey
  );
}

async function fetchSmartContractInfo(
  address: string,
  apiKey: string
): Promise<SmartContractInfo | null> {
  return fetchBlockscoutJson<SmartContractInfo>(
    `/smart-contracts/${address}`,
    apiKey
  );
}

function normalizeBoolean(
  value: unknown
): boolean | null {
  return typeof value === "boolean"
    ? value
    : null;
}

function normalizeAbi(
  value: unknown
): ArcAbiItem[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized =
    value.filter(
      (
        item
      ): item is ArcAbiItem =>
        typeof item ===
          "object" &&
        item !== null
    );

  if (
    normalized.length === 0
  ) {
    return null;
  }

  return normalized;
}

function getVerificationStatus(
  addressInfo:
    | AddressInfo
    | null,

  smartContractInfo:
    | SmartContractInfo
    | null
): ArcVerificationStatus {
  if (
    smartContractInfo
      ?.is_fully_verified ===
    true
  ) {
    return "fully_verified";
  }

  if (
    smartContractInfo
      ?.is_partially_verified ===
    true
  ) {
    return "partially_verified";
  }

  const explicitVerification =
    typeof smartContractInfo
      ?.is_verified ===
    "boolean"
      ? smartContractInfo
          .is_verified
      : addressInfo
          ?.is_verified;

  if (
    explicitVerification ===
    false
  ) {
    return "unverified";
  }

  if (
    explicitVerification ===
    true
  ) {
    return "verified";
  }

  return "unknown";
}

function getAbiEvidenceQuality(
  abi:
    | ArcAbiItem[]
    | null,

  verificationStatus:
    ArcVerificationStatus
): ArcAbiEvidenceQuality {
  if (abi === null) {
    return "unknown";
  }

  if (
    verificationStatus ===
    "fully_verified"
  ) {
    return "full";
  }

  return "limited";
}

function getImplementationAddresses(
  smartContractInfo:
    | SmartContractInfo
    | null
): string[] {
  const addresses =
    smartContractInfo
      ?.implementations
      ?.map(
        (
          implementation
        ) =>
          implementation
            .address_hash
      )
      .filter(
        (
          address
        ): address is string =>
          typeof address ===
            "string" &&
          address.length > 0
      ) ?? [];

  return [
    ...new Set(addresses),
  ];
}

function detectOwnerFunction(
  abi:
    | ArcAbiItem[]
    | null,

  abiEvidenceQuality:
    ArcAbiEvidenceQuality
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
    abiEvidenceQuality ===
    "full"
  ) {
    return false;
  }

  return null;
}

export async function getArcExplorerMetadata(
  address: string
): Promise<
  ArcExplorerMetadata | null
> {
  const apiKey =
    getApiKey();

  const [
    addressInfo,
    smartContractInfo,
  ] = await Promise.all([
    fetchAddressInfo(
      address,
      apiKey
    ),

    fetchSmartContractInfo(
      address,
      apiKey
    ),
  ]);

  if (
    addressInfo === null
  ) {
    return null;
  }

  const verificationStatus =
    getVerificationStatus(
      addressInfo,
      smartContractInfo
    );

  const contractAbi =
    normalizeAbi(
      smartContractInfo?.abi
    );

  const proxyType =
    smartContractInfo
      ?.proxy_type ??
    null;

  const implementationAddresses =
    getImplementationAddresses(
      smartContractInfo
    );

  const hasMultipleImplementations =
    implementationAddresses
      .length > 1;

  const implementationAddress =
    implementationAddresses
      .length === 1
      ? implementationAddresses[0]
      : null;

  let implementationAddressInfo:
    | AddressInfo
    | null = null;

  let implementationSmartContractInfo:
    | SmartContractInfo
    | null = null;

  if (
    implementationAddress
  ) {
    [
      implementationAddressInfo,
      implementationSmartContractInfo,
    ] = await Promise.all([
      fetchAddressInfo(
        implementationAddress,
        apiKey
      ),

      fetchSmartContractInfo(
        implementationAddress,
        apiKey
      ),
    ]);
  }

  const implementationVerificationStatus =
    getVerificationStatus(
      implementationAddressInfo,
      implementationSmartContractInfo
    );

  const implementationAbi =
    normalizeAbi(
      implementationSmartContractInfo
        ?.abi
    );

  const effectiveAbi =
    hasMultipleImplementations
      ? null
      : implementationAbi ??
        contractAbi;

  const abiSource:
    ArcAbiSource =
    hasMultipleImplementations
      ? null
      : implementationAbi !==
          null
        ? "implementation"
        : contractAbi !==
            null
          ? "contract"
          : null;

  const abiVerificationStatus =
    abiSource ===
    "implementation"
      ? implementationVerificationStatus
      : abiSource ===
          "contract"
        ? verificationStatus
        : "unknown";

  const abiEvidenceQuality =
    getAbiEvidenceQuality(
      effectiveAbi,
      abiVerificationStatus
    );

  const hasOwnerFunction =
    detectOwnerFunction(
      effectiveAbi,
      abiEvidenceQuality
    );

  return {
    isContract:
      normalizeBoolean(
        addressInfo
          .is_contract
      ),

    verificationStatus,

    isVerifiedViaSourcify:
      normalizeBoolean(
        smartContractInfo
          ?.is_verified_via_sourcify
      ),

    isVerifiedViaEthBytecodeDb:
      normalizeBoolean(
        smartContractInfo
          ?.is_verified_via_eth_bytecode_db
      ),

    contractName:
      smartContractInfo
        ?.name ??
      addressInfo.name ??
      null,

    proxyType,

    implementationAddress,

    implementationAddresses,

    hasMultipleImplementations,

    implementationVerificationStatus,

    implementationIsVerifiedViaSourcify:
      normalizeBoolean(
        implementationSmartContractInfo
          ?.is_verified_via_sourcify
      ),

    implementationIsVerifiedViaEthBytecodeDb:
      normalizeBoolean(
        implementationSmartContractInfo
          ?.is_verified_via_eth_bytecode_db
      ),

    implementationContractName:
      implementationSmartContractInfo
        ?.name ??
      implementationAddressInfo
        ?.name ??
      null,

    abi:
      effectiveAbi,

    abiSource,

    abiVerificationStatus,

    abiEvidenceQuality,

    hasOwnerFunction,
  };
}