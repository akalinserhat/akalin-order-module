import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import SiparisForm from '../components/SiparisForm';
import { useDocumentLayout } from '@akalin/ui';
import { AlertDialog } from '@akalin/ui';
import { useTranslation } from 'react-i18next';

const SiparisFormPage: React.FC = () => {
    const { t } = useTranslation();
    const { id, tip = 'alinan' } = useParams<{ id?: string; tip?: string }>();
    const navigate = useNavigate();
    
    const [initialData, setInitialData] = useState<any>(null);
    const [loading, setLoading] = useState(!!id);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [alertDialog, setAlertDialog] = useState({ 
        isOpen: false, 
        type: 'info' as "info" | "error" | "warning" | "confirm" | "success", 
        title: '', 
        message: '', 
        onConfirm: null as any, 
        confirmText: t('common.ok', 'Tamam') 
    });

    const title = useMemo(() => {
        switch (tip) {
            case 'verilen':
            case '2':
                return t('Verilen Sipariş', 'Verilen Sipariş');
            case 'alinan-iade':
            case '3':
                return t('Alınan Sipariş İade', 'Alınan Sipariş İade');
            case 'verilen-iade':
            case '4':
                return t('Verilen Sipariş İade', 'Verilen Sipariş İade');
            case 'alinan':
            case '1':
            default:
                return t('Alınan Sipariş', 'Alınan Sipariş');
        }
    }, [tip, t]);

    const handleFormClose = useCallback(() => {
        const exitAction = () => {
            sessionStorage.removeItem(`draft_siparis_${tip}`);
            if (id) {
                try {
                    sessionStorage.setItem(`webakus_active_row_/siparisler/${tip}`, String(id));
                } catch (err) {}
            }
            navigate(`/siparisler/${tip}`, { state: { selectedId: id } });
        };

        if (isFormDirty) {
            setAlertDialog({
                isOpen: true,
                type: 'confirm',
                title: t('common.unsaved_changes', 'Kaydedilmemiş Değişiklikler'),
                message: t('common.unsaved_changes_confirm', 'Kaydedilmemiş değişiklikleriniz var. Çıkmak istediğinize emin misiniz?'),
                confirmText: t('common.yes_exit', 'Evet, Çık'),
                onConfirm: exitAction
            });
        } else {
            exitAction();
        }
    }, [isFormDirty, id, tip, navigate, t]);
    
    useDocumentLayout(title, handleFormClose);

    useEffect(() => {
        if (id) {
            axios.get(`/api/SatisBelgeleri/${id}`)
                .then(res => {
                    setInitialData(res.data);
                    setLoading(false);
                })
                .catch(() => {
                    setAlertDialog({
                        isOpen: true,
                        type: 'error',
                        title: t('common.error', 'Hata'),
                        message: t('orders.load_details_error', 'Sipariş detayları yüklenemedi.'),
                        onConfirm: () => navigate(`/siparisler/${tip}`),
                        confirmText: t('common.ok', 'Tamam')
                    });
                    setLoading(false);
                });
        }
    }, [id, navigate, tip, t]);

    if (loading) {
        return (
            <div className="flex-row items-center justify-center p-24 text-secondary">
                {t('common.loading', 'Yükleniyor...')}
            </div>
        );
    }

    return (
        <div className="flex-col flex-1 min-h-0 h-full overflow-hidden">
            <SiparisForm 
                initialData={initialData} 
                tip={tip}
                onSuccess={(returnedId?: any) => {
                    sessionStorage.removeItem(`draft_siparis_${tip}`);
                    const finalId = returnedId || id;
                    if (finalId) {
                        try {
                            sessionStorage.setItem(`webakus_active_row_/siparisler/${tip}`, String(finalId));
                        } catch (err) {}
                    }
                    navigate(`/siparisler/${tip}`, { state: { selectedId: finalId } });
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
        </div>
    );
};

export default SiparisFormPage;
