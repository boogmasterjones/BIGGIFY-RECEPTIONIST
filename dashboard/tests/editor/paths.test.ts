import { describe, expect, it } from 'vitest';
import { fileForPage, isReadable, isWritable, pageForFile, slugify } from '@/lib/editor/paths';

describe('isWritable', () => {
  it('allows guide and tool pages, the hub pages and uploaded photos', () => {
    for (const p of [
      'public/guides/still-no-calls/index.html',
      'public/tools/xray/index.html',
      'public/tools/website-playbook/print.html',
      'public/guides/index.html',
      'public/tools/index.html',
      'public/guides/still-no-calls/photos/van-1a2b3c.webp',
      'public/tools/review-kit/photos/card.jpg',
    ]) {
      expect(isWritable(p), p).toBe(true);
    }
  });

  it('refuses code, styles, scripts and anything outside guides/tools', () => {
    for (const p of [
      'public/guides/guide.css',
      'public/guides/guide.js',
      'public/tools/config.js',
      'public/tools/tools.css',
      'public/tools/review-kit/kit.js',
      'public/tools/vendor/qrcode.min.js',
      'public/guides/x/photos/evil.svg',
      'public/guides/x/photos/evil.html',
      'public/LOGO.png',
      'app/page.tsx',
      'lib/editor/paths.ts',
      'package.json',
      '.env.local',
      'vercel.json',
      'public/work/x.html',
    ]) {
      expect(isWritable(p), p).toBe(false);
    }
  });

  it('refuses path tricks', () => {
    for (const p of [
      'public/guides/../../app/page.tsx',
      'public/guides/x/../../../.env.local',
      '/public/guides/x/index.html',
      'public\\guides\\x\\index.html',
      'public/guides//index.html',
      'public/guides/%2e%2e/index.html',
      'public/guides/x/index.html\0.png',
      'public/guides/X/index.html',
      'public/guides/-x/index.html',
      'C:/dev/public/guides/x/index.html',
      '',
      null,
      42,
    ]) {
      expect(isWritable(p), String(p)).toBe(false);
    }
  });

  it('reads only inside guides and tools', () => {
    expect(isReadable('public/guides/guide.css')).toBe(true);
    expect(isReadable('public/../.env.local')).toBe(false);
    expect(isReadable('app/page.tsx')).toBe(false);
  });
});

describe('page addresses', () => {
  it('maps pages to files and back', () => {
    expect(fileForPage('guides')).toBe('public/guides/index.html');
    expect(fileForPage('guides/still-no-calls')).toBe('public/guides/still-no-calls/index.html');
    expect(fileForPage('/tools/xray/')).toBe('public/tools/xray/index.html');
    expect(fileForPage('tools/website-playbook/print.html')).toBe('public/tools/website-playbook/print.html');
    expect(pageForFile('public/guides/still-no-calls/index.html')).toBe('guides/still-no-calls');
    expect(pageForFile('public/tools/index.html')).toBe('tools');
  });
  it('refuses anything else', () => {
    for (const p of ['', 'app', 'guides/../app', 'guides/a/b/c', 'guides/A', 'login', 'guides/x/index.html', 'guides/x/kit.js']) {
      expect(fileForPage(p), p).toBeNull();
    }
  });
  it('makes slugs', () => {
    expect(slugify('How to get 5★ reviews & more calls!')).toBe('how-to-get-5-reviews-and-more-calls');
    expect(slugify('Café   owners')).toBe('cafe-owners');
  });
});
