import { HardhatUserConfig, vars } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

// Single network-switch point for deployment scripts.
// BOT Chain Testnet first; mainnet configured but dormant.
export const NETWORKS = {
  testnet: {
    chainId: 968,
    name: "BOT Chain Testnet",
    rpc: process.env.BOHR_TESTNET_RPC || "https://rpc.bohr.life",
    explorer: "https://scan.bohr.life",
    usdt: process.env.TESTNET_USDT || "0x75edC9335175Fc0552D51D48439F229c10420fe3",
  },
  mainnet: {
    chainId: 677,
    name: "BOT Chain Mainnet",
    rpc: process.env.BOT_MAINNET_RPC || "https://rpc.botchain.ai",
    explorer: "https://scan.botchain.ai",
    // Triple-check on scan.botchain.ai immediately before any mainnet deploy.
    usdt: "0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C",
  },
} as const;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    bohrTestnet: {
      chainId: NETWORKS.testnet.chainId,
      url: NETWORKS.testnet.rpc,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
    botMainnet: {
      chainId: NETWORKS.mainnet.chainId,
      url: NETWORKS.mainnet.rpc,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      bohrTestnet: process.env.EXPLORER_API_KEY || "no-key-needed",
      botMainnet: process.env.EXPLORER_API_KEY || "no-key-needed",
    },
    customChains: [
      {
        network: "bohrTestnet",
        chainId: 968,
        urls: {
          apiURL: `${NETWORKS.testnet.explorer}/api`,
          browserURL: NETWORKS.testnet.explorer,
        },
      },
      {
        network: "botMainnet",
        chainId: 677,
        urls: {
          apiURL: `${NETWORKS.mainnet.explorer}/api`,
          browserURL: NETWORKS.mainnet.explorer,
        },
      },
    ],
  },
};

export default config;
