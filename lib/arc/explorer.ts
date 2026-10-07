const BLOCKSCOUT_BASE_URL =
  "https://api.blockscout.com/5042/api/v2";

const BLOCKSCOUT_TIMEOUT_MS = 8_000;

type AbiItem = {
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

export type ArcAbiSource =
  | "contract"
  | "implementation"
  | null;

export type ArcExplorerMetadata = {
  isContract: boolean | null;

  verificationStatus: ArcVerificationStatus;

  isVerifiedViaSourcify: boolean | null;
  isVerifiedViaEthBytecodeDb: boolean | null;

  contractName: string | null;

  proxyType: string | null;

  implementationAddress: string | null;
  implementationAddresses: string[];
  hasMultipleImplementations: boolean;

  implementationVerificationStatus: ArcVerificationStatus;

  implementationIsVerifiedViaSourcify: boolean | null;
  implementationIsVerifiedViaEthBytecodeDb: boolean | null;

  implementationContractName: string | null;

  abi: AbiItem[] | null;
  abiSource: ArcAbiSource;

  abiVerificationStatus: ArcVerificationStatus;
  abiEvidenceQuality: ArcAbiEvidenceQuality;

  hasOwnerFunction: boolean | null;
};

class BlockscoutHttpError extends Error {
  status: number;

  constructor(
    status: number,
    endpoint: string
  ) {
    super(
      `Blockscout request failed with status ${status} for ${endpoint}`
    );

    this.name = "BlockscoutHttpError";
    this.status = status;
  }
}

function getApiKey() {
  const apiKey =
    process.env.BLOCKSCOUT_API_KEY;

  if (!apiKey) {
    throw new Error(
      "BLOCKSCOUT_API_KEY is not configured"
    );
  }

  return apiKey;
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
    const separator = endpoint.includes("?")
      ? "&"
      : "?";

    const response = await fetch(
      `${BLOCKSCOUT_BASE_URL}${endpoint}${separator}apikey=${encodeURIComponent(
        apiKey
      )}`,
      {
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
        signal: controller.signal,
      }
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new BlockscoutHttpError(
        response.status,
        endpoint
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new Error(
        `Blockscout request timed out after ${BLOCKSCOUT_TIMEOUT_MS}ms`
      );
    }

    throw error;
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
): AbiItem[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized = value.filter(
    (item): item is AbiItem =>
      typeof item === "object" &&
      item !== null
  );

  if (normalized.length === 0) {
    return null;
  }

  return normalized;
}

function getVerificationStatus(
  addressInfo: AddressInfo | null,
  smartContractInfo: SmartContractInfo | null
): ArcVerificationStatus {
  if (
    smartContractInfo?.is_fully_verified ===
    true
  ) {
    return "fully_verified";
  }

  if (
    smartContractInfo
      ?.is_partially_verified === true
  ) {
    return "partially_verified";
  }

  const explicitVerification =
    typeof smartContractInfo?.is_verified ===
    "boolean"
      ? smartContractInfo.is_verified
      : addressInfo?.is_verified;

  if (explicitVerification === false) {
    return "unverified";
  }

  if (explicitVerification === true) {
    return "verified";
  }

  return "unknown";
}

function getAbiEvidenceQuality(
  abi: AbiItem[] | null,
  verificationStatus: ArcVerificationStatus
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
  smartContractInfo: SmartContractInfo | null
): string[] {
  const addresses =
    smartContractInfo?.implementations
      ?.map(
        (implementation) =>
          implementation.address_hash
      )
      .filter(
        (address): address is string =>
          typeof address === "string" &&
          address.length > 0
      ) ?? [];

  return [...new Set(addresses)];
}

function detectOwnerFunction(
  abi: AbiItem[] | null,
  abiEvidenceQuality: ArcAbiEvidenceQuality
): boolean | null {
  if (abi === null) {
    return null;
  }

  const ownerFound = abi.some(
    (item) =>
      item.type === "function" &&
      item.name === "owner" &&
      (item.inputs?.length ?? 0) === 0
  );

  if (ownerFound) {
    return true;
  }

  if (abiEvidenceQuality === "full") {
    return false;
  }

  return null;
}

export async function getArcExplorerMetadata(
  address: string
): Promise<ArcExplorerMetadata> {
  const apiKey = getApiKey();

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

  if (addressInfo === null) {
    throw new Error(
      "Address was not found by Arc Explorer"
    );
  }

  const verificationStatus =
    getVerificationStatus(
      addressInfo,
      smartContractInfo
    );

  const contractAbi = normalizeAbi(
    smartContractInfo?.abi
  );

  const proxyType =
    smartContractInfo?.proxy_type ?? null;

  const implementationAddresses =
    getImplementationAddresses(
      smartContractInfo
    );

  const hasMultipleImplementations =
    implementationAddresses.length > 1;

  const implementationAddress =
    implementationAddresses.length === 1
      ? implementationAddresses[0]
      : null;

  let implementationAddressInfo:
    | AddressInfo
    | null = null;

  let implementationSmartContractInfo:
    | SmartContractInfo
    | null = null;

  if (implementationAddress) {
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

  const implementationAbi = normalizeAbi(
    implementationSmartContractInfo?.abi
  );

  const effectiveAbi =
    hasMultipleImplementations
      ? null
      : implementationAbi ??
        contractAbi;

  const abiSource: ArcAbiSource =
    hasMultipleImplementations
      ? null
      : implementationAbi !== null
        ? "implementation"
        : contractAbi !== null
          ? "contract"
          : null;

  const abiVerificationStatus =
    abiSource === "implementation"
      ? implementationVerificationStatus
      : abiSource === "contract"
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
        addressInfo.is_contract
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
      smartContractInfo?.name ??
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
      implementationSmartContractInfo?.name ??
      implementationAddressInfo?.name ??
      null,

    abi: effectiveAbi,

    abiSource,

    abiVerificationStatus,

    abiEvidenceQuality,

    hasOwnerFunction,
  };
}