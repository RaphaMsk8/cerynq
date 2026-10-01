const BLOCKSCOUT_BASE_URL = "https://api.blockscout.com/5042/api/v2";

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
};

export type ArcExplorerMetadata = {
  isContract: boolean | null;
  isVerified: boolean | null;
  contractName: string | null;
  proxyType: string | null;
  implementationAddress: string | null;
};

function getApiKey() {
  const apiKey = process.env.BLOCKSCOUT_API_KEY;

  if (!apiKey) {
    throw new Error("BLOCKSCOUT_API_KEY is not configured");
  }

  return apiKey;
}

export async function getArcExplorerMetadata(
  address: string
): Promise<ArcExplorerMetadata> {
  const apiKey = getApiKey();

  const addressResponse = await fetch(
    `${BLOCKSCOUT_BASE_URL}/addresses/${address}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    }
  );

  if (!addressResponse.ok) {
    throw new Error(
      `Blockscout address request failed with status ${addressResponse.status}`
    );
  }

  const addressInfo = (await addressResponse.json()) as AddressInfo;

  let smartContractInfo: SmartContractInfo | null = null;

  if (addressInfo.is_contract) {
    const contractResponse = await fetch(
      `${BLOCKSCOUT_BASE_URL}/smart-contracts/${address}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        cache: "no-store",
      }
    );

    if (contractResponse.ok) {
      smartContractInfo =
        (await contractResponse.json()) as SmartContractInfo;
    }
  }

  return {
    isContract:
      typeof addressInfo.is_contract === "boolean"
        ? addressInfo.is_contract
        : null,
    isVerified:
      typeof addressInfo.is_verified === "boolean"
        ? addressInfo.is_verified
        : null,
    contractName:
      smartContractInfo?.name ??
      addressInfo.name ??
      null,
    proxyType:
      smartContractInfo?.proxy_type ?? null,
    implementationAddress:
      smartContractInfo?.implementations?.[0]?.address_hash ?? null,
  };
}