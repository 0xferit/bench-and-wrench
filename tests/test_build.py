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
        shutil.copy2(ROOT / "README.md", self.root / "README.md")

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
        self.assertNotIn("{{", page)
        self.assertTrue((self.root / "dist/assets/mark.svg").is_file())

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
            ":root { --paper: #f0f0f0; --ink: #101010; --brand: #a00000; }\n"
            "@media (prefers-color-scheme: dark) { :root { --paper: #202020; --ink: #ffffff; --brand: #ff0000; } }\n"
        )
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        page = (self.root / "dist/index.html").read_text()
        self.assertIn('content="#f0f0f0" media="(prefers-color-scheme: light)"', page)
        self.assertIn('content="#202020" media="(prefers-color-scheme: dark)"', page)
        icon = (self.root / "dist/assets/mark.svg").read_text()
        for colour in ("#101010", "#f0f0f0", "#a00000"):
            self.assertIn(f'fill="{colour}"', icon)

    def test_stale_output_is_removed_before_building(self):
        stale = self.root / "dist/assets/fonts/retired-font.woff2"
        stale.parent.mkdir(parents=True)
        stale.write_text("retired")
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(stale.exists())
        self.assertTrue((self.root / "dist/index.html").is_file())

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
