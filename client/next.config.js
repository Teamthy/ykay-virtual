/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
