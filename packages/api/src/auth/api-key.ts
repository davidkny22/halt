import { randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import { API_KEY_PREFIX } from "@clawnitor/shared";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function toBase62(buf: Buffer): string {
  let result = "";
  for (const byte of buf) {
    result += BASE62[byte % 62];
  }
  return result;
}

export function generateApiKey(): { raw: string; prefix: string } {
  const random = toBase62(randomBytes(32));
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
