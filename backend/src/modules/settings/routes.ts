import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { asyncHandler } from '../../middleware/errorHandler';
import { ALL_ROLES, MANAGE_ADMIN } from '../../lib/roles';
import { getCompanySettings } from '../../lib/companySettings';

const router = Router();
router.use(requireAuth);

router.get('/company', requireRole(...ALL_ROLES), asyncHandler(async (_req, res) => {
  const settings = await getCompanySettings();
  res.json({ settings });
}));

router.patch('/company', requireRole(...MANAGE_ADMIN), asyncHandler(async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).optional(),
    addressLine: z.string().optional(),
    crNumber: z.string().optional(),
    vatNumber: z.string().optional(),
    phone: z.string().optional(),
    logoUrl: z.string().optional(),
    currency: z.string().optional(),
    defaultVatRate: z.number().optional(),
    quotationPrefix: z.string().optional(),
    salesOrderPrefix: z.string().optional(),
    invoicePrefix: z.string().optional(),
    deliveryNotePrefix: z.string().optional(),
    purchaseOrderPrefix: z.string().optional(),
    purchaseBillPrefix: z.string().optional(),
    materialRequestPrefix: z.string().optional(),
  });
  const data = schema.parse(req.body);
  await getCompanySettings();
  const settings = await prisma.companySettings.update({ where: { id: 'default' }, data });
  res.json({ settings });
}));

// Stored as a base64 data URI directly in the database (not on local disk):
// Render's free tier filesystem is ephemeral and wipes uploaded files on
// every restart (which happens automatically after ~15 min idle), so a
// disk-based upload silently breaks a few minutes after it's saved. The
// database is the only thing on this stack that's actually persistent.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(file.mimetype)) {
      return cb(new Error('Logo must be a PNG, JPG, SVG, or WebP image'));
    }
    cb(null, true);
  },
});

router.post('/company/logo', requireRole(...MANAGE_ADMIN), upload.single('logo'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  await getCompanySettings();
  const logoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  const settings = await prisma.companySettings.update({ where: { id: 'default' }, data: { logoUrl } });
  res.json({ settings });
}));

export default router;
