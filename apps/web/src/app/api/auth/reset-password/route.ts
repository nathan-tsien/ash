import { NextResponse } from "next/server";
import { createIamClient } from "@ash/iam-client";

export async function POST(request: Request) {
  const body = await request.json();
  const client = createIamClient();

  const { data, error } = await client.POST("/auth/password/reset", {
    body: {
      email: body.email,
      code: body.code,
      new_password: body.new_password,
    },
  });

  if (error) {
    return NextResponse.json(error, { status: 400 });
  }

  return NextResponse.json(data);
}
