import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NUVORA",
    short_name: "NUVORA",
    description:
      "British & Nigerian curriculum learning, examination preparation and expert private tuition online.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#013920",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Find a programme", url: "/programmes", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Book private tuition", url: "/private-tuition", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
