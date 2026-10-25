import React, { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShoppingCart, Truck, Edit2, Trash2, FileText, RotateCcw, Calendar, Archive } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { ActionMenu, BaseListPage } from '@akalin/ui';
import { satisBelgeleriService } from '../services/SatisBelgeleriService';

const Siparisler: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { tip } = useParams<{ tip: string }>();

    const docInfo = useMemo(() => {
        switch (tip) {
            case 'teklif':
                return {
                    isTeklif: true,
                    belgeTuru: 1,
                    isVerilen: false,
                    isIade: false,
                    islemTuru: 'SATIS',
                    title: t('nav.hot_sales_quotes', 'Sıcak Satış / Teklifler'),
                    subtitle: t('sicak_satis.list_subtitle', 'Müşterilere sunulan çok seçenekli sıcak satış ve pazarlık teklifleri.'),
                    addNewText: t('sicak_satis.new_quote_btn', 'Yeni Sıcak Satış Teklifi'),
                    partyLabel: t('orders.party_label_customer', 'Müşteri Adı'),
                    searchPlaceholder: t('orders.search_placeholder_received', 'Müşteri veya belge no ile ara...'),
                    emptyMessage: t('sicak_satis.empty_quote_list', 'Henüz oluşturulmuş sıcak satış teklifi bulunmuyor.'),
                    irsaliyeActionLabel: t('orders.action_create_out_waybill', 'Çıkış İrsaliyesi Oluştur'),
                    faturaActionLabel: t('orders.action_create_out_invoice', 'İrsaliyeli Satış Faturası Oluştur')
                };
            case 'verilen':
            case '2':
                return {
                    isTeklif: false,
                    belgeTuru: 2,
                    isVerilen: true,
                    isIade: false,
                    islemTuru: 'ALIS',
                    title: t('nav.orders_given', 'Verilen Siparişler'),
                    subtitle: t('orders.subtitle_given', 'Tedarikçilere verilen satın alma siparişleri.'),
                    addNewText: t('orders.new_order', 'Yeni Sipariş'),
                    partyLabel: t('orders.party_label_vendor', 'Tedarikçi Adı'),
                    searchPlaceholder: t('orders.search_placeholder_given', 'Tedarikçi veya belge no ile ara...'),
                    emptyMessage: t('orders.empty_message_given', 'Henüz verilen sipariş bulunmuyor.'),
                    irsaliyeActionLabel: t('orders.action_create_in_waybill', 'Giriş İrsaliyesi Oluştur'),
                    faturaActionLabel: t('orders.action_create_in_invoice', 'İrsaliyeli Alış Faturası Oluştur')
                };
            case 'alinan-iade':
            case '3':
                return {
                    isTeklif: false,
                    belgeTuru: 2,
                    isVerilen: false,
                    isIade: true,
                    islemTuru: 'SATISIADE',
                    title: t('nav.orders_received_return', 'Alınan Sipariş İadeleri'),
                    subtitle: t('orders.subtitle_received_return', 'Müşterilerden gelen sipariş iade kayıtları.'),
                    addNewText: t('orders.new_return_order', 'Yeni İade Siparişi'),
                    partyLabel: t('orders.party_label_customer', 'Müşteri Adı'),
                    searchPlaceholder: t('orders.search_placeholder_received', 'Müşteri veya belge no ile ara...'),
                    emptyMessage: t('orders.empty_message_received_return', 'Henüz alınan sipariş iadesi bulunmuyor.'),
                    irsaliyeActionLabel: t('orders.action_create_in_waybill', 'Giriş İrsaliyesi Oluştur'),
                    faturaActionLabel: t('orders.action_create_return_invoice', 'İade Faturası Oluştur')
                };
            case 'verilen-iade':
            case '4':
                return {
                    isTeklif: false,
                    belgeTuru: 2,
                    isVerilen: true,
                    isIade: true,
                    islemTuru: 'ALISIADE',
                    title: t('nav.orders_given_return', 'Verilen Sipariş İadeleri'),
                    subtitle: t('orders.subtitle_given_return', 'Tedarikçilere verilen sipariş iade kayıtları.'),
                    addNewText: t('orders.new_return_order', 'Yeni İade Siparişi'),
                    partyLabel: t('orders.party_label_vendor', 'Tedarikçi Adı'),
                    searchPlaceholder: t('orders.search_placeholder_given', 'Tedarikçi veya belge no ile ara...'),
                    emptyMessage: t('orders.empty_message_given_return', 'Henüz verilen sipariş iadesi bulunmuyor.'),
                    irsaliyeActionLabel: t('orders.action_create_out_waybill', 'Çıkış İrsaliyesi Oluştur'),
                    faturaActionLabel: t('orders.action_create_return_invoice', 'İade Faturası Oluştur')
                };
            case 'alinan':
            case '1':
            default:
                return {
                    isTeklif: false,
                    belgeTuru: 2,
                    isVerilen: false,
                    isIade: false,
                    islemTuru: 'SATIS',
                    title: t('nav.orders_received', 'Alınan Siparişler'),
                    subtitle: t('orders.subtitle_received', 'Müşterilerden alınan satış siparişleri.'),
                    addNewText: t('orders.new_order', 'Yeni Sipariş'),
                    partyLabel: t('orders.party_label_customer', 'Müşteri Adı'),
                    searchPlaceholder: t('orders.search_placeholder_received', 'Müşteri veya belge no ile ara...'),
                    emptyMessage: t('orders.empty_message_received', 'Henüz alınan sipariş bulunmuyor.'),
                    irsaliyeActionLabel: t('orders.action_create_out_waybill', 'Çıkış İrsaliyesi Oluştur'),
                    faturaActionLabel: t('orders.action_create_out_invoice', 'İrsaliyeli Satış Faturası Oluştur')
                };
        }
    }, [tip, t]);

    const siparisSearchFields = useMemo(() => [
        { id: 'Tumu', label: t('Tümünde Ara'), type: 'text', iconName: 'Search', placeholder: docInfo.searchPlaceholder },
        { id: 'BelgeNo', label: t('Belge No'), type: 'text', iconName: 'Barcode', placeholder: t('Belge no giriniz...') },
        { id: 'CariUnvan', label: docInfo.partyLabel, type: 'text', iconName: 'Users', placeholder: t('Cari ünvan giriniz...') },
        { id: 'SiparisNotu', label: t('orders.order_note', 'Sipariş Notu'), type: 'text', iconName: 'FileText', placeholder: t('Sipariş notu giriniz...') }
    ], [t, docInfo]);

    const handleAddNew = useCallback((isShift = false) => {
        const url = `/siparisler/${tip}/yeni`;
        if (isShift) {
            window.open(url, '_blank');
        } else {
            navigate(url);
        }
    }, [navigate, tip]);

    const handleEditPopup = useCallback((item: any) => {
        const id = item?.id ?? item?.Id;
        window.open(`/siparisler/${tip}/${id}`, '_blank');
    }, [tip]);

    const onEdit = useCallback((item: any, e?: any) => {
        const id = item?.id ?? item?.Id;
        if (id) {
            try {
                sessionStorage.setItem(`webakus_active_row_/siparisler/${tip}`, String(id));
            } catch (err) {}
        }
        if (e && e.shiftKey) {
            handleEditPopup(item);
        } else {
            navigate(`/siparisler/${tip}/${id}`, { state: { selectedId: id, item } });
        }
    }, [navigate, tip, handleEditPopup]);

    const handleRestore = useCallback(async (item: any) => {
        const id = item?.id ?? item?.Id;
        if (!id) return;
        try {
            await satisBelgeleriService.restore(id);
            toast.success(t('orders.restore_success', 'Sipariş belgesi başarıyla geri yüklendi.'));
            window.dispatchEvent(new CustomEvent('refresh-list'));
        } catch (err: any) {
            toast.error(err?.response?.data?.mesaj || err?.response?.data?.message || t('orders.action_failed', 'İşlem sırasında hata oluştu.'));
        }
    }, [t]);

    const handleArchive = useCallback(async (item: any) => {
        const id = item?.id ?? item?.Id;
        if (!id) return;
        try {
            await satisBelgeleriService.archive(id);
            toast.success(t('orders.archive_success', 'Sipariş belgesi başarıyla arşive alındı.'));
            window.dispatchEvent(new CustomEvent('refresh-list'));
        } catch (err: any) {
            toast.error(err?.response?.data?.mesaj || err?.response?.data?.message || t('orders.action_failed', 'İşlem sırasında hata oluştu.'));
        }
    }, [t]);

    const handleUnarchive = useCallback(async (item: any) => {
        const id = item?.id ?? item?.Id;
        if (!id) return;
        try {
            await satisBelgeleriService.unarchive(id);
            toast.success(t('orders.unarchive_success', 'Sipariş belgesi arşivden çıkarıldı.'));
            window.dispatchEvent(new CustomEvent('refresh-list'));
        } catch (err: any) {
            toast.error(err?.response?.data?.mesaj || err?.response?.data?.message || t('orders.action_failed', 'İşlem sırasında hata oluştu.'));
        }
    }, [t]);

    const handleFetchData = useCallback(async ({ page, pageSize, aramaData, queryParams }: any) => {
        const params: Record<string, any> = {
            tur: docInfo.belgeTuru,
            islemTuru: docInfo.islemTuru,
            sayfa: page || 1,
            sayfaBoyutu: pageSize || 50
        };
        if (queryParams?.silinenler || queryParams?.silinenleriGoster) {
            params.silinenler = true;
        }
        if (queryParams?.arsivdekiler) {
            params.arsivdekiler = true;
        }
        if (aramaData && aramaData.value) {
            params.aramaKelimesi = aramaData.value;
            params.aramaTipi = aramaData.type || 'Tumu';
        }

        const res = await satisBelgeleriService.getAll(params);
        let data: any[] = [];
        let totalCount: number | undefined = undefined;

        if (Array.isArray(res)) {
            data = res;
            totalCount = res.length;
        } else if (res && typeof res === 'object') {
            data = (res as any).items || (res as any).data || [];
            totalCount = (res as any).totalCount ?? (res as any).total ?? data.length;
        }

        return { data, totalCount };
    }, [docInfo.belgeTuru, docInfo.islemTuru]);

    const columns = useMemo(() => [
        {
            accessor: 'cariUnvan',
            header: t('orders.order_and_party_info', 'Sipariş & Cari Bilgisi'),
            sortable: true,
            render: (item: any) => (
                <div className="flex items-center gap-12 group">
                    <div className={`w-38 h-38 rounded-10 flex items-center justify-center shrink-0 border-glass ${
                        docInfo.isIade 
                            ? 'bg-danger-subtle text-danger' 
                            : docInfo.isVerilen 
                                ? 'bg-warning-subtle text-warning' 
                                : 'bg-accent-subtle text-accent-primary'
                    }`}>
                        {docInfo.isIade ? <RotateCcw size={18} /> : <ShoppingCart size={18} />}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center gap-8 mb-4 flex-wrap">
                            <div 
                                className={`status-dot ${item.silindiMi ? 'inactive' : 'active'}`} 
                                title={item.silindiMi ? t('Silindi') : t('Aktif')}
                            />
                            <div className="font-semibold text-primary text-14 group-hover:text-accent-primary transition-colors">
                                {item.cariUnvan || t('orders.unselected_party', 'Cari Seçilmedi')}
                            </div>
                            {docInfo.isTeklif && (
                                <span className="chip chip-primary text-11 font-medium">
                                    {(item.teklifSecenekleri?.length || 1)} {t('sicak_satis.option_prefix', 'Seçenek')}
                                </span>
                            )}
                            {item.silindiMi && (
                                <span className="chip-danger text-11 font-medium">
                                    {t('auto_silindi', 'Silindi')}
                                </span>
                            )}
                            {item.arsivlendiMi && (
                                <span className="chip-warning text-11 font-medium">
                                    {t('auto_arsivlendi', 'Arşivlendi')}
                                </span>
                            )}
                            {item.aktarildiMi && (
                                <span className="chip chip-success text-11 font-medium">
                                    {t('orders.transferred', 'Aktarıldı')}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-8 text-12">
                            <span className="code-badge">
                                {item.belgeNo || t('orders.no_number', 'Numarasız')}
                            </span>
                            <span className="text-secondary text-11">•</span>
                            <span className="text-secondary flex items-center gap-4">
                                <Calendar size={12} className="opacity-70" />
                                {new Date(item.tarih).toLocaleDateString('tr-TR')}
                            </span>
                            {item.siparisNotu && (
                                <>
                                    <span className="text-secondary text-11">•</span>
                                    <span className="text-secondary truncate max-w-200" title={item.siparisNotu}>
                                        {item.siparisNotu}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )
        },
        {
            accessor: 'tarih',
            header: t('common.date', 'Tarih'),
            width: '130px',
            sortable: true,
            render: (item: any) => (
                <div>
                    <div className="text-13 text-primary font-medium">
                        {new Date(item.tarih).toLocaleDateString('tr-TR')}
                    </div>
                    {item.gecerlilikTarihi && (
                        <div className="text-11 text-secondary mt-2">
                            {t('orders.due_date', 'Vade')}: {new Date(item.gecerlilikTarihi).toLocaleDateString('tr-TR')}
                        </div>
                    )}
                </div>
            )
        },
        {
            accessor: 'sevkDurumMetni',
            header: t('orders.shipment_status', 'Sevk Durumu'),
            width: '160px',
            sortable: false,
            render: (item: any) => (
                <div className="flex items-center gap-6">
                    <Truck size={14} className="text-secondary opacity-70" />
                    <span className="chip chip-primary inline-flex items-center gap-4 text-12 font-medium">
                        {item.sevkDurumMetni || '0 / 0'}
                    </span>
                </div>
            )
        },
        {
            accessor: 'kalemSayisi',
            header: t('orders.item_count', 'Kalem'),
            width: '100px',
            align: 'center' as const,
            sortable: false,
            render: (item: any) => (
                <span className="chip text-12 font-medium">
                    {(item.kalemler?.length ?? 0)} {t('orders.item_count', 'Kalem')}
                </span>
            )
        },
        {
            accessor: 'genelToplam',
            header: t('orders.total_amount', 'Toplam Tutar'),
            width: '150px',
            align: 'right' as const,
            sortable: true,
            render: (item: any) => (
                <div className="text-right">
                    <div className="font-bold text-15 text-primary">
                        ₺{(item.genelToplam || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-11 text-secondary mt-2">
                        {item.paraBirimi || 'TRY'}
                    </div>
                </div>
            )
        },
        {
            id: 'actions',
            header: '',
            width: '60px',
            align: 'center' as const,
            sortable: false,
            render: (row: any, index: number, tableActions: any) => {
                if (row.silindiMi) {
                    return (
                        <ActionMenu
                            actions={[
                                {
                                    label: t('common.restore', 'Geri Yükle'),
                                    icon: <RotateCcw size={16} />,
                                    isDefault: true,
                                    default: true,
                                    onClick: () => handleRestore(row)
                                }
                            ]}
                        />
                    );
                }

                if (row.arsivlendiMi) {
                    return (
                        <ActionMenu
                            actions={[
                                {
                                    label: t('auto_arsivden_cikar', 'Arşivden Çıkar'),
                                    icon: <RotateCcw size={16} />,
                                    isDefault: true,
                                    default: true,
                                    onClick: () => handleUnarchive(row)
                                },
                                {
                                    label: t('common.delete', 'Sil'),
                                    icon: <Trash2 size={16} />,
                                    danger: true,
                                    onClick: () => tableActions?.handleDelete && tableActions.handleDelete(row)
                                }
                            ]}
                        />
                    );
                }

                return (
                    <ActionMenu
                        actions={[
                            {
                                label: t('common.edit', 'Düzenle'),
                                icon: <Edit2 size={16} />,
                                isDefault: true,
                                default: true,
                                onClick: (e: any) => {
                                    if (e?.shiftKey) {
                                        handleEditPopup(row);
                                    } else if (tableActions?.handleEdit) {
                                        tableActions.handleEdit(row, e);
                                    } else {
                                        onEdit(row, e);
                                    }
                                }
                            },
                            {
                                label: docInfo.irsaliyeActionLabel,
                                icon: <Truck size={16} />,
                                onClick: () => {
                                    toast.success(`${docInfo.irsaliyeActionLabel} ${t('orders.open_waybill_toast', 'sayfası açılacak.')}`);
                                }
                            },
                            {
                                label: docInfo.faturaActionLabel,
                                icon: <FileText size={16} />,
                                onClick: () => {
                                    toast.success(`${docInfo.faturaActionLabel} ${t('orders.open_invoice_toast', 'sayfası açılacak.')}`);
                                }
                            },
                            {
                                label: t('auto_arsive_al', 'Arşive Al'),
                                icon: <Archive size={16} />,
                                onClick: () => handleArchive(row)
                            },
                            {
                                label: t('common.delete', 'Sil'),
                                icon: <Trash2 size={16} />,
                                danger: true,
                                onClick: () => {
                                    if (tableActions?.handleDelete) {
                                        tableActions.handleDelete(row);
                                    }
                                }
                            }
                        ]}
                    />
                );
            }
        }
    ], [docInfo, t, handleEditPopup, onEdit, handleRestore, handleArchive, handleUnarchive]);

    const mobileCardRender = useCallback((item: any, index: number, tableActions: any) => (
        <div 
            className="mobile-card-item cursor-pointer"
            onClick={(e) => {
                if (e.shiftKey) handleEditPopup(item);
                else if (tableActions?.handleEdit) tableActions.handleEdit(item, e);
                else onEdit(item, e);
            }}
        >
            <div className="flex items-start gap-12 mb-12">
                <div className={`w-40 h-40 rounded-10 flex items-center justify-center shrink-0 border-glass ${
                    docInfo.isIade 
                        ? 'bg-danger-subtle text-danger' 
                        : docInfo.isVerilen 
                            ? 'bg-warning-subtle text-warning' 
                            : 'bg-accent-subtle text-accent-primary'
                }`}>
                    {docInfo.isIade ? <RotateCcw size={20} /> : <ShoppingCart size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-8 mb-4">
                        <div className="font-semibold text-primary text-15 truncate">
                            {item.cariUnvan || t('orders.unselected_party', 'Cari Seçilmedi')}
                        </div>
                        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                            {item.silindiMi ? (
                                <ActionMenu
                                    actions={[
                                        {
                                            label: t('common.restore', 'Geri Yükle'),
                                            icon: <RotateCcw size={15} />,
                                            isDefault: true,
                                            default: true,
                                            onClick: () => handleRestore(item)
                                        }
                                    ]}
                                />
                            ) : item.arsivlendiMi ? (
                                <ActionMenu
                                    actions={[
                                        {
                                            label: t('auto_arsivden_cikar', 'Arşivden Çıkar'),
                                            icon: <RotateCcw size={15} />,
                                            isDefault: true,
                                            default: true,
                                            onClick: () => handleUnarchive(item)
                                        },
                                        {
                                            label: t('common.delete', 'Sil'),
                                            icon: <Trash2 size={15} />,
                                            danger: true,
                                            onClick: () => tableActions?.handleDelete && tableActions.handleDelete(item)
                                        }
                                    ]}
                                />
                            ) : (
                                <ActionMenu
                                    actions={[
                                        {
                                            label: t('common.edit', 'Düzenle'),
                                            icon: <Edit2 size={15} />,
                                            isDefault: true,
                                            default: true,
                                            onClick: (e: any) => {
                                                if (e.shiftKey) handleEditPopup(item);
                                                else if (tableActions?.handleEdit) tableActions.handleEdit(item, e);
                                                else onEdit(item, e);
                                            }
                                        },
                                        {
                                            label: docInfo.irsaliyeActionLabel,
                                            icon: <Truck size={15} />,
                                            onClick: () => toast.success(`${docInfo.irsaliyeActionLabel} ${t('orders.open_waybill_toast', 'sayfası açılacak.')}`)
                                        },
                                        {
                                            label: docInfo.faturaActionLabel,
                                            icon: <FileText size={15} />,
                                            onClick: () => toast.success(`${docInfo.faturaActionLabel} ${t('orders.open_invoice_toast', 'sayfası açılacak.')}`)
                                        },
                                        {
                                            label: t('auto_arsive_al', 'Arşive Al'),
                                            icon: <Archive size={15} />,
                                            onClick: () => handleArchive(item)
                                        },
                                        {
                                            label: t('common.delete', 'Sil'),
                                            icon: <Trash2 size={15} />,
                                            danger: true,
                                            onClick: () => tableActions?.handleDelete && tableActions.handleDelete(item)
                                        }
                                    ]}
                                />
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-6 items-center">
                        <span className="code-badge">
                            {item.belgeNo || t('orders.no_number', 'Numarasız')}
                        </span>
                        <span className="text-12 text-secondary">
                            {new Date(item.tarih).toLocaleDateString('tr-TR')}
                        </span>
                        {item.silindiMi && (
                            <span className="chip-danger text-10 font-medium">
                                {t('auto_silindi', 'Silindi')}
                            </span>
                        )}
                        {item.arsivlendiMi && (
                            <span className="chip-warning text-10 font-medium">
                                {t('auto_arsivlendi', 'Arşivlendi')}
                            </span>
                        )}
                        {item.aktarildiMi && (
                            <span className="chip chip-success text-10 font-medium">
                                {t('orders.transferred', 'Aktarıldı')}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between border-t-glass pt-10">
                <div className="flex items-center gap-6 text-12 text-secondary">
                    <Truck size={13} />
                    <span>{t('orders.shipment_label', 'Sevk')}: {item.sevkDurumMetni || '0 / 0'}</span>
                </div>
                <div className="font-bold text-15 text-primary">
                    ₺{(item.genelToplam || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
            </div>
        </div>
    ), [docInfo, t, handleEditPopup, onEdit, handleRestore, handleArchive, handleUnarchive]);

    const itemNameResolver = useCallback((item: any) => item.belgeNo ? `${item.belgeNo} - ${item.cariUnvan || ''}` : (item.cariUnvan || t('orders.unnamed_order', 'Numarasız Sipariş')), [t]);

    return (
        <BaseListPage 
            key={tip || 'alinan'}
            title={docInfo.title}
            subtitle={docInfo.subtitle}
            icon={docInfo.isIade ? <RotateCcw size={24} /> : <ShoppingCart size={24} />}
            service={satisBelgeleriService}
            baseRoute={`/siparisler/${tip}`}
            fetchParams={{ tur: docInfo.belgeTuru, islemTuru: docInfo.islemTuru }}
            addNewText={docInfo.addNewText}
            onAddNew={handleAddNew}
            columns={columns}
            searchableFields={siparisSearchFields}
            itemNameResolver={itemNameResolver}
            canDelete={(item: any) => satisBelgeleriService.canDelete(item.id ?? item.Id)}
            customFetchData={handleFetchData}
            onEdit={onEdit}
            onArchive={handleArchive}
            onUnarchive={handleUnarchive}
            mobileCardRender={mobileCardRender}
            enableColumnManagement={true}
            enableViewModeToggle={true}
            enableUndoDelete={true}
            emptyMessage={docInfo.emptyMessage}
        />
    );
};

export default Siparisler;
