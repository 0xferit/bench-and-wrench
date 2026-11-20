// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test, Vm} from "forge-std/src/Test.sol";
import {BountyBoard} from "../src/BountyBoard.sol";
import {RawBountyBoard} from "./RawBountyBoard.sol";
import {SlotCreation} from "./SlotCreation.sol";

/// @notice Measures one workload on the board before and after optimization: post a batch of
///         bounties, award them all, post the batch again.
/// @dev Run with `forge test --isolate -vv`: every call is then its own transaction, so the logged gas
///      includes the base cost and cold access, and it is what the sender pays after refunds.
contract BountyBoardWorkloadTest is Test {
    uint256 constant BATCH = 8;
    uint256 constant ROUNDS_OF_POSTS = 2;
    uint256 constant RAW_SLOTS_PER_BOUNTY = 3;
    uint256 constant RAW_COUNTER_SLOTS = 1;

    RawBountyBoard raw;
    BountyBoard recycled;
    address funder = makeAddr("funder");
    address winner = makeAddr("winner");
    uint256 amount;
    uint256 deadline;

    function setUp() public {
        raw = new RawBountyBoard();
        recycled = new BountyBoard();
        amount = recycled.bountyStep();
        deadline = block.timestamp + 7 days;
        vm.deal(funder, 2 * ROUNDS_OF_POSTS * BATCH * amount);
    }

    function test_workload_createsFewerSlotsWhenRecycled() public {
        vm.startPrank(funder);

        vm.startStateDiffRecording();
        uint256 rawGas = runOnRawBoard();
        uint256 rawSlots = SlotCreation.count(vm.stopAndReturnStateDiff());

        vm.startStateDiffRecording();
        uint256 recycledGas = runOnRecycledBoard();
        uint256 recycledSlots = SlotCreation.count(vm.stopAndReturnStateDiff());

        vm.stopPrank();

        assertEq(rawSlots, ROUNDS_OF_POSTS * BATCH * RAW_SLOTS_PER_BOUNTY + RAW_COUNTER_SLOTS);
        assertEq(recycledSlots, BATCH);
        emit log_named_uint("raw board: slots created", rawSlots);
        emit log_named_uint("raw board: gas", rawGas);
        emit log_named_uint("recycled board: slots created", recycledSlots);
        emit log_named_uint("recycled board: gas", recycledGas);
    }

    function paidForLastCall() internal returns (uint256) {
        Vm.Gas memory gas = vm.lastCallGas();
        return uint256(int256(uint256(gas.gasTotalUsed)) - gas.gasRefunded);
    }

    function runOnRawBoard() internal returns (uint256 gasPaid) {
        uint256[] memory ids = new uint256[](BATCH);
        for (uint256 i; i < BATCH; ++i) {
            ids[i] = raw.post{value: amount}(deadline);
            gasPaid += paidForLastCall();
        }
        for (uint256 i; i < BATCH; ++i) {
            raw.award(ids[i], winner);
            gasPaid += paidForLastCall();
        }
        for (uint256 i; i < BATCH; ++i) {
            raw.post{value: amount}(deadline);
            gasPaid += paidForLastCall();
        }
    }

    function runOnRecycledBoard() internal returns (uint256 gasPaid) {
        uint256[] memory ids = new uint256[](BATCH);
        for (uint256 i; i < BATCH; ++i) {
            uint256 hint = recycled.findVacant(0);
            ids[i] = recycled.post{value: amount}(hint, deadline);
            gasPaid += paidForLastCall();
        }
        for (uint256 i; i < BATCH; ++i) {
            recycled.award(ids[i], winner);
            gasPaid += paidForLastCall();
        }
        for (uint256 i; i < BATCH; ++i) {
            uint256 hint = recycled.findVacant(0);
            recycled.post{value: amount}(hint, deadline);
            gasPaid += paidForLastCall();
        }
    }
}
