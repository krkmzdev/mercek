/**
 * Public deploy switch. On the hosted demo (Vercel) we set
 * `NEXT_PUBLIC_UPLOADS_ENABLED=false` so visitors can only browse the
 * pre-computed sample reports — no live upload, no LLM cost, no abuse surface.
 * Unset (local dev) means uploads are enabled.
 */
export const uploadsEnabled = process.env.NEXT_PUBLIC_UPLOADS_ENABLED !== 'false';
