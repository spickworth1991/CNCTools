/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true, // Helps with highlighting React best practices
  swcMinify: true,       // Enables faster builds and smaller bundles
  experimental: {
    appDir: true,         // Enables experimental app directory (if using it)
  },
  images: {
    domains: ["example.com"], // Add external image domains if needed
  },
  eslint: {
    ignoreDuringBuilds: true, // Allows builds to proceed even with ESLint errors
  },
  typescript: {
    ignoreBuildErrors: true, // Allows builds to proceed even with TypeScript errors
  },
};

module.exports = nextConfig;
