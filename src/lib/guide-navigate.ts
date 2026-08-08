/**
 * Allowlisted destinations for Portfolio Guide confirm-to-go navigation.
 * Never invent slugs; resume is the only intentional file link-out.
 */

import {
  extractProjectSlug,
  normalizeGuidePathname,
} from "@/lib/guide-page-meta";

const STATIC_NAV_PATHS = new Set([
  "/",
  "/about",
  "/projects",
  "/resume.pdf",
]);

export function isResumePath(path: string): boolean {
  return normalizeGuidePathname(path) === "/resume.pdf";
}

/**
 * Returns a normalized allowlisted path, or undefined if unknown/invalid.
 * Pass known project slugs on the server; omit on the client to accept any
 * well-formed `/projects/{slug}` that the API already validated.
 */
export function validateNavigateTo(
  candidate: unknown,
  projectSlugs?: Iterable<string>,
): string | undefined {
  if (typeof candidate !== "string") return undefined;
  const trimmed = candidate.trim();
  if (!trimmed || trimmed.includes("://") || trimmed.includes("..")) {
    return undefined;
  }

  const path = normalizeGuidePathname(trimmed);
  if (STATIC_NAV_PATHS.has(path)) {
    return path;
  }

  const slug = extractProjectSlug(path);
  if (!slug) return undefined;

  if (projectSlugs) {
    const allowed =
      projectSlugs instanceof Set
        ? projectSlugs
        : new Set(
            [...projectSlugs]
              .map((entry) => entry.trim().toLowerCase())
              .filter(Boolean),
          );
    if (!allowed.has(slug)) return undefined;
  }

  return `/projects/${slug}`;
}
