/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained server build for the Docker image (Phase 40).
  output: "standalone",
  // Monorepo root (Go + client) — silences multi-lockfile inference (Next 15).
  outputFileTracingRoot: require("path").join(__dirname, ".."),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" }
    ]
  },
  async rewrites() {
    // Browser-side /api/v1 calls are proxied to the API server. Point
    // API_PROXY_TARGET at the API in production deployments.
    const target = process.env.API_PROXY_TARGET || "http://localhost:8080";
    return [{ source: "/api/v1/:path*", destination: `${target}/api/v1/:path*` }];
  }
};

module.exports = nextConfig;
