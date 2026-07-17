import type { PeriodField } from './canonical';

/** Long-format column aliases (period · line item · value). */
export const COLUMN_ALIASES = {
  period: ['dönem', 'donem', 'period', 'çeyrek', 'ceyrek', 'tarih', 'quarter'],
  lineItem: ['kalem', 'hesap', 'hesap adı', 'açıklama', 'line item', 'account', 'item'],
  value: ['değer', 'deger', 'tutar', 'bakiye', 'value', 'amount', 'balance'],
};

/** Financial line-item name → canonical field (spec §10.3). */
export const LINE_ITEM_ALIASES: Record<PeriodField, string[]> = {
  netSales: ['net satışlar', 'net satış', 'satış gelirleri', 'hasılat', 'ciro', 'net sales', 'revenue'],
  cogs: ['satışların maliyeti', 'smm', 'satılan malın maliyeti', 'satılan mamül maliyeti', 'cogs', 'cost of sales'],
  grossProfit: ['brüt kar', 'brüt satış karı', 'gross profit'],
  operatingProfit: ['faaliyet karı', 'esas faaliyet karı', 'operating profit'],
  netProfit: ['net kar', 'dönem net karı', 'net dönem karı', 'net profit', 'net income'],
  depreciation: ['amortisman', 'amortismanlar', 'depreciation', 'amortization'],
  currentAssets: ['dönen varlıklar', 'current assets'],
  inventory: ['stoklar', 'stok', 'inventory'],
  receivables: ['ticari alacaklar', 'alacaklar', 'trade receivables', 'receivables'],
  currentLiabilities: ['kısa vadeli yükümlülükler', 'kısa vadeli borçlar', 'current liabilities'],
  payables: ['ticari borçlar', 'kısa vadeli ticari borçlar', 'trade payables', 'payables'],
  totalDebt: ['toplam borç', 'toplam yükümlülükler', 'yabancı kaynaklar', 'total debt', 'total liabilities'],
  equity: ['özkaynaklar', 'özsermaye', 'öz kaynaklar', 'equity', 'shareholders equity'],
  cpiIndex: ['tüfe', 'tüfe endeksi', 'tufe', 'cpi', 'enflasyon endeksi', 'tüik tüfe'],
};
