# Solidity Storage Optimizer

**Relationship: Built.** I build and maintain this skill and the two Solidity libraries it applies. The skill's source is in this repository; the libraries keep their own repositories, releases and issue trackers.

Solidity Storage Optimizer is a skill for coding agents that reduces what a contract pays for storage. It fits each record into fewer storage slots, and where a collection keeps creating and deleting records it reuses freed slots instead of paying for new ones.

## Why it earns a place

Storage is the most expensive resource a contract touches, and the saving is decided by details that are easy to get wrong by hand: how many bits a value really needs, what may be rounded, which bits mark a slot as free. The skill turns those into a plan the developer approves before any code changes, generates the code against two tested libraries, and proves the result with boundary tests and measured gas.

It also says no. It stops on a deployed layout without a migration plan, refuses lossy encoding nobody approved, and reports when recycling would not pay for the workload it measured.

## When it is useful

- Fitting a struct that spans several storage slots into the few its values need.
- Reusing freed slots in a collection that creates and deletes records all the time.
- Cutting storage costs before a network upgrade that prices new state higher.

## Limits to understand

It changes storage layout, so it suits contracts that are not deployed yet. For a deployed or upgradeable contract it stops until there is a migration plan, and it does not write that migration.

Savings depend on the workload. Quantization discards low bits by design, and recycling reuses slot indices, so identifiers repeat unless the record carries a generation. On today's gas schedule a mixed workload can gain almost nothing from recycling; the skill measures before it claims.

It needs a Foundry project on Solidity 0.8.25 or later, and it never installs the libraries itself. Treat both libraries and the generated code as unaudited, and review an agent's output like any other contract change.

## Get it

- [Install it from this marketplace](https://github.com/0xferit/bench-and-wrench#install-the-marketplace)
- [Skill source](https://github.com/0xferit/bench-and-wrench/tree/main/plugins/solidity-workbench)
- [uint-quantization-lib](https://github.com/0xferit/uint-quantization-lib), which quantizes values that exact types cannot fit
- [slot-recycling-lib](https://github.com/0xferit/slot-recycling-lib), which reuses freed slots

It installs with the plugin `solidity-workbench@bench-and-wrench` in Claude Code and in Codex, as the skill `storage-optimizer`. The skill and both libraries are released under the MIT License.
