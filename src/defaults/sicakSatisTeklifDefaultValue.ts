/**
 * Webakus ERP - Sıcak Satış & Pazarlık (Teklif) Formu Varsayılan Değerleri (sicakSatisTeklifDefaultValue.ts)
 *
 * Başlıca Sorumlulukları:
 * - Yeni sıcak satış teklif belgesi açılışında veya mevcut bir teklif düzenlenirken
 *   form başlık bilgilerini ve sekmeli teklif alternatiflerini (SatisTeklifSecenegi) hazırlar.
 */

export interface SicakSatisSepetKalemi {
    id: string;
    dbId?: number;
    urunVeHizmetKartiId: number;
    urunKodu: string;
    urunAdi: string;
    barkod?: string;
    birimAdi: string;
    miktar: number;
    kdvOrani: number;
    listeFiyati: number; // KDV Dahil Birim Liste Fiyatı
    perakendeFiyat?: number; // KDV Dahil Perakende Satış Fiyatı (listeFiyati ile senkron)
    teklifBirimFiyati: number; // KDV Dahil Pazarlıklı Birim Fiyat
    iskontoOrani: number;
    iskontoTutari: number;
    satirToplam: number; // miktar * teklifBirimFiyati
    birimAlisMaliyeti: number; // KDV Hariç Birim Alış Maliyeti
    alisMaliyetKaynagi?: string;
    birimBshFiyatFarki: number; // Ürün başına BSH Fiyat Farkı Desteği
    satilabilirStokMiktari: number;
    toplamDepoMiktari: number;
    anaResimUrl?: string;
}

export interface SicakSatisTeklifSecenegiState {
    id: string;
    dbId?: number;
    secenekAdi: string;
    siraNo: number;
    kalemler: SicakSatisSepetKalemi[];
    uygulananKampanyaId?: number | null;
    uygulananKampanyaAdi?: string | null;
    kampanyaIndirimTutari: number;
    kampanyaFirmaHakEdisTutari: number;
    ekPazarlikIndirimTutari: number;
    hedefNetTutarInput: string;
    odemeTuru: number; // 1: Nakit/Havale, 2: Kredi Kartı, 3: Tüketici Kredisi
    secilenPosCihazId?: number | null;
    secilenPosCihazAdi?: string | null;
    secilenTaksitSayisi: number;
    musteriVadeFarkiOrani: number;
    bankaKesintiOrani: number;
}

export interface SicakSatisTeklifFormData {
    id?: number;
    belgeNo: string;
    tarih: string;
    gecerlilikTarihi: string;
    cariId: string;
    cariMetni: string;
    aciklama: string;
    siparisNotu: string;
    paraBirimi: string;
    teslimAlacakKisi: string;
    nakliyeTelefon: string;
    sevkAdresMetni: string;
    faturaUnvan: string;
    vergiDairesi: string;
    vergiNo: string;
    faturaAdresMetni: string;
}

export function createEmptyTeklifSecenegi(siraNo: number, labelPrefix = 'Seçenek'): SicakSatisTeklifSecenegiState {
    return {
        id: `secenek_${Date.now()}_${siraNo}_${Math.random().toString(36).substring(2, 6)}`,
        secenekAdi: `${labelPrefix} ${siraNo}`,
        siraNo,
        kalemler: [],
        uygulananKampanyaId: null,
        uygulananKampanyaAdi: null,
        kampanyaIndirimTutari: 0,
        kampanyaFirmaHakEdisTutari: 0,
        ekPazarlikIndirimTutari: 0,
        hedefNetTutarInput: '',
        odemeTuru: 2, // Varsayılan Kredi Kartı / POS Simülasyonu açık
        secilenPosCihazId: null,
        secilenPosCihazAdi: null,
        secilenTaksitSayisi: 1,
        musteriVadeFarkiOrani: 0,
        bankaKesintiOrani: 0
    };
}

export function getSicakSatisTeklifDefaultValues(initialData?: any, defaultGecerlilikGunu = 7): {
    formData: SicakSatisTeklifFormData;
    secenekler: SicakSatisTeklifSecenegiState[];
} {
    const todayDate = new Date();
    const today = todayDate.toISOString().split('T')[0];

    const validUntilDate = new Date(todayDate);
    validUntilDate.setDate(validUntilDate.getDate() + defaultGecerlilikGunu);
    const defaultValidUntil = validUntilDate.toISOString().split('T')[0];

    const formData: SicakSatisTeklifFormData = {
        id: initialData?.id,
        belgeNo: initialData?.belgeNo || '',
        tarih: initialData?.tarih ? initialData.tarih.split('T')[0] : today,
        gecerlilikTarihi: initialData?.gecerlilikTarihi ? initialData.gecerlilikTarihi.split('T')[0] : defaultValidUntil,
        cariId: initialData?.cariId ? String(initialData.cariId) : '',
        cariMetni: initialData?.cariUnvan || initialData?.faturaUnvan || '',
        aciklama: initialData?.aciklama || '',
        siparisNotu: initialData?.siparisNotu || '',
        paraBirimi: initialData?.paraBirimi || 'TRY',
        teslimAlacakKisi: initialData?.teslimAlacakKisi || '',
        nakliyeTelefon: initialData?.nakliyeTelefon || '',
        sevkAdresMetni: initialData?.sevkAdresMetni || '',
        faturaUnvan: initialData?.faturaUnvan || initialData?.cariUnvan || '',
        vergiDairesi: initialData?.vergiDairesi || '',
        vergiNo: initialData?.vergiNo || '',
        faturaAdresMetni: initialData?.faturaAdresMetni || ''
    };

    if (initialData?.teklifSecenekleri && initialData.teklifSecenekleri.length > 0) {
        const secenekler: SicakSatisTeklifSecenegiState[] = initialData.teklifSecenekleri.map((ts: any, idx: number) => ({
            id: `secenek_db_${ts.id || idx}`,
            dbId: ts.id,
            secenekAdi: ts.secenekAdi || `Seçenek ${idx + 1}`,
            siraNo: ts.siraNo || idx + 1,
            uygulananKampanyaId: ts.uygulananKampanyaId || null,
            uygulananKampanyaAdi: ts.uygulananKampanyaAdi || null,
            kampanyaIndirimTutari: Number(ts.kampanyaIndirimTutari || 0),
            kampanyaFirmaHakEdisTutari: Number(ts.kampanyaFirmaHakEdisTutari || 0),
            ekPazarlikIndirimTutari: Number(ts.ekPazarlikIndirimTutari || 0),
            hedefNetTutarInput: ts.netSatisToplam ? String(ts.netSatisToplam) : '',
            odemeTuru: Number(ts.odemeTuru || 2),
            secilenPosCihazId: ts.secilenPosCihazId || null,
            secilenPosCihazAdi: ts.secilenPosCihazAdi || null,
            secilenTaksitSayisi: Number(ts.secilenTaksitSayisi || 1),
            musteriVadeFarkiOrani: Number(ts.musteriVadeFarkiOrani || 0),
            bankaKesintiOrani: Number(ts.bankaKesintiOrani || 0),
            kalemler: (ts.kalemler || []).map((k: any, kIdx: number) => {
                const miktar = Number(k.miktar || 1);
                const listeFiyati = Number(k.listeFiyati || 0);
                const kdvDahilTutar = Number(k.kdvDahilTutar ?? miktar * listeFiyati);
                const teklifBirimFiyati = miktar > 0 ? Number((kdvDahilTutar / miktar).toFixed(2)) : listeFiyati;
                const iskontoTutari = Math.max(0, miktar * listeFiyati - kdvDahilTutar);
                const iskontoOrani = miktar * listeFiyati > 0 ? Number(((iskontoTutari / (miktar * listeFiyati)) * 100).toFixed(2)) : 0;

                return {
                    id: `kalem_db_${k.id || kIdx}`,
                    dbId: k.id,
                    urunVeHizmetKartiId: Number(k.urunVeHizmetKartiId),
                    urunKodu: k.urunVeHizmetKodu || '',
                    urunAdi: k.urunVeHizmetAdi || '',
                    barkod: k.barkod || '',
                    birimAdi: k.birimAdi || 'Adet',
                    miktar,
                    kdvOrani: Number(k.kdvOrani || 20),
                    listeFiyati,
                    teklifBirimFiyati,
                    iskontoOrani,
                    iskontoTutari,
                    satirToplam: kdvDahilTutar,
                    birimAlisMaliyeti: Number(k.birimAlisMaliyeti || 0),
                    birimBshFiyatFarki: Number(k.birimBshFiyatFarki || 0),
                    satilabilirStokMiktari: 0,
                    toplamDepoMiktari: 0
                };
            })
        }));

        return { formData, secenekler };
    }

    // Geriye dönük uyumluluk: Eski tip tekli kalemli bir teklif açılırsa
    if (initialData?.kalemler && initialData.kalemler.length > 0) {
        const ilkSecenek = createEmptyTeklifSecenegi(1);
        ilkSecenek.kalemler = initialData.kalemler.map((k: any, kIdx: number) => {
            const miktar = Number(k.miktar || 1);
            const listeFiyati = Number(k.listeFiyati || 0);
            const kdvDahilTutar = Number(k.kdvDahilTutar ?? miktar * listeFiyati);
            const teklifBirimFiyati = miktar > 0 ? Number((kdvDahilTutar / miktar).toFixed(2)) : listeFiyati;
            const iskontoTutari = Math.max(0, miktar * listeFiyati - kdvDahilTutar);
            const iskontoOrani = miktar * listeFiyati > 0 ? Number(((iskontoTutari / (miktar * listeFiyati)) * 100).toFixed(2)) : 0;

            return {
                id: `kalem_legacy_${k.id || kIdx}`,
                dbId: k.id,
                urunVeHizmetKartiId: Number(k.urunVeHizmetKartiId),
                urunKodu: k.urunVeHizmetKodu || '',
                urunAdi: k.urunVeHizmetAdi || '',
                barkod: k.barkod || '',
                birimAdi: k.birimAdi || 'Adet',
                miktar,
                kdvOrani: Number(k.kdvOrani || 20),
                listeFiyati,
                teklifBirimFiyati,
                iskontoOrani,
                iskontoTutari,
                satirToplam: kdvDahilTutar,
                birimAlisMaliyeti: Number(k.birimAlisMaliyeti || 0),
                birimBshFiyatFarki: Number(k.birimBshFiyatFarki || 0),
                satilabilirStokMiktari: 0,
                toplamDepoMiktari: 0
            };
        });
        return { formData, secenekler: [ilkSecenek] };
    }

    return {
        formData,
        secenekler: [createEmptyTeklifSecenegi(1)]
    };
}
