import type { SaasField } from './canonical';

export const SAAS_ALIASES: Record<SaasField, string[]> = {
  month: ['ay', 'dönem', 'month', 'period', 'tarih'],
  customerId: ['müşteri', 'müşteri id', 'müşteri no', 'customer', 'customer id', 'account', 'account id'],
  plan: ['plan', 'paket', 'abonelik', 'tier', 'package'],
  mrr: ['mrr', 'aylık gelir', 'aylık tekrarlayan gelir', 'monthly revenue', 'gelir'],
  status: ['durum', 'status', 'state'],
  signupDate: ['kayıt tarihi', 'başlangıç', 'signup', 'signup date', 'start date', 'başlangıç tarihi'],
  churnDate: ['ayrılma tarihi', 'iptal tarihi', 'churn date', 'cancel date'],
  seats: ['koltuk', 'kullanıcı', 'seats', 'users', 'licenses'],
  acquisitionCost: ['edinme maliyeti', 'cac', 'acquisition cost', 'kazanım maliyeti'],
};
