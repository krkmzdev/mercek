import type { RetailField } from './canonical';

/**
 * Alias dictionary (TR + EN) — the unglamorous work that makes the demo feel
 * magic (spec §10). The mapper runs exact → alias → fuzzy over these before
 * ever calling the LLM.
 */
export const RETAIL_ALIASES: Record<RetailField, string[]> = {
  date: ['tarih', 'gün', 'işlem tarihi', 'satış tarihi', 'date', 'order date', 'day'],
  sku: ['sku', 'ürün kodu', 'stok kodu', 'barkod', 'product code', 'item code'],
  productName: ['ürün', 'ürün adı', 'ürün ismi', 'product', 'product name', 'item', 'item name'],
  category: ['kategori', 'ürün grubu', 'grup', 'category', 'product group', 'department'],
  quantity: ['adet', 'miktar', 'satış adedi', 'qty', 'quantity', 'units', 'count'],
  unitPrice: ['birim fiyat', 'fiyat', 'satış fiyatı', 'unit price', 'price'],
  revenue: [
    'ciro',
    'satış tutarı',
    'toplam satış',
    'net satış',
    'tutar',
    'revenue',
    'sales',
    'amount',
    'total',
  ],
  cost: ['maliyet', 'alış fiyatı', 'birim maliyet', 'cogs', 'cost', 'unit cost'],
  discount: ['iskonto', 'indirim', 'indirim tutarı', 'discount', 'markdown'],
  returnFlag: ['iade', 'iade mi', 'iade edildi', 'return', 'returned', 'is return'],
  channel: ['kanal', 'satış kanalı', 'channel', 'sales channel'],
  customerId: ['müşteri', 'müşteri no', 'müşteri id', 'customer', 'customer id', 'client id'],
};
