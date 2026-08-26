import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useAppKitNetwork } from "@reown/appkit/react";
import { switchChain } from "@wagmi/core";
import { activeNetwork } from "../config/networks";
import { wagmiConfig } from "../lib/client";
import { useIsConnected } from "../hooks/useWallet";

function normalizeChainId(chainId: unknown): number | undefined {
  if (chainId == null) return undefined;
  if (typeof chainId === "string") {
    if (chainId.startsWith("0x")) return Number(BigInt(chainId));
    const parts = chainId.split(":");
    return Number(parts[parts.length - 1]);
  }
  return Number(chainId);
}

export default function NetworkGate({ children }: { children: ReactNode }) {
  const isConnected = useIsConnected();
  const { chainId } = useAppKitNetwork();
  const wrongChain = isConnected && normalizeChainId(chainId) !== activeNetwork.chain.id;

  return (
    <>
      {children}
      {wrongChain && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ y: 16, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="card max-w-md w-full p-6 text-center"
          >
            <div className="w-10 h-10 mx-auto mb-4 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <span className="text-primary font-bold">!</span>
            </div>
            <h2 className="text-lg font-semibold mb-1">Wrong network</h2>
            <p className="text-sm text-textSecondary mb-5">
              Stanza runs on {activeNetwork.label} (Chain ID {activeNetwork.chain.id}). Switch your
              wallet to continue.
            </p>
            <button
              className="btn-primary w-full"
              onClick={() => switchChain(wagmiConfig, { chainId: activeNetwork.chain.id })}
            >
              Switch to {activeNetwork.chain.name}
            </button>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
