# Solidity Storage Optimizer

A skill for coding agents that reduces what a Solidity contract pays for storage. It fits each record into fewer 256-bit slots and, where a collection keeps adding and removing records, reuses the slots of removed ones.

It applies two libraries, [uint-quantization-lib](https://github.com/0xferit/uint-quantization-lib) and [slot-recycling-lib](https://github.com/0xferit/slot-recycling-lib), and never re-implements them.

## Install

In Claude Code 2.1.275 or later:

```text
/plugin install solidity-storage-optimizer --marketplace 0xferit/bench-and-wrench
```

For Codex and for earlier versions, follow the [marketplace's install section](https://github.com/0xferit/bench-and-wrench#install-the-marketplace).

## What to ask

- "Reduce the storage cost of the `Position` struct in my vault contract. Show me the plan first."
- "My order book creates and removes orders all day. Could freed slots be reused, and would it pay?"
- "Can `Listing` fit one storage slot? Tell me what I would lose before changing anything."

## What to expect

The skill makes the agent:

1. find the largest value each field can hold, and what enforces that bound;
2. pack with exact types first, and offer quantization only for what exact types cannot fit;
3. check whether reusing freed slots applies to each collection, and whether it would pay;
4. show you the plan and wait for your answer before it edits anything;
5. generate the code and its tests, then measure a workload before and after.

## What it will not do

- Change the storage layout of a deployed or upgradeable contract on its own. It stops and reports what would break, and goes on only under a migration plan you approved or once you confirm the contract was never deployed. It does not write the migration.
- Install a library. It prints the command and stops.
- Round a value, or change what callers see, without your approval.
- Promise a saving. It reports what it measured, including when that is nothing.

## What it runs

- The bundled [storage_plan.py](skills/solidity-storage-optimizer/scripts/storage_plan.py), with Python 3.10 or later. It uses the standard library only, reads a plan the agent wrote and prints JSON. It opens no network connection and writes no file.
- Your own Foundry toolchain in your project: `forge build`, `forge test`, `forge inspect`.

Nothing is fetched or sent. The package has no hooks, commands or servers.

## Requirements

A Foundry project on Solidity 0.8.25 or later. Neither library has a published independent audit; review generated code like any other contract change.

## What is in the package

- [SKILL.md](skills/solidity-storage-optimizer/SKILL.md): the stops, the approval gates and the flow.
- [references](skills/solidity-storage-optimizer/references): fitting and recycling in detail.
- [examples](skills/solidity-storage-optimizer/examples): two tested contracts the references point at.

Released under the [MIT License](LICENSE). Source and issues: [0xferit/bench-and-wrench](https://github.com/0xferit/bench-and-wrench). To report a vulnerability, use [private vulnerability reporting](https://github.com/0xferit/bench-and-wrench/security/advisories/new) on this repository.
