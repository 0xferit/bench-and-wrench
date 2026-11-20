// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title RawBountyBoard
/// @notice The bounty board before optimization: three storage slots per bounty, a new identifier for
///         every post, and the record cleared on removal.
/// @dev Control for the workload measurement, not a contract to deploy: anyone can award any bounty.
contract RawBountyBoard {
    struct Bounty {
        address funder;
        uint256 amount;
        uint256 deadline;
    }

    mapping(uint256 bountyId => Bounty) public bounties;
    uint256 public nextId;

    function post(uint256 deadline) external payable returns (uint256 bountyId) {
        bountyId = nextId++;
        bounties[bountyId] = Bounty({funder: msg.sender, amount: msg.value, deadline: deadline});
    }

    function award(uint256 bountyId, address winner) external {
        uint256 amount = bounties[bountyId].amount;
        delete bounties[bountyId];
        payable(winner).transfer(amount);
    }
}
