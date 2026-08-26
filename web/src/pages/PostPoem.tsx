import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LICENSE_HINTS, LICENSE_LABELS } from "../lib/format";
import { describeTxError, postPoemTx } from "../lib/actions";
import { usePendingActions } from "../state/PendingProvider";
import { useIsConnected, useMyAddress, useMyUsername } from "../hooks/useWallet";

const SOFT_LIMIT = 20_000;

export default function PostPoem() {
  const navigate = useNavigate();
  const isConnected = useIsConnected();
  const me = useMyAddress();
  const username = useMyUsername();
  const { addPending, markError } = usePendingActions();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [license, setLicense] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();

  if (!isConnected) {
    return (
      <div className="card p-10 max-w-md mx-auto text-center">
        <h2 className="font-semibold mb-1">Connect first</h2>
        <p className="text-sm text-textSecondary">Connect your wallet to write to the archive.</p>
      </div>
    );
  }

  if (!username) {
    return (
      <div className="card p-10 max-w-md mx-auto text-center">
        <h2 className="font-semibold mb-1">A name comes first</h2>
        <p className="text-sm text-textSecondary mb-5">
          The archive requires a claimed username before you can post. One name, permanent.
        </p>
        <Link to="/claim" className="btn-primary">
          Claim your name
        </Link>
      </div>
    );
  }

  const contentReady = content.trim().length > 0;
  const overSoftLimit = content.length > SOFT_LIMIT;

  async function submit() {
    if (!contentReady || !me || sending) return;
    setSending(true);
    setError(undefined);

    const key = addPending({
      author: me,
      title: title.trim(),
      content,
      license
    });

    navigate("/feed");

    try {
      await postPoemTx({ title: title.trim(), content, parentPoemId: 0, license });
    } catch (err) {
      markError(key, describeTxError(err));
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-lg font-semibold tracking-tight">Write</h1>
        <p className="text-sm text-textSecondary mt-1 mb-6">
          Posting as{" "}
          <span className="text-textPrimary font-medium">{username}</span>. Once confirmed by the
          chain, your words are permanent. They cannot be edited or deleted.
        </p>
      </motion.div>

      <div className="card p-5 sm:p-6 flex flex-col gap-5">
        <div>
          <label className="label" htmlFor="title">
            Title · optional
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 120))}
            placeholder="Untitled"
            className="input"
            maxLength={120}
          />
        </div>

        <div>
          <label className="label" htmlFor="content">
            Poem · required
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Line breaks are preserved. What will the chain remember?"
            rows={12}
            className={`input resize-y font-serif !text-[15.5px] leading-relaxed ${
              overSoftLimit ? "!border-amber-400/60" : ""
            }`}
          />
          <div className="flex items-center justify-between mt-1.5 text-xs">
            <span className={overSoftLimit ? "text-amber-400" : "text-textSecondary/60"}>
              {content.length.toLocaleString()} characters
              {overSoftLimit ? " (large posts cost more gas)" : ""}
            </span>
            {!contentReady && content.length > 0 && (
              <span className="text-red-400">content is required</span>
            )}
          </div>
        </div>

        <fieldset>
          <legend className="label">License</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {LICENSE_LABELS.map((labelValue, idx) => (
              <button
                type="button"
                key={labelValue}
                onClick={() => setLicense(idx)}
                className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                  license === idx
                    ? "border-primary/60 bg-primary/10"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <span
                  className={`block text-sm font-medium ${
                    license === idx ? "text-primary" : ""
                  }`}
                >
                  {labelValue}
                </span>
                <span className="block text-xs text-textSecondary mt-0.5 leading-snug">
                  {LICENSE_HINTS[idx]}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button disabled={!contentReady || sending} onClick={submit} className="btn-primary w-full">
          {sending ? "Waiting for wallet…" : "Post permanently"}
        </button>
        <p className="text-[11px] text-textSecondary/60 text-center -mt-2">
          Exact duplicates are rejected by the contract. Content lives in the event log: public and
          permanent, readable forever.
        </p>
      </div>
    </div>
  );
}
