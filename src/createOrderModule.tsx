/**
 * @akalin/order_module - createOrderModule Fabrikası
 */

import React, { lazy, Suspense } from 'react';
import { ShoppingCart, RotateCcw, Sparkles } from 'lucide-react';
import { type IModuleDefinition } from '@akalin/module_core';
import {
  OrderServiceProvider,
  createRestOrderAdapter,
  type IOrderServiceAdapter
} from './adapters/OrderServiceContext';
import { OrderModuleConfig } from './types';
import { orderCards, orderDocuments, orderReports } from './definitions/entities';

// Lazy-loaded Sayfalar
const SiparislerPage = lazy(() => import('./pages/Siparisler'));
const SiparisFormPage = lazy(() => import('./pages/SiparisFormPage'));
const SicakSatisTeklifFormPage = lazy(() => import('./pages/SicakSatisTeklifFormPage'));

export const createOrderModule = (
  config: OrderModuleConfig = {},
  customAdapter?: IOrderServiceAdapter
): IModuleDefinition => {
  const adapter = customAdapter || createRestOrderAdapter(config.httpClient);

  const withProvider = (Component: React.ComponentType<any>) => {
    return (props: any) => (
      <OrderServiceProvider adapter={adapter}>
        <Suspense fallback={null}>
          <Component {...props} />
        </Suspense>
      </OrderServiceProvider>
    );
  };

  const ConnectedSiparislerPage = withProvider(SiparislerPage);
  const ConnectedSiparisFormPage = withProvider(SiparisFormPage);
  const ConnectedSicakSatisTeklifFormPage = withProvider(SicakSatisTeklifFormPage);

  return {
    id: 'siparis-yonetimi',
    title: 'Sipariş Yönetimi',
    permissionPrefix: 'siparis',
    icon: React.createElement(ShoppingCart, { size: 20 }),
    iconName: 'ShoppingCart',
    order: 30,
    version: '1.0.0',
    strictEntityRegistration: true,
    cards: orderCards,
    documents: orderDocuments,
    reports: orderReports,
    routes: [
      {
        path: '/siparisler/teklif/yeni',
        element: React.createElement(ConnectedSicakSatisTeklifFormPage),
        title: 'Yeni Sıcak Satış Teklifi'
      },
      {
        path: '/siparisler/teklif/:id',
        element: React.createElement(ConnectedSicakSatisTeklifFormPage),
        title: 'Sıcak Satış Teklifi Düzenle'
      },
      {
        path: '/siparisler/:tip',
        element: React.createElement(ConnectedSiparislerPage),
        title: 'Siparişler'
      },
      {
        path: '/siparisler/:tip/yeni',
        element: React.createElement(ConnectedSiparisFormPage),
        title: 'Yeni Sipariş'
      },
      {
        path: '/siparisler/:tip/:id',
        element: React.createElement(ConnectedSiparisFormPage),
        title: 'Sipariş Düzenle'
      }
    ],
    menuItems: [
      {
        id: 'siparisler-group',
        label: 'Siparişler',
        icon: React.createElement(ShoppingCart, { size: 20 }),
        order: 30,
        isDropdown: true,
        children: [
          {
            id: 'sicak-satis-teklif-menu',
            label: 'Sıcak Satış / Teklifler',
            path: '/siparisler/teklif',
            icon: React.createElement(Sparkles, { size: 16 }),
            order: 0,
            requiredPermissions: ['siparis.belge.alinan-siparis.goruntule']
          },
          {
            id: 'alinan-siparis-menu',
            label: 'Alınan Siparişler',
            path: '/siparisler/alinan',
            icon: React.createElement(ShoppingCart, { size: 16 }),
            order: 1,
            requiredPermissions: ['siparis.belge.alinan-siparis.goruntule']
          },
          {
            id: 'verilen-siparis-menu',
            label: 'Verilen Siparişler',
            path: '/siparisler/verilen',
            icon: React.createElement(ShoppingCart, { size: 16 }),
            order: 2,
            requiredPermissions: ['siparis.belge.verilen-siparis.goruntule']
          },
          {
            id: 'alinan-siparis-iade-menu',
            label: 'Alınan Sipariş İade',
            path: '/siparisler/alinan-iade',
            icon: React.createElement(RotateCcw, { size: 16 }),
            order: 3,
            requiredPermissions: ['siparis.belge.alinan-siparis-iade.goruntule']
          },
          {
            id: 'verilen-siparis-iade-menu',
            label: 'Verilen Sipariş İade',
            path: '/siparisler/verilen-iade',
            icon: React.createElement(RotateCcw, { size: 16 }),
            order: 4,
            requiredPermissions: ['siparis.belge.verilen-siparis-iade.goruntule']
          }
        ]
      }
    ]
  };
};

export default createOrderModule;
