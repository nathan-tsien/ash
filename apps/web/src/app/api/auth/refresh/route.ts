import { NextResponse } from "next/server";
import { refreshAccessToken } from "@/server/auth";

export async function POST() {
  const user = await refreshAccessToken();
  if (!user) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }
  return NextResponse.json({ user });
}
