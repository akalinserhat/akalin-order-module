/**
 * @akalin/order_module - Temel Tipler ve Modül Konfigürasyonu
 */

import { AxiosInstance } from 'axios';

export interface BaseDto {
  id?: number | string;
  olusturmaTarihi?: string;
  guncellemeTarihi?: string;
  olusturulmaTarihi?: string;
  guncellenmeTarihi?: string;
  silindiMi?: boolean;
  aktifMi?: boolean;
  [key: string]: any;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface OrderModuleConfig {
  apiEndpoint?: string;
  httpClient?: AxiosInstance;
}
