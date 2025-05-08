import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config, { isServer }) {
    // Ignore source map errors for Bootstrap
    if (!isServer) {
      config.plugins.push(
        new (require('webpack')).IgnorePlugin({
          resourceRegExp: /bootstrap\.min\.css\.map$/,
          contextRegExp: /node_modules/,
        })
      );
    }
    return config;
  },
};

export default nextConfig;
