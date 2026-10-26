/**
 * @akalin/order_module - Tescilli Kart ve Belge Tanımları (entities.ts)
 * Modüle ait tüm kartlar, belgeler ve raporlar bu kütükte register edilir.
 * Bu kütükte tescil edilmemiş hiçbir liste, kart veya belge menüde gösterilmez ve açılamaz.
 */

import type { IModuleEntityDefinition } from '@akalin/module_core';

export const orderCards: IModuleEntityDefinition[] = [];

export const orderDocuments: IModuleEntityDefinition[] = [
  {
    id: 'sicak-satis-teklifi',
    category: 'belge',
    titleKey: 'Sıcak Satış / Teklifler',
    title: 'Sıcak Satış / Teklifler',
    description: 'Müşterilere verilen fiyat teklifleri ve sıcak satış süreçleri',
    route: '/siparisler/teklif',
    listRoute: '/siparisler/teklif',
    formRoute: '/siparisler/teklif/:id',
    useStandardCrud: true,
    showInMenu: true,
    isRegistered: true,
    customActions: [
      { action: 'siparise-donustur', labelKey: 'Siparişe Dönüştür', description: 'Teklif seçeneğini alınan siparişe dönüştürme' },
      { action: 'maliyet-analiz', labelKey: 'Kârlılık Analizi Görme', description: 'Maliyet ve net kâr kırılımını görüntüleme' }
    ]
  },
  {
    id: 'alinan-siparis',
    category: 'belge',
    titleKey: 'Alınan Sipariş',
    title: 'Alınan Sipariş',
    description: 'Müşterilerden gelen siparişler ve onay süreçleri',
    route: '/siparisler/alinan',
    listRoute: '/siparisler/alinan',
    formRoute: '/siparisler/alinan/:id',
    useStandardCrud: true,
    showInMenu: true,
    isRegistered: true,
    customActions: [
      { action: 'onayla', labelKey: 'Sipariş Onaylama', description: 'Müşteri siparişini onaylama' },
      { action: 'irsaliye-aktar', labelKey: 'İrsaliyeye Aktar', description: 'Siparişi sevk irsaliyesine dönüştürme' },
      { action: 'fatura-aktar', labelKey: 'Faturaya Aktar', description: 'Siparişi faturaya dönüştürme' },
      { action: 'iptal-et', labelKey: 'Sipariş İptal Et', description: 'Siparişi iptal etme', danger: true }
    ]
  },
  {
    id: 'verilen-siparis',
    category: 'belge',
    titleKey: 'Verilen Sipariş',
    title: 'Verilen Sipariş',
    description: 'Tedarikçilere geçilen ürün/mal siparişleri',
    route: '/siparisler/verilen',
    listRoute: '/siparisler/verilen',
    formRoute: '/siparisler/verilen/:id',
    useStandardCrud: true,
    showInMenu: true,
    isRegistered: true,
    customActions: [
      { action: 'onayla', labelKey: 'Sipariş Onaylama', description: 'Tedarikçi siparişini onaylama' },
      { action: 'irsaliye-aktar', labelKey: 'İrsaliyeye Aktar', description: 'Siparişi alış irsaliyesine dönüştürme' },
      { action: 'fatura-aktar', labelKey: 'Faturaya Aktar', description: 'Siparişi alış faturasına dönüştürme' },
      { action: 'iptal-et', labelKey: 'Sipariş İptal Et', description: 'Siparişi iptal etme', danger: true }
    ]
  },
  {
    id: 'alinan-siparis-iade',
    category: 'belge',
    titleKey: 'Alınan Sipariş İade',
    title: 'Alınan Sipariş İade',
    description: 'Müşterilerin iade ettiği siparişlerin süreçleri',
    route: '/siparisler/alinan-iade',
    listRoute: '/siparisler/alinan-iade',
    formRoute: '/siparisler/alinan-iade/:id',
    useStandardCrud: true,
    showInMenu: true,
    isRegistered: true,
    customActions: [
      { action: 'onayla', labelKey: 'Sipariş Onaylama', description: 'Müşteri iade siparişini onaylama' },
      { action: 'irsaliye-aktar', labelKey: 'İrsaliyeye Aktar', description: 'İade siparişini irsaliyeye dönüştürme' },
      { action: 'fatura-aktar', labelKey: 'Faturaya Aktar', description: 'İade siparişini faturaya dönüştürme' },
      { action: 'iptal-et', labelKey: 'Sipariş İptal Et', description: 'Siparişi iptal etme', danger: true }
    ]
  },
  {
    id: 'verilen-siparis-iade',
    category: 'belge',
    titleKey: 'Verilen Sipariş İade',
    title: 'Verilen Sipariş İade',
    description: 'Tedarikçiye iade edilen sipariş süreçleri',
    route: '/siparisler/verilen-iade',
    listRoute: '/siparisler/verilen-iade',
    formRoute: '/siparisler/verilen-iade/:id',
    useStandardCrud: true,
    showInMenu: true,
    isRegistered: true,
    customActions: [
      { action: 'onayla', labelKey: 'Sipariş Onaylama', description: 'Tedarikçi iade siparişini onaylama' },
      { action: 'irsaliye-aktar', labelKey: 'İrsaliyeye Aktar', description: 'İade siparişini irsaliyeye dönüştürme' },
      { action: 'fatura-aktar', labelKey: 'Faturaya Aktar', description: 'İade siparişini faturaya dönüştürme' },
      { action: 'iptal-et', labelKey: 'Sipariş İptal Et', description: 'Siparişi iptal etme', danger: true }
    ]
  }
];

export const orderReports: IModuleEntityDefinition[] = [];

export const orderEntities: IModuleEntityDefinition[] = [
  ...orderCards,
  ...orderDocuments,
  ...orderReports
];

export default orderEntities;
