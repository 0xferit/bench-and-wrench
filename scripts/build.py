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
    reason = _first_paragraph(sections.get("Why it earns a place", []))
    caveat = _first_paragraph(sections.get("Limits to understand", []))
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
        f'<div class="tool-illustration plain-illustration cell"><strong>{html.escape(title)}</strong></div>'
    )
    notes = [f'<section class="note-section"><h4>About this entry</h4><p>{_inline(relationship)}</p></section>']
    for heading, blocks in sections.items():
        remaining = blocks[1:] if heading in ("Why it earns a place", "Limits to understand") else blocks
        if remaining:
            notes.append(f'<section class="note-section"><h4>{html.escape(heading)}</h4>{_render(remaining)}</section>')
    return title, slug, f'''
<article class="tool" id="{slug}">
  <header class="tool-head cell-row"><span class="tool-index label cell">[{position:02d}]</span><h3 class="cell">{html.escape(title)}</h3><span class="relationship relationship-{html.escape(relation.lower())} cell">{html.escape(relation)}</span></header>
  <div class="tool-body cell-row">{illustration}<div class="tool-copy cell"><div class="tool-intro">{intro}</div><dl class="tool-facts"><div><dt class="label">Why it earns a place</dt><dd>{_inline(reason)}</dd></div><div class="caveat"><dt class="label">Keep in mind</dt><dd>{_inline(caveat)}</dd></div></dl><p class="tool-actions"><a class="button" href="{html.escape(primary[1], quote=True)}"><span class="button-label">{html.escape(action)}</span><span class="button-icon" aria-hidden="true"></span></a></p></div></div>
  <details class="field-notes" id="notes-{slug}"><summary><span>Field notes</span><span class="notes-hint">Fit, limits, and sources</span></summary><div class="notes-grid">{''.join(notes)}</div></details>
</article>'''


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


def _luminance(colour):
    channels = [int(colour[position:position + 2], 16) / 255 for position in (1, 3, 5)]
    linear = [value / 12.92 if value <= 0.03928 else ((value + 0.055) / 1.055) ** 2.4 for value in channels]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]


def _contrast(foreground, background):
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
    source = (root / "site/specimens" / f"{name}.html").read_text()
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
            f'''<section class="section doc-section" id="{slug}" aria-labelledby="{slug}-title">
  <div class="section-head cell-row"><div class="cell"><span class="label">[{position:02d}]</span></div><div class="cell"><h2 id="{slug}-title">{html.escape(heading)}</h2></div></div>
  <div class="doc-body cell">{content}</div>
</section>'''
        )
    hero = f'''<section class="hero-row cell-row" aria-labelledby="page-title">
  <div class="hero-title cell"><h1 id="page-title">{html.escape(title)}</h1></div>
  <div class="hero-copy cell"><p class="lede">{_inline(paragraphs[0])}</p><p>{_inline(paragraphs[1])}</p></div>
</section>'''
    return title, paragraphs[0], hero + "\n" + "\n".join(body)


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
    legend = []
    for kind, values in sections["What the labels mean"]:
        if kind != "ul":
            continue
        for value in values:
            match = re.match(r"\*\*([^*]+):\*\* (.+)", value)
            if match is None:
                raise ValueError("Unrecognized relationship label")
            label, description = match.groups()
            legend.append(f'<div><dt class="relationship relationship-{html.escape(label.lower())}">{html.escape(label)}</dt><dd>{_inline(description)}</dd></div>')
    palette = Palette((root / "site/style.css").read_text())
    values = {
        "profile_url": "https://github.com/0xferit",
        "theme_paper": palette.colour("light", "paper"),
        "theme_paper_dark": palette.colour("dark", "paper"),
        "theme_ink": palette.colour("light", "ink"),
        "theme_accent": palette.colour("light", "brand"),
        "title": html.escape(title),
        "tagline": _inline(intro_paragraphs[0]),
        "intro": _inline(intro_paragraphs[1]),
        "hero_drawing": (root / "site/illustrations/hero-spanner.svg").read_text(),
        "exhibits": "\n".join(exhibit for _, _, exhibit in exhibits),
        "tool_index": ", ".join(f'<a href="#{slug}">{html.escape(name)}</a>' for name, slug, _ in exhibits),
        "criteria": _render(sections["What belongs here"][:1]),
        "legend": '<dl class="legend">' + "".join(legend) + "</dl>",
    }
    shell = (root / "site/template.html").read_text()
    home = _fill((root / "site/home.html").read_text(), values)
    design_title, design_summary, design = _design_main(root, palette)
    pages = {
        "index.html": _fill(shell, {**values, "page_title": html.escape(title), "description": html.escape(intro_paragraphs[0], quote=True), "home": "", "main": home}),
        DESIGN_PAGE: _fill(shell, {**values, "page_title": f"{html.escape(design_title)}: {html.escape(title)}", "description": html.escape(design_summary, quote=True), "home": "./", "main": design}),
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
