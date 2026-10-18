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
        elif chunk.startswith("# "):
            blocks.append(("title", chunk[2:].strip()))
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
    return "\n".join(output)


def _sections(text):
    pieces = SECTION_HEADING.split(text)
    return pieces[0], {pieces[index]: _blocks(pieces[index + 1]) for index in range(1, len(pieces), 2)}


def _first_paragraph(blocks):
    return next((value for kind, value in blocks if kind == "p"), "")


def _tool_exhibit(root, path):
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
        f'<div class="tool-illustration plain-illustration"><strong>{html.escape(title)}</strong></div>'
    )
    notes = [f'<section class="note-section"><h4>About this entry</h4><p>{_inline(relationship)}</p></section>']
    for heading, blocks in sections.items():
        remaining = blocks[1:] if heading in ("Why it earns a place", "Limits to understand") else blocks
        if remaining:
            notes.append(f'<section class="note-section"><h4>{html.escape(heading)}</h4>{_render(remaining)}</section>')
    return title, slug, f'''
<article class="tool-exhibit exhibit-{slug}" id="{slug}">
  <header class="exhibit-header"><div class="tool-heading"><p class="section-label">On the bench</p><h3>{html.escape(title)}</h3></div><span class="relationship">{html.escape(relation)}</span></header>
  <div class="exhibit-body">{illustration}<div class="tool-copy"><div class="tool-intro">{intro}</div><div class="tool-reason"><p class="section-label">Why it earns a place</p><p>{_inline(reason)}</p></div><div class="tool-caveat"><p class="section-label">Keep in mind</p><p>{_inline(caveat)}</p></div><div class="tool-actions"><a class="button button-petrol" href="{html.escape(primary[1], quote=True)}">{html.escape(action)}</a></div></div></div>
  <details class="field-notes" id="notes-{slug}"><summary><span>Read the field notes</span><span class="notes-hint">Fit, limits, and sources</span></summary><div class="notes-grid">{''.join(notes)}</div></details>
</article>'''


def _markdown_text(blocks):
    return "\n".join("\n".join(f"- {item}" for item in value) if kind == "ul" else value for kind, value in blocks)


def _build(root):
    readme = (root / "README.md").read_text()
    opening, sections = _sections(readme)
    intro_blocks = _blocks(opening)
    title = next(value for kind, value in intro_blocks if kind == "title")
    intro_paragraphs = [value for kind, value in intro_blocks if kind == "p"]
    catalog = CATALOG_LINK.findall(_markdown_text(sections["On the bench"]))
    if not catalog:
        raise ValueError("The catalog contains no tools")
    exhibits = [_tool_exhibit(root, path) for _, path in catalog]
    legend = []
    for kind, values in sections["What the labels mean"]:
        if kind != "ul":
            continue
        for value in values:
            match = re.match(r"\*\*([^*]+):\*\* (.+)", value)
            if match is None:
                raise ValueError("Unrecognized relationship label")
            label, description = match.groups()
            legend.append(f"<div><h4>{html.escape(label)}</h4><p>{_inline(description)}</p></div>")
    styles = (root / "site/style.css").read_text()
    colors = dict(re.findall(r"--([a-z-]+):\s*(#[0-9a-fA-F]+);", styles))
    brand_owner, _, brand_name = title.partition(" ")
    values = {
        "brand_owner": html.escape(brand_owner),
        "brand_name": html.escape(brand_name),
        "curator": html.escape(brand_owner.removesuffix("'s")),
        "profile_url": "https://github.com/0xferit",
        "theme_color": colors["petrol"],
        "theme_paper": colors["paper"],
        "theme_brass": colors["brass"],
        "title": html.escape(title),
        "description": html.escape(intro_paragraphs[0], quote=True),
        "tagline": _inline(intro_paragraphs[0]),
        "intro": _inline(intro_paragraphs[1]),
        "exhibits": "\n".join(exhibit for _, _, exhibit in exhibits),
        "tool_index": "".join(f'<a href="#{slug}">{html.escape(name)}</a>' for name, slug, _ in exhibits),
        "criteria": _render(sections["What belongs here"][:1]),
        "legend": '<div class="legend-grid">' + "".join(legend) + "</div>",
    }
    template = (root / "site/template.html").read_text()
    missing = set(re.findall(r"{{(\w+)}}", template)) - values.keys()
    if missing:
        raise ValueError(f"Unknown template fields: {', '.join(sorted(missing))}")
    page = re.sub(r"{{(\w+)}}", lambda match: values[match.group(1)], template)
    output = root / "dist"
    output.mkdir(exist_ok=True)
    (output / "index.html").write_text(page)
    for name in ("style.css", "app.js", "robots.txt"):
        shutil.copy2(root / "site" / name, output / name)
    shutil.copytree(root / "site/assets", output / "assets", dirs_exist_ok=True)
    icon = (root / "site/assets/mark.svg").read_text()
    icon = re.sub(r"{{(\w+)}}", lambda match: values[match.group(1)], icon)
    (output / "assets/mark.svg").write_text(icon)
    print(f"Built {len(exhibits)} catalog entries into dist/index.html")


if __name__ == "__main__":
    try:
        _build(ROOT)
    except (OSError, ValueError, KeyError, StopIteration) as error:
        sys.exit(f"Website build failed: {error}")
