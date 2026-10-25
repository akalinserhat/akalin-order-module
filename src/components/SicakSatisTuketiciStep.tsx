/**
 * Webakus ERP - Sıcak Satış Sihirbazı 3. Aşama: Tüketici Bilgileri & Onay (SicakSatisTuketiciStep.tsx)
 *
 * Başlıca Sorumlulukları:
 * - Müşteri (Cari) seçimi ve dinamik adres/fatura bilgileri aktarımı
 * - Teslimat / Sevk adresi ve iletişim numarası (PhoneInput) yönetimi
 * - Fatura ünvanı, vergi dairesi, vergi no ve fatura adresi yönetimi
 * - Teklif & Pazarlık notları (NotInput)
 * - Sağ panelde aktif teklif alternatifi, sepet kalemleri ve finansal hesap özeti kartı
 * - Tek tıkla "Kaydet ve Siparişe Dönüştür" aksiyonu
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    User,
    Building,
    MapPin,
    AlignLeft,
    CheckCircle2,
    Package,
    Layers,
    FileText,
    CreditCard,
    ExternalLink
} from 'lucide-react';
import {
    CariSeciciInput,
    PhoneInput,
    NotInput,
    FieldError
} from '@akalin/ui';
import {
    SicakSatisTeklifFormData,
    SicakSatisTeklifSecenegiState
} from '../defaults/sicakSatisTeklifDefaultValue';
import { SicakSatisBaglamDto } from '../dtos/SatisBelgeleriDto';

export interface SicakSatisTuketiciStepProps {
    formData: SicakSatisTeklifFormData;
    onMasterChange: (field: string, value: any) => void;
    errors: Record<string, string>;
    baglam: SicakSatisBaglamDto;
    secenekler: SicakSatisTeklifSecenegiState[];
    activeSecenek: SicakSatisTeklifSecenegiState;
    activeSecenekId: string;
    onSelectSecenekId: (id: string) => void;
    currencySymbol: string;
    calculateSecenekSummary: (sec: SicakSatisTeklifSecenegiState) => any;
    onOpenCariModal: () => void;
    onOpenAddressModal?: (targetField: 'sevkAdresMetni' | 'faturaAdresMetni') => void;
    onConvertToOrder?: () => void;
    isConvertingOrder?: boolean;
}

export const SicakSatisTuketiciStep: React.FC<SicakSatisTuketiciStepProps> = ({
    formData,
    onMasterChange,
    errors,
    baglam,
    secenekler,
    activeSecenek,
    activeSecenekId,
    onSelectSecenekId,
    currencySymbol,
    calculateSecenekSummary,
    onOpenCariModal,
    onOpenAddressModal,
    onConvertToOrder,
    isConvertingOrder
}) => {
    const { t } = useTranslation();
    const activeSummary = calculateSecenekSummary(activeSecenek);

    const formatMoney = (val: number) => {
        return (val || 0).toLocaleString('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    return (
        <div className="sicak-satis-customer-step-container">
            {/* 1. SOL SÜTUN: TÜKETİCİ & BELGE BİLGİLERİ FORMU */}
            <div className="sicak-satis-customer-form-column">
                {/* 1.1. MÜŞTERİ / CARİ SEÇİMİ KARTI */}
                <div className="sicak-satis-section-card">
                    <div className="sicak-satis-section-header">
                        <div className="sicak-satis-section-title-wrap">
                            <div className="sicak-satis-section-icon primary">
                                <User size={18} />
                            </div>
                            <div>
                                <h4 className="sicak-satis-section-title">
                                    {t('sicak_satis.customer_info_card_title', 'Müşteri / Cari Bilgileri')}
                                </h4>
                            </div>
                        </div>
                        {formData.cariId && (
                            <span className="sicak-satis-section-badge">
                                {t('common.selected', 'Seçildi')}
                            </span>
                        )}
                    </div>

                    <div className="form-grid">
                        <div className="flex-col gap-6 col-span-2">
                            <label className="sicak-satis-mini-label">
                                {t('orders.customer', 'Müşteri')} <span className="text-danger">*</span>
                            </label>
                            <CariSeciciInput
                                value={formData.cariMetni || ''}
                                onChange={(e) => onMasterChange('cariMetni', e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Tab' && formData.cariMetni && !formData.cariId) {
                                        e.preventDefault();
                                        onOpenCariModal();
                                    }
                                }}
                                onMenuClick={onOpenCariModal}
                                hasSelection={Boolean(formData.cariId)}
                                onClear={() => {
                                    onMasterChange('cariId', '');
                                    onMasterChange('cariMetni', '');
                                }}
                                detailsUrl={formData.cariId ? `/cariler?id=${formData.cariId}` : null}
                                placeholder={t(
                                    'sicak_satis.select_customer_placeholder',
                                    'Müşteri Ara veya Seç...'
                                )}
                            />
                            <FieldError error={errors.cariId} />
                        </div>
                    </div>
                </div>

                {/* 1.2. TESLİMAT & SEVK BİLGİLERİ KARTI */}
                <div className="sicak-satis-section-card">
                    <div className="sicak-satis-section-header">
                        <div className="sicak-satis-section-title-wrap">
                            <div className="sicak-satis-section-icon accent">
                                <MapPin size={18} />
                            </div>
                            <div>
                                <h4 className="sicak-satis-section-title">
                                    {t('sicak_satis.shipping_info_card_title', 'Teslimat & Sevk Bilgileri')}
                                </h4>
                            </div>
                        </div>
                        {onOpenAddressModal && (
                            <button
                                type="button"
                                className="sicak-satis-option-action-btn"
                                onClick={() => onOpenAddressModal('sevkAdresMetni')}
                                title={t('sicak_satis.select_address_from_list', 'Adres Rehberinden Seç')}
                            >
                                <ExternalLink size={13} />
                                <span>{t('sicak_satis.select_address_from_list', 'Adres Rehberinden Seç')}</span>
                            </button>
                        )}
                    </div>

                    <div className="form-grid">
                        <div className="flex-col gap-6">
                            <label className="sicak-satis-mini-label">
                                {t('auto_teslim_alacak_kisi_bea9', 'Teslim Alacak Kişi')}
                            </label>
                            <div className="input-with-icon">
                                <span className="icon">
                                    <User size={16} />
                                </span>
                                <input
                                    type="text"
                                    name="teslimAlacakKisi"
                                    className="form-input"
                                    value={formData.teslimAlacakKisi || ''}
                                    onChange={(e) => onMasterChange('teslimAlacakKisi', e.target.value)}
                                    placeholder={t('auto_isim_soyisim', 'İsim Soyisim')}
                                />
                            </div>
                        </div>

                        <div className="flex-col gap-6">
                            <label className="sicak-satis-mini-label">
                                {t('auto_iletisim_numarasi', 'İletişim Numarası')}
                            </label>
                            <PhoneInput
                                name="nakliyeTelefon"
                                value={formData.nakliyeTelefon || ''}
                                onChange={(val) => onMasterChange('nakliyeTelefon', val)}
                                placeholder={t('auto_telefon', 'Telefon')}
                            />
                        </div>

                        <div className="flex-col gap-6 col-span-2">
                            <label className="sicak-satis-mini-label">
                                {t('auto_teslimat_adresi_label', 'Teslimat / Sevk Adresi')}
                            </label>
                            <input
                                type="text"
                                name="sevkAdresMetni"
                                className="form-input"
                                value={formData.sevkAdresMetni || ''}
                                onChange={(e) => onMasterChange('sevkAdresMetni', e.target.value)}
                                placeholder={t(
                                    'sicak_satis.shipping_address_placeholder',
                                    'Teslimat adresi giriniz...'
                                )}
                            />
                        </div>
                    </div>
                </div>

                {/* 1.3. FATURA BİLGİLERİ KARTI */}
                <div className="sicak-satis-section-card">
                    <div className="sicak-satis-section-header">
                        <div className="sicak-satis-section-title-wrap">
                            <div className="sicak-satis-section-icon primary">
                                <Building size={18} />
                            </div>
                            <div>
                                <h4 className="sicak-satis-section-title">
                                    {t('sicak_satis.invoice_info_card_title', 'Fatura Bilgileri')}
                                </h4>
                            </div>
                        </div>
                        {onOpenAddressModal && (
                            <button
                                type="button"
                                className="sicak-satis-option-action-btn"
                                onClick={() => onOpenAddressModal('faturaAdresMetni')}
                                title={t('sicak_satis.select_address_from_list', 'Adres Rehberinden Seç')}
                            >
                                <ExternalLink size={13} />
                                <span>{t('sicak_satis.select_address_from_list', 'Adres Rehberinden Seç')}</span>
                            </button>
                        )}
                    </div>

                    <div className="form-grid">
                        <div className="flex-col gap-6 col-span-2">
                            <label className="sicak-satis-mini-label">
                                {t('auto_fatura_unvani', 'Fatura Ünvanı')}
                            </label>
                            <div className="input-with-icon">
                                <span className="icon">
                                    <Building size={16} />
                                </span>
                                <input
                                    type="text"
                                    name="faturaUnvan"
                                    className="form-input"
                                    value={formData.faturaUnvan || ''}
                                    onChange={(e) => onMasterChange('faturaUnvan', e.target.value)}
                                    placeholder={t('auto_fatura_unvani_placeholder', 'Fatura ünvanı...')}
                                />
                            </div>
                        </div>

                        <div className="flex-col gap-6">
                            <label className="sicak-satis-mini-label">
                                {t('Vergi Dairesi', 'Vergi Dairesi')}
                            </label>
                            <input
                                type="text"
                                name="vergiDairesi"
                                className="form-input"
                                value={formData.vergiDairesi || ''}
                                onChange={(e) => onMasterChange('vergiDairesi', e.target.value)}
                                placeholder={t('auto_vergi_dairesi_placeholder', 'Vergi dairesi...')}
                            />
                        </div>

                        <div className="flex-col gap-6">
                            <label className="sicak-satis-mini-label">
                                {t('Vergi No', 'Vergi No / TC Kimlik No')}
                            </label>
                            <input
                                type="text"
                                name="vergiNo"
                                className="form-input"
                                value={formData.vergiNo || ''}
                                onChange={(e) => onMasterChange('vergiNo', e.target.value)}
                                placeholder={t('auto_vergi_no_placeholder', 'Vergi no / TC Kimlik No...')}
                            />
                        </div>

                        <div className="flex-col gap-6 col-span-2">
                            <label className="sicak-satis-mini-label">
                                {t('auto_fatura_adresi_label', 'Fatura Adresi')}
                            </label>
                            <input
                                type="text"
                                name="faturaAdresMetni"
                                className="form-input"
                                value={formData.faturaAdresMetni || ''}
                                onChange={(e) => onMasterChange('faturaAdresMetni', e.target.value)}
                                placeholder={t(
                                    'sicak_satis.invoice_address_placeholder',
                                    'Fatura adresi giriniz...'
                                )}
                            />
                        </div>
                    </div>
                </div>

                {/* 1.4. TEKLİF & PAZARLIK NOTLARI KARTI */}
                <div className="sicak-satis-section-card">
                    <div className="sicak-satis-section-header">
                        <div className="sicak-satis-section-title-wrap">
                            <div className="sicak-satis-section-icon primary">
                                <AlignLeft size={18} />
                            </div>
                            <div>
                                <h4 className="sicak-satis-section-title">
                                    {t('sicak_satis.notes_info_card_title', 'Teklif & Pazarlık Notları')}
                                </h4>
                            </div>
                        </div>
                    </div>

                    <div className="flex-col gap-6">
                        <NotInput
                            name="aciklama"
                            value={formData.aciklama || ''}
                            onChange={(e: any) =>
                                onMasterChange('aciklama', e?.target ? e.target.value : e)
                            }
                            placeholder={t(
                                'sicak_satis.quote_notes_placeholder',
                                'Müşteri özel talepleri, teslimat veya pazarlık notları...'
                            )}
                            rows={3}
                        />
                    </div>
                </div>
            </div>

            {/* 2. SAĞ SÜTUN: TEKLİF ÖZETİ & SEÇENEK İNCELEMESİ KARTI */}
            <div className="sicak-satis-customer-summary-column">
                <div className="sicak-satis-section-card">
                    <div className="sicak-satis-section-header">
                        <div className="sicak-satis-section-title-wrap">
                            <div className="sicak-satis-section-icon accent">
                                <Package size={18} />
                            </div>
                            <div>
                                <h4 className="sicak-satis-section-title">
                                    {t('sicak_satis.summary_card_title', 'Teklif ve Seçenek Özeti')}
                                </h4>
                            </div>
                        </div>
                    </div>

                    {/* Alternatif Seçenek Seçimi / Vurgusu */}
                    {secenekler.length > 1 && (
                        <div className="flex-col gap-6">
                            <span className="sicak-satis-mini-label">
                                {t('sicak_satis.selected_option_label', 'Aktif Teklif Seçeneği')}:
                            </span>
                            <div className="sicak-satis-pos-tabs">
                                {secenekler.map((sec) => (
                                    <button
                                        key={sec.id}
                                        type="button"
                                        className={`sicak-satis-pos-tab ${sec.id === activeSecenekId ? 'active' : ''}`}
                                        onClick={() => onSelectSecenekId(sec.id)}
                                    >
                                        <Layers size={13} />
                                        <span>{sec.secenekAdi}</span>
                                        <span className="sicak-satis-pos-bank-tag">
                                            {sec.kalemler.length} {t('sicak_satis.item_short', 'Ürün')}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sepet Kalemleri Önizleme Listesi */}
                    <div className="flex-col gap-6">
                        <span className="sicak-satis-mini-label">
                            {t('sicak_satis.items_preview_title', 'Sepetteki Ürünler')} ({activeSecenek.kalemler.length}):
                        </span>

                        {activeSecenek.kalemler.length === 0 ? (
                            <div className="text-secondary text-12 p-12 text-center border-dashed border-radius-8">
                                {t('sicak_satis.no_items_in_cart', 'Bu seçenekte henüz ürün bulunmamaktadır.')}
                            </div>
                        ) : (
                            <div className="sicak-satis-summary-items-list">
                                {activeSecenek.kalemler.map((kalem) => (
                                    <div key={kalem.id} className="sicak-satis-summary-item-row">
                                        <div className="flex-col min-w-0 flex-1">
                                            <span className="sicak-satis-summary-item-name" title={kalem.urunAdi}>
                                                {kalem.urunAdi}
                                            </span>
                                            <span className="sicak-satis-summary-item-qty">
                                                {kalem.miktar} {kalem.birimAdi} x {formatMoney(kalem.teklifBirimFiyati)} {currencySymbol}
                                            </span>
                                        </div>
                                        <span className="sicak-satis-summary-item-price">
                                            {formatMoney(kalem.satirToplam)} {currencySymbol}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Finansal Kırılım Tablosu */}
                    <div className="sicak-satis-summary-breakdown">
                        <div className="sicak-satis-summary-row">
                            <span>{t('sicak_satis.list_price_total', 'Liste Fiyatı Toplamı')}</span>
                            <span>{formatMoney(activeSummary.listeToplam)} {currencySymbol}</span>
                        </div>

                        {activeSummary.satirIskontoToplam > 0 && (
                            <div className="sicak-satis-summary-row highlight">
                                <span>{t('sicak_satis.line_discounts_total', 'Satır İskontoları')}</span>
                                <span>-{formatMoney(activeSummary.satirIskontoToplam)} {currencySymbol}</span>
                            </div>
                        )}

                        {activeSecenek.kampanyaIndirimTutari > 0 && (
                            <div className="sicak-satis-summary-row highlight">
                                <span>{t('sicak_satis.campaign_discount', 'Kampanya İndirimi')} ({activeSecenek.uygulananKampanyaAdi || ''})</span>
                                <span>-{formatMoney(activeSecenek.kampanyaIndirimTutari)} {currencySymbol}</span>
                            </div>
                        )}

                        {activeSecenek.ekPazarlikIndirimTutari > 0 && (
                            <div className="sicak-satis-summary-row highlight">
                                <span>{t('sicak_satis.extra_bargain_discount', 'Ek Pazarlık İndirimi')}</span>
                                <span>-{formatMoney(activeSecenek.ekPazarlikIndirimTutari)} {currencySymbol}</span>
                            </div>
                        )}

                        <div className="sicak-satis-summary-row">
                            <span>{t('sicak_satis.net_offer_amount', 'Net Teklif Tutarı')}</span>
                            <strong>{formatMoney(activeSummary.netSatisToplam)} {currencySymbol}</strong>
                        </div>

                        {/* Ödeme / Taksit Özeti */}
                        <div className="sicak-satis-summary-row">
                            <span>{t('sicak_satis.payment_plan_summary', 'Ödeme & Vade Planı')}</span>
                            <span className="flex-row items-center gap-4">
                                <CreditCard size={12} />
                                {activeSecenek.odemeTuru === 1
                                    ? t('sicak_satis.payment_cash', 'Nakit / Havale')
                                    : activeSecenek.secilenTaksitSayisi > 1
                                        ? `${activeSecenek.secilenPosCihazAdi || ''} (${activeSecenek.secilenTaksitSayisi} ${t('sicak_satis.month_short', 'Ay')})`
                                        : t('sicak_satis.single_payment', 'Tek Çekim')}
                            </span>
                        </div>
                    </div>

                    {/* Nihai Ödenecek Tutar Kutusu */}
                    <div className="sicak-satis-summary-final-box">
                        <span className="sicak-satis-summary-final-label">
                            {t('sicak_satis.final_payable_total', 'Nihai Ödenecek Tutar')}
                        </span>
                        <div className="sicak-satis-summary-final-value">
                            {formatMoney(
                                activeSecenek.odemeTuru === 2
                                    ? activeSummary.taksitliToplam
                                    : activeSummary.netSatisToplam
                            )}{' '}
                            {currencySymbol}
                        </div>
                        {activeSecenek.odemeTuru === 2 && activeSecenek.secilenTaksitSayisi > 1 && (
                            <span className="sicak-satis-summary-final-subtext">
                                {formatMoney(activeSummary.taksitliToplam / activeSecenek.secilenTaksitSayisi)} {currencySymbol} x {activeSecenek.secilenTaksitSayisi} {t('sicak_satis.month_short', 'Ay')}
                            </span>
                        )}
                    </div>

                    {/* Tek Tıkla Siparişe Dönüştür Aksiyonu */}
                    {onConvertToOrder && (
                        <button
                            type="button"
                            className="sicak-satis-convert-order-action-btn"
                            disabled={isConvertingOrder}
                            onClick={onConvertToOrder}
                        >
                            <CheckCircle2 size={16} />
                            <span>
                                {isConvertingOrder
                                    ? t('common.loading', 'İşleniyor...')
                                    : t('sicak_satis.convert_to_order_action', 'Kaydet ve Siparişe Dönüştür')}
                            </span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SicakSatisTuketiciStep;
