// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Quant, UintQuantizationLib} from "uint-quantization-lib/src/UintQuantizationLib.sol";
import {RecycleConfig, SlotRecyclingLib} from "slot-recycling-lib/src/SlotRecyclingLib.sol";
import {BountyTerms} from "./BountyTerms.sol";

/// @title BountyBoard
/// @notice Bounties of native currency that are posted, then awarded before their deadline or
///         withdrawn, all the time. Each bounty is one storage word, and the word of a removed bounty
///         is reused by a later post.
/// @dev Example of a record fitted into one word and recycled.
///      Word, from bit 0: funder | deadline | amount in units of `bountyStep()` | generation.
///      The amount is the vacancy field: it is non-zero for every live bounty and never changes
///      while the bounty lives. A removed bounty leaves a tombstone that carries only the next
///      generation, so the slot reads as vacant and stays non-zero.
///      A bounty identifier is its slot index with the slot's generation above it. A slot serves
///      many bounties over time, but each gets a different identifier, and an identifier stops
///      resolving once its bounty is removed. A slot whose generations run out is retired: its word
///      is overwritten with a fixed one that reads as occupied and carries a generation no identifier
///      has, so the slot is never handed out again and nothing resolves to it.
contract BountyBoard {
    uint256 internal constant FUNDER_BITS = 160;
    uint256 internal constant DEADLINE_BITS = 32;
    uint256 internal constant AMOUNT_BITS = 40;
    uint256 internal constant GENERATION_BITS = 24;

    uint256 internal constant FUNDER_OFFSET = 0;
    uint256 internal constant DEADLINE_OFFSET = FUNDER_OFFSET + FUNDER_BITS;
    uint256 internal constant AMOUNT_OFFSET = DEADLINE_OFFSET + DEADLINE_BITS;
    uint256 internal constant GENERATION_OFFSET = AMOUNT_OFFSET + AMOUNT_BITS;

    uint256 internal constant AMOUNT_DISCARDED_BITS = 48;
    uint256 internal constant INDEX_BITS = 64;

    uint256 internal constant MAX_DEADLINE = (1 << DEADLINE_BITS) - 1;
    uint256 internal constant MAX_INDEX = (1 << INDEX_BITS) - 1;
    uint256 internal constant RETIRED_GENERATION = (1 << GENERATION_BITS) - 1;
    uint256 internal constant RETIRED_WORD = (RETIRED_GENERATION << GENERATION_OFFSET) | (1 << AMOUNT_OFFSET);

    error DeadlineTooFar(uint256 deadline);
    error DeadlineNotLater(uint256 deadline, uint256 current);
    error HintOutOfRange(uint256 hint);
    error NoVacantSlotFromHint(uint256 hint);
    error UnknownBounty(uint256 bountyId);
    error SlotVacant(uint256 slot);
    error WouldVacate(uint256 slot);

    event BountyPosted(uint256 indexed bountyId, address indexed funder, uint256 amount, uint256 deadline);
    event BountyExtended(uint256 indexed bountyId, uint256 deadline);
    event BountyAwarded(uint256 indexed bountyId, address indexed winner, uint256 amount);
    event BountyWithdrawn(uint256 indexed bountyId, uint256 amount);

    Quant internal immutable AMOUNT_SCHEME = UintQuantizationLib.create(AMOUNT_DISCARDED_BITS, AMOUNT_BITS);
    RecycleConfig internal immutable VACANCY = SlotRecyclingLib.create(AMOUNT_OFFSET, AMOUNT_BITS);

    SlotRecyclingLib.Pool internal _bounties;

    /// @notice Escrows `msg.value` as a bounty until `deadline`.
    /// @param hint Where the search for a free slot starts. Pass the result of `findVacant`, read
    ///        off-chain; a stale hint costs gas for every occupied slot it has to pass, never correctness.
    /// @dev `msg.value` must be a positive multiple of `bountyStep()` up to `maxBounty()`.
    function post(uint256 hint, uint256 deadline) external payable returns (uint256 bountyId) {
        BountyTerms.requireFunded(msg.value);
        if (deadline > MAX_DEADLINE) revert DeadlineTooFar(deadline);
        if (hint > MAX_INDEX) revert HintOutOfRange(hint);
        uint256 slot = SlotRecyclingLib.findVacant(_bounties, VACANCY, hint);
        if (slot > MAX_INDEX) revert NoVacantSlotFromHint(hint);

        uint256 generation = _generationOf(SlotRecyclingLib.load(_bounties, slot));
        uint256 amountUnits = AMOUNT_SCHEME.encode(msg.value, true);
        SlotRecyclingLib.allocate(_bounties, VACANCY, slot, _pack(msg.sender, deadline, amountUnits, generation));

        bountyId = (generation << INDEX_BITS) | slot;
        emit BountyPosted(bountyId, msg.sender, msg.value, deadline);
    }

    /// @notice Moves a bounty's deadline later, which keeps it awardable. Only its funder may, and only
    ///         until the deadline: an expired bounty can only be withdrawn.
    function extend(uint256 bountyId, uint256 newDeadline) external {
        (uint256 slot, uint256 word) = _bountyOfCaller(bountyId);
        if (newDeadline > MAX_DEADLINE) revert DeadlineTooFar(newDeadline);
        uint256 current = _deadlineOf(word);
        BountyTerms.requireOpen(current);
        if (newDeadline <= current) revert DeadlineNotLater(newDeadline, current);
        _update(slot, _pack(msg.sender, newDeadline, _amountUnitsOf(word), _generationOf(word)));
        emit BountyExtended(bountyId, newDeadline);
    }

    /// @notice Pays the bounty to `winner` and removes it. Only its funder may, and only until the deadline.
    function award(uint256 bountyId, address winner) external {
        (uint256 slot, uint256 word) = _bountyOfCaller(bountyId);
        BountyTerms.requireOpen(_deadlineOf(word));
        uint256 amount = _remove(slot, word);
        emit BountyAwarded(bountyId, winner, amount);
        BountyTerms.pay(winner, amount);
    }

    /// @notice Returns the bounty to its funder and removes it. Only its funder may, at any time.
    function withdraw(uint256 bountyId) external {
        (uint256 slot, uint256 word) = _bountyOfCaller(bountyId);
        uint256 amount = _remove(slot, word);
        emit BountyWithdrawn(bountyId, amount);
        BountyTerms.pay(msg.sender, amount);
    }

    /// @notice Reads a live bounty. Reverts for an identifier that was never issued or was removed.
    function bounty(uint256 bountyId) external view returns (address funder, uint256 amount, uint256 deadline) {
        (, uint256 word) = _liveBounty(bountyId);
        return (_funderOf(word), _amountOf(word), _deadlineOf(word));
    }

    /// @notice The first free slot at or after `hint`. Call it off-chain and pass the result to `post`.
    function findVacant(uint256 hint) external view returns (uint256 slot) {
        return SlotRecyclingLib.findVacant(_bounties, VACANCY, hint);
    }

    /// @notice The largest amount one bounty can hold.
    function maxBounty() external view returns (uint256) {
        return AMOUNT_SCHEME.max();
    }

    /// @notice Bounties are whole multiples of this many wei.
    function bountyStep() external view returns (uint256) {
        return AMOUNT_SCHEME.stepSize();
    }

    /// @dev The only way a live word changes in place. It refuses a vacant slot and a word that would
    ///      read as vacant, which are the two ways an in-place write could lose a live bounty.
    function _update(uint256 slot, uint256 newWord) internal {
        if (SlotRecyclingLib.isVacant(_bounties, VACANCY, slot)) revert SlotVacant(slot);
        if ((newWord & VACANCY.vacancyMask()) == 0) revert WouldVacate(slot);
        SlotRecyclingLib.store(_bounties, slot, newWord);
    }

    /// @dev Each value must already fit its field.
    function _pack(address funder, uint256 deadline, uint256 amountUnits, uint256 generation)
        internal
        pure
        returns (uint256)
    {
        return (uint256(uint160(funder)) << FUNDER_OFFSET) | (deadline << DEADLINE_OFFSET)
            | (amountUnits << AMOUNT_OFFSET) | (generation << GENERATION_OFFSET);
    }

    function _funderOf(uint256 word) internal pure returns (address) {
        // forge-lint: disable-next-line(unsafe-typecast)
        return address(uint160(_field(word, FUNDER_OFFSET, FUNDER_BITS)));
    }

    function _deadlineOf(uint256 word) internal pure returns (uint256) {
        return _field(word, DEADLINE_OFFSET, DEADLINE_BITS);
    }

    function _amountUnitsOf(uint256 word) internal pure returns (uint256) {
        return _field(word, AMOUNT_OFFSET, AMOUNT_BITS);
    }

    function _generationOf(uint256 word) internal pure returns (uint256) {
        return _field(word, GENERATION_OFFSET, GENERATION_BITS);
    }

    function _amountOf(uint256 word) private view returns (uint256) {
        return AMOUNT_SCHEME.decode(_amountUnitsOf(word));
    }

    function _liveBounty(uint256 bountyId) private view returns (uint256 slot, uint256 word) {
        slot = bountyId & MAX_INDEX;
        uint256 generation = bountyId >> INDEX_BITS;
        word = SlotRecyclingLib.load(_bounties, slot);
        bool occupied = (word & VACANCY.vacancyMask()) != 0;
        bool sameGeneration = generation != RETIRED_GENERATION && generation == _generationOf(word);
        if (!occupied || !sameGeneration) revert UnknownBounty(bountyId);
    }

    function _bountyOfCaller(uint256 bountyId) private view returns (uint256 slot, uint256 word) {
        (slot, word) = _liveBounty(bountyId);
        BountyTerms.requireFunder(_funderOf(word));
    }

    function _remove(uint256 slot, uint256 word) private returns (uint256 amount) {
        amount = _amountOf(word);
        uint256 nextGeneration = _generationOf(word) + 1;
        if (nextGeneration == RETIRED_GENERATION) {
            _update(slot, RETIRED_WORD);
        } else {
            SlotRecyclingLib.freeWithSentinel(_bounties, VACANCY, slot, nextGeneration << GENERATION_OFFSET);
        }
    }

    function _field(uint256 word, uint256 offset, uint256 bits) private pure returns (uint256) {
        return (word >> offset) & ((1 << bits) - 1);
    }
}
