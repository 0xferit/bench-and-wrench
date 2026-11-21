// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title Listings
/// @notice Fixed-price listings paid in the native currency. A seller lists, a buyer pays the exact
///         price, and the listing is removed. Sellers can reserve a listing for one buyer.
contract Listings {
    struct Listing {
        address seller;
        uint256 price;
        uint64 expiresAt;
    }

    mapping(uint256 => Listing) public listings;
    /// @notice When set, only this address may buy the listing.
    mapping(uint256 => address) public reservedFor;
    uint256 public nextListingId;

    event Listed(uint256 indexed listingId, address indexed seller, uint256 price, uint64 expiresAt);
    event Reserved(uint256 indexed listingId, address indexed buyer);
    event Delisted(uint256 indexed listingId);
    event Sold(uint256 indexed listingId, address indexed buyer, uint256 price);

    error ZeroPrice();
    error AlreadyExpired(uint64 expiresAt);
    error NotSeller();
    error NoSuchListing(uint256 listingId);
    error ListingExpired(uint256 listingId);
    error ReservedForAnother(uint256 listingId);
    error WrongPayment(uint256 sent, uint256 price);
    error PaymentFailed();

    function list(uint256 price, uint64 expiresAt) external returns (uint256 listingId) {
        if (price == 0) revert ZeroPrice();
        if (expiresAt <= block.timestamp) revert AlreadyExpired(expiresAt);
        listingId = nextListingId++;
        listings[listingId] = Listing({seller: msg.sender, price: price, expiresAt: expiresAt});
        emit Listed(listingId, msg.sender, price, expiresAt);
    }

    function reserve(uint256 listingId, address buyer) external {
        if (listings[listingId].seller != msg.sender) revert NotSeller();
        reservedFor[listingId] = buyer;
        emit Reserved(listingId, buyer);
    }

    function delist(uint256 listingId) external {
        if (listings[listingId].seller != msg.sender) revert NotSeller();
        delete listings[listingId];
        emit Delisted(listingId);
    }

    function buy(uint256 listingId) external payable {
        Listing memory listing = listings[listingId];
        if (listing.seller == address(0)) revert NoSuchListing(listingId);
        if (block.timestamp > listing.expiresAt) revert ListingExpired(listingId);
        address reserved = reservedFor[listingId];
        if (reserved != address(0) && reserved != msg.sender) revert ReservedForAnother(listingId);
        if (msg.value != listing.price) revert WrongPayment(msg.value, listing.price);

        delete listings[listingId];
        emit Sold(listingId, msg.sender, listing.price);

        (bool paid,) = listing.seller.call{value: msg.value}("");
        if (!paid) revert PaymentFailed();
    }
}
