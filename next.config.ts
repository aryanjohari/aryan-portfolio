import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/index",
        destination: "/projects",
        permanent: true,
      },
      {
        source: "/workshop",
        destination: "/projects",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
