// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal interface of the SPACE ID Agent ID contract (ERC-721, non-transferable).
/// @dev AgentStreak only ever calls `balanceOf`. It never reads token IDs, owners
///      of specific tokens, or any other holder data.
interface IAgentId {
    function balanceOf(address owner) external view returns (uint256);
}

/// @title Agent Streak
/// @notice Daily on-chain check-in for Agent ID holders.
/// @dev
/// - Only addresses holding at least one Agent ID (balanceOf > 0 on the Agent ID
///   contract) can check in. The check happens on-chain, every time.
/// - One check-in per address per UTC day. A consecutive day extends the streak;
///   a missed day resets it to 1. `totalCheckIns` and `longestStreak` are kept.
/// - No fees, no tokens, no owner, no admin functions, no upgrades, no pausing,
///   no withdrawals. The contract cannot move, hold or distribute any funds:
///   `checkIn()` is not payable and the contract has no receive/fallback.
/// - Agent ID is used ONLY as a gate for the caller's own check-in. The contract
///   never looks up other people's wallets by name and never stores Agent ID names.
contract AgentStreak {
    /// @notice The Agent ID ERC-721 contract used for the holder check.
    IAgentId public immutable agentId;

    /// @notice Seconds in one UTC day. A "day" is `block.timestamp / 86400`.
    uint256 public constant SECONDS_PER_DAY = 86400;

    /// @notice Last UTC day number (timestamp / 86400) a user checked in.
    mapping(address => uint256) public lastCheckinDay;

    /// @notice Current consecutive-day streak of a user.
    mapping(address => uint256) public currentStreak;

    /// @notice Longest streak a user has ever reached.
    mapping(address => uint256) public longestStreak;

    /// @notice Total number of check-ins of a user.
    mapping(address => uint256) public totalCheckIns;

    /// @notice Total number of check-ins across all users.
    uint256 public totalCheckinCount;

    /// @notice Emitted on every successful check-in.
    /// @param user The address that checked in.
    /// @param day The UTC day number of the check-in.
    /// @param streak The user's streak after this check-in.
    /// @param totalCheckIns_ The user's total check-ins after this check-in.
    event CheckedIn(
        address indexed user,
        uint256 indexed day,
        uint256 streak,
        uint256 totalCheckIns_
    );

    /// @param agentId_ Address of the Agent ID ERC-721 contract.
    constructor(address agentId_) {
        require(agentId_ != address(0), "AgentStreak: zero Agent ID address");
        agentId = IAgentId(agentId_);
    }

    /// @notice Check in for today (UTC). Requires holding an Agent ID.
    /// @dev Streak increments only when yesterday was also checked in;
    ///      otherwise it restarts at 1.
    function checkIn() external {
        require(agentId.balanceOf(msg.sender) > 0, "AgentStreak: no Agent ID");
        uint256 day = block.timestamp / SECONDS_PER_DAY;
        require(
            lastCheckinDay[msg.sender] != day,
            "AgentStreak: already checked in today"
        );

        uint256 streak = 1;
        if (day > 0 && lastCheckinDay[msg.sender] == day - 1) {
            streak = currentStreak[msg.sender] + 1;
        }

        lastCheckinDay[msg.sender] = day;
        currentStreak[msg.sender] = streak;
        if (streak > longestStreak[msg.sender]) {
            longestStreak[msg.sender] = streak;
        }
        totalCheckIns[msg.sender] += 1;
        totalCheckinCount += 1;

        emit CheckedIn(msg.sender, day, streak, totalCheckIns[msg.sender]);
    }

    /// @notice Current UTC day number.
    function currentDay() external view returns (uint256) {
        return block.timestamp / SECONDS_PER_DAY;
    }

    /// @notice Full streak snapshot for a user in a single call.
    /// @return currentStreak_ Current consecutive-day streak.
    /// @return longestStreak_ Longest streak ever reached.
    /// @return totalCheckIns_ Total check-ins.
    /// @return lastCheckinDay_ UTC day of the last check-in (0 if never).
    /// @return checkedInToday True if the user already checked in today.
    function getStreak(
        address user
    )
        external
        view
        returns (
            uint256 currentStreak_,
            uint256 longestStreak_,
            uint256 totalCheckIns_,
            uint256 lastCheckinDay_,
            bool checkedInToday
        )
    {
        uint256 day = block.timestamp / SECONDS_PER_DAY;
        return (
            currentStreak[user],
            longestStreak[user],
            totalCheckIns[user],
            lastCheckinDay[user],
            lastCheckinDay[user] == day
        );
    }
}
