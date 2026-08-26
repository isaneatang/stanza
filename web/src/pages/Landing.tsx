import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useArchive } from "../hooks/useArchive";
import { activeNetwork } from "../config/networks";
import { formatAmount } from "../lib/format";

const steps = [
  {
    n: "01",
    title: "Claim your name",
    body: "One username per address, free, permanent forever. Your name is the only key you need to publish."
  },
  {
    n: "02",
    title: "Write permanently",
    body: "Poems are timestamped by the chain and stored in its event logs. Nobody can edit them or take them down, including us."
  },
  {
    n: "03",
    title: "Get tipped directly",
    body: "Readers tip in USDT or native BOT. 97% goes straight to your wallet. The 3% platform fee is hardcoded and can never be raised."
  }
];

export default function Landing() {
  const s = useArchive();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    let tipsUsdt = 0n;
    for (const t of s.tips) if (t.token === "USDT") tipsUsdt += t.amount;
    return {
      poems: s.poems.length,
      poets: s.claims.length,
      tips: s.tips.length,
      tipsUsdt
    };
  }, [s]);

  return (
    <div className="flex flex-col">
      <section className="relative border-b border-border overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 10%, rgba(34,197,94,0.12), transparent 45%), radial-gradient(circle at 85% 80%, rgba(34,197,94,0.07), transparent 40%)"
          }}
        />
        <div className="relative max-w-3xl mx-auto text-center px-4 pt-16 pb-14 sm:pt-24 sm:pb-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-textSecondary mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Live on BOT Chain Testnet · Chain ID {activeNetwork.chain.id}
            </span>

            <h1 className="font-serif text-4xl sm:text-6xl leading-[1.08] tracking-tight">
              The permanent
              <br />
              <span className="text-primary italic">poetry archive</span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-textSecondary max-w-xl mx-auto leading-relaxed">
              Claim a name. Publish verses that outlive every platform. Get tipped in USDT or BOT.
              The chain witnesses it all, sub-second, for fractions of a cent.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/feed")}
                className="btn-primary !px-8 !py-3 !text-base w-full sm:w-auto"
              >
                Enter the Archive
              </motion.button>
              <Link to="/live" className="btn-ghost !px-6 !py-3 w-full sm:w-auto">
                See it live on-chain
              </Link>
            </div>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="mt-14 grid grid-cols-3 gap-px rounded-xl border border-border bg-border overflow-hidden"
          >
            {[
              { label: "Poems on-chain", value: stats.poems.toLocaleString() },
              { label: "Poets", value: stats.poets.toLocaleString() },
              {
                label: "Tips sent",
                value: stats.tipsUsdt > 0n ? formatAmount(stats.tipsUsdt, activeNetwork.usdtDecimals, 2) : String(stats.tips)
              }
            ].map((item) => (
              <div key={item.label} className="bg-surface px-2 py-5">
                <dd className="text-2xl sm:text-3xl font-semibold tabular-nums">{item.value}</dd>
                <dt className="mt-1 text-[11px] sm:text-xs uppercase tracking-widest text-textSecondary">
                  {item.label}
                </dt>
              </div>
            ))}
          </motion.dl>

          {s.status === "error" && (
            <p className="mt-4 text-xs text-amber-400/90 max-w-md mx-auto">{s.error}</p>
          )}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-14 sm:py-20 w-full">
        <h2 className="text-center text-xs font-medium uppercase tracking-[0.2em] text-textSecondary mb-10">
          How it works
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="card p-6"
            >
              <span className="font-mono text-xs text-primary">{step.n}</span>
              <h3 className="mt-3 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-textSecondary leading-relaxed">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
