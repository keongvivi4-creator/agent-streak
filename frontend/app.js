/* Agent Streak — static frontend (no build step).
 *
 * Wallet connection is ONLY via the injected provider (window.ethereum,
 * e.g. the wallet extension). There is no QR login, no server login, and
 * this page NEVER asks for a seed phrase, private key, or pairing code.
 *
 * To deploy: replace the placeholder contract addresses below with the
 * real deployed addresses. Nothing else needs to change.
 */

// ---------------------------------------------------------------------------
// CONFIG — edit these when the contract is deployed.
// ---------------------------------------------------------------------------
const CONFIG = {
  CONTRACT_ADDRESS_MAINNET: "0xeacDD1D05354e70E16C00f6cb927c1463baC67E5", // deployed 2026-11-18, tx 0x578f67d8f1716ed184cb4ec4fb8fa77c250f3d7e86b5ae66d0b347d2b7028632
  CONTRACT_ADDRESS_TESTNET: "0x0000000000000000000000000000000000000000", // placeholder TBD
  AGENT_ID_MAINNET: "0x60b9262456de011f7d15a54cdd8c48baaa8b022f",
  AGENT_ID_TESTNET: "0x0000000000000000000000000000000000000000", // placeholder TBD — mock
  RPC_MAINNET: "https://bsc-dataseed.binance.org/",
  RPC_TESTNET: "https://data-seed-prebsc-1-s1.binance.org:8545/",
};

const NETWORKS = {
  56: {
    chainId: 56,
    name: "BSC Mainnet",
    rpc: CONFIG.RPC_MAINNET,
    contractAddress: CONFIG.CONTRACT_ADDRESS_MAINNET,
    agentIdAddress: CONFIG.AGENT_ID_MAINNET,
    explorer: "https://bscscan.com",
    chainParams: {
      chainId: "0x38",
      chainName: "BNB Smart Chain",
      nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
      rpcUrls: [CONFIG.RPC_MAINNET],
      blockExplorerUrls: ["https://bscscan.com"],
    },
  },
  97: {
    chainId: 97,
    name: "BSC Testnet",
    rpc: CONFIG.RPC_TESTNET,
    contractAddress: CONFIG.CONTRACT_ADDRESS_TESTNET,
    agentIdAddress: CONFIG.AGENT_ID_TESTNET,
    explorer: "https://testnet.bscscan.com",
    chainParams: {
      chainId: "0x61",
      chainName: "BNB Smart Chain Testnet",
      nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
      rpcUrls: [CONFIG.RPC_TESTNET],
      blockExplorerUrls: ["https://testnet.bscscan.com"],
    },
  },
};

// ---------------------------------------------------------------------------
// ABIs (use exactly as specified)
// ---------------------------------------------------------------------------
const AGENT_STREAK_ABI = [{"inputs":[{"internalType":"address","name":"agentId_","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"day","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"streak","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"totalCheckIns","type":"uint256"}],"name":"CheckedIn","type":"event"},{"inputs":[],"name":"agentId","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"checkIn","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"currentStreak","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getStreak","outputs":[{"internalType":"uint256","name":"currentStreak_","type":"uint256"},{"internalType":"uint256","name":"longestStreak_","type":"uint256"},{"internalType":"uint256","name":"totalCheckIns_","type":"uint256"},{"internalType":"uint256","name":"lastCheckinDay_","type":"uint256"},{"internalType":"bool","name":"checkedInToday","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"lastCheckinDay","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"longestStreak","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalCheckinCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"totalCheckIns","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}];

const AGENT_ID_ABI = [{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}];

// ---------------------------------------------------------------------------
// Leaderboard scan limits (BSC ~3s/block).
// 5,000 blocks per RPC call; walk back at most 40 chunks (~200,000 blocks,
// ~7 days) and stop early once enough events are collected.
// ---------------------------------------------------------------------------
const LEADERBOARD_BLOCK_CHUNK = 5000;
const LEADERBOARD_MAX_CHUNKS = 40;
const LEADERBOARD_MAX_EVENTS = 500;
const LEADERBOARD_TOP_N = 20;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let selectedChainId = 56; // default: BSC Mainnet
let userAddress = null;
let walletProvider = null; // ethers.BrowserProvider (only after Connect)
let isHolder = false;
let checkedInToday = false;
let leaderboardLoading = false;

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------
function $(id) { return document.getElementById(id); }

function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

function setGlobalNotice(message, isError) {
  const el = $("globalNotice");
  if (!message) { hide(el); el.textContent = ""; el.classList.remove("error"); return; }
  el.textContent = message;
  el.classList.toggle("error", !!isError);
  show(el);
}

function shortenAddress(address) {
  if (!address) return "";
  return address.slice(0, 6) + "…" + address.slice(-4);
}

function explorerTxUrl(chainId, hash) {
  return NETWORKS[chainId].explorer + "/tx/" + hash;
}
function explorerAddressUrl(chainId, address) {
  return NETWORKS[chainId].explorer + "/address/" + address;
}

function friendlyError(err) {
  if (!err) return "Something went wrong. Please try again.";
  // User rejected the request in their wallet.
  if (err.code === 4001 || err.code === "ACTION_REJECTED") {
    return "Transaction rejected in your wallet. Nothing was sent.";
  }
  if (err.code === 4902) {
    return "This network is not added to your wallet yet. Please add it and try again.";
  }
  if (err.code === -32002) {
    return "A wallet request is already open. Please check your wallet and try again.";
  }
  const message = String((err && err.reason) || (err && err.shortMessage) || (err && err.message) || err);
  if (/already checked in/i.test(message) || /checked in today/i.test(message)) {
    return "You have already checked in today. Come back tomorrow (UTC) to keep your streak going.";
  }
  if (/does not hold|no agent id|not.*holder|AgentId/i.test(message)) {
    return "This address does not hold an Agent ID, so it cannot check in yet.";
  }
  if (/insufficient funds/i.test(message)) {
    return "Not enough funds in your wallet to pay the network gas for this transaction.";
  }
  if (/network|fetch|timeout|CALL_EXCEPTION|SERVER_ERROR/i.test(message)) {
    return "Could not reach the network right now. Please check your connection and try again.";
  }
  // Never dump a raw revert blob at the user; keep the short reason if sane.
  return message.length > 220 ? "Something went wrong. Please try again." : message;
}

// ---------------------------------------------------------------------------
// Read-only (public RPC) access — works without a wallet.
// ---------------------------------------------------------------------------
function readProvider(chainId) {
  return new ethers.JsonRpcProvider(NETWORKS[chainId].rpc, chainId);
}

function readContract(chainId) {
  const net = NETWORKS[chainId];
  if (!net.contractAddress || net.contractAddress === ZERO_ADDRESS) return null;
  return new ethers.Contract(net.contractAddress, AGENT_STREAK_ABI, readProvider(chainId));
}

function agentIdContract(chainId) {
  const net = NETWORKS[chainId];
  if (!net.agentIdAddress || net.agentIdAddress === ZERO_ADDRESS) return null;
  return new ethers.Contract(net.agentIdAddress, AGENT_ID_ABI, readProvider(chainId));
}

function isContractConfigured(chainId) {
  return NETWORKS[chainId].contractAddress !== ZERO_ADDRESS;
}

// ---------------------------------------------------------------------------
// Network UI
// ---------------------------------------------------------------------------
function updateNetworkUI() {
  const net = NETWORKS[selectedChainId];
  $("currentNetwork").textContent = userAddress
    ? net.name + " (chain " + selectedChainId + ")"
    : net.name + " (chain " + selectedChainId + ") — wallet not connected";
  $("switchMainnetBtn").classList.toggle("active", selectedChainId === 56);
  $("switchTestnetBtn").classList.toggle("active", selectedChainId === 97);

  const notice = $("contractNotice");
  if (!isContractConfigured(selectedChainId)) {
    notice.textContent = "The Agent Streak contract has not been deployed on " + net.name +
      " yet — the contract address is still a placeholder. Check-ins and the leaderboard will be available once it is deployed.";
    show(notice);
  } else {
    notice.textContent = "Contract: " + net.contractAddress;
    show(notice);
  }
}

async function switchNetwork(chainId) {
  if (!window.ethereum) {
    setGlobalNotice("No wallet found. Please install a wallet extension (for example Binance Wallet or MetaMask) and refresh this page.", true);
    return;
  }
  const net = NETWORKS[chainId];
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: net.chainParams.chainId }],
    });
    // chainChanged handler below updates selectedChainId + refreshes.
  } catch (err) {
    if (err && err.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [net.chainParams],
        });
      } catch (addErr) {
        setGlobalNotice(friendlyError(addErr), true);
      }
    } else {
      setGlobalNotice(friendlyError(err), true);
    }
  }
}

// ---------------------------------------------------------------------------
// Wallet connection (injected provider only)
// ---------------------------------------------------------------------------
async function connectWallet() {
  if (typeof ethers === "undefined") {
    setGlobalNotice("Could not load the ethers library from the CDN. Please check your connection and refresh the page.", true);
    return;
  }
  if (!window.ethereum) {
    setGlobalNotice("No wallet found. Please install a wallet extension (for example Binance Wallet or MetaMask) and refresh this page.", true);
    return;
  }
  try {
    setGlobalNotice("");
    walletProvider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await walletProvider.send("eth_requestAccounts", []);
    if (!accounts || accounts.length === 0) {
      setGlobalNotice("No account was selected in your wallet. Please try connecting again.", true);
      return;
    }
    userAddress = accounts[0];
    const network = await walletProvider.getNetwork();
    const chainId = Number(network.chainId);
    if (NETWORKS[chainId]) selectedChainId = chainId;

    $("connectBtn").textContent = "Connected";
    $("connectBtn").disabled = true;
    const addrEl = $("walletAddress");
    addrEl.textContent = shortenAddress(userAddress);
    addrEl.title = userAddress;
    show(addrEl);

    updateNetworkUI();
    await refreshAll();
  } catch (err) {
    setGlobalNotice(friendlyError(err), true);
  }
}

function onAccountsChanged(accounts) {
  if (!accounts || accounts.length === 0) {
    // Wallet disconnected / locked.
    userAddress = null;
    walletProvider = null;
    $("connectBtn").textContent = "Connect Wallet";
    $("connectBtn").disabled = false;
    hide($("walletAddress"));
    resetStreakUI();
    updateNetworkUI();
    return;
  }
  userAddress = accounts[0];
  $("walletAddress").textContent = shortenAddress(userAddress);
  $("walletAddress").title = userAddress;
  refreshAll();
}

function onChainChanged(chainIdHex) {
  const chainId = parseInt(chainIdHex, 16);
  if (NETWORKS[chainId]) {
    selectedChainId = chainId;
    updateNetworkUI();
    refreshAll();
  } else {
    setGlobalNotice("Your wallet is on an unsupported network. Please switch to BSC Mainnet or BSC Testnet.", true);
  }
}

// ---------------------------------------------------------------------------
// Agent ID status + own streak
// ---------------------------------------------------------------------------
function resetStreakUI() {
  isHolder = false;
  checkedInToday = false;
  $("agentIdStatus").textContent = "Connect your wallet to check whether you hold an Agent ID.";
  $("agentIdStatus").className = "status-text";
  $("agentIdDetail").textContent = "";
  $("currentStreak").textContent = "—";
  $("longestStreak").textContent = "—";
  $("totalCheckIns").textContent = "—";
  $("todayStatus").textContent = "—";
  $("todayStatus").className = "status-text";
  updateCheckInButton();
}

async function refreshAgentIdAndStreak() {
  if (!userAddress) { resetStreakUI(); return; }

  // --- Agent ID holder check (read-only) ---
  const idContract = agentIdContract(selectedChainId);
  if (!idContract) {
    $("agentIdStatus").textContent = "Agent ID contract address is not configured for this network yet.";
    $("agentIdStatus").className = "status-text bad";
    isHolder = false;
  } else {
    try {
      const balance = await idContract.balanceOf(userAddress);
      isHolder = balance > 0n;
      if (isHolder) {
        $("agentIdStatus").textContent = "✓ You hold an Agent ID";
        $("agentIdStatus").className = "status-text ok";
        $("agentIdDetail").textContent = "Balance: " + balance.toString() + " Agent ID(s) on this address.";
      } else {
        $("agentIdStatus").textContent = "You don't hold an Agent ID yet";
        $("agentIdStatus").className = "status-text bad";
        $("agentIdDetail").textContent = "Only Agent ID holders can check in. Claim one first, then come back here.";
      }
    } catch (err) {
      $("agentIdStatus").textContent = "Could not check your Agent ID right now — please try again.";
      $("agentIdStatus").className = "status-text bad";
      $("agentIdDetail").textContent = "";
      isHolder = false;
    }
  }

  // --- Own streak (read-only) ---
  const contract = readContract(selectedChainId);
  if (!contract) {
    $("currentStreak").textContent = "—";
    $("longestStreak").textContent = "—";
    $("totalCheckIns").textContent = "—";
    $("todayStatus").textContent = "Contract not deployed on this network yet.";
    $("todayStatus").className = "status-text";
    checkedInToday = false;
  } else {
    try {
      const s = await contract.getStreak(userAddress);
      $("currentStreak").textContent = s.currentStreak_.toString();
      $("longestStreak").textContent = s.longestStreak_.toString();
      $("totalCheckIns").textContent = s.totalCheckIns_.toString();
      checkedInToday = s.checkedInToday;
      if (checkedInToday) {
        $("todayStatus").textContent = "✓ Checked in today — see you tomorrow (UTC)!";
        $("todayStatus").className = "status-text ok";
      } else {
        $("todayStatus").textContent = "Not checked in today yet.";
        $("todayStatus").className = "status-text";
      }
    } catch (err) {
      $("todayStatus").textContent = "Could not load your streak right now — please try again.";
      $("todayStatus").className = "status-text bad";
      checkedInToday = false;
    }
  }

  updateCheckInButton();
}

function updateCheckInButton() {
  const btn = $("checkInBtn");
  const hint = $("checkInHint");
  if (!isContractConfigured(selectedChainId)) {
    btn.disabled = true;
    hint.textContent = "The contract is not deployed on this network yet.";
    return;
  }
  if (!userAddress) {
    btn.disabled = true;
    hint.textContent = "Connect your wallet to check in. You need an Agent ID, and you can only check in once per day (UTC).";
    return;
  }
  if (!isHolder) {
    btn.disabled = true;
    hint.textContent = "You need an Agent ID to check in. Claim one first, then come back here.";
    return;
  }
  if (checkedInToday) {
    btn.disabled = true;
    hint.textContent = "Already checked in today. Come back tomorrow (UTC) to extend your streak.";
    return;
  }
  btn.disabled = false;
  hint.textContent = "One check-in per day (UTC). This sends an on-chain transaction — you only pay network gas.";
}

// ---------------------------------------------------------------------------
// Check-in transaction
// ---------------------------------------------------------------------------
async function checkIn() {
  const txEl = $("txStatus");
  hide(txEl);
  txEl.className = "tx-status";
  txEl.innerHTML = "";

  if (!userAddress || !walletProvider) {
    setGlobalNotice("Please connect your wallet first.", true);
    return;
  }
  if (!isHolder) {
    setGlobalNotice("You need an Agent ID to check in.", true);
    return;
  }
  if (checkedInToday) {
    setGlobalNotice("You have already checked in today.", true);
    return;
  }
  const net = NETWORKS[selectedChainId];
  if (!isContractConfigured(selectedChainId)) {
    setGlobalNotice("The contract is not deployed on this network yet.", true);
    return;
  }

  const btn = $("checkInBtn");
  btn.disabled = true;
  btn.textContent = "Waiting for wallet…";
  try {
    const signer = await walletProvider.getSigner();
    const contract = new ethers.Contract(net.contractAddress, AGENT_STREAK_ABI, signer);
    const tx = await contract.checkIn();
    txEl.innerHTML = "<p>Transaction sent — waiting for confirmation…</p>" +
      "<p><a href=\"" + explorerTxUrl(selectedChainId, tx.hash) + "\" target=\"_blank\" rel=\"noopener noreferrer\">View on BscScan</a></p>";
    show(txEl);
    btn.textContent = "Confirming…";
    const receipt = await tx.wait();
    if (receipt && receipt.status === 1) {
      txEl.classList.add("success");
      txEl.innerHTML = "<p><strong>✓ Checked in!</strong> Your streak is now one day longer.</p>" +
        "<p><a href=\"" + explorerTxUrl(selectedChainId, tx.hash) + "\" target=\"_blank\" rel=\"noopener noreferrer\">View on BscScan</a></p>";
      checkedInToday = true;
      await refreshAll();
    } else {
      txEl.classList.add("error");
      txEl.innerHTML = "<p><strong>Transaction failed on-chain.</strong> No check-in was recorded.</p>" +
        "<p><a href=\"" + explorerTxUrl(selectedChainId, tx.hash) + "\" target=\"_blank\" rel=\"noopener noreferrer\">View on BscScan</a></p>";
    }
  } catch (err) {
    txEl.classList.add("error");
    txEl.innerHTML = "<p><strong>" + escapeHtml(friendlyError(err)) + "</strong></p>";
    show(txEl);
  } finally {
    btn.textContent = "Check In Today";
    updateCheckInButton();
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

// ---------------------------------------------------------------------------
// Leaderboard — CheckedIn events, paginated by block range.
// ---------------------------------------------------------------------------
async function loadLeaderboard() {
  if (leaderboardLoading) return;
  const statusEl = $("leaderboardStatus");
  const table = $("leaderboardTable");
  const body = $("leaderboardBody");
  hide(table);
  body.innerHTML = "";

  if (!isContractConfigured(selectedChainId)) {
    statusEl.textContent = "Leaderboard will appear once the contract is deployed on this network.";
    return;
  }
  if (typeof ethers === "undefined") {
    statusEl.textContent = "Could not load the ethers library from the CDN. Please check your connection and try again.";
    return;
  }

  leaderboardLoading = true;
  statusEl.textContent = "Loading leaderboard…";
  try {
    const provider = readProvider(selectedChainId);
    const contract = readContract(selectedChainId);
    const latest = await provider.getBlockNumber();

    // Walk backwards in 5,000-block chunks until we have enough events
    // or we hit the scan limit. Newest chunks first.
    const events = [];
    let toBlock = latest;
    for (let chunk = 0; chunk < LEADERBOARD_MAX_CHUNKS && events.length < LEADERBOARD_MAX_EVENTS; chunk++) {
      const fromBlock = Math.max(0, toBlock - LEADERBOARD_BLOCK_CHUNK + 1);
      const chunkEvents = await contract.queryFilter(contract.filters.CheckedIn, fromBlock, toBlock);
      events.push.apply(events, chunkEvents);
      if (fromBlock === 0) break;
      toBlock = fromBlock - 1;
    }

    if (events.length === 0) {
      statusEl.textContent = "No check-ins yet on this network. Be the first to check in!";
      return;
    }

    // Aggregate per address: total check-ins + latest streak from the event.
    const byAddress = new Map();
    for (const ev of events) {
      const addr = ev.args.user;
      const entry = byAddress.get(addr) || { address: addr, total: 0, streak: 0n };
      entry.total += 1;
      // Events arrive newest-first per chunk but chunks are scanned newest
      // first, so keep the first (newest) streak seen for each address.
      if (entry.total === 1) entry.streak = ev.args.streak;
      byAddress.set(addr, entry);
    }

    // Refresh the current streak for each unique address (bounded: top
    // candidates only — sort by total first, then fetch streaks for the
    // top 20 + a small margin).
    const sorted = Array.from(byAddress.values()).sort(function (a, b) {
      return b.total - a.total;
    });
    const candidates = sorted.slice(0, LEADERBOARD_TOP_N + 10);
    await Promise.all(candidates.map(async function (entry) {
      try {
        const s = await contract.getStreak(entry.address);
        entry.streak = s.currentStreak_;
        entry.total = Number(s.totalCheckIns_);
      } catch (err) {
        // Keep the event-derived values if the live read fails.
      }
    }));
    candidates.sort(function (a, b) {
      if (b.total !== a.total) return b.total - a.total;
      return Number(b.streak - a.streak);
    });
    const top = candidates.slice(0, LEADERBOARD_TOP_N);

    body.innerHTML = top.map(function (entry, i) {
      const isYou = userAddress && entry.address.toLowerCase() === userAddress.toLowerCase();
      return "<tr" + (isYou ? " class=\"you\"" : "") + ">" +
        "<td>" + (i + 1) + "</td>" +
        "<td class=\"mono\"><a href=\"" + explorerAddressUrl(selectedChainId, entry.address) + "\" target=\"_blank\" rel=\"noopener noreferrer\">" +
        escapeHtml(shortenAddress(entry.address)) + "</a>" + (isYou ? " (you)" : "") + "</td>" +
        "<td>" + entry.total + "</td>" +
        "<td>" + entry.streak.toString() + "</td>" +
        "</tr>";
    }).join("");
    show(table);
    statusEl.textContent = "Showing top " + top.length + " from " + events.length +
      " check-in event(s) scanned (most recent activity first).";
  } catch (err) {
    statusEl.textContent = "Could not load the leaderboard: " + friendlyError(err) + " Please try again.";
  } finally {
    leaderboardLoading = false;
  }
}

// ---------------------------------------------------------------------------
// Refresh everything
// ---------------------------------------------------------------------------
async function refreshAll() {
  updateNetworkUI();
  await refreshAgentIdAndStreak();
  await loadLeaderboard();
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
  if (typeof ethers === "undefined") {
    setGlobalNotice("Could not load the ethers library from the CDN. Please check your connection and refresh the page.", true);
  }
  updateNetworkUI();
  $("connectBtn").addEventListener("click", connectWallet);
  $("checkInBtn").addEventListener("click", checkIn);
  $("refreshLeaderboardBtn").addEventListener("click", loadLeaderboard);
  $("switchMainnetBtn").addEventListener("click", function () { switchNetwork(56); });
  $("switchTestnetBtn").addEventListener("click", function () { switchNetwork(97); });

  if (window.ethereum) {
    window.ethereum.on("accountsChanged", onAccountsChanged);
    window.ethereum.on("chainChanged", onChainChanged);
    // If the wallet is already connected, pick up the account silently
    // (no pop-up: eth_accounts does not prompt).
    window.ethereum.request({ method: "eth_accounts" }).then(function (accounts) {
      if (accounts && accounts.length > 0) {
        walletProvider = new ethers.BrowserProvider(window.ethereum);
        userAddress = accounts[0];
        walletProvider.getNetwork().then(function (network) {
          const chainId = Number(network.chainId);
          if (NETWORKS[chainId]) selectedChainId = chainId;
          $("connectBtn").textContent = "Connected";
          $("connectBtn").disabled = true;
          const addrEl = $("walletAddress");
          addrEl.textContent = shortenAddress(userAddress);
          addrEl.title = userAddress;
          show(addrEl);
          refreshAll();
        }).catch(function () { refreshAll(); });
      } else {
        loadLeaderboard();
      }
    }).catch(function () { loadLeaderboard(); });
  } else {
    loadLeaderboard();
  }
});
