/**
 * Webakus ERP - Sipariş Kampanya Analiz Modalı (SiparisKampanyaAnalizModal)
 * Siparişteki sepet tutarı ve kalemlere göre uygulanabilir veya fırsat kampanyaları analiz eder ve uygular.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BaseButton, TabLayout, BasePopup } from '@akalin/ui';
import { CheckCircle2, AlertCircle, Lightbulb, XCircle, Gift, Sparkles, Tag, ArrowRight, Loader2, Trash2 } from 'lucide-react';
import { type SiparisKampanyaAnalizSonucuDto, type KampanyaDegerlendirmeSonucuDto } from '@akalin/product_module';

interface SiparisKampanyaAnalizModalProps {
    isOpen: boolean;
    onClose: () => void;
    analizSonucu: SiparisKampanyaAnalizSonucuDto | null;
    isLoading: boolean;
    onKampanyaUygula: (kampanya: KampanyaDegerlendirmeSonucuDto) => void;
    uygulananKampanya?: KampanyaDegerlendirmeSonucuDto | null;
    onKampanyaKaldir?: (kampanya: KampanyaDegerlendirmeSonucuDto) => void;
}

const SiparisKampanyaAnalizModal: React.FC<SiparisKampanyaAnalizModalProps> = ({
    isOpen,
    onClose,
    analizSonucu,
    isLoading,
    onKampanyaUygula,
    uygulananKampanya,
    onKampanyaKaldir
}) => {
    const { t } = useTranslation();
    const [activeTabId, setActiveTabId] = useState<string | number>('uygulanabilir');

    if (!isOpen) return null;

    const uygulanabilirSayisi = analizSonucu?.uygulanabilirKampanyalar.length || 0;
    const uygulanamayanSayisi = analizSonucu?.uygulanamayanKampanyalar.length || 0;

    const tabs = [
        {
            id: 'uygulanabilir',
            title: `${t('Uygulanabilir Kampanyalar')} (${uygulanabilirSayisi})`,
            icon: <CheckCircle2 size={16} />
        },
        {
            id: 'uygulanamayan',
            title: `${t('Fırsatlar & Eksik Şartlar')} (${uygulanamayanSayisi})`,
            icon: <AlertCircle size={16} />
        }
    ];

    return (
        <BasePopup
            isOpen={isOpen}
            onClose={onClose}
            title={t('Sipariş Kampanya Analizi')}
            modalSize="lg"
            hideFooter={true}
        >
            <div className="flex-col gap-16">
                {/* Summary Bar */}
                <div className="kampanya-modal-summary">
                    <div className="kampanya-modal-summary-item">
                        <Tag size={16} />
                        <span>{t('Sepet Tutarı')}:</span>
                        <span className="kampanya-modal-summary-value">
                            {(analizSonucu?.sepetTutari || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </span>
                    </div>
                    <div className="kampanya-modal-summary-item">
                        <Sparkles size={16} />
                        <span>{t('Aktif Kampanyalar')}:</span>
                        <span className="kampanya-modal-summary-value">
                            {analizSonucu?.toplamAktifKampanyaSayisi || 0}
                        </span>
                    </div>
                    <div className="kampanya-modal-summary-item">
                        <CheckCircle2 size={16} />
                        <span>{t('Kazanılabilir Avantaj')}:</span>
                        <span className="kampanya-modal-summary-value text-success">
                            {uygulanabilirSayisi} {t('Kampanya')}
                        </span>
                    </div>
                </div>

                {/* Tabs */}
                <TabLayout
                    tabs={tabs}
                    activeTabId={activeTabId}
                    onChange={setActiveTabId}
                />

                {isLoading ? (
                    <div className="flex justify-center items-center p-32">
                        <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                ) : (
                    <div className="kampanya-analiz-grid">
                        {/* Tab 1: Uygulanabilir Kampanyalar */}
                        {activeTabId === 'uygulanabilir' && (
                            <>
                                {uygulanabilirSayisi === 0 ? (
                                    <div className="flex-col items-center justify-center p-32 text-center gap-8">
                                        <AlertCircle size={40} className="text-secondary opacity-50" />
                                        <h4 className="m-0 font-semibold">{t('Uygulanabilir kampanya bulunamadı')}</h4>
                                        <p className="text-secondary text-xs m-0">
                                             {t('Mevcut sepetiniz için henüz tüm şartları karşılanan bir kampanya yok. Fırsatlar sekmesine göz atarak eksik şartları tamamlayabilirsiniz.')}
                                        </p>
                                    </div>
                                ) : (
                                    analizSonucu?.uygulanabilirKampanyalar.map((kampanya) => {
                                        const isApplied = uygulananKampanya?.kampanyaId === kampanya.kampanyaId;
                                        return (
                                            <div key={kampanya.kampanyaId} className="kampanya-analiz-card">
                                                <div className="kampanya-card-header-row">
                                                    <div>
                                                        <h4 className="m-0 font-semibold">{kampanya.kampanyaAdi}</h4>
                                                        <span className="text-secondary text-xs">{kampanya.kampanyaKodu} • {kampanya.belgeAdi}</span>
                                                    </div>
                                                    {isApplied ? (
                                                        <span className="kampanya-badge-applied">
                                                            <Sparkles size={14} />
                                                            {t('Siparişe Uygulandı')}
                                                        </span>
                                                    ) : (
                                                        <span className="kampanya-badge-success">
                                                            <CheckCircle2 size={14} />
                                                            {t('Şartlar Sağlandı')}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Benefit Summary */}
                                                <div className="kampanya-benefit-box">
                                                    <div className="flex items-center gap-8">
                                                        {kampanya.hediyeUrunVeHizmetAdi ? <Gift size={18} /> : <Sparkles size={18} />}
                                                        <span className="kampanya-benefit-title">
                                                            {kampanya.hediyeUrunVeHizmetAdi 
                                                                ? `${t('Hediye Ürün')}: ${kampanya.hediyeUrunVeHizmetAdi}`
                                                                : (kampanya.aksiyonTipi === 1 
                                                                    ? `${t('İndirim Oranı')}: %${kampanya.aksiyonDegeri}`
                                                                    : `${t('Sabit İndirim')}: ${kampanya.aksiyonDegeri?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ (${kampanya.kdvDahilMi ? t('KDV Dahil') : t('KDV Hariç')})`)}
                                                        </span>
                                                    </div>
                                                    <span className="kampanya-benefit-value">
                                                        +{kampanya.kazanilanIndirimTutari.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ {t('Avantaj')}
                                                    </span>
                                                </div>

                                                {/* Kurallar Listesi */}
                                                <div className="flex-col gap-6">
                                                    <span className="text-xs font-semibold text-secondary">{t('Karşılanan Kurallar')}:</span>
                                                    <ul className="kampanya-neden-list">
                                                        {kampanya.kuralDurumlari.map((kural) => (
                                                            <li key={kural.kuralId} className="kampanya-neden-item text-success">
                                                                <CheckCircle2 size={14} />
                                                                <span>{kural.aciklama}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                {/* Action Button */}
                                                <div className="flex justify-end mt-8">
                                                    {isApplied ? (
                                                        <BaseButton
                                                            text={t('Kampanyayı Kaldır')}
                                                            icon={<Trash2 size={16} />}
                                                            variant="danger"
                                                            onClick={() => {
                                                                onKampanyaKaldir && onKampanyaKaldir(kampanya);
                                                                onClose();
                                                            }}
                                                        />
                                                    ) : (
                                                        <BaseButton
                                                            text={t('Siparişe Uygula')}
                                                            icon={<ArrowRight size={16} />}
                                                            variant="primary"
                                                            onClick={() => {
                                                                onKampanyaUygula(kampanya);
                                                                onClose();
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </>
                        )}

                        {/* Tab 2: Uygulanamayan Kampanyalar & Fırsatlar */}
                        {activeTabId === 'uygulanamayan' && (
                            <>
                                {uygulanamayanSayisi === 0 ? (
                                    <div className="flex-col items-center justify-center p-32 text-center gap-8">
                                        <CheckCircle2 size={40} className="text-success" />
                                        <h4 className="m-0 font-semibold">{t('Tebrikler!')}</h4>
                                        <p className="text-secondary text-xs m-0">
                                            {t('Tüm aktif kampanyaların koşullarını başarıyla sağladınız.')}
                                        </p>
                                    </div>
                                ) : (
                                    analizSonucu?.uygulanamayanKampanyalar.map((kampanya) => (
                                        <div key={kampanya.kampanyaId} className="kampanya-analiz-card">
                                            <div className="kampanya-card-header-row">
                                                <div>
                                                    <h4 className="m-0 font-semibold">{kampanya.kampanyaAdi}</h4>
                                                    <span className="text-secondary text-xs">{kampanya.kampanyaKodu} • {kampanya.belgeAdi}</span>
                                                </div>
                                                <span className="kampanya-badge-warning">
                                                    <AlertCircle size={14} />
                                                    %{kampanya.ilerlemeYuzdesi} {t('Tamamlandı')}
                                                </span>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="flex-col gap-4">
                                                <div className="kampanya-progress-bar">
                                                    <div
                                                        className="kampanya-progress-fill"
                                                        style={{ width: `${kampanya.ilerlemeYuzdesi}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Neden Sağlanamadı */}
                                            {kampanya.saglanamayanNedenler.length > 0 && (
                                                <div className="flex-col gap-6">
                                                    <span className="text-xs font-semibold text-secondary">{t('Neden Yararlanılamıyor?')}:</span>
                                                    <ul className="kampanya-neden-list">
                                                        {kampanya.saglanamayanNedenler.map((neden, idx) => (
                                                            <li key={idx} className="kampanya-neden-item text-danger">
                                                                <XCircle size={14} />
                                                                <span>{neden}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Nasıl Yararlanırım? (Aksiyon Önerisi) */}
                                            {kampanya.nasilYararlanilirOnerileri.length > 0 && (
                                                <div className="kampanya-oneri-box">
                                                    <Lightbulb size={20} className="text-primary flex-shrink-0 mt-2" />
                                                    <div className="flex-col gap-4">
                                                        <span className="text-xs font-bold text-primary">{t('Nasıl Yararlanabilirsiniz?')}:</span>
                                                        {kampanya.nasilYararlanilirOnerileri.map((oneri, idx) => (
                                                            <span key={idx} className="kampanya-oneri-text">
                                                                • {oneri}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </BasePopup>
    );
};

export default SiparisKampanyaAnalizModal;
