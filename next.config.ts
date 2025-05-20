import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      config.ignoreWarnings = [
        (warning) =>
          typeof warning.message === "string" &&
          warning.message.includes("bootstrap.min.css.map"),
      ];
    }
    return config;
  }
};

export default nextConfig;
