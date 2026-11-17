import { SITE } from './site';

// Who writes and publishes the guides and tools, the same on every page (owner 2026-11-16, SEO + GEO pass).
// Every page's JSON-LD carries these three nodes and points its author/publisher at them by @id.
// sameAs: add Biggify's real profile links (Google Business Profile, Facebook, YouTube...) here once the owner confirms them.

export const ORG_ID = `${SITE}/#org`;
export const PERSON_ID = `${SITE}/#wyatt`;
export const WEBSITE_ID = `${SITE}/#website`;

export const ORGANIZATION = {
  '@type': 'Organization',
  '@id': ORG_ID,
  name: 'Biggify',
  legalName: 'Biggify LLC',
  url: `${SITE}/`,
  logo: { '@type': 'ImageObject', url: `${SITE}/LOGO.png` },
  telephone: '+1-941-401-8288',
  address: { '@type': 'PostalAddress', addressLocality: 'Port Charlotte', addressRegion: 'FL', addressCountry: 'US' },
  founder: { '@id': PERSON_ID },
  // Biggify's own Facebook page (found 2026-11-16 in "Pages you manage"). Biggify has no Google Business Profile yet.
  sameAs: ['https://www.facebook.com/profile.php?id=61596442231096'],
} as const;

export const PERSON = {
  '@type': 'Person',
  '@id': PERSON_ID,
  name: 'Wyatt Brunderman',
  jobTitle: 'Founder',
  description: 'Founder of Biggify in Port Charlotte, FL. Runs Google profiles, reviews and phones for trade businesses.',
  worksFor: { '@id': ORG_ID },
} as const;

export const WEBSITE = { '@type': 'WebSite', '@id': WEBSITE_ID, url: `${SITE}/`, name: 'Biggify', publisher: { '@id': ORG_ID }, inLanguage: 'en-US' } as const;

/** The byline shown under every guide's H1 (the same words as the schema). */
export const BYLINE = 'By Wyatt, founder of Biggify, Port Charlotte FL';

/** Cuts text to at most max characters at a word boundary (no ellipsis; Google shows its own). */
export function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const sentence = t.slice(0, max + 1).match(/^.*[.!?](?=\s)/)?.[0];
  if (sentence && sentence.length >= max * 0.6) return sentence;
  return t.slice(0, max + 1).replace(/\s+\S*$/, '').replace(/[,;:\s-]+$/, '');
}

/** The <title>: "Title | Biggify" when it fits in 60 characters, else the title alone (cut to 60 if it must be). */
export function pageTitle(title: string): string {
  const withBrand = `${title} | Biggify`;
  return withBrand.length <= 60 ? withBrand : clip(title, 60);
}

/** The meta description: 155 characters at most. */
export const metaDescription = (description: string) => clip(description, 155);
