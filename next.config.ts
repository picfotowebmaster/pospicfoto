import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  deploymentId:
    process.env.NEXT_DEPLOYMENT_ID ||
    process.env.DEPLOY_ID ||
    process.env.COMMIT_REF ||
    undefined,
  experimental: {
    agentUpgrade: "security",
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
