// Types for build-video-pages.mjs (used by tests/video-pages.test.ts).
export type VideoConfig = { youtube: Record<string, { id: string; uploaded?: string; title?: string }>; draft: Record<string, string> };
export type VideoPage = { slug: string; kind: 'video' | 'guide'; path: string; title: string; description: string; topic?: string; scripts?: string[]; faq?: [string, string][]; file: string };
export const TOPICS: [string, string, string][];
export function parseVideoConfig(source: string): VideoConfig;
export function build(opts?: { write?: boolean; config?: VideoConfig }): { files: Map<string, string>; pages: VideoPage[]; live: VideoPage[]; drafts: VideoPage[]; guides: VideoPage[] };
export const SITE: string;
export const BYLINE: string;
export const ORGANIZATION: Record<string, unknown>;
export const PERSON: Record<string, unknown>;
export const WEBSITE: Record<string, unknown>;
export function pageTitle(title: string, file?: string): string;
