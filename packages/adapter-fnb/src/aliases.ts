import type { FnbField } from './canonical';

/** Alias dictionary (TR + EN) for F&B POS exports (spec §10). */
export const FNB_ALIASES: Record<FnbField, string[]> = {
  datetime: ['tarih', 'saat', 'zaman', 'tarih saat', 'datetime', 'date', 'time', 'timestamp'],
  itemName: ['ürün', 'ürün adı', 'kalem', 'menü', 'menü öğesi', 'item', 'item name', 'product', 'menu item'],
  category: ['kategori', 'grup', 'menü grubu', 'category', 'group', 'menu group'],
  quantity: ['adet', 'miktar', 'qty', 'quantity', 'count'],
  unitPrice: ['birim fiyat', 'fiyat', 'unit price', 'price'],
  revenue: ['tutar', 'ciro', 'satış', 'net satış', 'toplam', 'revenue', 'amount', 'total', 'sales'],
  foodCost: ['maliyet', 'yemek maliyeti', 'food cost', 'cost', 'cogs'],
  orderId: ['adisyon', 'adisyon no', 'sipariş no', 'fiş no', 'order', 'order id', 'check', 'ticket'],
  covers: ['kişi', 'kişi sayısı', 'misafir', 'covers', 'guests', 'pax'],
  tableId: ['masa', 'masa no', 'table', 'table id'],
  voidFlag: ['iptal', 'void', 'ikram', 'comp', 'cancelled'],
  daypart: ['öğün', 'servis', 'daypart', 'meal period', 'shift'],
};
