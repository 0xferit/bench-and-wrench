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
- The page sits inside a fixed frame inset 0.8rem from the window, drawn by a 1px rule. Content scrolls under the frame: the margin outside the rule is repainted with paper and grain above everything but the skip link, so the sheet ends at the frame line. Rows are separated by 1px rules, and cells within a row by 1px rules.
- Wide rows divide into quarters: a quarter, a half and a quarter, or four quarters. The first screen is one viewport: the fixed header, a ruler-framed drawing and a title row.
- The header is fixed. On screens 992px and wider it hides once the reader scrolls down past five header heights, returns on any upward step, and hides again when scrolling settles there; a focused control inside it keeps it shown. Narrower screens never hide it, and any scroll closes the open menu. Below 991px its links collapse behind a Menu cell. Only the mark, the wordmark and the header's buttons take the pointer; the rest of the header lets it through to the page.
- A ruler frame has an inset of 1.2rem, 0.9rem tick spacing on every edge (0.675rem on phones) and a plus mark at each corner. It frames the one drawing a screen is about. Ticks and plus marks are 1px SVG masks filled with a token colour, so they keep a hairline weight at every size and theme.
- Dashed rules repeat a 1.6rem pattern: a dot, a gap, a dash, a gap. They separate parts of a cell; solid rules separate cells.
- A rule drawn over a cell is a `.line` element: absolute, 1px, above the content and taking no layout space. It takes `line-h` or `line-v`, a side (`line-top`, `line-bottom`, `line-left`, `line-right`) and `line-solid` or `line-dash`; `line-ink` darkens a dash. Its parent must be positioned.

## Components

Each specimen is the markup the site uses. Copy it, then change the content, not the classes.

Every button is one `.btn-fill` component. The base is an accent block that fills with ink; `btn-fill-outline` adds a rule around a transparent cell, `btn-fill-ghost` is a bare cell (the header links and the tool row's link), and `btn-fill-accent` is an accent label that fills with the accent. Its `.btn-fill-bg` layer carries the dissolve, and the script sizes it to whole square pixels.

### Button

The primary action. One per cell. The label says what happens, and the arrow cell is separated by a dotted rule. On hover the ink dissolves in as a block of pixels, the label swaps upward and the arrow passes through. The arrow is a 1.5-unit stroke on a 20-unit grid, 2rem square and 1.6rem on phones; the phone menu's GitHub cell uses a filled arrow instead, as it has no hover.

{{specimen button}}

### Outline button

The secondary action: a rule around a transparent cell, and the same arrow cell behind a dotted rule in the rule colour. On hover it dissolves to ink the same way and the rule darkens.

{{specimen button-outline}}

### Cell button

An action that is a whole cell, such as the header's GitHub link or the first screen's See the tools. The label sits top left and the arrow bottom right. On hover the accent dissolves in and the label turns white.

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
- Once the page scrolls past the header, the wordmark slides under the mark on screens 768px and wider. Hovering the mark, or focusing the link, slides it back in 400ms.
- Header links dissolve to ink on hover and the label swaps upward. The current page's link keeps its muted label, takes no pointer and carries a small ink square at its right edge.
- Every button dissolves in as square pixels on a 24 by 6 grid: 20 steps over 580ms, while the label swaps upward and the arrow passes through in 480ms. On leave the label snaps back and, once the fill has finished, the resting colour dissolves back over it the same way.
- Hover effects run only on hover-capable screens 992px and wider. Below that, a hover only darkens an outline button's rule and dims the accent button's label to `--muted`, and touch screens show no hover state at all.
- Under `prefers-reduced-motion`, the sweep does not run, the line rests at its end position, and the header and label transitions are instant.

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
