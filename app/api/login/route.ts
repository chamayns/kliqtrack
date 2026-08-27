import { NextResponse } from "next/server";

const SESSION_COOKIE = "kliq_session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const username = process.env.KLIQ_ADMIN_USERNAME;
  const password = process.env.KLIQ_ADMIN_PASSWORD;

  if (!username || !password) {
    return NextResponse.json({ error: "Login is not configured" }, { status: 500 });
  }

  if (body?.username !== username || body?.password !== password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "authenticated",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return response;
}
