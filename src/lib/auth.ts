import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hash a plain text password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return await bcrypt.hash(password, salt);
}

/**
 * Compare a plain text password with a hashed password
 */
export async function comparePasswords(password: string, hashed: string): Promise<boolean> {
  return await bcrypt.compare(password, hashed);
}

/**
 * Basic email validation
 */
export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Password strength validation
 * At least 8 characters
 */
export function isStrongPassword(password: string): boolean {
  return password.length >= 8;
}
