// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/AgentStreak.sol";
import "../contracts/MockAgentId.sol";

contract AgentStreakTest is Test {
    event CheckedIn(
        address indexed user,
        uint256 indexed day,
        uint256 streak,
        uint256 totalCheckIns
    );

    AgentStreak public streak;
    MockAgentId public agentId;

    address public holder = address(0xA11CE);
    address public holder2 = address(0xB0B);
    address public nonHolder = address(0xE771);

    uint256 public constant DAY = 86400;

    function setUp() public {
        agentId = new MockAgentId();
        streak = new AgentStreak(address(agentId));
        agentId.mint(holder);
        agentId.mint(holder2);
        // Start at a realistic mainnet-like timestamp: 2026-11-18 08:00 UTC.
        vm.warp(1795008000);
    }

    function testConstructorRevertsOnZeroAddress() public {
        vm.expectRevert("AgentStreak: zero Agent ID address");
        new AgentStreak(address(0));
    }

    function testCheckInRevertsWithoutAgentId() public {
        vm.prank(nonHolder);
        vm.expectRevert("AgentStreak: no Agent ID");
        streak.checkIn();
    }

    function testFirstCheckIn() public {
        vm.prank(holder);
        vm.expectEmit(true, true, false, true);
        emit CheckedIn(holder, block.timestamp / DAY, 1, 1);
        streak.checkIn();

        assertEq(streak.currentStreak(holder), 1);
        assertEq(streak.longestStreak(holder), 1);
        assertEq(streak.totalCheckIns(holder), 1);
        assertEq(streak.totalCheckinCount(), 1);
        assertEq(streak.lastCheckinDay(holder), block.timestamp / DAY);
    }

    function testCannotCheckInTwiceSameDay() public {
        vm.prank(holder);
        streak.checkIn();
        vm.prank(holder);
        vm.expectRevert("AgentStreak: already checked in today");
        streak.checkIn();
    }

    function testStreakGrowsOnConsecutiveDays() public {
        vm.prank(holder);
        streak.checkIn();
        vm.warp(block.timestamp + DAY);
        vm.prank(holder);
        streak.checkIn();
        assertEq(streak.currentStreak(holder), 2);
        vm.warp(block.timestamp + DAY);
        vm.prank(holder);
        streak.checkIn();
        assertEq(streak.currentStreak(holder), 3);
        assertEq(streak.longestStreak(holder), 3);
        assertEq(streak.totalCheckIns(holder), 3);
        assertEq(streak.totalCheckinCount(), 3);
    }

    function testStreakResetsAfterMissedDay() public {
        vm.prank(holder);
        streak.checkIn();
        vm.warp(block.timestamp + DAY);
        vm.prank(holder);
        streak.checkIn();
        assertEq(streak.currentStreak(holder), 2);

        // Skip one full day (two days after the last check-in).
        vm.warp(block.timestamp + 2 * DAY);
        vm.prank(holder);
        streak.checkIn();
        assertEq(streak.currentStreak(holder), 1, "streak must reset to 1");
        assertEq(streak.longestStreak(holder), 2, "longest streak preserved");
        assertEq(streak.totalCheckIns(holder), 3);
    }

    function testLongGapResetsStreak() public {
        vm.prank(holder);
        streak.checkIn();
        vm.warp(block.timestamp + 30 * DAY);
        vm.prank(holder);
        streak.checkIn();
        assertEq(streak.currentStreak(holder), 1);
        assertEq(streak.totalCheckIns(holder), 2);
    }

    function testGetStreakView() public {
        (uint256 cur, uint256 longest, uint256 total, uint256 last, bool today) =
            streak.getStreak(holder);
        assertEq(cur, 0);
        assertEq(longest, 0);
        assertEq(total, 0);
        assertEq(last, 0);
        assertFalse(today);

        vm.prank(holder);
        streak.checkIn();
        (cur, longest, total, last, today) = streak.getStreak(holder);
        assertEq(cur, 1);
        assertEq(longest, 1);
        assertEq(total, 1);
        assertEq(last, block.timestamp / DAY);
        assertTrue(today);

        vm.warp(block.timestamp + DAY);
        (cur, longest, total, last, today) = streak.getStreak(holder);
        assertEq(cur, 1);
        assertFalse(today, "next day must not count as checked in");
    }

    function testMultipleUsersIndependent() public {
        vm.prank(holder);
        streak.checkIn();
        vm.prank(holder2);
        streak.checkIn();
        assertEq(streak.totalCheckinCount(), 2);
        assertEq(streak.currentStreak(holder), 1);
        assertEq(streak.currentStreak(holder2), 1);

        vm.warp(block.timestamp + DAY);
        vm.prank(holder);
        streak.checkIn();
        assertEq(streak.currentStreak(holder), 2);
        assertEq(streak.currentStreak(holder2), 1, "other user unaffected");
    }

    function testDayBoundaryUsesUtcDay() public {
        // Warp to 23:59:59 UTC of the start day, check in, then +1 second.
        uint256 startDay = block.timestamp / DAY;
        vm.warp(startDay * DAY + DAY - 1);
        vm.prank(holder);
        streak.checkIn();
        assertEq(streak.currentStreak(holder), 1);

        vm.warp(startDay * DAY + DAY); // 00:00:00 UTC next day
        vm.prank(holder);
        streak.checkIn();
        assertEq(streak.currentStreak(holder), 2, "new UTC day extends streak");
    }

    function testFuzzStreakMath(uint8 hops) public {
        vm.assume(hops > 0 && hops <= 30);
        uint256 expectedStreak = 0;
        uint256 expectedTotal = 0;
        uint256 expectedLongest = 0;
        uint256 prevDay = 0;
        bool first = true;

        for (uint256 i = 0; i < hops; i++) {
            // Advance 0-3 days at random-ish (deterministic from fuzz input).
            uint256 jump = uint256(keccak256(abi.encode(hops, i))) % 4;
            vm.warp(block.timestamp + jump * DAY);
            uint256 day = block.timestamp / DAY;

            if (!first && day == prevDay) {
                vm.prank(holder);
                vm.expectRevert("AgentStreak: already checked in today");
                streak.checkIn();
                continue;
            }
            vm.prank(holder);
            streak.checkIn();
            expectedTotal += 1;
            if (!first && prevDay == day - 1) {
                expectedStreak += 1;
            } else {
                expectedStreak = 1;
            }
            if (expectedStreak > expectedLongest) expectedLongest = expectedStreak;
            prevDay = day;
            first = false;

            assertEq(streak.currentStreak(holder), expectedStreak);
            assertEq(streak.longestStreak(holder), expectedLongest);
            assertEq(streak.totalCheckIns(holder), expectedTotal);
        }
        assertEq(streak.totalCheckinCount(), expectedTotal);
    }
}
