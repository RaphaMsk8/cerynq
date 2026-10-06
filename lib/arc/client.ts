import {
  createPublicClient,
  http,
} from "viem";

const ARC_MAINNET_RPC_URL =
  "https://rpc.mainnet.arc.io";

const ARC_RPC_TIMEOUT_MS = 8_000;

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
        ARC_MAINNET_RPC_URL,
      ],
    },
  },
} as const;

export const arcClient =
  createPublicClient({
    chain: arcMainnet,

    transport: http(
      ARC_MAINNET_RPC_URL,
      {
        timeout:
          ARC_RPC_TIMEOUT_MS,

        retryCount: 1,

        retryDelay: 500,
      }
    ),
  });