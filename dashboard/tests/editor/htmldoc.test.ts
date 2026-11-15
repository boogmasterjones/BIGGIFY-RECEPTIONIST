import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { annotate, applyOp, findEditables, parseDoc, readMeta } from '@/lib/editor/htmldoc';
import { sanitizeInline, plainText } from '@/lib/editor/sanitize';

const PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Old title | Biggify</title>
<meta name="description" content="Old description" />
<script type="application/ld+json">{"@type":"Article"}</script>
</head>
<body>
<header><nav><a href="/">Home</a></nav></header>
<main id="main">
  <h1>Big <em>headline</em></h1>
  <p class="g-lead">First paragraph with <strong>bold</strong> and a <a href="/guides">link</a>.</p>
  <ul>
    <li>One</li>
    <li>Two</li>
  </ul>
  <ul class="g-check">
    <li><label><input type="checkbox" /><span><strong>Map:</strong> checked</span></label></li>
  </ul>
  <a class="g-btn" href="#" data-share="copy"><svg viewBox="0 0 1 1"><path d="M0 0"/></svg><span>Copy link</span></a>
  <button type="button"><span>Print it</span></button>
  <p>Has a <span style="color:red">styled</span> word.</p>
  <figure class="ed-photo"><img src="/guides/x/photos/a.webp" alt="A van" /></figure>
</main>
<footer><p>© Biggify</p></footer>
<script src="/guides/guide.js" defer></script>
<script>window.track && track()</script>
</body>
</html>
`;

const tags = (html: string) => findEditables(parseDoc(html)).map((e) => `${e.kind}:${e.tag}:${plainText(html.slice(e.node.sourceCodeLocation!.startOffset, e.node.sourceCodeLocation!.endOffset))}`);

describe('findEditables', () => {
  it('finds headings, paragraphs, list items, labels and photos inside <main> only', () => {
    expect(tags(PAGE)).toEqual([
      'text:h1:Big headline',
      'text:p:First paragraph with bold and a link.',
      'text:li:One',
      'text:li:Two',
      'text:span:Map: checked',
      'text:span:Copy link',
      // the paragraph with a style attribute inside is not editable as a whole (saving would lose the style)
      'text:span:styled',
      'img:img:',
    ]);
  });
  it('never offers the header, footer, buttons or the checkbox structure', () => {
    const all = tags(PAGE).join('\n');
    expect(all).not.toContain('Home');
    expect(all).not.toContain('© Biggify');
    expect(all).not.toContain('Print it');
  });
});

describe('applyOp', () => {
  const idx = (text: string) => tags(PAGE).findIndex((t) => t.includes(text));

  it('changes one paragraph and leaves every other byte alone', () => {
    const i = idx('First paragraph');
    const out = applyOp(PAGE, { type: 'text', index: i, html: 'New <b>words</b><script>alert(1)</script>' });
    expect(out).toContain('<p class="g-lead">New <b>words</b></p>');
    expect(out).not.toContain('alert(1)');
    const before = PAGE.split('<p class="g-lead">')[0];
    const after = PAGE.split('</a>.</p>')[1];
    expect(out.startsWith(before)).toBe(true);
    expect(out.endsWith(after)).toBe(true);
  });

  it('refuses an empty spot and an unknown index', () => {
    expect(() => applyOp(PAGE, { type: 'text', index: idx('headline'), html: '   ' })).toThrow();
    expect(() => applyOp(PAGE, { type: 'text', index: 999, html: 'x' })).toThrow(/Reload/);
    expect(() => applyOp(PAGE, { type: 'text', index: -1, html: 'x' })).toThrow();
  });

  it('adds and removes list items and paragraphs', () => {
    const withItem = applyOp(PAGE, { type: 'insert', index: idx('text:li:Two'), what: 'item' });
    expect(withItem).toMatch(/<li>Two<\/li>\n {4}<li>New item\. Click here and type\.<\/li>/);
    const withP = applyOp(PAGE, { type: 'insert', index: idx('First paragraph'), what: 'paragraph' });
    expect(withP).toMatch(/<\/p>\n {2}<p>New paragraph/);
    const removed = applyOp(PAGE, { type: 'remove', index: idx('text:li:One') });
    expect(removed).not.toContain('<li>One</li>');
    expect(removed).toContain('<ul>\n    <li>Two</li>\n  </ul>');
    expect(() => applyOp(removed, { type: 'remove', index: tags(removed).findIndex((t) => t === 'text:li:Two') })).toThrow(/can't be removed/);
  });

  it('adds a photo only with one of the site’s own photo addresses', () => {
    const ok = applyOp(PAGE, { type: 'insert', index: idx('First paragraph'), what: 'photo', src: '/guides/x/photos/b-123abc.webp', alt: 'Truck "1"' });
    expect(ok).toContain('<figure class="ed-photo"');
    expect(ok).toContain('alt="Truck &quot;1&quot;"');
    for (const src of ['javascript:alert(1)', 'https://evil.example/x.png', '/guides/../x.png', '//evil.example/a.png', 'data:image/png;base64,AA']) {
      expect(() => applyOp(PAGE, { type: 'insert', index: idx('First paragraph'), what: 'photo', src, alt: '' }), src).toThrow();
    }
  });

  it('replaces a photo and removes it with its frame', () => {
    const i = idx('img:img');
    const out = applyOp(PAGE, { type: 'image', index: i, src: '/guides/x/photos/c.jpg', alt: 'New <b>alt</b>' });
    expect(out).toContain('<img src="/guides/x/photos/c.jpg" alt="New alt" />');
    const gone = applyOp(PAGE, { type: 'remove', index: i });
    expect(gone).not.toContain('ed-photo');
  });

  it('changes the title and description, escaped', () => {
    const out = applyOp(PAGE, { type: 'meta', title: 'New <title> & more', description: 'Say "hi"' });
    expect(out).toContain('<title>New &amp; more</title>');
    expect(out).toContain('content="Say &quot;hi&quot;"');
    expect(readMeta(out).description).toBe('Say "hi"');
  });
});

describe('annotate (the editor preview)', () => {
  it('marks editable parts, removes the page scripts but keeps structured data', () => {
    const { html, count } = annotate(PAGE, { baseHref: '/guides/x/', inject: '<script nonce="n">EDITOR</script>' });
    expect(count).toBe(8);
    expect(html).toContain('<h1 data-ed="0" data-ed-k="text" data-ed-tag="h1">');
    expect(html).not.toContain('guide.js');
    expect(html).not.toContain('track()');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('<base href="/guides/x/">');
    expect(html.indexOf('EDITOR')).toBeLessThan(html.indexOf('</body>'));
  });
});

describe('the real guides and tools', () => {
  const root = join(__dirname, '..', '..', 'public');
  const files: string[] = [];
  for (const section of ['guides', 'tools']) {
    const dir = join(root, section);
    if (!existsSync(dir)) continue;
    files.push(join(dir, 'index.html'));
    for (const d of readdirSync(dir, { withFileTypes: true })) {
      if (d.isDirectory() && existsSync(join(dir, d.name, 'index.html'))) files.push(join(dir, d.name, 'index.html'));
    }
  }

  it('finds pages to check', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files)('%s: every editable part survives a save unchanged in words and links', (file) => {
    const html = readFileSync(file, 'utf8');
    const eds = findEditables(parseDoc(html));
    expect(eds.length).toBeGreaterThan(0);
    for (const e of eds) {
      if (e.kind !== 'text') continue;
      const l = e.node.sourceCodeLocation!;
      const inner = html.slice(l.startTag!.endOffset, l.endTag!.startOffset);
      const clean = sanitizeInline(inner);
      expect(plainText(clean)).toBe(plainText(inner));
      const links = (s: string) => (s.match(/href="[^"]*"/g) ?? []).length;
      expect(links(clean)).toBe(links(inner));
    }
    // and a save of the same words keeps the file working: parse, edit the first part, parse again
    const first = eds.find((e) => e.kind === 'text')!;
    const fl = first.node.sourceCodeLocation!;
    const out = applyOp(html, { type: 'text', index: first.index, html: html.slice(fl.startTag!.endOffset, fl.endTag!.startOffset) });
    expect(findEditables(parseDoc(out)).length).toBe(eds.length);
  });
});
