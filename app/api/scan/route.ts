import { NextResponse } from "next/server";

import {
  getAddress,
  isAddress,
} from "viem";

import { z } from "zod";

import { arcClient } from "@/lib/arc/client";
import { resolveArcEvidence } from "@/lib/arc/resolver";

import { detectOwnership } from "@/lib/detectors/ownership";
import { detectPauseCapability } from "@/lib/detectors/pause";
import { detectBlacklistCapability } from "@/lib/detectors/blacklist";
import { detectWhitelistCapability } from "@/lib/detectors/whitelist";
import { detectOtherPrivilegedControls } from "@/lib/detectors/privileged";

import { calculateRisk } from "@/lib/risk/engine";

const MAX_BODY_BYTES = 1024;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

type OperationalStatus =
  | "normal"
  | "degraded"
  | "limited"
  | "unavailable";

const rateLimitStore = new Map<
  string,
  RateLimitRecord
>();

const scanSchema = z
  .object({
    address: z
      .string()
      .trim()
      .length(42)
      .refine(isAddress, {
        message: "Invalid EVM address",
      }),
  })
  .strict();

class RequestBodyTooLargeError extends Error {
  constructor() {
    super("Request body is too large");

    this.name =
      "RequestBodyTooLargeError";
  }
}

function jsonResponse(
  body: unknown,
  init?: ResponseInit
) {
  const response =
    NextResponse.json(
      body,
      init
    );

  response.headers.set(
    "Cache-Control",
    "no-store"
  );

  return response;
}

function getClientIp(
  request: Request
): string | null {
  const forwardedFor =
    request.headers.get(
      "x-forwarded-for"
    );

  if (forwardedFor) {
    return (
      forwardedFor
        .split(",")[0]
        ?.trim() ??
      null
    );
  }

  const realIp =
    request.headers.get(
      "x-real-ip"
    );

  return (
    realIp?.trim() ||
    null
  );
}

function cleanupRateLimitStore(
  now: number
) {
  if (
    rateLimitStore.size <
    5000
  ) {
    return;
  }

  for (const [
    ip,
    record,
  ] of rateLimitStore) {
    if (
      record.resetAt <= now
    ) {
      rateLimitStore.delete(
        ip
      );
    }
  }

  if (
    rateLimitStore.size >
    10_000
  ) {
    rateLimitStore.clear();
  }
}

function checkRateLimit(
  ip: string | null
) {
  if (!ip) {
    return {
      allowed: true,
      retryAfter: null,
    };
  }

  const now =
    Date.now();

  cleanupRateLimitStore(
    now
  );

  const existing =
    rateLimitStore.get(ip);

  if (
    !existing ||
    existing.resetAt <= now
  ) {
    rateLimitStore.set(
      ip,
      {
        count: 1,

        resetAt:
          now +
          RATE_LIMIT_WINDOW_MS,
      }
    );

    return {
      allowed: true,
      retryAfter: null,
    };
  }

  if (
    existing.count >=
    RATE_LIMIT_MAX_REQUESTS
  ) {
    return {
      allowed: false,

      retryAfter:
        Math.max(
          1,
          Math.ceil(
            (
              existing.resetAt -
              now
            ) /
              1000
          )
        ),
    };
  }

  existing.count += 1;

  return {
    allowed: true,
    retryAfter: null,
  };
}

async function readRequestBodyWithLimit(
  request: Request,
  maxBytes: number
): Promise<string> {
  const reader =
    request.body
      ?.getReader();

  if (!reader) {
    return "";
  }

  const decoder =
    new TextDecoder();

  let totalBytes = 0;

  let rawBody = "";

  try {
    while (true) {
      const {
        done,
        value,
      } =
        await reader.read();

      if (done) {
        break;
      }

      totalBytes +=
        value.byteLength;

      if (
        totalBytes >
        maxBytes
      ) {
        try {
          await reader.cancel();
        } catch {
          // The request is already being rejected.
        }

        throw new RequestBodyTooLargeError();
      }

      rawBody +=
        decoder.decode(
          value,
          {
            stream: true,
          }
        );
    }

    rawBody +=
      decoder.decode();

    return rawBody;
  } finally {
    reader.releaseLock();
  }
}

function getOperationalStatus(
  isContract: boolean,
  abiProvider:
    | "blockscout"
    | "sourcify"
    | null
): OperationalStatus {
  if (!isContract) {
    return "normal";
  }

  if (
    abiProvider ===
    "blockscout"
  ) {
    return "normal";
  }

  if (
    abiProvider ===
    "sourcify"
  ) {
    return "degraded";
  }

  return "limited";
}

export async function POST(
  request: Request
) {
  try {
    const rateLimit =
      checkRateLimit(
        getClientIp(
          request
        )
      );

    if (
      !rateLimit.allowed
    ) {
      const response =
        jsonResponse(
          {
            ok: false,

            error:
              "Too many scan requests. Please try again shortly.",
          },
          {
            status: 429,
          }
        );

      if (
        rateLimit.retryAfter !==
        null
      ) {
        response.headers.set(
          "Retry-After",
          String(
            rateLimit.retryAfter
          )
        );
      }

      return response;
    }

    const contentType =
      request.headers.get(
        "content-type"
      );

    if (
      !contentType
        ?.toLowerCase()
        .startsWith(
          "application/json"
        )
    ) {
      return jsonResponse(
        {
          ok: false,

          error:
            "Content-Type must be application/json",
        },
        {
          status: 415,
        }
      );
    }

    const contentLength =
      request.headers.get(
        "content-length"
      );

    if (contentLength) {
      const parsedContentLength =
        Number(
          contentLength
        );

      if (
        Number.isFinite(
          parsedContentLength
        ) &&
        parsedContentLength >
          MAX_BODY_BYTES
      ) {
        return jsonResponse(
          {
            ok: false,

            error:
              "Request body is too large",
          },
          {
            status: 413,
          }
        );
      }
    }

    let rawBody: string;

    try {
      rawBody =
        await readRequestBodyWithLimit(
          request,
          MAX_BODY_BYTES
        );
    } catch (error) {
      if (
        error instanceof
        RequestBodyTooLargeError
      ) {
        return jsonResponse(
          {
            ok: false,

            error:
              "Request body is too large",
          },
          {
            status: 413,
          }
        );
      }

      throw error;
    }

    let body: unknown;

    try {
      body =
        JSON.parse(
          rawBody
        );
    } catch {
      return jsonResponse(
        {
          ok: false,

          error:
            "Invalid JSON body",
        },
        {
          status: 400,
        }
      );
    }

    const parsed =
      scanSchema.safeParse(
        body
      );

    if (
      !parsed.success
    ) {
      return jsonResponse(
        {
          ok: false,

          error:
            "Invalid address",
        },
        {
          status: 400,
        }
      );
    }

    const address =
      getAddress(
        parsed.data.address
      );

    let bytecode;

    try {
      bytecode =
        await arcClient.getBytecode(
          {
            address,
          }
        );
    } catch (error) {
      console.error(
        "Arc Mainnet RPC error:",
        error
      );

      return jsonResponse(
        {
          ok: false,

          network:
            "Arc Mainnet",

          chainId:
            5042,

          address,

          operationalStatus:
            "unavailable",

          error:
            "Arc Mainnet is temporarily unavailable. Cerynq could not complete this scan.",
        },
        {
          status: 503,
        }
      );
    }

    const isContract =
      Boolean(
        bytecode &&
        bytecode !== "0x"
      );

    const bytecodeSize =
      bytecode
        ? Math.max(
            (
              bytecode.length -
              2
            ) /
              2,
            0
          )
        : 0;

    const evidenceResolution =
      isContract
        ? await resolveArcEvidence(
            address,
            bytecode
          )
        : null;

    const blockscoutMetadata =
      evidenceResolution
        ?.blockscout ??
      null;

    const sourcifyMetadata =
      evidenceResolution
        ?.sourcify ??
      null;

    const providerStates =
      evidenceResolution
        ?.providers ?? {
        blockscout: {
          status:
            "not_used" as const,

          usedForAbi:
            false,
        },

        sourcify: {
          status:
            "not_used" as const,

          usedForAbi:
            false,
        },
      };

    const onchainProxy =
      evidenceResolution
        ?.onchainProxy ??
      null;

    const abi =
      evidenceResolution
        ?.abiEvidence
        .abi ??
      null;

    const abiProvider =
      evidenceResolution
        ?.abiEvidence
        .provider ??
      null;

    const abiSource =
      evidenceResolution
        ?.abiEvidence
        .source ??
      null;

    const abiVerificationStatus =
      evidenceResolution
        ?.abiEvidence
        .verificationStatus ??
      "unknown";

    const abiEvidenceQuality =
      evidenceResolution
        ?.abiEvidence
        .quality ??
      "unknown";

    const hasOwnerFunction =
      evidenceResolution
        ?.hasOwnerFunction ??
      null;

    const proxyType =
      onchainProxy
        ?.proxyType ??
      blockscoutMetadata
        ?.proxyType ??
      sourcifyMetadata
        ?.proxyType ??
      null;

    const implementationAddress =
      onchainProxy
        ?.implementationAddress ??
      blockscoutMetadata
        ?.implementationAddress ??
      null;

    const implementationAddresses =
      onchainProxy
        ? [
            onchainProxy
              .implementationAddress,
          ]
        : blockscoutMetadata
              ?.implementationAddresses
              .length
          ? blockscoutMetadata
              .implementationAddresses
          : implementationAddress
            ? [
                implementationAddress,
              ]
            : [];

    const hasMultipleImplementations =
      onchainProxy
        ? false
        : blockscoutMetadata
            ?.hasMultipleImplementations ??
          false;

    const contractVerificationStatus =
      abiProvider ===
        "sourcify" &&
      abiSource ===
        "contract"
        ? abiVerificationStatus
        : blockscoutMetadata
            ?.verificationStatus ??
          "unknown";

    const implementationVerificationStatus =
      abiProvider ===
        "sourcify" &&
      abiSource ===
        "implementation"
        ? abiVerificationStatus
        : blockscoutMetadata
            ?.implementationVerificationStatus ??
          "unknown";

    const contractName =
      blockscoutMetadata
        ?.contractName ??
      (
        abiProvider ===
          "sourcify" &&
        abiSource ===
          "contract"
          ? sourcifyMetadata
              ?.contractName
          : null
      ) ??
      null;

    const implementationContractName =
      blockscoutMetadata
        ?.implementationContractName ??
      (
        abiProvider ===
          "sourcify" &&
        abiSource ===
          "implementation"
          ? sourcifyMetadata
              ?.contractName
          : null
      ) ??
      null;

    const operationalStatus =
      getOperationalStatus(
        isContract,
        abiProvider
      );

    if (isContract) {
      console.info(
        "Cerynq evidence resolution:",
        {
          address,

          operationalStatus,

          abiProvider,

          abiSource,

          blockscout:
            providerStates
              .blockscout
              .status,

          sourcify:
            providerStates
              .sourcify
              .status,

          proxyType,

          implementationAddress,
        }
      );
    }

    const ownershipFinding =
      isContract
        ? await detectOwnership(
            address,
            {
              hasOwnerFunction,

              abiProvider,

              abiSource,
            }
          )
        : null;

    const pauseFinding =
      isContract
        ? detectPauseCapability(
            {
              abi,

              abiProvider,

              abiSource,

              abiEvidenceQuality,
            }
          )
        : null;

    const blacklistFinding =
      isContract
        ? detectBlacklistCapability(
            {
              abi,

              abiProvider,

              abiSource,

              abiEvidenceQuality,
            }
          )
        : null;

    const whitelistFinding =
      isContract
        ? detectWhitelistCapability(
            {
              abi,

              abiProvider,

              abiSource,

              abiEvidenceQuality,
            }
          )
        : null;

    const privilegedFinding =
      isContract
        ? detectOtherPrivilegedControls(
            {
              abi,

              abiProvider,

              abiSource,

              abiEvidenceQuality,
            }
          )
        : null;

    const risk =
      isContract &&
      ownershipFinding &&
      pauseFinding &&
      blacklistFinding &&
      whitelistFinding &&
      privilegedFinding
        ? calculateRisk([
            ownershipFinding,

            pauseFinding,

            blacklistFinding,

            whitelistFinding,

            privilegedFinding,
          ])
        : null;

    return jsonResponse({
      ok: true,

      network:
        "Arc Mainnet",

      chainId:
        5042,

      address,

      operationalStatus,

      isContract,

      contractType:
        isContract
          ? "contract"
          : "eoa",

      bytecodeDetected:
        isContract,

      bytecodeSize,

      providers: {
        blockscout:
          providerStates
            .blockscout,

        sourcify:
          providerStates
            .sourcify,
      },

      intelligence: {
        proxyType,

        implementationAddress,

        implementationAddresses,

        hasMultipleImplementations,

        contractName,

        implementationContractName,

        abiAvailable:
          abi !== null,

        abiProvider,

        abiSource,

        abiVerificationStatus,

        abiEvidenceQuality,

        hasOwnerFunction,

        contractVerificationStatus,

        implementationVerificationStatus,
      },

      explorer: {
        available:
          blockscoutMetadata !==
          null,

        verificationStatus:
          blockscoutMetadata
            ?.verificationStatus ??
          "unknown",

        isVerifiedViaSourcify:
          blockscoutMetadata
            ?.isVerifiedViaSourcify ??
          null,

        isVerifiedViaEthBytecodeDb:
          blockscoutMetadata
            ?.isVerifiedViaEthBytecodeDb ??
          null,

        contractName:
          blockscoutMetadata
            ?.contractName ??
          null,

        proxyType:
          blockscoutMetadata
            ?.proxyType ??
          null,

        implementationAddress:
          blockscoutMetadata
            ?.implementationAddress ??
          null,

        implementationAddresses:
          blockscoutMetadata
            ?.implementationAddresses ??
          [],

        hasMultipleImplementations:
          blockscoutMetadata
            ?.hasMultipleImplementations ??
          false,

        implementationVerificationStatus:
          blockscoutMetadata
            ?.implementationVerificationStatus ??
          "unknown",

        implementationIsVerifiedViaSourcify:
          blockscoutMetadata
            ?.implementationIsVerifiedViaSourcify ??
          null,

        implementationIsVerifiedViaEthBytecodeDb:
          blockscoutMetadata
            ?.implementationIsVerifiedViaEthBytecodeDb ??
          null,

        implementationContractName:
          blockscoutMetadata
            ?.implementationContractName ??
          null,

        abiAvailable:
          blockscoutMetadata
            ?.abi !==
          null &&
          blockscoutMetadata
            ?.abi !==
          undefined,

        abiSource:
          blockscoutMetadata
            ?.abiSource ??
          null,

        abiVerificationStatus:
          blockscoutMetadata
            ?.abiVerificationStatus ??
          "unknown",

        abiEvidenceQuality:
          blockscoutMetadata
            ?.abiEvidenceQuality ??
          "unknown",

        hasOwnerFunction:
          blockscoutMetadata
            ?.hasOwnerFunction ??
          null,
      },

      ownership:
        ownershipFinding,

      pause:
        pauseFinding,

      blacklist:
        blacklistFinding,

      whitelist:
        whitelistFinding,

      privileged:
        privilegedFinding,

      risk,
    });
  } catch (error) {
    console.error(
      "Cerynq scan error:",
      error
    );

    return jsonResponse(
      {
        ok: false,

        error:
          "Unable to complete the scan",
      },
      {
        status: 500,
      }
    );
  }
}