import { NextResponse } from "next/server";
import { getAuthUser, refreshAccessToken } from "@/server/auth";

export async function GET() {
  let user = await getAuthUser();

  if (!user) {
    user = await refreshAccessToken();
  }

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({ user });
}
