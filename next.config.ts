import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  basePath: "/eval-lens",
  output: "standalone",
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
