/**
 * @file SiparisSeciciList.tsx
 * @description Webakus ERP - Sipariş Yönetimi Modülü Sipariş Kalemi Seçici Liste Bileşeni (SiparisSeciciList)
 * BaseSelectionList (@akalin/ui / @webakus/ui) temel iskeletinden türetilmiş,
 * cariye ait açık veya tüm sipariş satırlarını tam sayfa (BaseSelectionList) görünümünde
 * filtreleme, GlobalSearch entegrasyonu, klavye gezinimi ve çoklu seçim özellikleriyle sunan bağımsız seçim sayfası.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { ShoppingCart } from 'lucide-react';
import { BaseSelectionList, useHeaderApi } from '@akalin/ui';

export interface SiparisSeciciListProps {
    isOpen?: boolean;
    onClose?: () => void;
    onSelect: (mockSiparis: any, selectedItems: any[]) => void;
    isMultiSelect?: boolean;
    onMultiSelect?: (kalemler: any[]) => void;
    initialSearchText?: string;
    initialSearchTerm?: string;
    islemTuru?: number;
    siparisTuru?: number;
    cariId?: number | string;
    cariUnvan?: string;
    depoId?: number | string;
    hideFinanceInfo?: boolean;
    tumKalemler?: boolean;
    excludedIds?: number[];
    title?: string;
    subtitle?: string;
    inModal?: boolean;
    [key: string]: any;
}

// Geriye dönük uyumluluk alias'ı
export type SiparisSeciciModalProps = SiparisSeciciListProps;

const SiparisSeciciList: React.FC<SiparisSeciciListProps> = ({
    isOpen = true,
    onClose,
    onSelect,
    isMultiSelect = true,
    onMultiSelect,
    initialSearchText = '',
    initialSearchTerm = '',
    islemTuru,
    siparisTuru,
    cariId,
    cariUnvan,
    depoId,
    hideFinanceInfo = false,
    tumKalemler = false,
    excludedIds = [],
    title,
    subtitle,
    inModal = true,
    ...restProps
}) => {
    const { t } = useTranslation();
    const { setHeaderBreadcrumbOptions } = useHeaderApi() || {};
    const [fetchedCariUnvan, setFetchedCariUnvan] = useState<string>('');
    const resolvedIslemTuru = islemTuru ?? siparisTuru;
    const effectiveSearchText = initialSearchText || initialSearchTerm;
    const effectiveCariUnvan = (cariUnvan || fetchedCariUnvan || '').trim();

    // GlobalSearch entegrasyonu için arama alanları
    const siparisSearchFields = useMemo(() => [
        {
            id: 'Tumu',
            label: t('auto_tumunde_ara', 'Tümünde Ara'),
            type: 'text',
            iconName: 'Search',
            placeholder: t('orders.search_order_line_placeholder', 'Sipariş No, Ürün Kodu, Barkod veya Adı Ara...')
        },
        {
            id: 'SiparisNo',
            label: t('orders.search_by_order_no', 'Sipariş Numarasına Göre'),
            type: 'text',
            iconName: 'FileText',
            placeholder: t('orders.enter_order_no', 'Sipariş numarası girin...')
        },
        {
            id: 'UrunKodu',
            label: t('auto_koda_gore', 'Ürün Koduna Göre'),
            type: 'text',
            iconName: 'Barcode',
            placeholder: t('auto_urun_kodu_girin', 'Ürün kodunu girin...')
        },
        {
            id: 'UrunAdi',
            label: t('auto_ada_gore', 'Ürün Adına Göre'),
            type: 'text',
            iconName: 'Type',
            placeholder: t('auto_urun_adi_girin', 'Ürün adını girin...')
        },
        {
            id: 'Barkod',
            label: t('auto_barkoda_gore', 'Barkoda Göre'),
            type: 'text',
            iconName: 'Hash',
            placeholder: t('auto_barkod_girin', 'Barkod girin...')
        }
    ], [t]);

    // Veri Çekme Fonksiyonu (BaseSelectionList / DataTable sözleşmesine uygun)
    const handleFetchData = useCallback(async (args: any = {}) => {
        const params = new URLSearchParams();
        if (cariId) {
            params.append('cariId', cariId.toString());
        }
        if (resolvedIslemTuru) {
            params.append('islemTuru', resolvedIslemTuru.toString());
        }
        if (depoId) {
            params.append('depoId', depoId.toString());
        }
        if (hideFinanceInfo) {
            params.append('hideFinanceInfo', 'true');
        }
        if (tumKalemler) {
            params.append('tumKalemler', 'true');
        }

        try {
            const res = await axios.get(`/api/SatisBelgeleri/AcikKalemler?${params.toString()}`);
            let data: any[] = Array.isArray(res.data) ? res.data : [];

            if (!cariUnvan && data.length > 0 && data[0]?.cariUnvan) {
                setFetchedCariUnvan(String(data[0].cariUnvan));
            }

            if (excludedIds && excludedIds.length > 0) {
                const numericExcluded = excludedIds.map(id => Number(id));
                data = data.filter((k: any) => !numericExcluded.includes(Number(k.id)));
            }

            const activeSearch = (args.aramaData && args.aramaData.value !== undefined)
                ? args.aramaData.value
                : (args.aramaMetni !== undefined ? args.aramaMetni : effectiveSearchText);

            if (activeSearch && typeof activeSearch === 'string' && activeSearch.trim().length > 0) {
                const lowerSearch = activeSearch.trim().toLocaleLowerCase('tr-TR');
                const searchType = args.aramaData?.type || 'Tumu';

                data = data.filter((k: any) => {
                    const sipNo = String(k.siparisFisiNo || k.siparisNo || '').toLocaleLowerCase('tr-TR');
                    const uKodu = String(k.urunKodu || '').toLocaleLowerCase('tr-TR');
                    const uAdi = String(k.urunAdi || '').toLocaleLowerCase('tr-TR');
                    const barkod = String(k.barkod || '').toLocaleLowerCase('tr-TR');

                    if (searchType === 'SiparisNo') return sipNo.includes(lowerSearch);
                    if (searchType === 'UrunKodu') return uKodu.includes(lowerSearch);
                    if (searchType === 'UrunAdi') return uAdi.includes(lowerSearch);
                    if (searchType === 'Barkod') return barkod.includes(lowerSearch);
                    return sipNo.includes(lowerSearch) || uKodu.includes(lowerSearch) || uAdi.includes(lowerSearch) || barkod.includes(lowerSearch);
                });
            }

            return { data, totalCount: data.length };
        } catch (error) {
            console.error('Sipariş kalemleri alınamadı', error);
            return { data: [], totalCount: 0 };
        }
    }, [resolvedIslemTuru, cariId, depoId, hideFinanceInfo, tumKalemler, excludedIds, effectiveSearchText]);

    // Tablo Kolonları
    const columns = useMemo(() => {
        const baseColumns: any[] = [
            {
                accessor: 'tarih',
                header: t('common.date', 'Tarih'),
                width: '110px',
                sortable: true,
                render: (item: any) => (
                    <div className="siparis-secici-cell-secondary">
                        {item.tarih ? new Date(item.tarih).toLocaleDateString('tr-TR') : '-'}
                    </div>
                )
            },
            {
                accessor: 'siparisNo',
                header: t('orders.order_slip_no', 'Sipariş No'),
                width: '140px',
                sortable: true,
                render: (item: any) => (
                    <div className="siparis-secici-cell-primary">
                        {item.siparisFisiNo || item.siparisNo}
                    </div>
                )
            },
            {
                accessor: 'islemTuruAdi',
                header: t('common.type', 'Tür'),
                width: '130px',
                sortable: true,
                render: (item: any) => {
                    const isAlis = item.islemTuru === 2;
                    return (
                        <div className={`siparis-secici-type-badge ${isAlis ? 'is-alis' : 'is-satis'}`}>
                            {item.islemTuruAdi || (isAlis ? t('Verilen Sipariş', 'Verilen Sipariş') : t('Alınan Sipariş', 'Alınan Sipariş'))}
                        </div>
                    );
                }
            },
            {
                accessor: 'urunKodu',
                header: t('orders.product_code', 'Ürün Kodu'),
                width: '130px',
                sortable: true,
                render: (item: any) => (
                    <div className="siparis-secici-cell-code">
                        {item.urunKodu}
                    </div>
                )
            },
            {
                accessor: 'urunAdi',
                header: t('orders.product_name', 'Ürün Adı'),
                sortable: true,
                render: (item: any) => (
                    <div className="siparis-secici-cell-primary">
                        {item.urunAdi}
                    </div>
                )
            },
            {
                accessor: 'miktar',
                header: t('orders.order_qty', 'Sipariş Mik.'),
                width: '115px',
                align: 'right' as const,
                sortable: true,
                render: (item: any) => (
                    <div className="siparis-secici-cell-qty">
                        {item.miktar?.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} {item.birimAdi}
                    </div>
                )
            },
            {
                accessor: 'karsilananMiktar',
                header: t('orders.fulfilled_qty', 'Karşılanan'),
                width: '110px',
                align: 'right' as const,
                sortable: true,
                render: (item: any) => (
                    <div className="siparis-secici-cell-fulfilled">
                        {item.karsilananMiktar?.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} {item.birimAdi}
                    </div>
                )
            },
            {
                accessor: 'acikMiktar',
                header: t('orders.open_qty', 'Açık Miktar'),
                width: '120px',
                align: 'right' as const,
                sortable: true,
                render: (item: any) => (
                    <div className="siparis-secici-cell-open">
                        {item.acikMiktar?.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} {item.birimAdi}
                    </div>
                )
            }
        ];

        if (!hideFinanceInfo) {
            baseColumns.push({
                accessor: 'listeFiyati',
                header: t('orders.unit_price', 'B. Fiyatı'),
                width: '125px',
                align: 'right' as const,
                sortable: true,
                render: (item: any) => (
                    <div className="siparis-secici-cell-primary">
                        {(item.listeFiyati || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                )
            });
        }

        return baseColumns;
    }, [hideFinanceInfo, t]);

    // Mobil Kart Tasarımı
    const mobileCardRender = useCallback((item: any) => (
        <div className="siparis-secici-mobile-card">
            <div className="siparis-secici-mobile-header">
                <span className="siparis-secici-mobile-title">
                    {item.urunAdi}
                </span>
                <span className="siparis-secici-mobile-docno">
                    {item.siparisFisiNo || item.siparisNo}
                </span>
            </div>
            <div className="siparis-secici-mobile-sub">
                <span>{item.urunKodu}</span>
                <span>
                    {item.tarih ? new Date(item.tarih).toLocaleDateString('tr-TR') : '-'}
                </span>
            </div>
            <div className="siparis-secici-mobile-metrics">
                <div>{t('orders.quantity', 'Miktar')}: {item.miktar} {item.birimAdi}</div>
                <div className="siparis-secici-cell-fulfilled">{t('orders.fulfilled_qty', 'Karşılanan')}: {item.karsilananMiktar} {item.birimAdi}</div>
            </div>
            <div className="siparis-secici-mobile-footer">
                <div className="siparis-secici-cell-open">{t('orders.open_qty', 'Açık Miktar')}: {item.acikMiktar?.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} {item.birimAdi}</div>
                {!hideFinanceInfo && (
                    <div className="siparis-secici-cell-primary">
                        {(item.listeFiyati || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                )}
            </div>
        </div>
    ), [hideFinanceInfo, t]);

    // Seçim Onaylama (Tekil veya Çoklu Seçim Desteği)
    const handleConfirmSelection = useCallback((itemsOrSingle: any) => {
        const rawArray = Array.isArray(itemsOrSingle) ? itemsOrSingle : (itemsOrSingle ? [itemsOrSingle] : []);
        if (rawArray.length === 0) return;

        const selectedItems = rawArray.map((k: any) => ({
            ...k,
            id: k.id,
            urunVeHizmetKartiId: k.urunVeHizmetKartiId,
            urunKodu: k.urunKodu,
            urunAdi: k.urunAdi,
            urunVeHizmetKartiKodu: k.urunKodu,
            urunVeHizmetKartiAdi: k.urunAdi,
            miktar: (k.acikMiktar && k.acikMiktar > 0) ? k.acikMiktar : k.miktar,
            birimAdi: k.birimAdi,
            birimTipiId: k.birimTipiId,
            siparisFisiId: k.siparisFisiId,
            belgeNo: k.siparisFisiNo || k.siparisNo,
            barkod: k.barkod,
            stokTakipTuru: k.stokTakipTuru,
            islemTuru: k.islemTuru,
            islemTuruAdi: k.islemTuruAdi,
            depoId: k.depoId,
            kargoFirmasiId: k.kargoFirmasiId,
            teslimTarihi: k.teslimTarihi,
            valorTarihi: k.valorTarihi
        }));

        const mockSiparis = selectedItems.length > 0 ? {
            id: selectedItems[0].siparisFisiId,
            belgeNo: selectedItems[0].belgeNo
        } : null;

        if (onMultiSelect) {
            onMultiSelect(selectedItems);
        }
        if (onSelect) {
            onSelect(mockSiparis, selectedItems);
        }
    }, [onSelect, onMultiSelect]);

    const resolvedTitle = title || (
        resolvedIslemTuru === 2
            ? t('orders.given_order_lines', 'Verilen Sipariş Satırları')
            : resolvedIslemTuru === 1
                ? t('orders.received_order_lines', 'Alınan Sipariş Satırları')
                : t('orders.modal_title_open_order_lines', 'Açık Sipariş Kalemleri')
    );

    const resolvedSubtitle = subtitle || t('orders.order_line_selection_subtitle', 'Aktarmak istediğiniz sipariş satırlarını seçin.');

    useEffect(() => {
        if (!isOpen || !setHeaderBreadcrumbOptions) return;

        const subTrail = effectiveCariUnvan
            ? [
                { label: effectiveCariUnvan, onClick: onClose },
                { label: resolvedTitle, active: true }
            ]
            : [
                { label: resolvedTitle, active: true }
            ];

        setHeaderBreadcrumbOptions({ subTrail });
    }, [isOpen, effectiveCariUnvan, resolvedTitle, onClose, setHeaderBreadcrumbOptions]);

    if (!isOpen) return null;

    return (
        <BaseSelectionList
            inModal={inModal}
            title={resolvedTitle}
            subtitle={resolvedSubtitle}
            icon={<ShoppingCart size={22} />}
            hideBreadcrumb={true}
            onClose={onClose}
            initialSearchText={effectiveSearchText}
            columns={columns}
            fetchData={handleFetchData}
            searchableFields={siparisSearchFields}
            mobileCardRender={mobileCardRender}
            isMultiSelect={isMultiSelect}
            onSelect={handleConfirmSelection}
            onMultiSelect={handleConfirmSelection}
            confirmButtonText={t('common.transfer', 'Aktar')}
            defaultSortField="tarih"
            defaultSortOrder="desc"
            emptyMessage={t('orders.empty_order_lines_for_party', 'Arama kriterlerine veya seçili cariye uygun sipariş satırı bulunamadı.')}
            {...restProps}
        />
    );
};

export default SiparisSeciciList;
export { SiparisSeciciList as SiparisSeciciModal };
