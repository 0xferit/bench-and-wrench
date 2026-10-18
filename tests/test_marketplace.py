import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]


class MarketplaceBuildTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        shutil.copytree(ROOT / "scripts", self.root / "scripts")
        (self.root / ".claude-plugin").mkdir()
        self.source = self.root / ".claude-plugin/marketplace.json"
        self.source.write_text(json.dumps({
            "name": "example-bench",
            "owner": {"name": "Example"},
            "plugins": [{
                "name": "example-tool",
                "source": {
                    "source": "url",
                    "url": "https://example.com/tool.git",
                    "sha": "a" * 40,
                },
            }],
        }))
        (self.root / "README.md").write_text("# Example's Bench\n")

    def build(self, *arguments):
        return subprocess.run(
            [sys.executable, "-B", str(self.root / "scripts/build_marketplace.py"), *arguments],
            cwd=self.root, text=True, capture_output=True,
        )

    def test_codex_catalog_derives_brand_and_plugin_sources(self):
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        catalog = json.loads((self.root / ".agents/plugins/marketplace.json").read_text())
        original = json.loads(self.source.read_text())
        self.assertEqual(catalog["name"], original["name"])
        self.assertEqual(catalog["interface"]["displayName"], "Example's Bench")
        self.assertEqual(catalog["plugins"][0]["source"], original["plugins"][0]["source"])
        self.assertEqual(catalog["plugins"][0]["policy"]["installation"], "AVAILABLE")

    def test_check_detects_drift_without_overwriting_then_regeneration_repairs_it(self):
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        output = self.root / ".agents/plugins/marketplace.json"
        before = output.read_bytes()
        (self.root / "README.md").write_text("# A renamed bench\n")
        source = json.loads(self.source.read_text())
        source["plugins"].append({"name": "local-skill", "source": "./plugins/local-skill"})
        self.source.write_text(json.dumps(source))
        result = self.build("--check")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("out of date", result.stderr)
        self.assertEqual(output.read_bytes(), before)
        self.assertEqual(self.build().returncode, 0)
        self.assertEqual(self.build("--check").returncode, 0)
        catalog = json.loads(output.read_text())
        self.assertEqual(catalog["interface"]["displayName"], "A renamed bench")
        self.assertEqual(catalog["plugins"][1]["source"], "./plugins/local-skill")


if __name__ == "__main__":
    unittest.main()
