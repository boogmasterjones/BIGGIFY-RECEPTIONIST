/**
 * "New guide": builds a new guide page in the same design as the existing ones, and adds its card to the guides page.
 *
 * The shared parts (site header, footer, share buttons, "More guides" cards, the offer blocks at the end) are copied
 * from an existing guide at the moment the new one is made, so a new guide always matches the current design. The
 * owner fills in a title, topic, short description, intro and sections; everything he types is escaped (plain text,
 * with blank lines for paragraphs and "- " lines for bullet points). After that the guide is edited like any other.
 */
import { parseDoc, type P5El } from './htmldoc';
import { EditorError, SLUG_RE, slugify } from './paths';
import { escapeAttr, escapeText, plainText } from './sanitize';
import { BYLINE, ORGANIZATION, ORG_ID, PERSON, PERSON_ID, WEBSITE, WEBSITE_ID, clip, metaDescription, pageTitle } from '@/lib/seo/entities';
import { SITE } from '@/lib/seo/site';

export interface NewGuideInput {
  title: string;
  slug?: string;
  topic: string;
  description: string;
  intro: string;
  sections: { heading: string; body: string }[];
}

export interface CleanGuide {
  title: string;
  slug: string;
  topic: string;
  description: string;
  intro: string;
  sections: { heading: string; body: string; id: string }[];
}

export const MAX_SECTIONS = 20;

export function cleanGuideInput(input: NewGuideInput, existingSlugs: string[]): CleanGuide {
  const title = plainText(input?.title ?? '', 150);
  if (title.length < 5) throw new EditorError('Give the guide a title (at least a few words).');
  const slug = (input.slug ? slugify(input.slug) : slugify(title)) || 'guide';
  if (!SLUG_RE.test(slug)) throw new EditorError('That web address has characters it can’t use. Letters, numbers and dashes only.');
  if (existingSlugs.includes(slug)) throw new EditorError(`There is already a guide at /guides/${slug}. Change the title or the web address.`);
  const topic = plainText(input.topic ?? '', 40) || 'Guide';
  const description = plainText(input.description ?? '', 300);
  if (description.length < 20) throw new EditorError('Add a short description (one or two sentences). It shows on the guides page and in Google.');
  const intro = plainText(input.intro ?? '', 1200);
  const raw = Array.isArray(input.sections) ? input.sections.slice(0, MAX_SECTIONS) : [];
  const used = new Set<string>(['main', 'next-steps', 'more', 'faq']);
  const sections = raw
    .map((s) => ({ heading: plainText(s?.heading ?? '', 150), body: String(s?.body ?? '').slice(0, 20_000) }))
    .filter((s) => s.heading || s.body.trim())
    .map((s, i) => {
      let id = slugify(s.heading).slice(0, 40) || `part-${i + 1}`;
      while (used.has(id)) id += '-2';
      used.add(id);
      return { heading: s.heading || `Part ${i + 1}`, body: s.body, id };
    });
  if (!sections.length) throw new EditorError('Add at least one section with a heading and some text.');
  return { title, slug, topic, description, intro, sections };
}

/** Plain text → paragraphs and bullet lists. Everything is escaped. */
export function bodyToHtml(body: string, indent: string): string {
  const blocks = body.replace(/\r\n?/g, '\n').split(/\n\s*\n/);
  const out: string[] = [];
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (lines.every((l) => /^[-*•]\s+/.test(l))) {
      out.push(`${indent}<ul>`);
      for (const l of lines) out.push(`${indent}  <li>${escapeText(plainText(l.replace(/^[-*•]\s+/, ''), 2000))}</li>`);
      out.push(`${indent}</ul>`);
    } else {
      out.push(`${indent}<p>${lines.map((l) => escapeText(plainText(l, 4000))).join('<br>')}</p>`);
    }
  }
  return out.join('\n');
}

// ------------------------------------------------------------------------------------------------ template parts

const attr = (n: P5El, name: string) => n.attrs?.find((a) => a.name === name)?.value ?? null;
const hasClass = (n: P5El, c: string) => (attr(n, 'class') ?? '').split(/\s+/).includes(c);

function find(n: P5El, pred: (x: P5El) => boolean): P5El | null {
  if (n.tagName && pred(n)) return n;
  for (const c of n.childNodes ?? []) {
    const r = find(c, pred);
    if (r) return r;
  }
  return null;
}

function source(html: string, n: P5El | null): string {
  const l = n?.sourceCodeLocation;
  return l ? html.slice(l.startOffset, l.endOffset) : '';
}

export interface TemplateParts {
  header: string;
  footer: string;
  shareButtons: string;
  more: string;
  nextBlocks: string;
}

/** The shared pieces of an existing guide. Missing pieces come back empty (the new guide still works). */
export function templateParts(guideHtml: string): TemplateParts {
  const doc = parseDoc(guideHtml);
  const next = find(doc, (n) => hasClass(n, 'g-next'));
  const nextBlocks = next
    ? (next.childNodes ?? [])
        .filter((c) => c.tagName && (hasClass(c, 'g-next-tool') || hasClass(c, 'g-next-dfy') || hasClass(c, 'g-sign')))
        .map((c) => '        ' + source(guideHtml, c))
        .join('\n')
    : '';
  return {
    header: source(guideHtml, find(doc, (n) => n.tagName === 'header')),
    footer: source(guideHtml, find(doc, (n) => n.tagName === 'footer')),
    shareButtons: source(guideHtml, find(doc, (n) => hasClass(n, 'g-share-btns'))),
    more: source(guideHtml, find(doc, (n) => n.tagName === 'section' && hasClass(n, 'g-more'))),
    nextBlocks,
  };
}

const ld = (o: unknown) => JSON.stringify(o).replace(/</g, '\\u003c');

export function buildGuideHtml(g: CleanGuide, parts: TemplateParts, siteUrl = SITE): string {
  const url = `${siteUrl}/guides/${g.slug}`;
  const words = [g.intro, ...g.sections.map((s) => `${s.heading} ${s.body}`)].join(' ').split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(2, Math.ceil(words / 200));
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      // The same Biggify / Wyatt nodes as every other guide (SEO + GEO pass, owner 2026-11-16). No dates (owner rule).
      ORGANIZATION,
      PERSON,
      WEBSITE,
      {
        '@type': 'Article',
        '@id': `${url}#article`,
        headline: clip(g.title, 110),
        description: g.description,
        author: { '@id': PERSON_ID },
        publisher: { '@id': ORG_ID },
        image: `${siteUrl}/LOGO.png`,
        inLanguage: 'en-US',
        isPartOf: { '@id': WEBSITE_ID },
        mainEntityOfPage: url,
        breadcrumb: { '@id': `${url}#breadcrumb` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Biggify', item: `${siteUrl}/` },
          { '@type': 'ListItem', position: 2, name: 'Guides', item: `${siteUrl}/guides` },
          { '@type': 'ListItem', position: 3, name: g.title, item: url },
        ],
      },
    ],
  };
  const t = escapeText(g.title);
  const toc = g.sections.map((s) => `            <li><a href="#${s.id}">${escapeText(s.heading)}</a></li>`).join('\n');
  const sections = g.sections
    .map(
      (s, i) => `      <section id="${s.id}">
        <span class="g-kicker">${String(i + 1).padStart(2, '0')}</span>
        <h2>${escapeText(s.heading)}</h2>
${bodyToHtml(s.body, '        ') || '        <p>Write this part here.</p>'}
      </section>`,
    )
    .join('\n\n');
  const clock =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  const person =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeText(pageTitle(g.title))}</title>
<meta name="description" content="${escapeAttr(metaDescription(g.description))}" />
<link rel="canonical" href="${escapeAttr(url)}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Biggify" />
<meta property="og:title" content="${escapeAttr(g.title)}" />
<meta property="og:description" content="${escapeAttr(g.description)}" />
<meta property="og:url" content="${escapeAttr(url)}" />
<meta property="og:image" content="${siteUrl}/LOGO.png" />
<meta property="og:image:alt" content="Biggify logo" />
<meta name="twitter:card" content="summary" />
<link rel="icon" href="/LOGO.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&display=swap" />
<link rel="stylesheet" href="/tools/tools.css" />
<link rel="stylesheet" href="/guides/guide.css" />
<!-- Guides never show a date (owner rule). Made with the site editor. -->
<script type="application/ld+json">
${ld(schema)}
</script>
</head>
<body class="guide-page">
<a class="skip" href="#main">Skip to content</a>
<div class="g-progress" aria-hidden="true"><span></span></div>
${parts.header}

<main id="main">
<section class="g-hero">
  <div class="g-grain" aria-hidden="true"></div>
  <div class="wrap">
    <div>
      <nav class="g-crumbs" aria-label="Breadcrumb"><a href="/">Biggify</a><span aria-hidden="true">/</span><a href="/guides">Guides</a><span aria-hidden="true">/</span><span>${t}</span></nav>
      <span class="g-chip"><i></i>${escapeText(g.topic)}</span>
      <h1>${t}</h1>
      <p class="g-lead">${escapeText(g.intro || g.description)}</p>
      <div class="g-meta">
        <span>${clock}${minutes} min read</span>
        <span>${person}${BYLINE}</span>
      </div>
    </div>
  </div>
</section>

<div class="wrap">
  <div class="g-layout">
    <aside class="g-rail">
      <div class="g-rail-inner">
        <details class="g-toc" open>
          <summary>In this guide</summary>
          <ol>
${toc}
          </ol>
        </details>
      </div>
    </aside>

    <article class="g-article">

${sections}
${
  parts.shareButtons
    ? `
      <div class="g-share">
        <div><b>Know an owner who could use this?</b><p>Send them this guide.</p></div>
        ${parts.shareButtons}
      </div>
`
    : ''
}
      <div class="g-end g-next" id="next-steps">
        <h2>Your next steps</h2>
${parts.nextBlocks}
      </div>

    </article>
  </div>
${parts.more ? `\n  ${parts.more}\n` : ''}</div>
</main>

${parts.footer}
<script src="/guides/guide.js" defer></script>
</body>
</html>
`;
}

export const CARD_MARKER = '<!-- GUIDE-CARDS: new guides go here -->';

/** Add the new guide's card to the guides page (before the marker, or at the end of the first list of cards). */
export function addCardToIndex(indexHtml: string, g: Pick<CleanGuide, 'slug' | 'topic' | 'title' | 'description'>): string {
  const card =
    `<a class="g-card" href="/guides/${g.slug}"><span class="g-tag">${escapeText(g.topic)}</span><h3>${escapeText(g.title)}</h3>` +
    `<p>${escapeText(g.description)}</p><span class="g-go">Read the guide →</span></a>`;
  if (indexHtml.includes(`href="/guides/${g.slug}"`)) return indexHtml;
  const i = indexHtml.indexOf(CARD_MARKER);
  if (i >= 0) {
    const lineStart = indexHtml.lastIndexOf('\n', i - 1) + 1;
    const indent = /^[ \t]*/.exec(indexHtml.slice(lineStart, i))?.[0] ?? '';
    return indexHtml.slice(0, i) + card + '\n' + indent + indexHtml.slice(i);
  }
  const doc = parseDoc(indexHtml);
  const cards = find(doc, (n) => hasClass(n, 'g-cards'));
  const end = cards?.sourceCodeLocation?.endTag?.startOffset;
  if (end === undefined) throw new EditorError("Couldn't find where to add the card on the guides page.", 500);
  return indexHtml.slice(0, end) + '  ' + card + '\n  ' + indexHtml.slice(end);
}
