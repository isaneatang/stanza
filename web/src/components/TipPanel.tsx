import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatAmount, parseAmount } from "../lib/format";
import { describeTxError, tipPoemTx } from "../lib/actions";
import { useIsConnected, useMyAddress } from "../hooks/useWallet";
import { useAppKit } from "@reown/appkit/react";

type Phase = "idle" | "sending" | "done";

const PRESETS = ["0.5", "1", "5"];

const DECIMALS = 18;
const TOKEN = "BOT" as const;

export default function TipPanel({
  poemId,
  author
}: {
  poemId: number;
  author: string;
}) {
  const isConnected = useIsConnected();
  const me = useMyAddress();
  const { open } = useAppKit();

  const [amountText, setAmountText] = useState("1");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string>();
  const [floats, setFloats] = useState<{ id: number; label: string }[]>([]);

  const amountRaw = parseAmount(amountText, DECIMALS);
  const isSelf = me && me === author.toLowerCase();
  const busy = phase === "sending";
  const disabled = !isConnected || isSelf || busy || amountRaw == null || amountRaw <= 0n;

  async function send() {
    if (!amountRaw) return;
    setError(undefined);
    setPhase("sending");
    try {
      await tipPoemTx({ poemId, token: TOKEN, amountRaw });
      setPhase("done");
      const id = Date.now();
      setFloats((f) => [...f, { id, label: `+${formatAmount(amountRaw, DECIMALS)} ${TOKEN}` }]);
      setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1300);
      setTimeout(() => setPhase("idle"), 1200);
    } catch (err) {
      setPhase("idle");
      setError(describeTxError(err));
    }
  }

  if (!isConnected) {
    return (
      <button className="btn-ghost" onClick={() => open()}>
        Connect to tip
      </button>
    );
  }

  if (isSelf) {
    return <span className="text-xs text-textSecondary italic">your own poem</span>;
  }

  return (
    <div className="relative">
      <AnimatePresence>
        {floats.map((f) => (
          <motion.span
            key={f.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: [0, 1, 1, 0], y: -30 }}
            transition={{ duration: 1.2, times: [0, 0.15, 0.7, 1], ease: "easeOut" }}
            className="absolute left-1/2 -translate-x-1/2 -top-2 z-10 text-sm font-semibold text-primary pointer-events-none whitespace-nowrap"
          >
            {f.label}
          </motion.span>
        ))}
      </AnimatePresence>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setAmountText(p)}
                className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                  amountText === p
                    ? "border-primary/60 text-primary bg-primary/10"
                    : "border-border text-textSecondary hover:text-textPrimary"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <input
            value={amountText}
            onChange={(e) => {
              setAmountText(e.target.value.replace(/[^0-9.]/g, ""));
              setPhase((p) => (p === "done" ? "idle" : p));
            }}
            inputMode="decimal"
            placeholder="custom"
            className="input w-24 py-1.5 text-xs"
          />
          <motion.button
            whileTap={{ scale: 0.96 }}
            disabled={disabled}
            onClick={send}
            className="btn-primary ml-auto"
          >
            {phase === "sending"
              ? "Sending…"
              : phase === "done"
                ? "Tipped ✓"
                : `Tip ${TOKEN}`}
          </motion.button>
        </div>
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs text-red-400"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}