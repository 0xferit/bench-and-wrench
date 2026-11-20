// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/src/Test.sol";
import {NotAligned, Overflow} from "uint-quantization-lib/src/UintQuantizationLib.sol";
import {SlotRecyclingLib} from "slot-recycling-lib/src/SlotRecyclingLib.sol";
import {BountyBoard} from "../src/BountyBoard.sol";
import {BountyTerms} from "../src/BountyTerms.sol";

contract BountyBoardHarness is BountyBoard {
    function exposedUpdate(uint256 slot, uint256 word) external {
        _update(slot, word);
    }

    function exposedPack(address funder, uint256 deadline, uint256 amountUnits, uint256 generation)
        external
        pure
        returns (uint256)
    {
        return _pack(funder, deadline, amountUnits, generation);
    }

    function exposedUnpack(uint256 word)
        external
        pure
        returns (address funder, uint256 deadline, uint256 amountUnits, uint256 generation)
    {
        return (_funderOf(word), _deadlineOf(word), _amountUnitsOf(word), _generationOf(word));
    }

    function wordAt(uint256 slot) external view returns (uint256) {
        return SlotRecyclingLib.load(_bounties, slot);
    }

    function storageKeyOf(uint256 slot) external pure returns (bytes32 key) {
        uint256 poolSlot;
        assembly {
            poolSlot := _bounties.slot
        }
        return keccak256(abi.encode(slot, poolSlot));
    }

    function vacancyMask() external view returns (uint256) {
        return VACANCY.vacancyMask();
    }

    function idOf(uint256 generation, uint256 slot) external pure returns (uint256) {
        return (generation << INDEX_BITS) | slot;
    }

    function maxIndex() external pure returns (uint256) {
        return MAX_INDEX;
    }

    function maxDeadline() external pure returns (uint256) {
        return MAX_DEADLINE;
    }

    function retiredGeneration() external pure returns (uint256) {
        return RETIRED_GENERATION;
    }
}

contract RejectingReceiver {
    receive() external payable {
        revert("no payments");
    }
}

contract BountyBoardTest is Test {
    BountyBoardHarness board;
    address funder = makeAddr("funder");
    address stranger = makeAddr("stranger");
    address winner = makeAddr("winner");
    uint256 step;
    uint256 maxBounty;
    uint256 deadline;

    struct LiveBounty {
        uint256 id;
        address funder;
        uint256 amount;
    }

    LiveBounty[] live;
    uint256 escrowed;

    function setUp() public {
        board = new BountyBoardHarness();
        step = board.bountyStep();
        maxBounty = board.maxBounty();
        deadline = block.timestamp + 7 days;
        vm.deal(funder, maxBounty + step);
        vm.deal(stranger, 1000 * step);
    }

    function post(uint256 hint, uint256 amount) internal returns (uint256 bountyId) {
        vm.prank(funder);
        return board.post{value: amount}(hint, deadline);
    }

    function slotOf(uint256 bountyId) internal view returns (uint256) {
        return bountyId & board.maxIndex();
    }

    function assertUnknownOnEveryEntryPoint(uint256 bountyId) internal {
        bytes memory unknown = abi.encodeWithSelector(BountyBoard.UnknownBounty.selector, bountyId);
        vm.expectRevert(unknown);
        board.bounty(bountyId);
        vm.startPrank(funder);
        vm.expectRevert(unknown);
        board.award(bountyId, winner);
        vm.expectRevert(unknown);
        board.withdraw(bountyId);
        vm.expectRevert(unknown);
        board.extend(bountyId, deadline + 1);
        vm.stopPrank();
    }

    function test_post_afterAward_reusesSlotWithNewId() public {
        uint256 first = post(0, step);
        vm.prank(funder);
        board.award(first, winner);
        uint256 second = post(0, step);
        assertEq(slotOf(second), slotOf(first));
        assertEq(second, board.idOf(1, slotOf(first)));
    }

    function test_removal_leavesNonZeroTombstoneThatReadsAsVacant() public {
        uint256 id = post(0, step);
        vm.prank(funder);
        board.award(id, winner);
        uint256 tombstone = board.wordAt(slotOf(id));
        assertTrue(tombstone != 0);
        assertEq(tombstone & board.vacancyMask(), 0);
        assertEq(board.findVacant(0), slotOf(id));
    }

    function test_staleId_afterReuse_reverts() public {
        uint256 stale = post(0, step);
        vm.prank(funder);
        board.award(stale, winner);
        post(0, step);

        assertUnknownOnEveryEntryPoint(stale);
    }

    function test_award_twice_reverts() public {
        uint256 id = post(0, step);
        vm.startPrank(funder);
        board.award(id, winner);
        vm.expectRevert(abi.encodeWithSelector(BountyBoard.UnknownBounty.selector, id));
        board.award(id, winner);
        vm.stopPrank();
    }

    function test_bounty_neverPosted_reverts() public {
        vm.expectRevert(abi.encodeWithSelector(BountyBoard.UnknownBounty.selector, 7));
        board.bounty(7);
    }

    function test_actions_byNonFunder_revert() public {
        uint256 id = post(0, step);
        vm.startPrank(stranger);
        vm.expectRevert(BountyTerms.NotFunder.selector);
        board.award(id, stranger);
        vm.expectRevert(BountyTerms.NotFunder.selector);
        board.withdraw(id);
        vm.expectRevert(BountyTerms.NotFunder.selector);
        board.extend(id, deadline + 1);
        vm.stopPrank();
    }

    function test_award_atDeadline_pays() public {
        uint256 id = post(0, step);
        vm.warp(deadline);
        vm.prank(funder);
        board.award(id, winner);
        assertEq(winner.balance, step);
    }

    function test_award_afterDeadline_reverts() public {
        uint256 id = post(0, step);
        vm.warp(deadline + 1);
        vm.prank(funder);
        vm.expectRevert(abi.encodeWithSelector(BountyTerms.BountyExpired.selector, deadline));
        board.award(id, winner);
    }

    function test_withdraw_beforeDeadline_returnsExactDeposit() public {
        uint256 balanceBefore = funder.balance;
        uint256 id = post(0, 5 * step);
        vm.prank(funder);
        board.withdraw(id);
        assertEq(funder.balance, balanceBefore);
    }

    function test_withdraw_afterDeadline_returnsExactDeposit() public {
        uint256 balanceBefore = funder.balance;
        uint256 id = post(0, 5 * step);
        vm.warp(deadline + 1);
        vm.prank(funder);
        board.withdraw(id);
        assertEq(funder.balance, balanceBefore);
        assertEq(address(board).balance, 0);
    }

    function test_award_paysWinnerExactDeposit() public {
        uint256 id = post(0, 5 * step);
        vm.prank(funder);
        board.award(id, winner);
        assertEq(winner.balance, 5 * step);
        assertEq(address(board).balance, 0);
    }

    function test_award_toRejectingWinner_reverts() public {
        uint256 id = post(0, step);
        address rejecting = address(new RejectingReceiver());
        vm.prank(funder);
        vm.expectRevert(BountyTerms.TransferFailed.selector);
        board.award(id, rejecting);
    }

    function test_post_zeroValue_reverts() public {
        vm.prank(funder);
        vm.expectRevert(BountyTerms.ZeroAmount.selector);
        board.post(0, deadline);
    }

    function test_post_belowOneStep_reverts() public {
        vm.prank(funder);
        vm.expectRevert(abi.encodeWithSelector(NotAligned.selector, step - 1, step));
        board.post{value: step - 1}(0, deadline);
    }

    function test_post_aboveSchemeMax_reverts() public {
        vm.prank(funder);
        vm.expectRevert(abi.encodeWithSelector(Overflow.selector, maxBounty + step, maxBounty));
        board.post{value: maxBounty + step}(0, deadline);
    }

    function test_post_atSchemeMax_roundTrips() public {
        uint256 id = post(0, maxBounty);
        (address postedBy, uint256 amount, uint256 postedDeadline) = board.bounty(id);
        assertEq(postedBy, funder);
        assertEq(amount, maxBounty);
        assertEq(postedDeadline, deadline);
    }

    function test_post_deadlineBeyondItsField_reverts() public {
        uint256 tooFar = board.maxDeadline() + 1;
        vm.prank(funder);
        vm.expectRevert(abi.encodeWithSelector(BountyBoard.DeadlineTooFar.selector, tooFar));
        board.post{value: step}(0, tooFar);
    }

    function test_post_skipsOccupiedSlots() public {
        uint256 first = post(0, step);
        uint256 second = post(0, step);
        assertEq(slotOf(first), 0);
        assertEq(slotOf(second), 1);
        assertEq(board.findVacant(0), 2);
    }

    function test_post_hintAboveIndexBound_reverts() public {
        uint256 hint = board.maxIndex() + 1;
        vm.prank(funder);
        vm.expectRevert(abi.encodeWithSelector(BountyBoard.HintOutOfRange.selector, hint));
        board.post{value: step}(hint, deadline);
    }

    function test_post_whenScanPassesIndexBound_reverts() public {
        uint256 last = board.maxIndex();
        post(last, step);
        vm.prank(funder);
        vm.expectRevert(abi.encodeWithSelector(BountyBoard.NoVacantSlotFromHint.selector, last));
        board.post{value: step}(last, deadline);
    }

    function test_extend_keepsFunderAndAmount() public {
        uint256 id = post(0, 3 * step);
        vm.prank(funder);
        board.extend(id, deadline + 1 days);
        (address postedBy, uint256 amount, uint256 newDeadline) = board.bounty(id);
        assertEq(postedBy, funder);
        assertEq(amount, 3 * step);
        assertEq(newDeadline, deadline + 1 days);
    }

    function test_extend_toNoLaterDeadline_reverts() public {
        uint256 id = post(0, step);
        vm.prank(funder);
        vm.expectRevert(abi.encodeWithSelector(BountyBoard.DeadlineNotLater.selector, deadline, deadline));
        board.extend(id, deadline);
    }

    function test_extend_atDeadline_keepsTheBountyAwardable() public {
        uint256 id = post(0, step);
        vm.warp(deadline);
        vm.startPrank(funder);
        board.extend(id, deadline + 1 days);
        vm.warp(deadline + 1);
        board.award(id, winner);
        assertEq(winner.balance, step);
    }

    function test_extend_afterDeadline_reverts() public {
        uint256 id = post(0, step);
        vm.warp(deadline + 1);
        vm.prank(funder);
        vm.expectRevert(abi.encodeWithSelector(BountyTerms.BountyExpired.selector, deadline));
        board.extend(id, deadline + 1 days);
    }

    function test_extend_deadlineBeyondItsField_reverts() public {
        uint256 id = post(0, step);
        uint256 tooFar = board.maxDeadline() + 1;
        vm.prank(funder);
        vm.expectRevert(abi.encodeWithSelector(BountyBoard.DeadlineTooFar.selector, tooFar));
        board.extend(id, tooFar);
    }

    function test_update_onVacantSlot_reverts() public {
        uint256 liveWord = board.exposedPack(funder, deadline, 1, 0);
        vm.expectRevert(abi.encodeWithSelector(BountyBoard.SlotVacant.selector, 3));
        board.exposedUpdate(3, liveWord);
    }

    function test_update_thatClearsVacancyField_reverts() public {
        uint256 slot = slotOf(post(0, step));
        uint256 wordWithoutAmount = board.exposedPack(funder, deadline, 0, 0);
        vm.expectRevert(abi.encodeWithSelector(BountyBoard.WouldVacate.selector, slot));
        board.exposedUpdate(slot, wordWithoutAmount);
    }

    function test_generationSaturation_retiresSlot() public {
        uint256 retired = board.retiredGeneration();
        uint256 lastGeneration = retired - 1;
        vm.store(address(board), board.storageKeyOf(0), bytes32(board.exposedPack(address(0), 0, 0, lastGeneration)));

        uint256 last = post(0, step);
        assertEq(last, board.idOf(lastGeneration, 0));
        vm.prank(funder);
        board.award(last, winner);

        uint256 next = post(0, step);
        assertEq(slotOf(next), 1);
        assertUnknownOnEveryEntryPoint(last);
        assertUnknownOnEveryEntryPoint(board.idOf(retired, 0));
    }

    function testFuzz_packUnpack_roundTrip(address anyFunder, uint32 anyDeadline, uint40 amountUnits, uint24 generation)
        public
        view
    {
        uint256 word = board.exposedPack(anyFunder, anyDeadline, amountUnits, generation);
        (address unpackedFunder, uint256 unpackedDeadline, uint256 unpackedUnits, uint256 unpackedGeneration) =
            board.exposedUnpack(word);
        assertEq(unpackedFunder, anyFunder);
        assertEq(unpackedDeadline, anyDeadline);
        assertEq(unpackedUnits, amountUnits);
        assertEq(unpackedGeneration, generation);
    }

    function testFuzz_sequence_preservesFundsAndOwnership(uint8[32] calldata operations) public {
        for (uint256 i; i < operations.length; ++i) {
            uint256 operation = operations[i];
            if (operation % 2 == 1 && live.length > 0) {
                removeOne((operation >> 1) % live.length);
            } else {
                address poster = (operation >> 1) % 2 == 0 ? funder : stranger;
                uint256 amount = (1 + (operation >> 2) % 5) * step;
                vm.prank(poster);
                uint256 id = board.post{value: amount}(operation >> 5, deadline);
                live.push(LiveBounty({id: id, funder: poster, amount: amount}));
                escrowed += amount;
            }

            assertEq(address(board).balance, escrowed);
            for (uint256 j; j < live.length; ++j) {
                (address postedBy, uint256 amount,) = board.bounty(live[j].id);
                assertEq(postedBy, live[j].funder);
                assertEq(amount, live[j].amount);
            }
        }
    }

    function removeOne(uint256 pick) internal {
        LiveBounty memory removed = live[pick];
        vm.prank(removed.funder);
        board.award(removed.id, winner);
        vm.expectRevert(abi.encodeWithSelector(BountyBoard.UnknownBounty.selector, removed.id));
        board.bounty(removed.id);
        escrowed -= removed.amount;
        live[pick] = live[live.length - 1];
        live.pop();
    }
}
