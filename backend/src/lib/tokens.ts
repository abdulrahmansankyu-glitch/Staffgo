import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';

export interface AccessTokenPayload {
  sub: string;
  role: string;
  name: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.jwtAccessSecret, { expiresIn: config.accessTokenTtl } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.jwtAccessSecret) as AccessTokenPayload;
}

export function generateRefreshTokenRaw(): string {
  return crypto.randomBytes(40).toString('hex');
}

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
