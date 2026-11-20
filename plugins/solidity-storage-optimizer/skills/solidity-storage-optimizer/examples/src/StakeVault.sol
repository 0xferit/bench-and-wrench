// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Quant, UintQuantizationLib} from "uint-quantization-lib/src/UintQuantizationLib.sol";

/// @title StakeVault
/// @notice One stake of native currency per account, with a delegate and an unlock time, kept in a
///         single storage slot. Example of a struct fitted with a quantized amount: nothing is
///         recycled, because the collection is keyed by address.
/// @dev The amount is stored in units of `stakeStep()` wei and encoded exactly: a deposit that is not
///      a multiple of the step reverts, so no wei is ever lost to rounding. Callers see `Stake`;
///      `PackedStake` exists only in storage.
contract StakeVault {
    struct Stake {
        uint256 amount;
        address delegate;
        uint256 unlockAt;
    }

    /// @dev `amountUnits` is the amount in units of `stakeStep()`. Its type is the one statement of the
    ///      encoded width: `AMOUNT_SCHEME` is created from that type's range.
    struct PackedStake {
        address delegate;
        uint56 amountUnits;
        uint40 unlockAt;
    }

    error ZeroStake();
    error AlreadyStaked();
    error NoStake();
    error StillLocked(uint256 unlockAt);
    error UnlockTooFar(uint256 unlockAt);
    error TransferFailed();

    uint256 private constant AMOUNT_DISCARDED_BITS = 40;

    Quant private immutable AMOUNT_SCHEME =
        UintQuantizationLib.create(AMOUNT_DISCARDED_BITS, _bitLength(type(uint56).max));

    mapping(address staker => PackedStake) private _stakes;

    /// @notice Stakes `msg.value`, which must be a positive multiple of `stakeStep()` up to `maxStake()`.
    function stake(address delegate, uint256 unlockAt) external payable {
        if (msg.value == 0) revert ZeroStake();
        if (_read(msg.sender).amount != 0) revert AlreadyStaked();
        _write(msg.sender, Stake({amount: msg.value, delegate: delegate, unlockAt: unlockAt}));
    }

    /// @notice Returns the caller's whole stake once its unlock time has passed.
    function unstake() external {
        Stake memory current = _read(msg.sender);
        if (current.amount == 0) revert NoStake();
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp < current.unlockAt) revert StillLocked(current.unlockAt);
        delete _stakes[msg.sender];
        (bool sent,) = msg.sender.call{value: current.amount}("");
        if (!sent) revert TransferFailed();
    }

    function stakeOf(address staker) external view returns (Stake memory) {
        return _read(staker);
    }

    /// @notice The largest amount one stake can hold.
    function maxStake() external view returns (uint256) {
        return AMOUNT_SCHEME.max();
    }

    /// @notice Stakes are whole multiples of this many wei.
    function stakeStep() external view returns (uint256) {
        return AMOUNT_SCHEME.stepSize();
    }

    function _read(address staker) internal view returns (Stake memory) {
        PackedStake storage packed = _stakes[staker];
        return
            Stake({
                amount: AMOUNT_SCHEME.decode(packed.amountUnits), delegate: packed.delegate, unlockAt: packed.unlockAt
            });
    }

    function _write(address staker, Stake memory value) internal {
        if (value.unlockAt > type(uint40).max) revert UnlockTooFar(value.unlockAt);
        // forge-lint: disable-next-line(unsafe-typecast)
        uint40 unlockAt = uint40(value.unlockAt);
        // forge-lint: disable-next-line(unsafe-typecast)
        uint56 amountUnits = uint56(AMOUNT_SCHEME.encode(value.amount, true));
        _stakes[staker] = PackedStake({delegate: value.delegate, amountUnits: amountUnits, unlockAt: unlockAt});
    }

    function _bitLength(uint256 value) private pure returns (uint256 bits) {
        for (; value != 0; value >>= 1) {
            ++bits;
        }
    }
}
