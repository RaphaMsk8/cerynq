import type {
  ArcAbiEvidenceQuality,
  ArcAbiItem,
  ArcVerificationStatus,
} from "@/lib/arc/evidence";

import {
  ArcProviderError,
  type ArcProviderFailureReason,
} from "@/lib/arc/provider";

const DEFAULT_SOURCIFY_BASE_URL =
  "https://sourcify.dev/server/v2";

const SOURCIFY_TIMEOUT_MS = 8_000;

const ARC_MAINNET_CHAIN_ID = 5042;

function getSourcifyBaseUrl(): string {
  const configuredBaseUrl =
    process.env.SOURCIFY_BASE_URL?.trim();

  return (
    configuredBaseUrl ||
    DEFAULT_SOURCIFY_BASE_URL
  ).replace(/\/+$/, "");
}

const sourcifyBaseUrl =
  getSourcifyBaseUrl();

type SourcifyProxyResolution = {
  isProxy?: boolean;

  proxyType?: string | null;

  implementations?: Array<{
    address?: string;
  }>;
};

type SourcifyCompilation = {
  name?: string | null;
};

type SourcifyContractResponse = {
  abi?: unknown;

  compilation?:
    | SourcifyCompilation
    | null;

  proxyResolution?:
    | SourcifyProxyResolution
    | null;

  match?: string | null;

  creationMatch?: string | null;

  runtimeMatch?: string | null;
};

export type SourcifyContractMetadata = {
  available: boolean;

  contractName:
    string | null;

  abi:
    | ArcAbiItem[]
    | null;

  verificationStatus:
    ArcVerificationStatus;

  abiEvidenceQuality:
    ArcAbiEvidenceQuality;

  isProxy:
    boolean | null;

  proxyType:
    string | null;

  implementationAddresses:
    string[];
};

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

function normalizeMatchStatus(
  response:
    SourcifyContractResponse
): string | null {
  return (
    response.match ??
    response.runtimeMatch ??
    response.creationMatch ??
    null
  );
}

function getVerificationStatus(
  matchStatus: string | null
): ArcVerificationStatus {
  if (
    matchStatus ===
    "exact_match"
  ) {
    return "fully_verified";
  }

  if (
    matchStatus === "match"
  ) {
    return "partially_verified";
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
  proxyResolution:
    | SourcifyProxyResolution
    | null
    | undefined
): string[] {
  const addresses =
    proxyResolution
      ?.implementations
      ?.map(
        (
          implementation
        ) =>
          implementation.address
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

export async function getSourcifyContractMetadata(
  address: string
): Promise<
  SourcifyContractMetadata | null
> {
  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => {
      controller.abort();
    },
    SOURCIFY_TIMEOUT_MS
  );

  try {
    const fields =
      "abi,compilation,proxyResolution";

    const response = await fetch(
      `${sourcifyBaseUrl}/contract/${ARC_MAINNET_CHAIN_ID}/${address}?fields=${fields}`,
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

    if (
      response.status === 404
    ) {
      return null;
    }

    if (!response.ok) {
      const reason =
        getHttpFailureReason(
          response.status
        );

      throw new ArcProviderError(
        "sourcify",
        reason,
        `Sourcify request failed with status ${response.status} for ${address}`,
        response.status
      );
    }

    let data:
      SourcifyContractResponse;

    try {
      data =
        (await response.json()) as
          SourcifyContractResponse;
    } catch (error) {
      if (
        error instanceof Error &&
        error.name ===
          "AbortError"
      ) {
        throw new ArcProviderError(
          "sourcify",
          "timeout",
          `Sourcify request timed out after ${SOURCIFY_TIMEOUT_MS}ms`
        );
      }

      throw new ArcProviderError(
        "sourcify",
        "invalid_response",
        `Sourcify returned invalid JSON for ${address}`
      );
    }

    const abi =
      normalizeAbi(
        data.abi
      );

    const matchStatus =
      normalizeMatchStatus(
        data
      );

    const verificationStatus =
      getVerificationStatus(
        matchStatus
      );

    const abiEvidenceQuality =
      getAbiEvidenceQuality(
        abi,
        verificationStatus
      );

    const proxyResolution =
      data.proxyResolution ??
      null;

    return {
      available: true,

      contractName:
        data.compilation?.name ??
        null,

      abi,

      verificationStatus,

      abiEvidenceQuality,

      isProxy:
        typeof proxyResolution
          ?.isProxy ===
        "boolean"
          ? proxyResolution
              .isProxy
          : null,

      proxyType:
        proxyResolution
          ?.proxyType ??
        null,

      implementationAddresses:
        getImplementationAddresses(
          proxyResolution
        ),
    };
  } catch (error) {
    if (
      error instanceof
      ArcProviderError
    ) {
      throw error;
    }

    if (
      error instanceof Error &&
      error.name ===
        "AbortError"
    ) {
      throw new ArcProviderError(
        "sourcify",
        "timeout",
        `Sourcify request timed out after ${SOURCIFY_TIMEOUT_MS}ms`
      );
    }

    throw new ArcProviderError(
      "sourcify",
      "network_error",
      `Sourcify network request failed for ${address}`
    );
  } finally {
    clearTimeout(timeout);
  }
}