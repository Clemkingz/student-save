import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@repo/ui"],
  async redirects() {
    return [
      { source: "/app", destination: "/", permanent: false },
      { source: "/app/:path+", destination: "/:path+", permanent: false },
    ];
  },
};

export default nextConfig;
