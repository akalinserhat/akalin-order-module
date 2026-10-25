/**
 * Webakus ERP - Sıcak Satış Sihirbazı 1. Aşama: Ürün Seçimi & Teklif Sepeti (SicakSatisUrunSecimStep.tsx)
 *
 * Başlıca Sorumlulukları:
 * - Hızlı belge üst bilgileri (Tarih, Geçerlilik, Belge No, Para Birimi) kontrolü
 * - Teklif seçenekleri sekmeleri (Alternatif 1, 2... klonlama, adlandırma, ekleme, silme)
 * - Barkod, hızlı arama, Ürün Rehberi ve Hazır Paket/Set yükleme çubuğu
 * - Zengin sepet tablosu (stok durumu, stepper, iskonto, teklif fiyatı)
 * - Pazarlık kırılımı & POS taksit simülatörü paneli
 * - Kamuflajlı kârlılık gösterge çubuğu
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Plus,
    Copy,
    Trash2,
    ShoppingCart,
    Search,
    Layers,
    Package,
    Minus,
    Barcode,
    Sparkles,
    Edit3,
    Image as ImageIcon
} from 'lucide-react';
import { TabLayout, CurrencyInput } from '@akalin/ui';
import { SicakSatisBaglamDto } from '../dtos/SatisBelgeleriDto';
import {
    SicakSatisTeklifFormData,
    SicakSatisTeklifSecenegiState
} from '../defaults/sicakSatisTeklifDefaultValue';
import { type SiparisKampanyaAnalizSonucuDto } from '@akalin/product_module';
import SicakSatisPosTaksitPanel from './SicakSatisPosTaksitPanel';
import SicakSatisKarlilikBar from './SicakSatisKarlilikBar';

export interface SicakSatisUrunSecimStepProps {
    formData: SicakSatisTeklifFormData;
    onMasterChange: (field: string, value: any) => void;
    baglam: SicakSatisBaglamDto;
    secenekler: SicakSatisTeklifSecenegiState[];
    activeSecenek: SicakSatisTeklifSecenegiState;
    activeSecenekId: string;
    onSelectSecenekId: (id: string) => void;
    onUpdateActiveSecenek: (updater: (sec: SicakSatisTeklifSecenegiState) => SicakSatisTeklifSecenegiState) => void;
    onAddOptionTab: () => void;
    onCloneActiveOptionTab: () => void;
    onRemoveOptionTab: (secenekId: string) => void;
    onRenameSecenek: (secenekId: string, yeniAd: string) => void;
    quickSearchText: string;
    setQuickSearchText: (text: string) => void;
    isSearchingProduct: boolean;
    onQuickProductSearch: () => void;
    onOpenUrunModal: () => void;
    onOpenPaketModal: () => void;
    onOpenKampanyaModal: () => void;
    kampanyaAnalizSonucu: SiparisKampanyaAnalizSonucuDto | null;
    currencySymbol: string;
    calculateSecenekSummary: (sec: SicakSatisTeklifSecenegiState) => any;
    handleHedefNetTutarApply: (hedefNet: number) => void;
    quickInputRef: React.RefObject<HTMLInputElement | null>;
    onConvertToOrder?: () => void;
    isConvertingOrder?: boolean;
}

export const SicakSatisUrunSecimStep: React.FC<SicakSatisUrunSecimStepProps> = ({
    formData,
    onMasterChange,
    baglam,
    secenekler,
    activeSecenek,
    activeSecenekId,
    onSelectSecenekId,
    onUpdateActiveSecenek,
    onAddOptionTab,
    onCloneActiveOptionTab,
    onRemoveOptionTab,
    onRenameSecenek,
    quickSearchText,
    setQuickSearchText,
    isSearchingProduct,
    onQuickProductSearch,
    onOpenUrunModal,
    onOpenPaketModal,
    onOpenKampanyaModal,
    kampanyaAnalizSonucu,
    currencySymbol,
    calculateSecenekSummary,
    handleHedefNetTutarApply,
    quickInputRef,
    onConvertToOrder,
    isConvertingOrder
}) => {
    const { t } = useTranslation();
    const [editingSecenekNameId, setEditingSecenekNameId] = useState<string | null>(null);

    const activeSummary = calculateSecenekSummary(activeSecenek);

    // Sepet Miktar Güncelleme
    const handleKalemMiktarChange = (kalemId: string, yeniMiktar: number) => {
        const miktar = Math.max(1, yeniMiktar);
        onUpdateActiveSecenek(sec => ({
            ...sec,
            kalemler: sec.kalemler.map(k => {
                if (k.id !== kalemId) return k;
                const satirToplam = Number((miktar * k.teklifBirimFiyati).toFixed(2));
                const listeSatir = miktar * k.listeFiyati;
                const iskontoTutari = Math.max(0, Number((listeSatir - satirToplam).toFixed(2)));
                return {
                    ...k,
                    miktar,
                    satirToplam,
                    iskontoTutari
                };
            })
        }));
    };

    // Sepet İskonto Oranı Güncelleme
    const handleKalemIskontoOranChange = (kalemId: string, yeniOran: number) => {
        const oran = Math.min(100, Math.max(0, yeniOran));
        onUpdateActiveSecenek(sec => ({
            ...sec,
            kalemler: sec.kalemler.map(k => {
                if (k.id !== kalemId) return k;
                const teklifBirimFiyati = Number((k.listeFiyati * (1 - oran / 100)).toFixed(2));
                const satirToplam = Number((k.miktar * teklifBirimFiyati).toFixed(2));
                const iskontoTutari = Math.max(0, Number((k.miktar * k.listeFiyati - satirToplam).toFixed(2)));
                return {
                    ...k,
                    iskontoOrani: oran,
                    teklifBirimFiyati,
                    satirToplam,
                    iskontoTutari
                };
            })
        }));
    };

    // Sepet Teklif Birim Fiyatı Güncelleme
    const handleKalemTeklifFiyatChange = (kalemId: string, yeniTeklifFiyati: number) => {
        const fiyat = Math.max(0, yeniTeklifFiyati);
        onUpdateActiveSecenek(sec => ({
            ...sec,
            kalemler: sec.kalemler.map(k => {
                if (k.id !== kalemId) return k;
                const satirToplam = Number((k.miktar * fiyat).toFixed(2));
                const listeSatir = k.miktar * k.listeFiyati;
                const iskontoTutari = Math.max(0, Number((listeSatir - satirToplam).toFixed(2)));
                const iskontoOrani =
                    listeSatir > 0 ? Number(((iskontoTutari / listeSatir) * 100).toFixed(2)) : 0;
                return {
                    ...k,
                    teklifBirimFiyati: fiyat,
                    satirToplam,
                    iskontoTutari,
                    iskontoOrani
                };
            })
        }));
    };

    // Sepetten Kalem Silme
    const handleKalemSil = (kalemId: string) => {
        onUpdateActiveSecenek(sec => ({
            ...sec,
            kalemler: sec.kalemler.filter(k => k.id !== kalemId)
        }));
    };

    // Teklif Seçenekleri TabLayout Öğeleri
    const optionTabItems = secenekler.map(sec => {
        const sum = calculateSecenekSummary(sec);
        const isEditingName = editingSecenekNameId === sec.id;

        return {
            id: sec.id,
            closable: secenekler.length > 1,
            label: (
                <div className="sicak-satis-option-tab-label">
                    {isEditingName ? (
                        <input
                            type="text"
                            className="sicak-satis-option-rename-input"
                            value={sec.secenekAdi}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => onRenameSecenek(sec.id, e.target.value)}
                            onBlur={() => setEditingSecenekNameId(null)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    setEditingSecenekNameId(null);
                                }
                            }}
                        />
                    ) : (
                        <span
                            className="sicak-satis-option-name"
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingSecenekNameId(sec.id);
                            }}
                        >
                            {sec.secenekAdi}
                        </span>
                    )}

                    <span className="sicak-satis-option-count-badge">
                        {sec.kalemler.length} {t('sicak_satis.item_short', 'Ürün')}
                    </span>

                    <span className="sicak-satis-option-amount-badge">
                        {sum.netSatisToplam.toLocaleString('tr-TR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })}{' '}
                        {currencySymbol}
                    </span>
                </div>
            )
        };
    });

    return (
        <div className="sicak-satis-step-products-container">
            {/* TEKLİF SEÇENEKLERİ TABLAYOUT ÇUBUĞU */}
            <div className="sicak-satis-options-bar">
                <TabLayout
                    tabs={optionTabItems as any}
                    activeId={activeSecenek.id}
                    onChange={(id) => onSelectSecenekId(String(id))}
                    hideIfSingleTab={false}
                    variant="secondary"
                    editable
                    onAddTab={onAddOptionTab}
                    onCloseTab={(id) => onRemoveOptionTab(String(id))}
                    actions={[
                        {
                            label: t('sicak_satis.rename_btn', 'Adlandır'),
                            icon: <Edit3 size={14} />,
                            onClick: () => setEditingSecenekNameId(activeSecenek.id),
                            title: t('sicak_satis.rename_option_tooltip', 'Aktif seçenek adını değiştir')
                        },
                        {
                            label: t('sicak_satis.clone_option_btn', 'Sekmeyi Kopyala'),
                            icon: <Copy size={14} />,
                            onClick: onCloneActiveOptionTab,
                            title: t(
                                'sicak_satis.clone_option_tooltip',
                                'Mevcut sepeti yeni bir alternatif seçenek olarak kopyala'
                            )
                        }
                    ]}
                />
            </div>

            {/* 3. BARKOD / HIZLI ARAMA & REHBER ÇUBUĞU */}
            <div className="sicak-satis-cart-toolbar">
                <div className="sicak-satis-quick-search-box">
                    <Barcode size={18} className="sicak-satis-search-icon" />
                    <input
                        ref={quickInputRef}
                        id="sicakSatisBarkodInput"
                        type="text"
                        className="sicak-satis-quick-input"
                        value={quickSearchText}
                        onChange={(e) => setQuickSearchText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                onQuickProductSearch();
                            }
                        }}
                        placeholder={t(
                            'sicak_satis.barcode_or_product_placeholder',
                            'Barkod okutun veya ürün kodu / adı yazıp Enter’a basın...'
                        )}
                    />
                    <button
                        type="button"
                        className="sicak-satis-quick-add-btn"
                        disabled={isSearchingProduct}
                        onClick={onQuickProductSearch}
                    >
                        <Search size={15} />
                        <span>{t('sicak_satis.add_to_cart_btn', 'Sepete Ekle')}</span>
                    </button>
                </div>

                <div className="sicak-satis-toolbar-buttons">
                    <button
                        type="button"
                        className="sicak-satis-Catalog-btn"
                        onClick={onOpenUrunModal}
                    >
                        <Package size={15} />
                        <span>{t('sicak_satis.select_from_catalog', 'Ürün Rehberi')}</span>
                    </button>

                    <button
                        type="button"
                        className="sicak-satis-Catalog-btn accent"
                        onClick={onOpenPaketModal}
                    >
                        <Layers size={15} />
                        <span>{t('sicak_satis.load_package_set', 'Hazır Paket / Set Yükle')}</span>
                    </button>
                </div>
            </div>

            {/* 4. SEPET KALEMLERİ TABLOSU */}
            <div className="sicak-satis-cart-wrapper">
                {activeSecenek.kalemler.length === 0 ? (
                    <div className="sicak-satis-empty-cart">
                        <div className="sicak-satis-empty-icon">
                            <ShoppingCart size={32} />
                        </div>
                        <h4 className="sicak-satis-empty-title">
                            {t(
                                'sicak_satis.empty_cart_title',
                                '{{secenek}} sepetinde henüz ürün bulunmuyor',
                                { secenek: activeSecenek.secenekAdi }
                            )}
                        </h4>
                        <p className="sicak-satis-empty-desc">
                            {t(
                                'sicak_satis.empty_cart_desc',
                                'Barkod okutarak, Ürün Rehberinden seçerek veya Hazır Paket/Set yükleyerek müşteriye özel teklif sepetini oluşturmaya başlayın.'
                            )}
                        </p>
                    </div>
                ) : (
                    <div className="sicak-satis-cart-table-container">
                        <table className="sicak-satis-cart-table">
                            <thead>
                                <tr>
                                    <th>{t('sicak_satis.col_product', 'Ürün & Stok Durumu')}</th>
                                    <th className="text-center">{t('sicak_satis.col_quantity', 'Miktar')}</th>
                                    <th className="text-right">
                                        {t('sicak_satis.col_list_price', 'Liste Fiyatı (KDV Dahil)')}
                                    </th>
                                    <th className="text-center">
                                        {t('sicak_satis.col_discount_rate', 'İskonto (%)')}
                                    </th>
                                    <th className="text-right">
                                        {t('sicak_satis.col_offer_unit_price', 'Teklif Birim Fiyatı')}
                                    </th>
                                    <th className="text-right">
                                        {t('sicak_satis.col_line_total', 'Satır Toplamı')}
                                    </th>
                                    <th className="text-center"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeSecenek.kalemler.map((kalem) => (
                                    <tr key={kalem.id} className="sicak-satis-cart-row">
                                        <td>
                                            <div className="sicak-satis-product-cell">
                                                <div
                                                    className={`sicak-satis-product-circular-thumb ${!kalem.anaResimUrl ? 'is-placeholder' : ''}`}
                                                    title={kalem.urunAdi}
                                                >
                                                    {kalem.anaResimUrl ? (
                                                        <img
                                                            src={kalem.anaResimUrl}
                                                            alt={kalem.urunAdi}
                                                            className="sicak-satis-circular-img"
                                                        />
                                                    ) : (
                                                        <ImageIcon size={18} className="sicak-satis-placeholder-icon" />
                                                    )}
                                                </div>
                                                <div className="sicak-satis-product-meta">
                                                    <div className="sicak-satis-product-name">
                                                        {kalem.urunAdi}
                                                    </div>
                                                    <div className="sicak-satis-product-badges">
                                                        <span className="code-badge">{kalem.urunKodu}</span>
                                                        <span
                                                            className={`sicak-satis-stock-pill ${
                                                                kalem.satilabilirStokMiktari > 0
                                                                    ? 'in-stock'
                                                                    : 'low-stock'
                                                            }`}
                                                        >
                                                            {t('sicak_satis.sellable_stock', 'Satılabilir')}:{' '}
                                                            {kalem.satilabilirStokMiktari} {kalem.birimAdi}
                                                        </span>
                                                        {kalem.birimBshFiyatFarki > 0 && (
                                                            <span className="sicak-satis-bsh-pill">
                                                                <Sparkles size={11} />
                                                                {t('sicak_satis.bsh_support_badge', 'BSH Destekli')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="text-center">
                                            <div className="sicak-satis-qty-stepper">
                                                <button
                                                    type="button"
                                                    className="sicak-satis-qty-btn"
                                                    onClick={() =>
                                                        handleKalemMiktarChange(
                                                            kalem.id,
                                                            kalem.miktar - 1
                                                        )
                                                    }
                                                >
                                                    <Minus size={13} />
                                                </button>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    className="sicak-satis-qty-input"
                                                    value={kalem.miktar}
                                                    onChange={(e) =>
                                                        handleKalemMiktarChange(
                                                            kalem.id,
                                                            Number(e.target.value || 1)
                                                        )
                                                    }
                                                />
                                                <button
                                                    type="button"
                                                    className="sicak-satis-qty-btn"
                                                    onClick={() =>
                                                        handleKalemMiktarChange(
                                                            kalem.id,
                                                            kalem.miktar + 1
                                                        )
                                                    }
                                                >
                                                    <Plus size={13} />
                                                </button>
                                            </div>
                                        </td>

                                        <td className="text-right">
                                            <span className="sicak-satis-list-price">
                                                {kalem.listeFiyati.toLocaleString('tr-TR', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                })}{' '}
                                                {currencySymbol}
                                            </span>
                                        </td>

                                        <td className="text-center">
                                            <div className="sicak-satis-inline-input-wrap">
                                                <span className="prefix">%</span>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    step="0.5"
                                                    className="sicak-satis-discount-input"
                                                    value={kalem.iskontoOrani || ''}
                                                    placeholder="0"
                                                    onChange={(e) =>
                                                        handleKalemIskontoOranChange(
                                                            kalem.id,
                                                            Number(e.target.value || 0)
                                                        )
                                                    }
                                                />
                                            </div>
                                        </td>

                                        <td className="text-right">
                                            <CurrencyInput
                                                value={kalem.teklifBirimFiyati}
                                                onChange={(e) =>
                                                    handleKalemTeklifFiyatChange(
                                                        kalem.id,
                                                        Number(e.target.value || 0)
                                                    )
                                                }
                                                suffix={currencySymbol}
                                                decimalScale={2}
                                                className="sicak-satis-offer-currency-input"
                                            />
                                        </td>

                                        <td className="text-right">
                                            <div className="sicak-satis-line-total">
                                                {kalem.satirToplam.toLocaleString('tr-TR', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                })}{' '}
                                                {currencySymbol}
                                            </div>
                                            {kalem.iskontoTutari > 0 && (
                                                <div className="sicak-satis-line-saved">
                                                    -{kalem.iskontoTutari.toLocaleString('tr-TR', {
                                                        minimumFractionDigits: 2
                                                    })}{' '}
                                                    {currencySymbol}
                                                </div>
                                            )}
                                        </td>

                                        <td className="text-center">
                                            <button
                                                type="button"
                                                className="sicak-satis-row-delete-btn"
                                                onClick={() => handleKalemSil(kalem.id)}
                                                title={t('common.delete', 'Sil')}
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* 5. SEPET ALTI: PAZARLIK & MÜŞTERİ AVANTAJLARI (YATAY PANEL) */}
            <SicakSatisPosTaksitPanel
                activeSecenek={activeSecenek}
                currencySymbol={currencySymbol}
                listeToplam={activeSummary.listeToplam}
                satirIskontoToplam={activeSummary.satirIskontoToplam}
                araToplam={activeSummary.araToplam}
                netSatisToplam={activeSummary.netSatisToplam}
                toplamMusteriKazanci={activeSummary.toplamMusteriKazanci}
                onEkPazarlikChange={(tutar) =>
                    onUpdateActiveSecenek(sec => ({
                        ...sec,
                        ekPazarlikIndirimTutari: tutar
                    }))
                }
                onHedefNetTutarApply={handleHedefNetTutarApply}
                onHedefNetInputChange={(val) =>
                    onUpdateActiveSecenek(sec => ({
                        ...sec,
                        hedefNetTutarInput: val
                    }))
                }
                onOpenKampanyaModal={onOpenKampanyaModal}
                uygulanabilirKampanyaSayisi={
                    kampanyaAnalizSonucu?.uygulanabilirKampanyalar?.length || 0
                }
            />

            {/* 6. KAMUFLAJLI KÂRLILIK GÖSTERGESİ */}
            <SicakSatisKarlilikBar
                secenekAdi={activeSecenek.secenekAdi}
                currencySymbol={currencySymbol}
                netSatisToplam={activeSummary.netSatisToplam}
                taksitliToplam={activeSummary.taksitliToplam}
                secilenTaksitSayisi={activeSecenek.secilenTaksitSayisi}
                toplamAlisMaliyeti={activeSummary.toplamAlisMaliyeti}
                kampanyaFirmaHakEdisTutari={activeSummary.kampanyaFirmaHakEdis}
                toplamBshFiyatFarki={activeSummary.toplamBshFiyatFarki}
                posKomisyonTutari={activeSummary.posKomisyonTutari}
                gercekNetKarTutari={activeSummary.gercekNetKarTutari}
                gercekNetKarOrani={activeSummary.gercekNetKarOrani}
                kritikKarOrani={baglam.kritikKarOrani}
                hedefKarOrani={baglam.hedefKarOrani}
                yuksekKarOrani={baglam.yuksekKarOrani}
                kalemSayisi={activeSecenek.kalemler.length}
                isConvertingOrder={isConvertingOrder}
                onConvertToOrder={onConvertToOrder}
            />
        </div>
    );
};

export default SicakSatisUrunSecimStep;
