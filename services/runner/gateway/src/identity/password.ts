import { argon2, randomBytes, timingSafeEqual } from 'node:crypto';

type ArgonParameters = { memory: number; passes: number; parallelism: number; tagLength: number };
// 64 MiB / 3 iterations follows the interactive Argon2id profile while p=1
// prevents a login burst from multiplying CPU lanes per request.
const PARAMETERS: ArgonParameters = { memory: 65_536, passes: 3, parallelism: 1, tagLength: 32 };

function derive(password: string, salt: Buffer, parameters = PARAMETERS): Promise<Buffer> {
  return new Promise((resolve, reject) => argon2('argon2id', { message: Buffer.from(password, 'utf8'), nonce: salt, ...parameters }, (error, key) => error ? reject(error) : resolve(key)));
}

export function validatePassword(password: unknown): string {
  if (typeof password !== 'string' || password.length < 12 || password.length > 200) throw new Error('Password must contain 12 to 200 characters');
  return password;
}

export async function hashPassword(password: string, salt = randomBytes(16)): Promise<string> {
  const value = validatePassword(password);
  const key = await derive(value, salt);
  return `$argon2id$v=19$m=${PARAMETERS.memory},t=${PARAMETERS.passes},p=${PARAMETERS.parallelism}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const match = encoded.match(/^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9_-]+)\$([A-Za-z0-9_-]+)$/);
  if (!match) return false;
  const [, memory, passes, parallelism, salt, expected] = match;
  const expectedBuffer = Buffer.from(expected, 'base64url');
  try {
    const actual = await derive(password, Buffer.from(salt, 'base64url'), { memory: Number(memory), passes: Number(passes), parallelism: Number(parallelism), tagLength: expectedBuffer.length });
    return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
  } catch { return false; }
}
