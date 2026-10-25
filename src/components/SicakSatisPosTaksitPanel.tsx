/**
 * Webakus ERP - Sıcak Satış Pazarlık & Müşteri Avantajları Paneli (SicakSatisPosTaksitPanel.tsx)
 *
 * Başlıca Sorumlulukları:
 * - Sepet altındaki müşterinin alım kararını etkileyen indirim ve pazarlık araçlarını tek bir grup (kart)
 *   içerisinde alt alta, sayfa genişliğine yatay olarak yayılmış biçimde sunar:
 *   1. Liste Fiyatı, Satır İskontoları ve Kampanya İndirimi satırları
 *   2. Ek Pazarlık ve Hedef Net Tutar (Düz Hesap) yuvarlama araçları
 *   3. Müşterinin Toplam Kazancı (% ve tutar)
 *   4. Net Teklif Tutarı (KDV Dahil)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Tag,
    Sparkles,
    TrendingDown,
    Calculator,
    Gift
} from 'lucide-react';
import { SicakSatisPosCihazDto } from '../dtos/SatisBelgeleriDto';
import { SicakSatisTeklifSecenegiState } from '../defaults/sicakSatisTeklifDefaultValue';

export interface SicakSatisPosTaksitPanelProps {
    activeSecenek: SicakSatisTeklifSecenegiState;
    currencySymbol: string;
    listeToplam: number;
    satirIskontoToplam: number;
    araToplam: number;
    netSatisToplam: number;
    toplamMusteriKazanci: number;
    posCihazlari?: SicakSatisPosCihazDto[];
    onEkPazarlikChange: (tutar: number) => void;
    onHedefNetTutarApply: (hedefNet: number) => void;
    onHedefNetInputChange: (val: string) => void;
    onOdemeTuruChange?: (odemeTuru: number) => void;
    onPosTaksitSelect?: (
        posCihazId: number | null,
        posCihazAdi: string | null,
        taksitSayisi: number,
        musteriVadeFarkiOrani: number,
        bankaKesintiOrani: number
    ) => void;
    onOpenKampanyaModal: () => void;
    uygulanabilirKampanyaSayisi: number;
}

const SicakSatisPosTaksitPanel: React.FC<SicakSatisPosTaksitPanelProps> = ({
    activeSecenek,
    currencySymbol,
    listeToplam,
    satirIskontoToplam,
    netSatisToplam,
    toplamMusteriKazanci,
    onEkPazarlikChange,
    onHedefNetTutarApply,
    onHedefNetInputChange,
    onOpenKampanyaModal,
    uygulanabilirKampanyaSayisi
}) => {
    const { t } = useTranslation();

    const formatMoney = (val: number) =>
        val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const kazancOrani = listeToplam > 0 ? Math.min(100, (toplamMusteriKazanci / listeToplam) * 100) : 0;

    return (
        <div className="sicak-satis-panel-card full-width">
            {/* 1. ÜST BAŞLIK ALANI & KAMPANYALAR BUTONU */}
            <div className="sicak-satis-panel-header">
                <div className="sicak-satis-panel-title-group">
                    <span className="sicak-satis-panel-icon accent">
                        <Tag size={16} />
                    </span>
                    <div>
                        <h4 className="sicak-satis-panel-title">
                            {t('sicak_satis.bargaining_and_discounts', 'Pazarlık & Müşteri Avantajları')}
                        </h4>
                        <p className="sicak-satis-panel-subtitle">
                            {t('sicak_satis.bargaining_subtitle', 'İndirim kırılımı, düz hesap yuvarlama ve toplam müşteri kazancı')}
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    className="sicak-satis-campaign-btn"
                    onClick={onOpenKampanyaModal}
                >
                    <Sparkles size={14} />
                    <span>{t('sicak_satis.campaigns_btn', 'Kampanyalar')}</span>
                    {uygulanabilirKampanyaSayisi > 0 && (
                        <span className="sicak-satis-campaign-count">{uygulanabilirKampanyaSayisi}</span>
                    )}
                </button>
            </div>

            {/* 2. TEK GRUP İÇİNDE ALT ALTA DİZİLİM */}
            <div className="sicak-satis-discount-breakdown">
                {/* Liste Fiyatı Toplamı */}
                <div className="sicak-satis-breakdown-row">
                    <span className="sicak-satis-breakdown-label">
                        {t('sicak_satis.list_price_total', 'Liste Fiyatı Toplamı')}
                    </span>
                    <span className="sicak-satis-breakdown-value strikethrough">
                        {formatMoney(listeToplam)} {currencySymbol}
                    </span>
                </div>

                {/* Satır İskontoları Toplamı */}
                <div className="sicak-satis-breakdown-row">
                    <span className="sicak-satis-breakdown-label">
                        {t('sicak_satis.line_discounts_total', 'Satır İskontoları Toplamı')}
                    </span>
                    <span className="sicak-satis-breakdown-value discount">
                        -{formatMoney(satirIskontoToplam)} {currencySymbol}
                    </span>
                </div>

                {/* Kampanya İndirimi */}
                <div className="sicak-satis-breakdown-row">
                    <span className="sicak-satis-breakdown-label flex-row items-center gap-6">
                        <Gift size={14} className="text-accent-primary" />
                        <span>
                            {activeSecenek.uygulananKampanyaAdi
                                ? `${t('sicak_satis.campaign_discount', 'Kampanya İndirimi')} (${activeSecenek.uygulananKampanyaAdi})`
                                : t('sicak_satis.campaign_discount', 'Kampanya İndirimi')}
                        </span>
                    </span>
                    <span className="sicak-satis-breakdown-value discount">
                        -{formatMoney(activeSecenek.kampanyaIndirimTutari || 0)} {currencySymbol}
                    </span>
                </div>

                {/* Ek Pazarlık İndirimi & Hedef Net Tutar (Düz Hesap) Girdi Alanları */}
                <div className="sicak-satis-bargain-inputs-row">
                    <div className="sicak-satis-bargain-field">
                        <label className="sicak-satis-mini-label">
                            {t('sicak_satis.extra_bargain_discount', 'Ek Pazarlık İndirimi')} ({currencySymbol})
                        </label>
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            className="form-input sicak-satis-bargain-input"
                            value={activeSecenek.ekPazarlikIndirimTutari || ''}
                            placeholder="0,00"
                            onChange={(e) => {
                                const val = Math.max(0, Number(e.target.value || 0));
                                onEkPazarlikChange(val);
                            }}
                        />
                    </div>

                    <div className="sicak-satis-bargain-field">
                        <label className="sicak-satis-mini-label flex-row items-center gap-4">
                            <Calculator size={12} />
                            <span>{t('sicak_satis.target_round_total', 'Hedef Net Tutar (Düz Hesap)')}</span>
                        </label>
                        <div className="sicak-satis-round-input-group">
                            <input
                                type="number"
                                min={0}
                                step="10"
                                className="form-input sicak-satis-bargain-input"
                                value={activeSecenek.hedefNetTutarInput}
                                placeholder={formatMoney(netSatisToplam)}
                                onChange={(e) => onHedefNetInputChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const num = Number(activeSecenek.hedefNetTutarInput);
                                        if (num > 0) onHedefNetTutarApply(num);
                                    }
                                }}
                            />
                            <button
                                type="button"
                                className="sicak-satis-apply-round-btn"
                                onClick={() => {
                                    const num = Number(activeSecenek.hedefNetTutarInput);
                                    if (num > 0) onHedefNetTutarApply(num);
                                }}
                                title={t('sicak_satis.apply_round_total_tooltip', 'Sepet toplamını bu hedef tutara düz hesap yuvarla')}
                            >
                                {t('sicak_satis.round_btn', 'Düz Yap')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Müşteri Toplam Kazanç Kartı */}
                <div className="sicak-satis-savings-banner">
                    <div className="sicak-satis-savings-left">
                        <TrendingDown size={22} className="sicak-satis-savings-icon" />
                        <div>
                            <div className="sicak-satis-savings-title">
                                {t('sicak_satis.customer_total_savings', 'Müşterinin Toplam Kazancı')}
                            </div>
                            <div className="sicak-satis-savings-desc">
                                {t('sicak_satis.customer_savings_rate', 'Liste fiyatına göre %{{rate}} avantaj sağlandı', {
                                    rate: kazancOrani.toFixed(1)
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="sicak-satis-savings-amount">
                        {formatMoney(toplamMusteriKazanci)} {currencySymbol}
                    </div>
                </div>

                {/* Net Teklif Tutarı (KDV Dahil) */}
                <div className="sicak-satis-net-total-row">
                    <span className="sicak-satis-net-label">
                        {t('sicak_satis.net_offer_amount', 'Net Teklif Tutarı (KDV Dahil)')}
                    </span>
                    <span className="sicak-satis-net-value">
                        {formatMoney(netSatisToplam)} {currencySymbol}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default SicakSatisPosTaksitPanel;
