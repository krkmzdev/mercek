import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Internal workspace packages are shipped as TS source and transpiled here.
  transpilePackages: [
    '@mercek/db',
    '@mercek/ui',
    '@mercek/sdk',
    '@mercek/core',
    '@mercek/adapter-retail',
    '@mercek/adapter-fnb',
    '@mercek/adapter-finance',
    '@mercek/adapter-manufacturing',
    '@mercek/adapter-saas',
  ],
  serverExternalPackages: ['exceljs', 'unpdf'],
  // typedRoutes deferred: it injects a `.next/**` reference into next-env.d.ts
  // that breaks a build-free `tsc --noEmit` in CI. Revisit with `next typegen`.
};

export default nextConfig;
