import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
