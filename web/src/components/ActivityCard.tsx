import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { Claim, Poem, Tip } from "../lib/store";
import { abbreviateAddress, formatAmount } from "../lib/format";
import { activeNetwork } from "../config/networks";
import Avatar from "./Avatar";

type ActivityItem =
  | { kind: "poem"; at: number; data: Poem }
  | { kind: "tip"; at: number; data: Tip }
  | { kind: "claim"; at: number; data: Claim };

const KIND_STYLE = {
  poem: { label: "Poem", dot: "bg-primary", ring: "border-l-primary/70" },
  tip: { label: "Tip", dot: "bg-amber-400", ring: "border-l-amber-400/70" },
  claim: { label: "Name", dot: "bg-sky-400", ring: "border-l-sky-400/70" }
} as const;

export function mergeActivity(
  poems: Poem[],
  tips: Tip[],
  claims: Claim[],
  limit = 40
): ActivityItem[] {
  const items: ActivityItem[] = [
    ...poems.map((p) => ({ kind: "poem" as const, at: p.timestamp || Date.now() / 1000, data: p })),
    ...tips.map((t) => ({ kind: "tip" as const, at: t.seenAt / 1000, data: t })),
    ...claims.map((c) => ({ kind: "claim" as const, at: c.timestamp || Date.now() / 1000, data: c }))
  ];
  return items.sort((a, b) => b.at - a.at).slice(0, limit);
}

export default function ActivityCard({ item }: { item: ActivityItem }) {
  const style = KIND_STYLE[item.kind];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={`card border-l-2 ${style.ring} p-4`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-textSecondary">
          {style.label}
        </span>
      </div>

      {item.kind === "poem" && (
        <>
          <p className="font-serif text-sm line-clamp-2 leading-relaxed">
            {item.data.title ? `${item.data.title}. ` : ""}
            {item.data.content.slice(0, 140)}
            {item.data.content.length > 140 ? "…" : ""}
          </p>
          <p className="mt-2 text-xs text-textSecondary">
            #{item.data.poemId} by{" "}
            <Link to={`/author/${item.data.author}`} className="link-muted">
              {abbreviateAddress(item.data.author, 6, 4)}
            </Link>
          </p>
        </>
      )}

      {item.kind === "tip" && (
        <>
          <p className="text-sm">
            <span className="font-semibold text-primary">
              {formatAmount(item.data.amount, item.data.token === "USDT" ? activeNetwork.usdtDecimals : 18)}{" "}
              {item.data.token}
            </span>{" "}
            poem #{item.data.poemId}
          </p>
          <p className="mt-2 text-xs text-textSecondary">
            from{" "}
            <Link to={`/author/${item.data.tipper}`} className="link-muted">
              {abbreviateAddress(item.data.tipper, 6, 4)}
            </Link>{" "}
            · fee {formatAmount(item.data.fee, item.data.token === "USDT" ? activeNetwork.usdtDecimals : 18)}{" "}
            {item.data.token}
          </p>
        </>
      )}

      {item.kind === "claim" && (
        <>
          <p className="text-sm flex items-center gap-2">
            <Avatar address={item.data.user} username={item.data.username} size={22} />
            <span className="font-medium">{item.data.username}</span>
            <span className="text-xs text-textSecondary">claimed a name</span>
          </p>
          <p className="mt-2 text-xs text-textSecondary">
            <Link to={`/author/${item.data.user}`} className="link-muted">
              {abbreviateAddress(item.data.user, 8, 6)}
            </Link>
          </p>
        </>
      )}
    </motion.div>
  );
}
