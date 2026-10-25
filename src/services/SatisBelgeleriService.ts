import { BaseService } from './BaseService';
import httpClient from './httpClient';
import {
    SatisBelgeleriDto,
    SatisBelgeleriCreateDto,
    SatisBelgeleriUpdateDto,
    SicakSatisBaglamDto,
    SicakSatisUrunMaliyetDto
} from '../dtos/SatisBelgeleriDto';

class SatisBelgeleriService extends BaseService<SatisBelgeleriDto, SatisBelgeleriCreateDto, SatisBelgeleriUpdateDto> {
    constructor() {
        super('/api/SatisBelgeleri');
    }

    async getSicakSatisBaglami(): Promise<SicakSatisBaglamDto> {
        const res = await httpClient.get<SicakSatisBaglamDto>('/api/SatisBelgeleri/sicak-satis-baglami');
        return res.data;
    }

    async urunMaliyetAnaliz(urunIds: number[], tarih?: string, cariId?: number | null): Promise<SicakSatisUrunMaliyetDto[]> {
        const res = await httpClient.post<SicakSatisUrunMaliyetDto[]>('/api/SatisBelgeleri/urun-maliyet-analiz', {
            urunIds,
            tarih: tarih || null,
            cariId: cariId || null
        });
        return res.data;
    }

    async getUrunMaliyetAnaliz(urunIds: number[], tarih?: string, cariId?: number | null): Promise<SicakSatisUrunMaliyetDto[]> {
        return this.urunMaliyetAnaliz(urunIds, tarih, cariId);
    }

    async teklifOlustur(payload: any): Promise<SatisBelgeleriDto> {
        const res = await httpClient.post<SatisBelgeleriDto>('/api/SatisBelgeleri/teklif', payload);
        return res.data;
    }

    async createTeklif(payload: any): Promise<SatisBelgeleriDto> {
        return this.teklifOlustur(payload);
    }

    async updateTeklif(id: number, payload: any): Promise<SatisBelgeleriDto> {
        const res = await httpClient.put<SatisBelgeleriDto>(`/api/SatisBelgeleri/${id}`, payload);
        return res.data;
    }

    async teklifSecenegiOnayla(belgeId: number, secenekId: number): Promise<any> {
        const res = await httpClient.post<any>(`/api/SatisBelgeleri/${belgeId}/teklif-secenegi-onayla/${secenekId}`);
        return res.data;
    }

    async onaylaTeklifSecenegi(belgeId: number, secenekId: number): Promise<any> {
        return this.teklifSecenegiOnayla(belgeId, secenekId);
    }
}

export const satisBelgeleriService = new SatisBelgeleriService();
