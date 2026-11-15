/**
 * Cleaning what the owner typed before it goes into a page. The browser sends the inside of the edited element as
 * HTML; only plain text and a few inline tags survive (bold, italic, links, line breaks, spans with a class). Scripts,
 * styles, event handlers, frames, forms and every other attribute are removed. Unsafe links are dropped (the text
 * stays). The server always runs this; nothing the browser sends is trusted.
 */
import { parseFragment } from 'parse5';

type P5Node = {
  nodeName: string;
  tagName?: string;
  value?: string;
  attrs?: { name: string; value: string }[];
  childNodes?: P5Node[];
  content?: P5Node;
};

/** Inline tags kept as they are (with only the attributes allowed below). */
export const INLINE_TAGS = new Set([
  'a', 'strong', 'b', 'em', 'i', 'u', 'br', 'span', 'code', 'small', 'sup', 'sub', 'mark', 's', 'abbr', 'cite', 'q', 'wbr',
]);

/** Dropped together with everything inside them. */
const DROP_WITH_CONTENT = new Set([
  'script', 'style', 'template', 'noscript', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'svg', 'math',
  'form', 'input', 'button', 'select', 'textarea', 'option', 'link', 'meta', 'base', 'title', 'head', 'img', 'video',
  'audio', 'source', 'track', 'picture', 'canvas', 'dialog', 'portal', 'xmp', 'plaintext', 'noembed', 'noframes',
]);

/** Block tags that are unwrapped; a line break is put where a new block started. */
const BLOCKISH = new Set(['div', 'p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'section', 'article', 'pre', 'tr']);

export const MAX_INLINE_HTML = 20_000;

const CLASS_RE = /^[A-Za-z0-9 _-]{0,120}$/;

/** A link target the editor accepts: a page of this site, an #anchor, https/http, mailto or tel. Others → null. */
export function safeHref(href: string): string | null {
  const h = String(href ?? '').trim();
  if (!h || h.length > 2000) return null;
  // control characters, and backslashes (browsers read "/\evil.com" as another website)
  if (/[\u0000-\u001f\u007f\\]/.test(h)) return null;
  if (/^\/(?!\/)/.test(h) || h.startsWith('#')) return h;
  if (/^https?:\/\/[^\s"'<>]+$/i.test(h)) return h;
  if (/^mailto:[^\s"'<>]+$/i.test(h)) return h;
  if (/^tel:[+\d\s().-]+$/i.test(h)) return h;
  return null;
}

/** Turn a preview address back into the public one (/editor/preview/guides/x → /guides/x). */
export function cleanHref(href: string): string {
  return href.replace(/^(?:https?:\/\/[^/]+)?\/editor\/preview(?=\/)/, '');
}

export function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\u00a0/g, '&nbsp;');
}

export function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\u00a0/g, '&nbsp;');
}

function allowedAttrs(tag: string, attrs: { name: string; value: string }[]): string {
  const out: string[] = [];
  let target: string | null = null;
  for (const { name, value } of attrs) {
    const n = name.toLowerCase();
    if (n === 'class' && CLASS_RE.test(value) && value.trim()) out.push(`class="${escapeAttr(value.trim().replace(/\s+/g, ' '))}"`);
    else if (n === 'title' && value.length <= 300) out.push(`title="${escapeAttr(value)}"`);
    else if (tag === 'a' && n === 'href') {
      const h = safeHref(cleanHref(value));
      if (h) out.push(`href="${escapeAttr(h)}"`);
    } else if (tag === 'a' && n === 'target' && value === '_blank') target = '_blank';
  }
  if (target) out.push('target="_blank"', 'rel="noopener"');
  return out.length ? ' ' + out.join(' ') : '';
}

function walk(nodes: P5Node[] | undefined, out: string[]): void {
  if (!nodes) return;
  let i = 0;
  for (const n of nodes) {
    if (n.nodeName === '#text') {
      // Browsers type "word\u00a0 next" when a space is typed after a word: that one becomes a normal space.
      // Deliberate ones in the files (" &nbsp; " and runs of them) are kept.
      const v = (n.value ?? '').replace(/(?<=\S)\u00a0(?= )/g, ' ').replace(/ {2,}/g, ' ');
      out.push(escapeText(v));
    } else if (n.nodeName === '#comment' || n.nodeName === '#documentType') {
      // dropped
    } else if (n.tagName) {
      const tag = n.tagName.toLowerCase();
      if (DROP_WITH_CONTENT.has(tag)) {
        // dropped with its content
      } else if (INLINE_TAGS.has(tag)) {
        if (tag === 'br' || tag === 'wbr') out.push(`<${tag}>`);
        else if (tag === 'a' && !(n.attrs ?? []).some((a) => a.name === 'href' && safeHref(cleanHref(a.value)))) {
          walk(n.childNodes, out); // a link we can't keep: keep its words
        } else {
          out.push(`<${tag}${allowedAttrs(tag, n.attrs ?? [])}>`);
          walk(n.childNodes, out);
          out.push(`</${tag}>`);
        }
      } else {
        if (BLOCKISH.has(tag) && i > 0 && out.length && !out[out.length - 1].endsWith('<br>')) out.push('<br>');
        walk(n.childNodes, out);
      }
    }
    i++;
  }
}

/**
 * Clean the inside of an edited text element. Throws on oversize input. Whitespace at the start and end is trimmed
 * and a trailing line break (browsers add one) is removed.
 */
export function sanitizeInline(html: string): string {
  if (typeof html !== 'string') throw new TypeError('html must be a string');
  if (html.length > MAX_INLINE_HTML) throw new RangeError('too long');
  const frag = parseFragment(html) as unknown as P5Node;
  const out: string[] = [];
  walk(frag.childNodes, out);
  let s = out.join('');
  s = s.replace(/^(?:\s|<br>)+/, '').replace(/(?:\s|<br>)+$/, '');
  // empty inline wrappers left behind by the browser
  for (let k = 0; k < 3; k++) s = s.replace(/<(strong|b|em|i|u|span|small|mark|s|code|sup|sub)(?: [^>]*)?><\/\1>/g, '');
  return s;
}

/** Plain text (for titles, descriptions, alt text): tags removed, whitespace collapsed. */
export function plainText(s: string, max = 500): string {
  return String(s ?? '')
    .replace(/<(?:br|\/p|\/div|\/li)\b[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}
