// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/src/Test.sol";
import {RewardsVault, IERC20} from "../src/RewardsVault.sol";

contract VaultToken is IERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external {
        allowance[msg.sender][spender] = amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract RewardsVaultTest is Test {
    VaultToken token;
    RewardsVault vault;
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        token = new VaultToken();
        vault = new RewardsVault(token);
        token.mint(address(vault), 10_000_000e18);
        for (uint256 i; i < 2; ++i) {
            address who = i == 0 ? alice : bob;
            token.mint(who, 1_000e18);
            vm.prank(who);
            token.approve(address(vault), type(uint256).max);
        }
    }

    function test_stake_recordsPrincipalAndReferrer() public {
        vm.prank(alice);
        vault.stake(100e18, bob);
        (uint256 principal,,, uint256 lastUpdate, address referrer, bool autoCompound) = vault.accounts(alice);
        assertEq(principal, 100e18);
        assertEq(referrer, bob);
        assertEq(lastUpdate, block.timestamp);
        assertFalse(autoCompound);
    }

    function test_stake_belowMinimum_reverts() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(RewardsVault.BelowMinimumStake.selector, 1e18 - 1));
        vault.stake(1e18 - 1, address(0));
    }

    function test_rewards_areSharedProRata() public {
        vm.prank(alice);
        vault.stake(300e18, address(0));
        vm.prank(bob);
        vault.stake(100e18, address(0));
        skip(400);
        assertEq(vault.pending(alice), 300e18);
        assertEq(vault.pending(bob), 100e18);
    }

    function test_claim_paysOutOrCompounds() public {
        vm.prank(alice);
        vault.stake(100e18, address(0));
        skip(10);
        vm.prank(alice);
        vault.claim();
        assertEq(token.balanceOf(alice), 900e18 + 10e18);

        vm.prank(alice);
        vault.setAutoCompound(true);
        skip(10);
        vm.prank(alice);
        vault.claim();
        (uint256 principal,,,,,) = vault.accounts(alice);
        assertEq(principal, 110e18);
    }

    function test_withdraw_moreThanPrincipal_reverts() public {
        vm.prank(alice);
        vault.stake(100e18, address(0));
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(RewardsVault.InsufficientPrincipal.selector, 101e18, 100e18));
        vault.withdraw(101e18);
    }
}
