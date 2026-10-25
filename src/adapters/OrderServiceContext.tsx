/**
 * @akalin/order_module - OrderServiceContext
 * Sipariş ve Satış Belgeleri servisleri ve HTTP client adaptasyonunu yönetir.
 */

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import axios, { type AxiosInstance } from 'axios';

import { satisBelgeleriService } from '../services/SatisBelgeleriService';

export interface IOrderServiceAdapter {
  satisBelgeleriService: typeof satisBelgeleriService;
  httpClient?: AxiosInstance;
}

export const defaultOrderService: IOrderServiceAdapter = {
  satisBelgeleriService,
  httpClient: axios
};

export const createRestOrderAdapter = (customAxios?: AxiosInstance): IOrderServiceAdapter => {
  const client = customAxios || axios;

  satisBelgeleriService.setClient(client);

  return {
    satisBelgeleriService,
    httpClient: client
  };
};

const OrderServiceContext = createContext<IOrderServiceAdapter>(defaultOrderService);

export interface OrderServiceProviderProps {
  adapter?: IOrderServiceAdapter;
  children: ReactNode;
}

export const OrderServiceProvider: React.FC<OrderServiceProviderProps> = ({
  adapter = defaultOrderService,
  children
}) => {
  const value = useMemo(() => adapter, [adapter]);
  return (
    <OrderServiceContext.Provider value={value}>
      {children}
    </OrderServiceContext.Provider>
  );
};

export const useOrderService = (): IOrderServiceAdapter => {
  return useContext(OrderServiceContext);
};
