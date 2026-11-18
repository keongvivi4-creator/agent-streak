# Submission — Agent Streak (Agent ID Hackathon)

Hackathon: Agent ID Hackathon (Binance Wallet + BNB Chain).
Submission period: **18 Nov 2026 08:00 UTC – 9 Dec 2026 08:00 UTC**.
Total rewards 60,000 USDC: Growth Award 29,000 (top 10, on-chain metrics) +
Innovation Award 29,000 (top 10, judging panel, 100 points) +
Community Promotion 2,000 (20 X-post winners).

## Project

- **Name:** Agent Streak
- **One-liner:** Daily on-chain check-in for Agent ID holders — check in once a
  day, build your streak, climb the leaderboard. Free, no fees, no tokens.
- **Category:** Identity / engagement dApp built around Agent ID.
- **Submitter:** wallet `0xA2b67aeab53FFf91efd81082E303374F7ddfa8CF`
  (Agent ID `ngabowibro.ai`, verified on-chain `balanceOf == 1`).
- **Reward receiving address (to provide at submission):**
  `0xA2b67aeab53FFf91efd81082E303374F7ddfa8CF` (BSC, USDC).

## How Agent ID is used (for the submission form)

Agent ID is the core gate of the product, not a badge:

- `AgentStreak.checkIn()` calls `balanceOf(msg.sender)` on the SPACE ID
  Agent ID contract (`0x60b9262456de011f7d15a54cdd8c48baaa8b022f`) on every
  check-in. Only addresses holding an Agent ID can check in; everyone else
  reverts with `AgentStreak: no Agent ID`.
- The frontend shows the caller's own Agent ID status and streak, and links
  non-holders to claim an Agent ID in the wallet app.
- Streaks, totals, and the leaderboard are derived from the contract's
  `CheckedIn` events — every counted interaction is an on-chain transaction
  from an Agent ID holder address.
- Agent ID is never used to look up other people's wallets, and no Agent ID
  names are stored or displayed.

## Scoring fit (Innovation Award, 100 points)

- **Agent ID application depth (30%)** — Agent ID gates the single core action
  of the product; without it the contract does nothing.
- **Practicality & feasibility (25%)** — daily check-ins are a proven
  retention mechanic; the contract is minimal, audited by tests, and costs
  ~0.0000025 BNB per check-in at current gas.
- **Product completion (25%)** — contract + tests + live-chain E2E proof +
  working static frontend; deploys to mainnet as soon as the deploy decision
  below is approved.
- **Innovation (20%)** — first daily-streak primitive that turns the
  non-transferable Agent ID into a persistent, public reputation signal
  (streaks are portable social proof for agents and their owners).

## Contract addresses

| Network | Contract | Address | Status |
|---|---|---|---|
| BNB Chain mainnet (56) | AgentStreak | TBD | NOT deployed yet — deploy decision pending |
| BNB Chain mainnet (56) | Agent ID (SPACE ID) | `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` | live, verified by Binance |
| BSC Testnet (97) | AgentStreak | TBD | blocked on faucet captcha (see below) |
| BSC Testnet (97) | MockAgentId (test double) | TBD | testnet only, never mainnet |

## Submission checklist

- [x] Contract written, tested (11/11 incl. 256-run fuzz), E2E-proven on a
      live local chain (deploy script, mint, check-in, streak growth, reset,
      double-check-in revert).
- [x] Frontend built (static, no build step, injected wallet only, no QR
      login, no credential collection).
- [x] README + deploy scripts + BscScan verification guide written.
- [x] Gas math done: deploy 361,218 gas ≈ 0.0000181 BNB at 0.05 gwei;
      wallet balance 0.0003614 BNB. Deploy affordable NOW at ≤0.1 gwei.
- [ ] **DECISION 1 — mainnet deploy route (needs parent/user approval):**
      the submitter wallet is a keyless Agentic Wallet; the `baw` CLI has no
      contract-deploy command. Practical route: create a fresh deployer
      keypair, have the user send ~0.0001 BNB to it from the wallet app
      (one small manual transfer), deploy + verify with Foundry, then the
      deployer key is discarded. Alternative: check whether `baw` can send a
      contract-creation transaction. DO NOT deploy until approved.
- [ ] **DECISION 2 — testnet faucet:** tBNB faucet
      (testnet.bnbchain.org/faucet-smart) is hCaptcha-gated — needs a human
      to solve it for deployer `0xBb037Cd094C81b2378148A1626FfBB22F4ae9404`
      (0.1 tBNB is ~1,600× more than the ~0.00006 tBNB the testnet deploy
      needs). Or fund that address from another testnet holder. Testnet deploy
      is optional (mainnet is what counts) but proves the full flow publicly.
- [ ] Deploy mainnet + verify on BscScan (source open, optimizer 0.8.20/200).
- [ ] Fill deployed addresses into `frontend/app.js` CONFIG.
- [ ] Host the frontend (recommended: public GitHub repo `agent-streak` +
      GitHub Pages — also serves as the open-source code link for submission).
- [ ] **Find the project submission form.** Status 18 Nov ~11:48 UTC:
      the announcement text contains NO project-submission link. The only
      verified survey link is the Community Promotion one:
      `https://app.binance.com/uni-qr/user-survey/ff6832f8d2984af289068c9450a3c98c`
      (X-post links, NOT confirmed as the project form — do not use it as a
      project submission until confirmed). The project form likely has not
      been published yet (announcement is ~4h old). Re-check in 1–2 days:
      the announcement page, X @BinanceWallet / @BNBCHAIN, and the Binance
      Wallet app banner. If the survey turns out to be a combined form,
      confirm its fields via the Binance app first.
- [ ] Submit the project (name, website, contract address, Agent ID usage
      description, reward address) during the submission period.
- [ ] Promotion to reach 30+ interacting Agent ID holders
      (see `PROMOTION_PLAN.md`) — Innovation eligibility requires ≥30 distinct
      Agent ID addresses interacting during the submission period; Growth
      ranking also counts interacting addresses + tx count/volume.
- [ ] (Optional, separate) Community Promotion Award: post about the project
      on X with `#BinanceWalletHackathon` + `#AgenticWallet` and submit the
      X link via the survey above (20 winners share 2,000 USDC).

## Red-line compliance statement

- No web QR login or pairing-code capture; no server-stored sessions.
- No bypass of user transaction confirmation; every check-in is a normal
  wallet transaction the user sees and confirms.
- No unauthorized transfers; the contract cannot move any funds.
- No promised returns; no "passive income" language anywhere.
- No collection of seed phrases, private keys, API secrets, or pairing codes.
- No "Binance"/"BNB" in the project name, token name (none exists), or domain.
- Contract open-source, MIT, zero owner permissions (no owner exists).
- Agent ID is not packaged as a wallet-lookup tool.
