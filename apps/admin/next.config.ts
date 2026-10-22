import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/admin",
  reactCompiler: true,
  transpilePackages: ["@repo/ui"],
  async redirects() {
    return [{
      source: "/",
      destination: "/admin/student-verifications",
      permanent: false,
      basePath: false
    }];
  }
};

export default nextConfig;
