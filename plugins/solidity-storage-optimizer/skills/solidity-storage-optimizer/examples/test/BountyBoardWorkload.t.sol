// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test, Vm} from "forge-std/src/Test.sol";
import {BountyBoard} from "../src/BountyBoard.sol";
import {FittedBountyBoard} from "./FittedBountyBoard.sol";
import {RawBountyBoard} from "./RawBountyBoard.sol";
import {SlotCreation} from "./SlotCreation.sol";

/// @notice Measures one workload on three boards: as it was, fitted into one slot, and fitted and
///         recycled. The workload posts a batch of bounties, awards them all, and posts the batch again.
/// @dev What fitting saves is the first board against the second. What recycling adds is the second
///      against the third, and only that comparison says whether recycling pays.
///      The first two boards are controls that make the third board's checks, emit its events and pay
///      the same way, so the three differ in storage only.
///      Run with `forge test --isolate -vv`: every call is then its own transaction, so the logged gas
///      includes the base cost and cold access, and it is what the sender pays after refunds.
contract BountyBoardWorkloadTest is Test {
    uint256 constant BATCH = 8;
    uint256 constant ROUNDS_OF_POSTS = 2;
    uint256 constant POSTS = ROUNDS_OF_POSTS * BATCH;
    uint256 constant RAW_SLOTS_PER_BOUNTY = 3;
    uint256 constant COUNTER_SLOTS = 1;

    RawBountyBoard raw;
    FittedBountyBoard fitted;
    BountyBoard recycled;
    address funder = makeAddr("funder");
    address winner = makeAddr("winner");
    uint256 amount;
    uint256 deadline;

    function setUp() public {
        raw = new RawBountyBoard();
        recycled = new BountyBoard();
        amount = recycled.bountyStep();
        fitted = new FittedBountyBoard(amount);
        deadline = block.timestamp + 7 days;
        vm.deal(funder, 3 * POSTS * amount);
        vm.deal(winner, 1);
    }

    function test_workload_createsFewerSlotsAtEachStep() public {
        vm.startPrank(funder);

        vm.startStateDiffRecording();
        uint256 rawGas = runOnRawBoard();
        uint256 rawSlots = SlotCreation.count(vm.stopAndReturnStateDiff());

        vm.startStateDiffRecording();
        uint256 fittedGas = runOnFittedBoard();
        uint256 fittedSlots = SlotCreation.count(vm.stopAndReturnStateDiff());

        vm.startStateDiffRecording();
        uint256 recycledGas = runOnRecycledBoard();
        uint256 recycledSlots = SlotCreation.count(vm.stopAndReturnStateDiff());

        vm.stopPrank();

        assertEq(rawSlots, POSTS * RAW_SLOTS_PER_BOUNTY + COUNTER_SLOTS);
        assertEq(fittedSlots, POSTS + COUNTER_SLOTS);
        assertEq(recycledSlots, BATCH);
        emit log_named_uint("as it was: slots created", rawSlots);
        emit log_named_uint("as it was: gas", rawGas);
        emit log_named_uint("fitted: slots created", fittedSlots);
        emit log_named_uint("fitted: gas", fittedGas);
        emit log_named_uint("fitted and recycled: slots created", recycledSlots);
        emit log_named_uint("fitted and recycled: gas", recycledGas);
    }

    function paidForLastCall() internal view returns (uint256) {
        Vm.Gas memory gas = vm.lastFrameGas();
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

    function runOnFittedBoard() internal returns (uint256 gasPaid) {
        uint256[] memory ids = new uint256[](BATCH);
        for (uint256 i; i < BATCH; ++i) {
            ids[i] = fitted.post{value: amount}(deadline);
            gasPaid += paidForLastCall();
        }
        for (uint256 i; i < BATCH; ++i) {
            fitted.award(ids[i], winner);
            gasPaid += paidForLastCall();
        }
        for (uint256 i; i < BATCH; ++i) {
            fitted.post{value: amount}(deadline);
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
