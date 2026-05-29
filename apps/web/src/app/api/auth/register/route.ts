import { NextResponse } from "next/server";
import { createIamClient } from "@ash/iam-client";

export async function POST(request: Request) {
  const body = await request.json();
  const client = createIamClient();

  const { data, error } = await client.POST("/auth/register", {
    body: {
      email: body.email,
      password: body.password,
      display_name: body.display_name,
    },
  });

  if (error) {
    const status = (error as { code?: string }).code === "conflict" ? 409 : 400;
    return NextResponse.json(error, { status });
  }

  return NextResponse.json(data, { status: 201 });
}
