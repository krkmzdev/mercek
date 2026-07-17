import { registerAdapter } from '@mercek/core';
import { retailAdapter } from '@mercek/adapter-retail';
import { fnbAdapter } from '@mercek/adapter-fnb';
import { financeAdapter } from '@mercek/adapter-finance';
import { manufacturingAdapter } from '@mercek/adapter-manufacturing';
import { saasAdapter } from '@mercek/adapter-saas';

let registered = false;

/** Register all sector adapters once (composition root). Adding a sector = one
 * import + one `registerAdapter` line (spec §8.5). */
export function ensureAdaptersRegistered(): void {
  if (registered) return;
  registerAdapter(retailAdapter);
  registerAdapter(fnbAdapter);
  registerAdapter(financeAdapter);
  registerAdapter(manufacturingAdapter);
  registerAdapter(saasAdapter);
  registered = true;
}
