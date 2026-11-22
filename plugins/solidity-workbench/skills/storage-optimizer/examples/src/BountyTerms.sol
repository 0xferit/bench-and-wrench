// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title BountyTerms
/// @notice The terms a bounty is held to however it is stored: it holds something, only its funder
///         acts on it, it is awarded no later than its deadline, and a payment that fails undoes the
///         action.
/// @dev The board applies these, and so do the two controls its storage is measured against, so the
///      three boards differ in storage only.
library BountyTerms {
    error ZeroAmount();
    error NotFunder();
    error BountyExpired(uint256 deadline);
    error TransferFailed();

    function requireFunded(uint256 amount) internal pure {
        if (amount == 0) revert ZeroAmount();
    }

    function requireFunder(address funder) internal view {
        if (funder != msg.sender) revert NotFunder();
    }

    function requireOpen(uint256 deadline) internal view {
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp > deadline) revert BountyExpired(deadline);
    }

    function pay(address to, uint256 amount) internal {
        // forge-lint: disable-next-line(arbitrary-send-eth)
        (bool sent,) = to.call{value: amount}("");
        if (!sent) revert TransferFailed();
    }
}
