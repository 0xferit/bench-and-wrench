# Recycling the slots of removed records

Phase 3 of the flow, and the code and tests for a record kept as one word in a pool.

## Contents

- What recycling is
- When it applies
- What it costs and what it saves
- One word per record
- The vacancy field
- The tombstone
- Identity
- Hints
- Changing a live record
- The code: one word per record in a pool
- The tests
- Measuring

## What recycling is

Creating a storage slot costs far more than rewriting one. A collection that clears a record on removal pays the creation price again on the next insert. Recycling leaves a non-zero word behind, a tombstone, marked as free; the next insert overwrites it.

`slot-recycling-lib` keeps the records in a `SlotRecyclingLib.Pool`, one raw `uint256` word per index. Part of the word is the vacancy field: any bit set there means the slot is occupied. The library scans for a free slot, checks every write it is asked to check, and refuses a tombstone that would be zero.

## When it applies

All of these must hold. If one fails, say which and stop at fitting.

- **The collection both adds and removes records for as long as it lives.** A collection that only grows has nothing to reuse.
- **The contract hands out the keys.** A mapping keyed by an address or a hash cannot be scanned for a free slot.
- **The record fits one word after fitting.** A second slot per record would be created fresh every time.
- **A vacancy field exists**, as defined below.
- **Whoever uses the identifiers can accept a new format**, as the identity section explains.

## What it costs and what it saves

It saves on an insert only when that insert lands on a tombstone. An insert into a slot never used before costs what it always did.

It costs three things. Removal stops clearing the slot, so it gives up the refund a clear earns. Every occupied slot the scan passes is a storage read. A stored hint, if you keep one, is one more write on every insert and removal.

So the result depends on one number: the share of inserts that find a tombstone. A queue that stays the same size reuses almost always; a ledger that keeps growing almost never. State that share in the plan and say where you took it from. Then measure, as the last section shows.

Do not quote a saving per operation. Prices differ between gas schedules, and a workload with few reuses can come out level or worse. The library publishes what it measured, per schedule: https://github.com/0xferit/slot-recycling-lib/blob/main/docs/gas.md

## One word per record

Lay the word out with the tool. Fields are listed from bit 0 upward and every width is a whole number of bytes. The input format is in `python3 scripts/storage_plan.py --help`.

```sh
python3 scripts/storage_plan.py layout plan.json
```

It returns each field's offset and mask, the `SlotRecyclingLib.create` call for the vacancy field, and the clear mask or the sentinel. It rejects a layout the library would refuse.

In the contract, state the widths once as constants and derive each offset from the widths before it. Build both libraries' configurations from those same constants. If a field is quantized, its encoded width is its width in the word.

## The vacancy field

It must be a whole number of bytes, 8 to 248 bits wide, and **non-zero for every live record on every write path**: the insert and each later update. A live record whose vacancy field reaches zero is free for the next insert to overwrite.

Choose in this order:

1. A field that a rule of the contract keeps non-zero and that never changes while the record lives, such as an amount fixed at creation.
2. A dedicated occupancy byte, set on insert. It costs eight bits and cannot be zeroed by accident.

A field that updates can lower, such as a balance that is drawn down, is not a vacancy field.

A quantized vacancy field needs care: flooring maps every positive value below one step to zero. Use exact encoding and reject zero, as the example does. With floor encoding, reject values below one step with `requireMinStep` before the write.

## The tombstone

What stays in the slot after removal must be non-zero and must have the vacancy field clear. Two ways:

- `free(pool, cfg, index, clearMask)` clears the masked bits and keeps the rest. Use it when some field outside the mask is non-zero in every live record, such as an owner address. List that field under `keep` in the layout plan.
- `freeWithSentinel(pool, cfg, index, sentinel)` writes a word you supply. Use it when nothing is certain to stay non-zero, or when the tombstone should carry something, as in the next section.

Neither call checks that the slot was occupied. Check that yourself before removing.

Until it is reused, a tombstone can still hold old field values. Every reader checks occupancy before it trusts a word.

## Identity

A slot index serves many records over time. Anything that remembers an index can end up pointing at a different record: an approval stored under it, an event an indexer saw, an identifier a user kept. List every such place in the plan: other mappings keyed by the identifier, events that carry it, external callers. Then choose, with the developer:

**Identifiers that never repeat, at no storage cost (the usual choice).** Reserve a generation field in the word.

1. Insert: find the slot with `findVacant`, read the generation its tombstone left with `load`, write the record with that generation through `allocate` at that slot.
2. The identifier is the generation placed above the slot index. Bound the index so the two cannot overlap.
3. Lookup: the slot must be occupied and its generation must equal the identifier's. Otherwise revert.
4. Removal: `freeWithSentinel` with a sentinel that carries the next generation.
5. When a slot's generations run out, retire it: leave it occupied for good. Wrapping would repeat an identifier; reverting would make its last record impossible to remove.

**Reuse accepted.** The index is the identifier. Then the word itself holds what authorizes every action, such as the owner, and it is checked each time; every other piece of state keyed by the identifier is cleared on removal; events carry enough to tell two records apart.

**A separate mapping from identifier to slot.** One new slot per record, which gives back what recycling saved. If this is the only acceptable answer, do not recycle.

## Hints

`allocate` and `findVacant` scan forward from a starting index and pay for every occupied slot they pass.

- **The caller supplies the hint (default).** Expose `findVacant` as a view; callers read it off-chain and pass the result to the insert. A stale hint costs gas, never correctness, because the insert scans from it.
- **A stored hint** only when callers cannot supply one. It costs a write on every insert and removal.
- **Never a constant** in a collection that can grow: scanning from zero gets dearer with every live record.

Bound the hint and the resulting index when the identifier format gives the index a fixed width.

## Changing a live record

The library has no checked in-place update: `store` writes any word anywhere. Wrap it once. The wrapper refuses a vacant slot and refuses a word whose vacancy field is zero, and it is the only caller of `store` in the contract.

## The code: one word per record in a pool

Read `examples/src/BountyBoard.sol` before writing. What to carry over:

- width constants, offsets derived from them, and both library configurations built from them, each created once into an `immutable`;
- `_pack` and one reader per field, used everywhere a word is built or read;
- insert as find, read the generation, allocate; removal through a sentinel that carries the next generation; the retirement branch;
- one lookup that every action goes through, which rejects a vacant slot and a stale generation;
- the single update wrapper around `store`;
- a `findVacant` view and a bounded hint parameter.

## The tests

Read `examples/test/BountyBoard.t.sol`. A pool needs, beyond the boundary and guard tests of fitting:

- an insert after a removal lands on the same slot and gets a different identifier;
- the tombstone is non-zero and reads as vacant;
- the old identifier reverts on every entry point once its slot is reused;
- a positive value below one step cannot be inserted;
- the update wrapper refuses a vacant slot and a word that would read as vacant;
- a slot at its last generation is retired, and a forged identifier for it reverts;
- an insert skips occupied slots, and a hint or index past the bound reverts;
- a random sequence of inserts and removals keeps the balance equal to the sum of live records, with every live identifier still reading its own record.

A test harness that inherits the contract can reach the internal helpers; the example's does.

## Measuring

Keep the contract as it was before the change beside the tests, as a control, and run the same workload against both. `examples/test/BountyBoardWorkload.t.sol` does this with `examples/test/RawBountyBoard.sol`.

Report two numbers for each:

- **Storage slots created**, counted from the state diff by `examples/test/SlotCreation.sol`. Assert it. It is what a gas schedule charges as new state, and it does not change when prices do.
- **Gas paid**, summed per call from `vm.lastFrameGas()` as total minus refund. Log it. Leaving the refund out flatters recycling, because the control earns refunds for the slots it clears. When the project's forge-std does not declare `lastFrameGas` yet, `lastCallGas` returns the same reading; a current Foundry warns that it is deprecated.

```sh
forge test --isolate -vv
```

`--isolate` makes every call its own transaction, so the figures include the base cost and cold access. Measure on the hardfork the project is configured for. Do not project a draft schedule from these readings: a call's own gas reading can miss charges a later schedule applies to the whole transaction.

Choose a workload that matches the reuse share you stated in the plan. If the measured saving is small or negative, report it and recommend against recycling.
