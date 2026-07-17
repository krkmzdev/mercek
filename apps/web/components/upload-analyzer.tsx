'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

type Status = 'idle' | 'uploading' | 'error';

export function UploadAnalyzer({ sector, sectorName }: { sector: string; sectorName: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const submit = async (): Promise<void> => {
    if (!file) return;
    setStatus('uploading');
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('sector', sector);
      const res = await fetch('/api/analyze', { method: 'POST', body });
      const data = (await res.json()) as { reportId?: string; error?: string };
      if (!res.ok || !data.reportId) throw new Error(data.error ?? 'Analiz başarısız.');
      router.push(`/r/${data.reportId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
      setStatus('error');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) setFile(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragOver ? 'border-accent bg-accent/5' : 'border-border hover:border-borderStrong'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.tsv,.pdf,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <span className="text-2xl">⤒</span>
        {file ? (
          <span className="font-mono text-sm text-fg">{file.name}</span>
        ) : (
          <>
            <span className="text-sm font-medium">{sectorName} verini buraya bırak</span>
            <span className="font-mono text-xs text-faint">Excel · CSV · PDF · ekran görüntüsü</span>
          </>
        )}
      </div>

      {error && <p className="rounded-lg border border-critical/35 bg-critical/10 px-3.5 py-2 text-sm text-critical">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!file || status === 'uploading'}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {status === 'uploading' ? 'Analiz ediliyor… (birkaç saniye)' : 'Analiz et →'}
      </button>
      <p className="font-mono text-[0.68rem] text-faint">
        Dosyan sunucuda kalıcı saklanmaz; yalnızca analiz sonucu tutulur ve 24 saatte otomatik silinir.
      </p>
    </div>
  );
}
