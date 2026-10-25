/**
 * Webakus ERP - Sipariş Formu Varsayılan Değerleri (siparisDefaultValue.ts)
 * 
 * Başlıca Sorumlulukları:
 * - Yeni sipariş belgesi açılışında form alanlarının başlangıç değerlerini ve tipine (Alınan/Verilen/İade)
 *   göre varsayılan ayarlarını belirler.
 */

export interface SiparisDefaultValuesOptions {
    tip?: string;
    initialData?: any;
    defaultCurrency?: string;
}

export function getSiparisDefaultValues(options: SiparisDefaultValuesOptions = {}) {
    const { initialData, defaultCurrency = 'TRY' } = options;

    const today = new Date().toISOString().split('T')[0];

    return {
        id: initialData?.id,
        cariId: initialData?.cariId ? String(initialData.cariId) : '',
        cariMetni: initialData?.cariMetni || initialData?.cariUnvan || '',
        belgeNo: initialData?.belgeNo || '',
        tarih: initialData?.tarih ? initialData.tarih.split('T')[0] : today,
        gecerlilikTarihi: initialData?.gecerlilikTarihi ? initialData.gecerlilikTarihi.split('T')[0] : '',
        aciklama: initialData?.aciklama || '',
        disSistemId: initialData?.disSistemId || '',
        teslimAlacakKisi: initialData?.teslimAlacakKisi || '',
        nakliyeTelefon: initialData?.nakliyeTelefon || '',
        nakliyeAdres: initialData?.nakliyeAdres || initialData?.sevkAdresMetni || '',
        nakliyeIlId: initialData?.nakliyeIlId || initialData?.sevkIlId || null,
        nakliyeIlceId: initialData?.nakliyeIlceId || initialData?.sevkIlceId || null,
        nakliyeIlAdi: initialData?.nakliyeIlAdi || initialData?.sevkIlAdi || null,
        nakliyeIlceAdi: initialData?.nakliyeIlceAdi || initialData?.sevkIlceAdi || null,
        nakliyeAdresIds: initialData?.nakliyeAdresIds || (initialData?.sevkAdresiId ? { genelAdresId: initialData.sevkAdresiId } : null),
        faturaUnvan: initialData?.faturaUnvan || '',
        vergiDairesi: initialData?.vergiDairesi || '',
        vergiNo: initialData?.vergiNo || '',
        faturaAdres: initialData?.faturaAdres || initialData?.faturaAdresMetni || '',
        faturaIlId: initialData?.faturaIlId || null,
        faturaIlceId: initialData?.faturaIlceId || null,
        faturaIlAdi: initialData?.faturaIlAdi || null,
        faturaIlceAdi: initialData?.faturaIlceAdi || null,
        faturaAdresIds: initialData?.faturaAdresIds || (initialData?.faturaAdresiId ? { genelAdresId: initialData.faturaAdresiId } : null),
        siparisNotu: initialData?.siparisNotu || '',
        paraBirimi: initialData?.paraBirimi || defaultCurrency
    };
}
