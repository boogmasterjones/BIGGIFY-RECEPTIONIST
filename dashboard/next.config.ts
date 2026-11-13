import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The guides, playbooks and free tools are plain pages in public/guides and public/tools (owner 2026-11-13). A folder address
  // like /guides/still-no-calls opens that folder's index.html. These run after real files, so /tools/config.js still loads.
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        { source: "/guides", destination: "/guides/index.html" },
        { source: "/guides/:slug", destination: "/guides/:slug/index.html" },
        { source: "/tools", destination: "/tools/index.html" },
        { source: "/tools/:slug", destination: "/tools/:slug/index.html" },
      ],
      fallback: [],
    };
  },
};

export default nextConfig;
