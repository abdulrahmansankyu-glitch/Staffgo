import { nanoid } from 'nanoid';
import crypto from 'crypto';

// Short, URL-friendly slug for public share links: /s/:slug
export function generateSlug(): string {
  return nanoid(8);
}

export function generateToken(): string {
  return crypto.randomBytes(24).toString('hex');
}
