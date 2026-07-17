# Örnek veriler

Her sektör için **analiz edilebilir örnek Excel** dosyaları. Uygulamada
`Analize başla → [sektör] → Analiz et` akışında bu dosyaları yükleyerek
(veya sektör sayfasındaki "Örnek Excel’i indir" bağlantısıyla) deneyebilirsin.

| Dosya | Sektör | İçerik |
|---|---|---|
| `perakende.xlsx` | Perakende / E-Ticaret | 90 gün satış (tarih · ürün · kategori · adet · fiyat · ciro · maliyet · iade) |
| `restoran-fnb.xlsx` | Restoran / F&B | 60 gün POS (ürün · adet · tutar · yemek maliyeti · adisyon · öğün) |
| `finans.xlsx` | KOBİ Finans | 8 çeyrek finansal tablo (dönem · kalem · değer · TÜFE) |
| `uretim.xlsx` | Üretim / İmalat | 30 gün makine kaydı (makine · süreler · adet · duruş nedeni) |
| `saas.xlsx` | SaaS | 18 ay abonelik (ay · müşteri · plan · mrr) |

> Tüm veriler **sentetiktir** ve içlerine kasıtlı sorunlar yerleştirilmiştir
> (ör. anormal iade oranı, kârsız öğün, reel daralma). Analiz bunları bulur.
>
> Yeniden üretmek için: `pnpm --filter @mercek/core gen:ornek`
