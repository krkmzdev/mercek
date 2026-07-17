export interface SectorContent {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  /** The signature analytical move that makes this sector's brain distinct. */
  signature: { title: string; body: string };
  dataShape: string;
  domain: string[];
  kpis: string[];
  /** What the AI surfaced on the synthetic demo dataset. */
  findings: string[];
  demoId: string;
  fixture: string;
}

export const SECTORS: SectorContent[] = [
  {
    id: 'RETAIL',
    slug: 'perakende',
    name: 'Perakende / E-Ticaret',
    tagline: 'Satış, iade ve sepet verisini perakende uzmanı gözüyle okur.',
    signature: {
      title: 'Pareto + iade anomalisi + sessiz kategori düşüşü',
      body: 'Cironun az sayıda SKU’da yoğunlaşmasını, kategori ortalamasının çok üstünde iade oranına sahip ürünleri ve toplam ciroda gizlenen kategori daralmasını ortaya çıkarır.',
    },
    dataShape: 'İşlem bazlı satış: tarih · ürün · kategori · adet · birim fiyat · ciro · maliyet · iade',
    domain: [
      'Pareto/ABC sınıflandırması ve aşırı yoğunlaşma riski',
      'Markdown ile promosyon indiriminin marj üzerindeki farkı',
      'İade oranının kategoriye göre değişimi (tekstil ≫ elektronik)',
    ],
    kpis: ['Toplam Ciro', 'AOV', 'Brüt Marj %', 'İade Oranı', 'Pareto (80/20)', 'Kategori HHI'],
    findings: [
      'AYK-003 SKU’sunun iade oranı ~%29 — kategori ortalamasının çok üstünde',
      'Elektronik kategorisi 90 günde ~%56 sessizce daraldı',
      '7. hafta derin indirim ciroyu şişirip brüt marjı çökertti',
    ],
    demoId: 'retail-demo',
    fixture: '90 gün · ~2.700 satır',
  },
  {
    id: 'FNB',
    slug: 'restoran',
    name: 'Restoran / F&B',
    tagline: 'POS verisini food cost ve menü mühendisliği gözüyle okur.',
    signature: {
      title: 'Menü mühendisliği matrisi',
      body: 'Her menü kalemini popülerlik × katkı payına göre dört çeyreğe yerleştirir — Yıldız, Beygir, Bilmece, Köpek — ve hangi kalemin yeniden fiyatlanması ya da menüden çıkarılması gerektiğini söyler.',
    },
    dataShape: 'POS satır verisi: tarih/saat · ürün · adet · tutar · yemek maliyeti · adisyon · öğün',
    domain: [
      'Menü mühendisliği 4-çeyrek: Yıldız / Beygir / Bilmece / Köpek',
      'Food cost hedef bandı 28–32%; öğün bazlı karlılık farkı',
      'Void/ikram oranının kayıp/suistimal sinyali',
    ],
    kpis: ['Food Cost %', 'Ortalama Adisyon', 'Kişi Başı Harcama', 'Menü Dogs', 'Void Oranı'],
    findings: [
      'Deniz Mahsulü Güveç menüde Köpek (Dog) — çıkarılmaya aday',
      'Köfte Beygir (Plowhorse) — yüksek hacim, düşük marj: yeniden fiyatla',
      'Öğle öğünü %62 food cost ile sessizce kârsız',
    ],
    demoId: 'fnb-demo',
    fixture: '60 gün · ~5.600 satır',
  },
  {
    id: 'FINANCE',
    slug: 'finans',
    name: 'KOBİ Finans',
    tagline: 'Mizan/finansal tabloyu likidite, nakit döngüsü ve TÜFE-reel büyüme gözüyle okur.',
    signature: {
      title: 'TÜFE-reel büyüme motoru',
      body: 'Nominal ciro büyümesini TÜİK TÜFE ile deflate eder. Türkiye’de %38 nominal büyüme, %44 enflasyonda aslında reel daralmadır — Mercek bunu açıkça söyler.',
    },
    dataShape: 'Uzun format finansal tablo: dönem · kalem (net satış, SMM, dönen varlıklar…) · değer · TÜFE',
    domain: [
      'TÜFE-reel büyüme: nominal başarı, reel daralmayı gizleyebilir',
      'Nakit dönüşüm süresi (DSO + DIO − DPO) ve nakit baskısı',
      'Likidite (cari oran, asit-test) ve kaldıraç değerlendirmesi',
    ],
    kpis: ['Cari Oran', 'Brüt/Net Marj', 'DSO/DIO/DPO', 'Nakit Dönüşüm Süresi', 'TÜFE-Reel Büyüme'],
    findings: [
      'Nominal +%38 büyüme, TÜFE +%44 → reel −%4 daralma',
      'Nakit dönüşüm süresi 8 çeyrekte 45 → 165 güne uzadı',
      'Net marj %8’den %2’ye eridi — büyürken karlılık düşüyor',
    ],
    demoId: 'finance-demo',
    fixture: '8 çeyrek · finansal tablo',
  },
  {
    id: 'MANUFACTURING',
    slug: 'uretim',
    name: 'Üretim / İmalat',
    tagline: 'Makine/iş emri verisini OEE (A×P×Q) ve duruş Pareto gözüyle okur.',
    signature: {
      title: 'OEE ayrıştırması + bağlayıcı kısıt',
      body: 'Çoğu tesis tek OEE sayısı raporlar ve yanlış faktörü optimize eder. Mercek her zaman A×P×Q’ya ayrıştırır ve bağlayıcı kısıtı isimlendirir: “bu tesisin duruş sorunu var, kalite değil.”',
    },
    dataShape: 'Makine olay kayıtları: makine · planlı/çalışma süresi · ideal çevrim · toplam/sağlam adet · duruş nedeni',
    domain: [
      'OEE = Kullanılabilirlik × Performans × Kalite; bağlayıcı kısıtı isimlendir',
      'Kompozit OEE tek bir sorunlu makineyi gizleyebilir',
      'Duruş Pareto’su: hangi nedene önce saldırılacağını söyler',
    ],
    kpis: ['OEE', 'Kullanılabilirlik', 'Performans', 'Kalite', 'Fire Oranı', 'MTBF/MTTR'],
    findings: [
      'Bağlayıcı kısıt kullanılabilirlik (duruşlar) — kalite değil',
      'M3 makinesi kompozit OEE’nin gizlediği düşük kullanılabilirlik (A~62%)',
      'En büyük duruş nedeni Kalıp Değişimi (~%53)',
    ],
    demoId: 'manufacturing-demo',
    fixture: '30 gün · 4 makine',
  },
  {
    id: 'SAAS',
    slug: 'saas',
    name: 'SaaS Metrikleri',
    tagline: 'Abonelik verisini NRR, Quick Ratio ve kohort retention gözüyle okur.',
    signature: {
      title: 'Quick Ratio ile sızdıran kova',
      body: 'MRR büyüse bile Quick Ratio ~1 ve NRR %100 altındaysa her yeni dolar bir kayıpla götürülüyordur. Mercek yeni-logo büyümesinin maskelediği churn’ü anında ifşa eder.',
    },
    dataShape: 'Aylık abonelik hareketleri: ay · müşteri · plan · mrr · kayıt tarihi',
    domain: [
      'Quick Ratio = (yeni + genişleme) ÷ (daralma + churn); sağlıklı ~4',
      'NRR < 100 ise mevcut taban küçülüyor',
      'Kohort retention eğrisi ürün-pazar uyumunu gösterir',
    ],
    kpis: ['MRR / ARR', 'NRR', 'GRR', 'Quick Ratio', 'Logo/Gelir Churn', 'Kohort Retention'],
    findings: [
      'MRR büyürken NRR %93 — mevcut taban sızdırıyor',
      'Quick Ratio 1.9 (sağlıklı ~4) — büyüme verimsiz',
      'Yüksek churn/daralma, yeni-logo büyümesiyle maskeleniyor',
    ],
    demoId: 'saas-demo',
    fixture: '18 ay · ~500 müşteri',
  },
];

export function sectorBySlug(slug: string): SectorContent | undefined {
  return SECTORS.find((s) => s.slug === slug);
}
