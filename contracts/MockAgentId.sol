// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MockAgentId — TESTNET ONLY test double for the SPACE ID Agent ID contract
/// @notice
/// - The real Agent ID contract (0x60b9262456de011f7d15a54cdd8c48baaa8b022f)
///   exists ONLY on BNB Chain mainnet. There is no Agent ID on BSC Testnet.
/// - This mock exists ONLY so the AgentStreak flow can be tested end-to-end on
///   BSC Testnet. It is NOT part of the hackathon submission contract set and
///   MUST NOT be deployed on mainnet.
/// - `mint()` is intentionally permissionless on testnet: anyone can mint one
///   test Agent ID to try the check-in flow. On mainnet, Agent IDs can only be
///   claimed inside the Binance App and are non-transferable.
/// - Like the real Agent ID, this mock is non-transferable: it has no
///   transfer/approve functions at all.
contract MockAgentId {
    string public constant name = "Mock Agent ID (TESTNET ONLY)";
    string public constant symbol = "tAI";

    mapping(address => uint256) private _balances;
    mapping(address => bool) private _hasMinted;
    uint256 private _nextTokenId = 1;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    /// @notice Mint one test Agent ID to `to`. One per address, testnet only.
    function mint(address to) external {
        require(to != address(0), "MockAgentId: zero address");
        require(!_hasMinted[to], "MockAgentId: already minted");
        _hasMinted[to] = true;
        _balances[to] = 1;
        emit Transfer(address(0), to, _nextTokenId++);
    }

    /// @notice Number of Agent IDs held by `owner` (0 or 1 for this mock).
    function balanceOf(address owner) external view returns (uint256) {
        require(owner != address(0), "MockAgentId: zero address");
        return _balances[owner];
    }
}
