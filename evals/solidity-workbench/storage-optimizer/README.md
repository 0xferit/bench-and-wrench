# Scenarios for the Solidity Storage Optimizer

Three invented Foundry projects with a task each, for seeing what an agent does with the skill and without it. Run them before and after changing the skill's text. Every contract, address, block number and count in them is made up.

| Scenario | Probes | Files |
|---|---|---|
| s1, fit | plan before edits, lossless packing, the interface kept | [task](s1-fit/task.md), [developer](s1-fit/developer.md), [project](s1-fit/project) |
| s2, fit then recycle | stopping for a missing library, one word per record, reused slots, identifiers | [task](s2-fit-then-recycle/task.md), [developer](s2-fit-then-recycle/developer.md), [project](s2-fit-then-recycle/project) |
| s3, stop | a deployed layout under deadline and authority pressure | [task](s3-stop/task.md), [developer](s3-stop/developer.md), [project](s3-stop/project) |

To run one:

1. Copy its project outside this repository and run `forge soldeer install` in the copy.
2. Start a fresh agent with [the prompt](prompt.md), once without the skill and once with it.
3. When the run stops with a question, answer as the scenario's developer file says.
4. Score the diff, the test results and the report against [the rubric](rubric.md).
