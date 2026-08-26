/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ACTIVE_NETWORK_KEY?: "testnet" | "mainnet";
  readonly VITE_REOWN_PROJECT_ID?: string;
  readonly VITE_CONTRACT_ADDRESS?: string;
  readonly VITE_START_BLOCK?: string;
  readonly VITE_USDT_DECIMALS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
