import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/seo/site';
import { NAMED_CRAWLERS, PRIVATE_PATHS } from '@/lib/seo/robots';

// robots.txt: everyone may read the public site (see lib/seo/robots.ts for the named search and AI crawlers).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: [...NAMED_CRAWLERS], allow: '/', disallow: PRIVATE_PATHS },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
