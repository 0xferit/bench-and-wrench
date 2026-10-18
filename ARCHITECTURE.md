# Collection architecture

## Catalog

Each tool has one authored entry in `tools/`. That entry owns the collection's assessment: purpose, reasons for inclusion, limits, relationship to the maintainer, and links to supporting work. The README is the entry point and index, not a second copy of those assessments.

The catalog uses Markdown so it remains readable directly in the repository. The website is generated from these entries rather than maintaining a competing catalog.

## Upstream boundary

Tool implementations, releases, installation instructions, licenses, and support remain in their upstream repositories. This collection links to those authorities. It does not vendor tools or create separate release streams merely by featuring them.

An entry must state whether the relationship is curation, maintenance, authorship, or a combination. Maintenance and authorship claims need a defined scope and supporting source or contribution links; curation alone carries neither claim.

## Website

The build in `scripts/build.py` reads the tool order from the README and the assessments from the linked catalog entries. It combines those records with the layout in `site/template.html` and emits the static site into `dist/`. Generated output is ignored by Git and can be recreated without installing dependencies.

The renderer supports the catalog's paragraphs, second-level sections, flat lists, and inline links, emphasis, and code. It escapes authored text and rejects executable link schemes before writing a page. It is deliberately a small catalog renderer rather than a general Markdown engine. Boundary checks exercise the command against temporary catalogs, including a new tool and invalid input.

`site/style.css` owns the palette. The build derives the browser theme color and favicon colors from those tokens. Illustrations are explicitly labeled examples, not live tool data. The small browser script only controls the illustrative tree and derives its illustrated progress bar from the displayed value. There is no backend, authentication flow, analytics, or runtime connection to either featured tool.

## Hosting

Cloudflare Workers Static Assets serves the public deployment identified in the README. Only the generated `dist/` files are uploaded through the direct-upload interface. There is no Worker module, server process, secret, or runtime binding. Cloudflare owns hostname and routing configuration; HTML paths use automatic trailing-slash handling, and missing assets return a not-found response. These are static documents with fragment navigation, so an application-router fallback would hide broken links.

`site/robots.txt` owns the public crawl policy and is copied to the deployment root. It allows crawlers and explicitly permits search and use as input to artificial intelligence models, including agent browsing. All meaningful page content is server-rendered HTML, so a crawler does not need to execute JavaScript. Cloudflare's zone-level AI bot policies do not apply to this account's `workers.dev` hostname; no unrelated zone protections are changed.

The private ChatGPT Site identity and output directory remain in `.openai/hosting.json`. It is an independent preview snapshot, updated only when explicitly published to that service. Its source repository is a deployment copy, not a second authored collection. The GitHub catalog remains the working source for both hosts.
