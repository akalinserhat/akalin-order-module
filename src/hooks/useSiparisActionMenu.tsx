/**
 * @file useSiparisActionMenu.tsx
 * @description Sipariş Fişi ActionMenu ve dinamik başlık aksiyonları mimarisi.
 * 
 * Sorumluluklar:
 * - Aktif sekmeye göre (Genel vs Nakliye Adresi / Fatura Adresi) ActionMenu tetikleyicisini dinamik olarak yönetmek:
 *   - Genel veya Not sekmesinde: Para birimi rozetini ve döviz seçimini sunmak.
 *   - Nakliye Adresi veya Fatura Adresi sekmesinde: Para birimi yerine "Adres Seçimi" rozetini ve adres seçim menüsünü sunmak.
 * - Seçilen adres tipine göre Cari Kayıtlı Adresleri (`CariAdresSeciciModal`) ve Merkezi Adres Rehberi (`AdresSeciciModal`)
 *   modallarını yönetmek ve seçilen adresi form state'ine aktarmak.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { MapPin, Building2 } from 'lucide-react';
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
import type { SiparisFormData } from '../components/SiparisForm';

export interface UseSiparisActionMenuProps {
    activeTab: number; // 1: Genel, 2: Nakliye Adresi, 3: Fatura Adresi, 4: Not
    formData: SiparisFormData;
    onAddressChange: (field: string, value: any) => void;
    extraDropdownActions?: any[];
}

export interface UseSiparisActionMenuReturn {
    actionMenuTrigger?: React.ReactNode;
    actionMenuDropdownHeader?: React.ReactNode;
    onActionMenuTriggerClick?: (e: React.MouseEvent) => void;
    extraDropdownActions: any[];
    isAddressTab: boolean;
    addressTabType: 'nakliye' | 'fatura' | null;
    openCariAdresModal: () => void;
    openMerkeziAdresModal: () => void;
    renderAddressModals: () => React.ReactNode;
}

export const useSiparisActionMenu = ({
    activeTab,
    formData,
    onAddressChange,
    extraDropdownActions
}: UseSiparisActionMenuProps): UseSiparisActionMenuReturn => {
    const { t } = useTranslation();
    const [isCariAdresModalOpen, setIsCariAdresModalOpen] = useState(false);
    const [isAdresRehberiOpen, setIsAdresRehberiOpen] = useState(false);
    const { requireModule, isModalOpen: isPromoOpen, closeModal: closePromo } = useModulGate('MOD_ADRES');

    const isAddressTab = activeTab === 2 || activeTab === 3;
    const addressTabType: 'nakliye' | 'fatura' | null = activeTab === 2 ? 'nakliye' : activeTab === 3 ? 'fatura' : null;

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

    const handleCariAdresSelect = useCallback((adres: CariAdresItem) => {
        const fullText = adres.acikAdres || adres.formattedAdres || adres.baslik || '';
        if (addressTabType === 'nakliye') {
            onAddressChange('nakliyeAdres', fullText);
            if (adres.ilId !== undefined && adres.ilId !== null) onAddressChange('nakliyeIlId', adres.ilId);
            if (adres.ilceId !== undefined && adres.ilceId !== null) onAddressChange('nakliyeIlceId', adres.ilceId);
            if (adres.ilAdi) onAddressChange('nakliyeIlAdi', adres.ilAdi);
            if (adres.ilceAdi) onAddressChange('nakliyeIlceAdi', adres.ilceAdi);
        } else if (addressTabType === 'fatura') {
            onAddressChange('faturaAdres', fullText);
            if (adres.ilId !== undefined && adres.ilId !== null) onAddressChange('faturaIlId', adres.ilId);
            if (adres.ilceId !== undefined && adres.ilceId !== null) onAddressChange('faturaIlceId', adres.ilceId);
            if (adres.ilAdi) onAddressChange('faturaIlAdi', adres.ilAdi);
            if (adres.ilceAdi) onAddressChange('faturaIlceAdi', adres.ilceAdi);
            if (adres.unvan) onAddressChange('faturaUnvan', adres.unvan);
            if (adres.vergiDairesi) onAddressChange('vergiDairesi', adres.vergiDairesi);
            if (adres.vergiNo) onAddressChange('vergiNo', adres.vergiNo);
        }
        setIsCariAdresModalOpen(false);
        toast.success(t('siparis_adres_aktarildi', 'Adres başarıyla aktarıldı.'));
    }, [addressTabType, onAddressChange, t]);

    const handleRehberAdresSelect = useCallback((adres: AdresSeciciFormResult) => {
        const fullText = adres.formattedAdres || '';
        const ilId = adres.ids?.adresIlId ?? null;
        const ilceId = adres.ids?.adresIlceId ?? null;
        const ilAdi = adres.parts?.il ?? null;
        const ilceAdi = adres.parts?.ilce ?? null;

        if (addressTabType === 'nakliye') {
            onAddressChange('nakliyeAdres', fullText);
            if (ilId !== null) onAddressChange('nakliyeIlId', ilId);
            if (ilceId !== null) onAddressChange('nakliyeIlceId', ilceId);
            if (ilAdi !== null) onAddressChange('nakliyeIlAdi', ilAdi);
            if (ilceAdi !== null) onAddressChange('nakliyeIlceAdi', ilceAdi);
        } else if (addressTabType === 'fatura') {
            onAddressChange('faturaAdres', fullText);
            if (ilId !== null) onAddressChange('faturaIlId', ilId);
            if (ilceId !== null) onAddressChange('faturaIlceId', ilceId);
            if (ilAdi !== null) onAddressChange('faturaIlAdi', ilAdi);
            if (ilceAdi !== null) onAddressChange('faturaIlceAdi', ilceAdi);
        }
        setIsAdresRehberiOpen(false);
        toast.success(t('siparis_rehber_adres_aktarildi', 'Adres rehberden aktarıldı.'));
    }, [addressTabType, onAddressChange, t]);

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

    const dropdownActions = useMemo(() => {
        if (!isAddressTab) {
            return extraDropdownActions || [];
        }

        const addressActions = [
            {
                label: addressTabType === 'nakliye' 
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

        return [...addressActions, ...(extraDropdownActions || [])];
    }, [isAddressTab, addressTabType, extraDropdownActions, openCariAdresModal, openMerkeziAdresModal, t]);

    const renderAddressModals = useCallback(() => (
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
    ), [isCariAdresModalOpen, isAdresRehberiOpen, formData?.cariId, addressTabType, handleCariAdresSelect, handleRehberAdresSelect, isPromoOpen, closePromo]);

    return {
        actionMenuTrigger,
        actionMenuDropdownHeader,
        onActionMenuTriggerClick: isAddressTab ? openCariAdresModal : undefined,
        extraDropdownActions: dropdownActions,
        isAddressTab,
        addressTabType,
        openCariAdresModal,
        openMerkeziAdresModal,
        renderAddressModals
    };
};

export default useSiparisActionMenu;
