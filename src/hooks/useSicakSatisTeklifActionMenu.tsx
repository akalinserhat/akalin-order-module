/**
 * @file useSicakSatisTeklifActionMenu.tsx
 * @description Sıcak Satış & Pazarlık (Teklif) Ekranı ActionMenu ve dinamik başlık aksiyonları hook'u.
 *
 * Sorumluluklar:
 * - Aktif başlık sekmesine göre (Genel/Not vs Teslimat/Fatura Adresi) ActionMenu tetikleyicisini dinamik olarak yönetmek:
 *   - Teslimat (2) veya Fatura (3) sekmesinde: Bölünmüş buton olarak `[ 📍 Adres Seçimi | ⋮ ]` rozetini ve adres seçim menüsünü sunmak.
 *   - Genel (1) veya Not (4) sekmesinde: Varsayılan Kaydet / Para Birimi rozetini korumak.
 * - Sağ üst ActionMenu içerisine Kampanya Analizi ve Aktif Seçeneği Kopyalama (Klonlama) aksiyonlarını bağlamak.
 * - Cari Kayıtlı Adresleri (`CariAdresSecici`) ve Merkezi Adres Rehberi (`AdresSeciciModal`) modallarını render etmek.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { MapPin, Building2, Sparkles, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
    CariAdresSecici,
    type CariAdresItem,
    AdresSeciciModal,
    type AdresSeciciFormResult,
    ModulTanitimModal,
    useModulGate
} from '@akalin/ui';
import type { SicakSatisTeklifFormData } from '../defaults/sicakSatisTeklifDefaultValue';

export interface UseSicakSatisTeklifActionMenuProps {
    activeHeaderTab: string | number; // 1: Genel, 2: Teslimat/Sevk, 3: Fatura, 4: Not
    formData: SicakSatisTeklifFormData;
    onAddressChange: (field: string, value: any) => void;
    onCloneActiveOption: () => void;
    onOpenCampaignModal: () => void;
    applicableCampaignCount: number;
}

export const useSicakSatisTeklifActionMenu = ({
    activeHeaderTab,
    formData,
    onAddressChange,
    onCloneActiveOption,
    onOpenCampaignModal,
    applicableCampaignCount
}: UseSicakSatisTeklifActionMenuProps) => {
    const { t } = useTranslation();
    const [isCariAdresModalOpen, setIsCariAdresModalOpen] = useState(false);
    const [isAdresRehberiOpen, setIsAdresRehberiOpen] = useState(false);
    const { requireModule, isModalOpen: isPromoOpen, closeModal: closePromo } = useModulGate('MOD_ADRES');

    const isAddressTab = activeHeaderTab === 2 || activeHeaderTab === 3;
    const addressTabType: 'nakliye' | 'fatura' | null =
        activeHeaderTab === 2 ? 'nakliye' : activeHeaderTab === 3 ? 'fatura' : null;

    const openCariAdresModal = useCallback(() => {
        if (!formData?.cariId) {
            toast.error(t('CariAdresSecici_cariSeciniz', 'Lütfen önce bir cari seçiniz.'), { icon: '⚠️' });
            return;
        }
        setIsCariAdresModalOpen(true);
    }, [formData?.cariId, t]);

    const openMerkeziAdresModal = useCallback(() => {
        requireModule(() => {
            setIsAdresRehberiOpen(true);
        });
    }, [requireModule]);

    const handleCariAdresSelect = useCallback(
        (adres: CariAdresItem) => {
            const fullText = adres.acikAdres || adres.formattedAdres || adres.baslik || '';
            if (addressTabType === 'nakliye') {
                onAddressChange('sevkAdresMetni', fullText);
            } else if (addressTabType === 'fatura') {
                onAddressChange('faturaAdresMetni', fullText);
                if (adres.unvan) onAddressChange('faturaUnvan', adres.unvan);
                if (adres.vergiDairesi) onAddressChange('vergiDairesi', adres.vergiDairesi);
                if (adres.vergiNo) onAddressChange('vergiNo', adres.vergiNo);
            }
            setIsCariAdresModalOpen(false);
            toast.success(t('siparis_adres_aktarildi', 'Adres başarıyla aktarıldı.'));
        },
        [addressTabType, onAddressChange, t]
    );

    const handleRehberAdresSelect = useCallback(
        (adres: AdresSeciciFormResult) => {
            const fullText = adres.formattedAdres || '';
            if (addressTabType === 'nakliye') {
                onAddressChange('sevkAdresMetni', fullText);
            } else if (addressTabType === 'fatura') {
                onAddressChange('faturaAdresMetni', fullText);
            }
            setIsAdresRehberiOpen(false);
            toast.success(t('siparis_rehber_adres_aktarildi', 'Adres rehberden aktarıldı.'));
        },
        [addressTabType, onAddressChange, t]
    );

    const actionMenuTrigger = useMemo(() => {
        if (!isAddressTab) return undefined;
        return (
            <span className="action-menu-address-badge" title={t('auto_adres_secimi', 'Adres Seçimi')}>
                <MapPin size={13} className="shrink-0" />
                <span>{t('auto_adres_secimi', 'Adres Seçimi')}</span>
            </span>
        );
    }, [isAddressTab, t]);

    const actionMenuDropdownHeader = useMemo(() => {
        if (!isAddressTab) return undefined;
        return (
            <div className="action-menu-address-dropdown-header">
                <div className="flex items-center gap-6 text-xs font-semibold text-secondary">
                    <MapPin size={14} className="text-primary" />
                    <span>
                        {addressTabType === 'nakliye'
                            ? t('auto_nakliye_adresi_secimi', 'Nakliye / Teslimat Adresi')
                            : t('auto_fatura_adresi_secimi', 'Fatura Adresi')}
                    </span>
                </div>
            </div>
        );
    }, [isAddressTab, addressTabType, t]);

    const extraDropdownActions = useMemo(() => {
        const baseActions = [
            {
                label:
                    applicableCampaignCount > 0
                        ? t('sicak_satis.campaigns_count', 'Kampanyalar ({{count}} Uygulanabilir)', {
                              count: applicableCampaignCount
                          })
                        : t('sicak_satis.campaigns_and_deals', 'Kampanyalar ve Fırsatlar'),
                icon: <Sparkles size={16} />,
                onClick: onOpenCampaignModal
            },
            {
                label: t('sicak_satis.clone_active_option', 'Aktif Seçeneği Kopyala (Klonla)'),
                icon: <Copy size={16} />,
                onClick: onCloneActiveOption
            }
        ];

        if (!isAddressTab) {
            return baseActions;
        }

        const addressActions = [
            {
                label:
                    addressTabType === 'nakliye'
                        ? t('auto_cari_nakliye_adresleri', 'Cari Nakliye Adreslerinden Seç')
                        : t('auto_cari_fatura_adresleri', 'Cari Fatura Adreslerinden Seç'),
                icon: <MapPin size={16} />,
                onClick: openCariAdresModal
            },
            {
                label: t('auto_merkezi_adres_rehberi', 'Merkezi Adres Rehberinden Seç'),
                icon: <Building2 size={16} />,
                onClick: openMerkeziAdresModal
            }
        ];

        return [...addressActions, ...baseActions];
    }, [
        isAddressTab,
        addressTabType,
        applicableCampaignCount,
        onOpenCampaignModal,
        onCloneActiveOption,
        openCariAdresModal,
        openMerkeziAdresModal,
        t
    ]);

    const renderAddressModals = useCallback(
        () => (
            <>
                {isCariAdresModalOpen && (
                    <CariAdresSecici
                        isOpen={isCariAdresModalOpen}
                        onClose={() => setIsCariAdresModalOpen(false)}
                        cariId={formData?.cariId}
                        adresTipi={addressTabType === 'nakliye' ? 2 : 1}
                        onSelect={handleCariAdresSelect}
                    />
                )}
                {isAdresRehberiOpen && (
                    <AdresSeciciModal
                        isOpen={isAdresRehberiOpen}
                        onClose={() => setIsAdresRehberiOpen(false)}
                        onSave={handleRehberAdresSelect}
                    />
                )}
                <ModulTanitimModal
                    isOpen={isPromoOpen}
                    onClose={closePromo}
                    modulKodu="MOD_ADRES"
                />
            </>
        ),
        [
            isCariAdresModalOpen,
            isAdresRehberiOpen,
            formData?.cariId,
            addressTabType,
            handleCariAdresSelect,
            handleRehberAdresSelect,
            isPromoOpen,
            closePromo
        ]
    );

    return {
        actionMenuTrigger,
        actionMenuDropdownHeader,
        onActionMenuTriggerClick: isAddressTab ? openCariAdresModal : undefined,
        extraDropdownActions,
        renderAddressModals
    };
};

export default useSicakSatisTeklifActionMenu;
