// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/src/Test.sol";
import {Listings} from "../src/Listings.sol";

contract ListingsTest is Test {
    Listings book;
    address seller = address(0x5E11E4);
    address buyer = address(0xB0B);
    address other = address(0x07E4);
    uint64 expiry;

    function setUp() public {
        book = new Listings();
        expiry = uint64(block.timestamp + 1 days);
        vm.deal(buyer, 100 ether);
        vm.deal(other, 100 ether);
    }

    function test_list_thenBuy_paysSellerAndRemovesListing() public {
        vm.prank(seller);
        uint256 id = book.list(1 ether, expiry);
        vm.prank(buyer);
        book.buy{value: 1 ether}(id);
        assertEq(seller.balance, 1 ether);
        (address listedSeller,,) = book.listings(id);
        assertEq(listedSeller, address(0));
    }

    function test_buy_wrongPayment_reverts() public {
        vm.prank(seller);
        uint256 id = book.list(1 ether, expiry);
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(Listings.WrongPayment.selector, 0.5 ether, 1 ether));
        book.buy{value: 0.5 ether}(id);
    }

    function test_buy_reservedForAnother_reverts() public {
        vm.startPrank(seller);
        uint256 id = book.list(1 ether, expiry);
        book.reserve(id, buyer);
        vm.stopPrank();
        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(Listings.ReservedForAnother.selector, id));
        book.buy{value: 1 ether}(id);
    }

    function test_delist_byNonSeller_reverts() public {
        vm.prank(seller);
        uint256 id = book.list(1 ether, expiry);
        vm.prank(other);
        vm.expectRevert(Listings.NotSeller.selector);
        book.delist(id);
    }

    function test_buy_afterExpiry_reverts() public {
        vm.prank(seller);
        uint256 id = book.list(1 ether, expiry);
        skip(2 days);
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(Listings.ListingExpired.selector, id));
        book.buy{value: 1 ether}(id);
    }
}
