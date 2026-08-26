import { useEffect, useState } from "react";
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { activeNetwork, getContractAddress } from "../config/networks";
import { poetryArchiveAbi } from "../lib/abi";
import { tryClients } from "../lib/client";
import { useArchive } from "./useArchive";

const ARCHIVE = getContractAddress();

export function useMyAddress(): string | undefined {
  const { address } = useAppKitAccount();
  return address ? address.toLowerCase() : undefined;
}

export function useIsConnected(): boolean {
  const { isConnected } = useAppKitAccount();
  return Boolean(isConnected);
}

export function useOnActiveChain(): boolean {
  const { chainId } = useAppKitNetwork();
  if (chainId == null) return false;
  const numeric =
    typeof chainId === "string" ? Number(chainId.split(":").pop()) : Number(chainId);
  return numeric === activeNetwork.chain.id;
}

/**
 * The authoritative username for the connected wallet.
 *
 * We read `addressToUsername(me)` straight from the contract (not from the
 * event index), and poll lightly until the name is found. The event log index
 * can lag the mempool/chain by a moment, and if it never picks the claim up the
 * index would show no name even though one is permanently claimed. Reading the
 * contract getter guarantees a freshly claimed name is reflected immediately
 * instead of the app asking the user to claim (or "mint") a second one.
 */
export function useMyUsername(): string | undefined {
  const me = useMyAddress();
  const s = useArchive();
  const [direct, setDirect] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!me || ARCHIVE === "0x") {
      setDirect(undefined);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const attempt = async () => {
      try {
        const res = await tryClients((c) =>
          c.readContract({
            address: ARCHIVE,
            abi: poetryArchiveAbi,
            functionName: "addressToUsername",
            args: [me as `0x${string}`]
          })
        );
        const n = typeof res === "string" && res ? res : undefined;
        if (cancelled) return;
        if (n) {
          setDirect(n);
          if (timer) clearInterval(timer);
        }
      } catch {
        // keep polling; the RPC may be briefly unreachable
      }
    };

    attempt();
    timer = setInterval(attempt, 3_000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [me, me ? s.usernames[me] : undefined]);

  const stored = me && s.usernames[me] ? s.usernames[me] : undefined;
  return direct ?? stored;
}