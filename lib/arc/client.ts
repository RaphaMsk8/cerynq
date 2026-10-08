import {
  createPublicClient,
  http,
} from "viem";

const DEFAULT_ARC_MAINNET_RPC_URL =
  "https://rpc.mainnet.arc.io";

const ARC_RPC_TIMEOUT_MS = 8_000;

function getArcMainnetRpcUrl(): string {
  const configuredRpcUrl =
    process.env.ARC_MAINNET_RPC_URL?.trim();

  return (
    configuredRpcUrl ||
    DEFAULT_ARC_MAINNET_RPC_URL
  );
}

const arcMainnetRpcUrl =
  getArcMainnetRpcUrl();

const arcMainnet = {
  id: 5042,
  name: "Arc Mainnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        arcMainnetRpcUrl,
      ],
    },
  },
} as const;

export const arcClient =
  createPublicClient({
    chain: arcMainnet,

    transport: http(
      arcMainnetRpcUrl,
      {
        timeout:
          ARC_RPC_TIMEOUT_MS,

        retryCount: 1,

        retryDelay: 500,
      }
    ),
  });