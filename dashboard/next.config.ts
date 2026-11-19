import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

// --- Video links (owner 2026-11-16) ---------------------------------------------------------------------------------------------------
// One short address per YouTube video (gobiggify.com/100-calls), listed in public/tools/videos.js: the trial page reads the same file
// in the browser for the offer text, so the list lives in one place. Each address redirects to the free trial page with the tags that
// carry the source to Hubert's trial record. Redirects run before proxy.ts, so the login check never sees these addresses.
// (Kept in this file: next.config.ts is compiled on its own and cannot import other TypeScript files.)

export type VideoLink = { title: string; offer: string; offerText: string };

/** The part of videos.js after "window.BIGGIFY_VIDEOS =", parsed as JSON and checked. Throws on anything malformed (the build fails loudly). */
export function parseVideoLinks(source: string): Record<string, VideoLink> {
  const m = /window\.BIGGIFY_VIDEOS\s*=\s*(\{[\s\S]*\})\s*;?\s*$/.exec(source);
  if (!m) throw new Error('videos.js: expected "window.BIGGIFY_VIDEOS = { ... };" at the end of the file');
  const parsed = JSON.parse(m[1]) as Record<string, Partial<VideoLink>>;
  const out: Record<string, VideoLink> = {};
  for (const [slug, v] of Object.entries(parsed)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 60) throw new Error(`videos.js: bad slug "${slug}" (lowercase letters, digits and dashes)`);
    if (!v || typeof v.title !== "string" || typeof v.offer !== "string" || typeof v.offerText !== "string") throw new Error(`videos.js: "${slug}" needs title, offer and offerText`);
    if (/\$\s*\d/.test(v.offerText) || /\$\s*\d/.test(v.title)) throw new Error(`videos.js: "${slug}" shows a price; the page must not`);
    out[slug] = { title: v.title, offer: v.offer, offerText: v.offerText };
  }
  return out;
}

export function readVideoLinks(): Record<string, VideoLink> {
  return parseVideoLinks(readFileSync(join(__dirname, "public", "tools", "videos.js"), "utf8"));
}

/** Where a video link sends the viewer: the trial page, tagged so the source survives every page they open and the form they send. */
export function videoDestination(slug: string): string {
  const q = new URLSearchParams({ src: `yt-${slug}`, utm_source: "youtube", utm_medium: "video", utm_campaign: slug });
  return `/tools/trial?${q.toString()}`;
}

// Not permanent: a video's offer can change, and browsers keep permanent redirects for good.
export const videoRedirects = (links: Record<string, VideoLink>) => Object.keys(links).map((slug) => ({ source: `/${slug}`, destination: videoDestination(slug), permanent: false }));

const nextConfig: NextConfig = {
  async redirects() {
    return videoRedirects(readVideoLinks());
  },
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
        // The free video pages, built from content/video-pages by scripts/build-video-pages.mjs (npm run videos; also prebuild).
        { source: "/videos", destination: "/videos/index.html" },
        { source: "/videos/:slug", destination: "/videos/:slug/index.html" },
        // The Biggify Partners sign-up page (owner 2026-11-18), a plain page in public/partners.
        { source: "/partners", destination: "/partners/index.html" },
      ],
      fallback: [],
    };
  },
};

export default nextConfig;
