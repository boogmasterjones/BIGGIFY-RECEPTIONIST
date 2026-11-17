import type { MetadataRoute } from 'next';
import { APP_PAGES, SITE, indexablePages } from '@/lib/seo/site-pages';

// sitemap.xml: the public app pages plus every guide and free tool (read from public/ at build time).
// No lastmod: the guides never carry a date (owner rule), and a made-up "today" on every build would be noise.
export default function sitemap(): MetadataRoute.Sitemap {
  const app = APP_PAGES.map((path) => ({ url: path === '/' ? `${SITE}/` : `${SITE}${path}` }));
  const pages = indexablePages().map((p) => ({ url: `${SITE}${p.path}` }));
  return [...app, ...pages];
}
