import { BaseDto } from '../types';

export interface SicakSatisPosTaksitDto {
    taksitSayisi: number;
    aciklama: string;
    bankaKesintiOrani: number;
    musteriVadeFarkiOrani: number;
    vadeGunu: number;
}

export interface SicakSatisPosCihazDto {
    posCihazId: number;
    posCihazAdi: string;
    bankaId: number;
    bankaAdi: string;
    taksitler: SicakSatisPosTaksitDto[];
}

export interface SicakSatisBaglamDto {
    otomatikNumaraVerilsinMi: boolean;
    varsayilanGecerlilikGunu: number;
    kritikKarOrani: number;
    hedefKarOrani: number;
    yuksekKarOrani: number;
    posCihazlari: SicakSatisPosCihazDto[];
}

export interface SicakSatisUrunMaliyetDto {
    urunId: number;
    urunKodu: string;
    urunAdi: string;
    barkod?: string;
    birimAdi: string;
    kdvOrani: number;
    listeSatisFiyatiKdvDahil: number;
    birimAlisMaliyetiKdvHaric: number;
    alisMaliyetKaynagi: 'AlisFiyatListesi' | 'UrunKarti' | string;
    birimBshFiyatFarki: number;
    satilabilirStokMiktari: number;
    toplamDepoMiktari: number;
    anaResimUrl?: string;
}

export interface SatisBelgeleriDto extends BaseDto {
    belgeNo: string;
    belgeTuru: number;
    belgeTuruAdi: string;
    islemTuru: number;
    islemTuruAdi: string;
    cariId?: number | null;
    cariUnvan?: string | null;
    tarih: string;
    gecerlilikTarihi?: string | null;
    aciklama?: string | null;
    genelToplam?: number | null;
    paraBirimi: string;
    secilenTeklifSecenegiId?: number | null;
    teklifSecenekleri?: any[];
    kalemler?: any[];
}

export interface SatisBelgeleriCreateDto extends Omit<SatisBelgeleriDto, 'id' | 'olusturulmaTarihi' | 'guncellenmeTarihi' | 'silindiMi'> {
    [key: string]: any;
}

export interface SatisBelgeleriUpdateDto extends Partial<SatisBelgeleriCreateDto> {
    id: number;
}
