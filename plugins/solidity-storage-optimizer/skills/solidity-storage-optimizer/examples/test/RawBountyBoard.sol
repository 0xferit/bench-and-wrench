// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {BountyBoard} from "../src/BountyBoard.sol";
import {BountyTerms} from "../src/BountyTerms.sol";

/// @title RawBountyBoard
/// @notice The bounty board before optimization: three storage slots per bounty, a new identifier for
///         every post, and the record cleared on removal.
/// @dev Control for the workload measurement. It has the two functions the workload calls, and in them
///      it applies the board's terms, emits its events and pays the same way, so that storage is what
///      separates it from the board.
contract RawBountyBoard {
    struct Bounty {
        address funder;
        uint256 amount;
        uint256 deadline;
    }

    mapping(uint256 bountyId => Bounty) public bounties;
    uint256 public nextId;

    function post(uint256 deadline) external payable returns (uint256 bountyId) {
        BountyTerms.requireFunded(msg.value);
        bountyId = nextId++;
        bounties[bountyId] = Bounty({funder: msg.sender, amount: msg.value, deadline: deadline});
        emit BountyBoard.BountyPosted(bountyId, msg.sender, msg.value, deadline);
    }

    function award(uint256 bountyId, address winner) external {
        Bounty memory awarded = bounties[bountyId];
        BountyTerms.requireFunder(awarded.funder);
        BountyTerms.requireOpen(awarded.deadline);
        delete bounties[bountyId];
        emit BountyBoard.BountyAwarded(bountyId, winner, awarded.amount);
        BountyTerms.pay(winner, awarded.amount);
    }
}
