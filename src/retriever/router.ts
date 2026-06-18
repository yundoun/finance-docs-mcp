/**
 * Auto-extract category / domain / platform filters from a query.
 * Keyword matching based — matched hint keywords are NOT removed from search tokens.
 */

import { getConfig } from "../config.js";

export interface RouteResult {
  category?: string;
  domain?: string;
  platform?: string;
}

// ── Generic category hints ──
// These are common documentation categories that apply to most projects.

const CATEGORY_HINTS: [RegExp, string][] = [
  [/(endpoint|\bAPI\b)/i, "endpoint"],
  [/(flow|sequence)/i, "flow"],
  [/(mapping|transform)/i, "data-mapping"],
  [/(deep.?dive|internal.?logic)/i, "deep-dive"],
  [/(dependencies)/i, "dependencies"],
  [/(glossary|terminology)/i, "glossary"],
  [/(polic(?:y|ies))/i, "policies"],
  [/(features?|capabilities)/i, "features"],
  [/(onboarding|getting.?started)/i, "onboarding"],
  [/(business.?rules?)/i, "business-rules"],
  [/(overview)/i, "overview"],
  [/(guide|tutorial|how.?to)/i, "guide"],
  [/(reference|spec)/i, "reference"],
  [/(architecture|design)/i, "architecture"],
  [/(changelog|history)/i, "history"],
];

function firstMatch(query: string, hints: [RegExp, string][]): string | undefined {
  for (const [re, value] of hints) {
    if (re.test(query)) return value;
  }
  return undefined;
}

/**
 * Inject known categories from the index.
 * When hint matching fails, falls back to checking if the query contains
 * a known category name — so new categories work without updating hints.
 */
let knownCategories: Set<string> = new Set();

export function setKnownCategories(categories: string[]): void {
  knownCategories = new Set(categories);
}

export function routeQuery(query: string): RouteResult {
  const config = getConfig();

  // Category: use built-in generic hints
  let category = firstMatch(query, CATEGORY_HINTS);

  // Fallback: check if query contains a known category name from the index
  if (!category) {
    const lowerQuery = query.toLowerCase();
    for (const cat of knownCategories) {
      if (lowerQuery.includes(cat)) {
        category = cat;
        break;
      }
    }
  }

  // Domain: use config-provided hints only
  const domainHints = config.routing.domainHints;
  let domain: string | undefined;
  if (domainHints.length > 0) {
    const hints: [RegExp, string][] = domainHints.map((h) => [h.pattern, h.value]);
    domain = firstMatch(query, hints);
  }

  // Platform: use config-provided hints only
  const platformHints = config.routing.platformHints;
  let platform: string | undefined;
  if (platformHints.length > 0) {
    const hints: [RegExp, string][] = platformHints.map((h) => [h.pattern, h.value]);
    platform = firstMatch(query, hints);
  }

  return { category, domain, platform };
}
