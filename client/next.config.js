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
  // Vercel production builds type-check. Constrained CI/sandbox hosts skip
  // the in-build pass because CI already ran `tsc --noEmit`.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: !isVercel },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.amazonaws.com" },
      { protocol: "https", hostname: "*.cloudfront.net" },
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
  },
  // ── Security headers applied to every response ──────────────
  // CSP is deliberately tolerant on media/frames: the LMS streams lesson
  // videos from teacher-chosen hosts and embeds meeting rooms (Zoom, Meet,
  // YouTube, Whereby...), so a tight allow-list would break live classes.
  // Everything else stays strict. Plausible analytics origins are only
  // allowed when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is configured.
  async headers() {
    const plausible = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN
      ? " https://plausible.io"
      : "";
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next.js needs inline scripts for hydration; plausible.io is
              // added only when analytics is configured.
              `script-src 'self' 'unsafe-inline'${plausible}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              // The API is same-origin (rewritten to the Go server), plus
              // websocket chat and plausible events when configured.
              `connect-src 'self' https: wss:${plausible}`,
              // Lesson videos come from teacher-chosen hosts.
              "media-src 'self' https: blob:",
              // Live classes embed meeting rooms on these hosts.
              "frame-src 'self' https://*.zoom.us https://*.google.com https://*.youtube.com https://*.youtube-nocookie.com https://*.whereby.com https://*.meet.jit.si https://teams.microsoft.com",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
