// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {BountyBoard} from "../src/BountyBoard.sol";
import {BountyTerms} from "../src/BountyTerms.sol";

/// @title FittedBountyBoard
/// @notice The bounty record fitted into one storage slot but not recycled: a new identifier for every
///         post, and the slot cleared on removal.
/// @dev Second control for the workload measurement: it separates what fitting saves from what
///      recycling adds. It has the two functions the workload calls, and in them it applies the board's
///      terms, emits its events and pays the same way, so that the reuse of slots is what separates it
///      from the board.
contract FittedBountyBoard {
    struct Bounty {
        address funder;
        uint32 deadline;
        uint64 amountUnits;
    }

    error AmountNotStorable(uint256 amount);
    error DeadlineNotStorable(uint256 deadline);

    uint256 public immutable STEP;
    mapping(uint256 bountyId => Bounty) public bounties;
    uint256 public nextId;

    constructor(uint256 step) {
        STEP = step;
    }

    /// @dev `msg.value` must be a positive multiple of `STEP` that the amount field can hold.
    function post(uint256 deadline) external payable returns (uint256 bountyId) {
        BountyTerms.requireFunded(msg.value);
        if (deadline > type(uint32).max) revert DeadlineNotStorable(deadline);
        uint256 amountUnits = msg.value / STEP;
        bool isWholeSteps = amountUnits * STEP == msg.value;
        if (!isWholeSteps || amountUnits > type(uint64).max) revert AmountNotStorable(msg.value);
        bountyId = nextId++;
        // forge-lint: disable-next-line(unsafe-typecast)
        bounties[bountyId] = Bounty({funder: msg.sender, deadline: uint32(deadline), amountUnits: uint64(amountUnits)});
        emit BountyBoard.BountyPosted(bountyId, msg.sender, msg.value, deadline);
    }

    function award(uint256 bountyId, address winner) external {
        Bounty memory awarded = bounties[bountyId];
        BountyTerms.requireFunder(awarded.funder);
        BountyTerms.requireOpen(awarded.deadline);
        uint256 amount = awarded.amountUnits * STEP;
        delete bounties[bountyId];
        emit BountyBoard.BountyAwarded(bountyId, winner, amount);
        BountyTerms.pay(winner, amount);
    }
}
