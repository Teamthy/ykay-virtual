/** @type {import('next').NextConfig} */
const path = require("path");

// Vercel builds the client with Root Directory = client. On Vercel we want
// a STANDARD build: no standalone output (Vercel serves .next itself and
// standalone + outputFileTracingRoot across the monorepo boundary is the
// classic source of "Application error" on Vercel), and default worker
// parallelism (Vercel build machines have real memory). The constrained-
// host workarounds below stay ON for local dev, the sandbox and CI.
const isVercel = !!process.env.VERCEL;

const nextConfig = {
  reactStrictMode: true,
  // Self-contained server build for the Docker image (Phase 40) — skipped
  // on Vercel, which does not need it.
  ...(isVercel
    ? {}
    : {
        output: "standalone",
        // Monorepo root (Go + client) — silences multi-lockfile inference (Next 15).
        outputFileTracingRoot: path.join(__dirname, ".."),
      }),
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
    if (!isVercel) {
      config.parallelism = 1;
    }
    return config;
  },
  ...(isVercel
    ? {}
    : {
        experimental: {
          workerThreads: false,
          cpus: 1,
        },
      }),
  // Constrained hosts (2GB sandboxes, small VMs) OOM during next build's
  // duplicate type-check pass. CI's frontend job runs `npx tsc --noEmit`
  // BEFORE the build as the authoritative gate, so the in-build duplicate
  // check and lint pass are skipped here deliberately.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    // A-23: tutor avatars and uploaded content are served from the S3/CDN
    // origin (and, soon, arbitrary tutor photo hosts). The previous list
    // allowed ONLY images.unsplash.com, so any next/image pointing at a
    // real avatar/upload would 400 at runtime. `**` permits any https host;
    // if you later want to lock this down, replace it with your exact CDN
    // hostname(s) (e.g. { hostname: "cdn.nuvora.com" }).
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**" }
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
