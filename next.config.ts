import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/index",
        destination: "/workshop",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
