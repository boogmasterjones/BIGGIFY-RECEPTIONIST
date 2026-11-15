/**
 * Reading and changing a guide or tool page (a static HTML file) without disturbing the rest of the file.
 *
 * The file is parsed once with source positions (parse5, the same parsing rules as a browser). The editable parts
 * are found by one fixed rule and numbered in document order:
 * - text: a heading, paragraph, list item, table cell, label, link, … inside <main> whose content is only text and
 *   simple inline tags (bold, italic, links, line breaks, spans). The outermost such element is the editable one.
 * - img: a photo inside <main>.
 * The site header, menus and footer are shared by every page and are left alone.
 *
 * The preview marks those parts with data-ed="<number>"; a save says "number N, new content" plus the file version it
 * was looking at. Every change is a splice at the element's exact source position, so the rest of the file stays
 * byte-for-byte the same.
 */
import { createHash } from 'node:crypto';
import { parse } from 'parse5';
import { EditorError } from './paths';
import { INLINE_TAGS, escapeAttr, escapeText, plainText, safeHref, sanitizeInline } from './sanitize';

interface Loc {
  startOffset: number;
  endOffset: number;
}
interface ElLoc extends Loc {
  startTag?: Loc;
  endTag?: Loc;
  attrs?: Record<string, Loc>;
}
export interface P5El {
  nodeName: string;
  tagName?: string;
  value?: string;
  attrs?: { name: string; value: string }[];
  childNodes?: P5El[];
  parentNode?: P5El | null;
  sourceCodeLocation?: ElLoc | null;
}

export type EditKind = 'text' | 'img';
export type InsertWhat = 'paragraph' | 'item' | 'photo';

export interface Editable {
  index: number;
  kind: EditKind;
  tag: string;
  node: P5El;
  /** what can be added after it / whether it can be removed */
  canInsert: InsertWhat[];
  canRemove: boolean;
}

const TEXT_TAGS = new Set([
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th', 'dt', 'dd', 'figcaption', 'blockquote', 'summary', 'label',
  'span', 'a', 'b', 'strong', 'em', 'i', 'small', 'div', 'caption', 'cite', 'q', 'mark', 'legend',
]);
const SKIP_TAGS = new Set([
  'script', 'style', 'svg', 'math', 'header', 'nav', 'footer', 'template', 'noscript', 'iframe', 'button', 'select',
  'textarea', 'input', 'video', 'audio', 'canvas', 'object', 'embed', 'head',
]);
const CLASS_RE = /^[A-Za-z0-9 _-]{0,120}$/;

const attr = (n: P5El, name: string) => n.attrs?.find((a) => a.name === name)?.value ?? null;
const tagOf = (n: P5El) => (n.tagName ?? '').toLowerCase();
const isEl = (n: P5El) => !!n.tagName;

export function versionOf(html: string): string {
  return createHash('sha256').update(html).digest('hex').slice(0, 16);
}

export function parseDoc(html: string): P5El {
  return parse(html, { sourceCodeLocationInfo: true }) as unknown as P5El;
}

function find(n: P5El, pred: (x: P5El) => boolean): P5El | null {
  if (pred(n)) return n;
  for (const c of n.childNodes ?? []) {
    const r = find(c, pred);
    if (r) return r;
  }
  return null;
}

function findAll(n: P5El, pred: (x: P5El) => boolean, out: P5El[] = []): P5El[] {
  if (pred(n)) out.push(n);
  for (const c of n.childNodes ?? []) findAll(c, pred, out);
  return out;
}

/** Only text and inline tags whose attributes the sanitizer would keep, so a save never loses anything. */
function inlineOnly(n: P5El): boolean {
  for (const c of n.childNodes ?? []) {
    if (c.nodeName === '#text' || c.nodeName === '#comment') continue;
    if (!isEl(c)) return false;
    const t = tagOf(c);
    if (!INLINE_TAGS.has(t)) return false;
    for (const a of c.attrs ?? []) {
      if (a.name === 'class' && CLASS_RE.test(a.value)) continue;
      if (a.name === 'title') continue;
      if (t === 'a' && a.name === 'href' && safeHref(a.value)) continue;
      if (t === 'a' && (a.name === 'target' || a.name === 'rel')) continue;
      return false;
    }
    if (t === 'a' && !attr(c, 'href')) return false;
    if (!inlineOnly(c)) return false;
  }
  return true;
}

function hasText(n: P5El): boolean {
  if (n.nodeName === '#text') return /\S/.test(n.value ?? '');
  return (n.childNodes ?? []).some(hasText);
}

function isPhotoFigure(n: P5El | null | undefined): boolean {
  return !!n && tagOf(n) === 'figure' && (attr(n, 'class') ?? '').split(/\s+/).includes('ed-photo');
}

/** All editable parts of a page, numbered in document order. */
export function findEditables(doc: P5El): Editable[] {
  const root = find(doc, (n) => tagOf(n) === 'main') ?? find(doc, (n) => tagOf(n) === 'body');
  const out: Editable[] = [];
  if (!root) return out;
  const visit = (n: P5El) => {
    if (!isEl(n)) return;
    const t = tagOf(n);
    if (SKIP_TAGS.has(t)) return;
    if (attr(n, 'data-noedit') !== null) return;
    const loc = n.sourceCodeLocation;
    if (t === 'img') {
      if (loc?.startTag && attr(n, 'src')) {
        const photo = isPhotoFigure(n.parentNode);
        out.push({ index: out.length, kind: 'img', tag: t, node: n, canInsert: [], canRemove: photo });
      }
      return;
    }
    if (TEXT_TAGS.has(t) && loc?.startTag && loc.endTag && inlineOnly(n) && hasText(n)) {
      const canInsert: InsertWhat[] = [];
      if (t === 'li') canInsert.push('item');
      if (['p', 'h2', 'h3', 'h4', 'blockquote'].includes(t)) canInsert.push('paragraph', 'photo');
      let canRemove = ['p', 'h3', 'h4', 'blockquote', 'figcaption'].includes(t);
      if (t === 'li') canRemove = (n.parentNode?.childNodes ?? []).filter((c) => tagOf(c) === 'li').length > 1;
      out.push({ index: out.length, kind: 'text', tag: t, node: n, canInsert, canRemove });
      return;
    }
    for (const c of n.childNodes ?? []) visit(c);
  };
  for (const c of root.childNodes ?? []) visit(c);
  return out;
}

// ------------------------------------------------------------------------------------------------ splicing

interface Splice {
  start: number;
  end: number;
  text: string;
}

function applySplices(src: string, splices: Splice[]): string {
  const sorted = [...splices].sort((a, b) => b.start - a.start || b.end - a.end);
  let out = src;
  let lastStart = Infinity;
  for (const s of sorted) {
    if (s.end > lastStart) throw new Error('overlapping edits');
    out = out.slice(0, s.start) + s.text + out.slice(s.end);
    lastStart = s.start;
  }
  return out;
}

/** The whitespace at the start of the line an offset is on. */
function indentAt(src: string, offset: number): string {
  const lineStart = src.lastIndexOf('\n', offset - 1) + 1;
  const m = /^[ \t]*/.exec(src.slice(lineStart, offset));
  return m ? m[0] : '';
}

// ------------------------------------------------------------------------------------------------ preview

export interface AnnotateOptions {
  /** <base href> so relative links in the page still work at the preview address */
  baseHref: string;
  /** extra markup appended at the end of <body> (the editor's script and styles) */
  inject: string;
  /** rewrite photo addresses (drafts that are not live yet) */
  rewriteSrc?: (src: string) => string;
}

/**
 * The page as the editor shows it: the editable parts carry data-ed attributes, the page's own scripts are removed
 * (so nothing runs or tracks in the editor and nothing moves while editing; structured data stays), and the editor's
 * script is added. The result is only ever sent to a signed-in editor.
 */
export function annotate(html: string, o: AnnotateOptions): { html: string; count: number } {
  const doc = parseDoc(html);
  const eds = findEditables(doc);
  const splices: Splice[] = [];
  for (const e of eds) {
    const st = e.node.sourceCodeLocation!.startTag!;
    const at = st.startOffset + 1 + (e.node.tagName ?? '').length;
    const ops = [...e.canInsert.map((w) => `add-${w}`), ...(e.canRemove ? ['remove'] : [])].join(' ');
    splices.push({ start: at, end: at, text: ` data-ed="${e.index}" data-ed-k="${e.kind}" data-ed-tag="${e.tag}"${ops ? ` data-ed-ops="${ops}"` : ''}` });
    if (e.kind === 'img' && o.rewriteSrc) {
      const srcLoc = e.node.sourceCodeLocation?.attrs?.src;
      const src = attr(e.node, 'src');
      if (srcLoc && src) {
        const next = o.rewriteSrc(src);
        if (next !== src) splices.push({ start: srcLoc.startOffset, end: srcLoc.endOffset, text: `src="${escapeAttr(next)}"` });
      }
    }
  }
  for (const s of findAll(doc, (n) => tagOf(n) === 'script')) {
    if ((attr(s, 'type') ?? '').toLowerCase() === 'application/ld+json') continue;
    const loc = s.sourceCodeLocation;
    if (loc) splices.push({ start: loc.startOffset, end: loc.endOffset, text: '' });
  }
  // inline event handlers are dead under the preview's Content-Security-Policy anyway; nothing else to strip
  const head = find(doc, (n) => tagOf(n) === 'head');
  const headStart = head?.sourceCodeLocation?.startTag;
  const base = `<base href="${escapeAttr(o.baseHref)}">`;
  if (headStart) splices.push({ start: headStart.endOffset, end: headStart.endOffset, text: base });
  const body = find(doc, (n) => tagOf(n) === 'body');
  const bodyEnd = body?.sourceCodeLocation?.endTag?.startOffset;
  let out = applySplices(html, splices);
  if (!headStart) out = base + out;
  if (bodyEnd !== undefined) {
    // recompute: the splices moved things; </body> is the last one in the file
    const i = out.lastIndexOf('</body>');
    out = i >= 0 ? out.slice(0, i) + o.inject + out.slice(i) : out + o.inject;
  } else out += o.inject;
  return { html: out, count: eds.length };
}

// ------------------------------------------------------------------------------------------------ changes

export type EditOp =
  | { type: 'text'; index: number; html: string }
  | { type: 'image'; index: number; src: string; alt: string }
  | { type: 'insert'; index: number; what: InsertWhat; src?: string; alt?: string }
  | { type: 'remove'; index: number }
  | { type: 'meta'; title: string; description: string };

/** A photo address the editor may put on a page: one of this site's own images. */
export function safeImageSrc(src: string): string | null {
  const s = String(src ?? '').trim();
  if (/^\/(?:guides|tools)\/[a-z0-9-]+\/photos\/[a-z0-9][a-z0-9-]{0,80}\.(?:webp|jpe?g|png)$/.test(s)) return s;
  if (/^\/[a-zA-Z0-9][a-zA-Z0-9._/-]{0,200}\.(?:webp|jpe?g|png|gif|svg)$/.test(s) && !s.includes('..') && !s.includes('//')) return s;
  return null;
}

function target(eds: Editable[], index: unknown): Editable {
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= eds.length) {
    throw new EditorError('That part of the page changed. Reload the page and try again.', 409);
  }
  return eds[index];
}

function imgTag(n: P5El, src: string, alt: string): string {
  const keep = (n.attrs ?? []).filter((a) => !['src', 'alt', 'srcset', 'sizes', 'width', 'height'].includes(a.name));
  const parts = [`src="${escapeAttr(src)}"`, `alt="${escapeAttr(alt)}"`, ...keep.map((a) => (a.value === '' ? a.name : `${a.name}="${escapeAttr(a.value)}"`))];
  return `<img ${parts.join(' ')} />`;
}

const NEW_PARAGRAPH = 'New paragraph. Click here and type.';
const NEW_ITEM = 'New item. Click here and type.';

function photoFigure(src: string, alt: string): string {
  return (
    `<figure class="ed-photo" style="margin:22px 0"><img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="lazy" decoding="async" ` +
    `style="display:block;width:100%;max-width:100%;height:auto;border-radius:14px" /></figure>`
  );
}

/** Apply one change to a page's HTML and return the new HTML. Throws EditorError with a plain message. */
export function applyOp(html: string, op: EditOp): string {
  if (!op || typeof op !== 'object') throw new EditorError('Nothing to save.');
  const doc = parseDoc(html);
  if (op.type === 'meta') return applyMeta(html, doc, op.title, op.description);
  const eds = findEditables(doc);
  const e = target(eds, (op as { index: unknown }).index);
  const loc = e.node.sourceCodeLocation!;

  switch (op.type) {
    case 'text': {
      if (e.kind !== 'text') throw new EditorError('That part of the page changed. Reload the page and try again.', 409);
      let clean: string;
      try {
        clean = sanitizeInline(String(op.html ?? ''));
      } catch {
        throw new EditorError('That is too much text for one spot. Split it into more paragraphs.');
      }
      if (!plainText(clean)) throw new EditorError(e.canRemove ? 'That spot is empty. Type something, or use Remove.' : 'That spot needs some words.');
      return applySplices(html, [{ start: loc.startTag!.endOffset, end: loc.endTag!.startOffset, text: clean }]);
    }
    case 'image': {
      if (e.kind !== 'img') throw new EditorError('That part of the page changed. Reload the page and try again.', 409);
      const src = safeImageSrc(op.src);
      if (!src) throw new EditorError("That photo address isn't one of this site's photos.");
      const alt = plainText(op.alt ?? '', 250);
      return applySplices(html, [{ start: loc.startTag!.startOffset, end: loc.startTag!.endOffset, text: imgTag(e.node, src, alt) }]);
    }
    case 'insert': {
      if (!e.canInsert.includes(op.what)) throw new EditorError("You can't add that here.");
      let markup: string;
      if (op.what === 'paragraph') markup = `<p>${NEW_PARAGRAPH}</p>`;
      else if (op.what === 'item') markup = `<li>${NEW_ITEM}</li>`;
      else {
        const src = safeImageSrc(op.src ?? '');
        if (!src) throw new EditorError("That photo address isn't one of this site's photos.");
        markup = photoFigure(src, plainText(op.alt ?? '', 250));
      }
      const indent = indentAt(html, loc.startOffset);
      return applySplices(html, [{ start: loc.endOffset, end: loc.endOffset, text: `\n${indent}${markup}` }]);
    }
    case 'remove': {
      if (!e.canRemove) throw new EditorError("That can't be removed from here.");
      const node = e.kind === 'img' ? e.node.parentNode! : e.node; // a photo goes with its frame
      const l = node.sourceCodeLocation!;
      let start = l.startOffset;
      let end = l.endOffset;
      const lineStart = html.lastIndexOf('\n', start - 1) + 1;
      const nl = html.indexOf('\n', end);
      const lineEnd = nl === -1 ? html.length : nl;
      if (/^[ \t]*$/.test(html.slice(lineStart, start)) && /^[ \t]*$/.test(html.slice(end, lineEnd))) {
        start = lineStart > 0 ? lineStart - 1 : lineStart; // take the line break before it too
        end = lineEnd;
      }
      return applySplices(html, [{ start, end, text: '' }]);
    }
    default:
      throw new EditorError('Unknown change.');
  }
}

function applyMeta(html: string, doc: P5El, titleIn: string, descIn: string): string {
  const title = plainText(titleIn, 200);
  const description = plainText(descIn, 400);
  if (!title) throw new EditorError('The page needs a title.');
  const splices: Splice[] = [];
  const t = find(doc, (n) => tagOf(n) === 'title');
  const tl = t?.sourceCodeLocation;
  if (tl?.startTag && tl.endTag) splices.push({ start: tl.startTag.endOffset, end: tl.endTag.startOffset, text: escapeText(title) });
  const m = find(doc, (n) => tagOf(n) === 'meta' && (attr(n, 'name') ?? '').toLowerCase() === 'description');
  const contentLoc = m?.sourceCodeLocation?.attrs?.content;
  if (contentLoc) splices.push({ start: contentLoc.startOffset, end: contentLoc.endOffset, text: `content="${escapeAttr(description)}"` });
  else if (description) {
    const head = find(doc, (n) => tagOf(n) === 'head')?.sourceCodeLocation?.startTag;
    if (head) splices.push({ start: head.endOffset, end: head.endOffset, text: `\n<meta name="description" content="${escapeAttr(description)}" />` });
  }
  if (!splices.length) throw new EditorError("This page has no title to change.");
  return applySplices(html, splices);
}

/** Title and description of a page (for the editor's list and the page-details box). */
export function readMeta(html: string): { title: string; description: string; h1: string } {
  const doc = parseDoc(html);
  const text = (n: P5El | null): string =>
    !n ? '' : n.nodeName === '#text' ? n.value ?? '' : (n.childNodes ?? []).map((c) => text(c)).join('');
  const t = find(doc, (n) => tagOf(n) === 'title');
  const m = find(doc, (n) => tagOf(n) === 'meta' && (attr(n, 'name') ?? '').toLowerCase() === 'description');
  const h1 = find(doc, (n) => tagOf(n) === 'h1');
  return {
    title: plainText(text(t), 300),
    description: plainText(m ? attr(m, 'content') ?? '' : '', 500),
    h1: plainText(text(h1), 300),
  };
}

/** Every photo address used by a page (to keep a photo from being deleted while still in use). */
export function imageSources(html: string): string[] {
  return findAll(parseDoc(html), (n) => tagOf(n) === 'img').map((n) => attr(n, 'src') ?? '').filter(Boolean);
}
