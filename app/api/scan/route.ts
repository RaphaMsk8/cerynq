import { NextResponse } from "next/server";

import {
  getAddress,
  isAddress,
} from "viem";

import { z } from "zod";

import { arcClient } from "@/lib/arc/client";
import { getArcExplorerMetadata } from "@/lib/arc/explorer";

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
    this.name = "RequestBodyTooLargeError";
  }
}

function jsonResponse(
  body: unknown,
  init?: ResponseInit
) {
  const response = NextResponse.json(
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
        ?.trim() ?? null
    );
  }

  const realIp =
    request.headers.get("x-real-ip");

  return realIp?.trim() || null;
}

function cleanupRateLimitStore(
  now: number
) {
  if (rateLimitStore.size < 5000) {
    return;
  }

  for (const [
    ip,
    record,
  ] of rateLimitStore) {
    if (record.resetAt <= now) {
      rateLimitStore.delete(ip);
    }
  }

  if (rateLimitStore.size > 10_000) {
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

  const now = Date.now();

  cleanupRateLimitStore(now);

  const existing =
    rateLimitStore.get(ip);

  if (
    !existing ||
    existing.resetAt <= now
  ) {
    rateLimitStore.set(ip, {
      count: 1,
      resetAt:
        now +
        RATE_LIMIT_WINDOW_MS,
    });

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
      retryAfter: Math.max(
        1,
        Math.ceil(
          (existing.resetAt - now) /
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
    request.body?.getReader();

  if (!reader) {
    return "";
  }

  const decoder = new TextDecoder();

  let totalBytes = 0;
  let rawBody = "";

  try {
    while (true) {
      const {
        done,
        value,
      } = await reader.read();

      if (done) {
        break;
      }

      totalBytes += value.byteLength;

      if (totalBytes > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // The request is already being rejected.
        }

        throw new RequestBodyTooLargeError();
      }

      rawBody += decoder.decode(
        value,
        {
          stream: true,
        }
      );
    }

    rawBody += decoder.decode();

    return rawBody;
  } finally {
    reader.releaseLock();
  }
}

export async function POST(
  request: Request
) {
  try {
    const rateLimit =
      checkRateLimit(
        getClientIp(request)
      );

    if (!rateLimit.allowed) {
      const response = jsonResponse(
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
        rateLimit.retryAfter !== null
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
        Number(contentLength);

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
      body = JSON.parse(rawBody);
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
      scanSchema.safeParse(body);

    if (!parsed.success) {
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

    const [
      bytecode,
      explorerMetadata,
    ] = await Promise.all([
      arcClient.getBytecode({
        address,
      }),

      getArcExplorerMetadata(
        address
      ).catch((error) => {
        console.error(
          "Arc Explorer metadata error:",
          error
        );

        return null;
      }),
    ]);

    const isContract = Boolean(
      bytecode &&
        bytecode !== "0x"
    );

    const bytecodeSize =
      bytecode
        ? Math.max(
            (bytecode.length - 2) /
              2,
            0
          )
        : 0;

    const abi =
      explorerMetadata?.abi ?? null;

    const abiSource =
      explorerMetadata?.abiSource ??
      null;

    const abiEvidenceQuality =
      explorerMetadata
        ?.abiEvidenceQuality ??
      "unknown";

    const ownershipFinding =
      isContract
        ? await detectOwnership(
            address,
            {
              hasOwnerFunction:
                explorerMetadata
                  ?.hasOwnerFunction ??
                null,

              abiSource,
            }
          )
        : null;

    const pauseFinding =
      isContract
        ? detectPauseCapability({
            abi,
            abiSource,
            abiEvidenceQuality,
          })
        : null;

    const blacklistFinding =
      isContract
        ? detectBlacklistCapability({
            abi,
            abiSource,
            abiEvidenceQuality,
          })
        : null;

    const whitelistFinding =
      isContract
        ? detectWhitelistCapability({
            abi,
            abiSource,
            abiEvidenceQuality,
          })
        : null;

    const privilegedFinding =
      isContract
        ? detectOtherPrivilegedControls({
            abi,
            abiSource,
            abiEvidenceQuality,
          })
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
      network: "Arc Mainnet",
      chainId: 5042,
      address,
      isContract,

      contractType: isContract
        ? "contract"
        : "eoa",

      bytecodeDetected:
        isContract,

      bytecodeSize,

      explorer: {
        available:
          explorerMetadata !==
          null,

        verificationStatus:
          explorerMetadata
            ?.verificationStatus ??
          "unknown",

        isVerifiedViaSourcify:
          explorerMetadata
            ?.isVerifiedViaSourcify ??
          null,

        isVerifiedViaEthBytecodeDb:
          explorerMetadata
            ?.isVerifiedViaEthBytecodeDb ??
          null,

        contractName:
          explorerMetadata
            ?.contractName ??
          null,

        proxyType:
          explorerMetadata
            ?.proxyType ??
          null,

        implementationAddress:
          explorerMetadata
            ?.implementationAddress ??
          null,

        implementationAddresses:
          explorerMetadata
            ?.implementationAddresses ??
          [],

        hasMultipleImplementations:
          explorerMetadata
            ?.hasMultipleImplementations ??
          false,

        implementationVerificationStatus:
          explorerMetadata
            ?.implementationVerificationStatus ??
          "unknown",

        implementationIsVerifiedViaSourcify:
          explorerMetadata
            ?.implementationIsVerifiedViaSourcify ??
          null,

        implementationIsVerifiedViaEthBytecodeDb:
          explorerMetadata
            ?.implementationIsVerifiedViaEthBytecodeDb ??
          null,

        implementationContractName:
          explorerMetadata
            ?.implementationContractName ??
          null,

        abiAvailable:
          explorerMetadata?.abi !==
            null &&
          explorerMetadata?.abi !==
            undefined,

        abiSource,

        abiVerificationStatus:
          explorerMetadata
            ?.abiVerificationStatus ??
          "unknown",

        abiEvidenceQuality,

        hasOwnerFunction:
          explorerMetadata
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