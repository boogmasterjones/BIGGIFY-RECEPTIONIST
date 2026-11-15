import { describe, expect, it } from 'vitest';
import { RateLimiter, decideAccess, sameOrigin } from '@/lib/editor/access';

const owner = { id: 'u1', email: 'Owner@Example.com', email_confirmed_at: '2026-01-01T00:00:00Z' };

describe('decideAccess (auth guard)', () => {
  it('lets the listed, confirmed owner in (any letter case)', () => {
    const a = decideAccess(owner, ['owner@example.com']);
    expect(a.ok).toBe(true);
    if (a.ok) expect(a.editor.email).toBe('owner@example.com');
  });
  it('sends signed-out visitors to sign in', () => {
    expect(decideAccess(null, ['owner@example.com'])).toMatchObject({ ok: false, status: 401 });
  });
  it('refuses other signed-in dashboard users', () => {
    expect(decideAccess({ ...owner, email: 'client@example.com' }, ['owner@example.com'])).toMatchObject({ ok: false, status: 403, reason: 'not-allowed' });
  });
  it('refuses unconfirmed emails and missing emails', () => {
    expect(decideAccess({ ...owner, email_confirmed_at: null }, ['owner@example.com'])).toMatchObject({ ok: false, status: 403 });
    expect(decideAccess({ id: 'x' }, ['owner@example.com'])).toMatchObject({ ok: false, status: 403 });
  });
  it('lets nobody in when the list is empty', () => {
    expect(decideAccess(owner, [])).toMatchObject({ ok: false, status: 403, reason: 'not-set-up' });
  });
  it('does not match on part of an email', () => {
    expect(decideAccess({ ...owner, email: 'owner@example.com.evil.io' }, ['owner@example.com'])).toMatchObject({ ok: false });
  });
});

describe('sameOrigin', () => {
  const url = 'https://gobiggify.com/api/editor/save';
  it('accepts the site itself', () => {
    expect(sameOrigin(new Headers({ origin: 'https://gobiggify.com', 'sec-fetch-site': 'same-origin' }), url)).toBe(true);
    expect(sameOrigin(new Headers({ 'sec-fetch-site': 'same-origin' }), url)).toBe(true);
  });
  it('refuses other sites and requests with no origin information', () => {
    expect(sameOrigin(new Headers({ origin: 'https://evil.example' }), url)).toBe(false);
    expect(sameOrigin(new Headers({ origin: 'https://gobiggify.com', 'sec-fetch-site': 'cross-site' }), url)).toBe(false);
    expect(sameOrigin(new Headers({}), url)).toBe(false);
  });
});

describe('RateLimiter', () => {
  it('stops after the limit and resets after the window', () => {
    const r = new RateLimiter(3, 1000);
    expect([1, 2, 3].map(() => r.take('a', 0).ok)).toEqual([true, true, true]);
    expect(r.take('a', 10)).toMatchObject({ ok: false });
    expect(r.take('b', 10).ok).toBe(true);
    expect(r.take('a', 1001).ok).toBe(true);
  });
});
