/**
 * Shared-password admin auth. The session cookie is HMAC-signed and carries the
 * display name the person signed in with, which is stamped on every audit entry.
 * Web Crypto only, so it runs in the proxy and in server actions.
 */
export const SESSION_COOKIE = "sy_admin";
const SESSION_TTL_S = 60 * 60 * 24 * 7;

export function adminPassword(): string | null {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  return process.env.NODE_ENV === "production" ? null : "admin";
}

function secret() {
  return process.env.ADMIN_SECRET ?? `sy:${adminPassword() ?? ""}`;
}

const enc = new TextEncoder();

async function hmac(data: string, key = secret()) {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(data));
  return Buffer.from(sig).toString("base64url");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function checkPassword(input: string) {
  const expected = adminPassword();
  if (!expected) return false;
  // Compare digests so timing doesn't leak the password length or prefix.
  return safeEqual(await hmac(input, "pw"), await hmac(expected, "pw"));
}

export async function createSessionToken(name: string) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_S;
  const payload = `${exp}.${Buffer.from(name).toString("base64url")}`;
  return { token: `${payload}.${await hmac(payload)}`, maxAge: SESSION_TTL_S };
}

/** Returns the signed-in person's name, or null when the token is missing, forged or expired. */
export async function verifySessionToken(token: string | undefined): Promise<string | null> {
  if (!token || !adminPassword()) return null;
  const [exp, name, sig] = token.split(".");
  if (!exp || !name || !sig || Number(exp) < Date.now() / 1000) return null;
  if (!safeEqual(sig, await hmac(`${exp}.${name}`))) return null;
  return Buffer.from(name, "base64url").toString();
}
