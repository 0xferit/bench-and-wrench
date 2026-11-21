// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title RewardsVault
/// @notice Stake VAULT and earn VAULT. Rewards accrue per second and are shared pro rata by stake.
contract RewardsVault {
    struct Account {
        uint256 principal;
        uint256 rewardPerTokenPaid;
        uint256 rewards;
        uint256 lastUpdate;
        address referrer;
        bool autoCompound;
    }

    /// @notice Hard cap of the VAULT token, enforced by the token contract.
    uint256 public constant MAX_SUPPLY = 1_000_000_000e18;
    /// @notice VAULT paid out per second across all stakers.
    uint256 public constant REWARD_RATE = 1e18;
    /// @notice Smallest stake the vault accepts.
    uint256 public constant MIN_STAKE = 1e18;
    uint256 private constant PRECISION = 1e18;

    IERC20 public immutable token;
    uint256 public totalStaked;
    uint256 public rewardPerTokenStored;
    uint256 public lastRewardTime;

    mapping(address => Account) public accounts;

    event Staked(address indexed account, uint256 amount, address indexed referrer);
    event Withdrawn(address indexed account, uint256 amount);
    event Claimed(address indexed account, uint256 amount);
    event AutoCompoundSet(address indexed account, bool enabled);

    error BelowMinimumStake(uint256 amount);
    error InsufficientPrincipal(uint256 requested, uint256 available);
    error TransferFailed();

    constructor(IERC20 token_) {
        token = token_;
        lastRewardTime = block.timestamp;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) return rewardPerTokenStored;
        return rewardPerTokenStored + ((block.timestamp - lastRewardTime) * REWARD_RATE * PRECISION) / totalStaked;
    }

    function pending(address who) public view returns (uint256) {
        Account storage a = accounts[who];
        return a.rewards + (a.principal * (rewardPerToken() - a.rewardPerTokenPaid)) / PRECISION;
    }

    function stake(uint256 amount, address referrer) external {
        if (amount < MIN_STAKE) revert BelowMinimumStake(amount);
        _settle(msg.sender);
        Account storage a = accounts[msg.sender];
        a.principal += amount;
        if (a.referrer == address(0) && referrer != msg.sender) a.referrer = referrer;
        totalStaked += amount;
        if (!token.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        emit Staked(msg.sender, amount, a.referrer);
    }

    function withdraw(uint256 amount) external {
        _settle(msg.sender);
        Account storage a = accounts[msg.sender];
        if (amount > a.principal) revert InsufficientPrincipal(amount, a.principal);
        a.principal -= amount;
        totalStaked -= amount;
        if (!token.transfer(msg.sender, amount)) revert TransferFailed();
        emit Withdrawn(msg.sender, amount);
    }

    function claim() external {
        _settle(msg.sender);
        Account storage a = accounts[msg.sender];
        uint256 owed = a.rewards;
        a.rewards = 0;
        if (a.autoCompound) {
            a.principal += owed;
            totalStaked += owed;
        } else if (!token.transfer(msg.sender, owed)) {
            revert TransferFailed();
        }
        emit Claimed(msg.sender, owed);
    }

    function setAutoCompound(bool enabled) external {
        accounts[msg.sender].autoCompound = enabled;
        emit AutoCompoundSet(msg.sender, enabled);
    }

    function _settle(address who) private {
        rewardPerTokenStored = rewardPerToken();
        lastRewardTime = block.timestamp;
        Account storage a = accounts[who];
        a.rewards = pending(who);
        a.rewardPerTokenPaid = rewardPerTokenStored;
        a.lastUpdate = block.timestamp;
    }
}
