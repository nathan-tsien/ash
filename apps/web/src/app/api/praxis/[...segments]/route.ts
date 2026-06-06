import { forwardToPraxis } from "@/server/praxis";

// Cookies + SSE body streaming require the Node runtime and no caching.
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ segments: string[] }>;
}

export async function GET(request: Request, { params }: RouteContext): Promise<Response> {
  const { segments } = await params;
  return forwardToPraxis(request, segments);
}

export async function POST(request: Request, { params }: RouteContext): Promise<Response> {
  const { segments } = await params;
  return forwardToPraxis(request, segments);
}
