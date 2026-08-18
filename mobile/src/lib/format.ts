// Pure formatting helpers for the mobile app — kept dependency-free so they can
// be unit-tested in Node without loading Expo/React Native modules.

export function formatNaira(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

export function formatRating(avg: number, count: number): string {
  if (count === 0) return "No reviews yet";
  return `${avg.toFixed(1)}★ · ${count} review${count === 1 ? "" : "s"}`;
}

export function formatDate(iso: string): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "-";
  }
}

export function formatDateTime(iso: string): string {
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

export function slugToTitle(slug: string): string {
  if (!slug) return "";
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
