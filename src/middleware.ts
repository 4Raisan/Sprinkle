import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthed = !!req.auth?.user?.id;
  const isProtected = nextUrl.pathname.startsWith("/dashboard");

  if (isProtected && !isAuthed) {
    const url = new URL("/auth/signin", nextUrl);
    url.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*"],
  runtime: "nodejs",
};
