# Ferit's Bench and Wrench

Software tools, chosen with care.

A personal collection of tools I curate, investigate, and sometimes help maintain. Each entry explains the problem a tool solves, why it earns a place, and where its limits are. The aim is useful judgment backed by working software.

## On the bench

- [Live Gantt](tools/live-gantt.md): development progress and estimated milestone completion in Claude Code.
- [Linear Work Tree](tools/linear-work-tree.md): initiatives, projects, milestones, and assigned issues in one navigable hierarchy.

## What the labels mean

- **Curated:** selected and documented here. Support and releases remain with the upstream project.
- **Maintained:** I take responsibility for a stated part of the tool's upkeep. The entry identifies that scope and where the work happens.
- **Built:** I authored the tool. The entry credits collaborators and links to the source.

A tool can have more than one label. Inclusion alone does not imply authorship or a promise to maintain it.

## What belongs here

Tools that address a concrete development problem and have a reason to exist in a working developer's kit. An entry should make it easier to decide whether to use the tool, not just repeat its feature list.

This repository holds the collection and its website. Individual tools keep their source, releases, installation instructions, and issue trackers upstream.

For how the collection is organized, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Website

The website is generated from the catalog entries above. Edit the Markdown entries to update the tool descriptions, assessments, and links.

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

Build and run the checks above before deploying. Upload only the generated `dist/` directory through Cloudflare's [Workers static-assets direct-upload interface](https://developers.cloudflare.com/workers/static-assets/direct-upload/), then attach the completed upload to the existing Worker. The deployment serves static assets without a Worker script. Unknown paths return a not-found response instead of the homepage.

The existing private ChatGPT Site remains a separate preview snapshot. Its identity is recorded in [.openai/hosting.json](.openai/hosting.json); deploying to Cloudflare does not update that preview.
