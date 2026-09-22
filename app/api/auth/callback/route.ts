import { NextResponse } from "next/server";
import { appUrl, callbackUrl, requireEnv } from "@/lib/config";
import { fetchViewer } from "@/lib/github";
import {
  SESSION_COOKIE,
  STATE_COOKIE,
  seal,
  sessionCookieOptions,
  unseal,
} from "@/lib/session";

export const runtime = "nodejs";

type TokenResponse = {
  access_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

function fail(reason: string) {
  const url = new URL("/", appUrl());
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url.toString());
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  if (params.get("error")) return fail(params.get("error") ?? "denied");

  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) return fail("missing_code");

  const stored = unseal<{ state: string; returnTo: string }>(
    request.headers
      .get("cookie")
      ?.split("; ")
      .find((c) => c.startsWith(`${STATE_COOKIE}=`))
      ?.slice(STATE_COOKIE.length + 1),
  );
  if (!stored || stored.state !== state) return fail("bad_state");

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: requireEnv("GITHUB_CLIENT_ID"),
      client_secret: requireEnv("GITHUB_CLIENT_SECRET"),
      code,
      redirect_uri: callbackUrl(),
    }),
    cache: "no-store",
  });

  const token = (await tokenRes.json()) as TokenResponse;
  if (!token.access_token) return fail(token.error ?? "no_token");

  const viewer = await fetchViewer(token.access_token);

  const response = NextResponse.redirect(new URL(stored.returnTo, appUrl()).toString());
  response.cookies.set(
    SESSION_COOKIE,
    seal({
      accessToken: token.access_token,
      nodeId: viewer.id,
      login: viewer.login,
      name: viewer.name,
      avatarUrl: viewer.avatarUrl,
      scopes: (token.scope ?? "").split(",").filter(Boolean),
    }),
    sessionCookieOptions,
  );
  response.cookies.delete(STATE_COOKIE);
  return response;
}
