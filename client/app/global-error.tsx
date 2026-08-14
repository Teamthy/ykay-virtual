"use client";

// global-error — production error boundary (industry-standard chunk-load
// resilience): when a lazy chunk fails to load (e.g. a deploy while a user
// has an old tab open) the app shows a recoverable screen instead of a
// blank page. Must include its own <html>/<body> per Next.js.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Segoe UI, Helvetica, Arial, sans-serif" }}>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#FFFCF5",
            padding: 24,
          }}
        >
          <div style={{ maxWidth: 480, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 4, color: "#0A1F44" }}>
              NUVORA
            </div>
            <h1 style={{ fontSize: 22, color: "#111111", marginTop: 24 }}>
              Something went wrong
            </h1>
            <p style={{ color: "#6B6B6B", fontSize: 14, lineHeight: 1.6 }}>
              A page update may have been released while you were browsing.
              Reloading usually fixes this.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: "#F4B400",
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 24px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Reload page
              </button>
              <button
                onClick={reset}
                style={{
                  background: "transparent",
                  border: "1px solid #111111",
                  borderRadius: 12,
                  padding: "12px 24px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
            </div>
            {error.digest ? (
              <p style={{ color: "#999999", fontSize: 12, marginTop: 24 }}>Reference: {error.digest}</p>
            ) : null}
          </div>
        </main>
      </body>
    </html>
  );
}
