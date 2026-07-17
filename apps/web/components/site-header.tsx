import Link from 'next/link';
import { ThemeToggle } from './report/interactive';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Mercek
        </Link>
        <div className="flex items-center gap-5 text-sm text-muted">
          <Link href="/vaka" className="transition-colors hover:text-fg">
            Vakalar
          </Link>
          <Link href="/benchmark" className="transition-colors hover:text-fg">
            Benchmark
          </Link>
          <Link href="/analyze" className="transition-colors hover:text-fg">
            Analiz
          </Link>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
