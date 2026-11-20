# Fitting a record into fewer slots

Phases 1 and 2 of the flow, and the code and tests for a record that is fitted but not recycled.

## Contents

- Field records
- Where a maximum comes from
- Fields nothing reads on-chain
- The packing trial
- Quantization
- Spare bits
- Checking the plan
- The code: a storage-only packed struct
- The tests

## Field records

Write one record per field before choosing any width. It is the table you show at the first gate.

| Column | Content |
|---|---|
| name, type now | as declared |
| category | `PASSTHROUGH`, `IDENTITY`, `NATIVE_PACKABLE` or `FULL_RANGE_QUANTIZABLE` |
| maximum | the largest value any write path can store |
| source | the line or rule that enforces that maximum |
| width | bits for the maximum, rounded up to a whole byte |

- `PASSTHROUGH`: `address`, `bool` and `bytesN`. It keeps its width: 160, 8 and 8N bits.
- `IDENTITY`: a `uint256` whose exact bits something else depends on: a mapping key, a hash input, an identifier handed to another contract. Exact width only; it is never quantized. An amount of money is not an identity field: exact encoding keeps every unit of it and only restricts it to multiples of the step.
- `NATIVE_PACKABLE`: an unsigned integer of any declared width whose maximum fits a smaller `uintN`. A `uint64` timestamp is one: it fits 40 bits. Narrowing a field declared smaller than `uint256` makes values its old type accepted revert, so it goes through the fourth gate.
- `FULL_RANGE_QUANTIZABLE`: a `uint256` whose maximum fits no smaller type. Only quantization can narrow it.

The tool computes a width from a maximum: `python3 scripts/storage_plan.py width <maximum> 0`.

## Where a maximum comes from

A width is only as good as the bound behind it. Accept a bound when you can point at what enforces it:

- **A cap checked on every write path.** Name the check. A cap enforced by another contract (a token's supply limit) is an assumption: write it in the plan as one.
- **Time.** A `uint40` timestamp lasts past the year 36000; a `uint32` ends in 2106.
- **Accumulation.** For a field that grows with `+=`, the maximum is the largest single increase times the number of increases, not the largest increase.
- **Ratios.** An accumulator divided by a quantity that can become tiny grows fastest when that quantity is smallest. Find the smallest reachable denominator (one unit left after a withdrawal counts) before you trust a narrow width.
- **Arithmetic after the read.** A bound that holds only because a later multiplication would overflow is not a bound on storage. Size for what can be written.

A field with no enforceable bound stays at its declared width. Say so; do not invent a cap.

## Fields nothing reads on-chain

A field that no function reads and no interface exposes can leave storage and be emitted in an event instead. Anything readable from outside the contract counts as read. Removing a field changes what callers and indexers see, so it goes through the fourth gate.

## The packing trial

Total bits do not decide whether fields fit: three 136-bit fields add up to 408 bits, less than two slots, and still need three. Run the trial.

```sh
python3 scripts/storage_plan.py pack <targetSlots> <width> <width> ...
```

Start from the current slot count minus one and go down. The lowest target the tool can pack with exact widths is the best lossless result. Its `method` tells you how far to trust a miss: `infeasible` is a proof, `ffdBest` (more than 12 fields) is not.

Solidity packs struct members in declaration order, so the packed struct declares its members in the order the tool assigned them. Do not reorder the struct that callers see: a public getter returns its members in declaration order.

## Quantization

Reach for it only when exact widths miss the target slot count and the developer wants that last slot. A field leaves `d` low bits out and stores the rest, so values are kept in steps of `2^d`.

```sh
python3 scripts/storage_plan.py width <maximum> <d>
```

`d` is a multiple of 8. The output gives the encoded width, the step, the largest value the scheme holds and the `create` call. For the second gate, state for each quantized field:

- the step in the field's own unit (`2^40` wei is about a millionth of an ether);
- the largest value the scheme holds, against the field's maximum;
- the worst-case error, which is one step minus one unit;
- the rounding mode, below.

**Exact encoding: `scheme.encode(value, true)`.** It reverts unless the value is a whole number of steps. Nothing is ever lost, and callers must send aligned values, which is an interface change. This is the mode for money.

**Floor encoding: `scheme.encode(value)`.** It drops the remainder. Use it only when the developer has approved where the remainder goes: kept by the contract, refunded, or rounded against the caller. Add `scheme.requireMinStep(value)` when a small positive value must not be stored as zero. Keep any running total consistent: add the stored value's decoded amount, not the caller's input, or the sum drifts from its parts.

Reading back, `scheme.decode(units)` gives the lower end of the step and `scheme.decodeMax(units)` the upper end. Use the end that is safe for the decision being made: the lower for what a user may take out, the upper for what a user owes.

A claim that "every value is already a multiple of the step" is a hypothesis until every write path proves it. Exact encoding turns the hypothesis into a check, so prefer it to trusting the claim.

Create each scheme once with `UintQuantizationLib.create(d, e)` into an `immutable`. Never build one with `Quant.wrap`.

## Spare bits

After the trial, a slot usually has bits left. Give them back in whole bytes: first to quantized fields, lowering `d` so less is lost, then to exact fields for headroom. Run `width` again for any field whose `d` changed.

## Checking the plan

Write the plan as JSON and let the tool check it before you show it. The input format is in `python3 scripts/storage_plan.py --help`.

```sh
python3 scripts/storage_plan.py check plan.json
```

It fails a plan in which a scheme does not cover its field's maximum, an identity field discards bits, a passthrough field changed width, a width is not a whole number of bytes, or a slot holds more than 256 bits. Fix the plan, not the check.

## The code: a storage-only packed struct

Read `examples/src/StakeVault.sol` before writing. What to carry over:

- **Two structs.** The original stays as the type callers pass and receive. A `Packed<Name>` struct exists only in storage. `_read` and `_write` convert between them, and nothing else touches the packed fields.
- **A public mapping becomes private with a hand-written getter** that returns the original type, so return types and their order do not change.
- **One statement of each width.** The stored field's type is that statement. The example creates its scheme from the type's range, so the type and the scheme cannot drift apart.
- **A bound check directly above every narrowing cast.** A cast in Solidity truncates silently; `encode` is the check for a quantized field, and an explicit comparison for an exact one.
- **Checked `decode`** on reads.

## The tests

Read `examples/test/StakeVault.t.sol`. For every field that changed:

- the maximum round-trips, and the first value past it reverts;
- for exact encoding, an unaligned value reverts; for floor encoding, a value between two steps reads back as the lower step;
- every new revert has a test that fails when its guard is removed.

For the record as a whole, assert the slot count: `examples/test/SlotCreation.sol` counts the slots a call creates, and widening one field by a byte must make that test fail.

Do not test for "corrupted" stored values in a field that is exactly as wide as its scheme's encoded width. Every value such a field can hold is valid, so the test cannot fail.

Confirm the layout with the compiler, not by adding up widths:

```sh
forge inspect <Contract> storageLayout
```
