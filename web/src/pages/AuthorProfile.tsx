import { useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useArchive } from "../hooks/useArchive";
import { poemsByAuthor, tipsReceivedByAuthor } from "../lib/store";
import { activeNetwork } from "../config/networks";
import { abbreviateAddress, formatAmount } from "../lib/format";
import Avatar from "../components/Avatar";
import PoemCard from "../components/PoemCard";

export default function AuthorProfile() {
  const { address = "" } = useParams();
  const addr = address.toLowerCase();
  const s = useArchive();
  const [copied, setCopied] = useState(false);

  const username = s.usernames[addr];
  const poems = poemsByAuthor(s, addr);
  const stats = tipsReceivedByAuthor(s, addr);
  const loading = s.status === "loading" || s.status === "idle";

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        <div className="card p-6 flex items-center gap-4">
          <div className="skeleton w-14 h-14 rounded-full" />
          <div className="flex flex-col gap-2">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-3 w-40" />
          </div>
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="card p-6 flex flex-col gap-3">
            <div className="skeleton h-3.5 w-1/3" />
            <div className="skeleton h-3.5 w-full" />
            <div className="skeleton h-3.5 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-5">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6"
      >
        <div className="flex items-center gap-4">
          <Avatar address={addr} username={username} size={56} />
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight truncate">
              {username ?? "Unnamed poet"}
            </h1>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(addr).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
              className="text-xs text-textSecondary hover:text-primary transition-colors font-mono mt-0.5"
              title="Copy address"
            >
              {abbreviateAddress(addr, 10, 8)} {copied ? "· copied ✓" : ""}
            </button>
          </div>
          <a
            href={`${activeNetwork.explorer}/address/${addr}`}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost ml-auto !py-1.5 !px-3 text-xs shrink-0"
          >
            Explorer
          </a>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-border text-sm">
          <div>
            <p className="label !mb-0.5">Poems</p>
            <p className="font-semibold">{poems.length}</p>
          </div>
          <div>
            <p className="label !mb-0.5">Tips received</p>
            <p className="font-semibold">{stats.count}</p>
          </div>
          <div>
            <p className="label !mb-0.5">Earned</p>
            <p className="font-semibold">
              {stats.usdt > 0n && (
                <span className="text-primary">{formatAmount(stats.usdt, activeNetwork.usdtDecimals)} USDT</span>
              )}
              {stats.usdt > 0n && stats.bot > 0n && <span className="text-textSecondary"> + </span>}
              {stats.bot > 0n && (
                <span className="text-primary">{formatAmount(stats.bot, 18)} BOT</span>
              )}
              {stats.usdt === 0n && stats.bot === 0n && (
                <span className="text-textSecondary font-normal">nothing yet</span>
              )}
            </p>
          </div>
        </div>
      </motion.header>

      <h2 className="text-sm font-medium uppercase tracking-wider text-textSecondary px-1">
        {username ? `${username}'s` : "This poet's"} archive
      </h2>

      {poems.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-serif italic text-textSecondary mb-4">Nothing posted yet.</p>
          {!username && (
            <p className="text-xs text-textSecondary/70 max-w-sm mx-auto">
              This address hasn't claimed a name. Anyone can claim one; names are permanent.
            </p>
          )}
        </div>
      ) : (
        <motion.ol
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.05 } } }}
          className="flex flex-col gap-4"
        >
          {poems.map((poem) => (
            <motion.li key={poem.poemId} variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
              <PoemCard poem={poem} />
            </motion.li>
          ))}
        </motion.ol>
      )}
    </div>
  );
}
