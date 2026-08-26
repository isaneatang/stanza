import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { disconnect } from "@wagmi/core";
import { getClient, wagmiConfig } from "../lib/client";
import { erc20Abi } from "../lib/abi";
import { activeNetwork } from "../config/networks";
import { abbreviateAddress, formatAmount } from "../lib/format";
import { useMyUsername } from "../hooks/useWallet";
import Avatar from "./Avatar";

export default function AccountPanel() {
  const { address, isConnected } = useAppKitAccount();
  const { open } = useOpenSafe();
  const username = useMyUsername();

  const [openMenu, setOpenMenu] = useState(false);
  const [bot, setBot] = useState<bigint | null>(null);
  const [usdt, setUsdt] = useState<bigint | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useOutsideClose(menuRef, openMenu, () => setOpenMenu(false));

  const loadBalances = useCallback(async () => {
    if (!address) return;
    try {
      const client = getClient();
      const [native, token] = await Promise.all([
        client.getBalance({ address: address as `0x${string}` }),
        client.readContract({
          address: activeNetwork.usdt,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address as `0x${string}`]
        })
      ]);
      setBot(native);
      setUsdt(token);
    } catch {
      setBot(null);
      setUsdt(null);
    }
  }, [address]);

  useEffect(() => {
    if (!openMenu || !isConnected) return;
    loadBalances();
    const id = setInterval(loadBalances, 12_000);
    return () => clearInterval(id);
  }, [openMenu, isConnected, loadBalances]);

  if (!isConnected || !address) {
    return (
      <button onClick={() => open()} className="btn-primary">
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpenMenu((v) => !v)}
        className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition-colors ${
          openMenu ? "border-primary/60 bg-surfaceHover" : "border-border bg-surface hover:border-primary/40"
        }`}
      >
        <Avatar address={address} username={username} size={22} />
        <span className="hidden xs:inline sm:inline max-w-[110px] truncate font-medium">
          {username ?? abbreviateAddress(address, 4, 4)}
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" className={`text-textSecondary transition-transform ${openMenu ? "rotate-180" : ""}`}>
          <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {openMenu && (
        <div className="absolute right-0 top-full mt-2 w-64 card p-4 z-50 shadow-xl shadow-black/40">
          <div className="flex items-center gap-3">
            <Avatar address={address} username={username} size={38} />
            <div className="min-w-0">
              {username ? (
                <Link to="/me" onClick={() => setOpenMenu(false)} className="block font-semibold truncate hover:text-primary transition-colors">
                  {username}
                </Link>
              ) : (
                <Link to="/claim" onClick={() => setOpenMenu(false)} className="block text-sm text-primary hover:underline">
                  Claim a name
                </Link>
              )}
              <a
                href={`${activeNetwork.explorer}/address/${address}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-textSecondary hover:text-primary transition-colors font-mono"
              >
                {abbreviateAddress(address, 6, 4)}
              </a>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-px rounded-lg border border-border bg-border overflow-hidden">
            <BalanceCell label="BOT" value={bot} decimals={18} />
            <BalanceCell label="USDT" value={usdt} decimals={activeNetwork.usdtDecimals} />
          </div>

          <Link
            to="/me"
            onClick={() => setOpenMenu(false)}
            className="mt-3 block rounded-lg border border-border px-3 py-2 text-sm text-center text-textSecondary hover:text-textPrimary hover:border-primary/40 transition-colors"
          >
            My profile & poems
          </Link>

          <button
            onClick={() => {
              disconnect(wagmiConfig);
              setOpenMenu(false);
            }}
            className="mt-2 w-full rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

function BalanceCell({ label, value, decimals }: { label: string; value: bigint | null; decimals: number }) {
  return (
    <div className="bg-background/60 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-widest text-textSecondary">{label}</p>
      <p className="text-sm font-semibold tabular-nums mt-0.5 truncate">
        {value == null ? "…" : formatAmount(value, decimals)}
      </p>
    </div>
  );
}

function useOpenSafe() {
  const result = useAppKit();
  return { open: result.open };
}

function useOutsideClose(ref: React.RefObject<HTMLElement | null>, active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [active, ref, onClose]);
}
