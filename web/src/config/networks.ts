import { defineChain, type Chain } from "viem";

export type NetworkKey = "testnet" | "mainnet";

export const ACTIVE_NETWORK_KEY: NetworkKey =
  (import.meta.env.VITE_ACTIVE_NETWORK_KEY as NetworkKey | undefined) ?? "testnet";

const botChainTestnet = defineChain({
  id: 968,
  name: "BOT Chain Testnet",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.bohr.life"] } },
  blockExplorers: { default: { name: "BOHR Scan", url: "https://scan.bohr.life" } }
});

const botChainMainnet = defineChain({
  id: 677,
  name: "BOT Chain",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.botchain.ai"] } },
  blockExplorers: { default: { name: "BOT Scan", url: "https://scan.botchain.ai" } }
});

export interface NetworkConfig {
  key: NetworkKey;
  label: string;
  chain: Chain;
  explorer: string;
  usdt: `0x${string}`;
  usdtDecimals: number;
  faucet?: string;
}

export const NETWORKS: Record<NetworkKey, NetworkConfig> = {
  testnet: {
    key: "testnet",
    label: "BOT Chain Testnet",
    chain: botChainTestnet,
    explorer: "https://scan.bohr.life",
    usdt: "0x75edC9335175Fc0552D51D48439F229c10420fe3",
    usdtDecimals: Number(import.meta.env.VITE_USDT_DECIMALS ?? 18),
    faucet: "https://faucet.botchain.ai/basic"
  },
  mainnet: {
    key: "mainnet",
    label: "BOT Chain Mainnet",
    chain: botChainMainnet,
    explorer: "https://scan.botchain.ai",
    usdt: "0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C",
    usdtDecimals: Number(import.meta.env.VITE_USDT_DECIMALS ?? 18)
  }
};

export const activeNetwork = NETWORKS[ACTIVE_NETWORK_KEY];

export const reownProjectId = import.meta.env.VITE_REOWN_PROJECT_ID ?? "";

export function getContractAddress(): `0x${string}` {
  const addr = (import.meta.env.VITE_CONTRACT_ADDRESS ?? "") as `0x${string}`;
  return addr && addr.startsWith("0x") ? addr : ("0x" as `0x${string}`);
}

export function contractIsDeployed(): boolean {
  const addr = import.meta.env.VITE_CONTRACT_ADDRESS ?? "";
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

export const startBlock = BigInt(import.meta.env.VITE_START_BLOCK ?? "0");
