import { registerAdapter } from '@mercek/core';
import { retailAdapter } from '@mercek/adapter-retail';

let registered = false;

/** Register all sector adapters once (composition root). Adding a sector = one
 * import + one `registerAdapter` line (spec §8.5). */
export function ensureAdaptersRegistered(): void {
  if (registered) return;
  registerAdapter(retailAdapter);
  registered = true;
}
