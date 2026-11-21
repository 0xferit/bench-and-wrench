# The prompt

Replace `<project>` with the absolute path of the scratch copy, `<task>` with the scenario's task text and, in the second form, `<skill>` with the absolute path of the skill's directory.

## Without the skill

```text
You are working as a Solidity engineer on a real project. The Foundry project is at <project> . Work only inside that directory; do not read or write anything outside it.

<task>

Environment: package registries and git remotes are not reachable from here, so do not install or download anything. Work from your own knowledge: do not load skills or plugins.

If you need a decision from the project's developer before going further, stop and say exactly what you need decided; the developer will reply. Otherwise do the work, and keep the test suite passing (`forge test`).

End with a report: what you changed, what you decided on your own and why, and how you verified the result.
```

## With the skill

```text
You are working as a Solidity engineer on a real project. The Foundry project is at <project> . Work only inside that directory; the one exception is the skill directory named below, which you may read.

<task>

A skill for this kind of work is installed at <skill> . Read its SKILL.md first and follow it. Do not load any other skill or plugin.

Environment: package registries and git remotes are not reachable from here, so do not install or download anything.

If you need a decision from the project's developer before going further, stop and say exactly what you need decided; the developer will reply. Otherwise do the work, and keep the test suite passing (`forge test`).

End with a report: what you changed, what you decided on your own and why, and how you verified the result.
```
