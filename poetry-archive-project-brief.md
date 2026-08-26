# Project Brief: [Working Title] — On-Chain Poetry Archive on BOT Chain

This document is a complete implementation spec. It is meant to be handed to an AI coding assistant (or a human developer) with no additional context required. Read it fully before writing any code — the smart contract section is immutable once deployed, so it must be implemented exactly as specified, with no shortcuts or simplifications.

---

## 1. Project Summary

A permanent, low-cost, censorship-resistant archive for poetry and short text, deployed on BOT Chain. Authors claim a username, post poems, and readers can tip authors directly in USDT or BOT. The project is economically viable specifically because BOT Chain has sub-second finality and near-zero fees — this would be cost-prohibitive on a chain like Ethereum mainnet at scale, which is a deliberate part of the project's narrative.

Core philosophy: **the chain as witness, not custodian.** The chain proves who posted what, and when, immutably. It does not moderate, does not gatekeep, and does not store anything beyond what is necessary to prove authorship and route payments.

This is being built for the BOT Chain Builder Challenge hackathon, with a secondary goal of applying for an ecosystem grant afterward. The submission should demonstrate a complete, working MVP plus a credible, clearly documented roadmap for subsequent phases — grant reviewers respond well to "this works today, and here is exactly what we build next," not an overbuilt, half-finished product.

Ship target: **BOT Chain Testnet first** (Chain ID 968). Mainnet (Chain ID 677) is configured but dormant, following the same pattern as prior projects on this chain — a single config flag switches networks without code changes.

---

## 2. BOT Chain Technical Facts (verified, use exactly as given)

- **Chain type:** EVM-compatible Layer 1, built specifically for AI agents and DePIN networks, positioned as "AI-Native."
- **Consensus:** SPoA (hybrid) — combines physical compute-backed authority with staking-based consensus. Marketed heavily on institutional-grade security and BFT slashing logic.
- **Performance:** 0.75-second block time; approximately 0.9-second average finality.
- **Compatibility:** Full EVM compatibility — Solidity, MetaMask, Hardhat, Foundry, ethers.js, web3.js all work with no special adaptation.
- **Native gas token:** BOT.
- **Testnet:** Chain ID 968, RPC `https://rpc.bohr.life`, Explorer `https://scan.bohr.life`, Faucet `https://faucet.botchain.ai/basic` (dispenses both test BOT and test USDT).
- **Mainnet:** Chain ID 677, RPC `https://rpc.botchain.ai`, Explorer `https://scan.botchain.ai`.
- **Testnet USDT contract address:** `0x75edC9335175Fc0552D51D48439F229c10420fe3` (confirmed by user).
- **Mainnet USDT contract address:** `0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C` — verify this again on `scan.botchain.ai` immediately before mainnet deployment, since token contract addresses are exactly the kind of value that must be triple-checked before any production use, not taken from memory or a prior note.
- **Ecosystem framing:** BOT Chain explicitly positions itself around AI agents, DePIN, and — as of very recently — RWA tokenization ("RWA Core" infrastructure, per their own blog as of Aug 21, 2026). A poetry provenance/archive project fits the "real-world creative IP, timestamped and verified on-chain" angle well and can be framed as complementary to their RWA narrative in the pitch.
- **Brand assets:** Official brand kit and brand guideline PDF exist at `https://www.botchain.ai/static/BOT%20Chain%20Assets/BOT%20Chain%20Brand%20Kit.zip` and the accompanying guideline PDF, linked from botchain.ai's footer. **Exact brand hex codes could not be extracted for this document** — download the brand kit directly and pull the real palette from it before finalizing the UI theme. Section 6 below gives a placeholder dark-green palette based on typical BOT Chain visual branding (dark backgrounds, green accents) — treat these as a starting point to be corrected against the real brand kit, not as final values.

---

## 3. Contract Architecture — Three-Tier Model

This project is deliberately split into three tiers based on mutability constraints. This distinction must be preserved in the build — do not collapse tiers 2 and 3 into the core contract "for convenience."

### Tier 1 — Core contract (deploy once, immutable, must be complete and correct on first deploy)
Everything a user directly and permanently depends on. No field, mapping, or event parameter can be added after deployment without a full migration that breaks continuity for existing users. Get this right before writing any other code.

### Tier 2 — Satellite contracts (deployed independently, added anytime post-launch)
New contracts that reference the core contract's public data (poem IDs, author addresses) without requiring any changes to the core contract. This is where future features that are still undecided in design should live.

### Tier 3 — Site/frontend features (pure client-side, zero contract dependency)
UI, display logic, sorting, filtering, visualization. Iterate freely, redeploy anytime, no gas cost, no permanence risk.

---

## 4. Tier 1: Core Contract Specification

### 4.1 Contract name
`PoetryArchive.sol`

### 4.2 Design principle: content in events, not storage
Solidity `storage` writes cost roughly 20,000 gas per 32-byte slot. `event` logs cost a small fraction of that (no `SSTORE`, only `LOG` opcodes) and are still permanently, publicly readable on-chain — just not readable *by other contracts*, only by off-chain indexers and frontends. Since this dApp never needs on-chain contract logic to read poem text back (only display it to users), poem content belongs in events. Keep only what other contract functions need to read (author lookups, hash checks, tip routing) in actual storage.

### 4.3 Username registry

```solidity
mapping(address => string) public addressToUsername;
mapping(string => address) public usernameToAddress;

event UsernameClaimed(address indexed user, string username, uint256 timestamp);

function claimUsername(string calldata username) external {
    require(bytes(username).length > 0 && bytes(username).length <= 32, "Invalid username length");
    require(usernameToAddress[username] == address(0), "Username taken");
    require(bytes(addressToUsername[msg.sender]).length == 0, "Address already has a username");
    usernameToAddress[username] = msg.sender;
    addressToUsername[msg.sender] = username;
    emit UsernameClaimed(msg.sender, username, block.timestamp);
}
```

Decisions locked in for MVP:
- One username per address, permanent, no renaming (renaming can be a Tier 2 feature later if wanted — do not build it into core now).
- No fee to claim a username in MVP. This is the anti-spam gate for posting (see 4.5) rather than a monetized action.
- Validate character set client-side (alphanumeric + underscore, no spaces) — do not over-engineer on-chain string validation beyond length, since Solidity string manipulation is gas-expensive and this is enforceable well enough at the UI layer.

### 4.4 Poem posting

```solidity
uint256 public nextPoemId;
mapping(uint256 => address) public poemAuthor;
mapping(uint256 => bytes32) public poemContentHash;
mapping(bytes32 => bool) public hashExists;

event PoemPosted(
    address indexed author,
    uint256 indexed poemId,
    uint256 indexed parentPoemId,
    string title,
    string content,
    uint8 license,
    uint256 timestamp
);

enum License { AllRightsReserved, CC0, CC_BY, CC_BY_SA }

function postPoem(
    string calldata title,
    string calldata content,
    uint256 parentPoemId,
    License license
) external returns (uint256) {
    require(bytes(addressToUsername[msg.sender]).length > 0, "Must claim a username before posting");
    require(bytes(content).length > 0, "Content required");
    if (parentPoemId != 0) {
        require(poemAuthor[parentPoemId] != address(0), "Parent poem does not exist");
    }
    bytes32 contentHash = keccak256(abi.encodePacked(content));
    require(!hashExists[contentHash], "Duplicate content already posted");

    uint256 poemId = ++nextPoemId; // start at 1, so 0 can mean "no parent"
    poemAuthor[poemId] = msg.sender;
    poemContentHash[poemId] = contentHash;
    hashExists[contentHash] = true;

    emit PoemPosted(msg.sender, poemId, parentPoemId, title, content, uint8(license), block.timestamp);
    return poemId;
}
```

Critical decisions locked in — do not deviate:
- **`parentPoemId` field exists in the event from day one**, even though threaded replies are a Tier 2/3 feature not built into the MVP UI. This field cannot be added later. Use `0` to mean "no parent, this is a root poem." Poem IDs start at 1, never 0, specifically so 0 is unambiguous as "no parent."
- **`license` field exists from day one** as a `uint8` enum, for the same reason — even if the UI doesn't expose license selection at launch, default every MVP submission to `License.AllRightsReserved` (0) and the field is there for Tier 3 to read whenever the UI catches up.
- **Duplicate detection is exact-hash only.** This catches copy-paste reposting, not paraphrased plagiarism. State this limitation honestly in the README — do not oversell it as plagiarism detection.
- **Username required to post.** This is the spam gate. Do not add a separate posting fee in the MVP — requiring a claimed username (which costs gas itself, and is one-per-address) is sufficient friction for a hackathon-stage launch.

### 4.5 Tipping with platform fee

```solidity
IERC20 public immutable botToken;   // if tipping in native BOT, handle separately as payable, see note below
IERC20 public immutable usdtToken;  // BOT Chain USDT
address public immutable platformFeeRecipient;
uint16 public constant PLATFORM_FEE_BPS = 300; // 3%, immutable, hardcoded, no setter — see rationale below

event PoemTipped(uint256 indexed poemId, address indexed tipper, address indexed author, address token, uint256 amount, uint256 fee);

function tipPoemUSDT(uint256 poemId, uint256 amount) external {
    address author = poemAuthor[poemId];
    require(author != address(0), "Poem does not exist");
    require(msg.sender != author, "Cannot tip yourself");
    require(amount > 0, "Amount must be greater than zero");

    uint256 fee = (amount * PLATFORM_FEE_BPS) / 10000;
    uint256 authorAmount = amount - fee;

    usdtToken.safeTransferFrom(msg.sender, author, authorAmount);
    if (fee > 0) {
        usdtToken.safeTransferFrom(msg.sender, platformFeeRecipient, fee);
    }
    emit PoemTipped(poemId, msg.sender, author, address(usdtToken), amount, fee);
}

function tipPoemBOT(uint256 poemId) external payable {
    address author = poemAuthor[poemId];
    require(author != address(0), "Poem does not exist");
    require(msg.sender != author, "Cannot tip yourself");
    require(msg.value > 0, "Amount must be greater than zero");

    uint256 fee = (msg.value * PLATFORM_FEE_BPS) / 10000;
    uint256 authorAmount = msg.value - fee;

    (bool sentAuthor, ) = author.call{value: authorAmount}("");
    require(sentAuthor, "Transfer to author failed");
    if (fee > 0) {
        (bool sentFee, ) = platformFeeRecipient.call{value: fee}("");
        require(sentFee, "Transfer of fee failed");
    }
    emit PoemTipped(poemId, msg.sender, author, address(0), msg.value, fee);
}
```

Critical decisions locked in:
- **Support both USDT and native BOT tipping from day one.** Two separate functions is simpler and safer than one function branching on token type — do not try to unify these into a single generic function, the native-token `payable` pattern and ERC-20 `safeTransferFrom` pattern are different enough that combining them adds risk for no benefit.
- **Fee is 3% (300 basis points), hardcoded as `constant`, no setter function, ever.** This is a deliberate trust decision: users should be able to verify from the contract source that the fee can never be raised by an owner later. If the fee ever needs to change, that requires a new contract version — which is the correct tradeoff for user trust over operator convenience.
- **`platformFeeRecipient` is `immutable`, set once in the constructor, never changeable.** Same rationale.
- **Self-tipping is blocked** (`msg.sender != author`) specifically to prevent gaming any future engagement-based reward system that reads tip data (see Tier 2, section 5).
- **Direct transfer, not pooled-then-withdrawn.** Sending directly to author and fee recipient in the same transaction is simpler and avoids needing a `withdraw()` function or holding a balance in the contract at all — less attack surface.

### 4.6 Constructor

```solidity
constructor(address _usdtToken, address _platformFeeRecipient) {
    require(_usdtToken != address(0), "USDT address required");
    require(_platformFeeRecipient != address(0), "Fee recipient required");
    usdtToken = IERC20(_usdtToken);
    platformFeeRecipient = _platformFeeRecipient;
}
```

For testnet deployment, `_usdtToken` is BOT Chain Testnet's test USDT contract: `0x75edC9335175Fc0552D51D48439F229c10420fe3` (confirmed by user; cross-check once against a recent transaction on `scan.bohr.life` before deploying, as good practice). It must not be assumed to match the mainnet address.

### 4.7 Explicit non-goals for Tier 1 (do not build these into the core contract)
- No on-chain moderation/flagging logic — this belongs in Tier 2 as a separate contract, since moderation policy will evolve and should not be locked into immutable code.
- No reward pool / engagement-based distribution — Tier 2, see section 5.
- No anthology/collection bundling — Tier 2.
- No owner-adjustable parameters of any kind (fee, fee recipient, username cost) — everything monetary in Tier 1 is immutable by design.
- No pausability/upgradeability pattern (no proxy, no `Ownable` pause switch) — keep the core contract genuinely immutable and trustless; this is a feature of the design, not a missing safety net. Emergency response, if ever needed, happens at the frontend level (stop pointing the UI at a compromised contract) not the contract level.

---

## 5. Tier 2: Satellite Contracts (build after MVP, or scope as documented roadmap for grant application)

These are separate contract deployments that read the core contract's public data. None of them require modifying `PoetryArchive.sol`.

1. **Reward pool contract.** Receives accumulated platform fees (or a separate funding source) and distributes to poems based on engagement (unique tipper count, weighted to prevent whale dominance). Self-tipping is already blocked at the core contract level, so this contract can trust tip data without re-checking that. Fund this from the 3% platform fee itself for long-term sustainability rather than a one-time grant allocation that runs out.
2. **Anthology NFT contract.** A standard ERC-721 where each token stores an array of existing `poemId`s, minted by a "curator" role. Purely additive — reads `poemAuthor` from the core contract for attribution but writes nothing back to it.
3. **Moderation/flagging contract.** A simple `flag(poemId, reason)` function, keyed by the same public `poemId`. Frontend reads flags from this contract to decide what to hide from the UI. Explicitly document that flagging **hides content from the app's display only** — it does not and cannot remove it from the chain. This honesty matters for both user trust and grant reviewer credibility.
4. **Staking-weighted curation contract** (later-stage roadmap item, do not attempt for hackathon deadline). Users stake tokens to boost visibility of a poem; stake is returned after a period.

For the hackathon submission, document all four of these clearly in the README/pitch as "Phase 2" — a working core plus a credible technical roadmap is a stronger grant narrative than attempting all of this now and shipping something half-broken.

---

## 6. Tier 3: Frontend / Site Specification

### 6.1 Stack (fixed — do not substitute without reason)
- **React + Vite** — fast dev loop, matches prior project tooling.
- **viem** — all contract reads, writes, and event watching. Do not use ethers.js; consistency with prior tooling reduces integration bugs.
- **Reown AppKit** — wallet connection layer (WalletConnect infra, mobile deep links, session management). Do not hand-roll a `window.ethereum` wallet layer; Reown owns the connection/session, viem owns the chain calls — do not mix these responsibilities.
- **Tailwind CSS** — utility-first styling, configured with a custom color palette (see 6.3) so theme values are centralized, not hardcoded per-component.
- **Framer Motion** — for the "fluid, minimalist" feel specifically requested: entrance animations on feed items, tip micro-interactions, smooth transitions. This is a new addition relative to prior projects, included specifically because fluidity was a stated requirement, not decorative.

### 6.2 Fluidity requirements (concrete, not a vibe)
- **Entrance animations**: new poems fade/slide into the feed rather than snapping into existence (Framer Motion `AnimatePresence` + `motion.div` with staggered children).
- **Optimistic UI**: when a user submits a poem or a tip, show it in a "pending" state immediately, before transaction confirmation — do not freeze the UI waiting for the receipt. Update to "confirmed" once the receipt lands; roll back cleanly with an error state if the transaction reverts.
- **Skeleton loaders**, not spinners, while historical events load via `getLogs`.
- **Micro-interactions**: tip button shows a small floating "+0.5 USDT" animation on send; hover/press states on all interactive elements; no dead, static buttons.
- **No layout shift**: reserve space for avatars/usernames/content blocks before data loads.

### 6.3 Visual theme
Dark, minimalist, green-accented, matching BOT Chain's general dark-tech visual identity. **Important: the exact hex values below are a reasonable placeholder, not verified brand colors.** Before final implementation, download BOT Chain's official brand kit (`https://www.botchain.ai/static/BOT%20Chain%20Assets/BOT%20Chain%20Brand%20Kit.zip`) and its brand guideline PDF, and replace these values with the real palette.

```js
// tailwind.config.js — colors block, placeholder values pending brand kit verification
colors: {
  background: '#0a0f0d',
  surface: '#111814',
  surfaceHover: '#161f1a',
  primary: '#22c55e',
  primaryMuted: '#16a34a',
  border: '#1f2b24',
  textPrimary: '#e8f5ee',
  textSecondary: '#8ba597',
}
```

Layout principles:
- Restrained hierarchy: one accent color (`primary` green) used sparingly for calls-to-action and highlights, not throughout.
- Generous whitespace; minimalist means restraint, not sparseness.
- Typography: a clean sans-serif for UI chrome (navigation, buttons, metadata), paired with a subtle serif for poem body text specifically — this typographic contrast visually distinguishes "content" (the poem) from "interface" (everything around it), which matters for a text-focused product.
- Poem cards should read like a page from a book sitting on a dark, minimal surface — not like a generic social media post.

### 6.4 Pages / views required for MVP
1. **Home / public feed** — chronological (or toggle: chronological / most-tipped) list of poems, live-updating via `watchContractEvent`, backfilled via `getLogs` on load.
2. **Poem detail view** — full poem text, author (username, linked to their profile), timestamp, license badge (even if always "All Rights Reserved" for now — the UI element should exist since the contract field exists), tip button.
3. **Claim username** — simple form, one-time action, clear messaging that this is permanent and required before posting.
4. **Post poem** — title + content fields, license selector (Tier 3 UI can expose this even though only one value is meaningfully used at launch), submit with optimistic UI.
5. **Author profile page** — username, wallet address (abbreviated), list of their posted poems, total tips received (aggregated client-side from `PoemTipped` events).
6. **Live activity view** (optional but recommended for demo impact) — a real-time feed combining a block-height ticker (`watchBlocks`) with decoded `PoemPosted`/`PoemTipped`/`UsernameClaimed` events rendering as cards as they happen. This is strong, low-effort demo material: it visibly proves the chain is live and every action is real, not simulated.

### 6.5 Network handling
- Default network: **BOT Chain Testnet (Chain ID 968)**. Follow the same pattern as prior projects: a single `ACTIVE_NETWORK_KEY` config flag switches to mainnet (Chain ID 677) later without rewriting code.
- Include a network gate component that prompts users to switch networks in their wallet if connected to the wrong chain.
- Tip currency selector: let the user choose USDT or native BOT when tipping, calling the corresponding contract function (`tipPoemUSDT` or `tipPoemBOT`).

### 6.6 No backend, no localStorage as source of truth
Consistent with prior project philosophy: no backend server. LocalStorage may be used only as a UI convenience (e.g., caching a "recently viewed" list), never as the source of truth for ownership, authorship, or tip history — all of that comes from the contract and its events, queried live.

---

## 7. Explicit Downsides to Document Honestly in the README (do not hide these — grant reviewers respond well to honesty about tradeoffs)

- Duplicate detection catches exact copy-paste only, not paraphrased plagiarism.
- Content posted on-chain is permanent and cannot be deleted; moderation (Tier 2) only controls what the app's UI displays, not what exists on the chain.
- The 3% tip fee is immutable by design — state clearly that this is a deliberate trust decision, not an oversight, and that it can only be changed via a new contract version, not a parameter update.
- No image or rich media support — frame this as a deliberate focus on being a dedicated text/poetry chain-witness, not a stripped-down general media platform.
- Content is currently only queryable from BOT Chain nodes; mirroring event logs to IPFS/Arweave as a backup/portability layer is a documented future roadmap item, not built at launch.

---

## 8. Deliverables Checklist for Implementation

- [ ] `PoetryArchive.sol` implementing exactly the functions and events in Section 4, no additions, no omissions
- [ ] Deployment script targeting BOT Chain Testnet (Chain ID 968), with constructor args for testnet USDT address (`0x75edC9335175Fc0552D51D48439F229c10420fe3`) and platform fee recipient wallet
- [ ] React + Vite frontend implementing all six views in Section 6.4
- [ ] Reown AppKit wallet integration, network gate for Chain ID 968
- [ ] Tailwind theme configured per Section 6.3, to be corrected against the real BOT Chain brand kit before final polish
- [ ] Framer Motion interactions per Section 6.2
- [ ] README documenting: project overview, architecture, the three-tier contract/site distinction from Section 3, the honest downsides from Section 7, and the Tier 2 roadmap from Section 5 as "Phase 2"
