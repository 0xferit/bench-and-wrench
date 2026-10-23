# Design system

The drawing-sheet design system keeps Ferit's Bench and Wrench and every tool in it looking like one family.

`site/style.css` is the only definition of the tokens. This document explains what they mean and how to use them. The website and the tool illustrations are the reference implementation, and the specimens below are the real components, not pictures of them. The proportions, tokens and interaction patterns follow the Heron AI website by Bearplus, which Ferit chose as the reference; no asset, font, image or copy was taken from it.

## Principles

- **Everything is a cell.** A page is one ruled sheet inside a fixed frame. Every module is a bordered cell, and cells in a row are separated by 1px rules. There are no cards, shadows or rounded corners.
- **One unit, scaled by the viewport.** Every length is in `rem`, and the root size is a share of the viewport width, so the whole sheet scales as one drawing. Never write a pixel length, except the 1px rule.
- **Measure, do not decorate.** Rules, ticks, indices and plus marks carry information: a tick is an interval, a bracketed index is a position in a sequence, a plus mark is a registered corner. If a mark carries nothing, leave it out.
- **Statements in grotesque, labels in mono.** Archivo sets headlines and prose. Geist Mono, always uppercase, sets labels, indices, status and buttons.
- **One accent.** Vermilion marks what to act on or what to look at. It is never decoration, and no screen carries more than a few uses.
- **Quiet motion.** Motion answers the reader's pointer, plus one orchestrated moment per page. Reduced motion shows the resting state.

## Colour

{{palette}}

- `--paper` is the page ground. A faint cloud grain sits behind the content, so cells stay transparent and let it show.
- `--cell` is a raised surface: the window inside an illustration.
- `--ink` is headings, rules that need weight, drawing lines and fills on hover.
- `--muted` is body copy. It is the ink at 72% opacity, so it adapts to whatever it sits on.
- `--rule` is the 1px divider between cells. It is a boundary, not text, so it is allowed a lower contrast than text.
- `--disabled` is bracketed indices and resting plus icons. It is decoration that repeats information already in the markup, so those marks are hidden from assistive technology.
- `--surface` is plus marks that appear on hover, `--granite` is labels, captions and footer headings, `--tick` is the ruler ticks, and `--crosshair` is the pointer crosshair over the hero drawing.
- `--brand` is the accent. `--on-brand` is the colour of text set on it, and `--on-ink` is the colour of text set on an ink fill.

Use tokens, never raw values. The dark palette redefines the same names, so a component written with tokens is already themed.

### Contrast pairs

The build fails if a pair below drops under its threshold in either palette. Add a line here when a component introduces a new text and ground combination.

{{contrast ink paper 4.5 Body text and headings on the page}}
{{contrast muted paper 4.5 Secondary text and body copy on the page}}
{{contrast muted cell 4.5 Body copy inside an illustration window}}
{{contrast granite paper 4.5 Labels, captions and footer headings}}
{{contrast brand paper 3 Accent marks, large type and graphics; accepted exception for small accent labels, see Accessibility}}
{{contrast on-brand brand 3 Button labels on the accent fill; accepted exception for small labels, see Accessibility}}
{{contrast on-ink ink 4.5 Inverted labels, hover fills and the Built chip}}

## Typography

Two families, self-hosted: Archivo and Geist Mono. The page makes no request to any other host.

{{scale step}}

- Headlines are Archivo uppercase with tracking of -0.02em and a line height of 1. The first level is weight 700, dropping to 600 at 991px and below, and the rest are 600. Break them by meaning, not by width.
- Headings take a size class and, where the layout changes, a tablet and a phone class, for example `h1 tb-h3 mb-h2`. The tablet class applies at 991px and below, the phone class at 767px and below. Without one, a third-level heading steps down by itself: to the h4 size on tablets and the h6 size on phones. Tablet classes run `tb-h3` to `tb-h6` and `tb-h20`; phone classes run `mb-h2` to `mb-h4` and `mb-h18`, the 1.8rem `--step-subhead`.
- Prose is Archivo 500 at the body size with a line height of 1.3. Keep lines under 70 characters. Body copy set on the page ground may drop to weight 400.
- Labels are Geist Mono 500, uppercase, with no tracking. A label names or counts something; it does not carry a sentence the reader must study. Micro labels shrink to 0.8rem on phones, and label-size mono tightens to a line height of 1.1 there. Body and label text that shrinks on phones takes `mb-txt-14` or `mb-txt-12`.
- Archivo stands in for Heron's commercial BT Grotesk. Kerning is off, as on the reference, and Archivo is set 3.5% wider for headings and 6% wider for text, which matches BT Grotesk's measured line widths within 0.5%.
- Every sans size tracks at -0.02em of its own size; mono labels keep no tracking. Lines wrap greedily, as on the reference.

## Space and layout

{{scale space}}

- The root size is 0.5787037037vw, which is 8.33px on a 1440px screen. At 991px and below it is 1.1990407674vw, and at 767px and below 2.5445292621vw. These three values are the only breakpoints.
- The page sits inside a fixed frame inset 0.8rem from the window, drawn by a 1px rule. Rows are separated by 1px rules, and cells within a row by 1px rules.
- Wide rows divide into quarters: a quarter, a half and a quarter, or four quarters. The first screen is one viewport: the fixed header, a ruler-framed drawing and a title row.
- The header is fixed. It hides when the reader scrolls down and returns when they scroll up. Below 991px its links collapse behind a Menu cell.
- A ruler frame has an inset of 1.2rem, 0.9rem tick spacing on every edge and a plus mark at each corner. It frames the one drawing a screen is about.
- Dashed rules repeat a 1.6rem pattern: a dot, a gap, a dash, a gap. They separate parts of a cell; solid rules separate cells.
- A rule drawn over a cell is a `.line` element: absolute, 1px, above the content and taking no layout space. It takes `line-h` or `line-v`, a side (`line-top`, `line-bottom`, `line-left`, `line-right`) and `line-solid` or `line-dash`; `line-ink` darkens a dash. Its parent must be positioned.

## Components

Each specimen is the markup the site uses. Copy it, then change the content, not the classes.

### Button

The primary action. One per cell. The label says what happens, and the arrow cell is separated by a dotted rule. On hover the ink dissolves in as a block of pixels, the label swaps upward and the arrow passes through.

{{specimen button}}

### Outline button

The secondary action. It has no arrow and a rule around it. On hover it dissolves to ink the same way.

{{specimen button-outline}}

### Cell button

An action that is a whole cell, such as the header's GitHub link or the first screen's See the tools. The label sits top left and the arrow bottom right. On hover the cell fills with the accent from below.

{{specimen cell-button}}

### Relationship chips

A tool is either Built or Curated. Built is inverted ink on paper; Curated is outlined. The same two chips head a tool and define the labels in the approach section.

{{specimen relationship}}

### Facts

Facts about a thing, as label and value pairs under dashed rules.

{{specimen facts}}

### Ruler frame

The frame around a drawing or an illustration. Place it as the first child of a positioned cell.

{{specimen ruler-frame}}

### Field notes

Detail the reader opts into. The plus becomes a minus when the notes are open, and a dashed rule draws under the row on hover.

{{specimen faq}}

### Illustration window

A labelled example of a tool, framed as a window. Illustrations are examples, never live data, and say so in their caption.

{{specimen window}}

## Motion

- The hero drawing's measuring line sweeps its length once on load, then rests at the jaw tip. That is the page's one orchestrated moment.
- Over the hero drawing a crosshair follows the pointer and reads its position in millimetres from the part's origin. The drawing carries its own origin and scale as data, so the reading cannot drift from the art.
- Header cells fill with ink from below on hover, the label swaps upward and a corner mark travels from the bottom right to the top right.
- Buttons dissolve to ink in 580ms over 20 steps. Cell buttons fill from below in 500ms with an ease-out curve.
- Under `prefers-reduced-motion`, the sweep does not run, the line rests at its end position, and hover transitions are instant.

## Accessibility

- Every text and ground pair above meets 4.5:1 in both palettes except the two accent pairs. The accent is Heron's exact vermilion, #fa3600. It measures 3.4:1 on paper and 3.8:1 under white text, which meets the 3:1 floor for graphics and large type but not 4.5:1 for small labels. The system keeps the exact value for fidelity, and the thresholds above say so. To meet 4.5:1 instead, darken `--brand` in one place and raise those two thresholds.
- Keyboard focus uses the browser's own focus ring, as the reference does. No rule removes or restyles it, so every interactive element shows it.
- Bracketed indices and ruler marks are hidden from assistive technology. Decorative drawings are hidden too and carry a caption that says what they show. The drawing's text labels are dropped on narrow screens, where they would shrink below legibility, and the caption stays.
- The mobile menu is a button with `aria-expanded`. Without scripting the links stay visible.
- The layout holds from a 390px phone to wide desktops with no horizontal scrolling.

## Adopting the system in a tool

1. Copy the `:root` block and the dark `prefers-color-scheme` block from `site/style.css`, the root size rules, then the two `@font-face` rules and the font files with their licences.
2. Build the interface from cells inside a frame. If a tool needs a layout this document does not describe, draw it as cells and add the pattern here.
3. Show state with solid, dashed and hatched fills, and give every status a text label as well, since colour alone does not carry it.
4. Keep a tool's own accent out of it. The accent is vermilion everywhere.

## Changing the system

Change a token in `site/style.css`, then run the build. It rejects a palette that breaks a contrast pair above. When a component's classes change, update its specimen in `site/specimens`, which this page shows live and as source; a test checks that every class a specimen uses exists in the stylesheet. Update the principle or rule here in the same commit.
