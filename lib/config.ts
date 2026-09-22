/** Scopes we ask for. `repo` is metadata-only for our purposes — see the privacy note. */
export const GITHUB_SCOPES = ["read:user", "repo"] as const;

export function appUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  // Vercel sets this automatically on preview deployments.
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function callbackUrl(): string {
  return `${appUrl()}/api/auth/callback`;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is missing. Copy .env.example to .env.local and fill it in.`);
  }
  return value;
}

/** The year a wrapped is generated for. Overridable for testing past years. */
export const DEFAULT_YEAR = Number(process.env.REFLOG_YEAR) || new Date().getFullYear();
