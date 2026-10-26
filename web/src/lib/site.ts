/**
 * 站点级常量：基础 URL 与站点名（SEO 共用）
 * NEXT_PUBLIC_SITE_URL 在部署时配置为线上域名（如 https://quanmin.app）；
 * 本地开发默认 localhost:3000。
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(
  /\/+$/,
  ''
);
export const SITE_NAME = '全民运动';
