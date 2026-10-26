/**
 * @akalin/order_module
 * Webakus ERP ekosistemi için bağımsız, yeniden kullanılabilir Sipariş Yönetimi ve Sıcak Satış/Teklif Modülü.
 */

import { createOrderModule } from './createOrderModule';

export * from './createOrderModule';
export { createOrderModule } from './createOrderModule';

export const SiparisYonetimiModule = createOrderModule();
export default SiparisYonetimiModule;

// Adapter & Servis Context
export * from './adapters/OrderServiceContext';

// Tipler ve DTO'lar
export * from './types';
export * from './definitions/entities';
export * from './dtos/SatisBelgeleriDto';

// Servisler
export { BaseService } from './services/BaseService';
export { default as httpClient } from './services/httpClient';
export * from './services/SatisBelgeleriService';

// Varsayılan Değerler (Defaults)
export * from './defaults/sicakSatisTeklifDefaultValue';
export * from './defaults/siparisDefaultValue';

// Doğrulayıcılar (Validators)
export * from './validators/sicakSatisTeklifValidation';
export * from './validators/siparisValidation';

// Hook'lar
export * from './hooks/useSicakSatisTeklifActionMenu';
export * from './hooks/useSicakSatisTeklifAutoFocus';
export * from './hooks/useSiparisActionMenu';
export * from './hooks/useSiparisAutoFocus';
export * from './hooks/useHeaderCollapsible';

// Yardımcı Fonksiyonlar (Utils)
export * from './utils/currencyUtils';
export * from './utils/belgeUtils';

// Bileşenler ve Sayfalar
export { default as SiparisForm } from './components/SiparisForm';
export { default as SiparisSeciciList, SiparisSeciciModal, type SiparisSeciciListProps, type SiparisSeciciModalProps } from './components/SiparisSeciciList';
export { default as SicakSatisTeklifForm } from './components/SicakSatisTeklifForm';
export { default as SicakSatisKarlilikBar } from './components/SicakSatisKarlilikBar';
export { default as SicakSatisPosTaksitPanel } from './components/SicakSatisPosTaksitPanel';
export { default as SicakSatisTeklifBilgiStep } from './components/SicakSatisTeklifBilgiStep';
export { default as SicakSatisTuketiciStep } from './components/SicakSatisTuketiciStep';
export { default as SicakSatisUrunSecimStep } from './components/SicakSatisUrunSecimStep';
export { default as SiparisKampanyaAnalizModal } from './components/SiparisKampanyaAnalizModal';

export { default as SiparislerPage } from './pages/Siparisler';
export { default as SiparisFormPage } from './pages/SiparisFormPage';
export { default as SicakSatisTeklifFormPage } from './pages/SicakSatisTeklifFormPage';
