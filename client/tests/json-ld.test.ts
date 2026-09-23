import { describe, it, expect } from "vitest";
import { jsonLd } from "../lib/json-ld";

describe("jsonLd safe serializer", () => {
  it("produces valid JSON for plain objects", () => {
    expect(JSON.parse(jsonLd({ a: 1, b: "x" }))).toEqual({ a: 1, b: "x" });
  });

  it("neutralises a </script> breakout in admin-authored strings", () => {
    const out = jsonLd({ headline: "</script><img src=x onerror=alert(1)>" });
    // The raw closing tag must never survive into the serialized string.
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<img");
    // Escaped forms are valid JSON and round-trip to the original text.
    expect(JSON.parse(out).headline).toBe("</script><img src=x onerror=alert(1)>");
    expect(out).toContain("\\u003c");
    expect(out).toContain("\\u003e");
  });

  it("escapes ampersands too", () => {
    expect(jsonLd({ s: "a & b" })).toContain("\\u0026");
  });
});
