import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { GITHUB_SCOPES, appUrl, callbackUrl } from "@/lib/config";
import { STATE_COOKIE, seal } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    // Surfaces as a readable message on the landing page rather than a 500.
    const url = new URL("/", appUrl());
    url.searchParams.set("error", "not_configured");
    return NextResponse.redirect(url.toString());
  }

  // CSRF state, sealed into a short-lived cookie and echoed back by GitHub.
  const state = crypto.randomBytes(16).toString("base64url");
  const returnTo = new URL(request.url).searchParams.get("returnTo") ?? "/debug";

  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", callbackUrl());
  authorize.searchParams.set("scope", GITHUB_SCOPES.join(" "));
  authorize.searchParams.set("state", state);

  const response = NextResponse.redirect(authorize.toString());
  response.cookies.set(STATE_COOKIE, seal({ state, returnTo }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return response;
}
