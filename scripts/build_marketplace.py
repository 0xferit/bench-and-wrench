"""Derive the Codex marketplace from the Claude catalog and README title."""

import argparse
import json
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]


def build(root, check=False):
    source = json.loads((root / ".claude-plugin/marketplace.json").read_text())
    heading = (root / "README.md").read_text().splitlines()[0]
    if not heading.startswith("# "):
        raise ValueError("README.md must start with the marketplace title")
    catalog = {
        "name": source["name"],
        "interface": {"displayName": heading.removeprefix("# ")},
        "plugins": [
            {
                **plugin,
                "policy": {"installation": "AVAILABLE", "authentication": "ON_INSTALL"},
                "category": plugin.get("category", "Productivity"),
            }
            for plugin in source["plugins"]
        ],
    }
    content = json.dumps(catalog, indent=2, ensure_ascii=False) + "\n"
    output = root / ".agents/plugins/marketplace.json"
    if check:
        if not output.is_file() or output.read_text() != content:
            raise ValueError("Codex marketplace is out of date; run python3 -B scripts/build_marketplace.py")
        print("Codex marketplace matches the source catalog")
        return
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(content)
    print(f"Built Codex marketplace with {len(catalog['plugins'])} plugin(s)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Check the generated catalog without changing it")
    arguments = parser.parse_args()
    try:
        build(ROOT, check=arguments.check)
    except (OSError, ValueError, KeyError, IndexError) as error:
        sys.exit(f"Marketplace build failed: {error}")
