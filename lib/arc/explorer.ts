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
  proxy_type?: string | null;
  implementations?: Array<{
    address_hash?: string;
    name?: string | null;
  }>;
  abi?: AbiItem[] | null;
};

export type ArcExplorerMetadata = {
  isContract: boolean | null;
  isVerified: boolean | null;
  contractName: string | null;

  proxyType: string | null;
  implementationAddress: string | null;

  implementationIsVerified: boolean | null;
  implementationContractName: string | null;

  abi: AbiItem[] | null;
  abiSource:
    | "contract"
    | "implementation"
    | null;

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

function detectOwnerFunction(
  abi: AbiItem[] | null
) {
  if (abi === null) {
    return null;
  }

  return abi.some(
    (item) =>
      item.type === "function" &&
      item.name === "owner" &&
      (item.inputs?.length ?? 0) === 0
  );
}

export async function getArcExplorerMetadata(
  address: string
): Promise<ArcExplorerMetadata> {
  const apiKey = getApiKey();

  const addressInfo =
    await fetchAddressInfo(
      address,
      apiKey
    );

  if (addressInfo === null) {
    throw new Error(
      "Address was not found by Arc Explorer"
    );
  }

  let smartContractInfo:
    | SmartContractInfo
    | null = null;

  if (addressInfo.is_contract) {
    smartContractInfo =
      await fetchSmartContractInfo(
        address,
        apiKey
      );
  }

  const proxyType =
    smartContractInfo?.proxy_type ?? null;

  const implementationAddress =
    smartContractInfo?.implementations?.[0]
      ?.address_hash ?? null;

  const contractAbi =
    smartContractInfo?.abi ?? null;

  let implementationAddressInfo:
    | AddressInfo
    | null = null;

  let implementationSmartContractInfo:
    | SmartContractInfo
    | null = null;

  if (implementationAddress) {
    implementationAddressInfo =
      await fetchAddressInfo(
        implementationAddress,
        apiKey
      );

    implementationSmartContractInfo =
      await fetchSmartContractInfo(
        implementationAddress,
        apiKey
      );
  }

  const implementationAbi =
    implementationSmartContractInfo?.abi ??
    null;

  const effectiveAbi =
    implementationAbi ?? contractAbi;

  const abiSource =
    implementationAbi !== null
      ? "implementation"
      : contractAbi !== null
        ? "contract"
        : null;

  const hasOwnerFunction =
    detectOwnerFunction(effectiveAbi);

  return {
    isContract:
      typeof addressInfo.is_contract ===
      "boolean"
        ? addressInfo.is_contract
        : null,

    isVerified:
      typeof addressInfo.is_verified ===
      "boolean"
        ? addressInfo.is_verified
        : null,

    contractName:
      smartContractInfo?.name ??
      addressInfo.name ??
      null,

    proxyType,

    implementationAddress,

    implementationIsVerified:
      typeof implementationAddressInfo
        ?.is_verified === "boolean"
        ? implementationAddressInfo.is_verified
        : null,

    implementationContractName:
      implementationSmartContractInfo?.name ??
      implementationAddressInfo?.name ??
      null,

    abi: effectiveAbi,

    abiSource,

    hasOwnerFunction,
  };
}