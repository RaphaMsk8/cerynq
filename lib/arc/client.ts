import { createPublicClient, http } from "viem";

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
      http: ["https://rpc.mainnet.arc.io"],
    },
  },
} as const;

export const arcClient = createPublicClient({
  chain: arcMainnet,
  transport: http(),
});