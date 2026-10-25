# @akalin/order_module

Webakus ERP ekosistemi için bağımsız, yeniden kullanılabilir Sipariş Yönetimi ve Sıcak Satış / Teklif Modülü.

## Özellikler
- **Alınan & Verilen Siparişler**: Müşteri ve tedarikçi siparişleri, onaylama, irsaliye ve faturaya aktarım döngüsü.
- **İade Siparişleri**: Alınan ve verilen iade siparişleri yönetimi.
- **Sıcak Satış / Teklif Sihirbazı**: Adım adım teklif ve sıcak satış oluşturma, anlık kârlılık analizi (`SicakSatisKarlilikBar`), POS taksit tablosu (`SicakSatisPosTaksitPanel`), tüketici finansmanı adımları.
- **Modüler Mimari**: `@akalin/module_core` (`IModuleDefinition`) ve `OrderServiceContext` ile tam bağımsız servis adaptasyonu.
- **UI Entegrasyonu**: `@akalin/ui` (`BaseDocumentPage`, `BaseWizardPage`, `DocumentResultPanel`, `SpreadsheetGrid`) standart tasarım sistemi ile tam uyumlu.

## Kurulum
```bash
npm install @akalin/order_module
```

## Kullanım
```tsx
import { createOrderModule } from '@akalin/order_module';

export const SiparisYonetimiModule = createOrderModule({
  httpClient: customAxiosInstance
});
```
