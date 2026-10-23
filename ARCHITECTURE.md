# Collection architecture

## Catalog

Each tool has one authored entry in `tools/`. That entry owns the collection's assessment: purpose, reasons for inclusion, limits, relationship to the maintainer, and links to supporting work. The README is the entry point and index, not a second copy of those assessments.

The catalog uses Markdown so it remains readable directly in the repository. The website is generated from these entries rather than maintaining a competing catalog.

## Upstream boundary

Tool implementations, releases, installation instructions, licenses, and support remain in their upstream repositories. This collection links to those authorities. It does not vendor tools or create separate release streams merely by featuring them.

An entry states whether its relationship is Built, meaning I author and maintain the tool, or Curated. A Built entry links to its source; a Curated entry claims neither authorship nor maintenance.

## Plugin marketplace

The repository is an installable marketplace for Claude Code and Codex. `.claude-plugin/marketplace.json` owns the marketplace identifier and plugin sources. External plugins are fetched directly from their upstream repositories at full commit hashes, keeping reviewed code stable until an explicit catalog update. Original packages can live inside this repository with relative sources. A catalog entry does not imply support for every host's runtime: Live Gantt still reads Claude Code sessions when its skills are installed in Codex.

`scripts/build_marketplace.py` derives `.agents/plugins/marketplace.json` from that catalog and the README title. The generated file adds Codex's display name and opt-in installation policy. It is tracked so a fresh clone works without a build step. Its check mode detects drift without rewriting files. The two host formats exist because Claude's catalog has no marketplace display-name field and Codex has its own presentation and installation-policy fields; their plugin identities and source pins have one authored definition.

## Website

The build in `scripts/build.py` reads the tool order from the README and the assessments from the linked catalog entries. It combines those records with the layout in `site/template.html` and emits the static site into `dist/`. Generated output is ignored by Git and can be recreated without installing dependencies.

The renderer supports the catalog's paragraphs, second-level sections, flat lists, and inline links, emphasis, and code. It escapes authored text and rejects executable link schemes before writing a page. It is deliberately a small catalog renderer rather than a general Markdown engine. Boundary checks exercise the command against temporary catalogs, including a new tool and invalid input.

`site/style.css` owns the design tokens: colour, type scale, spacing and motion curve. Its first `:root` block is the light palette, and a `prefers-color-scheme` block redefines the same colour tokens for dark mode. The build derives the light and dark browser theme colors and the favicon colors from those blocks (the favicon cannot follow the viewer's theme, so it uses the light palette). The page is one ruled sheet: every module is a bordered cell, and cells are the only layout primitive. Archivo (headlines, body) and Geist Mono (labels, indices, buttons) are self-hosted under `site/assets/fonts` with their Open Font License texts, so the page makes no third-party requests. The hero drawing, `site/illustrations/hero-spanner.svg`, is authored art drawn to a stated scale and inlined by the build. Each build empties `dist/` first so retired assets are never deployed. `DESIGN.md` is the design system's one document: principles, token roles, type, layout, components, motion, accessibility and how a tool adopts the system. The build renders it to `design-system.html` through the same page shell as the home page (`site/template.html` holds the shell, `site/home.html` the home content). Directives in the document pull facts from their owners instead of copying them: the colour table and scales come from `site/style.css`, and each component specimen is a file in `site/specimens` shown both live and as source. A contrast directive carries its own threshold, and the build refuses to emit any page when a pair falls below it in either palette, so the documented accessibility claims cannot drift from the tokens. A test checks that every class a specimen uses exists in the stylesheet. Tools outside this repository adopt the system by copying the token blocks and fonts, as `DESIGN.md` describes; they do not import from the site. Illustrations are explicitly labeled examples, not live tool data. The small browser script only controls the illustrative tree and derives its illustrated progress bar from the displayed value. There is no backend, authentication flow, analytics, or runtime connection to either featured tool.

## Hosting

Cloudflare Workers Static Assets serves the public deployment identified in the README. Only the generated `dist/` files are uploaded through the direct-upload interface. There is no Worker module, server process, secret, or runtime binding. Cloudflare owns hostname and routing configuration; HTML paths use automatic trailing-slash handling, and missing assets return a not-found response. These are static documents with fragment navigation, so an application-router fallback would hide broken links.

`site/robots.txt` owns the public crawl policy and is copied to the deployment root. It allows crawlers and explicitly permits search and use as input to artificial intelligence models, including agent browsing. All meaningful page content is server-rendered HTML, so a crawler does not need to execute JavaScript. Cloudflare's zone-level AI bot policies do not apply to this account's `workers.dev` hostname; no unrelated zone protections are changed.

The private ChatGPT Site identity and output directory remain in `.openai/hosting.json`. It is an independent preview snapshot, updated only when explicitly published to that service. Its source repository is a deployment copy, not a second authored collection. The GitHub catalog remains the working source for both hosts.
