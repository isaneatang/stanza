import { Link, useParams } from "react-router-dom";
import { useArchive } from "../hooks/useArchive";
import { tipsForPoem } from "../lib/store";
import { activeNetwork } from "../config/networks";
import { formatAmount, shortHash } from "../lib/format";
import PoemCard from "../components/PoemCard";

export default function PoemDetail() {
  const { id } = useParams();
  const poemId = Number(id);
  const s = useArchive();

  if (s.status === "loading" || s.status === "idle") {
    return (
      <div className="card p-6 flex flex-col gap-3 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="skeleton w-8 h-8 rounded-full" />
          <div className="skeleton h-3 w-28" />
        </div>
        <div className="skeleton h-4 w-1/2 mt-2" />
        {[90, 100, 75, 95, 60].map((w, i) => (
          <div key={i} className="skeleton h-3.5" style={{ width: `${w}%` }} />
        ))}
      </div>
    );
  }

  const poem = Number.isFinite(poemId) ? s.poems.find((p) => p.poemId === poemId) : undefined;

  if (!poem) {
    return (
      <div className="card p-10 text-center max-w-md mx-auto">
        <h2 className="font-semibold mb-1">Poem not found</h2>
        <p className="text-sm text-textSecondary mb-5">
          Nothing lives at #{id}. It may not exist yet.
        </p>
        <Link to="/" className="btn-ghost">
Back to the feed
        </Link>
      </div>
    );
  }

  const totals = tipsForPoem(s, poem.poemId);

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-4">
      <Link to="/" className="link-muted text-sm w-fit">
        Back to the feed
      </Link>

      <PoemCard poem={poem} expanded />

      <div className="card p-5 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 text-sm">
        <div>
          <p className="label !mb-0.5">Posted</p>
          <p className="text-textPrimary/90">
            {poem.timestamp
              ? new Date(poem.timestamp * 1000).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric"
                })
              : "root"}
          </p>
        </div>
        <div>
          <p className="label !mb-0.5">Tips</p>
          <p className="text-textPrimary/90">
            {totals.count}
            {totals.usdt > 0n && (
              <span className="text-primary">
                {" "}
                · {formatAmount(totals.usdt, activeNetwork.usdtDecimals)} USDT
              </span>
            )}
            {totals.bot > 0n && (
              <span className="text-primary"> · {formatAmount(totals.bot, 18)} BOT</span>
            )}
          </p>
        </div>
        <div>
          <p className="label !mb-0.5">Parent</p>
          <p className="text-textPrimary/90">{poem.parentPoemId === 0 ? "root" : `#${poem.parentPoemId}`}</p>
        </div>
        <div>
          <p className="label !mb-0.5">Tx</p>
          {poem.txHash ? (
            <a
              href={`${activeNetwork.explorer}/tx/${poem.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="link-muted font-mono text-xs"
            >
              {shortHash(poem.txHash)}
            </a>
          ) : (
            "none"
          )}
        </div>
      </div>
    </div>
  );
}
