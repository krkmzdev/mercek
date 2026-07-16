/**
 * Google API key selection per environment tier (spec §9.3). Production must
 * never boot on the dev key — fail loudly at startup if the prod key is absent.
 */
export interface KeyEnv {
  nodeEnv: string | undefined;
  devKey: string | undefined;
  prodKey: string | undefined;
}

export function resolveGoogleApiKey(env: KeyEnv): string {
  const isProd = env.nodeEnv === 'production';
  if (isProd) {
    if (!env.prodKey) {
      throw new Error(
        'GOOGLE_API_KEY_PROD is required in production (EEA/UK paid-tier terms + no training-data clause). Refusing to boot on the dev key.',
      );
    }
    return env.prodKey;
  }
  const key = env.devKey ?? env.prodKey;
  if (!key) {
    throw new Error('No Google API key configured (set GOOGLE_API_KEY_DEV).');
  }
  return key;
}

/** Convenience: resolve from `process.env`. */
export function resolveGoogleApiKeyFromProcess(): string {
  return resolveGoogleApiKey({
    nodeEnv: process.env.NODE_ENV,
    devKey: process.env.GOOGLE_API_KEY_DEV,
    prodKey: process.env.GOOGLE_API_KEY_PROD,
  });
}
