import { createPublicClient, custom, http, type Hash, type PublicClient, type TransactionReceipt } from "viem";
import { activeNetwork } from "../config/networks";
import { wagmiAdapter } from "./appkit";

export const wagmiConfig = wagmiAdapter.wagmiConfig;

const RPC_URL = activeNetwork.chain.rpcUrls.default.http[0];

function makeHttpClient(): PublicClient {
  return createPublicClient({
    chain: activeNetwork.chain,
    transport: http(RPC_URL, { timeout: 8_000, retryCount: 1 })
  });
}

function makeInjectedClient(ethereumProvider: never): PublicClient {
  return createPublicClient({
    chain: activeNetwork.chain,
    transport: custom(ethereumProvider, { retryCount: 1 })
  });
}

export type RpcClient = PublicClient;

const httpClient = makeHttpClient();

function getInjected(): RpcClient | null {
  if (typeof window === "undefined") return null;
  const eth = (window as unknown as { ethereum?: unknown }).ethereum;
  if (!eth || typeof (eth as { request?: unknown }).request !== "function") return null;
  return makeInjectedClient(eth as never);
}

export function getClient(): RpcClient {
  return httpClient;
}

export function getPreferredClient(): RpcClient {
  return httpClient;
}

export function getAlternateClient(preferred: RpcClient): RpcClient | null {
  const injected = getInjected();
  if (preferred === httpClient && injected) return injected;
  if (preferred !== httpClient) return httpClient;
  return null;
}

export async function tryClients<T>(op: (client: RpcClient) => Promise<T>): Promise<T> {
  const order: RpcClient[] = [];
  // Reliable public RPC first; the injected provider is fallback for reads.
  order.push(httpClient);
  const injected = getInjected();
  if (injected) order.push(injected);

  let lastError: unknown;
  for (const client of order) {
    try {
      return await op(client);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export async function requireWalletClient() {
  const { getWalletClient } = await import("@wagmi/core");
  const client = await getWalletClient(wagmiConfig);
  if (!client) throw new Error("Wallet is not connected");
  return client;
}

export async function sendAndWait(action: () => Promise<Hash>): Promise<TransactionReceipt> {
  const hash = await action();
  const receipt = await httpClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error("Transaction reverted on-chain");
  }
  return receipt;
}
