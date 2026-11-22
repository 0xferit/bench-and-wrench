# Ferit's Bench and Wrench

Software tools, chosen with care.

A personal collection of tools I build or curate. Each entry explains the problem a tool solves, why it earns a place, and where its limits are. The aim is useful judgment backed by working software.

## On the bench

- [Live Gantt](tools/live-gantt.md): development progress and estimated milestone completion in Claude Code.
- [Linear Work Tree](tools/linear-work-tree.md): initiatives, projects, milestones, and assigned issues in one navigable hierarchy.
- [Solidity Storage Optimizer](tools/solidity-storage-optimizer.md): fewer and reused storage slots in Solidity contracts.

## What the labels mean

- **Built:** I build and maintain the tool. The entry links to its source and credits collaborators.
- **Curated:** I selected and documented the tool here. Support and releases remain with the upstream project.

A curated entry claims neither authorship nor maintenance.

## What belongs here

Tools that address a concrete development problem and have a reason to exist in a working developer's kit. An entry should make it easier to decide whether to use the tool, not just repeat its feature list.

This repository holds the collection, its website and the skill packages written for it. Other tools keep their source, releases, installation instructions, and issue trackers upstream.

For how the collection is organized, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Install the marketplace

**Ferit's Bench and Wrench** is also an installable plugin marketplace. Its identifier is `bench-and-wrench`; Claude requires a name without spaces or apostrophes. Codex displays the full title.

In Claude Code, run:

```text
/plugin marketplace add 0xferit/bench-and-wrench
/plugin install live-gantt@bench-and-wrench
/plugin install solidity-workbench@bench-and-wrench
```

In the Codex command-line interface, run:

```sh
codex plugin marketplace add 0xferit/bench-and-wrench
codex plugin add live-gantt@bench-and-wrench
codex plugin add solidity-workbench@bench-and-wrench
```

Start a new session after installation. Live Gantt's task planning and timeline read **Claude Code sessions**. Installing its skills in Codex does not add tracking of Codex tasks. See the [Live Gantt field notes](tools/live-gantt.md) for requirements and limitations. Solidity Workbench holds one skill, Solidity Storage Optimizer, which works in both hosts as `solidity-workbench:storage-optimizer`; it needs a Foundry project, and its [field notes](tools/solidity-storage-optimizer.md) say where it stops.

Live Gantt is fetched from its upstream release at a pinned commit. Solidity Workbench is an original package whose source is in [plugins/solidity-workbench](plugins/solidity-workbench). Linear Work Tree remains a hosted website, not an installable plugin. Adding this marketplace does not install every entry automatically or submit it to either provider's official directory.

### Maintaining the marketplace

Edit [.claude-plugin/marketplace.json](.claude-plugin/marketplace.json) to add a plugin or update its release. Keep upstream sources pinned to full commit hashes, and keep their authorship and licenses intact. Review an update before changing the pin; marketplace refreshes must not silently select a moving upstream branch.

For an original skill package, commit its source, skill instructions, and manifest under `plugins/`, then add its relative source path to the catalog. Both hosts read the package's own manifest, as in [plugins/solidity-workbench/.claude-plugin/plugin.json](plugins/solidity-workbench/.claude-plugin/plugin.json). Give it a version, an explicit license, and a description of when to use it, and raise the version with every change: hosts use it to decide whether an installed copy is current. Publish only skills intended for other people; local agent settings and private workflows do not belong here. The [Claude packaging guide](https://code.claude.com/docs/en/plugins) and [Codex packaging guide](https://developers.openai.com/plugins/build/plugins) describe the supported manifests and directory layout.

Regenerate the Codex catalog after changing entries or the README title:

```sh
python3 -B scripts/build_marketplace.py
python3 -B scripts/build_marketplace.py --check
claude plugin validate . --strict
claude plugin validate plugins/solidity-workbench --strict
```

The first validation covers the catalog and each package's manifest. A package's skills are checked only when its own directory is validated.

Solidity Storage Optimizer carries a small Foundry project of example contracts that its instructions point at. After changing them or the library versions they pin, run them, since the site workflow has no Solidity toolchain. A new library version also means new commit pins in the skill's install section and new pins in the scenario projects.

```sh
cd plugins/solidity-workbench/skills/storage-optimizer/examples
forge soldeer install
forge test --isolate
```

The scenarios in [evals/solidity-workbench/storage-optimizer](evals/solidity-workbench/storage-optimizer) show what an agent does with the skill and without it. Run them by hand, as their README describes, before and after changing the skill's text.

Commit the source and generated catalog together. [.agents/plugins/marketplace.json](.agents/plugins/marketplace.json) is generated; do not edit it directly. Users receive catalog updates with `/plugin marketplace update bench-and-wrench` in Claude Code or `codex plugin marketplace upgrade bench-and-wrench` in Codex. Update installed plugins through the host's plugin controls.

## Website

The website is generated from the catalog entries above. Edit the Markdown entries to update the tool descriptions, assessments, and links.

The site's look is the drawing-sheet design system, documented in [DESIGN.md](DESIGN.md) and published on the site as the design-system page. Its tokens live in `site/style.css`; the build checks the documented contrast pairs against them.

Build with Python's standard library, then serve the generated page locally:

```sh
python3 -B scripts/build.py
python3 -m http.server 4794 --bind 127.0.0.1 --directory dist
```

Run the boundary checks with:

```sh
python3 -B -m unittest discover -s tests
node --check site/app.js
```

## Deployment

The public website is [bench-and-wrench.0xferit.workers.dev](https://bench-and-wrench.0xferit.workers.dev/), hosted by the `bench-and-wrench` Worker in the personal Cloudflare account named `Ferit`.

Pushing to `main` deploys. The `site` workflow runs the checks above and the build on every pull request, and on a push to `main` it then rebuilds `dist/` and uploads it to the existing Worker with Wrangler, which serves static assets without a Worker script. Unknown paths return a not-found response instead of the homepage. The deploy job runs in the `production` environment and reads one repository secret, `CLOUDFLARE_API_TOKEN`, a Cloudflare API token limited to editing the `bench-and-wrench` Worker. To deploy by hand, run the same build and `wrangler deploy --assets dist` with the same account.

The existing private ChatGPT Site remains a separate preview snapshot. Its identity is recorded in [.openai/hosting.json](.openai/hosting.json); deploying to Cloudflare does not update that preview.

## Credits

Site design based on the Heron AI website by Bearplus, used with permission.
