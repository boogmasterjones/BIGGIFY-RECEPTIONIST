import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs helper shared with the CLI (node scripts/page-reading.mjs <file>)
import { blockText, longSentences, pageLongBlocks } from '../scripts/page-reading.mjs';

// Owner's rule 2026-11-18: ALL marketing at a 3rd-grade reading level, no sentence over 15 words. The video pages are held to
// it by the builder; this holds the hand-written guide and tool pages to it. Run `node scripts/page-reading.mjs <file>` to
// see what to fix on a page.

const PUBLIC = join(__dirname, '..', 'public');
const pagesIn = (dir: string) =>
  [join(dir, 'index.html'), ...readdirSync(join(PUBLIC, dir), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => join(dir, d.name, 'index.html'))]
    .filter((p) => existsSync(join(PUBLIC, p)));

// Long guides not rewritten yet (2026-11-18). Take a page off this list once it passes; the test fails if a listed page
// already passes, so the list only ever shrinks.
const NOT_YET = new Set<string>([
  'guides/marketing-is-simple/index.html',
  'guides/who-owns-your-stuff/index.html',
].map((p) => join(p)));

describe('guide and tool pages read at a 3rd-grade level (no sentence over 15 words)', () => {
  const pages = [...pagesIn('guides'), ...pagesIn('tools')];

  it('finds the pages', () => {
    expect(pages.length).toBeGreaterThanOrEqual(30);
  });

  it('counts sentences the way the video builder does', () => {
    expect(longSentences(blockText('<b>A label</b><span>Then a short line.</span>'))).toEqual([]);
    expect(longSentences(Array.from({ length: 16 }, () => 'go').join(' ') + '.')).toHaveLength(1);
    expect(longSentences('Biggify, Port Charlotte and Wyatt each count as one word here, so this line is fine.')).toEqual([]);
    expect(longSentences('By providing your phone number and checking this box, you agree to receive SMS customer care messages from us.')).toEqual([]);
  });

  for (const p of pages) {
    it(p, () => {
      const long = pageLongBlocks(readFileSync(join(PUBLIC, p), 'utf8')).flatMap((b: { long: { s: string; words: number }[] }) => b.long.map((x) => `[${x.words}] ${x.s}`));
      if (NOT_YET.has(p)) expect(long.length, `${p} passes now: take it off NOT_YET`).toBeGreaterThan(0);
      else expect(long, p).toEqual([]);
    });
  }
});
