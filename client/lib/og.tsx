import { ImageResponse } from "next/og";

/**
 * Branded Open Graph share-card factory (1200×630) — YK-Virtual.
 *
 * Deep brand green, bright primary accent, bold caps. Rendered at build
 * time by app/opengraph-image.tsx and the per-route cards; WhatsApp and
 * iMessage previews are the #1 referral channel, so every key route ships
 * a card.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

export async function brandCard({
  eyebrow,
  title,
  subtitle,
  footer = "virtual.ykaycollege.com",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  footer?: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#013920",
          padding: "72px 80px",
        }}
      >
        {/* top row: brand + eyebrow */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 999,
                backgroundColor: "#70f250",
                display: "flex",
              }}
            />
            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: 6,
                color: "#ffffff",
              }}
            >
              YK-VIRTUAL
            </div>
          </div>
          <div style={{ fontSize: 22, letterSpacing: 4, color: "#9fd8b4", fontWeight: 700 }}>
            {eyebrow.toUpperCase()}
          </div>
        </div>

        {/* middle: the title */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: title.length > 24 ? 92 : 120,
              fontWeight: 800,
              lineHeight: 1.04,
              color: "#ffffff",
              display: "flex",
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div style={{ marginTop: 26, fontSize: 30, color: "#cdeed7", display: "flex" }}>
              {subtitle}
            </div>
          ) : null}
        </div>

        {/* bottom: accent rule + footer */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              width: 160,
              height: 10,
              backgroundColor: "#70f250",
              display: "flex",
              marginBottom: 24,
            }}
          />
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 3, color: "#9fd8b4" }}>
            {footer.toUpperCase()}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
