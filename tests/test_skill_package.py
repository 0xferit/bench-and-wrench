import json
from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / "plugins/solidity-workbench"
SKILL = PLUGIN / "skills/storage-optimizer"
SKILL_FILE = SKILL / "SKILL.md"
SCENARIOS = ROOT / "evals" / PLUGIN.name / SKILL.name
BUNDLED_PATH = re.compile(r"(?<![\w/.-])(?:scripts|references|examples)/[\w./-]*")
RELATIVE_LINK = re.compile(r"\]\((?!https?://|#)([^)]+)\)")
PINNED_DEPENDENCY = re.compile(r'^([a-z0-9-]+) = "([0-9.]+)"$', re.MULTILINE)
SHELL_BLOCK = re.compile(r"^```sh\n(.*?)^```$", re.DOTALL | re.MULTILINE)
HOST_SPECIFIC = {
    "a Claude Code path variable": re.compile(r"\$\{CLAUDE_"),
    "a Claude Code tool name": re.compile(r"AskUserQuestion"),
    "a host-specific agent term": re.compile(r"sub-?agent", re.IGNORECASE),
    "a private skill command": re.compile(r"(?<![\w-])/solidity(?![\w-])"),
}
LIBRARIES = ("uint-quantization-lib", "slot-recycling-lib")
RETIREMENT_RULES = (
    "that generation must not be the reserved one",
    "Retiring overwrites the word",
    "Leaving the last record's own word in place is not retirement",
)
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

    def test_references_do_not_link_to_each_other(self):
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
            version = re.escape(pinned[library])
            expected = {
                "registry command": rf"^forge soldeer install '{library}~{version}'$",
                "commit command": rf"^forge install 0xferit/{library}@[0-9a-f]{{40}}$",
                "tag the commit belongs to": rf"`v{version}` in `{library}`",
            }
            for what, pattern in expected.items():
                with self.subTest(library=library, what=what):
                    found = re.search(pattern, skill, re.MULTILINE)
                    self.assertTrue(found, f"no {what} for {library} {pinned[library]}")

    def test_scenario_projects_pin_the_versions_the_examples_verify(self):
        verified = dict(PINNED_DEPENDENCY.findall((SKILL / "examples/foundry.toml").read_text()))
        projects = sorted(SCENARIOS.glob("*/project/foundry.toml"))
        self.assertTrue(projects)
        for project in projects:
            pinned = dict(PINNED_DEPENDENCY.findall(project.read_text()))
            with self.subTest(scenario=project.parent.parent.name):
                self.assertTrue(pinned)
                self.assertEqual(pinned, {dependency: verified.get(dependency) for dependency in pinned})

    def test_install_commands_can_be_pasted_at_any_prompt(self):
        commands = [line for block in SHELL_BLOCK.findall(SKILL_FILE.read_text()) for line in block.splitlines()]
        self.assertTrue(commands)
        for command in commands:
            with self.subTest(command=command):
                self.assertNotIn("#", command, "zsh passes a trailing comment to the command as arguments")

    def test_the_skill_and_the_package_are_named_after_their_directories(self):
        declared = frontmatter(SKILL_FILE.read_text())
        manifest = json.loads((PLUGIN / ".claude-plugin/plugin.json").read_text())
        self.assertEqual(declared["name"], SKILL.name)
        self.assertEqual(manifest["name"], PLUGIN.name)

    def test_the_catalog_installs_the_package_under_its_manifest_name(self):
        catalog = json.loads((ROOT / ".claude-plugin/marketplace.json").read_text())
        sources = {plugin["name"]: plugin["source"] for plugin in catalog["plugins"]}
        self.assertEqual(sources.get(PLUGIN.name), f"./{PLUGIN.relative_to(ROOT).as_posix()}")

    def test_the_skill_description_fits_what_hosts_accept(self):
        declared = frontmatter(SKILL_FILE.read_text())
        self.assertLessEqual(len(declared["description"]), DESCRIPTION_LIMIT)

    def test_the_stops_and_gates_come_before_the_detail(self):
        lines = SKILL_FILE.read_text().splitlines()
        self.assertLess(len(lines), SKILL_LINE_LIMIT)
        headings = {line: number for number, line in enumerate(lines, start=1) if line.startswith("## ")}
        for heading in ("## Stop and report", "## Ask and wait"):
            with self.subTest(heading=heading):
                self.assertLess(headings[heading], STOPS_AND_GATES_BY_LINE)

    def test_every_file_the_package_readme_links_exists(self):
        linked = RELATIVE_LINK.findall((PLUGIN / "README.md").read_text())
        self.assertTrue(linked)
        for path in linked:
            with self.subTest(path=path):
                self.assertTrue((PLUGIN / path).exists())

    def test_the_recycling_reference_says_what_retiring_a_slot_means(self):
        reference = (SKILL / "references/recycling.md").read_text()
        for rule in RETIREMENT_RULES:
            with self.subTest(rule=rule):
                self.assertTrue(rule in reference, f"the retirement rule lost: {rule}")

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
