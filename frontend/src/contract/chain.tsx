import { defineChain } from "viem";

export const customNetwork = defineChain({
  id: 114,
  caipNetworkId: "eip155:114",
  chainNamespace: "eip155",
  name: "Flare Coston2 Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Flare",
    symbol: "FLR",
  },
  rpcUrls: {
    default: {
      http: ["https://coston2-api.flare.network/ext/C/rpc"],
    },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://coston2-explorer.flare.network/" },
  },
  contracts: {},
});
