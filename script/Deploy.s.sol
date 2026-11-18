// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/AgentStreak.sol";
import "../contracts/MockAgentId.sol";

/// @notice Deploy AgentStreak.
/// @dev
/// Mainnet (BSC 56): set AGENT_ID=0x60b9262456de011f7d15a54cdd8c48baaa8b022f
///   (the real SPACE ID Agent ID contract). No mock is deployed on mainnet.
/// Testnet (BSC testnet 97): set DEPLOY_MOCK=true to deploy MockAgentId first
///   and point AgentStreak at it (there is no Agent ID on testnet).
/// Usage:
///   forge script script/Deploy.s.sol --rpc-url <RPC> --broadcast --verify
contract Deploy is Script {
    function run() external {
        address agentId = vm.envAddress("AGENT_ID");
        bool deployMock = vm.envOr("DEPLOY_MOCK", false);

        vm.startBroadcast();

        if (deployMock) {
            MockAgentId mock = new MockAgentId();
            console.log("MockAgentId deployed at:", address(mock));
            agentId = address(mock);
        }

        AgentStreak streak = new AgentStreak(agentId);
        console.log("AgentStreak deployed at:", address(streak));
        console.log("Agent ID used:", agentId);

        vm.stopBroadcast();
    }
}
