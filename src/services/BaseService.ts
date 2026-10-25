import axios, { type AxiosInstance } from 'axios';
import { BaseDto } from '../types';

export class BaseService<
  TDto extends BaseDto = any,
  TCreateDto = Partial<TDto>,
  TUpdateDto = Partial<TDto>
> {
  protected readonly basePath: string;
  protected client: AxiosInstance;

  constructor(basePath: string, client?: AxiosInstance) {
    this.basePath = basePath;
    this.client = client || axios;
  }

  public setClient(client: AxiosInstance) {
    this.client = client;
  }

  public async getAll(params?: Record<string, any>): Promise<any> {
    const response = await this.client.get<any>(this.basePath, { params });
    return response.data;
  }

  public async getById(id: number | string): Promise<TDto> {
    const response = await this.client.get<TDto>(`${this.basePath}/${id}`);
    return response.data;
  }

  public async create(data: TCreateDto): Promise<TDto> {
    const response = await this.client.post<TDto>(this.basePath, data);
    return response.data;
  }

  public async update(id: number | string, data: TUpdateDto): Promise<TDto> {
    const response = await this.client.put<TDto>(`${this.basePath}/${id}`, data);
    return response.data;
  }

  public async delete(id: number | string): Promise<void> {
    await this.client.delete(`${this.basePath}/${id}`);
  }

  public async canDelete(id: number | string): Promise<{ canDelete: boolean; message?: string }> {
    const response = await this.client.get<{ canDelete: boolean; message?: string }>(`${this.basePath}/${id}/can-delete`);
    return response.data;
  }

  public async restore(id: number | string): Promise<any> {
    const response = await this.client.put(`${this.basePath}/${id}/restore`);
    return response.data;
  }

  public async archive(id: number | string): Promise<any> {
    const response = await this.client.put(`${this.basePath}/${id}/archive`);
    return response.data;
  }

  public async unarchive(id: number | string): Promise<any> {
    const response = await this.client.put(`${this.basePath}/${id}/unarchive`);
    return response.data;
  }
}

export default BaseService;
