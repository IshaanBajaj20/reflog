import { NextResponse } from "next/server";
import { appUrl } from "@/lib/config";
import { SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";

function signOut() {
  const response = NextResponse.redirect(new URL("/", appUrl()).toString());
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const GET = signOut;
export const POST = signOut;
