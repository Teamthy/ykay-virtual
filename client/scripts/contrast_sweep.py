#!/usr/bin/env python3
"""One-time, idempotent migration of legacy Tailwind brand classes to the reference palette.

Run from the client directory with `python3 scripts/contrast_sweep.py`. The
literal replacements cover styles in pages, reusable components and features;
run `python3 scripts/contrast_audit.py` afterwards to review nested surfaces.
No text colours are inferred from their *ancestors* by this script: those need
human review (a pale card inside a dark section is not itself a dark surface).
"""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PATHS = [ROOT / sub for sub in ("app", "components", "features")]

# Keep these as exact values, rather than aliases for the old palette. The
# remaining brand-* aliases in tailwind.config.ts are for third-party/legacy UI.
SURFACES = {
    "primary": "[#D6FF57]", "primary-hover": "[#C8F030]",
    "primary-dark": "[#0F2A1A]", "primary-light": "[#F9F6ED]",
    "brand-green": "[#D6FF57]", "brand-green-hover": "[#C8F030]",
    "brand-green-dark": "[#0F2A1A]", "brand-green-light": "[#F9F6ED]",
    "brand-gold": "[#D6FF57]", "brand-gold-hover": "[#C8F030]",
    "brand-gold-dark": "[#0F2A1A]", "brand-gold-light": "[#F9F6ED]",
    "brand-navy": "[#0F2A1A]", "brand-navy-dark": "[#0F2A1A]",
    "brand-blue": "[#0F2A1A]", "brand-blue-dark": "[#0F2A1A]",
    "brand-blue-light": "[#F9F6ED]",
    "brand-deep-green": "[#0F2A1A]", "brand-deep-green-light": "[#0F2A1A]",
    "deep-green": "[#0F2A1A]", "deep-green-light": "[#0F2A1A]",
    "deep": "[#0F2A1A]", "deep-light": "[#0F2A1A]", "deep-dark": "[#0F2A1A]",
    "peach": "[#F9F6ED]", "peach-dark": "[#F9F6ED]",
    "surface-muted": "[#F9F6ED]", "surface": "white", "surface-white": "white",
    "ink-50": "[#F9F6ED]", "ink-100": "[#F9F6ED]",
    "ink-200": "[#F9F6ED]", "ink-800": "[#0F2A1A]",
    "ink-900": "[#0F2A1A]", "ink-950": "[#0F2A1A]",
}
TEXT = {
    "brand-navy": "[#0F2A1A]", "brand-navy-dark": "[#0F2A1A]",
    "brand-blue": "[#0F2A1A]", "brand-blue-dark": "[#0F2A1A]",
    "brand-gold": "[#0F2A1A]", "brand-gold-dark": "[#0F2A1A]",
    "brand-green": "[#0F2A1A]", "brand-green-dark": "[#0F2A1A]",
    "primary": "[#0F2A1A]", "primary-dark": "[#0F2A1A]",
    "deep": "[#0F2A1A]", "deep-light": "[#0F2A1A]", "deep-dark": "[#0F2A1A]",
    "deep-green": "[#0F2A1A]", "deep-green-light": "[#0F2A1A]",
    "ink-950": "[#0F2A1A]", "ink-900": "[#0F2A1A]",
    "ink-800": "[#0F2A1A]/85", "ink-700": "[#0F2A1A]/75",
    "ink-600": "[#0F2A1A]/70", "ink-500": "[#0F2A1A]/65",
    "ink-400": "[#0F2A1A]/65", "ink-300": "[#0F2A1A]/65",
}
# The regex requires a whole Tailwind token and retains state prefixes,
# including focus:, hover:, group-hover/card:, dark: and placeholder:.
TOKEN = re.compile(r"(?<![\w\-/#])(?P<variant>(?:[\w/\[\]#.-]+:)*)"
                   r"(?P<kind>bg|text|border|ring|from|via|to)-"
                   r"(?P<name>[a-z][\w-]*)(?P<opacity>/\d+)?(?![\w-])")
HEX = {
    "#013920": "#0F2A1A", "#0A4D32": "#0F2A1A", "#002A18": "#0F2A1A",
    "#0A1F44": "#0F2A1A", "#141C2E": "#0F2A1A", "#0B1220": "#0F2A1A",
    "#70F250": "#D6FF57", "#4CCB31": "#D6FF57", "#5FE63F": "#C8F030",
    "#DFFFF2": "#F9F6ED", "#FFF7E4": "#F9F6ED",
    "#F8EBCF": "#F9F6ED", "#FFFEF8": "#F9F6ED",
    "#D9F1C6": "#D6FF57",
}

def migrate(source: str) -> str:
    # Use ink, not lime, for type on the legacy green/cream *light* surfaces.
    source = re.sub(r"(?i)(?P<start>text-\[)#(?:4ccb31|70f250|5fe63f)(?P<end>\])",
                    r"\g<start>#0F2A1A\g<end>", source)
    for old, new in HEX.items():
        source = re.sub(re.escape(old), new, source, flags=re.IGNORECASE)

    def replace(match: re.Match[str]) -> str:
        variant, kind, name, opacity = match.group("variant", "kind", "name", "opacity")
        if kind in ("bg", "from", "via", "to"):
            value = SURFACES.get(name)
        elif kind == "text":
            value = TEXT.get(name)
        elif kind in ("border", "ring") and re.fullmatch(r"ink-\d+", name):
            value = "black/10" if kind == "border" else "black/10"
        elif kind in ("border", "ring"):
            value = SURFACES.get(name)
        else:
            value = None
        if not value:
            return match.group(0)
        # text-ink-700/80 shouldn't become /75/80. Existing explicit opacity
        # wins over the default, except that faint type on a light card should
        # still be readable; a later contrast review handles dark ancestors.
        if opacity and "/" in value:
            if kind in ("border", "ring"):
                opacity = ""  # a subtle 10% border is intentional
            else:
                value = value.split("/")[0]
        return f"{variant}{kind}-{value}{opacity or ''}"

    return TOKEN.sub(replace, source)

if __name__ == "__main__":
    changed = 0
    for folder in PATHS:
        for path in sorted(folder.rglob("*.tsx")):
            before = path.read_text()
            after = migrate(before)
            if after != before:
                path.write_text(after)
                changed += 1
    print(f"Migrated {changed} TSX files (idempotent).")
