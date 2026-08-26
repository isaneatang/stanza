import type { Log } from "viem";
import { decodeEventLog, numberToHex } from "viem";
import { getAlternateClient, getPreferredClient, tryClients } from "./client";
import { poetryArchiveAbi } from "./abi";
import {
  activeNetwork,
  contractIsDeployed,
  getContractAddress,
  startBlock
} from "../config/networks";

export interface Poem {
  poemId: number;
  author: string;
  parentPoemId: number;
  title: string;
  content: string;
  license: number;
  timestamp: number;
  txHash: string;
}

export interface Tip {
  key: string;
  poemId: number;
  tipper: string;
  author: string;
  token: "USDT" | "BOT";
  amount: bigint;
  fee: bigint;
  seenAt: number;
}

export interface Claim {
  user: string;
  username: string;
  timestamp: number;
}

export interface ArchiveState {
  status: "idle" | "loading" | "ready" | "error";
  error?: string;
  indexing: boolean;
  poems: Poem[];
  tips: Tip[];
  claims: Claim[];
  usernames: Record<string, string>;
}

type Listener = () => void;

const ARCHIVE = getContractAddress();
const USDT = activeNetwork.usdt.toLowerCase();

let state: ArchiveState = {
  status: "idle",
  indexing: false,
  poems: [],
  tips: [],
  claims: [],
  usernames: {}
};
const listeners = new Set<Listener>();

const poemMap = new Map<number, Poem>();
const tipMap = new Map<string, Tip>();
const claimMap = new Map<string, Claim>();
const usernameByAddress = new Map<string, string>();

function publish() {
  state = {
    ...state,
    poems: [...poemMap.values()].sort((a, b) => a.poemId - b.poemId),
    tips: [...tipMap.values()],
    claims: [...claimMap.values()],
    usernames: Object.fromEntries(usernameByAddress)
  };
  listeners.forEach((l) => l());
}

function subscribe(l: Listener): () => void {
  listeners.add(l);
  ensureInit();
  return () => {
    listeners.delete(l);
  };
}

function getState(): ArchiveState {
  return state;
}

export function retryInit(): void {
  initPromise = null;
  poemMap.clear();
  tipMap.clear();
  claimMap.clear();
  usernameByAddress.clear();
  detachWatchers();
  scanning = false;
  state = { status: "idle", indexing: false, poems: [], tips: [], claims: [], usernames: {} };
  ensureInit();
}

async function scanLogs(
  eventName: "PoemPosted" | "PoemTipped" | "UsernameClaimed",
  ingest: (logs: readonly Log[]) => void
): Promise<void> {
  const to = await tryClients((c) => c.getBlockNumber());
  const from = startBlock < to ? startBlock : to;
  let cursor = from;
  let chunk = 50_000n;
  while (cursor <= to) {
    let end = cursor + chunk - 1n;
    if (end > to) end = to;
    try {
      const raw = await tryClients((c) =>
        c.request({
          method: "eth_getLogs",
          params: [
            {
              address: [ARCHIVE],
              fromBlock: numberToHex(cursor),
              toBlock: numberToHex(end)
            }
          ]
        })
      );
      const decoded: Log[] = [];
      for (const l of raw) {
        try {
          const ev = decodeEventLog({ abi: poetryArchiveAbi, data: l.data, topics: l.topics });
          if ((ev as { eventName?: string }).eventName !== eventName) continue;
          decoded.push({ ...l, ...ev } as unknown as Log);
        } catch {
          continue;
        }
      }
      ingest(decoded);
      publish();
      cursor = end + 1n;
    } catch (err) {
      if (chunk > 2_000n) {
        chunk = chunk / 2n;
      } else {
        throw err;
      }
    }
  }
}

function ingestPoemLogs(logs: readonly Log[]): void {
  for (const log of logs as any[]) {
    const a = log.args;
    if (!a || a.poemId == null || !a.author) continue;
    const id = Number(a.poemId);
    if (poemMap.has(id)) continue;
    poemMap.set(id, {
      poemId: id,
      author: String(a.author).toLowerCase(),
      parentPoemId: Number(a.parentPoemId ?? 0),
      title: a.title ?? "",
      content: a.content ?? "",
      license: Number(a.license ?? 0),
      timestamp: Number(a.timestamp ?? 0),
      txHash: String(log.transactionHash ?? "")
    });
  }
}

function ingestTipLogs(logs: readonly Log[]): void {
  for (const log of logs as any[]) {
    const a = log.args;
    if (!a || a.poemId == null || !a.tipper || !a.author) continue;
    const key = `${log.transactionHash}:${log.logIndex}`;
    if (tipMap.has(key)) continue;
    tipMap.set(key, {
      key,
      poemId: Number(a.poemId),
      tipper: String(a.tipper).toLowerCase(),
      author: String(a.author).toLowerCase(),
      token: String(a.token ?? "").toLowerCase() === USDT ? "USDT" : "BOT",
      amount: BigInt(a.amount ?? 0),
      fee: BigInt(a.fee ?? 0),
      seenAt: Date.now()
    });
  }
}

function ingestClaimLogs(logs: readonly Log[]): void {
  for (const log of logs as any[]) {
    const a = log.args;
    if (!a || !a.user || !a.username) continue;
    const user = String(a.user).toLowerCase();
    usernameByAddress.set(user, a.username);
    claimMap.set(`${user}:${a.username}`, {
      user,
      username: a.username,
      timestamp: Number(a.timestamp ?? 0)
    });
  }
}

type WatchClient = ReturnType<typeof getPreferredClient>;
let watchHandles: (() => void)[] = [];
let watchClient: WatchClient | null = null;

function attachWatchersWith(client: WatchClient): void {
  watchClient = client;
  const names = ["PoemPosted", "PoemTipped", "UsernameClaimed"] as const;
  const ingests = [ingestPoemLogs, ingestTipLogs, ingestClaimLogs];
  watchHandles = names.map((eventName, i) =>
    client.watchContractEvent({
      address: ARCHIVE,
      abi: poetryArchiveAbi,
      eventName,
      // Force polling: the BOT Chain RPC does not support eth_subscribe /
      // WebSocket notifications, so subscription mode never receives events.
      poll: true,
      pollingInterval: 3_000,
      onLogs: (logs) => {
        ingests[i](logs);
        publish();
      },
      onError: () => scheduleWatcherRepair()
    })
  );
}

function attachWatchers(): void {
  attachWatchersWith(getPreferredClient());
}

function detachWatchers(): void {
  watchHandles.forEach((u) => {
    try {
      u();
    } catch {
      /* noop */
    }
  });
  watchHandles = [];
}

let repairing = false;
function scheduleWatcherRepair(): void {
  if (repairing || !watchHandles.length) return;
  repairing = true;
  setTimeout(() => {
    repairing = false;
    const alternate = getAlternateClient(watchClient!);
    if (!alternate) return;
    detachWatchers();
    attachWatchersWith(alternate);
  }, 3_000);
}

let initPromise: Promise<void> | null = null;
let scanning = false;

function ensureInit(): void {
  if (initPromise) return;

  if (!contractIsDeployed()) {
    state = {
      ...state,
      status: "error",
      indexing: false,
      error:
        "No contract configured yet. Deploy PoetryArchive.sol and set VITE_CONTRACT_ADDRESS in web/.env.local, then restart the dev server."
    };
    listeners.forEach((l) => l());
    return;
  }

  state = { ...state, status: "loading", error: undefined };

  initPromise = (async () => {
    await tryClients((c) => c.getBlockNumber());

    attachWatchers();

    state = { ...state, status: "ready", indexing: true };
    publish();

    void (async () => {
      if (scanning) return;
      scanning = true;
      try {
        const stages = [
          ["UsernameClaimed", ingestClaimLogs],
          ["PoemPosted", ingestPoemLogs],
          ["PoemTipped", ingestTipLogs]
        ] as const;

        const failures: string[] = [];
        for (const [name, ingest] of stages) {
          try {
            await scanLogs(name, ingest);
          } catch (err) {
            failures.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }

        state = {
          ...state,
          indexing: false,
          error: failures.length
            ? `Partial index only: ${failures.join("; ")}`
            : undefined
        };
      } finally {
        scanning = false;
        publish();
      }
    })();
  })().catch((err) => {
    state = {
      ...state,
      status: "error",
      indexing: false,
      error: `Cannot reach BOT Chain RPC (${activeNetwork.chain.rpcUrls.default.http[0]}): ${
        err instanceof Error ? err.message : String(err)
      }. If you are on a restricted network, try a VPN or mobile hotspot.`
    };
    listeners.forEach((l) => l());
  });
}

export const archiveStore = { subscribe, getState, retryInit };

// ---------------------------------------------------------------
// Derived selectors
// ---------------------------------------------------------------

export interface TipTotals {
  count: number;
  usdt: bigint;
  bot: bigint;
}

export function tipsForPoem(s: ArchiveState, poemId: number): TipTotals {
  let count = 0;
  let usdt = 0n;
  let bot = 0n;
  for (const t of s.tips) {
    if (t.poemId !== poemId) continue;
    count++;
    if (t.token === "USDT") usdt += t.amount;
    else bot += t.amount;
  }
  return { count, usdt, bot };
}

export interface AuthorTipStats extends TipTotals {
  uniqueTippers: Set<string>;
}

export function tipsReceivedByAuthor(s: ArchiveState, author: string): AuthorTipStats {
  const target = author.toLowerCase();
  let count = 0;
  let usdt = 0n;
  let bot = 0n;
  const tippers = new Set<string>();
  for (const t of s.tips) {
    if (t.author !== target) continue;
    count++;
    tippers.add(t.tipper);
    if (t.token === "USDT") usdt += t.amount;
    else bot += t.amount;
  }
  return { count, usdt, bot, uniqueTippers: tippers };
}

export function poemsByAuthor(s: ArchiveState, author: string): Poem[] {
  const target = author.toLowerCase();
  return s.poems.filter((p) => p.author === target).sort((a, b) => b.poemId - a.poemId);
}
