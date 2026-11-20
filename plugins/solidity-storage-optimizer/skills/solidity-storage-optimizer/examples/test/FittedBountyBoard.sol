// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title FittedBountyBoard
/// @notice The bounty record fitted into one storage slot but not recycled: a new identifier for every
///         post, and the slot cleared on removal.
/// @dev Second control for the workload measurement, not a contract to deploy: anyone can award any
///      bounty, and nothing bounds its inputs. It separates what fitting saves from what recycling adds.
contract FittedBountyBoard {
    struct Bounty {
        address funder;
        uint32 deadline;
        uint64 amountUnits;
    }

    uint256 public immutable STEP;
    mapping(uint256 bountyId => Bounty) public bounties;
    uint256 public nextId;

    constructor(uint256 step) {
        STEP = step;
    }

    function post(uint256 deadline) external payable returns (uint256 bountyId) {
        bountyId = nextId++;
        // forge-lint: disable-next-line(unsafe-typecast)
        bounties[bountyId] =
            Bounty({funder: msg.sender, deadline: uint32(deadline), amountUnits: uint64(msg.value / STEP)});
    }

    function award(uint256 bountyId, address winner) external {
        uint256 amount = bounties[bountyId].amountUnits * STEP;
        delete bounties[bountyId];
        payable(winner).transfer(amount);
    }
}
