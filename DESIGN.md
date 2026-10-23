# Design system

The drawing-sheet design system keeps Ferit's Bench and Wrench and every tool in it looking like one family.

`site/style.css` is the only definition of the tokens. This document explains what they mean and how to use them. The website and the tool illustrations are the reference implementation, and the specimens below are the real components, not pictures of them.

## Principles

- **Everything is a cell.** A page is one ruled sheet. Every module is a bordered cell, and cells in a row are separated by 1px rules. There are no cards, shadows or rounded corners.
- **Measure, do not decorate.** Rules, ticks, indices and hatching carry information: a tick is an interval, a bracketed index is a position in a sequence, a hatched area is work that has not happened. If a mark carries nothing, leave it out.
- **Statements in grotesque, labels in mono.** Archivo sets headlines and prose. Geist Mono, always uppercase, sets labels, indices, status and buttons.
- **One accent.** Vermilion marks what to act on or what to look at. It is never decoration, and no screen carries more than a few uses.
- **State is drawn, not described.** Done is solid ink, running is vermilion, estimated is dashed, waiting is hatched. A reader should not need a legend for the common states.
- **Quiet motion.** One orchestrated moment per page, plus responses to the reader's own actions. Reduced motion shows the resting state.

## Colour

{{palette}}

- `--paper` is the page ground. It carries a faint grain, so cells stay transparent and let it show.
- `--cell` is a raised surface or a hover state: the window inside an illustration, a hovered row.
- `--ink` is text, rules that need weight, and drawing lines.
- `--muted` is secondary text and fine drawing lines.
- `--rule` is the 1px divider between cells. It is a boundary, not text, so it is allowed a lower contrast than text.
- `--brand` is the accent. `--on-brand` is the colour of text set on it.

Use tokens, never raw values. The dark palette redefines the same names, so a component written with tokens is already themed.

### Contrast pairs

The build fails if a pair below drops under its threshold in either palette. Add a line here when a component introduces a new text and ground combination.

{{contrast ink paper 4.5 Body text and headings on the page}}
{{contrast muted paper 4.5 Secondary text and labels on the page}}
{{contrast muted cell 4.5 Secondary text inside an illustration window}}
{{contrast brand paper 4.5 Accent text and accent marks on the page}}
{{contrast on-brand brand 4.5 Button labels on the accent fill}}
{{contrast paper ink 4.5 Inverted labels, such as the Built chip}}

## Typography

Two families, self-hosted: Archivo and Geist Mono. The page makes no request to any other host.

{{scale step}}

- Headlines are Archivo 700 at 94% width, uppercase, with tracking of -0.03em and a line height of 1. Break them by meaning, not by width.
- Prose is Archivo 450 at the body size with a line height of 1.5. Keep lines under 70 characters.
- Labels are Geist Mono 500, uppercase, tracking 0.02em, never below the label size. A label names or counts something; it does not carry a sentence the reader must study.
- Numbers use tabular figures so columns and progress values align.

## Space and layout

{{scale space}}

- The sheet is the page. It has one 1px border inside a small margin. Rows are separated by a rule, and cells within a row by a rule.
- Cell padding is a fluid token, so cells breathe on wide screens and stay compact on phones.
- Below 860px, rows collapse to one column and the vertical rules between cells become horizontal ones. Nothing is hidden at that width except decoration and hints.
- Registration marks, the small crosses in a figure's corners, appear on one figure per page.

## Components

Each specimen is the markup the site uses. Copy it, then change the content, not the classes.

### Button

The primary action. One per cell. The label says what happens, and the arrow cell is separated by a dashed rule. On hover the ink fills in from below.

{{specimen button}}

### Relationship chips

A tool is either Built or Curated. Built is inverted ink on paper; Curated is outlined. The same two chips head a tool and define the labels in the legend.

{{specimen relationship}}

### Spec list

Facts about a thing, as label and value pairs under a dashed rule.

{{specimen spec}}

### Cell row

A row of cells divided by rules. The column proportions belong to the row; the cells never set their own width.

{{specimen cell-row}}

### Field notes

Detail the reader opts into. The plus cell becomes a minus when the notes are open.

{{specimen field-notes}}

### Illustration window

A labelled example of a tool, framed as a window. Illustrations are examples, never live data, and say so in their caption.

{{specimen window}}

## Motion

- The hero drawing's measuring line sweeps its length once on load, then rests at the jaw tip. That is the page's one orchestrated moment.
- The button fills with ink on hover, and the navigation cells brighten. Both answer the reader's pointer.
- Under `prefers-reduced-motion`, the sweep does not run, the line rests at its end position, and hover transitions are instant.

## Accessibility

- Every text and ground pair above meets 4.5:1 in both palettes. A vermilion that looks brighter fails on paper, which is why `--brand` is as deep as it is.
- Keyboard focus is a 2px ink outline offset 3px, drawn on every interactive element.
- Decorative drawings are hidden from assistive technology and carry a caption that says what they show. The drawing's text labels are dropped on narrow screens, where they would shrink below legibility, and the caption stays.
- The layout holds from a 390px phone to wide desktops with no horizontal scrolling.

## Adopting the system in a tool

1. Copy the `:root` block and the dark `prefers-color-scheme` block from `site/style.css`, then the two `@font-face` rules and the font files with their licences.
2. Build the interface from cells. If a tool needs a layout this document does not describe, draw it as cells and add the pattern here.
3. Draw state with the conventions above, and give every status a text label as well, since colour alone does not carry it.
4. Keep a tool's own accent out of it. The accent is vermilion everywhere.

## Changing the system

Change a token in `site/style.css`, then run the build. It rejects a palette that breaks a contrast pair above. When a component's classes change, update its specimen in `site/specimens`, which this page shows live and as source; a test checks that every class a specimen uses exists in the stylesheet. Update the principle or rule here in the same commit.
