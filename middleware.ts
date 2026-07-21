import { NextResponse, type NextRequest } from "next/server";

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";
  const corsHeaders: Record<string, string> = {};

  if (allowedOrigins.includes(origin)) {
    corsHeaders["Access-Control-Allow-Origin"] = origin;
    corsHeaders["Access-Control-Allow-Methods"] =
      "GET,POST,PATCH,DELETE,OPTIONS";
    corsHeaders["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
    corsHeaders["Vary"] = "Origin";
  }

  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  const res = NextResponse.next();
  for (const [key, value] of Object.entries(corsHeaders)) {
    res.headers.set(key, value);
  }
  return res;
}

export const config = { matcher: "/api/:path*" };
