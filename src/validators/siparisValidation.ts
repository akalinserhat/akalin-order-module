/**
 * Webakus - Sipariş Yönetimi / Sipariş Formu Doğrulama Kuralları (siparisValidation.ts)
 * 
 * Başlıca Sorumlulukları:
 * - Sipariş başlığı ve satırları için anlık alan doğrulaması (validateSiparisField)
 * - Form kaydetme öncesi genel form doğrulaması (validateSiparisForm)
 */

export interface SiparisValidationResult {
    isValid: boolean;
    errors: Record<string, string>;
}

export const validateSiparisField = (
    name: string,
    value: any,
    formData?: any,
    t: (key: string, defaultValue?: string) => string = (k, def) => def || k
): string | null => {
    switch (name) {
        case 'cariId':
            if (!value && !formData?.cariMetni) {
                return t('validation.required_field', 'Bu alan zorunludur.');
            }
            break;
        case 'tarih':
            if (!value) {
                return t('validation.required_field', 'Bu alan zorunludur.');
            }
            break;
        case 'belgeNo':
            if (!value || (typeof value === 'string' && value.trim() === '')) {
                return t('validation.required_field', 'Bu alan zorunludur.');
            }
            break;
        default:
            break;
    }
    return null;
};

export const validateSiparisForm = (
    formData: any,
    kalemler: any[] = [],
    t: (key: string, defaultValue?: string) => string = (k, def) => def || k,
    isIade: boolean = false
): SiparisValidationResult => {
    const errors: Record<string, string> = {};

    if (!formData?.cariId && !formData?.cariMetni) {
        errors.cariId = t('validation.required_field', 'Cari seçimi zorunludur.');
    }

    if (!formData?.tarih) {
        errors.tarih = t('validation.required_field', 'Belge tarihi zorunludur.');
    }

    const gecerliKalemler = (kalemler || []).filter(k => k.urunVeHizmetKartiId || k.aramaMetni || k.koduAramaMetni || k.siparisAramaMetni);

    if (gecerliKalemler.length === 0) {
        errors.genel = t('orders.validation_empty_items', 'En az bir sipariş satırı eklemelisiniz.');
    } else {
        if (isIade) {
            const unlinkedReturnRow = gecerliKalemler.some(k => !k.urunVeHizmetKartiId || (!k.kaynakSiparisKalemiId && !k.existingSavedRow));
            if (unlinkedReturnRow) {
                errors.genel = t('orders.validation_return_must_select_order_line', 'İade fişlerinde satırlar yalnızca cariye ait sipariş fişlerinden seçilmelidir.');
                return {
                    isValid: false,
                    errors
                };
            }
        }

        const rowError = gecerliKalemler.some(k => !k.urunVeHizmetKartiId || Number(k.miktar) <= 0 || Number(k.listeFiyati) < 0);
        if (rowError) {
            errors.genel = t('orders.validation_invalid_rows', 'Lütfen tüm sipariş satırlarında geçerli ürün, miktar ve fiyat giriniz.');
        }

        const missingRequiredFields = gecerliKalemler.some(k => !k.depoId || !k.kargoFirmasiId || !k.teslimTarihi);
        if (missingRequiredFields) {
            errors.genel = t('orders.validation_missing_details', 'Sipariş satırlarındaki Depo, Nakliye Firması ve Teslim Tarihi alanları boş bırakılamaz.');
        }
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};
