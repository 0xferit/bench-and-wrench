// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/src/Test.sol";
import {Treasury} from "../src/Treasury.sol";

contract TreasuryTest is Test {
    Treasury treasury;
    address admin = address(0xAD);
    address recipient = address(0xBEEF);

    function setUp() public {
        treasury = new Treasury();
        treasury.initialize(admin);
        vm.deal(admin, 100 ether);
    }

    function test_initialize_twice_reverts() public {
        vm.expectRevert(Treasury.AlreadyInitialized.selector);
        treasury.initialize(address(this));
    }

    function test_claim_paysVestedShare() public {
        vm.prank(admin);
        uint256 id = treasury.createGrant{value: 10 ether}(recipient, block.timestamp, block.timestamp + 100);
        skip(25);
        vm.prank(recipient);
        treasury.claim(id);
        assertEq(recipient.balance, 2.5 ether);
    }

    function test_claim_afterRevoke_reverts() public {
        vm.startPrank(admin);
        uint256 id = treasury.createGrant{value: 10 ether}(recipient, block.timestamp, block.timestamp + 100);
        treasury.revoke(id);
        vm.stopPrank();
        vm.prank(recipient);
        vm.expectRevert(abi.encodeWithSelector(Treasury.GrantIsRevoked.selector, id));
        treasury.claim(id);
    }

    function test_createGrant_byNonAdmin_reverts() public {
        vm.expectRevert(Treasury.NotAdmin.selector);
        treasury.createGrant(recipient, 1, 2);
    }
}
