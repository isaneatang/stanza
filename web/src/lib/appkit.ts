import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { activeNetwork, reownProjectId } from "../config/networks";

const FALLBACK_PROJECT_ID = "b8f4a1c2d3e5f60718293a4b5c6d7e8f";

if (!reownProjectId) {
  console.warn(
    "[stanza] VITE_REOWN_PROJECT_ID is not set. Using a fallback id: WalletConnect-based wallets may not connect. Injected wallets still work."
  );
}

export const wagmiAdapter = new WagmiAdapter({
  networks: [activeNetwork.chain],
  projectId: reownProjectId || FALLBACK_PROJECT_ID,
  ssr: false
});

export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks: [activeNetwork.chain],
  projectId: reownProjectId || FALLBACK_PROJECT_ID,
  metadata: {
    name: "Stanza",
    description: "A permanent, censorship-resistant poetry archive on BOT Chain",
    url: typeof window !== "undefined" ? window.location.origin : "https://stanza.app",
    icons: []
  },
  features: {
    analytics: false,
    email: false,
    socials: []
  }
});
