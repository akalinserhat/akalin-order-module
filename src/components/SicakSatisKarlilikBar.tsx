/**
 * Webakus ERP - Sıcak Satış Kârlılık Progress Bar & Kamuflajlı Teklif Skoru Bileşeni (SicakSatisKarlilikBar.tsx)
 *
 * Başlıca Sorumlulukları:
 * - Sayfanın en altında işletmenin verdiği teklif neticesinde oluşan gerçek net kârlılık seviyesini
 *   dinamik renkli bir progress bar üzerinde gösterir.
 * - Formül: Net Kâr = Net Satış - Alış Maliyeti + Kampanya Firma Hakedişi + BSH Fiyat Farkı - POS Banka Kesintisi
 * - Varsayılan olarak "Kamuflaj Modu" (Teklif Skoru 0-100) açıktır; müşteri ekranı görse dahi maliyet veya kâr
 *   tutarını anlamaz. Satıcı göz (👁️) ikonuna tıkladığında tüm maliyet ve kâr kırılımı açılır.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Eye,
    EyeOff,
    ShieldCheck,
    AlertTriangle,
    TrendingUp,
    Flame,
    CheckCircle2,
    ShoppingCart,
    Loader2
} from 'lucide-react';

export interface SicakSatisKarlilikBarProps {
    secenekAdi: string;
    currencySymbol: string;
    netSatisToplam: number;
    taksitliToplam: number;
    secilenTaksitSayisi: number;
    toplamAlisMaliyeti: number;
    kampanyaFirmaHakEdisTutari: number;
    toplamBshFiyatFarki: number;
    posKomisyonTutari: number;
    gercekNetKarTutari: number;
    gercekNetKarOrani: number;
    kritikKarOrani: number;
    hedefKarOrani: number;
    yuksekKarOrani: number;
    kalemSayisi: number;
    isConvertingOrder?: boolean;
    onConvertToOrder: () => void;
}

const SicakSatisKarlilikBar: React.FC<SicakSatisKarlilikBarProps> = ({
    secenekAdi,
    currencySymbol,
    netSatisToplam,
    taksitliToplam,
    secilenTaksitSayisi,
    toplamAlisMaliyeti,
    kampanyaFirmaHakEdisTutari,
    toplamBshFiyatFarki,
    posKomisyonTutari,
    gercekNetKarTutari,
    gercekNetKarOrani,
    kritikKarOrani = 5,
    hedefKarOrani = 15,
    yuksekKarOrani = 25,
    kalemSayisi,
    isConvertingOrder = false,
    onConvertToOrder
}) => {
    const { t } = useTranslation();
    const [isRevealed, setIsRevealed] = useState(false);

    const formatMoney = (val: number) =>
        val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // 0-100 arası Teklif Skoru hesaplama
    const teklifSkoru = React.useMemo(() => {
        if (kalemSayisi === 0 || netSatisToplam <= 0) return 0;
        if (gercekNetKarOrani <= 0) {
            return Math.max(5, Math.round(15 + gercekNetKarOrani));
        }
        const maxRef = Math.max(yuksekKarOrani * 1.4, 35);
        const normalized = Math.min(100, Math.max(8, Math.round((gercekNetKarOrani / maxRef) * 100)));
        return normalized;
    }, [kalemSayisi, netSatisToplam, gercekNetKarOrani, yuksekKarOrani]);

    // Kârlılık seviyesi renk ve etiket durumu
    const levelInfo = React.useMemo(() => {
        if (kalemSayisi === 0 || netSatisToplam <= 0) {
            return {
                levelClass: 'neutral',
                badgeLabel: t('sicak_satis.score_waiting', 'Sepet Bekleniyor'),
                icon: <ShieldCheck size={16} />
            };
        }
        if (gercekNetKarOrani < kritikKarOrani) {
            return {
                levelClass: 'danger',
                badgeLabel: t('sicak_satis.score_critical', 'Kritik Sınır'),
                icon: <AlertTriangle size={16} />
            };
        }
        if (gercekNetKarOrani < hedefKarOrani) {
            return {
                levelClass: 'warning',
                badgeLabel: t('sicak_satis.score_acceptable', 'Kabul Edilebilir'),
                icon: <Flame size={16} />
            };
        }
        if (gercekNetKarOrani < yuksekKarOrani) {
            return {
                levelClass: 'primary',
                badgeLabel: t('sicak_satis.score_ideal', 'İdeal Teklif'),
                icon: <ShieldCheck size={16} />
            };
        }
        return {
            levelClass: 'success',
            badgeLabel: t('sicak_satis.score_high', 'Yüksek Performans'),
            icon: <TrendingUp size={16} />
        };
    }, [kalemSayisi, netSatisToplam, gercekNetKarOrani, kritikKarOrani, hedefKarOrani, yuksekKarOrani, t]);

    const aylikOdeme = secilenTaksitSayisi > 1 ? taksitliToplam / secilenTaksitSayisi : taksitliToplam;

    return (
        <div className="sicak-satis-karlilik-footer">
            {/* SOL VE ORTA ALAN: PROGRESS BAR VE KAMUFLAJLI / DETAYLI KÂRLILIK */}
            <div className="sicak-satis-karlilik-main">
                <div className="sicak-satis-karlilik-top-row">
                    <div className="sicak-satis-score-badge-group">
                        <span className={`sicak-satis-level-pill ${levelInfo.levelClass}`}>
                            {levelInfo.icon}
                            <span>{levelInfo.badgeLabel}</span>
                        </span>

                        <span className="sicak-satis-score-text">
                            {t('sicak_satis.offer_score_label', 'Teklif Skoru')}:{' '}
                            <strong>{teklifSkoru} / 100</strong>
                        </span>

                        <button
                            type="button"
                            className={`sicak-satis-eye-btn ${isRevealed ? 'active' : ''}`}
                            onClick={() => setIsRevealed(prev => !prev)}
                            title={
                                isRevealed
                                    ? t('sicak_satis.hide_profit_details', 'Maliyet ve Kâr Detaylarını Gizle (Kamuflaj Modu)')
                                    : t('sicak_satis.show_profit_details', 'Gerçek Net Kâr ve Maliyet Kırılımını Göster')
                            }
                        >
                            {isRevealed ? <EyeOff size={15} /> : <Eye size={15} />}
                            <span>
                                {isRevealed
                                    ? t('sicak_satis.hide_margin_short', 'Kârı Gizle')
                                    : t('sicak_satis.inspect_margin_short', 'Analiz')}
                            </span>
                        </button>
                    </div>

                    {isRevealed && (
                        <div className="sicak-satis-profit-highlight">
                            <span className="sicak-satis-profit-label">
                                {t('sicak_satis.real_net_profit', 'Gerçek Net Kâr')}:
                            </span>
                            <span className={`sicak-satis-profit-value ${levelInfo.levelClass}`}>
                                {formatMoney(gercekNetKarTutari)} {currencySymbol} (%{gercekNetKarOrani.toFixed(2)})
                            </span>
                        </div>
                    )}
                </div>

                {/* Progress Bar Track */}
                <div className="sicak-satis-progress-track">
                    <div
                        className={`sicak-satis-progress-fill ${levelInfo.levelClass}`}
                        style={{ width: `${teklifSkoru}%` }}
                    />
                </div>

                {/* Göz İkonuna Tıklandığında Açılan Gerçek Maliyet & Hakediş Kırılımı */}
                {isRevealed && (
                    <div className="sicak-satis-secret-breakdown">
                        <div className="sicak-satis-secret-chip">
                            <span className="label">{t('sicak_satis.net_sale', 'Net Satış')}:</span>
                            <span className="val">{formatMoney(netSatisToplam)} {currencySymbol}</span>
                        </div>
                        <div className="sicak-satis-secret-chip cost">
                            <span className="label">-{t('sicak_satis.purchase_cost', 'Alış Maliyeti')}:</span>
                            <span className="val">{formatMoney(toplamAlisMaliyeti)} {currencySymbol}</span>
                        </div>
                        <div className="sicak-satis-secret-chip support">
                            <span className="label">+{t('sicak_satis.campaign_vendor_rebate', 'Kampanya Hakedişi')}:</span>
                            <span className="val">{formatMoney(kampanyaFirmaHakEdisTutari)} {currencySymbol}</span>
                        </div>
                        <div className="sicak-satis-secret-chip support">
                            <span className="label">+{t('sicak_satis.bsh_price_diff', 'BSH Fiyat Farkı')}:</span>
                            <span className="val">{formatMoney(toplamBshFiyatFarki)} {currencySymbol}</span>
                        </div>
                        <div className="sicak-satis-secret-chip cost">
                            <span className="label">-{t('sicak_satis.pos_bank_deduction', 'POS Banka Kesintisi')}:</span>
                            <span className="val">{formatMoney(posKomisyonTutari)} {currencySymbol}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* SAĞ ALAN: SEÇİLİ SEÇENEK ÖZETİ VE SİPARİŞE DÖNÜŞTÜRME AKSİYONU */}
            <div className="sicak-satis-karlilik-actions">
                <div className="sicak-satis-footer-summary">
                    <span className="sicak-satis-footer-option-name">{secenekAdi}</span>
                    <div className="sicak-satis-footer-price">
                        {formatMoney(taksitliToplam)} {currencySymbol}
                    </div>
                    {secilenTaksitSayisi > 1 && (
                        <span className="sicak-satis-footer-installment-note">
                            {secilenTaksitSayisi} x {formatMoney(aylikOdeme)} {currencySymbol} / {t('sicak_satis.month_short', 'Ay')}
                        </span>
                    )}
                </div>

                <button
                    type="button"
                    className="sicak-satis-convert-order-btn"
                    disabled={isConvertingOrder || kalemSayisi === 0}
                    onClick={onConvertToOrder}
                >
                    {isConvertingOrder ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <CheckCircle2 size={16} />
                    )}
                    <span>
                        {t('sicak_satis.convert_option_to_order', 'Bu Seçeneği Siparişe Dönüştür')}
                    </span>
                    <ShoppingCart size={15} />
                </button>
            </div>
        </div>
    );
};

export default SicakSatisKarlilikBar;
