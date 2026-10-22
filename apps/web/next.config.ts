import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    const adminOrigin = process.env.STUDENTSAVE_ADMIN_URL || "http://localhost:3003";
    return [
      { source: "/admin", destination: `${adminOrigin}/admin` },
      { source: "/admin/:path*", destination: `${adminOrigin}/admin/:path*` }
    ];
  }
};

export default nextConfig;
