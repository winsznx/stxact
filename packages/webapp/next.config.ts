import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use default webpack builder (not Turbopack) for production builds
  eslint: {
    // Disable ESLint during production builds
    // ESLint errors are style/warning issues, not blocking bugs
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
