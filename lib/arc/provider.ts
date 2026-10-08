export type ArcDataProvider =
  | "blockscout"
  | "sourcify";

export type ArcProviderOperationalStatus =
  | "available"
  | "not_found"
  | "rate_limited"
  | "unauthorized"
  | "timeout"
  | "server_error"
  | "network_error"
  | "configuration_error"
  | "invalid_response"
  | "http_error"
  | "error"
  | "not_used";

export type ArcProviderFailureReason =
  | "rate_limited"
  | "unauthorized"
  | "timeout"
  | "server_error"
  | "network_error"
  | "configuration_error"
  | "invalid_response"
  | "http_error";

export type ArcProviderState = {
  status:
    ArcProviderOperationalStatus;

  usedForAbi: boolean;
};

export class ArcProviderError
  extends Error {
  provider: ArcDataProvider;

  reason:
    ArcProviderFailureReason;

  statusCode:
    number | null;

  constructor(
    provider: ArcDataProvider,
    reason: ArcProviderFailureReason,
    message: string,
    statusCode: number | null = null
  ) {
    super(message);

    this.name = "ArcProviderError";

    this.provider = provider;
    this.reason = reason;
    this.statusCode = statusCode;
  }
}

export function getProviderFailureStatus(
  provider: ArcDataProvider,
  error: unknown
): ArcProviderOperationalStatus {
  if (
    error instanceof ArcProviderError &&
    error.provider === provider
  ) {
    return error.reason;
  }

  return "error";
}