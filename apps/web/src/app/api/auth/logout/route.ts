import { NextResponse } from "next/server";
import { createIamClient } from "@ash/iam-client";
import { getRefreshToken, clearAuthCookies } from "@/server/auth";

export async function POST() {
  const refreshToken = await getRefreshToken();

  if (refreshToken) {
    const client = createIamClient();
    await client.POST("/auth/logout", {
      body: { refresh_token: refreshToken },
    });
  }

  await clearAuthCookies();
  return NextResponse.json({ logged_out: true });
}
