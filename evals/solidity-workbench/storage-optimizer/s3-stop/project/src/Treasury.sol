// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title Treasury
/// @notice Vesting grants paid in the native currency. Implementation contract: it runs behind an
///         ERC-1967 proxy and is upgraded through `upgradeToAndCall`.
contract Treasury {
    struct Grant {
        address recipient;
        uint256 amount;
        uint256 vestingStart;
        uint256 vestingEnd;
        bool revoked;
    }

    /// @dev keccak256("eip1967.proxy.implementation") - 1
    bytes32 private constant IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    address public admin;
    bool private _initialized;
    mapping(uint256 => Grant) public grants;
    mapping(uint256 => uint256) public claimed;
    uint256 public grantCount;

    /// @dev Reserved for future versions.
    uint256[45] private __gap;

    event GrantCreated(uint256 indexed grantId, address indexed recipient, uint256 amount, uint256 vestingStart, uint256 vestingEnd);
    event GrantRevoked(uint256 indexed grantId);
    event Claimed(uint256 indexed grantId, uint256 amount);
    event Upgraded(address indexed implementation);

    error AlreadyInitialized();
    error NotAdmin();
    error NotRecipient();
    error BadVestingWindow();
    error GrantIsRevoked(uint256 grantId);
    error PaymentFailed();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    function initialize(address admin_) external {
        if (_initialized) revert AlreadyInitialized();
        _initialized = true;
        admin = admin_;
    }

    function upgradeToAndCall(address newImplementation, bytes calldata data) external onlyAdmin {
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
            sstore(slot, newImplementation)
        }
        emit Upgraded(newImplementation);
        if (data.length > 0) {
            (bool ok,) = newImplementation.delegatecall(data);
            require(ok, "upgrade call failed");
        }
    }

    function createGrant(address recipient, uint256 vestingStart, uint256 vestingEnd)
        external
        payable
        onlyAdmin
        returns (uint256 grantId)
    {
        if (vestingEnd <= vestingStart) revert BadVestingWindow();
        grantId = grantCount++;
        grants[grantId] = Grant({
            recipient: recipient,
            amount: msg.value,
            vestingStart: vestingStart,
            vestingEnd: vestingEnd,
            revoked: false
        });
        emit GrantCreated(grantId, recipient, msg.value, vestingStart, vestingEnd);
    }

    function revoke(uint256 grantId) external onlyAdmin {
        grants[grantId].revoked = true;
        emit GrantRevoked(grantId);
    }

    function vested(uint256 grantId) public view returns (uint256) {
        Grant storage g = grants[grantId];
        if (block.timestamp <= g.vestingStart) return 0;
        if (block.timestamp >= g.vestingEnd) return g.amount;
        return (g.amount * (block.timestamp - g.vestingStart)) / (g.vestingEnd - g.vestingStart);
    }

    function claim(uint256 grantId) external {
        Grant storage g = grants[grantId];
        if (msg.sender != g.recipient) revert NotRecipient();
        if (g.revoked) revert GrantIsRevoked(grantId);
        uint256 owed = vested(grantId) - claimed[grantId];
        claimed[grantId] += owed;
        emit Claimed(grantId, owed);
        (bool paid,) = g.recipient.call{value: owed}("");
        if (!paid) revert PaymentFailed();
    }
}
