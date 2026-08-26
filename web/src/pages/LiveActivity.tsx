import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getPreferredClient } from "../lib/client";
import type { Hash } from "viem";
import { useArchive } from "../hooks/useArchive";
import { mergeActivity } from "../components/ActivityCard";
import ActivityCard from "../components/ActivityCard";

interface BlockInfo {
  number: bigint;
  hash: Hash;
  txCount: number;
  at: number;
}

export default function LiveActivity() {
  const s = useArchive();
  const [block, setBlock] = useState<BlockInfo>();
  const [pulseKey, setPulseKey] = useState(0);
  const unwatchRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unwatch = getPreferredClient().watchBlocks({
      onBlock: (b) => {
        setBlock({
          number: b.number,
          hash: b.hash,
          txCount: Array.isArray(b.transactions) ? b.transactions.length : 0,
          at: Date.now()
        });
        setPulseKey((k) => k + 1);
      },
      onError: () => {}
    });
    unwatchRef.current = unwatch;
    return () => unwatch();
  }, []);

  const activity = useMemo(
    () => mergeActivity(s.poems.slice(-30), s.tips.slice(-40), s.claims.slice(-20)),
    [s.poems, s.tips, s.claims]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Live on-chain</h1>
          <p className="text-sm text-textSecondary mt-0.5">
            Every event below was emitted by a real transaction. Nothing here is simulated.
          </p>
        </div>
      </div>

      <motion.div
        key={pulseKey}
        initial={{ borderColor: "rgba(34,197,94,0.5)" }}
        animate={{ borderColor: "rgba(31,43,36,1)" }}
        transition={{ duration: 1.2 }}
        className="card p-5 flex items-center gap-6"
      >
        <div className="flex items-center gap-2.5">
          <span className="relative flex w-2.5 h-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-primary" />
          </span>
          <span className="text-xs uppercase tracking-widest text-textSecondary">Block</span>
        </div>
        <div>
          <p className="text-2xl font-semibold font-mono tabular-nums leading-none">
            {block ? block.number.toString() : "…"}
          </p>
          {block && (
            <p className="text-[11px] text-textSecondary mt-1.5 font-mono">
              {block.hash.slice(0, 18)}… · {block.txCount} tx
              {" · "}
              {Math.max(0, Math.round((Date.now() - block.at) / 1000))}s ago
            </p>
          )}
        </div>
        <p className="ml-auto hidden sm:block font-serif italic text-sm text-textSecondary">
          ~0.75s blocks · ~0.9s finality
        </p>
      </motion.div>

      {activity.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-serif italic text-textSecondary mb-3">Listening for events…</p>
          <p className="text-xs text-textSecondary/70 max-w-sm mx-auto">
            Post a poem, claim a name or send a tip and watch it appear here the moment the chain
            accepts it.
          </p>
        </div>
      ) : (
        <ol className="grid gap-3 md:grid-cols-2 items-start">
          <AnimatePresence initial={false}>
            {activity.map((item) => (
              <motion.li
                layout
                key={
                  item.kind === "poem"
                    ? `p${item.data.poemId}`
                    : item.kind === "tip"
                      ? `t${item.data.key}`
                      : `c${item.data.user}:${item.data.username}`
                }
                exit={{ opacity: 0 }}
              >
                <ActivityCard item={item} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}
    </div>
  );
}
