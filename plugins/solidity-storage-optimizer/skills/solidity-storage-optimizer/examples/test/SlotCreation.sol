// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Vm} from "forge-std/src/Vm.sol";

/// @notice Counts the storage slots that a recorded run of calls took from zero to non-zero.
/// @dev Feed it `vm.stopAndReturnStateDiff()`. The count is what a gas schedule charges as new
///      state, so it compares two storage designs without depending on the schedule's prices.
library SlotCreation {
    function count(Vm.AccountAccess[] memory accesses) internal pure returns (uint256 created) {
        for (uint256 i; i < accesses.length; ++i) {
            Vm.StorageAccess[] memory touched = accesses[i].storageAccesses;
            for (uint256 j; j < touched.length; ++j) {
                Vm.StorageAccess memory access = touched[j];
                bool createsSlot = access.isWrite && !access.reverted && access.previousValue == bytes32(0)
                    && access.newValue != bytes32(0);
                if (createsSlot) ++created;
            }
        }
    }
}
