import { prisma } from '../lib/prisma';

export async function logAction(userId: string | null, action: string, entityType: string, entityId?: string, meta?: unknown) {
  await prisma.auditLog.create({
    data: {
      userId: userId ?? undefined,
      action,
      entityType,
      entityId,
      meta: meta ? JSON.stringify(meta) : undefined,
    },
  });
}
