import { Decimal, type KpiDefinition, type KpiResult, type SourceRef } from '@mercek/sdk';
import type { FinanceCanonical, FinancePeriod } from './canonical';
import { computeRealReturn } from './realreturn';

const D = (n: number): Decimal => new Decimal(n);
const DAYS = 91;

const latest = (d: FinanceCanonical): FinancePeriod | undefined => d.periods[d.periods.length - 1];
const ok = (id: string, v: number, ref: SourceRef): KpiResult => ({ kpiId: id, status: 'ok', value: D(v), evidence: [ref] });
const na = (id: string, reason: string): KpiResult => ({ kpiId: id, status: 'unavailable', unavailableReason: reason, evidence: [] });

/** Build a KPI that reads the latest period and needs the given fields. */
function periodKpi(
  id: string,
  label: { tr: string; en: string },
  unit: KpiDefinition<FinanceCanonical>['unit'],
  formula: { tr: string; en: string },
  needs: (keyof FinancePeriod)[],
  direction: KpiDefinition<FinanceCanonical>['direction'],
  interpretation: { tr: string; en: string },
  calc: (p: FinancePeriod) => number,
  benchmarkKey?: string,
): KpiDefinition<FinanceCanonical> {
  return {
    id,
    label,
    unit,
    formula,
    requiredFields: needs as string[],
    direction,
    benchmarkKey,
    interpretation,
    compute: (d) => {
      const p = latest(d);
      if (!p) return na(id, 'Dönem verisi yok.');
      for (const f of needs) if (p[f] === undefined) return na(id, `Eksik kalem: ${String(f)}`);
      const v = calc(p);
      return Number.isFinite(v) ? ok(id, v, d.sourceRef) : na(id, 'Hesaplanamadı (sıfıra bölme?).');
    },
  };
}

export function financeKpis(): KpiDefinition<FinanceCanonical>[] {
  return [
    periodKpi('current_ratio', { tr: 'Cari Oran', en: 'Current Ratio' }, 'ratio',
      { tr: 'dönen varlıklar ÷ kısa vadeli borçlar', en: 'current assets ÷ current liabilities' },
      ['currentAssets', 'currentLiabilities'], 'target-band',
      { tr: 'Sağlıklı bant ~1.5–2.0.', en: 'Healthy ~1.5–2.0.' },
      (p) => p.currentAssets! / p.currentLiabilities!, 'current_ratio'),

    periodKpi('acid_test', { tr: 'Asit-Test Oranı', en: 'Acid-Test' }, 'ratio',
      { tr: '(dönen varlıklar − stok) ÷ kısa vadeli borçlar', en: '(current assets − inventory) ÷ current liabilities' },
      ['currentAssets', 'inventory', 'currentLiabilities'], 'higher-better',
      { tr: 'Stok hariç likidite; ~1.0 üstü iyi.', en: 'Liquidity ex-inventory.' },
      (p) => (p.currentAssets! - p.inventory!) / p.currentLiabilities!),

    periodKpi('gross_margin', { tr: 'Brüt Marj %', en: 'Gross Margin %' }, 'percent',
      { tr: '(net satış − SMM) ÷ net satış × 100', en: '(sales − cogs) ÷ sales × 100' },
      ['netSales', 'cogs'], 'higher-better',
      { tr: 'Ürün/hizmet karlılığı.', en: 'Product profitability.' },
      (p) => ((p.netSales! - p.cogs!) / p.netSales!) * 100),

    periodKpi('operating_margin', { tr: 'Faaliyet Marjı %', en: 'Operating Margin %' }, 'percent',
      { tr: 'faaliyet karı ÷ net satış × 100', en: 'operating profit ÷ sales × 100' },
      ['operatingProfit', 'netSales'], 'higher-better',
      { tr: 'Esas faaliyet karlılığı.', en: 'Core operating profitability.' },
      (p) => (p.operatingProfit! / p.netSales!) * 100),

    periodKpi('net_margin', { tr: 'Net Marj %', en: 'Net Margin %' }, 'percent',
      { tr: 'net kar ÷ net satış × 100', en: 'net profit ÷ sales × 100' },
      ['netProfit', 'netSales'], 'higher-better',
      { tr: 'Nihai karlılık.', en: 'Bottom-line profitability.' },
      (p) => (p.netProfit! / p.netSales!) * 100),

    periodKpi('ebitda', { tr: 'FAVÖK (EBITDA)', en: 'EBITDA' }, 'currency',
      { tr: 'faaliyet karı + amortisman', en: 'operating profit + depreciation' },
      ['operatingProfit', 'depreciation'], 'higher-better',
      { tr: 'Amortisman öncesi faaliyet nakit karı.', en: 'Cash operating profit.' },
      (p) => p.operatingProfit! + p.depreciation!),

    periodKpi('dso', { tr: 'Alacak Devir Süresi (DSO)', en: 'DSO' }, 'days',
      { tr: 'ticari alacaklar ÷ net satış × 91', en: 'receivables ÷ sales × 91' },
      ['receivables', 'netSales'], 'lower-better',
      { tr: 'Alacakların tahsil süresi (çeyreklik).', en: 'Days sales outstanding.' },
      (p) => (p.receivables! / p.netSales!) * DAYS),

    periodKpi('dio', { tr: 'Stok Devir Süresi (DIO)', en: 'DIO' }, 'days',
      { tr: 'stok ÷ SMM × 91', en: 'inventory ÷ cogs × 91' },
      ['inventory', 'cogs'], 'lower-better',
      { tr: 'Stokun eritilme süresi.', en: 'Days inventory outstanding.' },
      (p) => (p.inventory! / p.cogs!) * DAYS),

    periodKpi('dpo', { tr: 'Borç Devir Süresi (DPO)', en: 'DPO' }, 'days',
      { tr: 'ticari borçlar ÷ SMM × 91', en: 'payables ÷ cogs × 91' },
      ['payables', 'cogs'], 'higher-better',
      { tr: 'Borç ödeme süresi (uzun = nakit avantajı).', en: 'Days payable outstanding.' },
      (p) => (p.payables! / p.cogs!) * DAYS),

    periodKpi('ccc', { tr: 'Nakit Dönüşüm Süresi', en: 'Cash Conversion Cycle' }, 'days',
      { tr: 'DSO + DIO − DPO', en: 'DSO + DIO − DPO' },
      ['receivables', 'inventory', 'payables', 'netSales', 'cogs'], 'lower-better',
      { tr: 'Nakdin bağlı kaldığı gün; uzaması nakit baskısıdır.', en: 'Cash tied-up days.' },
      (p) => (p.receivables! / p.netSales!) * DAYS + (p.inventory! / p.cogs!) * DAYS - (p.payables! / p.cogs!) * DAYS),

    periodKpi('debt_to_equity', { tr: 'Borç / Özkaynak', en: 'Debt / Equity' }, 'ratio',
      { tr: 'toplam borç ÷ özkaynak', en: 'total debt ÷ equity' },
      ['totalDebt', 'equity'], 'lower-better',
      { tr: 'Finansal kaldıraç; yüksek = risk.', en: 'Leverage.' },
      (p) => p.totalDebt! / p.equity!),

    periodKpi('working_capital', { tr: 'İşletme Sermayesi', en: 'Working Capital' }, 'currency',
      { tr: 'dönen varlıklar − kısa vadeli borçlar', en: 'current assets − current liabilities' },
      ['currentAssets', 'currentLiabilities'], 'higher-better',
      { tr: 'Kısa vadeli likidite tamponu.', en: 'Short-term liquidity buffer.' },
      (p) => p.currentAssets! - p.currentLiabilities!),

    {
      id: 'real_growth',
      label: { tr: 'TÜFE-Reel Büyüme %', en: 'CPI-Adjusted Real Growth %' },
      unit: 'percent',
      formula: { tr: '(1+nominal) ÷ (1+TÜFE) − 1, yıllık', en: '(1+nominal) ÷ (1+CPI) − 1, YoY' },
      requiredFields: ['netSales', 'cpiIndex'],
      direction: 'higher-better',
      benchmarkKey: undefined,
      interpretation: {
        tr: 'Nominal büyüme enflasyonla düzeltilir. Nominal +%38, TÜFE +%44 → reel −%3.9 gibi. Kaynak: TÜİK TÜFE.',
        en: 'Nominal growth deflated by CPI.',
      },
      compute: (d) => {
        const rr = computeRealReturn(d.periods);
        if (!rr) return na('real_growth', 'Yıllık karşılaştırma için 5 dönem + TÜFE gerekli.');
        return ok('real_growth', rr.realGrowthPct, d.sourceRef);
      },
    },
  ];
}
