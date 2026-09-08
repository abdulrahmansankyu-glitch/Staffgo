import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { signAccessToken, generateRefreshTokenRaw, hashToken } from '../../lib/tokens';
import { logAction } from '../../middleware/auditLog';
import { config } from '../../config';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// In production the frontend (Netlify) and API (Render) live on different
// domains, so auth cookies must be sameSite:'none' + secure to survive a
// cross-site request; locally (same-origin, plain http) 'lax'/insecure is required instead.
function setAuthCookies(res: import('express').Response, accessToken: string, refreshToken: string) {
  const isProd = process.env.NODE_ENV === 'production';
  const crossSiteOpts = isProd ? { sameSite: 'none' as const, secure: true } : { sameSite: 'lax' as const, secure: false };
  res.cookie('sg_at', accessToken, {
    httpOnly: true,
    ...crossSiteOpts,
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('sg_rt', refreshToken, {
    httpOnly: true,
    ...crossSiteOpts,
    maxAge: config.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });
}

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role, name: user.name });
  const refreshRaw = generateRefreshTokenRaw();
  const expiresAt = new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: hashToken(refreshRaw), expiresAt },
  });

  setAuthCookies(res, accessToken, refreshRaw);
  await logAction(user.id, 'LOGIN', 'User', user.id);

  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}));

router.post('/refresh', asyncHandler(async (req, res) => {
  const raw = req.cookies?.sg_rt;
  if (!raw) return res.status(401).json({ error: 'No refresh token' });

  const tokenHash = hashToken(raw);
  const record = await prisma.refreshToken.findFirst({
    where: { tokenHash, revoked: false, expiresAt: { gt: new Date() } },
    include: { user: true },
  });
  if (!record) return res.status(401).json({ error: 'Invalid or expired refresh token' });

  await prisma.refreshToken.update({ where: { id: record.id }, data: { revoked: true } });

  const newRaw = generateRefreshTokenRaw();
  const expiresAt = new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { userId: record.userId, tokenHash: hashToken(newRaw), expiresAt },
  });

  const accessToken = signAccessToken({ sub: record.user.id, role: record.user.role, name: record.user.name });
  setAuthCookies(res, accessToken, newRaw);
  res.json({ ok: true });
}));

router.post('/logout', asyncHandler(async (req, res) => {
  const raw = req.cookies?.sg_rt;
  if (raw) {
    await prisma.refreshToken.updateMany({ where: { tokenHash: hashToken(raw) }, data: { revoked: true } });
  }
  res.clearCookie('sg_at');
  res.clearCookie('sg_rt', { path: '/api/v1/auth' });
  res.json({ ok: true });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}));

// ---- User management (admin only) ----

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF']),
});

router.get('/users', requireAuth, requireRole('ADMIN'), asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ users });
}));

router.post('/users', requireAuth, requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const data = createUserSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash, role: data.role },
  });
  await logAction(req.user!.id, 'CREATE', 'User', user.id);
  res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}));

router.patch('/users/:id', requireAuth, requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).optional(),
    role: z.enum(['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF']).optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(6).optional(),
  });
  const data = schema.parse(req.body);
  const updateData: Record<string, unknown> = { ...data };
  delete updateData.password;
  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, 10);
  }
  const user = await prisma.user.update({ where: { id: req.params.id }, data: updateData });
  await logAction(req.user!.id, 'UPDATE', 'User', user.id);
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive } });
}));

export default router;
