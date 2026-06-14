import "server-only";
import type { Client } from "openapi-fetch";
import type { paths } from "@/lib/praxis/generated";
import { createPraxisFetchClient } from "@/lib/praxis/openapi-fetch-client";
import { getAccessToken } from "./auth";

const PRAXIS_BASE_URL = process.env.PRAXIS_BASE_URL ?? "http://localhost:8091";

/**
 * Server-only praxis client. Talks DIRECTLY to praxis (server-to-server, no
 * CORS) and attaches the iam JWT as a Bearer header. Distinct from the browser
 * transport, which goes through the same-origin BFF. Built from the same
 * generated-paths factory, so calls are contract-bound on both sides.
 *
 * Token is resolved READ-ONLY (no refresh). This client runs during React
 * Server Component render, where cookie mutation is forbidden ("Cookies can
 * only be modified in a Server Action or Route Handler") — and a refresh would
 * rotate + persist tokens, so it must never run here. When the access token has
 * expired the SSR fetch simply 401s and the loaders fall back to empty data; the
 * token is refreshed by the writable paths instead (the BFF forwardToPraxis,
 * /api/auth/me, /api/auth/refresh) and by the client AuthProvider on mount, so
 * the next BFF call / navigation renders with a fresh token.
 *
 * Note: getAccessToken returns `string | undefined`; we normalize undefined →
 * null to satisfy createPraxisFetchClient's getToken signature.
 */
export function serverPraxisClient(): Client<paths> {
  return createPraxisFetchClient({
    baseUrl: PRAXIS_BASE_URL,
    getToken: async () => (await getAccessToken()) ?? null,
  });
}
