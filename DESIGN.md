# Design system

The drawing-sheet design system keeps Ferit's Bench and Wrench and every tool in it looking like one family.

`site/style.css` is the only definition of the tokens. This document explains what they mean and how to use them. The website and the tool illustrations are the reference implementation, and the specimens below are the real components, not pictures of them. The proportions, tokens and interaction patterns follow the Heron AI website by Bearplus, which Ferit chose as the reference; no asset, font, image or copy was taken from it.

## Principles

- **Everything is a cell.** A page is one ruled sheet inside a fixed frame. Every module is a bordered cell, and cells in a row are separated by 1px rules. There are no cards, shadows or rounded corners.
- **One unit, scaled by the viewport.** Every length is in `rem`, and the root size is a share of the viewport width, so the whole sheet scales as one drawing. Never write a pixel length, except the 1px rule.
- **Measure, do not decorate.** Rules, ticks, indices and plus marks carry information: a tick is an interval, a bracketed index is a position in a sequence, a plus mark is a registered corner. If a mark carries nothing, leave it out.
- **Statements in grotesque, labels in mono.** Archivo sets headlines and prose. Geist Mono, always uppercase, sets labels, indices, status and buttons.
- **One accent.** Vermilion marks what to act on or what to look at. It is never decoration, and no screen carries more than a few uses.
- **Quiet motion.** Motion answers the reader's pointer and the scroll, plus one orchestrated opening on the home page. Reduced motion shows the resting state.

## Colour

{{palette}}

- `--paper` is the page ground. A faint cloud grain sits behind the content, so cells stay transparent and let it show.
- `--cell` is a raised surface: the window inside an illustration.
- `--ink` is headings, rules that need weight, drawing lines and fills on hover.
- `--muted` is body copy. It is the ink at 72% opacity, so it adapts to whatever it sits on.
- `--rule` is the 1px divider between cells. It is a boundary, not text, so it is allowed a lower contrast than text.
- `--disabled` is bracketed indices, scroll cues and resting plus icons. It is decoration that repeats information already in the markup, so those marks are hidden from assistive technology.
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
- Headings take a size class and, where the layout changes, a tablet and a phone class, for example `h1 tb-h3 mb-h2`. The tablet class applies at 991px and below, the phone class at 767px and below. Without one, a third-level heading steps down by itself: to the h4 size on tablets and the h6 size on phones. Tablet classes run `tb-h2` to `tb-h6` and `tb-h20`; phone classes run `mb-h1`, the 4rem `--step-h3`, to `mb-h4` and `mb-h18`, the 1.8rem `--step-subhead`.
- Prose is Archivo 500 at the body size with a line height of 1.3. Keep lines under 70 characters. Body copy set on the page ground may drop to weight 400.
- Labels are Geist Mono 500, uppercase, with no tracking. A label names or counts something; it does not carry a sentence the reader must study. Micro labels shrink to 0.8rem on phones, and label-size mono tightens to a line height of 1.1 there. Body and label text that shrinks on phones takes `mb-txt-14` or `mb-txt-12`.
- Archivo stands in for Heron's commercial BT Grotesk. Kerning is off, as on the reference, and Archivo is set 3.5% wider for headings and 6% wider for text, which matches BT Grotesk's measured line widths within 0.5%.
- Every sans size tracks at -0.02em of its own size; mono labels keep no tracking. Lines wrap greedily, as on the reference.

## Space and layout

{{scale space}}

- The root size is 0.5787037037vw, which is 8.33px on a 1440px screen. At 991px and below it is 1.1990407674vw, and at 767px and below 2.5445292621vw. These three values are the only breakpoints.
- The page sits inside a fixed frame inset 0.8rem from the window, drawn by a 1px rule. Content scrolls under the frame: the margin outside the rule is repainted with paper and grain above everything but the skip link, so the sheet ends at the frame line. Rows are separated by 1px rules, and cells within a row by 1px rules.
- Wide rows divide into quarters: a quarter, a half and a quarter, or four quarters. The first screen is one viewport: the fixed header, a ruler-framed drawing and a title row. Below 992px it is at least one viewport and grows rather than squeezing the drawing: the drawing band keeps a 44.76rem floor on tablets, and on phones it never gets shorter than the drawing at full width. On tablets the title row splits into two equal cells.
- A section head puts its label over its title and sub. On tablets the title sits left, at most 37.2rem wide, and the sub sits right, at most 28.5rem, aligned to the title's last line; on phones they stack 2rem apart.
- The tools section is a stack of illustration cells in the middle column, one per tool at 72.17 by 42.6rem. On screens 992px and wider, each tool's index and title box (left) and its description and link box (right) are held at the window's middle while the illustrations scroll past, and only the boxes of the illustration crossing the middle line show. On tablets the illustration sits left of the title and text, and on phones it comes first, above a dashed rule. Without the script each tool is a row of three cells. The field notes follow the stack as one list.
- The entry parts section follows the tools: a head row on twelve columns, the Geist Mono label over the title at most 45rem wide in the first eight and, right of a rule, the sub over a bracketed scroll cue in `--disabled` in the last four, 16rem down. Below it, inside 12rem of padding, a rule runs down the middle line and a ruler edge with two plus marks runs down the left, and the four parts of an entry (solves, earns, helps, stops) stack 6.4rem apart, each a square drawing four columns wide, on the left and right in turn, with a part label in the opposite half: 50% less 4.3rem wide, 3.2rem in from the left edge or 4.2rem from the right. Each drawing sits on a faint grid inset 1.2rem with a plus mark at each corner. On screens 992px and wider, while the script runs, one accent rule 3.2rem in from both edges follows the pointer across the rows and the label of the row under it rides on that rule; without the script, under reduced motion and in print, every label shows, centred on its row on an accent rule of its own. On tablets the drawing takes half the row less 3.2rem on its outer side and the label the other half, its verb over its line, the ruler edge drops and the head splits into two equal cells; on phones the parts are a carousel that snaps one part per swipe, each drawing full width over its label, over a row of 2rem bars.
- The use cases follow the entry parts on twelve columns with a 2rem gutter, split down the middle line. The left half is a drawing panel at least one sheet tall, its drawing centred on a faint grid inset 1.2rem. On the right the Geist Mono label sits over the title, at most 64.7rem wide, 3.2rem down and 15.4rem in, and the list of cases stands at the panel's foot, one row per case, each 2.4rem by 3.2rem padded and 15.4rem in from the left, divided by dashed rules. On tablets the panel is 80rem tall above the title and the list, each full width; on phones the title comes first, over a 25.6rem panel and the list.
- The approach section is a row of label cells under a solid rule: a head with the label and its index over a dashed rule, a 36rem image box with the drawing, and a 25rem box with the title at the top and the definition at the bottom, under a dashed rule. Cells are divided by solid rules, two to a row on tablets. On phones they are a carousel that snaps one 31.4rem cell per swipe, over a row of 2rem bars, one per cell; the script inks the bar and the drawing of the cell in view.
- The statement row is twelve columns with a 2rem gutter, split down the middle line: a drawing on the left half and, on the right, the statement over the tool strip. It is as tall as the first screen, between 60.4rem and 86.7rem. Below 992px the drawing becomes a square beside the statement and the strip runs the full width; on phones the drawing, the statement and the strip stack. The strip is a label row with previous and next controls over a row of tool cells, 17.2 by 11.4rem (12 by 8.67rem on tablets, half the width by 6.4rem on phones), divided by dashed rules.
- The plan scene follows the statement: one ruler-framed cell holding the plan's two headings, centred and layered in the same place while the scene plays, and a drawing of the bench: a pegboard holding the two tool sheets, the spanner, a screwdriver and a rule, over a bench with a vise and a drawer, dimensioned and zoned A1 to C3. Its outline pieces are `--surface` at 1.5, the tools `--ink`, the hole grid `--rule`, the dimensions and Geist Mono labels `--granite`. Each paragraph of a tool's limits is a numbered accent square, 42 view-box units across, stacked down the right edge of that tool's sheet; a tool the drawing does not show stacks its limits on the bench front instead. While the scene plays the drawing fills the cell behind the headings, on phones above a 10rem margin, and a caption box sits 3.2rem in from the cell's bottom left corner. On screens 992px and wider its stage is one sheet tall (`--sheet-height`, the window less the frame on both edges) and stays at the frame line while the page scrolls through the section's seven viewports; below 992px the cell is five viewports tall and the stage stays inside it. Without the script, under reduced motion and in print the section is one static cell with its headings stacked over the complete drawing, every limit callout in a grid of 28rem columns below it, and the caption box below them listing every step, so nothing in it is reachable only by scrolling. The plan ends in a side panel: a Geist Mono label, a heading pushed to the panel's foot above a lede at most 43.1rem wide, and four items, each a line of text beside a square cell holding a 3.2rem line icon drawn in `--surface` at 1.5, every part ruled off from the next. On screens 992px and wider, while the scene plays, the panel stands at the stage's right edge, closed to no width; it is 55.65rem wide when open, and its content keeps that width while it opens. Below 992px, without the script, under reduced motion and in print the panel is a block under the drawing, with its label and heading in the left column and the items sharing the height of the right column; on phones it is one column, each icon cell 5.6rem square at its item's left.
- Every page closes with the same call to action, three rows on the footer's columns divided by dashed rules: a head row of drawing-sheet zone labels, the title, sub and button in the middle column, and a drawing in the middle column at a 1 to 0.543 ratio. On phones the side columns narrow to 6rem, the labels drop and the middle row runs the full width.
- The footer sits on the frame columns: the title over the colophon on the left, the link menu over the info cells in the middle and the mark on the right, with the colophon's rule level with the menu's. On tablets the title and colophon share the top row, the menu spans the width, and the info cells form a two by two grid beside the mark, the first spanning both rows. On phones the rows stack: the first menu column spans the width with its links in two columns over the other two, the first info cell spans the width over two half cells, and the bottom links split 0.8 : 1 : 0.8.
- Between the footer grid and the bottom links runs a 37.7rem ruler-framed band carrying the site title as a two-line wordmark. Both lines are set at one size in the font's own spacing, line height 1, and centred; from the first line's cap height to the second line's baseline the block is 24.4rem, the height of the reference's letters. On screens 992px and wider it is a construction drawing: an outline of the letters, cap-height and baseline guides in the rule colour running across the band, a short tick through each guide at both edges of every letter, and a centre cross on round letters. Below 992px it is solid, the block 10.8rem tall on tablets and 4.8rem at 0.8 opacity on phones.
- The header is fixed. On screens 992px and wider it hides once the reader scrolls down past five header heights, returns on any upward step, and hides again when scrolling settles there; a focused control inside it keeps it shown. Narrower screens never hide it, and any scroll closes the open menu. The Tools link carries a small corner mark and a dropdown listing each tool in the catalog, linked to its section; the other links have none. Below 991px its links collapse behind a Menu cell, where the tools sit as rows of their own under a tinted Tools row. Only the mark, the wordmark and the header's buttons take the pointer; the rest of the header lets it through to the page.
- A ruler frame has an inset of 1.2rem, 0.9rem tick spacing on every edge (0.675rem on phones) and a plus mark at each corner. It frames the one drawing a screen is about. Ticks and plus marks are 1px SVG masks filled with a token colour, so they keep a hairline weight at every size and theme.
- Dashed rules repeat a 1.6rem pattern: a dot, a gap, a dash, a gap. They separate parts of a cell; solid rules separate cells.
- A rule drawn over a cell is a `.line` element: absolute, 1px, above the content and taking no layout space. It takes `line-h` or `line-v`, a side (`line-top`, `line-bottom`, `line-left`, `line-right`) and `line-solid` or `line-dash`; `line-ink` darkens a dash. Its parent must be positioned.

## Components

Each specimen is the markup the site uses. Copy it, then change the content, not the classes.

Every button is one `.btn-fill` component. The base is an accent block that fills with ink; `btn-fill-outline` adds a rule around a transparent cell, `btn-fill-ghost` is a bare cell (the header links and the tool row's link), and `btn-fill-accent` is an accent label that fills with the accent. Its `.btn-fill-bg` layer carries the dissolve, and the script sizes it to square pixels that land on whole device pixels.

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

Detail the reader opts into, one list below the tool stack with one item per tool. The title is the h6 size, stepping to 2rem on tablets and 1.8rem on phones; the plus becomes a minus when the notes are open. Items are separated by dashed rules, and on hover the rule under an item turns ink, except under the last. The answer has no inner rules: each part is a mono label over its text.

{{specimen faq}}

### Use case

One case where a tool helps, taken from a bullet of its entry, as a row of an accordion: a bracketed number in `--disabled` that turns to the accent while the row is open or hovered, the case as the title at the h6 size with its tool's name under it in Geist Mono `--granite`, and the field notes' plus, which becomes a minus when the row opens. The open row adds one line naming the tool with a link to its entry, aligned with the title. Rows take the field notes' rules, and on hover the plus turns ink.

{{specimen use-case}}

### Illustration window

A labelled example of a tool, framed as a window. Illustrations are examples, never live data, and say so in their caption. In the light scheme an illustration multiplies onto the paper, so its `--cell` window reads as tinted paper rather than a brighter patch.

{{specimen window}}

### Caption box

A narrated sequence beside a drawing: a 28rem box under a 1px rule, with an inverted mono head over an ordered list of steps, each one sentence at the label size. The last step is a bracketed prompt in `--granite`. Inside a scroll scene the steps share one place and the box shows one at a time: it fades in over 400ms and casts a hard ink shadow 0.8rem down, the steps cross-fade over 400ms, the box eases to the height of the step in view over 400ms, and every step but the last ends in a bracketed scroll cue in `--disabled`, hidden from assistive technology. Outside a scene, as here, every step shows in order and the scroll cues and the closing prompt are dropped.

{{specimen caption-box}}

### Part label

One part of an entry, named on an ink bar: the verb as an h6 in `--on-ink`, at least 20rem wide, then its line at the body size in `--on-ink` at 0.72 opacity, and a 0.8rem accent square at the right end, with 1.6rem by 2.4rem of padding. Beside a row it reaches 1rem past its half, over the middle rule. On tablets and phones the line wraps under the verb and the square moves to the top right corner, 2.2rem down and 2rem in.

{{specimen part-label}}

### Limit callout

One limit of a tool, taken from a paragraph of its limits: an accent mono label naming the tool and the limit's number, the first sentence as the title at the body size, and the rest of the paragraph in `--muted` at the label size, with a mono link to the tool's entry. It sits on paper inside a 1px accent rule with 1.2rem of padding, 0.8rem on phones. Beside a drawing it belongs to a numbered marker: it opens 1.2rem to the right of the marker, level with its top, 23.5rem wide; selected, it widens to 30.4rem and its text slides down. On phones it sits at the bottom centre of the drawing, 33.1rem wide, with its text always shown. Outside a drawing, as here, it shows in full.

{{specimen limit-callout}}

## Motion

- Moving between pages closes the old page onto its centre over 800ms on `--ease-in-quad`, then opens the new one from the centre over 800ms on `--ease-out-quad`, in browsers that support cross-document view transitions. Opening any other page straight from outside the site first traces the mark in outline over 800ms, its stroke turning from `--rule` to the accent, then opens the page from the centre the same way.
- With a mouse or trackpad, the page glides to each wheel step instead of jumping: every 60Hz frame it closes 10% of the remaining distance and settles within half a pixel, in about a second. Horizontal and pinch gestures, scrolls inside a scrollable cell and touch keep the browser's own scrolling. A link to a place on the same page glides there over one second on an exponential ease-out, then focuses the target.
- Content reveals once as it scrolls in, when a set share of its block has risen past the window's bottom edge: 65% of a section head, 55% of the strip, the approach cells, the field notes and each footer block, 45% of the statement and the illustrations, and 40% of a tool's text boxes, the call to action and, on its own, the call to action's drawing row. On phones that drawing has no reveal. Text lines rise out of a mask over 800ms on `--ease-out-cubic`, 0.02s apart; a block with inline markup rises as one line. Buttons, facts and notes rise 3.2rem and fade in over 1s on `--ease-out-quart`. Drawings scale down from 1.25 and fade in over 1.6s on `--ease-out-expo`, clipped to their cell; the tools' illustrations have no reveal of their own, since they ink in with the scroll. Rules draw from their start over 1.2s at a constant speed. Each element returns to its plain markup when its reveal ends.
- The home page opens on a drawing sheet: the hero drawing traces itself stroke by stroke, each stroke drawing over 1.3s on `--ease-out-quad` with their starts spread over 3s, while an accent line and its counter run from 0 to 60% in 3s on an ease-out cubic and on to 100% in 2.5s on an ease-out quartic. Its measuring line sweeps its length once, then rests at the jaw tip. At 100% the sheet's title and drawing facts fade, the line splits into two that open onto the drawing cell's top and bottom edges over 800ms, turning to `--rule`, and the header fades in over 1s. At 7.2s the sheet is gone and the first screen enters: the title rises word by word out of its lines over 800ms, 0.02s apart, the ruler fades in over 0.7s, the rules draw and the sub and the tool row rise. It plays on every load of the home page; any key press skips to the end, and the page cannot scroll until it ends.
- With a mouse on screens 992px and wider, an 8px accent square follows the pointer on a full-window canvas above the page, closing 18% of the remaining distance each 60Hz frame, and trails a 1px accent line that fades over 400ms. The system cursor stays. Over the hero drawing the square gives way to the crosshair, and it disappears when the pointer leaves the window.
- Over the hero drawing a crosshair follows the pointer, closing 30% of the remaining distance each 60Hz frame, and reads its position in millimetres from the part's origin on two lines below and left of the pointer. Its lines are `--crosshair` at 0.2 opacity, difference-blended so they read on paper in either theme, and it fades in and out over 250ms. The drawing carries its own origin and scale as data, so the reading cannot drift from the art.
- Hovering a quadrant of the hero drawing with a mouse, on screens 992px and wider, shows construction guides: dashed lines at 0.64 opacity through the drawing's own feature lines (ring extents, hex flats, shaft ends, jaw and centre lines), and accent bars along the hovered side and edge spanning the part's extent. The horizontal guides run from the hovered side to the pointer. They fade over 400ms. The drawing declares its feature lines and extent as data next to its origin and scale, so the guides cannot drift from the art.
- The hero's row of tool names scrolls left as a marquee at 40px a second at every width. The script repeats the names until they cover the row and hides the repeats from assistive technology; without it the row stands still.
- Scroll scenes tie motion to the scroll position instead of to time. A scene starts and ends where an edge of its block (top, centre, bottom or a share of its height) meets an edge of the window, each shifted by pixels or by a share of the block or the window, and its progress follows the scroll with no smoothing beyond the page's glide. Within a scene, each track takes 0.5 of the timeline on a power1 ease-out unless it states otherwise, starts after or with the track before it, and can stagger across its parts in order or at random. A scene whose edges differ between phones and wider screens switches them as the window crosses the width. A block that only needs to start once starts the first time the scroll passes its start, even when the page opens below it. Printing shows every scene finished.
- The statement inks in with the scroll, one character after another, from `--rule` to `--ink`. The scrub starts when the title's centre is 10% of a viewport below the window and ends when it is 40% from the top; each character takes 0.5 of the timeline on the power1 ease-out, 0.03 after the one before it. The heading keeps its full text as its accessible name, and the split characters are hidden from assistive technology.
- The statement's drawing inks in as it scrolls up: a hatched, filled copy of the line drawing is revealed from the top down behind a curved edge roughened by a turbulence displacement filter, drawn as on the reference in a space 1000 units wide. The edge starts when the drawing's top is 35% down the window and reaches the bottom once the drawing has moved its own height less a fifth of the window further. Without the script only the line drawing shows.
- The call to action's drawing inks in the same way on screens 768px and wider: the edge starts when the drawing's top is 75% down the window and reaches the bottom when its bottom is 25% down. As on the reference, a window short for its width reaches the end of the page first and leaves the drawing partly inked, about three quarters at 992 by 900. On phones it is inked from the start; without the script only the line drawing shows.
- On screens 992px and wider each tool's illustration inks in the same way over a pencil sketch of itself: the same illustration with every fill dropped and its lines and text in `--surface`. The finished illustration is revealed from the top down while the cell's top rises from the window's middle to its own height above it, under the reference's ragged edge drawn in a 1000-unit wide space. Focusing a control inside the illustration hides the sketch. Below 992px and without the script the illustrations are finished from the start.
- Hovering an approach cell, on screens 992px and wider, inks its drawing and redraws its four strokes along their length over 800ms on `--ease-draw`, 0.08s apart, scales in plus marks at the image box's corners, fades in a drawing grid behind the image and text, and shows an accent square that pushes the label 2rem right, all over 400ms. On tablets the drawings are ink at rest.
- On screens 992px and wider a ragged ink blot follows the mouse over the footer band and reveals the solid wordmark under the outline. Its radius is 0.45 of the band's height, it grows in 550ms and shrinks in 800ms after the pointer leaves, and it closes 9% of the gap to the pointer each frame. A fainter blot at 0.2 opacity and 1.05 times the radius closes 15% each frame, so a grey fringe runs ahead of a fast pointer. The edge is a rougher, finer variant of the statement drawing's turbulence, scaled to the band's width.
- The footer's mark rests in ink alone, its slash included. On screens 992px and wider each part of it (the field, the two counters, the slash) fades to the accent over 500ms on `--ease-out` while the pointer is on it.
- Field notes are exclusive: opening one closes the open one, and both slide over 400ms on `--ease-swing`. Without the script the notes still open one at a time, without the slide.
- The plan scene slides in under the statement on screens 992px and wider: while the section's top rises from the window's bottom to its top, the stage's contents hold still at the frame line and the cell's edge uncovers them. Its main scrub starts when the section's top reaches the window's middle and ends when its bottom is 30% of a viewport above the window's bottom, or on phones 180% of a viewport above the window's top. Within the scrub the two headings take turns at the centre on a 5.52 timeline, each step 0.5 on the power1 ease-out: the first shows as soon as the scrub starts and settles 0.3rem up into place, holds for 0.5, then fades out rising 0.3rem and shrinking to 0.96; the second then fades in from 0.3rem below at 1.04, holds and leaves the same way, ending at 3. As it leaves, from 2.5, the drawing builds up: its outline layer fades in while the thirteen outline pieces fly in from beyond the window, each from its own side, scaling from 1.1 to 1 about their top left corners and fading in over 0.5, their starts shuffled across 0.02 on every load. Then the hole grid, the tools, the tool sheets, the dimensions and the limit marks fade in one after another, 0.5 each, ending at 5.52. The limit marks take the pointer from the moment their layer starts fading in, at 5.02. Hovering or focusing one fades in its callout and tints its tool's sheet with the accent at 0.24 opacity, both over 400ms; selecting it with a click, Enter or Space hides its square behind a small accent dot, widens the callout over 400ms and slides its text down over 400ms on `--ease-swing`. One limit is open at a time: selecting another closes the first, and a click anywhere but a marker, Escape or the scroll crossing either end of the limit layer's fade closes it. Focusing a mark before its layer has begun scrolls the page to the end of the scrub, so a keyboard never lands on a hidden mark. Both stay readable to assistive technology throughout, since they only fade. The caption box narrates the build-up: it fades in as soon as the outline layer starts, at 2.5, and shows its first step until the tools start, at 3.52; from there each layer shows the next step from its start until the next layer starts, so the last step shows from 5.02 to the end. Scrolling back shows the same step at the same place, and the box fades out once the scroll is back above 2.5. At the end the scene is marked expanded and the side panel opens over 400ms on the default ease, pushing the drawing left; scrolling back into the scene closes it. 200ms after it first opens, the panel's content reveals once, 0.05s apart in reading order: the label, the heading and the lede rise word by word, then each item's icon cell scales down from 1.25 and its text rises. On phones the panel is open from the start and shows without a reveal.
- In the entry parts section, on screens 992px and wider, the accent rule follows the pointer's height while the section's rows are in the window, closing 20% of the remaining distance each 60Hz frame until it settles within 0.1px, and only the label of the row under the pointer shows, centred on the rule; it fades in and out over 100ms, and between rows none shows. With no mouse in the window (touch, a keyboard, a pointer that has not moved yet or has left) the rule rests at the window's middle, so scrolling alone brings each row's label up in turn. The rule shows while the section's rows are in the window and hides once they leave. The head reveals word by word once 65% of it has risen into the window, 0.1s apart in reading order, and each drawing scales down from 1.25 once 45% of it has; on phones both are settled at load. The drawings loop every 5 seconds: an accent marker pulses, its callout opens from the top right corner and closes again, 0, 0.4 and 0.8s apart across the callouts; the limit points on the jaw pop in 0.06s apart and their dashed links fade in 0.03s apart while the dashes march; and the running row of the plan sheet spins, ticks and flashes its border in the accent while a card of three loading dots rises and falls.
- The use cases reveal once in three parts. When 35% of the drawing panel has risen into the window, its drawing scales down from 1.25 and fades in over 1.8s after 0.15s, on the slow ease-out measured from the reference, whose own 400ms cross-fade drags its scale reveal. When 40% of the title cell has, the label and the title rise word by word, 0.1s apart. When 65% of the list has, the first row's top rule draws over 1.2s and every row's number, title and plus rise in reading order, 0.03s apart, with the first row's open line after its plus. Selecting a case with a click, Enter or Space opens it and closes the open one, both sliding over 400ms on `--ease-swing`, while its drawing cross-fades in over 400ms, settling from 1.04; selecting the open case closes it and keeps its drawing. Each case's drawing is its tool's, with the part the case is about drawn in the accent. The first case is open with its drawing showing from the start, and on phones the section shows without the reveal.
- The tool boxes cross-fade over 400ms when the next illustration crosses the window's middle line. Focusing a link in a hidden box scrolls its illustration to the middle, so a keyboard reaches every link with its box in view.
- When the tools overflow the strip, it loops: every 3 seconds it steps three cells on screens 992px and wider and one cell below, over 600ms, and the controls step the same way. It pauses while the pointer or focus is inside it, and the script repeats the cells for the loop and hides the repeats from assistive technology. While every tool fits, the controls are disabled. The cells themselves have no hover state.
- Once the page scrolls past the header, the wordmark slides under the mark on screens 768px and wider. Hovering the mark, or focusing the link, slides it back in 400ms.
- Header links dissolve to ink on hover and the label swaps upward. On screens 992px and wider, hovering or focusing the Tools link opens its dropdown under the cell: a 26.4rem ruled panel that fades in as its rows unfold, both over 400ms, while the corner mark moves from the bottom right corner to the top right in 500ms with `--ease-out`. The dropdown's links dissolve like header links. The current page's link keeps its muted label, takes no pointer and carries a small ink square at its right edge. In the footer the current page's link is the accent, and footer links fade to the accent on hover.
- Every button dissolves in as square pixels on a 24 by 6 grid: 20 steps over 580ms, timed from the frame the pointer arrives in, while the label swaps upward and the arrow passes through in 480ms. On leave the label snaps back and, once the fill has finished, the resting colour dissolves back over it the same way.
- Hover effects run only on hover-capable screens 992px and wider. Below that, a hover only darkens an outline button's rule and dims the accent button's label to `--muted`, and touch screens show no hover state at all.
- Under `prefers-reduced-motion`, the sweep does not run, the line rests at its end position, the marquee and the tool strip stand still, every scroll scene shows its end state and the plan scene is one static cell with both headings, the complete drawing, every limit callout, every caption step and the open side panel showing, the entry parts show every label on its row and every drawing at rest with its callouts open, the use cases swap drawings without the cross-fade, so the statement, its drawing, the tools' illustrations and the call to action's drawing are inked from the start, the crosshair snaps to the pointer, the footer's ink blot appears and follows without easing, the accent square does not follow it, field notes open without the slide, the home page opens without its drawing sheet, pages swap without the transition or the traced mark, wheel steps and same-page links jump, content shows without its scroll reveal, and approach drawings ink without redrawing. Small hover and state motion stays, as on the reference: the buttons' dissolve and label swap, the header's slide and the menu's clip.

## Accessibility

- Every text and ground pair above meets 4.5:1 in both palettes except the two accent pairs. The accent is Heron's exact vermilion, #fa3600. It measures 3.4:1 on paper and 3.8:1 under white text, which meets the 3:1 floor for graphics and large type but not 4.5:1 for small labels. The system keeps the exact value for fidelity, and the thresholds above say so. To meet 4.5:1 instead, darken `--brand` in one place and raise those two thresholds.
- Keyboard focus uses the browser's own focus ring, as the reference does. No rule removes or restyles it, so every interactive element shows it.
- Bracketed indices and ruler marks are hidden from assistive technology. Decorative drawings are hidden too; the meaning always lives in text beside them, never only in the drawing. The drawing's text labels are dropped on narrow screens, where they would shrink below legibility, and the caption stays.
- The mobile menu is a button with `aria-expanded`. Without scripting the links stay visible.
- Each limit mark on the plan is a button with `aria-expanded`, named by its callout's label and title and controlling that callout. The square and its number are part of the drawing and hidden from assistive technology with it. Without the script and under reduced motion the buttons are dropped and the callouts are a plain list.
- Each entry part's label is an h3 with its line as text in the markup, so every part is read in order whichever label the pointer shows. The drawings are hidden from assistive technology.
- Each use case is a native `details` whose summary holds its title and its tool's name, so it opens by keyboard and without the script, one at a time. The number and the drawing panel are hidden from assistive technology; the link to the tool's entry is in the open text.
- The Tools dropdown opens while focus is inside it as well as on hover, so Tab reaches its links in order; Escape closes it and returns focus to Tools. A closed dropdown's links are hidden, so they take no focus. It needs no script to open.
- The layout holds from a 390px phone to wide desktops with no horizontal scrolling.

## Adopting the system in a tool

1. Copy the `:root` block and the dark `prefers-color-scheme` block from `site/style.css`, the root size rules, then the two `@font-face` rules and the font files with their licences.
2. Build the interface from cells inside a frame. If a tool needs a layout this document does not describe, draw it as cells and add the pattern here.
3. Show state with solid, dashed and hatched fills, and give every status a text label as well, since colour alone does not carry it.
4. Keep a tool's own accent out of it. The accent is vermilion everywhere.

## Changing the system

Change a token in `site/style.css`, then run the build. It rejects a palette that breaks a contrast pair above. When a component's classes change, update its specimen in `site/specimens`, which this page shows live and as source; a test checks that every class a specimen uses exists in the stylesheet. Update the principle or rule here in the same commit.
