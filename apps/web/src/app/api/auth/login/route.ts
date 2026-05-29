import { NextResponse } from "next/server";
import { createIamClient } from "@ash/iam-client";
import { setAuthCookies, type AuthUser } from "@/server/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const client = createIamClient();

  const { data, error } = await client.POST("/auth/login", {
    body: {
      email: body.email,
      password: body.password,
    },
  });

  if (error) {
    return NextResponse.json(error, { status: 401 });
  }

  const user: AuthUser = {
    id: data.user_id,
    email: data.email,
    role: data.role,
  };

  await setAuthCookies({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    user,
  });

  return NextResponse.json({ user });
}
