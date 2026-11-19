import { SITE, indexablePages, shortTitle } from '@/lib/seo/site-pages';

// /llms.txt (https://llmstxt.org): a plain list of the guides and free tools with one line each, so AI answer engines can
// find and quote them. Built from each page's own title and meta description, so it never drifts from the pages.
export function buildLlmsTxt(): string {
  const pages = indexablePages();
  const line = (p: (typeof pages)[number]) => `- [${shortTitle(p.title)}](${SITE}${p.path}): ${p.description}`;
  const guides = pages.filter((p) => p.section === 'guides' && !p.hub);
  const tools = pages.filter((p) => p.section === 'tools' && !p.hub);
  const videos = pages.filter((p) => p.section === 'videos' && !p.hub);
  return [
    '# Biggify',
    '',
    '> Free, plain-English guides and tools for owners of local trade and home-service businesses (plumbers, HVAC, electricians, roofers and more): Google Business Profile, Google reviews, missed calls, websites and the scams aimed at owners. Written by Wyatt Brunderman, founder of Biggify, Port Charlotte, FL.',
    '',
    'Biggify builds websites, works Google profiles, runs review requests and social posts, and offers an AI receptionist that answers the calls an owner misses. Phone: (941) 401-8288. Every guide is free to read with no sign-up; some playbooks ask for an email.',
    '',
    `## Guides`,
    '',
    `- [All guides](${SITE}/guides): every guide in one place.`,
    ...guides.map(line),
    '',
    '## Free tools and playbooks',
    '',
    `- [All free tools](${SITE}/tools): every free tool in one place.`,
    ...tools.map(line),
    '',
    '## Videos, written out',
    '',
    `- [All videos](${SITE}/videos): every Biggify video written out as a page, by topic.`,
    ...videos.map(line),
    '',
    '## About',
    '',
    `- [Biggify home](${SITE}/): what Biggify does for trade businesses and the plans.`,
    `- [How it works](${SITE}/how-it-works): how Biggify sets up and runs a client's marketing.`,
    `- [Biggify Partners](${SITE}/partners): businesses that know trade owners get paid for each one they send who signs on.`,
    '',
  ].join('\n');
}
