import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useArchive } from "../hooks/useArchive";
import { poemsByAuthor, tipsReceivedByAuthor } from "../lib/store";
import { useIsConnected, useMyAddress, useMyUsername } from "../hooks/useWallet";
import { activeNetwork } from "../config/networks";
import { abbreviateAddress, formatAmount } from "../lib/format";
import Avatar from "../components/Avatar";
import PoemCard from "../components/PoemCard";

export default function MyProfile() {
  const isConnected = useIsConnected();
  const me = useMyAddress();
  const username = useMyUsername();
  const s = useArchive();

  if (!isConnected || !me) {
    return (
      <div className="card p-10 max-w-md mx-auto text-center">
        <h2 className="font-semibold mb-1">Connect first</h2>
        <p className="text-sm text-textSecondary">Connect your wallet to see your corner of the archive.</p>
      </div>
    );
  }

  const poems = poemsByAuthor(s, me);
  const stats = tipsReceivedByAuthor(s, me);

  if (!username) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-10 max-w-md mx-auto text-center"
      >
        <Avatar address={me} size={56} />
        <h2 className="mt-4 font-semibold">You have no name yet</h2>
        <p className="text-sm text-textSecondary mt-1 mb-6">
          Claim one to start publishing. One name per address, permanent.
        </p>
        <Link to="/claim" className="btn-primary">
          Claim your name
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-5">
      <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
        <div className="flex items-center gap-4">
          <Avatar address={me} username={username} size={56} />
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight truncate">{username}</h1>
            <button
              onClick={() => navigator.clipboard?.writeText(me)}
              className="text-xs text-textSecondary hover:text-primary transition-colors font-mono mt-0.5"
              title="Copy address"
            >
              {abbreviateAddress(me, 10, 8)}
            </button>
          </div>
          <Link
            to={`/author/${me}`}
            className="btn-ghost ml-auto !py-1.5 !px-3 text-xs shrink-0"
          >
            Public view
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-border text-sm">
          <div>
            <p className="label !mb-0.5">Your poems</p>
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
              {stats.bot > 0n && <span className="text-primary">{formatAmount(stats.bot, 18)} BOT</span>}
              {stats.usdt === 0n && stats.bot === 0n && (
                <span className="text-textSecondary font-normal">nothing yet</span>
              )}
            </p>
          </div>
        </div>

        <Link to="/post" className="btn-primary w-full justify-center mt-6">
          Write a new poem
        </Link>
      </motion.header>

      <h2 className="text-sm font-medium uppercase tracking-wider text-textSecondary px-1">
        Your stanzas
      </h2>

      {poems.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-serif italic text-textSecondary mb-4">
            Your first poem is still unwritten.
          </p>
          <Link to="/post" className="btn-ghost">
            Write it now
          </Link>
        </div>
      ) : (
        <motion.ol
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.05 } } }}
          className="flex flex-col gap-4"
        >
          {poems.map((poem) => (
            <motion.li
              key={poem.poemId}
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            >
              <PoemCard poem={poem} />
            </motion.li>
          ))}
        </motion.ol>
      )}
    </div>
  );
}
