import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class WebsiteBuildTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        for name in ("site", "scripts", "tools"):
            shutil.copytree(ROOT / name, self.root / name)
        for name in ("README.md", "DESIGN.md"):
            shutil.copy2(ROOT / name, self.root / name)

    def build(self):
        return subprocess.run(
            [sys.executable, "-B", str(self.root / "scripts/build.py")],
            cwd=self.root, text=True, capture_output=True,
        )

    def test_catalog_is_rendered_and_new_entries_need_no_layout_code(self):
        readme = self.root / "README.md"
        readme.write_text(readme.read_text().replace(
            "## What the labels mean",
            "- [Boundary tool](tools/boundary-tool.md): A test tool.\n\n## What the labels mean",
        ))
        (self.root / "tools/boundary-tool.md").write_text(
            "# Boundary tool\n\n**Relationship: Curated.**\n\nA boundary example.\n\n"
            "## Why it earns a place\n\nA singular use.\n\n"
            "## When it is useful\n\n- A singular moment.\n\n"
            "## Limits to understand\n\nA real limitation.\n\n"
            "## Open it\n\n[Open tool](https://example.com/tool).\n"
        )
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        page = (self.root / "dist/index.html").read_text()
        for name in ("Live Gantt", "Linear Work Tree", "Boundary tool"):
            self.assertIn(name, page)
        self.assertIn('href="https://example.com/tool"', page)
        self.assertIn("A real limitation.", page)
        callouts = re.findall(r'<div class="limit-callout" id="([^"]+)"><p [^>]*>([^<]*)</p>', page)
        self.assertEqual(len(callouts), 6)
        self.assertEqual(callouts[-1], ("plan-limit-06", "Boundary tool · Limit 06"))
        self.assertIn('<g class="bench-plan-limit" data-limit="plan-limit-06">', page)
        cases = re.findall(r'<details class="faq-details" name="use-cases"[^>]*><summary><span [^>]*>\[(\d+)\]</span><span [^>]*><span [^>]*>([^<]*)</span><span class="usecase-tag[^"]*">([^<]*)</span>.*?</summary><div [^>]*>(.*?)</div></details>', page)
        self.assertEqual(len(cases), 7)
        self.assertEqual(cases[-1][:3], ("07", "A singular moment.", "Boundary tool"))
        self.assertIn('href="#boundary-tool"', cases[-1][3])
        self.assertEqual(re.findall(r'<div class="usecase-img-item[^"]*" data-tool="([^"]+)"', page)[-1], "boundary-tool")
        menu = re.search(r'<nav class="header-menu".*?</nav>', page, re.DOTALL).group(0)
        dropdown = re.findall(r'class="header-menu-dropdown-item[^"]*" href="([^"]+)"', menu)
        self.assertEqual(dropdown, ["#live-gantt", "#linear-work-tree", "#boundary-tool"])
        self.assertNotIn("{{", page)
        self.assertTrue((self.root / "dist/assets/mark.svg").is_file())

    def test_an_entry_missing_one_of_the_four_parts_fails_before_producing_a_page(self):
        entry = self.root / "tools/live-gantt.md"
        entry.write_text(entry.read_text().replace("## When it is useful", "## When it helps"))
        result = self.build()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("tools/live-gantt.md", result.stderr)
        self.assertIn("When it is useful", result.stderr)
        self.assertFalse((self.root / "dist/index.html").exists())

    def test_every_fragment_link_on_the_home_page_has_a_target(self):
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        page = (self.root / "dist/index.html").read_text()
        targets = set(re.findall(r'\bid="([^"]+)"', page))
        fragments = set(re.findall(r'href="#([^"]+)"', page))
        self.assertIn("linear-work-tree", fragments)
        self.assertEqual(fragments - targets, set())
        references = {name for names in re.findall(r'aria-(?:controls|labelledby)="([^"]+)"', page) for name in names.split()}
        self.assertIn("plan-limit-01", references)
        self.assertEqual(references - targets, set())

    def test_the_readme_credit_line_is_the_footer_credit_on_every_page(self):
        readme = self.root / "README.md"
        credit = "A boundary credit, used with permission."
        readme.write_text(re.sub(r"(## Credits\n\n)[^\n]+", lambda match: match.group(1) + credit, readme.read_text()))
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        for name in ("index.html", "design-system.html"):
            page = (self.root / "dist" / name).read_text()
            footer = re.search(r'<footer class="footer">.*?</footer>', page, re.DOTALL).group(0)
            self.assertEqual(footer.count(credit), 1, name)

    def test_every_asset_a_page_links_is_published(self):
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        for name in ("index.html", "design-system.html"):
            page = (self.root / "dist" / name).read_text()
            assets = set(re.findall(r'(?:href|src)="(assets/[^"#]+)', page))
            self.assertIn("assets/favicon-dark-32.png", assets)
            self.assertEqual({path for path in assets if not (self.root / "dist" / path).is_file()}, set())

    def test_raw_markup_is_rendered_as_text(self):
        path = self.root / "tools/live-gantt.md"
        path.write_text(path.read_text().replace(
            "## Why it earns a place", '<img src=x onerror=alert(1)>\n\n## Why it earns a place',
        ))
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        page = (self.root / "dist/index.html").read_text()
        self.assertIn("&lt;img src=x onerror=alert(1)&gt;", page)
        self.assertNotIn("<img src=x", page)

    def test_crawler_policy_is_published_at_the_site_root(self):
        policy = "User-agent: ExampleCrawler\nAllow: /field-notes\n"
        (self.root / "site/robots.txt").write_text(policy)
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        output = self.root / "dist/robots.txt"
        self.assertTrue(output.is_file())
        self.assertEqual(output.read_text(), policy)

    def test_theme_and_favicon_colours_come_from_the_palette_tokens(self):
        (self.root / "site/style.css").write_text(
            ":root { --paper: #f0f0f0; --cell: #ffffff; --ink: #101010; --muted: #404040; --granite: #404040; --rule: #999999; --brand: #a00000; --on-brand: #ffffff; --on-ink: #ffffff; --step-label: 12px; --space-1: 4px; }\n"
            "@media (prefers-color-scheme: dark) { :root { --paper: #202020; --cell: #282828; --ink: #ffffff; --muted: #cccccc; --granite: #cccccc; --brand: #ff6666; --on-brand: #000000; --on-ink: #000000; } }\n"
        )
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        page = (self.root / "dist/index.html").read_text()
        self.assertIn('content="#f0f0f0" media="(prefers-color-scheme: light)"', page)
        self.assertIn('content="#202020" media="(prefers-color-scheme: dark)"', page)
        icon = (self.root / "dist/assets/mark.svg").read_text()
        for token, colour in (("ink", "#101010"), ("paper", "#f0f0f0"), ("brand", "#a00000")):
            self.assertIn(f"fill:var(--{token},{colour})", icon)

    def test_stale_output_is_removed_before_building(self):
        stale = self.root / "dist/assets/fonts/retired-font.woff2"
        stale.parent.mkdir(parents=True)
        stale.write_text("retired")
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(stale.exists())
        self.assertTrue((self.root / "dist/index.html").is_file())

    def test_design_system_page_is_generated_from_the_stylesheet_and_specimens(self):
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        page = (self.root / "dist/design-system.html").read_text()
        styles = (self.root / "site/style.css").read_text()
        self.assertIn("--brand", page)
        self.assertIn(re.search(r"--brand:\s*(#[0-9a-f]+);", styles).group(1), page)
        for name in ("button", "window"):
            source = (self.root / "site/specimens" / f"{name}.html").read_text().split("\n")[0]
            self.assertIn(source[:40], page)
        self.assertIn('href="./#tools"', page)
        self.assertIn('href="design-system.html"', (self.root / "dist/index.html").read_text())
        self.assertNotIn("{{", page)

    def test_a_contrast_pair_below_its_threshold_fails_before_producing_a_page(self):
        styles = self.root / "site/style.css"
        original = styles.read_text()
        lowered = original.replace("--muted: #282828b8;", "--muted: #28282840;")
        self.assertNotEqual(lowered, original)
        styles.write_text(lowered)
        result = self.build()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("--muted on --paper", result.stderr)
        self.assertIn("below the 4.5:1", result.stderr)
        self.assertFalse((self.root / "dist/index.html").exists())

    def test_a_translucent_text_colour_is_judged_on_the_ground_it_sits_on(self):
        styles = self.root / "site/style.css"
        original = styles.read_text()
        translucent = original.replace("--muted: #282828b8;", "--muted: #00000080;")
        self.assertNotEqual(translucent, original)
        styles.write_text(translucent)
        result = self.build()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("--muted on --paper", result.stderr)

    def test_a_dark_palette_that_breaks_a_pair_also_fails(self):
        styles = self.root / "site/style.css"
        original = styles.read_text()
        lowered = original.replace("--ink: #e9e8e1;", "--ink: #3a3a37;")
        self.assertNotEqual(lowered, original)
        styles.write_text(lowered)
        result = self.build()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("in the dark palette", result.stderr)

    def test_a_specimen_name_cannot_leave_the_specimen_directory(self):
        design = self.root / "DESIGN.md"
        design.write_text(design.read_text().replace("{{specimen button}}", "{{specimen ../template}}"))
        result = self.build()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Invalid specimen name", result.stderr)

    def test_a_missing_specimen_reports_its_path(self):
        design = self.root / "DESIGN.md"
        design.write_text(design.read_text().replace("{{specimen button}}", "{{specimen retired}}"))
        result = self.build()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("retired.html", result.stderr)

    def test_specimens_use_only_classes_the_stylesheet_defines(self):
        styles = (self.root / "site/style.css").read_text()
        for specimen in sorted((self.root / "site/specimens").glob("*.html")):
            for attribute in re.findall(r'class="([^"]+)"', specimen.read_text()):
                for name in attribute.split():
                    self.assertIn(f".{name}", styles, f"{specimen.name} uses .{name}, which style.css does not define")

    def test_wordmark_lines_share_one_size_and_the_fonts_own_spacing(self):
        readme = self.root / "README.md"
        title = readme.read_text().splitlines()[0]
        readme.write_text(readme.read_text().replace(title, "# Wide Narrowest Ok", 1))
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        band = re.search(r'<svg class="band-sketch".*?</svg>', (self.root / "dist/index.html").read_text()).group(0)
        lines = re.findall(r"<text ([^>]*)>([^<]*)</text>", band)
        self.assertEqual([text for _, text in lines], ["WIDE", "NARROWEST OK"])
        self.assertEqual({re.sub(r' y="[^"]*"', "", attributes) for attributes, _ in lines}, {'x="50%" text-anchor="middle"'})

    def test_unsafe_link_fails_before_producing_a_page(self):
        path = self.root / "tools/live-gantt.md"
        path.write_text(path.read_text().replace(
            "https://github.com/alkindilabs/live-gantt/pull/2", "javascript:alert",
        ))
        result = self.build()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Unsupported link", result.stderr)
        self.assertFalse((self.root / "dist/index.html").exists())

    def test_missing_catalog_entry_reports_its_path(self):
        (self.root / "tools/linear-work-tree.md").unlink()
        result = self.build()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("linear-work-tree.md", result.stderr)
        self.assertFalse((self.root / "dist/index.html").exists())


if __name__ == "__main__":
    unittest.main()
