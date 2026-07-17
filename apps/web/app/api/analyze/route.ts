import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import {
  UpstashRateLimiter,
  checkDailyCeiling,
  createDbSpendTracker,
  validateUpload,
  type RateLimiter,
} from '@mercek/core';
import type { SectorId } from '@mercek/sdk';
import { prisma } from '@mercek/db';
import { analyzeFile } from '@/lib/analyze-file';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SECTORS: SectorId[] = ['RETAIL', 'FNB', 'FINANCE', 'MANUFACTURING', 'SAAS'];

function rateLimiter(): RateLimiter | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new UpstashRateLimiter(new Redis({ url, token }));
}

function guestIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return fwd?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'anon';
}

export async function POST(req: Request): Promise<NextResponse> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
  }

  const file = form.get('file');
  const sector = String(form.get('sector') ?? '') as SectorId;
  if (!(file instanceof Blob) || !SECTORS.includes(sector)) {
    return NextResponse.json({ error: 'Dosya ve geçerli bir sektör gerekli.' }, { status: 400 });
  }

  const filename = (file instanceof File ? file.name : '') || 'yukleme';
  const bytes = new Uint8Array(await file.arrayBuffer());
  const valid = validateUpload({ fileId: 'upload', filename, mimeType: file.type, sizeBytes: bytes.length });
  if (!valid.ok) return NextResponse.json({ error: valid.reason }, { status: 400 });

  const ip = guestIp(req);

  // Rate limit (guest: 3/IP/gün).
  const rl = rateLimiter();
  if (rl) {
    const r = await rl.limit(ip, 'guest');
    if (!r.success) {
      return NextResponse.json({ error: 'Günlük demo kotası doldu (3 analiz). Yarın tekrar deneyin.' }, { status: 429 });
    }
  }

  // Günlük maliyet tavanı (§9.4).
  const ceiling = await checkDailyCeiling(createDbSpendTracker(prisma), Number(process.env.MAX_DAILY_SPEND_USD ?? 2));
  if (!ceiling.allowed) {
    return NextResponse.json({ error: 'Demo kotası doldu, yarın tekrar deneyin. (Örnek raporlar çalışmaya devam eder.)' }, { status: 429 });
  }

  try {
    const { reportId } = await analyzeFile({ bytes, filename, mimeType: file.type, sector, guestIp: ip });
    return NextResponse.json({ reportId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analiz sırasında bir hata oluştu.';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
