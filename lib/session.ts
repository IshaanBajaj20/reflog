import crypto from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "reflog_session";
export const STATE_COOKIE = "reflog_oauth_state";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

export type Session = {
  /** GitHub OAuth access token. Never leaves the server. */
  accessToken: string;
  /** GitHub node id of the viewer, used as the cache key for generated text. */
  nodeId: string;
  login: string;
  name: string | null;
  avatarUrl: string;
  /** Whether the token carries the `repo` scope (i.e. private work is visible). */
  scopes: string[];
};

function encryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET is missing. Add it to .env.local — generate one with: openssl rand -base64 32",
    );
  }
  return crypto.createHash("sha256").update(secret).digest();
}

/** Encrypt an arbitrary JSON-serialisable value into a cookie-safe string. */
export function seal(value: unknown): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

/** Reverse of `seal`. Returns null for anything tampered with or stale. */
export function unseal<T>(token: string | undefined): T | null {
  if (!token) return null;
  try {
    const raw = Buffer.from(token, "base64url");
    if (raw.length <= IV_BYTES + TAG_BYTES) return null;
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      encryptionKey(),
      raw.subarray(0, IV_BYTES),
    );
    decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    const plain = Buffer.concat([
      decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)),
      decipher.final(),
    ]);
    return JSON.parse(plain.toString("utf8")) as T;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  return unseal<Session>(jar.get(SESSION_COOKIE)?.value);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
} as const;
