import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

/**
 * Password hashing.
 *
 * The previous implementation multiplied a running integer by 31 per character
 * and truncated to 32 bits. That construction is linear, so raising any
 * character by one and lowering the next by 31 produced an identical digest:
 * "pass1234" and "qBss1234" hashed to the same value and either one opened the
 * account. It also used one fixed salt for every user, so identical passwords
 * shared a digest and a single table broke every account at once.
 *
 * scrypt is memory hard, so an attacker cannot trade cheap parallel hardware
 * for speed, and every user gets an independent random salt.
 */

type ScryptOptions = { N: number; r: number; p: number; maxmem: number };

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SALT_BYTES = 16;

// N=16384, r=8 needs roughly 16MB per hash. maxmem is set above that so node
// does not reject the call on its default 32MB ceiling.
const PARAMS: ScryptOptions = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};

const SCHEME = "scrypt";

// Base64 never emits '$', so it is a safe field delimiter.
function encode(salt: Buffer, derived: Buffer, params: ScryptOptions): string {
  return [
    SCHEME,
    params.N,
    params.r,
    params.p,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = await scrypt(
    password.normalize("NFKC"),
    salt,
    KEY_LENGTH,
    PARAMS,
  );
  return encode(salt, derived, PARAMS);
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== SCHEME) return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (![N, r, p].every((n) => Number.isInteger(n) && n > 0)) return false;

  const salt = Buffer.from(parts[4], "base64");
  const expected = Buffer.from(parts[5], "base64");
  if (salt.length === 0 || expected.length === 0) return false;

  const derived = await scrypt(
    password.normalize("NFKC"),
    salt,
    expected.length,
    {
      N,
      r,
      p,
      maxmem: PARAMS.maxmem,
    },
  );
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

/**
 * Burns roughly the same work as a real verification. Called when no account
 * matches so that response time does not reveal whether a username exists.
 */
export async function fakeVerify(): Promise<void> {
  await scrypt("placeholder", randomBytes(SALT_BYTES), KEY_LENGTH, PARAMS);
}
