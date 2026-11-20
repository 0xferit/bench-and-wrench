---
name: solidity-storage-optimizer
description: Reduces the storage a Solidity contract pays for by packing struct fields into fewer 256-bit slots, quantizing uint256 values with uint-quantization-lib where exact packing is not enough, and reusing freed mapping slots with slot-recycling-lib. Use when a struct or mapping record spans several storage slots, when SSTORE or SLOAD cost dominates a gas report, when a collection keeps creating and deleting entries, or when asked to pack a struct, quantize values, recycle storage slots or cut storage gas in a Foundry project.
license: MIT
---

# Solidity Storage Optimizer

Two ways to pay less for storage, applied in this order. **Fit** each record into fewer 256-bit slots. Then **recycle** the slots of removed records where a collection keeps adding and removing them.

Two libraries do the bit work: `uint-quantization-lib` and `slot-recycling-lib`. Your work is the judgment they cannot make: what each field really needs, what may be rounded, what an identifier means once slots are reused, and whether the saving is real.

Paths in this skill are relative to the directory that holds this file. Run the bundled tool as `python3 <that directory>/scripts/storage_plan.py`.

## Stop and report

Check these before you edit anything. If one holds, change no file. Report what you found and what you need.

1. **The contract is deployed, or upgradeable.** Look for deployment records, addresses in the README or configuration, a proxy, `initialize`, an upgrade function, a storage gap. If you cannot tell, ask. An upgradeable contract that has never been deployed is free to change, but get that confirmed; do not assume it.
2. **A library the plan needs is not installed.** Print the install command from [Libraries](#libraries) and stop. Do not install it, copy its source into the project, or write your own version of what it does.
3. **The compiler is older than 0.8.25 and the plan needs a library.** Say so. Packing with native types alone can still go through the gates below.
4. **The record holds a mapping, a dynamic array, `bytes`, `string` or a nested struct.** Ask for the scalar fields to be split out first. For `int`, `enum` and user-defined value types, ask how they convert to an unsigned integer.

### A deployed layout is not yours to change

Changing a field's type or order moves fields to other slots. Every record already in storage is then read through the new layout: amounts read as zero, timestamps read as amounts, funds lock. This holds when "only the types change".

So on a deployed or upgradeable contract you edit nothing: no packed struct, no migration, no second version beside the first, no tests around either. You report:

- the evidence that it is live;
- which fields would move, and what existing records would read as;
- one question: is there an approved migration plan, and who owns it?

You may name the safe directions as questions: a migration the team writes and rehearses against the live state, or new storage for new records only. You do not build either.

| What you will tell yourself | What is true |
|---|---|
| "A migration makes it safe, so I will write one." | A migration over live funds is a second change nobody approved, written against stored values and gas limits you cannot read from here. |
| "Their claim is wrong, so I will build the correct version." | Correct the claim in words. Building is still the decision they did not make. |
| "I will build it and let them choose an option afterwards." | The edit is the choice. Ask first. |
| "The upgrade is tomorrow; there is no time to ask." | A layout mistake on live storage is not undone by the next upgrade. The deadline is the reason to stop. |
| "I listed everything I could not verify." | That list is the argument against having written it. |

Red flags that mean stop: you are writing `migrate`, a version flag or a frozen copy of the old contract; your report has a section called "decided on my own"; you are explaining why the person who asked was wrong while doing what they asked.

## Ask and wait

Show the plan, then wait for the answer. An edit made before the answer is a decision taken for the developer, and listing it afterwards does not undo it. When nobody can answer, return the plan and the open questions as your result and stop there.

Ask before:

1. **The first edit to contract code.** Show the per-field table (type now, maximum and where it comes from, width, stored type), slots before and after, and the best lossless result apart from any lossy one.
2. **Each lossy field.** Give the step, the largest value, the worst-case error and the rounding mode. Do not set a lossy option aside as "a product decision" without these numbers: the developer cannot decide what they were not shown.
3. **Recycling.** Give the vacancy field, the tombstone, the identity strategy, the hint strategy and the share of inserts you expect to reuse a slot.
4. **Anything callers would see.** Getter return types, identifier format, a new parameter, inputs that must now be multiples of a step, new reverts.

## Flow

| Phase | What you do | Read first |
|---|---|---|
| 0 Scope | Find the target record and every collection that stores it. Run the stop checks. | this file |
| 1 Measure | For every field: the largest value it can hold and the source of that bound. | `references/fitting.md` |
| 2 Fit | Exact native packing first. Quantize only what exact types cannot fit. Validate the plan with the tool. | `references/fitting.md` |
| 3 Recycle check | For each collection that both adds and removes records: does recycling apply, and would it pay? | `references/recycling.md` |
| 4 Approve | Show the plan and wait. | this file |
| 5 Generate | A storage-only packed struct, or one word per record in a pool. | the reference for the shape |
| 6 Test | Boundaries and guards for every changed field; reuse, tombstone and stale identifier for a pool. | the reference for the shape |
| 7 Verify | Build, whole suite, layout from the compiler, a measured workload, the report. | this file |

Skip phase 3 when no collection removes records. Recycling needs the record in one word, so it follows fitting and never replaces it.

The two shapes have worked, tested examples. Read the one you are generating before you write code:

- `examples/src/StakeVault.sol`: a packed struct with a quantized amount, nothing recycled.
- `examples/src/BountyBoard.sol`: one word per record, recycled, with identifiers that do not repeat.

## Libraries

Verified against `uint-quantization-lib` 8.0.0 and `slot-recycling-lib` 1.1.1, on Solidity 0.8.25 and later. A library counts as installed when its import resolves:

```solidity
import {Quant, UintQuantizationLib} from "uint-quantization-lib/src/UintQuantizationLib.sol";
import {RecycleConfig, SlotRecyclingLib} from "slot-recycling-lib/src/SlotRecyclingLib.sol";
```

When one is missing, print the command for the project's dependency manager and stop. Print only what the plan needs.

A project with a `[dependencies]` table or a `soldeer.lock` uses Soldeer. The imports above need `remappings_version = false` under `[soldeer]`.

```sh
forge soldeer install 'uint-quantization-lib~8.0.0'
forge soldeer install 'slot-recycling-lib~1.1.1'
```

A project with `.gitmodules` or a `lib/` directory uses git submodules. The imports then need the remappings `uint-quantization-lib/=lib/uint-quantization-lib/` and `slot-recycling-lib/=lib/slot-recycling-lib/`.

```sh
forge install 0xferit/uint-quantization-lib@v8.0.0
forge install 0xferit/slot-recycling-lib@v1.1.1
```

Neither library has a published independent audit. Say so in the report.

## Verify and report

1. `forge build`, then the whole suite with `forge test`.
2. `forge inspect <Contract> storageLayout` for the slots per record, before and after.
3. A workload that looks like real use, run against the contract before and after. Count the storage slots it creates and the gas it pays; `references/recycling.md` shows the test. Report what you measured, on the project's configured hardfork. Never quote a saving from memory or from another project.

Report in this form:

```text
Records     <record>: <n> -> <m> slots per entry; lossless | lossy: <field>, step <s>, worst-case error <e>
Recycling   <collection>: applied | not applied, because <reason>
Measured    <workload>: created slots <a> -> <b>; gas paid <x> -> <y>; <hardfork>
Libraries   <calls introduced, with versions>; no published independent audit
Approved    <each decision the developer made>
Interface   <what callers now see differently>
Remaining   <what was not verified, and what could still go wrong>
```

## Common mistakes

- Editing first and reporting the decisions afterwards.
- Narrowing the struct that callers see. Add a storage-only packed struct and keep the original type at the interface.
- Writing an allocator, a free list or a quantizer by hand when the library is the point.
- Floor-encoding money. Use exact encoding, or get the remainder policy approved.
- A vacancy field that an update can bring to zero while the record is still live.
- Scanning for a free slot from a constant starting point in a collection that grows.
- A test that cannot fail, such as reading "corrupted" storage from a field that is exactly as wide as its scheme.
