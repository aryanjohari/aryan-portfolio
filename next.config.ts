import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/index",
        destination: "/",
        permanent: true,
      },
      {
        source: "/workshop",
        destination: "/",
        permanent: true,
      },
      {
        // Temporary, so links to /cv always follow wherever the current CV lives.
        source: "/cv",
        destination: "/resume.pdf",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
