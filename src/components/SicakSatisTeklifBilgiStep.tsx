/**
 * Webakus ERP - Sıcak Satış Sihirbazı 1. Aşama: Teklif & Geçerlilik Bilgileri (SicakSatisTeklifBilgiStep.tsx)
 *
 * Başlıca Sorumlulukları:
 * - 1. Aşamada sadece 3 temel alanın yönetimi:
 *   1. Teklif No (belgeNo)
 *   2. Teklif Tarihi (tarih)
 *   3. Teklifin geçerli olduğu son tarih (gecerlilikTarihi)
 * - Geçerli satış fiyat listesinin bitiş tarihini tespit ederek son geçerlilik tarihini otomatik oluşturma
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    FileText,
    Clock,
    AlertCircle,
    Info,
    Sparkles,
    RefreshCw
} from 'lucide-react';
import { DateInput, FieldError } from '@akalin/ui';
import httpClient from '../services/httpClient';
import { SicakSatisTeklifFormData } from '../defaults/sicakSatisTeklifDefaultValue';
import { SicakSatisBaglamDto } from '../dtos/SatisBelgeleriDto';

export interface SicakSatisTeklifBilgiStepProps {
    formData: SicakSatisTeklifFormData;
    onMasterChange: (field: string, value: any) => void;
    errors: Record<string, string>;
    baglam: SicakSatisBaglamDto;
    currencySymbol?: string;
}

interface MatchedPriceListInfo {
    id: number;
    belgeNo: string;
    tanimAdi: string;
    bitisTarihi?: string | null;
    kampanyaMi: boolean;
}

export const SicakSatisTeklifBilgiStep: React.FC<SicakSatisTeklifBilgiStepProps> = ({
    formData,
    onMasterChange,
    errors,
    baglam
}) => {
    const { t } = useTranslation();

    const [priceLists, setPriceLists] = useState<any[]>([]);
    const [matchedPriceList, setMatchedPriceList] = useState<MatchedPriceListInfo | null>(null);
    const [hasManualEdit, setHasManualEdit] = useState<boolean>(false);
    const autoSyncedDateRef = useRef<string | null>(null);

    // Aktif fiyat listelerini çek
    useEffect(() => {
        let isMounted = true;

        httpClient
            .get<any[]>('/api/FiyatListeleri')
            .then((res) => {
                if (!isMounted) return;
                const lists = Array.isArray(res.data) ? res.data : [];
                setPriceLists(lists);
            })
            .catch((err) => {
                console.error('Fiyat listeleri yüklenirken hata oluştu:', err);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    // Teklif tarihi ve fiyat listelerine göre geçerli fiyat listesini belirle
    useEffect(() => {
        if (!priceLists || priceLists.length === 0 || !formData.tarih) return;

        const offerDate = formData.tarih;

        // Satış amaçlı (fiyatTuru !== 2) ve teklif tarihinde geçerli listeleri filtrele
        const matching = priceLists.filter((list) => {
            const isSales = list.fiyatListesiTanimi?.fiyatTuru !== 2;
            if (!isSales) return false;

            if (list.baslangicTarihi) {
                const startStr = list.baslangicTarihi.split('T')[0];
                if (startStr > offerDate) return false;
            }
            if (list.bitisTarihi) {
                const endStr = list.bitisTarihi.split('T')[0];
                if (endStr < offerDate) return false;
            }
            return true;
        });

        // Öncelik: Kampanya listeleri önce, ardından id azalan
        matching.sort((a, b) => {
            if (a.kampanyaMi && !b.kampanyaMi) return -1;
            if (!a.kampanyaMi && b.kampanyaMi) return 1;
            return (b.id || 0) - (a.id || 0);
        });

        const bestMatch = matching[0];
        if (bestMatch) {
            const tanimAdi = bestMatch.fiyatListesiTanimi?.ad || bestMatch.belgeNo || '';
            const bitisDateStr = bestMatch.bitisTarihi ? bestMatch.bitisTarihi.split('T')[0] : null;

            setMatchedPriceList({
                id: bestMatch.id,
                belgeNo: bestMatch.belgeNo,
                tanimAdi,
                bitisTarihi: bitisDateStr,
                kampanyaMi: !!bestMatch.kampanyaMi
            });

            // Fiyat listesinin geçerli bir bitiş tarihi varsa ve kullanıcı manuel olarak değiştirmediyse
            // teklif son geçerlilik tarihini otomatik doldur
            if (bitisDateStr && (!formData.gecerlilikTarihi || (!hasManualEdit && formData.gecerlilikTarihi === autoSyncedDateRef.current))) {
                autoSyncedDateRef.current = bitisDateStr;
                onMasterChange('gecerlilikTarihi', bitisDateStr);
            }
        } else {
            setMatchedPriceList(null);
        }
    }, [formData.tarih, priceLists, hasManualEdit]);

    // Fiyat listesi son tarihini manuel olarak tekrar uygulama aksiyonu
    const handleApplyPriceListDate = () => {
        if (matchedPriceList?.bitisTarihi) {
            const dateStr = matchedPriceList.bitisTarihi.split('T')[0];
            autoSyncedDateRef.current = dateStr;
            setHasManualEdit(false);
            onMasterChange('gecerlilikTarihi', dateStr);
        }
    };

    // Teklif tarihi ile geçerlilik tarihi arasındaki gün farkı
    const durationDays = useMemo(() => {
        if (!formData.tarih || !formData.gecerlilikTarihi) return null;
        const start = new Date(formData.tarih).getTime();
        const end = new Date(formData.gecerlilikTarihi).getTime();
        return Math.round((end - start) / (1000 * 60 * 60 * 24));
    }, [formData.tarih, formData.gecerlilikTarihi]);

    // Tarihi DD.MM.YYYY formatında gösterme yardımcısı
    const formatDisplayDate = (d?: string | null) => {
        if (!d) return '';
        try {
            const parts = d.split('T')[0].split('-');
            if (parts.length === 3) {
                return `${parts[2]}.${parts[1]}.${parts[0]}`;
            }
            return new Date(d).toLocaleDateString('tr-TR');
        } catch {
            return d;
        }
    };

    return (
        <div className="sicak-satis-step-info-container">
            <div className="sicak-satis-info-card stage1-card">
                <div className="sicak-satis-info-card-header">
                    <div className="sicak-satis-info-card-icon primary">
                        <FileText size={20} />
                    </div>
                    <div>
                        <h4 className="sicak-satis-info-card-title">
                            {t('sicak_satis.quote_details_card', 'Teklif Bilgileri')}
                        </h4>
                        <p className="sicak-satis-info-card-desc">
                            {t(
                                'sicak_satis.quote_stage1_desc',
                                'Teklif numarası, düzenleme tarihi ve fiyat listesi bazlı son geçerlilik tarihi.'
                            )}
                        </p>
                    </div>
                </div>

                <div className="sicak-satis-stage1-form-grid">
                    {/* 1. Teklif Numarası */}
                    <div className="sicak-satis-info-form-group">
                        <label className="sicak-satis-info-label" htmlFor="teklifBelgeNo">
                            <span>{t('sicak_satis.quote_no', 'Teklif No')}</span>
                            {!baglam.otomatikNumaraVerilsinMi && <span className="text-danger">*</span>}
                        </label>
                        <div className="input-with-icon">
                            <span className="icon">
                                <FileText size={16} />
                            </span>
                            <input
                                id="teklifBelgeNo"
                                type="text"
                                name="belgeNo"
                                className={`form-input ${errors.belgeNo ? 'is-invalid' : ''}`}
                                value={formData.belgeNo || ''}
                                onChange={(e) => onMasterChange('belgeNo', e.target.value)}
                                disabled={baglam.otomatikNumaraVerilsinMi}
                                placeholder={
                                    baglam.otomatikNumaraVerilsinMi
                                        ? t('orders.auto_number_placeholder', '[OTOMATIK]')
                                        : t('sicak_satis.quote_no_placeholder', 'Teklif No Giriniz')
                                }
                            />
                        </div>
                        <FieldError error={errors.belgeNo} />
                    </div>

                    {/* 2. Teklif Tarihi */}
                    <div className="sicak-satis-info-form-group">
                        <label className="sicak-satis-info-label">
                            <span>{t('common.date', 'Teklif Tarihi')}</span>
                            <span className="text-danger">*</span>
                        </label>
                        <DateInput
                            name="tarih"
                            className={`form-input ${errors.tarih ? 'is-invalid' : ''}`}
                            value={formData.tarih}
                            onChange={(e: any) => {
                                const val = e?.target ? e.target.value : e;
                                onMasterChange('tarih', val);
                            }}
                            required
                        />
                        <FieldError error={errors.tarih} />
                    </div>

                    {/* 3. Son Geçerlilik Tarihi */}
                    <div className="sicak-satis-info-form-group">
                        <div className="sicak-satis-field-header-row">
                            <label className="sicak-satis-info-label">
                                <span>{t('sicak_satis.validity_end_date', 'Son Geçerlilik Tarihi')}</span>
                                <span className="text-danger">*</span>
                            </label>
                            {durationDays !== null && (
                                <span
                                    className={`sicak-satis-validity-status-pill ${
                                        durationDays >= 0 ? 'valid' : 'expired'
                                    }`}
                                >
                                    {durationDays >= 0 ? (
                                        <>
                                            <Clock size={12} />
                                            <span>
                                                {t('sicak_satis.validity_days_badge', '{{days}} Gün Geçerli', {
                                                    days: durationDays
                                                })}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle size={12} />
                                            <span>{t('sicak_satis.validity_expired_badge', 'Geçersiz Tarih Aralığı')}</span>
                                        </>
                                    )}
                                </span>
                            )}
                        </div>
                        <DateInput
                            name="gecerlilikTarihi"
                            className={`form-input ${errors.gecerlilikTarihi ? 'is-invalid' : ''}`}
                            value={formData.gecerlilikTarihi}
                            onChange={(e: any) => {
                                const val = e?.target ? e.target.value : e;
                                setHasManualEdit(true);
                                onMasterChange('gecerlilikTarihi', val);
                            }}
                            required
                        />
                        <FieldError error={errors.gecerlilikTarihi} />

                        {/* Fiyat Listesi Otomatik Eşleşme Bilgisi */}
                        {matchedPriceList ? (
                            <div className="sicak-satis-price-list-match-info">
                                <div className="sicak-satis-price-list-badge">
                                    <Sparkles size={13} className="text-accent" />
                                    <span>
                                        {t('sicak_satis.price_list_matched', 'Geçerli Fiyat Listesi:')}{' '}
                                        <strong>{matchedPriceList.tanimAdi}</strong>
                                    </span>
                                    {matchedPriceList.bitisTarihi && (
                                        <span className="price-list-date-text">
                                            ({t('sicak_satis.price_list_valid_until', 'Liste Bitişi:')}{' '}
                                            {formatDisplayDate(matchedPriceList.bitisTarihi)})
                                        </span>
                                    )}
                                </div>
                                {hasManualEdit && matchedPriceList.bitisTarihi && (
                                    <button
                                        type="button"
                                        className="sicak-satis-apply-date-btn"
                                        onClick={handleApplyPriceListDate}
                                        title={t('sicak_satis.apply_price_list_date', 'Fiyat Listesi Tarihini Uygula')}
                                    >
                                        <RefreshCw size={12} />
                                        <span>{t('sicak_satis.apply_price_list_date', 'Fiyat Listesi Tarihini Uygula')}</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="sicak-satis-price-list-match-info muted">
                                <Info size={13} />
                                <span>
                                    {t(
                                        'sicak_satis.no_price_list_matched',
                                        'Aktif bir fiyat listesi son tarihi bulunamadı (Standart geçerlilik süresi uygulandı).'
                                    )}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bilgilendirme Notu */}
                <div className="sicak-satis-info-tip-box">
                    <Info size={16} className="tip-icon" />
                    <span>
                        {t(
                            'sicak_satis.stage1_helper_hint',
                            'Teklifin geçerlilik süresi, geçerli satış fiyat listesinin son geçerlilik tarihine göre otomatik tanımlanır.'
                        )}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default SicakSatisTeklifBilgiStep;
