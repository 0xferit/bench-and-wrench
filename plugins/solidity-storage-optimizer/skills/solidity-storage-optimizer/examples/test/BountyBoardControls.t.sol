// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test, Vm} from "forge-std/src/Test.sol";
import {NotAligned} from "uint-quantization-lib/src/UintQuantizationLib.sol";
import {BountyBoard} from "../src/BountyBoard.sol";
import {BountyTerms} from "../src/BountyTerms.sol";
import {RejectingReceiver} from "./BountyBoard.t.sol";
import {FittedBountyBoard} from "./FittedBountyBoard.sol";
import {RawBountyBoard} from "./RawBountyBoard.sol";

/// @notice The two controls of the workload measurement do the board's work around their own storage:
///         they apply its terms, emit its events and pay the same way. Work a control left out would
///         be charged to the board alone, and the measurement would no longer compare storage.
contract BountyBoardControlsTest is Test {
    uint256 constant BOARDS = 3;
    uint256 constant EVENTS_PER_CALL = 1;

    RawBountyBoard raw;
    FittedBountyBoard fitted;
    BountyBoard board;
    address funder = makeAddr("funder");
    address stranger = makeAddr("stranger");
    address winner = makeAddr("winner");
    uint256 step;
    uint256 deadline;

    function setUp() public {
        raw = new RawBountyBoard();
        board = new BountyBoard();
        step = board.bountyStep();
        fitted = new FittedBountyBoard(step);
        deadline = block.timestamp + 7 days;
        vm.deal(funder, type(uint128).max);
    }

    function postOnEveryBoard() internal returns (uint256 rawId, uint256 fittedId, uint256 boardId) {
        vm.startPrank(funder);
        rawId = raw.post{value: step}(deadline);
        fittedId = fitted.post{value: step}(deadline);
        boardId = board.post{value: step}(0, deadline);
        vm.stopPrank();
    }

    function eventsEmittedByTheBoards() internal view returns (uint256 count) {
        Vm.Log[] memory logs = vm.getRecordedLogs();
        for (uint256 i; i < logs.length; ++i) {
            address emitter = logs[i].emitter;
            if (emitter == address(raw) || emitter == address(fitted) || emitter == address(board)) ++count;
        }
    }

    function test_post_emitsTheBoardsEventOnEveryBoard() public {
        vm.recordLogs();
        vm.startPrank(funder);
        vm.expectEmit(address(raw));
        emit BountyBoard.BountyPosted(0, funder, step, deadline);
        raw.post{value: step}(deadline);
        vm.expectEmit(address(fitted));
        emit BountyBoard.BountyPosted(0, funder, step, deadline);
        fitted.post{value: step}(deadline);
        vm.expectEmit(address(board));
        emit BountyBoard.BountyPosted(0, funder, step, deadline);
        board.post{value: step}(0, deadline);
        assertEq(eventsEmittedByTheBoards(), EVENTS_PER_CALL * BOARDS);
    }

    function test_award_emitsTheBoardsEventAndPaysOnEveryBoard() public {
        (uint256 rawId, uint256 fittedId, uint256 boardId) = postOnEveryBoard();
        vm.recordLogs();
        vm.startPrank(funder);
        vm.expectEmit(address(raw));
        emit BountyBoard.BountyAwarded(rawId, winner, step);
        raw.award(rawId, winner);
        vm.expectEmit(address(fitted));
        emit BountyBoard.BountyAwarded(fittedId, winner, step);
        fitted.award(fittedId, winner);
        vm.expectEmit(address(board));
        emit BountyBoard.BountyAwarded(boardId, winner, step);
        board.award(boardId, winner);
        assertEq(eventsEmittedByTheBoards(), EVENTS_PER_CALL * BOARDS);
        assertEq(winner.balance, BOARDS * step);
    }

    function test_post_ofNothing_revertsOnEveryBoard() public {
        vm.startPrank(funder);
        vm.expectRevert(BountyTerms.ZeroAmount.selector);
        raw.post(deadline);
        vm.expectRevert(BountyTerms.ZeroAmount.selector);
        fitted.post(deadline);
        vm.expectRevert(BountyTerms.ZeroAmount.selector);
        board.post(0, deadline);
    }

    function test_award_byAStranger_revertsOnEveryBoard() public {
        (uint256 rawId, uint256 fittedId, uint256 boardId) = postOnEveryBoard();
        vm.startPrank(stranger);
        vm.expectRevert(BountyTerms.NotFunder.selector);
        raw.award(rawId, winner);
        vm.expectRevert(BountyTerms.NotFunder.selector);
        fitted.award(fittedId, winner);
        vm.expectRevert(BountyTerms.NotFunder.selector);
        board.award(boardId, winner);
    }

    function test_award_afterTheDeadline_revertsOnEveryBoard() public {
        (uint256 rawId, uint256 fittedId, uint256 boardId) = postOnEveryBoard();
        vm.warp(deadline + 1);
        vm.startPrank(funder);
        vm.expectRevert(abi.encodeWithSelector(BountyTerms.BountyExpired.selector, deadline));
        raw.award(rawId, winner);
        vm.expectRevert(abi.encodeWithSelector(BountyTerms.BountyExpired.selector, deadline));
        fitted.award(fittedId, winner);
        vm.expectRevert(abi.encodeWithSelector(BountyTerms.BountyExpired.selector, deadline));
        board.award(boardId, winner);
    }

    function test_award_twice_revertsOnEveryBoard() public {
        (uint256 rawId, uint256 fittedId, uint256 boardId) = postOnEveryBoard();
        vm.startPrank(funder);
        raw.award(rawId, winner);
        fitted.award(fittedId, winner);
        board.award(boardId, winner);
        vm.expectRevert(BountyTerms.NotFunder.selector);
        raw.award(rawId, winner);
        vm.expectRevert(BountyTerms.NotFunder.selector);
        fitted.award(fittedId, winner);
        vm.expectRevert(abi.encodeWithSelector(BountyBoard.UnknownBounty.selector, boardId));
        board.award(boardId, winner);
    }

    function test_award_toAWinnerThatRejectsPayment_revertsOnEveryBoard() public {
        (uint256 rawId, uint256 fittedId, uint256 boardId) = postOnEveryBoard();
        address rejecting = address(new RejectingReceiver());
        vm.startPrank(funder);
        vm.expectRevert(BountyTerms.TransferFailed.selector);
        raw.award(rawId, rejecting);
        vm.expectRevert(BountyTerms.TransferFailed.selector);
        fitted.award(fittedId, rejecting);
        vm.expectRevert(BountyTerms.TransferFailed.selector);
        board.award(boardId, rejecting);
    }

    function test_post_offTheStep_revertsOnBothFittedBoards() public {
        uint256 unaligned = step + 1;
        vm.startPrank(funder);
        vm.expectRevert(abi.encodeWithSelector(FittedBountyBoard.AmountNotStorable.selector, unaligned));
        fitted.post{value: unaligned}(deadline);
        vm.expectRevert(abi.encodeWithSelector(NotAligned.selector, unaligned, step));
        board.post{value: unaligned}(0, deadline);
    }

    function test_post_withADeadlineItsFieldCannotHold_revertsOnBothFittedBoards() public {
        uint256 tooFar = uint256(type(uint32).max) + 1;
        vm.startPrank(funder);
        vm.expectRevert(abi.encodeWithSelector(FittedBountyBoard.DeadlineNotStorable.selector, tooFar));
        fitted.post{value: step}(tooFar);
        vm.expectRevert(abi.encodeWithSelector(BountyBoard.DeadlineTooFar.selector, tooFar));
        board.post{value: step}(0, tooFar);
    }

    function test_post_ofTheLargestAmountTheFittedControlHolds_isAwardedInFull() public {
        uint256 largest = uint256(type(uint64).max) * step;
        vm.startPrank(funder);
        uint256 id = fitted.post{value: largest}(deadline);
        fitted.award(id, winner);
        assertEq(winner.balance, largest);
    }

    function test_post_aboveTheLargestAmountTheFittedControlHolds_reverts() public {
        uint256 tooLarge = (uint256(type(uint64).max) + 1) * step;
        vm.startPrank(funder);
        vm.expectRevert(abi.encodeWithSelector(FittedBountyBoard.AmountNotStorable.selector, tooLarge));
        fitted.post{value: tooLarge}(deadline);
    }
}
