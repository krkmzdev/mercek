# Mercek — Project Brief `v0.1`

> Sector-aware AI analyst. Ham operasyon verisini uzman gözüyle okuyan, 5 sektöre özel beyin taşıyan portfolyo projesi.
>
> Owner: Grimset · Status: Draft, name approval pending · Last update: 2026-07-16

---

## 1. Mercek nedir? (One-liner)

Excel, PDF veya ekran görüntüsü olarak yüklenen ham işletme verisini, o sektörün diline hâkim bir AI analistin gözüyle okuyup içgörü + aksiyon üreten sistem. Retail, F&B, KOBİ Finans, Üretim ve SaaS için tek çatı, beş ayrı beyin.

---

## 2. Neden var? (The Wedge)

- **KOBİ'ler veriye sahip, yorumcuya sahip değil.** Excel dolu, karar yok.
- **Generic AI araçları sektörden habersiz.** "CSV'yi ChatGPT'ye at" yaklaşımı yüzeysel kalıyor; food cost'un ne olduğunu, OEE'yi, kohort retention'ı kavrayamıyor.
- **Mercek'in farkı: domain intelligence katmanı.** Her sektör için gerçek KPI sözlüğü, benchmark verisi, prompt paketi ve analiz şablonu. Beş ayrı uzman AI, tek adapter arayüzü arkasında.

---

## 3. Positioning

| Alan | Karar |
|------|-------|
| Category | Multi-sector AI analiz framework'ü (portfolyo demo) |
| Primary audience | Portfolyoyu değerlendiren teknik kitle (recruiter, tech lead, potansiyel müşteri) |
| Secondary audience | Demoya rastlayan gerçek KOBİ operatörü |
| Tone | Ciddi, teknik, sakin özgüven. Hype yok, "devrimci" yok. |
| Slogan aday 1 | *"Verinin diline aşina bir AI."* |
| Slogan aday 2 | *"Ham veri, uzman gözü."* |
| Slogan aday 3 (EN) | *"Data. Understood by domain."* |

---

## 4. Sektörler (5)

1. **Retail / E-ticaret** — zaman serisi + kategorik (satış, iade, sepet)
2. **F&B / Restoran** — saat/gün paterni (POS, menü karlılığı, food cost)
3. **KOBİ Finans / Muhasebe** — tablo raporları (mizan, nakit akışı, TÜFE-adjusted)
4. **Üretim / İmalat** — event/sensor (OEE, iş emri, fire, duruş)
5. **SaaS Metrikleri** — kohort/funnel (MRR, churn, LTV)

Seçim mantığı: her sektör **farklı veri şekli**. "Tek framework, beş dil" iddiası ancak veri karakterleri farklıysa inandırıcı.

---

## 5. Scope — In

- Multi-format ingest: `.xlsx`, `.csv`, `.pdf`, `.png`, `.jpg`
- **Vision-based screenshot → tablo çıkarma** (Claude Vision)
- Sector Adapter mimarisi + SDK
- Her sektör için: KPI kütüphanesi + prompt paketi + sentetik benchmark verisi
- Streaming AI analiz + structured output
- Dashboard + PDF export
- Landing site + sektör başına case study sayfası
- GitHub monorepo, Adapter SDK dokümantasyonu, "kendi sektörünü ekle" örneği
- Sektör başına 2-3 dakikalık video walkthrough

---

## 6. Scope — Out (Non-Goals)

- ❌ Multi-tenant SaaS, billing, plan mimarisi
- ❌ Real-time / streaming ingest pipeline
- ❌ ETL / data warehouse özellikleri
- ❌ Sıfırdan eğitilmiş predictive ML modelleri
- ❌ Native mobile uygulama
- ❌ Team collaboration, sharing, comment sistemleri
- ❌ White-label / embedded analytics
- ❌ Kullanıcı verisi kalıcı saklama (demo modunda 24 saat sonra otomatik purge)

---

## 7. Success Metrics (Portfolyo KPI'ları)

| Metrik | 3 ay hedefi |
|--------|-------------|
| GitHub stars | 200+ |
| Landing bounce | < 40% |
| Ort. session süresi | > 90s |
| Demo tamamlama oranı (unique visitor içinde) | > 50% |
| Case study'nin HN/LinkedIn'de dolaşımı | En az 1 sektörden viral moment |
| Direkt sonuç (recruiter/müşteri/kolaboratör konuşması) | 3+ ciddi temas |

---

## 8. İlkeler ve Kısıtlar

**Estetik / Anti-Slop**
- Purple/indigo gradient yok, glassmorphism yok, neon-on-dark yok
- Generic AI icon set (parıldayan yıldız, orb, spark) yok
- "Revolutionizing", "AI-powered synergy" gibi kelimeler yasak
- Dark-first, yüksek kontrast, Inter veya Geist typography

**Dil**
- UI: Türkçe (primary), İngilizce (secondary — user toggle)
- README + docs: İngilizce (global reach için)
- Case studies: ikisi de

**Performance budget**
- LCP < 2.0s
- Interaction < 100ms
- Analysis TTFB < 3s (streaming ile ilk token)

**Cost budget**
- Anthropic API: aylık maks $50 demo trafiği için
- Guest rate limit: gün başına IP başına 3 analiz
- Rate limiter'ı Vercel KV veya Upstash Redis üzerinden

**Deploy**
- Single VDS (birsunucum.com), Docker Compose
- Vercel'e geçiş opsiyonel (landing için)

**Veri dürüstlüğü**
- Fake testimonial yok
- Case study verileri **tamamen sentetik**, açıkça etiketli ("Sample dataset — synthetic, for demonstration only")
- Benchmark verileri kaynak belirtilerek verilir (TÜİK, sektör raporları, veya sentetik olarak açıkça işaretli)

---

## 9. Stack (Locked)

| Katman | Teknoloji |
|--------|-----------|
| Frontend / API | Next.js 15 (App Router) + tRPC + Tailwind |
| Auth | Better Auth (magic link) |
| DB | PostgreSQL 16 + `pgvector` |
| LLM | Anthropic Claude (Sonnet default, Opus deep analysis için) |
| Vision | Claude Vision (screenshot → tablo) |
| Storage | Cloudflare R2 |
| Queue | *Deferred* — demo için synchronous yeterli |
| Deploy | Docker Compose, single VDS |
| Monorepo | Turborepo |
| Animation | Motion v12 (KELD ekosistemi disiplin kurallarıyla) |

**Monorepo iskeleti (öngörülen)**

```
mercek/
├─ apps/
│  └─ web/                     # Next.js 15 landing + demo + case studies
├─ packages/
│  ├─ core/                    # Core Engine: ingest, parse, normalize, orchestrate
│  ├─ sdk/                     # Adapter SDK — sector eklemek isteyenler için
│  ├─ adapter-retail/
│  ├─ adapter-fnb/
│  ├─ adapter-finance/
│  ├─ adapter-manufacturing/
│  ├─ adapter-saas/
│  └─ ui/                      # Shared UI komponentleri
├─ docker-compose.yml
└─ turbo.json
```

---

## 10. İsim Onayı

### Mercek

- **Anlam**: Türkçe "lens" — netlik, odak, büyütme
- **Ekosistem uyumu**: KELD (clarity) + Kâhya (steward) + Mercek (lens) → tutarlı metafor ailesi
- **Sub-brand pattern**: `Mercek • Retail`, `Mercek • Üretim`, ...
- **English pronunciation**: "mer-jek" — global kitlede takılmıyor
- **Domain check**: `mercek.dev`, `mercek.app`, `mercek.ai`, `mercek.digital` müsaitlik kontrolü gerekli

### Fallback isimler

- **Nazır** — bir alanın gözlemcisi, daha Ottoman ton
- **Basiret** — öngörü/feraset, daha felsefi
- **Kavrayış** — kavrama/anlayış, daha modern-Türkçe

**Aksiyon**: Domain müsaitlik kontrolünden sonra kilitleyelim.

---

## 11. Milestones (Rough)

| # | Aşama | Deliverable |
|---|-------|-------------|
| M0 | Brief lock | Bu doküman onayı + domain seçimi |
| M1 | İskelet | Monorepo, Core Engine, boş Adapter interface, ingest layer |
| M2 | İlk sektör (Retail) | End-to-end demo, adapter dahil çalışır durumda |
| M3 | Sektör 2–3 | F&B + Finance adapter'ları |
| M4 | Sektör 4–5 | Manufacturing + SaaS adapter'ları |
| M5 | Site + case studies | Landing sayfası, sektör başına case study, video walkthrough'lar |
| M6 | Launch | HN Show, LinkedIn, Twitter, dev.to yazısı |

Tahmini toplam: **6-8 hafta part-time** (günde ~2 saat).

---

## 12. Açık Sorular

- [ ] Domain: `mercek.dev` vs `mercek.app` vs alternatif?
- [ ] Turkish market benchmark verisi — TÜİK'ten macro, sektör-spesifik için sentetik + açık etiket?
- [ ] Case study veri dürüstlüğü — %100 sentetik, açıkça etiketli. Onaylı mı?
- [ ] Video prodüksiyon: sadece screen recording mi, voiceover'lı mı?
- [ ] Lisans stratejisi:
  - Adapter SDK (`packages/sdk`) → **MIT** (adopsiyon için)
  - Core + sector adapter'lar → **source-available** (BSL veya Elastic License; ileride SaaS pivot opsiyonu için)
  - Alternatif: tamamı MIT, safe ve basit
- [ ] Landing subdomain: `mercek.grimsetstudio.com` vs standalone domain?

---

## 13. Anti-Scope Uyarıları

Bu proje aşağıdakilere kaymayacak. Fikir gelirse "Mercek v2 için not" olarak arşivlenir.

- Genel amaçlı "AI data assistant" (spesifiklik = mercek'in silahı)
- Sektör sayısını 10+'a çıkarma (5 = brief lock, focus)
- Real-time dashboard (batch analiz felsefesi)
- Voice input, chat interface (upload → analiz → rapor akışı korunur)
- Otomatik veri kaynağı entegrasyonları (Shopify API, Trendyol API...) — v2 konusu

---

## 14. Onay Kontrolü

Aşağıdakiler kilitlendiğinde M1'e geçilir:

- [ ] İsim: **Mercek** (veya fallback)
- [ ] 5 sektör listesi
- [ ] Positioning ve slogan
- [ ] Scope In/Out
- [ ] Stack
- [ ] Milestones takvimi
- [ ] Domain seçimi

---

*"Ham veri, uzman gözü." — Mercek*
