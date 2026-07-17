'use client';

import { useEffect, useState } from 'react';

/** Light/dark toggle. Stamps data-theme on <html>, overriding prefers-color-scheme. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('mercek-theme') as 'light' | 'dark' | null;
    if (stored) document.documentElement.dataset.theme = stored;
    const initial = stored ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    // Theme can only be resolved on the client (localStorage/matchMedia) — a
    // one-time mount sync is the intended pattern here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(initial);
  }, []);

  const toggle = (): void => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('mercek-theme', next);
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Temayı değiştir"
      className="rounded-md border border-border px-2.5 py-1.5 font-mono text-xs text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
    >
      {theme === 'dark' ? '☾ Koyu' : '☀ Açık'}
    </button>
  );
}

/** Opens the print dialog (browser "Save as PDF") using the print stylesheet. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md border border-border px-2.5 py-1.5 font-mono text-xs text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
    >
      ⤓ PDF / Yazdır
    </button>
  );
}
