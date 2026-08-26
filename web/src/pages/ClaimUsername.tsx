import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { tryClients } from "../lib/client";
import { poetryArchiveAbi } from "../lib/abi";
import { describeTxError, claimUsernameTx } from "../lib/actions";
import { getContractAddress } from "../config/networks";
import { useArchive } from "../hooks/useArchive";
import { useIsConnected, useMyAddress, useMyUsername } from "../hooks/useWallet";
import Avatar from "../components/Avatar";

const USERNAME_RE = /^[A-Za-z0-9_]{1,32}$/;
const ARCHIVE = getContractAddress();

type Phase = "idle" | "sending" | "done";

export default function ClaimUsername() {
  const isConnected = useIsConnected();
  const me = useMyAddress();
  const existing = useMyUsername();
  const s = useArchive();

  const [username, setUsername] = useState("");
  const [taken, setTaken] = useState<boolean | undefined>(undefined);
  const [checking, setChecking] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string>();

  useEffect(() => {
    const value = username.trim();
    if (!USERNAME_RE.test(value)) {
      setTaken(undefined);
      return;
    }
    let cancelled = false;
    setChecking(true);
    const timer = setTimeout(async () => {
      try {
        const addr = await tryClients((client) =>
          client.readContract({
            address: ARCHIVE,
            abi: poetryArchiveAbi,
            functionName: "usernameToAddress",
            args: [value]
          })
        );
        if (!cancelled) setTaken(addr !== "0x0000000000000000000000000000000000000000");
      } catch {
        if (!cancelled) setTaken(undefined);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      setChecking(false);
    };
  }, [username]);

  async function submit() {
    const value = username.trim();
    if (!USERNAME_RE.test(value) || taken) return;
    setError(undefined);
    setPhase("sending");
    try {
      await claimUsernameTx(value);
      setPhase("done");
    } catch (err) {
      setPhase("idle");
      setError(describeTxError(err));
    }
  }

  if (existing && me) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-8 max-w-md mx-auto text-center"
      >
        <Avatar address={me} username={existing} size={56} />
        <h2 className="mt-4 text-lg font-semibold">{existing}</h2>
        <p className="text-sm text-textSecondary mt-1">
          This name is yours permanently. It cannot be changed or transferred.
        </p>
        <Link to={`/author/${me}`} className="btn-primary mt-6">
          View your profile
        </Link>
      </motion.div>
    );
  }

  if (!isConnected) {
    return (
      <div className="card p-10 max-w-md mx-auto text-center">
        <h2 className="font-semibold mb-1">Connect first</h2>
        <p className="text-sm text-textSecondary">
          Connect your wallet to claim a name on the archive.
        </p>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card p-10 max-w-md mx-auto text-center"
      >
        <span className="text-primary text-2xl">✓</span>
        <h2 className="mt-3 font-semibold">Name claimed</h2>
        <p className="text-sm text-textSecondary mt-1 mb-5">
          The chain now witnesses you as{" "}
          <span className="text-textPrimary font-medium">{s.usernames[me ?? ""] ?? username.trim()}</span>.
        </p>
        <Link to="/post" className="btn-primary w-full justify-center">
          Write your first poem
        </Link>
      </motion.div>
    );
  }

  const valid = USERNAME_RE.test(username.trim());
  const blocked = !valid || taken === true || checking || phase === "sending";

  return (
    <div className="max-w-md mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-6 sm:p-8">
        <h1 className="text-lg font-semibold tracking-tight">Claim your name</h1>
        <p className="text-sm text-textSecondary mt-1 mb-6">
          One name per address, permanent forever. A claimed name is the only key needed to post,
          and there is no other fee.
        </p>

        <label className="label" htmlFor="username">
          Username
        </label>
        <div className="relative">
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/[^A-Za-z0-9_]/g, "").slice(0, 32))}
            placeholder="verse_wright"
            className={`input pr-10 ${valid ? "" : username ? "!border-red-500/50" : ""}`}
            maxLength={32}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
            {checking ? (
              <span className="inline-block w-3 h-3 border-2 border-textSecondary/30 border-t-primary rounded-full animate-spin" />
            ) : taken === false ? (
              <span className="text-primary">✓ free</span>
            ) : taken === true ? (
              <span className="text-red-400">taken</span>
            ) : null}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1.5 text-xs">
          <span className={valid || !username ? "text-textSecondary/60" : "text-red-400"}>
            Letters, numbers and underscores · max 32
          </span>
          <span className="text-textSecondary/60">{username.length}/32</span>
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <button disabled={blocked} onClick={submit} className="btn-primary w-full mt-6">
          {phase === "sending" ? "Confirming in wallet…" : "Claim permanently"}
        </button>
        <p className="text-[11px] text-textSecondary/60 mt-3 text-center">
          This writes to BOT Chain and costs a small amount of gas. It cannot be undone.
        </p>
      </motion.div>
    </div>
  );
}
