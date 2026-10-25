/**
 * Webakus ERP - Sıcak Satış & Pazarlık (Teklif) Sayfa Sarmalayıcısı (SicakSatisTeklifFormPage.tsx)
 *
 * Başlıca Sorumlulukları:
 * - /siparisler/teklif/yeni ve /siparisler/teklif/:id rotalarını karşılar.
 * - Mevcut teklif düzenlenirken detay verisini yükler, kaydedilmemiş değişiklik uyarısını
 *   ve liste aktif satır hafızasını (sessionStorage + location.state) yönetir.
 * - 3 aşamalı SicakSatisTeklifForm sihirbazını barındırır.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { AlertDialog } from '@akalin/ui';
import SicakSatisTeklifForm from '../components/SicakSatisTeklifForm';

export interface SicakSatisTeklifFormPageProps {
    headerCollapsible?: boolean;
    defaultHeaderCollapsed?: boolean;
}

const SicakSatisTeklifFormPage: React.FC<SicakSatisTeklifFormPageProps> = ({
    headerCollapsible = true,
    defaultHeaderCollapsed = false
}) => {
    const { t } = useTranslation();
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();

    const [initialData, setInitialData] = useState<any>(null);
    const [loading, setLoading] = useState(Boolean(id));
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [alertDialog, setAlertDialog] = useState({
        isOpen: false,
        type: 'info' as 'info' | 'error' | 'warning' | 'confirm' | 'success',
        title: '',
        message: '',
        onConfirm: null as any,
        confirmText: t('common.ok', 'Tamam')
    });

    const handleFormClose = useCallback(() => {
        const exitAction = () => {
            if (id) {
                try {
                    sessionStorage.setItem('webakus_active_row_/siparisler/teklif', String(id));
                } catch {}
            }
            navigate('/siparisler/teklif', { state: { selectedId: id } });
        };

        if (isFormDirty) {
            setAlertDialog({
                isOpen: true,
                type: 'confirm',
                title: t('common.unsaved_changes', 'Kaydedilmemiş Değişiklikler'),
                message: t(
                    'common.unsaved_changes_confirm',
                    'Kaydedilmemiş değişiklikleriniz var. Çıkmak istediğinize emin misiniz?'
                ),
                confirmText: t('common.yes_exit', 'Evet, Çık'),
                onConfirm: exitAction
            });
        } else {
            exitAction();
        }
    }, [isFormDirty, id, navigate, t]);

    useEffect(() => {
        if (id) {
            axios
                .get(`/api/SatisBelgeleri/${id}`)
                .then((res) => {
                    setInitialData(res.data);
                    setLoading(false);
                })
                .catch(() => {
                    setAlertDialog({
                        isOpen: true,
                        type: 'error',
                        title: t('common.error', 'Hata'),
                        message: t(
                            'sicak_satis.load_details_error',
                            'Teklif detayları yüklenemedi.'
                        ),
                        onConfirm: () => navigate('/siparisler/teklif'),
                        confirmText: t('common.ok', 'Tamam')
                    });
                    setLoading(false);
                });
        }
    }, [id, navigate, t]);

    if (loading) {
        return (
            <div className="flex-row items-center justify-center p-24 text-secondary">
                {t('common.loading', 'Yükleniyor...')}
            </div>
        );
    }

    return (
        <>
            <SicakSatisTeklifForm
                headerCollapsible={headerCollapsible}
                defaultHeaderCollapsed={defaultHeaderCollapsed}
                initialData={initialData}
                onSuccess={(returnedId?: any) => {
                    const finalId = returnedId || id;
                    if (finalId) {
                        try {
                            sessionStorage.setItem(
                                'webakus_active_row_/siparisler/teklif',
                                String(finalId)
                            );
                        } catch {}
                    }
                    navigate('/siparisler/teklif', { state: { selectedId: finalId } });
                }}
                onCancel={handleFormClose}
                onDirtyChange={setIsFormDirty}
            />

            <AlertDialog
                isOpen={alertDialog.isOpen}
                onClose={() => setAlertDialog(prev => ({ ...prev, isOpen: false }))}
                type={alertDialog.type}
                title={alertDialog.title}
                message={alertDialog.message}
                onConfirm={alertDialog.onConfirm}
                confirmText={alertDialog.confirmText}
            />
        </>
    );
};

export default SicakSatisTeklifFormPage;
