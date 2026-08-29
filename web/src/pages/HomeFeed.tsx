import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useArchive } from "../hooks/useArchive";
import { tipsForPoem } from "../lib/store";
import { useMyPendingPosts, usePendingActions } from "../state/PendingProvider";
import PoemCard from "../components/PoemCard";

type Sort = "latest" | "top";

const listVariants = {
  show: { transition: { staggerChildren: 0.05 } }
};

export default function HomeFeed() {
  const s = useArchive();
  const [sort, setSort] = useState<Sort>("latest");
  const pending = useMyPendingPosts();
  const { dismiss } = usePendingActions();

  const sorted = useMemo(() => {
    if (sort === "latest") return [...s.poems].sort((a, b) => b.poemId - a.poemId);
    return [...s.poems]
      .map((p) => ({ p, t: tipsForPoem(s, p.poemId) }))
      .sort(
        (a, b) =>
          Number(b.t.usdt + b.t.bot > 0n) - Number(a.t.usdt + a.t.bot > 0n) ||
          b.t.count - a.t.count ||
          b.p.poemId - a.p.poemId
      )
      .map((x) => x.p);
  }, [s, sort]);

  if (s.status === "error") {
    return (
      <div className="card p-8 text-center">
        <h2 className="font-semibold mb-2">Chain data unavailable</h2>
        <p className="text-sm text-textSecondary max-w-md mx-auto">{s.error}</p>
        <button className="btn-primary mt-5" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  if (s.status === "loading" || s.status === "idle") {
    return (
      <div className="flex flex-col gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card p-6 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="skeleton w-8 h-8 rounded-full" />
              <div className="skeleton h-3 w-28" />
              <div className="ml-auto skeleton h-3 w-14" />
            </div>
            <div className="skeleton h-3.5 w-2/3" />
            <div className="skeleton h-3.5 w-full" />
            <div className="skeleton h-3.5 w-5/6" />
            <div className="skeleton h-3.5 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif italic text-3xl tracking-tight">A living archive</h1>
          <p className="text-sm text-textSecondary mt-0.5">
            {s.poems.length === 0
              ? "Nothing here yet. The first poem is yours to write."
              : `${s.poems.length} poem${s.poems.length === 1 ? "" : "s"} witnessed by the chain.`}
          </p>
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
          {(["latest", "top"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setSort(mode)}
              className={`px-3.5 py-2 transition-colors ${
                sort === mode ? "bg-primary/15 text-primary" : "text-textSecondary hover:text-textPrimary"
              }`}
            >
              {mode === "latest" ? "Latest" : "Most tipped"}
            </button>
          ))}
        </div>
      </div>

      {pending.length > 0 && (
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {pending.map((p) => (
              <motion.div
                key={p.tempKey}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`card p-5 border-dashed ${
                  p.status === "error" ? "border-red-500/50" : "border-primary/40"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {p.status === "pending" ? (
                    <>
                      <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <span className="text-xs text-primary">Waiting for confirmation…</span>
                    </>
                  ) : (
                    <>
                      <span className="text-red-400 text-xs font-semibold">Failed</span>
                    </>
                  )}
                  <button
                    onClick={() => dismiss(p.tempKey)}
                    className="ml-auto text-xs link-muted"
                  >
                    dismiss
                  </button>
                </div>
                {p.title && <h3 className="font-semibold mb-1">{p.title}</h3>}
                <p className="font-serif text-sm line-clamp-3 whitespace-pre-wrap">{p.content}</p>
                {p.error && <p className="mt-2 text-xs text-red-400">{p.error}</p>}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {sorted.length === 0 && pending.length === 0 ? (
        <div className="card p-10 text-center mt-4">
          <p className="font-serif italic text-lg text-textSecondary mb-1">
            “The first line is the hardest.”
          </p>
          <p className="text-sm text-textSecondary mb-5">No poems in the archive yet.</p>
          <Link to="/post" className="btn-primary">
            Post the first poem
          </Link>
        </div>
      ) : (
        <motion.ol variants={listVariants} initial="hidden" animate="show" className="flex flex-col gap-4">
          <AnimatePresence initial={false}>
            {sorted.map((poem) => (
              <motion.li key={poem.poemId} layout exit={{ opacity: 0 }}>
                <PoemCard poem={poem} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ol>
      )}
    </div>
  );
}
