import { maxUint256 } from "viem";
import { erc20Abi, poetryArchiveAbi } from "./abi";
import { requireWalletClient, sendAndWait, tryClients } from "./client";
import { activeNetwork, getContractAddress } from "../config/networks";

const ARCHIVE = getContractAddress();

export async function claimUsernameTx(username: string): Promise<void> {
  const wallet = await requireWalletClient();
  await sendAndWait(() =>
    wallet.writeContract({
      address: ARCHIVE,
      abi: poetryArchiveAbi,
      functionName: "claimUsername",
      args: [username]
    })
  );
}

export async function postPoemTx(args: {
  title: string;
  content: string;
  parentPoemId: number;
  license: number;
}): Promise<void> {
  const wallet = await requireWalletClient();
  await sendAndWait(() =>
    wallet.writeContract({
      address: ARCHIVE,
      abi: poetryArchiveAbi,
      functionName: "postPoem",
      args: [args.title, args.content, BigInt(args.parentPoemId), args.license]
    })
  );
}

export async function tipPoemTx(args: {
  poemId: number;
  token: "USDT" | "BOT";
  amountRaw: bigint;
  onStatus?: (status: "approving" | "sending") => void;
}): Promise<void> {
  const wallet = await requireWalletClient();

  if (args.token === "USDT" && wallet.account) {
    const allowance = await tryClients((client) =>
      client.readContract({
        address: activeNetwork.usdt,
        abi: erc20Abi,
        functionName: "allowance",
        args: [wallet.account.address, ARCHIVE]
      })
    );
    if (allowance < args.amountRaw) {
      args.onStatus?.("approving");
      await sendAndWait(() =>
        wallet.writeContract({
          address: activeNetwork.usdt,
          abi: erc20Abi,
          functionName: "approve",
          args: [ARCHIVE, maxUint256]
        })
      );
    }
  }

  args.onStatus?.("sending");
  if (args.token === "USDT") {
    await sendAndWait(() =>
      wallet.writeContract({
        address: ARCHIVE,
        abi: poetryArchiveAbi,
        functionName: "tipPoemUSDT",
        args: [BigInt(args.poemId), args.amountRaw]
      })
    );
  } else {
    await sendAndWait(() =>
      wallet.writeContract({
        address: ARCHIVE,
        abi: poetryArchiveAbi,
        functionName: "tipPoemBOT",
        args: [BigInt(args.poemId)],
        value: args.amountRaw
      })
    );
  }
}

export function describeTxError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const reasons = [
    "Invalid username length",
    "Username taken",
    "Address already has a username",
    "Must claim a username before posting",
    "Content required",
    "Parent poem does not exist",
    "Duplicate content already posted",
    "Poem does not exist",
    "Cannot tip yourself",
    "Amount must be greater than zero"
  ];
  for (const r of reasons) {
    if (raw.includes(r)) return r;
  }
  if (raw.includes("User rejected")) return "Transaction rejected in wallet";
  return raw.length > 180 ? `${raw.slice(0, 180)}…` : raw;
}
