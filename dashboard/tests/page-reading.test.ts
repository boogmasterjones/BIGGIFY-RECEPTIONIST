import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { blockText, longSentences, pageDescriptions, pageGrade, pageProblems, textGrade } from '../scripts/page-reading.mjs';

// Owner's rule 2026-11-18: ALL marketing at a 3rd-grade reading level. Grade 4 or under, never above, and no sentence over
// 15 words. The video pages are held to it by the builder; this holds the hand-written guide and tool pages to it: the body
// copy, and the meta, og and twitter descriptions. Run `node scripts/page-reading.mjs <file>` to see what to fix on a page.

const PUBLIC = join(__dirname, '..', 'public');
const pagesIn = (dir: string) =>
  [join(dir, 'index.html'), ...readdirSync(join(PUBLIC, dir), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => join(dir, d.name, 'index.html'))]
    .filter((p) => existsSync(join(PUBLIC, p)));

describe('guide and tool pages read at a 3rd-grade level (grade 4 or under, no sentence over 15 words)', () => {
  const pages = [...pagesIn('guides'), ...pagesIn('tools')];

  it('finds the pages', () => {
    expect(pages.length).toBeGreaterThanOrEqual(35);
  });

  it('counts sentences and grades the way the video builder does', () => {
    expect(longSentences(blockText('<b>A label</b><span>Then a short line.</span>'))).toEqual([]);
    expect(longSentences(Array.from({ length: 16 }, () => 'go').join(' ') + '.')).toHaveLength(1);
    expect(longSentences('Biggify, Port Charlotte and Wyatt each count as one word here, so this line is fine.')).toEqual([]);
    expect(longSentences('By providing your phone number and checking this box, you agree to receive SMS customer care messages from us.')).toEqual([]);
    expect(textGrade('You miss a call. They call the next guy. He gets the job.')).toBeLessThanOrEqual(3);
    expect(textGrade('Comprehensive reputation management dramatically increases organizational visibility.')).toBeGreaterThan(8);
    expect(textGrade('Google Facebook. Port Charlotte Instagram.')).toBe(textGrade('It it. It it.'));
    expect(textGrade('Warranty insurance reviews.')).toBeGreaterThan(textGrade('It it it.'));
  });

  it('flags a page that reads above grade 4, or a description that does', () => {
    const hard = '<main><p>Comprehensive reputation management dramatically increases organizational visibility.</p></main>';
    expect(pageGrade(hard)).toBeGreaterThan(4);
    const withDesc = `<meta name="description" content="Comprehensive reputation management dramatically increases organizational visibility." />${'<main><p>Call us.</p></main>'}`;
    expect(pageDescriptions(withDesc)).toHaveLength(1);
    expect(pageProblems(withDesc).join(' ')).toMatch(/description reads at grade/);
  });

  for (const p of pages) {
    it(p, () => {
      const html = readFileSync(join(PUBLIC, p), 'utf8');
      expect(pageDescriptions(html).length, `${p} has its descriptions`).toBeGreaterThanOrEqual(2);
      expect(pageProblems(html, p.replace(/\\/g, '/')), p).toEqual([]);
    });
  }
});
