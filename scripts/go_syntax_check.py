#!/usr/bin/env python3
"""Go syntax gate (no Go toolchain in sandbox): parse every .go file with
tree-sitter and fail on ERROR/MISSING nodes."""
import sys
from pathlib import Path

from tree_sitter import Language, Parser
import tree_sitter_go

parser = Parser(Language(tree_sitter_go.language()))

errors = 0
files = 0
for path in sorted(Path(".").rglob("*.go")):
    if "node_modules" in path.parts or ".git" in path.parts:
        continue
    files += 1
    src = path.read_bytes()
    tree = parser.parse(src)
    stack = [tree.root_node]
    bad = []
    while stack:
        node = stack.pop()
        if node.type == "ERROR" or node.is_missing:
            line = node.start_point[0] + 1
            snippet = src[node.start_byte:node.end_byte][:80].decode("utf-8", "replace")
            bad.append((line, node.type, snippet))
            if len(bad) >= 5:
                break
        stack.extend(node.children)
    if bad:
        errors += 1
        print(f"FAIL {path}")
        for line, ntype, snip in bad:
            print(f"    line {line}: {ntype}: {snip!r}")

print(f"parsed {files} files, {errors} with syntax errors")
sys.exit(1 if errors else 0)
