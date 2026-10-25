/**
 * Webakus ERP - Sıcak Satış & Pazarlık (Teklif) Formu Doğrulama Kuralları (sicakSatisTeklifValidation.ts)
 *
 * Başlıca Sorumlulukları:
 * - Form başlığı (Tarih, Geçerlilik Tarihi, Belge No, Cari) için anlık alan doğrulaması (validateSicakSatisTeklifField)
 * - Çoklu teklif sekmeleri ve sepet kalemleri için toplu doğrulama (validateSicakSatisTeklifForm)
 */

import type {
    SicakSatisTeklifFormData,
    SicakSatisTeklifSecenegiState
} from '../defaults/sicakSatisTeklifDefaultValue';

export const validateSicakSatisTeklifField = (
    field: string,
    formData: SicakSatisTeklifFormData,
    _secenekler: SicakSatisTeklifSecenegiState[] = [],
    otomatikNumaraVerilsinMi = true,
    t: any = (k: any, def: any) => (typeof def === 'string' ? def : k)
): string | null => {
    switch (field) {
        case 'tarih':
            if (!formData?.tarih) {
                return t('sicak_satis.validation.tarih_required', 'Teklif tarihi zorunludur.');
            }
            break;
        case 'belgeNo':
            if (!otomatikNumaraVerilsinMi && (!formData?.belgeNo || formData.belgeNo.trim() === '')) {
                return t('sicak_satis.validation.belge_no_required', 'Teklif belge numarası zorunludur.');
            }
            break;
        case 'cariId':
            if (!formData?.cariId) {
                return t('sicak_satis.validation.cari_required', 'Teklif verilecek müşteri (cari) seçilmelidir.');
            }
            break;
        case 'gecerlilikTarihi':
            if (!formData?.gecerlilikTarihi) {
                return t('sicak_satis.validation.gecerlilik_required', 'Son geçerlilik tarihi zorunludur.');
            }
            if (formData?.tarih && formData.gecerlilikTarihi < formData.tarih) {
                return t(
                    'sicak_satis.validation.gecerlilik_invalid',
                    'Geçerlilik tarihi, teklif tarihinden önce olamaz.'
                );
            }
            break;
        default:
            break;
    }
    return null;
};

export const validateSicakSatisTeklifStep1 = (
    formData: SicakSatisTeklifFormData,
    otomatikNumaraVerilsinMi = true,
    t: any = (k: any, def: any) => (typeof def === 'string' ? def : k)
): Record<string, string> => {
    const errors: Record<string, string> = {};

    const tarihErr = validateSicakSatisTeklifField('tarih', formData, [], otomatikNumaraVerilsinMi, t);
    if (tarihErr) errors.tarih = tarihErr;

    const belgeNoErr = validateSicakSatisTeklifField('belgeNo', formData, [], otomatikNumaraVerilsinMi, t);
    if (belgeNoErr) errors.belgeNo = belgeNoErr;

    const gecerlilikErr = validateSicakSatisTeklifField(
        'gecerlilikTarihi',
        formData,
        [],
        otomatikNumaraVerilsinMi,
        t
    );
    if (gecerlilikErr) errors.gecerlilikTarihi = gecerlilikErr;

    return errors;
};

export const validateSicakSatisTeklifStep2 = (
    secenekler: SicakSatisTeklifSecenegiState[] = [],
    activeSecenek?: SicakSatisTeklifSecenegiState,
    t: any = (k: any, def: any) => (typeof def === 'string' ? def : k)
): string | null => {
    if (!secenekler || secenekler.length === 0) {
        return t('sicak_satis.validation.secenek_required', 'En az bir teklif seçeneği bulunmalıdır.');
    }

    const toplamUrun = secenekler.reduce((acc, s) => acc + (s.kalemler?.length || 0), 0);
    if (toplamUrun === 0) {
        return t('sicak_satis.step1_empty_cart_err', 'Lütfen en az bir teklif seçeneğine ürün ekleyiniz.');
    }

    if (activeSecenek && (!activeSecenek.kalemler || activeSecenek.kalemler.length === 0)) {
        return t(
            'sicak_satis.active_option_empty_err',
            'Seçili {{secenek}} sepetinde ürün bulunmuyor. Lütfen ürün ekleyiniz.',
            { secenek: activeSecenek.secenekAdi || '' }
        );
    }

    for (const sec of secenekler) {
        for (const k of sec.kalemler) {
            if (Number(k.miktar) <= 0) {
                return t(
                    'sicak_satis.validation.miktar_invalid',
                    '{{secenek}} içindeki {{urun}} miktarı 0’dan büyük olmalıdır.',
                    { secenek: sec.secenekAdi, urun: k.urunAdi }
                );
            }
            if (Number(k.teklifBirimFiyati) < 0) {
                return t(
                    'sicak_satis.validation.fiyat_invalid',
                    '{{secenek}} içindeki {{urun}} fiyatı negatif olamaz.',
                    { secenek: sec.secenekAdi, urun: k.urunAdi }
                );
            }
        }
    }

    return null;
};

export const validateSicakSatisTeklifStep3 = (
    formData: SicakSatisTeklifFormData,
    t: any = (k: any, def: any) => (typeof def === 'string' ? def : k)
): Record<string, string> => {
    const errors: Record<string, string> = {};

    const cariErr = validateSicakSatisTeklifField('cariId', formData, [], true, t);
    if (cariErr) errors.cariId = cariErr;

    return errors;
};

export const validateSicakSatisTeklifForm = (
    formData: SicakSatisTeklifFormData,
    secenekler: SicakSatisTeklifSecenegiState[] = [],
    otomatikNumaraVerilsinMi = true,
    t: any = (k: any, def: any) => (typeof def === 'string' ? def : k)
): Record<string, string> => {
    const errors: Record<string, string> = {};

    const step1Errors = validateSicakSatisTeklifStep1(formData, otomatikNumaraVerilsinMi, t);
    Object.assign(errors, step1Errors);

    const step3Errors = validateSicakSatisTeklifStep3(formData, t);
    Object.assign(errors, step3Errors);

    const step2Err = validateSicakSatisTeklifStep2(secenekler, undefined, t);
    if (step2Err) {
        errors.kalemler = step2Err;
    }

    return errors;
};

