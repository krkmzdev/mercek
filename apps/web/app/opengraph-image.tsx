import { ImageResponse } from 'next/og';

// Sosyal paylaşımlarda (LinkedIn, X, Slack) çıkan 1200×630 önizleme kartı.
// GitHub "Social preview" için de bu görselin ekran görüntüsü kullanılabilir.
export const alt = 'Mercek — Sektöre duyarlı AI analist';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0a0a0b',
          padding: '72px 80px',
          fontFamily: 'sans-serif',
          color: '#ededef',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: 16,
              background: '#4fb08c',
              color: '#0a0a0b',
              fontSize: 40,
              fontWeight: 800,
            }}
          >
            M
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>Mercek</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.1, letterSpacing: -2 }}>
            Sektöre duyarlı AI analist
          </div>
          <div style={{ fontSize: 34, color: '#9a9aa2', lineHeight: 1.35, maxWidth: 900 }}>
            Ham operasyon verisini uzman gözüyle okur. Her sayı kaynak hücresine kadar
            izlenebilir.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 26 }}>
          <span style={{ color: '#4fb08c', fontWeight: 700 }}>“Ham veri, uzman gözü.”</span>
          <span style={{ color: '#35353c' }}>|</span>
          <span style={{ color: '#9a9aa2' }}>
            Perakende · F&amp;B · Finans · Üretim · SaaS
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
