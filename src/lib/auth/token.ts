const encoder = new TextEncoder();

const toBase64Url = (bytes: Uint8Array): string =>
  Buffer.from(bytes).toString("base64url");

const fromBase64Url = (value: string): Uint8Array =>
  new Uint8Array(Buffer.from(value, "base64url"));

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

/** Constant-time comparison, so signature checking cannot be timed. */
function equal(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Sign a payload with an expiry, `ttlMinutes` from `now`. A random nonce is
 * folded in so two links issued in the same second are not identical.
 */
export async function signToken(
  payload: Record<string, unknown>,
  secret: string,
  ttlMinutes: number,
  now: Date = new Date(),
): Promise<string> {
  const body = {
    ...payload,
    exp: Math.floor(now.getTime() / 1000) + ttlMinutes * 60,
    nonce: crypto.randomUUID(),
  };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(encoded));
  return `${encoded}.${toBase64Url(new Uint8Array(signature))}`;
}

/** Verify signature then expiry. Returns null on any failure — never throws. */
export async function verifyToken<T>(
  token: string,
  secret: string,
  now: Date = new Date(),
): Promise<(T & { exp: number }) | null> {
  try {
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) return null;

    const expected = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(encoded));
    if (!equal(new Uint8Array(expected), fromBase64Url(signature))) return null;

    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (typeof payload.exp !== "number") return null;
    if (Math.floor(now.getTime() / 1000) >= payload.exp) return null;

    return payload as T & { exp: number };
  } catch {
    return null;
  }
}
