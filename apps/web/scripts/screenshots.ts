/**
 * Captures README screenshots of the running app using the system Chrome
 * (no browser download). Requires the dev server on http://localhost:3000.
 * Run: pnpm --filter @mercek/web screenshots
 */
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.SCREENSHOT_BASE ?? 'http://localhost:3000';
const outDir = resolve(process.cwd(), '../../docs/screenshots');

interface Shot {
  path: string;
  name: string;
  fullPage?: boolean;
  clipHeight?: number;
}

const SHOTS: Shot[] = [
  { path: '/', name: 'landing', fullPage: true },
  { path: '/analyze', name: 'analiz', fullPage: true },
  { path: '/r/finance-demo', name: 'rapor-finans', fullPage: true },
  { path: '/r/finance-demo', name: 'sade-ozet', clipHeight: 720 },
  { path: '/r/fnb-demo', name: 'rapor-menu', fullPage: true },
  { path: '/vaka/finans', name: 'vaka', fullPage: true },
];

async function main(): Promise<void> {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  const context = await browser.newContext({
    viewport: { width: 1360, height: 900 },
    colorScheme: 'dark',
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  for (const shot of SHOTS) {
    await page.goto(`${BASE}${shot.path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1800); // let Recharts render
    const file = resolve(outDir, `${shot.name}.png`);
    if (shot.clipHeight) {
      await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1360, height: shot.clipHeight } });
    } else {
      await page.screenshot({ path: file, fullPage: shot.fullPage ?? false });
    }
    console.log(`  ✓ ${shot.name}.png  (${shot.path})`);
  }

  await browser.close();
  console.log(`\nEkran görüntüleri → ${outDir}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
