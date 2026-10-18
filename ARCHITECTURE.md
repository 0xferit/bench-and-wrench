# Collection architecture

## Catalog

Each tool has one authored entry in `tools/`. That entry owns the collection's assessment: purpose, reasons for inclusion, limits, relationship to the maintainer, and links to supporting work. The README is the entry point and index, not a second copy of those assessments.

The catalog uses Markdown so it remains readable directly in the repository before a website exists. A future website should present these entries rather than maintain a competing catalog.

## Upstream boundary

Tool implementations, releases, installation instructions, licenses, and support remain in their upstream repositories. This collection links to those authorities. It does not vendor tools or create separate release streams merely by featuring them.

An entry must state whether the relationship is curation, maintenance, authorship, or a combination. Maintenance and authorship claims need a defined scope and supporting source or contribution links; curation alone carries neither claim.

## Website

No website implementation or hosting is configured yet. The catalog is usable on its own, and choosing a website stack does not require moving the featured tools into this repository.
