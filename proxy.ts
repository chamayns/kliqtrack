import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "kliq_session";

export function proxy(request: NextRequest) {
  const isLoggedIn = request.cookies.get(SESSION_COOKIE)?.value === "authenticated";

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
