/**
 * Resolve a praxis attachment `uri` to a browser URL that flows through the BFF
 * proxy (so the ash access token is attached). praxis references under
 * `/v1/tasks/**` are proxiable via `/api/praxis`; a fully-external link is left
 * as-is (opened directly).
 */
export function deliverableHref(uri: string): string {
  // External link (not a praxis path) → leave unchanged.
  if (/^https?:\/\//u.test(uri)) {
    try {
      const u = new URL(uri);
      if (/^\/v1\/tasks\//u.test(u.pathname)) return `/api/praxis${u.pathname}${u.search}`;
      return uri; // genuinely external
    } catch {
      return uri;
    }
  }
  const path = uri.startsWith("/") ? uri : `/${uri}`;
  return `/api/praxis${path}`;
}
