# Agent Streak — Mainnet Deployment Record

- **Date:** 2026-11-18 (~12:07 UTC)
- **Chain:** BNB Smart Chain mainnet (chain ID 56)
- **Contract:** AgentStreak
- **Contract address:** `0xeacDD1D05354e70E16C00f6cb927c1463baC67E5`
- **BscScan:** https://bscscan.com/address/0xeacDD1D05354e70E16C00f6cb927c1463baC67E5
- **Deploy tx:** `0x578f67d8f1716ed184cb4ec4fb8fa77c250f3d7e86b5ae66d0b347d2b7028632`
- **Block:** 134308659 (status 1, success)
- **Deployer (throwaway):** `0xBb037Cd094C81b2378148A1626FfBB22F4ae9404` — funded with 0.0001 BNB by the submitter; key to be discarded after deployment, never reused.
- **Gas used:** 361,218 at 0.05 gwei (measured before broadcast; deploy rule was ≤0.1 gwei)
- **Deploy cost:** 0.0000180609 BNB
- **Deployer balance after deploy:** 0.0000819391 BNB
- **Agent ID contract (constructor arg):** `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` (SPACE ID Agent ID, verified live via `agentId()`)

## Source verification

- **Sourcify: exact_match** (match, creationMatch, runtimeMatch all `exact_match`, chain 56).
  Verification job: `f2c8f2c7-42a3-475c-b55f-23e2a589b7af`
  (https://sourcify.dev/server/verify-ui/jobs/f2c8f2c7-42a3-475c-b55f-23e2a589b7af)
- **BscScan-native (Etherscan-style) verification:** status not confirmed from the API without an API key — the Etherscan V2 API returns "Missing/Invalid API Key" for `checkverifystatus`, and the BscScan page itself is Cloudflare-blocked for automated fetch. Sourcify forwarded an Etherscan verification with guid `zzvcu4mseezudvsxwj1n2y5mgxpvcdp9l4sfwz6ehrscniyd82`. Next step if BscScan-native display is required: create a free BscScan account, take an API key, and run `forge verify-contract --chain 56 --etherscan-api-key <key> 0xeacDD1D05354e70E16C00f6cb927c1463baC67E5 contracts/AgentStreak.sol:AgentStreak` (compiler 0.8.20, optimizer on, 200 runs). The contract source is already publicly verifiable via Sourcify.

## Live read-only checks after deploy (no state changed)

- `agentId()` → `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` ✓
- `currentStreak(deployer)` → 0 ✓
- `totalCheckIns(deployer)` → 0 ✓
- `longestStreak(deployer)` → 0 ✓
- `totalCheckinCount()` → 0 ✓
- `checkIn()` from the deployer (eth_call) → reverts `AgentStreak: no Agent ID` ✓ — the holder gate works; the deployer holds no Agent ID.
- No real check-in was performed from any wallet. The first real check-in belongs to the submitter (Agent ID holder ngabowibro.ai) via the frontend.

## Frontend

- `frontend/app.js` CONFIG `CONTRACT_ADDRESS_MAINNET` set to the deployed address; `node --check` passes. The footer in `frontend/index.html` now shows the deployed address.
- Hosting + public GitHub repo still pending (needs the submitter's GitHub authorization).
