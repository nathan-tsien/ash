import "server-only";
import type { Client } from "openapi-fetch";
import type { paths } from "@/lib/praxis/generated";
import { createPraxisFetchClient } from "@/lib/praxis/openapi-fetch-client";
import { getAccessTokenWithRefresh } from "./auth";

const PRAXIS_BASE_URL = process.env.PRAXIS_BASE_URL ?? "http://localhost:8091";

/**
 * Server-only praxis client. Talks DIRECTLY to praxis (server-to-server, no
 * CORS) and attaches the iam JWT as a Bearer header. Distinct from the browser
 * transport, which goes through the same-origin BFF. Built from the same
 * generated-paths factory, so calls are contract-bound on both sides.
 *
 * Note: getAccessTokenWithRefresh returns `string | undefined`; we normalize
 * undefined → null to satisfy createPraxisFetchClient's getToken signature.
 */
export function serverPraxisClient(): Client<paths> {
  return createPraxisFetchClient({
    baseUrl: PRAXIS_BASE_URL,
    getToken: async () => (await getAccessTokenWithRefresh()) ?? null,
  });
}
