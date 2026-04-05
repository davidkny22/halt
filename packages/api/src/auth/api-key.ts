import { randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import { API_KEY_PREFIX } from "@clawnitor/shared";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function toBase62(length: number): string {
  let result = "";
  while (result.length < length) {
    const bytes = randomBytes(length - result.length);
    for (const byte of bytes) {
      if (byte < 248) { // 248 = 62 * 4, largest multiple of 62 fitting in a byte
        result += BASE62[byte % 62];
        if (result.length >= length) break;
      }
      // Discard biased bytes (248-255)
    }
  }
  return result;
}

export function generateApiKey(): { raw: string; prefix: string } {
  const random = toBase62(32);
  const raw = `${API_KEY_PREFIX}${random}`;
  const prefix = raw.slice(0, 16);
  return { raw, prefix };
}

export async function hashApiKey(raw: string): Promise<string> {
  return bcrypt.hash(raw, 10);
}

export async function verifyApiKey(
  raw: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(raw, hash);
}
