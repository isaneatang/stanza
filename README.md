# Stanza — an on-chain poetry archive on BOT Chain

*A permanent, low-cost, censorship-resistant archive for poetry and short text.*

Authors claim a username, post poems, and readers tip authors directly in USDT or native BOT.
The chain is the **witness, not the custodian**: it proves who posted what, and when, immutably.
It does not moderate, does not gatekeep, and stores nothing beyond what is needed to prove
authorship and route payments.

> Working title: **Stanza**. Built for the BOT Chain Builder Challenge, with an ecosystem-grant
> application to follow.

---

## Architecture — three tiers by mutability

| Tier | What | Mutability rule |
|------|------|-----------------|
| **1 — Core contract** | `contracts/contracts/PoetryArchive.sol` | Deploy once, immutable. No field/event parameter can ever be added without a migration. |
| **2 — Satellite contracts** | Reward pool · anthology NFTs · flagging · staked curation | Deployed independently *after* launch; read core data, never write back. Phase 2 (see roadmap). |
| **3 — Site/frontend** | `web/` (React + Vite + viem) | Pure client-side. Iterate and redeploy freely; zero gas, zero permanence risk. |

Tiers 2 and 3 are deliberately **not collapsed into the core contract**. Everything monetary in
Tier 1 is immutable: no owner, no pause switch, no proxy, no setter functions.

### Design highlights

- **Content lives in events, not storage.** Poem text is emitted in `PoemPosted` events (~cheap
  LOG opcodes) while only author lookups, content hashes, and tip routing use storage. The dApp
  never needs on-chain logic to re-read poem content, so events are strictly cheaper and still
  permanently public.
- **Forward-compatible fields from day one.** `parentPoemId` (0 = root poem) and `license`
  (`uint8` enum: AllRightsReserved / CC0 / CC_BY / CC_BY_SA) exist in the event schema even though
  the MVP UI only partially uses them. They cannot be retrofitted later.
- **Duplicate detection is exact-hash only** (`keccak256(content)`), which catches copy-paste
  reposting — *not* paraphrased plagiarism.
- **Username as spam gate.** One permanent username per address, free apart from gas. No separate
  posting fee in the MVP.
- **3% tip fee, hardcoded forever.** `PLATFORM_FEE_BPS = 300` is a `constant`; there is no setter,
  ever. The fee recipient is `immutable`, set in the constructor. Users can verify from source that
  neither can be raised. Changing either requires a new contract version — a deliberate trade of
  operator convenience for user trust.
- **Direct transfer tips.** USDT tips are pulled via `safeTransferFrom` straight to author + fee
  recipient; BOT tips are forwarded with `call`. The contract holds no balance and needs no
  `withdraw()`.
- **Self-tipping is blocked** at the protocol level, which keeps tip data trustworthy for any
  future engagement-based reward system.

---

## Networks

Single config flag switches networks without code changes:

| | Testnet (active) | Mainnet (dormant) |
|---|---|---|
| Chain ID | 968 | 677 |
| RPC | `https://rpc.bohr.life` | `https://rpc.botchain.ai` |
| Explorer | `https://scan.bohr.life` | `https://scan.botchain.ai` |
| USDT | `0x75edC9335175Fc0552D51D48439F229c10420fe3` | `0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C` ⚠️ re-verify on explorer immediately before mainnet deploy |
| Faucet | https://faucet.botchain.ai/basic | — |

---

## Repository layout

```
poetry-archive/
├── contracts/                  # Tier 1 — Hardhat project
│   ├── contracts/PoetryArchive.sol
│   ├── contracts/mocks/MockUSDT.sol   # test-only ERC20
│   ├── scripts/deploy.ts       # deploy with constructor args for active network
│   ├── test/PoetryArchive.test.ts
│   └── hardhat.config.ts       # both chains pre-configured
└── web/                        # Tier 3 — React + Vite frontend
    └── src/
        ├── config/networks.ts  # ACTIVE_NETWORK_KEY single switch point
        ├── lib/store.ts        # event-log index: backfill + live watch, no backend
        ├── lib/actions.ts      # claim / post / tip tx builders (viem)
        ├── lib/appkit.ts       # Reown AppKit wallet layer
        └── pages/              # feed · detail · claim · post · profile · live
```

## Getting started

### 1. Contracts

```bash
cd contracts
npm install
npx hardhat compile
npx hardhat test

cp .env.example .env          # add funded DEPLOYER_PRIVATE_KEY
npm run deploy:testnet        # targets chain 968, uses confirmed testnet USDT
```

Set `PLATFORM_FEE_RECIPIENT` in `.env` if the fee should go somewhere other than the deployer.

### 2. Frontend

```bash
cd web
npm install
cp .env.example .env.local    # set VITE_CONTRACT_ADDRESS from the deploy output above
npm run dev                   # http://localhost:5173
```

Get a WalletConnect project id from [reown.com](https://reown.com) for `VITE_REOWN_PROJECT_ID`
(injected wallets like MetaMask work without one).

### Frontend notes

- **No backend. No localStorage as source of truth.** Everything shown is derived live from the
  contract's event logs: a chunked adaptive `eth_getLogs` backfill plus `watchContractEvent`
  subscriptions. LocalStorage is used only as UI convenience, never for ownership or history.
- **Optimistic UI**: posts appear instantly in a dashed "waiting for confirmation" card, resolve
  when the event lands, roll back with an inline error if the tx reverts. Tips animate
  `+X USDT/BOT` on send.
- Feed cards show the first four lines, with a full reading view on expand. Likes are currently a
  local reading-list signal in the browser; they are not presented as on-chain engagement.
- **Network gate**: connected on the wrong chain → full-screen prompt with one-click switch.
- Visual theme is a placeholder dark-green palette pending verification against the official
  [BOT Chain brand kit](https://www.botchain.ai/static/BOT%20Chain%20Assets/BOT%20Chain%20Brand%20Kit.zip).

---

## Honest limitations (by design, documented deliberately)

1. **Duplicate detection catches exact copy-paste only** — paraphrased plagiarism passes through.
2. **Posted content is permanent.** It cannot be edited or deleted, by anyone, including its author.
3. **Moderation can never remove on-chain content.** A future flagging contract (Phase 2) can only
   hide poems from this app's display; the chain keeps them regardless.
4. **The 3% fee cannot be changed**, even by us. Immutable by design; only a new contract version
   could alter it.
5. **No images or rich media** — Stanza is intentionally a dedicated text/poetry witness, not a
   general media platform.
6. **Content is queryable only from BOT Chain nodes at launch.** Mirroring event logs to
   IPFS/Arweave as a portability backup is a roadmap item, not built yet.

## Phase 2 roadmap (satellite contracts, all additive)

1. **Reward pool** — distributes accumulated platform fees to poems by engagement (unique tippers,
   whale-weighted); self-tip blocking in the core makes this data trustable without re-checks.
2. **Anthology NFTs** — curator-minted ERC-721 collections referencing existing `poemId`s.
3. **Flagging/moderation contract** — `flag(poemId, reason)`; the frontend reads flags and hides
   flagged content from display only (see limitation 3).
4. **Staking-weighted curation** — stake-to-boost visibility with time-locked return (later stage).
5. **Threaded replies in the UI** — `parentPoemId` already exists in the event schema; only Tier 3
   work remains.
6. **Event-log mirroring to IPFS/Arweave** for archival redundancy.

### Engagement note

Likes need a durable source of truth before they can be used for ranking or rewards. The current
frontend stores a reader's liked poem IDs locally as a lightweight interaction, without pretending
that the signal is global or permanent. A future engagement satellite contract can add a
`PoemLiked` event keyed by `poemId` and reader address; the frontend can then replace the local
toggle with a transaction and derive counts from logs without changing the immutable archive.
