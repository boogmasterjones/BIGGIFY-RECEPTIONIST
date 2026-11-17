// Who may crawl the public site (owner 2026-11-16: guides and tools should be found by Google AND by AI answer engines).
// The search and AI answer crawlers are named on purpose, so a future blanket rule for "*" can't shut them out by accident.
export const NAMED_CRAWLERS = [
  'Googlebot',
  'Bingbot', // also feeds ChatGPT search and Copilot
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'Perplexity-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'Google-Extended',
  'Applebot',
  'Applebot-Extended',
] as const;

/** The signed-in app, its API and the website editor: nothing there for a crawler. */
export const PRIVATE_PATHS = ['/api/', '/editor', '/login', '/auth'];
