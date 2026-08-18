// Plain-JS mirror of format.ts for Node unit tests (no TS loader needed).

export function formatNaira(amount) {
  const n = Number.isFinite(amount) ? amount : 0;
  return `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

export function formatRating(avg, count) {
  if (count === 0) return "No reviews yet";
  return `${avg.toFixed(1)}★ · ${count} review${count === 1 ? "" : "s"}`;
}

export function formatDate(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "-";
  }
}

export function formatDateTime(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      weekday: "short", day: "numeric", month: "short",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

export function slugToTitle(slug) {
  if (!slug) return "";
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
