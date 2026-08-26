import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { Poem } from "../lib/store";
import { tipsForPoem } from "../lib/store";
import { useArchive } from "../hooks/useArchive";
import { activeNetwork } from "../config/networks";
import { formatAmount, timeAgo } from "../lib/format";
import Avatar from "./Avatar";
import LicenseBadge from "./LicenseBadge";
import TipPanel from "./TipPanel";

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } }
};

export default function PoemCard({
  poem,
  expanded = false
}: {
  poem: Poem;
  expanded?: boolean;
}) {
  const s = useArchive();
  const username = s.usernames[poem.author];
  const totals = tipsForPoem(s, poem.poemId);

  return (
    <motion.article variants={itemVariants} layout className="card p-5 sm:p-6">
      <header className="flex items-center gap-3 mb-4">
        <Link to={`/author/${poem.author}`} className="flex items-center gap-2.5 min-w-0 group">
          <Avatar address={poem.author} username={username} />
          <span className="truncate text-sm">
            <span className="font-medium group-hover:text-primary transition-colors">
              {username ?? "unnamed"}
            </span>
          </span>
        </Link>
        <span className="text-xs text-textSecondary">{timeAgo(poem.timestamp)}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-textSecondary/70 font-mono">#{poem.poemId}</span>
          <LicenseBadge license={poem.license} />
        </div>
      </header>

      {poem.title ? (
        <h3 className="text-base font-semibold mb-2 tracking-tight">{poem.title}</h3>
      ) : null}

      <p
        className={`font-serif text-[15.5px] leading-relaxed whitespace-pre-wrap break-words ${
          expanded ? "" : "line-clamp-8"
        }`}
      >
        {poem.content}
      </p>

      <footer className="mt-5 pt-4 border-t border-border flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 text-xs text-textSecondary">
            <span>
              {totals.count > 0 ? `${totals.count} tip${totals.count === 1 ? "" : "s"}` : "no tips yet"}
            </span>
            {totals.usdt > 0n && (
              <span className="text-primary/90 font-medium">
                {formatAmount(totals.usdt, activeNetwork.usdtDecimals)} USDT
              </span>
            )}
            {totals.bot > 0n && (
              <span className="text-primary/90 font-medium">
                {formatAmount(totals.bot, 18)} BOT
              </span>
            )}
            {!expanded && poem.content.length > 600 && (
              <Link to={`/poem/${poem.poemId}`} className="link-muted ml-auto">
                read full
              </Link>
            )}
          </div>
          {!expanded && (
            <Link to={`/poem/${poem.poemId}`} className="btn-ghost !py-1.5 !px-3 text-xs">
              Tip this poem
            </Link>
          )}
        </div>
        {expanded && <TipPanel poemId={poem.poemId} author={poem.author} />}
      </footer>
    </motion.article>
  );
}
