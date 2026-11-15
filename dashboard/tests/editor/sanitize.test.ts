import { describe, expect, it } from 'vitest';
import { plainText, safeHref, sanitizeInline } from '@/lib/editor/sanitize';

describe('sanitizeInline', () => {
  it('keeps text and simple formatting', () => {
    expect(sanitizeInline('Hello <strong>big</strong> <em>world</em>')).toBe('Hello <strong>big</strong> <em>world</em>');
    expect(sanitizeInline('a<br>b')).toBe('a<br>b');
    expect(sanitizeInline('<span class="g-label">Tip</span> text')).toBe('<span class="g-label">Tip</span> text');
  });

  it('removes scripts, styles and event handlers', () => {
    expect(sanitizeInline('hi<script>alert(1)</script>')).toBe('hi');
    expect(sanitizeInline('<b onclick="alert(1)" style="color:red">x</b>')).toBe('<b>x</b>');
    expect(sanitizeInline('<img src=x onerror=alert(1)>ok')).toBe('ok');
    expect(sanitizeInline('<svg><script>alert(1)</script></svg>ok')).toBe('ok');
    expect(sanitizeInline('<iframe src="https://evil.example"></iframe>ok')).toBe('ok');
    expect(sanitizeInline('<style>body{display:none}</style>ok')).toBe('ok');
    expect(sanitizeInline('<math><mi>x</mi></math>ok')).toBe('ok');
    expect(sanitizeInline('<form action="https://evil.example"><input name=a></form>ok')).toBe('ok');
  });

  it('never lets markup through as text', () => {
    const out = sanitizeInline('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(out).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(out).not.toContain('<script');
  });

  it('drops unsafe links but keeps their words', () => {
    expect(sanitizeInline('<a href="javascript:alert(1)">click</a>')).toBe('click');
    expect(sanitizeInline('<a href=" JaVaScRiPt:alert(1)">click</a>')).toBe('click');
    expect(sanitizeInline('<a href="data:text/html,<script>alert(1)</script>">x</a>')).toBe('x');
    expect(sanitizeInline('<a href="vbscript:x">x</a>')).toBe('x');
    expect(sanitizeInline('<a href="/\\evil.example">x</a>')).toBe('x');
    expect(sanitizeInline('<a href="//evil.example">x</a>')).toBe('x');
  });

  it('keeps safe links and cleans their attributes', () => {
    expect(sanitizeInline('<a href="/guides/still-no-calls" data-x="1" onmouseover="y()">Guide</a>')).toBe('<a href="/guides/still-no-calls">Guide</a>');
    expect(sanitizeInline('<a href="https://example.com/a?b=1&amp;c=2" target="_blank">x</a>')).toBe(
      '<a href="https://example.com/a?b=1&amp;c=2" target="_blank" rel="noopener">x</a>',
    );
    expect(sanitizeInline('<a href="tel:+19414018288">Call</a>')).toBe('<a href="tel:+19414018288">Call</a>');
    expect(sanitizeInline('<a href="#check">Jump</a>')).toBe('<a href="#check">Jump</a>');
    // a preview address is turned back into the public one
    expect(sanitizeInline('<a href="/editor/preview/guides/x">x</a>')).toBe('<a href="/guides/x">x</a>');
  });

  it('escapes attribute values', () => {
    expect(sanitizeInline('<a href="/a" title="&quot;><script>">x</a>')).toBe('<a href="/a" title="&quot;&gt;&lt;script&gt;">x</a>');
    expect(sanitizeInline('<span class="a&quot; onclick=&quot;x">y</span>')).toBe('<span>y</span>');
  });

  it('unwraps blocks the browser adds when pressing Enter', () => {
    expect(sanitizeInline('one<div>two</div>')).toBe('one<br>two');
    expect(sanitizeInline('<p>one</p><p>two</p>')).toBe('one<br>two');
    expect(sanitizeInline('text<br>')).toBe('text');
  });

  it('turns the no-break spaces browsers type back into normal spaces, but keeps deliberate ones', () => {
    expect(sanitizeInline('check&nbsp; EDITOR')).toBe('check EDITOR');
    expect(sanitizeInline('a &nbsp; b')).toBe('a &nbsp; b');
    expect(sanitizeInline('15&nbsp;min')).toBe('15&nbsp;min');
  });

  it('refuses oversize input', () => {
    expect(() => sanitizeInline('x'.repeat(30_000))).toThrow();
  });
});

describe('safeHref / plainText', () => {
  it('accepts only safe schemes', () => {
    expect(safeHref('https://a.com')).toBe('https://a.com');
    expect(safeHref('mailto:a@b.com')).toBe('mailto:a@b.com');
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('java\tscript:alert(1)')).toBeNull();
    expect(safeHref('')).toBeNull();
  });
  it('strips tags and control characters', () => {
    expect(plainText('<b>Hi</b>\n there\u0007')).toBe('Hi there');
  });
});
