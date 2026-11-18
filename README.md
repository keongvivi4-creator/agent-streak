# Agent Streak

Daily on-chain check-in for Agent ID holders. Holders check in once per UTC day,
build a consecutive-day streak, and compete on a public leaderboard. Free to use —
no fees, no tokens, no accounts, no server.

Built for the **Agent ID Hackathon** (Binance Wallet + BNB Chain), submission period
18 Nov 2026 08:00 UTC – 9 Dec 2026 08:00 UTC. Total rewards 60,000 USDC
(Growth Award 29,000 + Innovation Award 29,000 + Community Promotion 2,000).

## How it works

1. Connect a wallet (injected provider only — no QR login, no server account).
2. The page checks `balanceOf(your address)` on the Agent ID contract
   (`0x60b9262456de011f7d15a54cdd8c48baaa8b022f`, SPACE ID Agent ID, ERC-721).
3. Holders click **Check In Today**. The contract records the UTC day, extends
   the streak if yesterday was also checked in, otherwise restarts it at 1.
4. Streaks and totals are readable on-chain; the leaderboard is built from
   `CheckedIn` events.

## Contract

`contracts/AgentStreak.sol` (Solidity ^0.8.20, MIT, optimizer on, runs 200).

- `checkIn()` — requires holding an Agent ID (`balanceOf(msg.sender) > 0`),
  one check-in per address per UTC day. Updates `lastCheckinDay`,
  `currentStreak`, `longestStreak`, `totalCheckIns`, `totalCheckinCount`,
  emits `CheckedIn(user, day, streak, totalCheckIns)`.
- `getStreak(address)` — current/longest/total/last day/checked-in-today.
- **No fees, no owner, no admin functions, no pause, no upgrade, no
  withdrawals.** `checkIn()` is not payable; the contract cannot hold or move
  funds. Agent ID is used only as a gate for the caller's own check-in — never
  to look up other people's wallets.

`contracts/MockAgentId.sol` is a **testnet-only** test double (the real Agent ID
exists only on BNB Chain mainnet). It is NOT part of the submission contract
set and must never be deployed on mainnet.

## Verified numbers (18 Nov 2026, measured with Foundry 1.9.0)

- Tests: **11/11 pass**, including a 256-run fuzz test on the streak math
  (`forge test` in `test/AgentStreak.t.sol`).
- Deploy gas (AgentStreak): **361,218 gas** (receipt-verified on local chain).
- Deploy gas (MockAgentId): 264,794 gas.
- `checkIn` gas: first check-in up to ~140,476; median 49,200; min 26,761.
- Live-chain end-to-end test (anvil): deploy script broadcast OK, mint mock ID,
  check-in day 1 (streak 1), double check-in reverts
  (`AgentStreak: already checked in today`), next-day check-in (streak 2),
  skipped-day check-in (streak resets to 1, longest preserved at 2).
- BSC mainnet gas price at time of writing: **0.05 gwei**;
  deploy cost at that price: **~0.0000181 BNB**.
  Submitter wallet balance: **0.0003614 BNB** — deploy is affordable at
  current gas, but NOT at 1 gwei (0.000361 BNB ≈ full balance) or higher.
  Deploy only while gas is ≤ 0.1 gwei; keep a reserve for check-ins
  (~0.000007 BNB for a first check-in at 0.05 gwei).

## Deploy

Prerequisites: [Foundry](https://getfoundry.sh) (`forge`, `cast`).

```bash
cp .env.example .env   # fill RPC URLs; never commit .env or keys
```

Mainnet (BNB Chain, chain 56) — requires approval + a funded deployer, see
`submission/SUBMISSION.md` for the open decision:

```bash
AGENT_ID=0x60b9262456de011f7d15a54cdd8c48baaa8b022f \
forge script script/Deploy.s.sol \
  --rpc-url https://bsc-dataseed.binance.org/ \
  --broadcast --verify --etherscan-api-key "$BSCSCAN_API_KEY"
```

BSC Testnet (chain 97) — needs tBNB from the faucet for the deployer address
in `.testnet-deployer.json` (mode 600, gitignored; throwaway keypair):

```bash
DEPLOY_MOCK=true AGENT_ID=0x0000000000000000000000000000000000000000 \
forge script script/Deploy.s.sol \
  --rpc-url https://data-seed-prebsc-1-s1.binance.org:8545/ \
  --broadcast --private-key "$(python3 -c "import json;print(json.load(open('.testnet-deployer.json'))['data'][0]['private_key'])")"
```

Then fill the deployed addresses into `frontend/app.js` `CONFIG`
(`CONTRACT_ADDRESS_MAINNET` / `CONTRACT_ADDRESS_TESTNET`,
`AGENT_ID_TESTNET` = deployed MockAgentId address).

## Verify on BscScan

```bash
forge verify-contract --chain-id 56 --etherscan-api-key "$BSCSCAN_API_KEY" \
  <DEPLOYED_ADDRESS> contracts/AgentStreak.sol:AgentStreak \
  --constructor-args $(cast abi-encode "constructor(address)" 0x60b9262456de011f7d15a54cdd8c48baaa8b022f)
```

Compiler settings must match: solc **0.8.20**, optimizer **enabled, runs 200**
(see `foundry.toml`). Or verify manually: BscScan → Contract → Verify &
Publish → Solidity single file, paste `contracts/AgentStreak.sol` (it has no
imports), same compiler/optimizer settings, constructor argument
`0x60b9262456de011f7d15a54cdd8c48baaa8b022f`.

## Frontend

Static site in `frontend/` — `index.html` + `style.css` + `app.js`, no build
step, ethers v6 via CDN. Serve any static host (e.g. GitHub Pages) or open
`index.html` directly. It only talks to the user's injected wallet and public
BSC RPC endpoints; it never asks for a seed phrase, private key, or pairing
code, and there is no QR login.

## Submission materials

See `submission/SUBMISSION.md` (checklist + materials) and
`submission/PROMOTION_PLAN.md` (how to reach 30+ interacting Agent ID holders).

## Red-line compliance

- No web QR login / pairing-code capture. No bypassing user transaction
  confirmation. No unauthorized transfers. No promised returns or
  "passive income". No collection of seed phrases, private keys, API secrets,
  or pairing codes. Project name, token (none), and domain use neither
  "Binance" nor "BNB". Contract is open-source with **zero** owner permissions
  (there is no owner). Agent ID is not used as a wallet-lookup tool.
