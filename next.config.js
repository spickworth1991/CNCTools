/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: true, // Ensure compatibility with Next.js 15
  },
};

module.exports = nextConfig;
