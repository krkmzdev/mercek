'use client';

import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc/client';

/** Proves the end-to-end typed tRPC round-trip from the client. */
export function HealthCheck() {
  const trpc = useTRPC();
  const ping = useQuery(trpc.health.ping.queryOptions());

  return (
    <div className="rounded-lg border border-[--color-border] bg-[--color-surface] px-4 py-3 text-sm">
      <span className="text-[--color-muted]">tRPC:</span>{' '}
      {ping.isLoading ? (
        <span className="text-[--color-muted]">bağlanıyor…</span>
      ) : ping.data?.ok ? (
        <span className="text-[--color-positive]">
          ● {ping.data.service} · {ping.data.time.toLocaleTimeString('tr-TR')}
        </span>
      ) : (
        <span className="text-[--color-critical]">● bağlantı yok</span>
      )}
    </div>
  );
}
