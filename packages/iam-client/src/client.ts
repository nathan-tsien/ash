import createClient from "openapi-fetch";
import type { paths } from "./types";

const IAM_BASE_URL =
  process.env.IAM_BASE_URL ?? "http://localhost:8090";

export function createIamClient() {
  return createClient<paths>({
    baseUrl: `${IAM_BASE_URL}/v1/apps/ash`,
  });
}

export type IamClient = ReturnType<typeof createIamClient>;
