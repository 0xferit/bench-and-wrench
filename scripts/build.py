"""Build the static website from the repository's Markdown catalog."""

import html
from pathlib import Path
import re
import shutil
import sys
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
INLINE_TOKEN = re.compile(r"\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`")
CATALOG_LINK = re.compile(r"^- \[([^\]]+)\]\((tools/[a-z0-9-]+\.md)\):", re.MULTILINE)
SECTION_HEADING = re.compile(r"^## (.+)$", re.MULTILINE)
LIGHT_PALETTE = re.compile(r":root\s*\{([^}]*)\}")
DARK_PALETTE = re.compile(r"@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([^}]*)\}")
COLOR_TOKEN = re.compile(r"--([a-z-]+):\s*(#[0-9a-fA-F]+);")
ROOT_TOKEN = re.compile(r"--([a-z0-9-]+):\s*([^;]+);")
DIRECTIVE = re.compile(r"\{\{(.+)\}\}")
SPECIMEN_NAME = re.compile(r"[a-z][a-z0-9-]*")
REPOSITORY_URL = "https://github.com/0xferit/bench-and-wrench"
PROFILE_URL = "https://github.com/0xferit"
ARROW_ICON = '<svg class="arrow" viewBox="0 0 20 20" aria-hidden="true"><path d="M2.5 10H16.25M11.85 5.6L16.25 10L11.85 14.4"/></svg>'
WORK_ICON = '<svg class="home-hero-work-ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 2.5h6L14 8l-3 5.5H5L2 8Z"/><circle cx="8" cy="8" r="2.25"/></svg>'
ARROW_SOLID_ICON = '<svg class="arrow-solid" viewBox="0 0 20 20" aria-hidden="true"><path d="M2 9.13H14.14L11.23 6.22 12.47 4.98 17.49 10 12.47 15.02 11.23 13.78 14.14 10.88H2Z"/></svg>'
SPANNER_PATHS = (
    '<circle cx="36" cy="50" r="26" pathLength="1"/>'
    '<path d="M36 38l10.4 6v12L36 62l-10.4-6V44z" pathLength="1"/><path d="M60 41l82 1M60 59l82-1" pathLength="1"/>'
    '<path d="M187 38H164v24h23A26 26 0 1 1 187 38z" pathLength="1"/>'
)
SPANNER_VIEW = 'viewBox="0 0 204 100"'
SPANNER_GLYPH = f'<svg {SPANNER_VIEW} aria-hidden="true">{SPANNER_PATHS}</svg>'
STATEMENT_DRAWING_FRAME = f'{SPANNER_VIEW} x="20%" width="60%" height="100%"'
STATEMENT_DRAWING = (
    '<svg class="statement-drawing" aria-hidden="true"><defs>'
    '<pattern id="statement-hatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path class="statement-hatch" d="M1.5 0V3"/></pattern>'
    '<mask id="statement-ink" maskUnits="userSpaceOnUse"><path class="statement-ink-edge" fill="#fff" filter="url(#ink-ragged)"/></mask></defs>'
    f'<svg {STATEMENT_DRAWING_FRAME}>{SPANNER_PATHS}</svg>'
    f'<g mask="url(#statement-ink)"><svg {STATEMENT_DRAWING_FRAME} fill="url(#statement-hatch)">{SPANNER_PATHS}<path d="M60 41l82 1v16l-82 1z" stroke="none"/></svg></g></svg>'
)
RULER_FRAME = (
    '<div class="ruler" aria-hidden="true"><i class="ruler-edge ruler-top"></i><i class="ruler-edge ruler-bottom"></i><i class="ruler-edge ruler-left"></i>'
    '<i class="ruler-edge ruler-right"></i><i class="plus top left"></i><i class="plus top right"></i><i class="plus bot left"></i><i class="plus bot right"></i></div>'
)
BAND_GUIDES = "".join(f'<rect class="band-guide band-guide-{edge}"/>' for edge in ("cap", "base", "cap-next", "base-next"))
BAND_INK_FILTER = (
    '<filter id="band-ragged" x="-25%" y="-25%" width="150%" height="150%"><feTurbulence type="fractalNoise" numOctaves="3" seed="5" result="noise"/>'
    '<feDisplacementMap in="SourceGraphic" in2="noise" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur/>'
    '<feComponentTransfer><feFuncA type="linear" slope="5" intercept="-2.15"/></feComponentTransfer></filter>'
)
BAND_BLOTS = '<circle class="band-blot" r="0" fill="#fff" filter="url(#band-ragged)"/><circle class="band-blot" r="0" opacity="0" fill="#fff" filter="url(#band-ragged)"/>'
PLAN_CAPTIONS = (
    "Development work hides in long message threads and flat issue lists, where progress and purpose are hard to read.",
    "Most of the effort goes to piecing that picture back together, the same way, every time.",
    "Each tool here puts one picture back in view: a plan as a timeline, an issue inside its project.",
    "No tool fits every job. Each one is marked where it stops, so you know before you reach for it.",
)
SCROLL_CUE = "[Scroll to continue]"
PLAN_CAPTION_PROMPT = "[Select a limit]"
PLAN_LIMIT_ZONE = re.compile(r'<rect class="(?:[a-z-]+ )?bench-plan-limit-zone" id="([a-z0-9-]+)" data-tool="([a-z0-9-]*)" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/>')
PLAN_VIEW_BOX = re.compile(r'viewBox="0 0 ([\d.]+) ([\d.]+)"')
SENTENCE_END = re.compile(r"(?<=[.!?])\s+(?=[A-Z])")
PLAN_LIMIT_MARK = 42
PLAN_LIMIT_GAP = 21
PLAN_LIMIT_DOT = 9
PLAN_LIMIT_DOT_CORE = 7
PLAN_LIMITS_LABEL = "Limits marked on the plan"
PLAN_LIMIT_LINK = "See the {} entry"
REASON_HEADING = "Why it earns a place"
USE_HEADING = "When it is useful"
LIMITS_HEADING = "Limits to understand"
ENTRY_PARTS = (
    ("Solves", "The problem it meets, in a paragraph", None),
    ("Earns", "Why it has a place on the bench", REASON_HEADING),
    ("Helps", "When reaching for it pays off", USE_HEADING),
    ("Stops", "Where it ends, stated before you install", LIMITS_HEADING),
)
ENTRY_SECTIONS = tuple(heading for *_, heading in ENTRY_PARTS if heading)
PLUS_CORNERS = ("top left", "top right", "bot left", "bot right")
USE_CASE_SUB = "Reach for {}. Its entry says what it solves and where it stops."
USE_CASE_FOCUS = 'class="usecase-focus"'
USE_CASE_FOCUSED = 'class="usecase-focus is-focus"'
USE_CASE_FALLBACK = f'<svg class="usecase-art" {SPANNER_VIEW} aria-hidden="true">{SPANNER_PATHS}</svg>'
DESIGN_SOURCE = "DESIGN.md"
DESIGN_PAGE = "design-system.html"


def _inline(text):
    parts = []
    cursor = 0
    for match in INLINE_TOKEN.finditer(text):
        parts.append(html.escape(text[cursor:match.start()]))
        label, target, strong, code = match.groups()
        if target is not None:
            parsed = urlsplit(target)
            if parsed.scheme not in ("", "https", "http") or (parsed.netloc and not parsed.scheme):
                raise ValueError(f"Unsupported link: {target}")
            parts.append(f'<a href="{html.escape(target, quote=True)}">{html.escape(label)}</a>')
        elif strong is not None:
            parts.append(f"<strong>{html.escape(strong)}</strong>")
        else:
            parts.append(f"<code>{html.escape(code)}</code>")
        cursor = match.end()
    parts.append(html.escape(text[cursor:]))
    return "".join(parts)


def _blocks(text):
    blocks = []
    for chunk in re.split(r"\n\s*\n", text.strip()):
        lines = chunk.splitlines()
        if not lines:
            continue
        if all(line.startswith("- ") for line in lines):
            blocks.append(("ul", [line[2:] for line in lines]))
        elif all(re.match(r"\d+\. ", line) for line in lines):
            blocks.append(("ol", [re.sub(r"^\d+\. ", "", line) for line in lines]))
        elif chunk.startswith("# "):
            blocks.append(("title", chunk[2:].strip()))
        elif chunk.startswith("### "):
            blocks.append(("subtitle", chunk[4:].strip()))
        elif all(DIRECTIVE.fullmatch(line) for line in lines):
            blocks.append(("directives", [DIRECTIVE.fullmatch(line).group(1) for line in lines]))
        else:
            blocks.append(("p", " ".join(line.strip() for line in lines)))
    return blocks


def _render(blocks):
    output = []
    for kind, value in blocks:
        if kind == "p":
            output.append(f"<p>{_inline(value)}</p>")
        elif kind == "ul":
            output.append("<ul>" + "".join(f"<li>{_inline(item)}</li>" for item in value) + "</ul>")
        elif kind == "ol":
            output.append("<ol>" + "".join(f"<li>{_inline(item)}</li>" for item in value) + "</ol>")
        elif kind == "subtitle":
            output.append(f"<h3>{html.escape(value)}</h3>")
        elif kind == "directives":
            raise ValueError(f"Directives belong in {DESIGN_SOURCE}: {{{{{value[0]}}}}}")
    return "\n".join(output)


def _sections(text):
    pieces = SECTION_HEADING.split(text)
    return pieces[0], {pieces[index]: _blocks(pieces[index + 1]) for index in range(1, len(pieces), 2)}


def _first_paragraph(blocks):
    return next((value for kind, value in blocks if kind == "p"), "")


def _swap_label(text):
    escaped = html.escape(text)
    return f'<span class="btn-fill-label swap txt-mono txt-14"><span>{escaped}</span><span aria-hidden="true">{escaped}</span></span>'


def _tool_exhibit(root, path, position):
    source = (root / path).read_text()
    opening, sections = _sections(source)
    opening_blocks = _blocks(opening)
    title = next(value for kind, value in opening_blocks if kind == "title")
    paragraphs = [value for kind, value in opening_blocks if kind == "p"]
    relationship = paragraphs[0]
    relation_match = re.search(r"\*\*Relationship: ([^.]+)\.\*\*", relationship)
    if relation_match is None:
        raise ValueError(f"Missing relationship in {path}")
    relation = relation_match.group(1)
    intro = _render([(kind, value) for kind, value in opening_blocks if kind == "p" and value != relationship])
    missing = [heading for heading in ENTRY_SECTIONS if heading not in sections]
    if not intro:
        missing.insert(0, "an opening paragraph")
    if missing:
        raise ValueError(f"{path} is missing {', '.join(missing)}")
    reason = _first_paragraph(sections[REASON_HEADING])
    uses = [item for kind, value in sections[USE_HEADING] if kind == "ul" for item in value]
    limits = [value for kind, value in sections[LIMITS_HEADING] if kind == "p"]
    caveat = limits[0] if limits else ""
    last_heading = next(reversed(sections))
    links = INLINE_TOKEN.findall(_markdown_text(sections[last_heading]))
    primary = next(((label, target) for label, target, _, _ in links if target), None)
    if primary is None:
        raise ValueError(f"Missing primary link in {path}")
    _inline(f"[{primary[0]}]({primary[1]})")
    action = ("Get " if last_heading == "Get it" else "Open ") + title
    slug = Path(path).stem
    illustration_path = root / "site/illustrations" / f"{slug}.html"
    illustration = illustration_path.read_text() if illustration_path.exists() else (
        f'<div class="tool-illustration plain-illustration"><strong>{html.escape(title)}</strong></div>'
    )
    notes = [f'<section class="faq-section"><h4>About this entry</h4><p>{_inline(relationship)}</p></section>']
    for heading, blocks in sections.items():
        remaining = blocks[1:] if heading in (REASON_HEADING, LIMITS_HEADING) else blocks
        if remaining:
            notes.append(f'<section class="faq-section"><h4>{html.escape(heading)}</h4>{_render(remaining)}</section>')
    info_state = " active" if position == 1 else ""
    row = f'''
<article class="tool" style="--i: {position}">
  <div class="tool-row-info{info_state}" data-tool="{slug}">
    <div class="tool-row-left"><i class="line line-h line-top line-solid"></i><span class="txt-mono txt-14 disabled" aria-hidden="true">[{position:02d}]</span><div><span class="relationship relationship-{html.escape(relation.lower())}">{html.escape(relation)}</span><h3 class="tool-row-title heading h4 tb-h6 mb-h4">{html.escape(title)}</h3></div><i class="line line-h line-bottom line-solid"></i></div>
    <div class="tool-row-right"><i class="line line-h line-top line-solid"></i>
      <div class="tool-row-sub"><div class="tool-intro">{intro}</div><dl class="tool-facts"><div><dt class="txt-mono txt-12">{REASON_HEADING}</dt><dd>{_inline(reason)}</dd></div><div><dt class="txt-mono txt-12">Keep in mind</dt><dd>{_inline(caveat)}</dd></div></dl></div>
      <a class="tool-row-btn btn-fill btn-fill-ghost" href="{html.escape(primary[1], quote=True)}"><i class="line line-h line-top line-solid"></i><span class="btn-fill-bg" aria-hidden="true"></span>{_swap_label(action)}<span class="btn-fill-icon"><span class="slide">{ARROW_ICON}{ARROW_ICON}</span></span></a>
    <i class="line line-h line-bottom line-solid"></i></div>
  </div>
  <div class="tool-row-art" id="{slug}" data-tool="{slug}"><i class="line line-h line-top line-solid"></i><i class="line line-v line-left line-solid"></i><i class="line line-v line-right line-solid"></i><i class="line line-h line-bottom line-dash"></i>{illustration}</div>
</article>'''
    field_notes = f'''
<div class="faq-item"><details class="faq-details" name="field-notes" id="notes-{slug}"><summary><span class="faq-title heading h6 tb-h20 mb-h18">Field notes: {html.escape(title)}</span><span class="faq-ic" aria-hidden="true"></span></summary><div class="faq-body">{''.join(notes)}</div></details><i class="line line-h line-top line-solid"></i><i class="line line-h line-bottom line-dash"></i><i class="line line-h line-bottom line-dash line-ink faq-line-hover"></i></div>'''
    return title, slug, relation, row, field_notes, uses, limits


def _markdown_text(blocks):
    lines = []
    for kind, value in blocks:
        if kind == "ul":
            lines.append("\n".join(f"- {item}" for item in value))
        elif kind == "ol":
            lines.append("\n".join(f"{number}. {item}" for number, item in enumerate(value, start=1)))
        elif kind == "directives":
            lines.append("\n".join("{{" + item + "}}" for item in value))
        else:
            lines.append(value)
    return "\n".join(lines)


def _fill(template, values):
    missing = set(re.findall(r"{{(\w+)}}", template)) - values.keys()
    if missing:
        raise ValueError(f"Unknown template fields: {', '.join(sorted(missing))}")
    return re.sub(r"{{(\w+)}}", lambda match: values[match.group(1)], template)


def _opaque(colour, background):
    if len(colour) != 9:
        return colour
    alpha = int(colour[7:9], 16) / 255
    channels = [round(int(colour[at:at + 2], 16) * alpha + int(background[at:at + 2], 16) * (1 - alpha)) for at in (1, 3, 5)]
    return "#" + "".join(f"{channel:02x}" for channel in channels)


def _luminance(colour):
    channels = [int(colour[position:position + 2], 16) / 255 for position in (1, 3, 5)]
    linear = [value / 12.92 if value <= 0.03928 else ((value + 0.055) / 1.055) ** 2.4 for value in channels]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]


def _contrast(foreground, background):
    foreground = _opaque(foreground, background)
    lighter, darker = sorted((_luminance(foreground), _luminance(background)), reverse=True)
    return (lighter + 0.05) / (darker + 0.05)


class Palette:
    """The colour and sizing tokens that site/style.css defines, in both colour schemes."""

    def __init__(self, styles):
        light = LIGHT_PALETTE.search(styles)
        dark = DARK_PALETTE.search(styles)
        if light is None:
            raise ValueError("site/style.css must define its light palette in a :root block")
        if dark is None:
            raise ValueError("site/style.css must redefine its palette in a prefers-color-scheme: dark block")
        self.tokens = ROOT_TOKEN.findall(light.group(1))
        self.light = dict(COLOR_TOKEN.findall(light.group(1)))
        self.dark_overrides = dict(COLOR_TOKEN.findall(dark.group(1)))

    def colour(self, scheme, name):
        if name not in self.light:
            raise ValueError(f"Unknown colour token: {name}")
        return self.dark_overrides.get(name, self.light[name]) if scheme == "dark" else self.light[name]


def _palette_table(palette):
    rows = "".join(
        f'<tr><th scope="row"><span class="swatch" style="--swatch: var(--{name})"></span>--{name}</th>'
        f"<td>{value}</td><td>{palette.dark_overrides.get(name, 'Same')}</td></tr>"
        for name, value in palette.light.items()
    )
    return ('<div class="table-scroll" tabindex="0"><table class="data-table"><thead><tr><th scope="col">Token</th><th scope="col">Light</th><th scope="col">Dark</th></tr></thead>'
            f"<tbody>{rows}</tbody></table></div>")


def _contrast_table(palette, lines):
    rows = []
    for line in lines:
        foreground, background, threshold, description = line.split(" ", 4)[1:]
        ratios = {scheme: _contrast(palette.colour(scheme, foreground), palette.colour(scheme, background)) for scheme in ("light", "dark")}
        for scheme, ratio in ratios.items():
            if ratio < float(threshold):
                raise ValueError(
                    f"--{foreground} on --{background} is {ratio:.2f}:1 in the {scheme} palette, below the {threshold}:1 {DESIGN_SOURCE} requires"
                )
        rows.append(
            f'<tr><th scope="row"><span class="pair" style="color: var(--{foreground}); background: var(--{background})">Aa</span>'
            f"--{foreground} on --{background}</th><td>{ratios['light']:.1f}:1</td><td>{ratios['dark']:.1f}:1</td>"
            f"<td>{html.escape(threshold)}:1</td><td>{html.escape(description)}</td></tr>"
        )
    return ('<div class="table-scroll" tabindex="0"><table class="data-table"><thead><tr><th scope="col">Pair</th><th scope="col">Light</th><th scope="col">Dark</th>'
            f'<th scope="col">Needs</th><th scope="col">Used for</th></tr></thead><tbody>{"".join(rows)}</tbody></table></div>')


def _scale(palette, family):
    rows = []
    for name, value in palette.tokens:
        if not name.startswith(f"{family}-"):
            continue
        if family == "step":
            rows.append(f'<div class="scale-row" data-token="{name}"><span class="token">--{name}</span><span class="scale-sample" style="font-size: var(--{name})">Measure twice</span><span class="token">{html.escape(value)}</span></div>')
        else:
            rows.append(f'<div class="scale-row"><span class="token">--{name}</span><span class="space-bar" style="width: var(--{name})"></span><span class="token">{html.escape(value)}</span></div>')
    if not rows:
        raise ValueError(f"No {family} tokens in site/style.css")
    return f'<div class="scale">{"".join(rows)}</div>'


def _specimen(root, name):
    if not SPECIMEN_NAME.fullmatch(name):
        raise ValueError(f"Invalid specimen name: {name}")
    source = (root / "site/specimens" / f"{name}.html").read_text().replace("{{arrow}}", ARROW_ICON).replace("{{ruler}}", RULER_FRAME)
    return (f'<figure class="specimen"><div class="specimen-live">{source}</div>'
            f'<pre class="specimen-code"><code>{html.escape(source.strip())}</code></pre></figure>')


def _directives(root, palette, lines):
    contrast = [line for line in lines if line.startswith("contrast ")]
    output = [_contrast_table(palette, contrast)] if contrast else []
    for line in lines:
        command, _, argument = line.partition(" ")
        if command == "palette":
            output.append(_palette_table(palette))
        elif command == "scale":
            output.append(_scale(palette, argument))
        elif command == "specimen":
            output.append(_specimen(root, argument))
        elif command != "contrast":
            raise ValueError(f"Unknown directive in {DESIGN_SOURCE}: {line}")
    return "\n".join(output)


def _design_main(root, palette):
    source = (root / DESIGN_SOURCE).read_text()
    opening, sections = _sections(source)
    opening_blocks = _blocks(opening)
    title = next(value for kind, value in opening_blocks if kind == "title")
    paragraphs = [value for kind, value in opening_blocks if kind == "p"]
    body = []
    for position, (heading, blocks) in enumerate(sections.items(), start=1):
        content = "\n".join(
            _directives(root, palette, value) if kind == "directives" else _render([(kind, value)])
            for kind, value in blocks
        )
        slug = re.sub(r"[^a-z0-9]+", "-", heading.lower()).strip("-")
        body.append(
            f'''<section class="doc-section" id="{slug}" aria-labelledby="{slug}-title">
  <div class="doc-head"><div class="doc-head-label"><span class="txt-mono txt-14 disabled" aria-hidden="true">[{position:02d}]</span></div><div class="doc-head-title"><h2 id="{slug}-title" class="heading h3 tb-h4 mb-h3">{html.escape(heading)}</h2></div></div>
  <div class="doc-body">{content}</div>
</section>'''
        )
    head = f'''<section class="page-head" aria-labelledby="page-title">
  <div class="page-head-title"><h1 id="page-title" class="heading h1 tb-h3 mb-h2">{html.escape(title)}</h1></div>
  <div class="page-head-copy"><p class="txt-20">{_inline(paragraphs[0])}</p><p>{_inline(paragraphs[1])}</p></div>
</section>'''
    return title, paragraphs[0], head + "\n" + "\n".join(body)


def _relationship_cell(position, label, description):
    plus_marks = "".join(f'<i class="plus cell-item-plus {corner}"></i>' for corner in PLUS_CORNERS)
    return (
        '<article class="cell-item"><i class="line line-v line-left line-solid"></i>'
        f'<div class="cell-item-head txt-mono txt-14"><i class="cell-item-dot" aria-hidden="true"></i><span>Relationship</span><span class="disabled" aria-hidden="true">[{position:02d}]</span><i class="line line-h line-bottom line-dash"></i></div>'
        f'<div class="cell-item-main"><div class="cell-item-img glyph-{html.escape(label.lower())}">{SPANNER_GLYPH}{plus_marks}</div>'
        f'<div class="cell-item-content"><i class="line line-h line-top line-dash"></i><h3 class="cell-item-title heading h5 tb-h6 mb-h4">{html.escape(label)}</h3><p class="txt-16 txt-reg">{_inline(description)}</p></div></div></article>'
    )


def _relationship_labels(sections):
    items = []
    for kind, values in sections["What the labels mean"]:
        if kind != "ul":
            continue
        for value in values:
            match = re.match(r"\*\*([^*]+):\*\* (.+)", value)
            if match is None:
                raise ValueError("Unrecognized relationship label")
            items.append(match.groups())
    return items


def _balanced_lines(title):
    words = title.upper().split()
    splits = [(" ".join(words[:at]), " ".join(words[at:])) for at in range(1, len(words))]
    return min(splits, key=lambda lines: max(len(line) for line in lines)) if splits else tuple(words)


def _wordmark(title):
    lines = "".join(
        f'<text x="50%" y="{index}em" text-anchor="middle">{html.escape(line)}</text>' for index, line in enumerate(_balanced_lines(title))
    )
    return (
        f'<svg class="band-sketch" aria-hidden="true">{BAND_GUIDES}<g class="band-lines"><path class="band-marks"/>{lines}</g></svg>'
        f'<svg class="band-solid" aria-hidden="true"><defs>{BAND_INK_FILTER}<mask id="band-ink" maskUnits="userSpaceOnUse">{BAND_BLOTS}</mask></defs>'
        f'<g class="band-ink"><g class="band-lines">{lines}</g></g></svg>'
    )


def _strip_item(name, slug, relation):
    return (
        f'<a class="statement-strip-item" href="#{slug}"><span class="txt-mono txt-14">{html.escape(name)}</span>'
        f'<span class="relationship relationship-{html.escape(relation.lower())}">{html.escape(relation)}</span><i class="line line-v line-left line-dash"></i></a>'
    )


def _plan_caption_items():
    scroll = f'<span class="caption-box-cue caption-box-scroll txt-mono txt-12" aria-hidden="true">{html.escape(SCROLL_CUE)}</span>'
    steps = "".join(f'<li class="caption-box-item"><p class="txt-14">{html.escape(text)}</p>{scroll}</li>' for text in PLAN_CAPTIONS)
    return f'{steps}<li class="caption-box-item"><span class="caption-box-prompt txt-mono txt-12">{html.escape(PLAN_CAPTION_PROMPT)}</span></li>'


def _plan_limit_mark(ident, number, zone, left, top):
    centre_x, centre_y = left + PLAN_LIMIT_MARK / 2, top + PLAN_LIMIT_MARK / 2
    dot = "".join(
        f'<rect class="{part}" x="{centre_x - size / 2:g}" y="{centre_y - size / 2:g}" width="{size}" height="{size}"/>'
        for part, size in (("bench-plan-limit-dot", PLAN_LIMIT_DOT), ("bench-plan-limit-dot-core", PLAN_LIMIT_DOT_CORE))
    )
    return (
        f'<g class="bench-plan-limit" data-limit="{ident}"><use class="bench-plan-limit-area" href="#{zone}"/>{dot}'
        f'<g class="bench-plan-limit-tag"><rect x="{left:g}" y="{top:g}" width="{PLAN_LIMIT_MARK}" height="{PLAN_LIMIT_MARK}"/>'
        f'<text x="{centre_x:g}" y="{centre_y:g}" text-anchor="middle" dominant-baseline="central">{number}</text></g></g>'
    )


def _plan_limit_item(ident, number, name, slug, text, left, top):
    title, *rest = SENTENCE_END.split(text, maxsplit=1)
    desc = f'<p class="limit-callout-desc txt-14 mb-txt-12">{_inline(rest[0])}</p>' if rest else ""
    return (
        f'<li class="bench-plan-limit-item" style="--limit-x: {left:g}; --limit-y: {top:g}; --limit-size: {PLAN_LIMIT_MARK}">'
        f'<button class="limit-marker" type="button" aria-expanded="false" aria-controls="{ident}" aria-labelledby="{ident}-label {ident}-title"></button>'
        f'<div class="limit-callout" id="{ident}"><p class="limit-callout-label txt-mono txt-12" id="{ident}-label">{html.escape(name)} · Limit {number}</p>'
        f'<p class="limit-callout-title txt-16 mb-txt-14" id="{ident}-title">{_inline(title)}</p>'
        f'<div class="limit-callout-body">{desc}<a class="limit-callout-link txt-mono txt-12" href="#{slug}">{html.escape(PLAN_LIMIT_LINK.format(name))}</a></div></div></li>'
    )


def _plan_limits(drawing, exhibits):
    view = PLAN_VIEW_BOX.search(drawing)
    if view is None:
        raise ValueError("site/illustrations/bench-plan.svg needs a viewBox that starts at 0 0")
    zones = {tool: (zone, *map(float, box)) for zone, tool, *box in PLAN_LIMIT_ZONE.findall(drawing)}
    if "" not in zones:
        raise ValueError("site/illustrations/bench-plan.svg needs a limit zone with an empty data-tool for tools it does not draw")
    placed = {}
    marks, items = [], []
    for name, slug, *_, limits in exhibits:
        zone, x, y, width, _ = zones.get(slug, zones[""])
        for text in limits:
            row = placed.get(zone, 0)
            placed[zone] = row + 1
            number = f"{len(items) + 1:02d}"
            ident = f"plan-limit-{number}"
            left, top = x + width - PLAN_LIMIT_MARK, y + PLAN_LIMIT_GAP + row * (PLAN_LIMIT_MARK + PLAN_LIMIT_GAP)
            marks.append(_plan_limit_mark(ident, number, zone, left, top))
            items.append(_plan_limit_item(ident, number, name, slug, text, left, top))
    view_width, view_height = view.groups()
    listing = (
        f'<ol class="bench-plan-limit-list" aria-label="{PLAN_LIMITS_LABEL}" style="--plan-view-w: {view_width}; --plan-view-h: {view_height}">{"".join(items)}</ol>'
        if items else ""
    )
    return "".join(marks), listing


def _entry_part(root, position, verb, sub):
    drawing = _fill((root / "site/illustrations" / f"entry-{verb.lower()}.svg").read_text(), {"spanner_paths": SPANNER_PATHS})
    side = "left" if position % 2 else "right"
    corners = "".join(f'<i class="plus {corner}"></i>' for corner in PLUS_CORNERS)
    return (
        f'<li class="entry-part entry-part-img-{side}"><div class="entry-part-img"><span class="entry-part-frame" aria-hidden="true">{corners}</span>{drawing}</div>'
        f'<div class="entry-part-bar"><div class="entry-part-bar-content"><h3 class="entry-part-title heading h6 tb-h20">{html.escape(verb)}</h3>'
        f'<p class="entry-part-sub txt-16 txt-reg">{html.escape(sub)}</p><i class="entry-part-ic" aria-hidden="true"></i></div></div>'
        '<i class="line line-h entry-part-line" aria-hidden="true"></i></li>'
    )


def _focused(drawing, focus):
    groups = drawing.split(USE_CASE_FOCUS)
    if focus + 1 >= len(groups):
        return drawing
    return USE_CASE_FOCUS.join(groups[:focus + 1]) + USE_CASE_FOCUSED + USE_CASE_FOCUS.join(groups[focus + 1:])


def _use_cases(root, exhibits):
    items, images = [], []
    for name, slug, *_, uses, _ in exhibits:
        drawing_path = root / "site/illustrations" / f"usecase-{slug}.svg"
        drawing = drawing_path.read_text() if drawing_path.exists() else USE_CASE_FALLBACK
        for focus, text in enumerate(uses):
            position = len(items) + 1
            first = position == 1
            link = f'<a href="#{slug}">{html.escape(name)}</a>'
            items.append(
                f'<div class="faq-item usecase-item" style="--item: {position - 1}"><details class="faq-details" name="use-cases"{" open" if first else ""}>'
                f'<summary><span class="usecase-numb txt-mono txt-14" aria-hidden="true">[{position:02d}]</span><span class="usecase-item-title-inner">'
                f'<span class="faq-title usecase-item-title heading h6 tb-h20 mb-h18">{_inline(text)}</span><span class="usecase-tag txt-mono txt-12">{html.escape(name)}</span></span>'
                f'<span class="faq-ic" aria-hidden="true"></span></summary><div class="faq-body usecase-sub"><p class="usecase-sub-text txt-16">{html.escape(USE_CASE_SUB).format(link)}</p></div></details>'
                '<i class="line line-h line-top line-solid"></i><i class="line line-h line-bottom line-dash"></i><i class="line line-h line-bottom line-dash line-ink faq-line-hover"></i></div>'
            )
            images.append(f'<div class="usecase-img-item{" active" if first else ""}" data-tool="{slug}">{_focused(drawing, focus)}</div>')
    return "".join(items), "".join(images)


def _pagination(count):
    return "".join('<span class="active"></span>' if position == 1 else "<span></span>" for position in range(1, count + 1))


def _footer_tool_links(exhibits, home):
    return "".join(f'<a class="footer-link txt-16 mb-txt-14" href="{home}#{slug}">{html.escape(name)}</a>' for name, slug, *_ in exhibits)


def _menu_tool_links(exhibits, home):
    return "".join(
        f'<a class="header-menu-dropdown-item btn-fill btn-fill-ghost" href="{home}#{slug}"><span class="btn-fill-bg" aria-hidden="true"></span>'
        f'<span class="swap txt-mono txt-14"><span>{html.escape(name)}</span><span aria-hidden="true">{html.escape(name)}</span></span></a>'
        for name, slug, *_ in exhibits
    )


def _build(root):
    readme = (root / "README.md").read_text()
    opening, sections = _sections(readme)
    intro_blocks = _blocks(opening)
    title = next(value for kind, value in intro_blocks if kind == "title")
    intro_paragraphs = [value for kind, value in intro_blocks if kind == "p"]
    catalog = CATALOG_LINK.findall(_markdown_text(sections["On the bench"]))
    if not catalog:
        raise ValueError("The catalog contains no tools")
    exhibits = [_tool_exhibit(root, path, position) for position, (_, path) in enumerate(catalog, start=1)]
    labels = _relationship_labels(sections)
    palette = Palette((root / "site/style.css").read_text())
    plan_drawing = (root / "site/illustrations/bench-plan.svg").read_text()
    plan_limit_marks, plan_limits = _plan_limits(plan_drawing, exhibits)
    use_cases, use_case_images = _use_cases(root, exhibits)
    values = {
        "profile_url": PROFILE_URL,
        "repository_url": REPOSITORY_URL,
        "arrow": ARROW_ICON,
        "arrow_solid": ARROW_SOLID_ICON,
        "theme_paper": palette.colour("light", "paper"),
        "theme_paper_dark": palette.colour("dark", "paper"),
        "theme_ink": palette.colour("light", "ink"),
        "theme_accent": palette.colour("light", "brand"),
        "title": html.escape(title),
        "tagline": _inline(intro_paragraphs[0]),
        "intro": _inline(intro_paragraphs[1]),
        "statement_drawing": STATEMENT_DRAWING,
        "cta_drawing": SPANNER_GLYPH,
        "ruler": RULER_FRAME,
        "wordmark": _wordmark(title),
        "hero_drawing": (root / "site/illustrations/hero-spanner.svg").read_text(),
        "plan_captions": _plan_caption_items(),
        "plan_drawing": _fill(plan_drawing, {"spanner_paths": SPANNER_PATHS, "plan_limit_marks": plan_limit_marks}),
        "plan_limits": plan_limits,
        "exhibits": "\n".join(row for _, _, _, row, *_ in exhibits),
        "field_notes": "\n".join(notes for _, _, _, _, notes, *_ in exhibits),
        "tool_total": str(len(exhibits)),
        "tool_work_items": "".join(f'<span class="home-hero-work-item txt-mono txt-14">{WORK_ICON}{html.escape(name)}</span>' for name, *_ in exhibits),
        "tool_strip_items": "".join(_strip_item(name, slug, relation) for name, slug, relation, *_ in exhibits),
        "criteria": _render(sections["What belongs here"][:1]),
        "legend_cells": "".join(_relationship_cell(position, label, description) for position, (label, description) in enumerate(labels, start=1)),
        "cell_pagination": _pagination(len(labels)),
        "scroll_cue": html.escape(SCROLL_CUE),
        "entry_parts": "".join(_entry_part(root, position, verb, sub) for position, (verb, sub, _) in enumerate(ENTRY_PARTS, start=1)),
        "entry_parts_pagination": _pagination(len(ENTRY_PARTS)),
        "use_cases": use_cases,
        "use_case_images": use_case_images,
    }
    shell = (root / "site/template.html").read_text()
    home = _fill((root / "site/home.html").read_text(), values)
    loader = _fill((root / "site/loader.html").read_text(), values)
    design_title, design_summary, design = _design_main(root, palette)
    pages = {
        "index.html": _fill(shell, {**values, "loader": loader, "page_title": html.escape(f"{title} | {intro_paragraphs[0]}"), "description": html.escape(intro_paragraphs[0], quote=True), "home": "", "design_current": "", "footer_tool_links": _footer_tool_links(exhibits, ""), "menu_tool_links": _menu_tool_links(exhibits, ""), "main": home}),
        DESIGN_PAGE: _fill(shell, {**values, "loader": "", "page_title": html.escape(f"{title} | {design_title}"), "description": html.escape(design_summary, quote=True), "home": "./", "design_current": ' aria-current="page"', "footer_tool_links": _footer_tool_links(exhibits, "./"), "menu_tool_links": _menu_tool_links(exhibits, "./"), "main": design}),
    }
    output = root / "dist"
    shutil.rmtree(output, ignore_errors=True)
    output.mkdir()
    for name, page in pages.items():
        (output / name).write_text(page)
    for name in ("style.css", "app.js", "robots.txt"):
        shutil.copy2(root / "site" / name, output / name)
    shutil.copytree(root / "site/assets", output / "assets", dirs_exist_ok=True)
    (output / "assets/mark.svg").write_text(_fill((root / "site/assets/mark.svg").read_text(), values))
    print(f"Built {len(exhibits)} catalog entries and the design system into dist/")


if __name__ == "__main__":
    try:
        _build(ROOT)
    except (OSError, ValueError, KeyError, StopIteration) as error:
        sys.exit(f"Website build failed: {error}")
