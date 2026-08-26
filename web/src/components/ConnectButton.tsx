import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { abbreviateAddress } from "../lib/format";

export default function ConnectButton() {
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();

  if (isConnected && address) {
    return (
      <button
        onClick={() => open()}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-textPrimary hover:border-primary/50 transition-colors"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        {abbreviateAddress(address, 4, 4)}
      </button>
    );
  }

  return (
    <button onClick={() => open()} className="btn-primary">
      Connect Wallet
    </button>
  );
}
