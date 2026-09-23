// Safe JSON-LD serializer for <script type="application/ld+json"> blocks.
//
// JSON.stringify does not escape "</script>", so admin-authored strings
// (blog titles, excerpts, FAQ answers) could terminate the script element and
// inject markup — an XSS surface even for trusted authors (defense-in-depth;
// also protects against a compromised admin session). Escape "<", ">" and "&"
// to their \uXXXX forms, which are valid inside JSON string literals and inert
// to the HTML parser.
export function jsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
