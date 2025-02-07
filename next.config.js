/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true, // Helps with highlighting React best practices
  eslint: {
    ignoreDuringBuilds: true, // Allows builds to proceed even with ESLint errors
  },
  typescript: {
    ignoreBuildErrors: true, // Allows builds to proceed even with TypeScript errors
  },
};

module.exports = nextConfig;
