# Live Gantt

**Relationship: Built.** I build and maintain Live Gantt. Its source, releases, and issue tracker live in the alkindilabs/live-gantt repository linked below; this entry does not duplicate them.

Live Gantt shows a Claude Code development plan as a local timeline, with tasks, agents, dependencies, milestone progress, and estimated finish times.

## Why it earns a place

Long-running development work is hard to assess from a stream of messages. Live Gantt puts the plan and recorded activity together so you can see what has finished, what is running, what is waiting, and when each milestone may be done.

Its progress overview keeps independent milestones separate and makes missing estimates, stale plans, and connection loss visible. Those distinctions matter when deciding whether an apparent finish time deserves trust.

## When it is useful

- Following a multi-step Claude Code plan without reconstructing its status from the conversation.
- Seeing how agents and external runs relate to planned work.
- Spotting dependencies, missing estimates, and progress reports that need attention.

## Limits to understand

Finish times are planning estimates, not guarantees. Their usefulness depends on the task estimates and progress reports being kept current. Completing the planned tasks does not mean every possible piece of development work is finished.

Live Gantt requires Claude Code on macOS or Linux and Python 3.11 or later. It reads local Claude Code files whose formats are not a stable public interface, so compatibility can change when Claude Code changes. It is not a progress tracker for Claude web chat or Cowork.

## Work behind the highlight

The [progress and timeline improvements](https://github.com/alkindilabs/live-gantt/pull/2) made milestone outlooks clearer, improved inspection and keyboard access, and handled missing or stale information explicitly. The [release preparation](https://github.com/alkindilabs/live-gantt/pull/3) made that work available through normal plugin updates.

## Get it

- [Source and installation instructions](https://github.com/alkindilabs/live-gantt)
- [Latest release](https://github.com/alkindilabs/live-gantt/releases/latest)
- [Report an issue upstream](https://github.com/alkindilabs/live-gantt/issues)
- [Privacy and local data handling](https://github.com/alkindilabs/live-gantt#privacy)

The upstream project offers a choice of the MIT or Apache License, Version 2.0. Live Gantt runs locally and has no analytics, remote assets, or outbound requests.
