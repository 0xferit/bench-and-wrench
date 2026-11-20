import json
from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / "plugins/solidity-storage-optimizer"
SKILL = PLUGIN / "skills/solidity-storage-optimizer"
SKILL_FILE = SKILL / "SKILL.md"
BUNDLED_PATH = re.compile(r"(?<![\w/.-])(?:scripts|references|examples)/[\w./-]*")
PINNED_DEPENDENCY = re.compile(r'^([a-z0-9-]+) = "([0-9.]+)"$', re.MULTILINE)
HOST_SPECIFIC = {
    "a Claude Code path variable": re.compile(r"\$\{CLAUDE_"),
    "a Claude Code tool name": re.compile(r"AskUserQuestion"),
    "a host-specific agent term": re.compile(r"sub-?agent", re.IGNORECASE),
    "a private skill command": re.compile(r"(?<![\w-])/solidity(?![\w-])"),
}
LIBRARIES = ("uint-quantization-lib", "slot-recycling-lib")
SKILL_LINE_LIMIT = 300
STOPS_AND_GATES_BY_LINE = 150
DESCRIPTION_LIMIT = 1024
CONTENTS_REQUIRED_ABOVE_LINES = 100
CONTENTS_WITHIN_LINES = 12


def documents():
    return [SKILL_FILE, *sorted((SKILL / "references").glob("*.md"))]


def frontmatter(text):
    _, block, _ = text.split("---\n", 2)
    return dict(line.split(": ", 1) for line in block.strip().splitlines())


class SkillPackageTests(unittest.TestCase):
    def test_every_path_the_skill_documents_name_exists(self):
        for document in documents():
            named = {match.rstrip(".") for match in BUNDLED_PATH.findall(document.read_text())}
            self.assertTrue(named, f"{document.name} names no bundled file")
            for path in sorted(named):
                with self.subTest(document=document.name, path=path):
                    self.assertTrue((SKILL / path).exists())

    def test_references_link_only_to_scripts_and_examples(self):
        references = sorted((SKILL / "references").glob("*.md"))
        self.assertTrue(references)
        for reference in references:
            named = BUNDLED_PATH.findall(reference.read_text())
            self.assertEqual([path for path in named if path.startswith("references/")], [], reference.name)

    def test_skill_documents_are_host_neutral(self):
        for document in documents():
            text = document.read_text()
            for what, pattern in HOST_SPECIFIC.items():
                with self.subTest(document=document.name, what=what):
                    self.assertIsNone(pattern.search(text))

    def test_skill_pins_the_library_versions_the_examples_verify(self):
        pinned = dict(PINNED_DEPENDENCY.findall((SKILL / "examples/foundry.toml").read_text()))
        skill = SKILL_FILE.read_text()
        for library in LIBRARIES:
            with self.subTest(library=library):
                self.assertIn(f"{library}~{pinned[library]}", skill)
                self.assertIn(f"0xferit/{library}@v{pinned[library]}", skill)

    def test_skill_frontmatter_matches_the_package(self):
        declared = frontmatter(SKILL_FILE.read_text())
        manifest = json.loads((PLUGIN / ".claude-plugin/plugin.json").read_text())
        self.assertEqual(declared["name"], SKILL.name)
        self.assertEqual(manifest["name"], SKILL.name)
        self.assertLessEqual(len(declared["description"]), DESCRIPTION_LIMIT)

    def test_the_stops_and_gates_come_before_the_detail(self):
        lines = SKILL_FILE.read_text().splitlines()
        self.assertLess(len(lines), SKILL_LINE_LIMIT)
        headings = {line: number for number, line in enumerate(lines, start=1) if line.startswith("## ")}
        for heading in ("## Stop and report", "## Ask and wait"):
            with self.subTest(heading=heading):
                self.assertLess(headings[heading], STOPS_AND_GATES_BY_LINE)

    def test_long_references_open_with_a_contents_list(self):
        references = sorted((SKILL / "references").glob("*.md"))
        self.assertTrue(references)
        for reference in references:
            lines = reference.read_text().splitlines()
            if len(lines) > CONTENTS_REQUIRED_ABOVE_LINES:
                with self.subTest(reference=reference.name):
                    self.assertIn("## Contents", lines[:CONTENTS_WITHIN_LINES])


if __name__ == "__main__":
    unittest.main()
