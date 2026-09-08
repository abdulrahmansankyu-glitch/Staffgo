export const config = {
  port: Number(process.env.PORT || 4000),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  accessTokenTtl: '15m',
  refreshTokenTtlDays: 14,
  defaultVatRate: Number(process.env.DEFAULT_VAT_RATE || 15),
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'SAR',
};
