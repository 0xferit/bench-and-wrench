// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/src/Test.sol";
import {NotAligned, Overflow} from "uint-quantization-lib/src/UintQuantizationLib.sol";
import {StakeVault} from "../src/StakeVault.sol";
import {SlotCreation} from "./SlotCreation.sol";

contract StakerThatRejectsPayment {
    function stake(StakeVault vault, uint256 unlockAt) external payable {
        vault.stake{value: msg.value}(address(0), unlockAt);
    }

    function unstake(StakeVault vault) external {
        vault.unstake();
    }
}

contract StakeVaultTest is Test {
    StakeVault vault;
    address staker = makeAddr("staker");
    address delegate = makeAddr("delegate");
    uint256 step;
    uint256 maxStake;

    function setUp() public {
        vault = new StakeVault();
        step = vault.stakeStep();
        maxStake = vault.maxStake();
        vm.deal(staker, maxStake + step);
    }

    function test_stake_occupiesOneSlot() public {
        vm.startStateDiffRecording();
        vm.prank(staker);
        vault.stake{value: 3 * step}(delegate, block.timestamp + 30 days);
        assertEq(SlotCreation.count(vm.stopAndReturnStateDiff()), 1);
    }

    function test_stake_roundTripsAtSchemeMax() public {
        vm.prank(staker);
        vault.stake{value: maxStake}(delegate, type(uint40).max);
        StakeVault.Stake memory stored = vault.stakeOf(staker);
        assertEq(stored.amount, maxStake);
        assertEq(stored.delegate, delegate);
        assertEq(stored.unlockAt, type(uint40).max);
    }

    function test_stake_aboveSchemeMax_reverts() public {
        vm.prank(staker);
        vm.expectRevert(abi.encodeWithSelector(Overflow.selector, maxStake + step, maxStake));
        vault.stake{value: maxStake + step}(delegate, block.timestamp);
    }

    function test_stake_unaligned_reverts() public {
        vm.prank(staker);
        vm.expectRevert(abi.encodeWithSelector(NotAligned.selector, step + 1, step));
        vault.stake{value: step + 1}(delegate, block.timestamp);
    }

    function test_stake_unlockBeyondUint40_reverts() public {
        uint256 tooFar = uint256(type(uint40).max) + 1;
        vm.prank(staker);
        vm.expectRevert(abi.encodeWithSelector(StakeVault.UnlockTooFar.selector, tooFar));
        vault.stake{value: step}(delegate, tooFar);
    }

    function test_stake_zeroValue_reverts() public {
        vm.prank(staker);
        vm.expectRevert(StakeVault.ZeroStake.selector);
        vault.stake(delegate, block.timestamp);
    }

    function test_stake_twice_reverts() public {
        vm.startPrank(staker);
        vault.stake{value: step}(delegate, block.timestamp);
        vm.expectRevert(StakeVault.AlreadyStaked.selector);
        vault.stake{value: step}(delegate, block.timestamp);
        vm.stopPrank();
    }

    function test_unstake_withoutStake_reverts() public {
        vm.prank(staker);
        vm.expectRevert(StakeVault.NoStake.selector);
        vault.unstake();
    }

    function test_unstake_beforeUnlock_reverts() public {
        uint256 unlockAt = block.timestamp + 1 days;
        vm.startPrank(staker);
        vault.stake{value: step}(delegate, unlockAt);
        vm.expectRevert(abi.encodeWithSelector(StakeVault.StillLocked.selector, unlockAt));
        vault.unstake();
        vm.stopPrank();
    }

    function test_unstake_returnsExactDeposit() public {
        uint256 balanceBefore = staker.balance;
        vm.startPrank(staker);
        vault.stake{value: 5 * step}(delegate, block.timestamp);
        vault.unstake();
        vm.stopPrank();
        assertEq(staker.balance, balanceBefore);
        assertEq(address(vault).balance, 0);
        assertEq(vault.stakeOf(staker).amount, 0);
    }

    function test_unstake_toStakerThatRejectsPayment_reverts() public {
        StakerThatRejectsPayment rejecting = new StakerThatRejectsPayment();
        vm.deal(address(this), step);
        rejecting.stake{value: step}(vault, block.timestamp);
        vm.expectRevert(StakeVault.TransferFailed.selector);
        rejecting.unstake(vault);
    }

    function testFuzz_stake_roundTrip(uint56 units, address anyDelegate, uint40 unlockAt) public {
        uint256 amount = bound(uint256(units), 1, type(uint56).max) * step;
        vm.prank(staker);
        vault.stake{value: amount}(anyDelegate, unlockAt);
        StakeVault.Stake memory stored = vault.stakeOf(staker);
        assertEq(stored.amount, amount);
        assertEq(stored.delegate, anyDelegate);
        assertEq(stored.unlockAt, unlockAt);
    }
}
