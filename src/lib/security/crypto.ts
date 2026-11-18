const encoder = new TextEncoder();

async function getHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) return null;
  const bytes = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export async function signPayload(payload: string, secret = process.env.AUTH_SECRET!): Promise<string> {
  const key = await getHmacKey(secret);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const encodedPayload = Buffer.from(payload, "utf-8").toString("base64url");
  return `${encodedPayload}.${bufferToHex(signatureBuffer)}`;
}

export async function verifySignedPayload<T = string>(
  signedValue: string,
  secret = process.env.AUTH_SECRET!
): Promise<{ valid: boolean; data?: T }> {
  const parts = signedValue.split(".");
  if (parts.length !== 2) return { valid: false };

  const [encodedPayload, signatureHex] = parts;
  const signatureBytes = hexToBytes(signatureHex);
  if (!signatureBytes) return { valid: false };

  try {
    const rawPayload = Buffer.from(encodedPayload, "base64url").toString("utf-8");
    const key = await getHmacKey(secret);
    // crypto.subtle.verify realiza comparación en tiempo constante (previene Timing Attacks)
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(rawPayload)
    );

    if (!isValid) return { valid: false };

    try {
      return { valid: true, data: JSON.parse(rawPayload) as T };
    } catch {
      return { valid: true, data: rawPayload as unknown as T };
    }
  } catch {
    return { valid: false };
  }
}
