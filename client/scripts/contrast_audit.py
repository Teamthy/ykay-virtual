#!/usr/bin/env python3
"""Fail on high-confidence same-element foreground/background collisions in TSX.

Inspects string literals (including conditional className branches), not entire
source lines. A nested dark section can contain a white card, so background
classes from separate elements must never be combined. Run after colour edits.
"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
STRINGS = re.compile(r'"(?P<value>(?:\\.|[^"\\])*)"', re.S)
TEMPLATES = re.compile(r'`([^`]*)`', re.S)
CLASSES = re.compile(r'(?<!\S)(?:(?:[\w/-]+):)*(?:bg|text)-(?:\[#(?:[0-9A-Fa-f]{6})\]|white|black)(?:/\d+)?(?=\s|$)')


def colour(token: str):
    # State modifiers are handled separately; text/ backgrounds must be in
    # the same pseudo state to count as a direct collision.
    bits = token.split(":")
    name = bits[-1]
    state = ":".join(bits[:-1])
    kind, value = name.split("-", 1)
    if kind == "bg" and re.search(r"/(?!100(?:$|\D))\d+", value):
        return state, kind, "TRANSLUCENT"  # underlying surface determines contrast
    value = value.split("/")[0].strip("[]").upper()
    if value == "WHITE": value = "#FFFFFF"
    if value == "BLACK": value = "#0F2A1A"  # Tailwind black is brand dark
    return state, kind, value


def problems(value: str):
    classes = [colour(c.group()) for c in CLASSES.finditer(value)]
    for state in set(s for s, _, _ in classes):
        bg = [v for s, k, v in classes if s == state and k == "bg"]
        fg = [v for s, k, v in classes if s == state and k == "text"]
        for b in bg:
            for f in fg:
                if b in {"#FFFFFF", "#F9F6ED", "#D6FF57", "#0F2A1A"} and (
                    (b == "#0F2A1A" and f == "#0F2A1A") or
                    (b != "#0F2A1A" and f == "#FFFFFF")
                ):
                    yield f"{state or 'base'}: {b} background / {f} text"


if __name__ == "__main__":
    found = []
    for folder in ("app", "components", "features"):
        for path in (ROOT / folder).rglob("*.tsx"):
            source = path.read_text()
            literals = list(STRINGS.finditer(source)) + [
                m for m in TEMPLATES.finditer(source) if "${" not in m.group(1)
            ]
            for match in literals:
                value = match.group("value") if match.re is STRINGS else match.group(1)
                # Check only class-like strings, excluding path names / copy.
                if "bg-" not in value:
                    continue
                for reason in problems(value):
                    line = source.count("\n", 0, match.start()) + 1
                    found.append(f"{path.relative_to(ROOT)}:{line}: {reason}")
    if found:
        print("\n".join(found))
        print(f"{len(found)} definite class-string contrast collision(s)")
        sys.exit(1)
    print("No direct foreground/background collisions in TSX class strings.")
