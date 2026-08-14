/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained server build for the Docker image (Phase 40).
  output: "standalone",
  // Monorepo root (Go + client) — silences multi-lockfile inference (Next 15).
  outputFileTracingRoot: require("path").join(__dirname, ".."),
  // Dev-mode webpack pack-file cache allocates very large gzip buffers while
  // serializing on constrained machines (Windows dev + Docker running →
  // "Array buffer allocation failed" / heap OOM crashes in `next dev`).
  // Disable the persistent cache in dev; production builds keep it.
  // Parallelism is bounded for production builds too: constrained hosts
  // (2GB sandboxes/CI, small VMs) SIGBUS/OOM when jest-worker + static-gen
  // workers multiply peak memory.
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    config.parallelism = 1;
    return config;
  },
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  // Constrained hosts (2GB sandboxes, small VMs) OOM during next build's
  // duplicate type-check pass. CI's frontend job runs `npx tsc --noEmit`
  // BEFORE the build as the authoritative gate, so the in-build duplicate
  // check and lint pass are skipped here deliberately.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" }
    ]
  },
  async redirects() {
    return [
      // Healthcare offering retired (Batch 2) — old links land on the
      // closest live offering instead of a 404.
      { source: "/healthcare", destination: "/digital-skills", permanent: true },
    ];
  },
  async rewrites() {
    // Browser-side /api/v1 calls are proxied to the API server. Point
    // API_PROXY_TARGET at the API in production deployments.
    const target = process.env.API_PROXY_TARGET || "http://localhost:8080";
    return [{ source: "/api/v1/:path*", destination: `${target}/api/v1/:path*` }];
  }
};

module.exports = nextConfig;
