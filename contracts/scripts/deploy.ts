import { network, ethers } from "hardhat";
import { NETWORKS } from "../hardhat.config";

/**
 * Deploys PoetryArchive.
 *
 * Constructor args:
 *  - _usdtToken:            BOT Chain USDT contract for the active network
 *  - _platformFeeRecipient: wallet that receives the immutable 3% platform fee
 *
 * Env:
 *  DEPLOYER_PRIVATE_KEY      required (funded with BOT for gas)
 *  PLATFORM_FEE_RECIPIENT    optional — defaults to the deployer address
 *  TESTNET_USDT              optional — overrides testnet USDT address
 */
async function main() {
  const isMainnet = network.name === "botMainnet";
  const cfg = isMainnet ? NETWORKS.mainnet : NETWORKS.testnet;

  if (isMainnet) {
    // Guardrail per project brief: mainnet USDT address must be re-verified
    // on scan.botchain.ai immediately before production deployment.
    console.warn("\n*** MAINNET DEPLOYMENT ***");
    console.warn(`Verify USDT ${cfg.usdt} on ${cfg.explorer} before proceeding.\n`);
  }

  const [deployer] = await ethers.getSigners();
  const feeRecipient = process.env.PLATFORM_FEE_RECIPIENT || deployer.address;

  const usdt = cfg.usdt;
  if (!usdt || usdt === "0x") {
    throw new Error(
      `USDT address for ${network.name} is not set. ` +
        `Confirm it via the faucet/explorer and set TESTNET_USDT in .env.`
    );
  }

  console.log(`Network:          ${cfg.name} (chainId ${cfg.chainId})`);
  console.log(`Deployer:         ${deployer.address}`);
  console.log(`USDT:             ${usdt}`);
  console.log(`Fee recipient:    ${feeRecipient} (3% = ${300} bps, hardcoded)`);

  const PoetryArchive = await ethers.getContractFactory("PoetryArchive");
  const archive = await PoetryArchive.deploy(usdt, feeRecipient);
  await archive.waitForDeployment();

  const address = await archive.getAddress();
  console.log(`\nPoetryArchive deployed to: ${address}`);
  console.log(`Explorer: ${cfg.explorer}/address/${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
