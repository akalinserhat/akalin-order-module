// @ts-nocheck
/**
 * SiparisForm Bileşeni
 * 
 * Bu bileşen, Alınan ve Verilen siparişlerin oluşturulması ve düzenlenmesi için kullanılan
 * kapsamlı bir form bileşenidir. Master-Detail (Ana Bilgiler ve Kalemler) yapısını yönetir.
 * 
 * Ana İşlevleri:
 * - Master Data: Müşteri/Tedarikçi bilgileri, tarihler, adresler, para birimi ve belge numarası gibi genel form verilerinin yönetimi (`formData`).
 * - Detail Data (Kalemler): Siparişe eklenen ürünlerin/hizmetlerin grid üzerinde satır bazlı yönetimi (`kalemler`).
 * - Dinamik Hesaplamalar: Miktar, birim fiyat, iskonto oranları ve KDV değiştikçe satır tutarlarının ve dip toplamların anlık olarak hesaplanması.
 * - Modal Entegrasyonları: Cari (Müşteri/Tedarikçi) ve Ürün seçimi için gelişmiş arama modallarının kullanılması.
 * - Barkod Desteği: Barkod okutularak sisteme hızlıca ürün eklenmesi veya arama yapılması.
 */
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, Calendar, FileText, User, ShoppingCart, MapPin, AlignLeft, Save, X, Loader2, Settings, Building, Sparkles, Gift, Tag, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { CancelButton, BarcodeScannerInput, useDocumentDraft, useHeaderApi } from '@akalin/ui';

import { BaseDocumentPage, DocumentHeaderPanel, DocumentHeaderField } from '@akalin/ui';
import { Card } from '@akalin/ui';
import { SpreadsheetGrid } from '@akalin/ui';
import { CurrencyInput } from '@akalin/ui';
import { BaseInput } from '@akalin/ui';
import SiparisKampanyaAnalizModal from './SiparisKampanyaAnalizModal';
import { CariSeciciInput, PhoneInput, UrunSeciciModal, SiparisSeciciInput, IrsaliyeSeciciModal, DocumentResultPanel, DocumentResultPanelsGroup, FieldError, BirimSecici, DateInput, NotInput, UrunSeciciInput, AdresInput } from '@akalin/ui';
import SiparisSeciciList from './SiparisSeciciList';
import { CariSeciciList as CariSeciciModal } from '@akalin/customer_module';
import { getCurrencySymbol } from '../utils/currencyUtils';

import { validateSiparisForm, validateSiparisField } from '../validators/siparisValidation';
import { getSiparisDefaultValues } from '../defaults/siparisDefaultValue';
import { useSiparisActionMenu } from '../hooks/useSiparisActionMenu';
import { generateBelgeNo } from '../utils/belgeUtils';
import { kampanyalarService } from '@akalin/product_module';

export const getIslemTuruFromTip = (tipStr: string): number => {
    switch (tipStr) {
        case 'verilen':
        case '2':
            return 2;
        case 'alinan-iade':
        case '3':
            return 3;
        case 'verilen-iade':
        case '4':
            return 4;
        case 'alinan':
        case '1':
        default:
            return 1;
    }
};

export const getBelgeIdFromTip = (tipStr: string): string => {
    switch (tipStr) {
        case 'verilen':
        case '2':
            return 'VerilenSiparis';
        case 'alinan-iade':
        case '3':
            return 'AlinanSiparisIade';
        case 'verilen-iade':
        case '4':
            return 'VerilenSiparisIade';
        case 'alinan':
        case '1':
        default:
            return 'AlinanSiparis';
    }
};

export interface SiparisFormData {
    [key: string]: any;
    id?: number;
    cariId: string | number;
    cariMetni: string;
    belgeNo: string;
    tarih: string;
    gecerlilikTarihi: string;
    aciklama: string;
    disSistemId: string;
    teslimAlacakKisi: string;
    nakliyeTelefon: string;
    nakliyeAdres: string;
    nakliyeIlId?: number | string | null;
    nakliyeIlceId?: number | string | null;
    nakliyeIlAdi?: string | null;
    nakliyeIlceAdi?: string | null;
    faturaUnvan: string;
    vergiDairesi: string;
    vergiNo: string;
    faturaAdres: string;
    faturaIlId?: number | string | null;
    faturaIlceId?: number | string | null;
    faturaIlAdi?: string | null;
    faturaIlceAdi?: string | null;
    siparisNotu: string;
    paraBirimi: string;
    // Gelen data'da olan diger alanlar
    cariUnvan?: string;
    teslimatTarihi?: string;
    kargoFirmaId?: string | number;
    kargoTakipNo?: string;
    teslimatAdresi?: string;
    depoId?: string | number;
}

export interface SiparisKalem {
    [key: string]: any;
    id?: number;
    urunId: string | number;
    urunKodu?: string;
    urunAdi?: string;
    miktar: number;
    birimFiyat: number;
    iskontoOrani?: number;
    kdvOrani?: number;
    tutar?: number;
    netTutar?: number;
    kdvTutar?: number;
    genelTutar?: number;
}

export interface SiparisFormProps {
    initialData?: SiparisFormData & { kalemler?: SiparisKalem[] };
    tip: 'alinan' | 'verilen' | 'alinan-iade' | 'verilen-iade' | string;
    onSuccess?: (returnedId?: any) => void;
    onCancel?: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
    isFullPage?: boolean;
}

const SiparisForm: React.FC<SiparisFormProps> = ({ initialData, tip, onSuccess, onCancel, onDirtyChange, isFullPage }) => {
    // Dil çevirisi ve siparişin türüne dair bayrak tanımlamaları
    const { t } = useTranslation();
    const isAlis = tip === 'verilen' || tip === 'verilen-iade' || tip === '2' || tip === '4';
    const isIade = tip === 'alinan-iade' || tip === 'verilen-iade' || tip === '3' || tip === '4';
    const isVerilen = isAlis;
    const isCampaignEligible = !isAlis && !isIade;
    const [loading, setLoading] = useState(false);
    const [belgeAyar, setBelgeAyar] = useState<any>(null);

    // Dropdown Data
    const [cariler, setCariler] = useState([]);
    const [urunler, setUrunler] = useState([]);
    const [depolar, setDepolar] = useState([]);
    const [kargoFirmalari, setKargoFirmalari] = useState([]);

    // Master Data
    const [formData, setFormData] = useState<any>(() => getSiparisDefaultValues({ tip, initialData }));

    // Detail Lines
    const [kalemler, setKalemler] = useState([]);

    // Validation
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Modal States
    const [cariModalOpen, setCariModalOpen] = useState(false);
    const [cariAramaMetni, setCariAramaMetni] = useState('');

    // Ürün Seçici State
    const [urunModalOpen, setUrunModalOpen] = useState(false);
    const [urunAramaMetni, setUrunAramaMetni] = useState('');
    const [siparisSeciciModalOpen, setSiparisSeciciModalOpen] = useState(false);
    const [siparisAramaMetni, setSiparisAramaMetni] = useState('');
    const [activeRowId, setActiveRowId] = useState(null);
    const [varsayilanParaBirimi, setVarsayilanParaBirimi] = useState('TRY');
    const lastFocusedInputRef = React.useRef(null);
    const { setHeaderBreadcrumbOptions } = useHeaderApi() || {};

    useEffect(() => {
        if (!setHeaderBreadcrumbOptions) return;
        if (siparisSeciciModalOpen) return;

        const selectedCariTitle = formData.cariId
            ? (formData.cariUnvan || formData.cariMetni || '').trim()
            : '';
        if (selectedCariTitle) {
            setHeaderBreadcrumbOptions({ recordTitle: selectedCariTitle });
        } else {
            setHeaderBreadcrumbOptions(null);
        }
    }, [siparisSeciciModalOpen, formData.cariId, formData.cariUnvan, formData.cariMetni, setHeaderBreadcrumbOptions]);

    useEffect(() => {
        return () => {
            if (setHeaderBreadcrumbOptions) {
                setHeaderBreadcrumbOptions(null);
            }
        };
    }, [setHeaderBreadcrumbOptions]);

    // Results State
    const [resultPanelTitle, setResultPanelTitle] = useState(t('orders.slip_results', 'Fiş Sonuçları'));
    const [resultItems, setResultItems] = useState([
        { id: '1', label: t('orders.total_volume', 'Toplam Hacim'), value: '0 m³' },
        { id: '2', label: t('orders.total_weight', 'Toplam Ağırlık'), value: '0 kg' },
        { id: '3', label: t('orders.package_count', 'Paket Sayısı'), value: `0 ${t('common.piece', 'Adet')}` }
    ]);

    // Bulk Discount Edit States
    const [editIsk1Oran, setEditIsk1Oran] = useState('');
    const [editIsk1Tutar, setEditIsk1Tutar] = useState('');
    const [editIsk2Oran, setEditIsk2Oran] = useState('');
    const [editIsk2Tutar, setEditIsk2Tutar] = useState('');
    const [isEditingAltToplam, setIsEditingAltToplam] = useState(false);

    // Kampanya Analiz States & Actions
    const [kampanyaModalOpen, setKampanyaModalOpen] = useState(false);
    const [kampanyaAnalizSonucu, setKampanyaAnalizSonucu] = useState<SiparisKampanyaAnalizSonucuDto | null>(null);
    const [uygulananKampanya, setUygulananKampanya] = useState<KampanyaDegerlendirmeSonucuDto | null>(null);
    const [isKampanyaLoading, setIsKampanyaLoading] = useState(false);

    const fetchKampanyaAnalizi = useCallback(async () => {
        if (isVerilen) return;
        const gecerliKalemler = kalemler
            .filter((k: any) => (k.urunVeHizmetKartiId || k.urunId) && Number(k.miktar) > 0)
            .map((k: any) => ({
                urunVeHizmetKartiId: Number(k.urunVeHizmetKartiId || k.urunId),
                miktar: Number(k.miktar) || 1,
                listeFiyati: Number(k.listeFiyati || k.kdvHaricFiyat) || 0,
                kdvHaricFiyat: Number(k.kdvHaricFiyat || k.listeFiyati) || 0,
                kdvOrani: Number(k.kdvOrani) || 0
            }));

        try {
            setIsKampanyaLoading(true);
            const res = await kampanyalarService.siparisKampanyaAnalizi({
                cariId: formData.cariId ? Number(formData.cariId) : undefined,
                tarih: formData.tarih || new Date().toISOString(),
                kalemler: gecerliKalemler
            });
            setKampanyaAnalizSonucu(res);
        } catch (err) {
            console.error('Kampanya analizi alınamadı:', err);
        } finally {
            setIsKampanyaLoading(false);
        }
    }, [isVerilen, kalemler, formData.cariId, formData.tarih]);

    useEffect(() => {
        if (isVerilen) return;
        const timer = setTimeout(() => {
            fetchKampanyaAnalizi();
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchKampanyaAnalizi, isVerilen]);

    const handleKampanyaUygula = (kampanya: KampanyaDegerlendirmeSonucuDto) => {
        setUygulananKampanya(kampanya);
        if (kampanya.aksiyonTipi === 1 && kampanya.aksiyonDegeri) {
            const oran = kampanya.aksiyonDegeri;
            setEditIsk1Oran(oran.toString());
            setEditIsk1Tutar('');
            setKalemler((prev: any[]) => {
                const newKalemler = [...prev];
                newKalemler.forEach(k => {
                    const satirBrut = ((k.miktar || 0) * (k.kdvHaricFiyat || 0) * (k.birimCarpan || 1));
                    k.iskonto1Oran = parseFloat(oran.toFixed(3));
                    k.iskonto1Tutar = parseFloat((satirBrut * (oran / 100)).toFixed(2));
                    const brutSonrasi = satirBrut - k.iskonto1Tutar;
                    const isk2Tutar = k.iskonto2Oran > 0 ? brutSonrasi * (k.iskonto2Oran / 100) : (k.iskonto2Tutar || 0);
                    k.kdvHaricTutar = brutSonrasi - isk2Tutar;
                    k.kdvDahilTutar = k.kdvHaricTutar * (1 + (k.kdvOrani || 0) / 100);
                    k.brutTutar = satirBrut;
                });
                return newKalemler;
            });
            toast.success(t('{{adi}} kampanyası (%{{oran}} indirim) siparişe uygulandı.', { adi: kampanya.kampanyaAdi, oran }));
        } else if (kampanya.aksiyonTipi === 2 && kampanya.aksiyonDegeri) {
            const kampanyaIndirimTutari = kampanya.aksiyonDegeri;
            const isKdvDahil = !!kampanya.kdvDahilMi;
            setKalemler((prev: any[]) => {
                const newKalemler = [...prev];
                const brutAraToplam = newKalemler.reduce((acc, row) => acc + ((row.miktar || 0) * (row.kdvHaricFiyat || 0) * (row.birimCarpan || 1)), 0);
                const brutKdvDahilToplam = newKalemler.reduce((acc, row) => {
                    const satirBrut = ((row.miktar || 0) * (row.kdvHaricFiyat || 0) * (row.birimCarpan || 1));
                    const kdvOran = Number(row.kdvOrani) || 0;
                    return acc + (satirBrut * (1 + kdvOran / 100));
                }, 0);

                if (brutAraToplam > 0) {
                    newKalemler.forEach(k => {
                        const satirBrut = ((k.miktar || 0) * (k.kdvHaricFiyat || 0) * (k.birimCarpan || 1));
                        const kdvOran = Number(k.kdvOrani) || 0;
                        // Kampanya indirimi KDV Dahil ise KDV hariç satıra düşen payı:
                        // satirKdvHaricIskonto = kampanyaIndirimTutari * (satirBrut / brutKdvDahilToplam)
                        // Kampanya indirimi KDV Hariç ise doğrudan KDV hariç tutarlar üzerinden:
                        // satirKdvHaricIskonto = kampanyaIndirimTutari * (satirBrut / brutAraToplam)
                        const satirKdvHaricIskonto = isKdvDahil
                            ? (brutKdvDahilToplam > 0 ? parseFloat((kampanyaIndirimTutari * (satirBrut / brutKdvDahilToplam)).toFixed(2)) : 0)
                            : parseFloat((kampanyaIndirimTutari * (satirBrut / brutAraToplam)).toFixed(2));

                        k.iskonto1Tutar = satirKdvHaricIskonto;
                        k.iskonto1Oran = satirBrut > 0 ? parseFloat(((k.iskonto1Tutar / satirBrut) * 100).toFixed(3)) : 0;
                        const brutSonrasi = satirBrut - k.iskonto1Tutar;
                        const isk2Tutar = k.iskonto2Oran > 0 ? brutSonrasi * (k.iskonto2Oran / 100) : (k.iskonto2Tutar || 0);
                        k.kdvHaricTutar = brutSonrasi - isk2Tutar;
                        k.kdvDahilTutar = k.kdvHaricTutar * (1 + kdvOran / 100);
                        k.brutTutar = satirBrut;
                    });

                    const toplamKdvHaricIskonto = newKalemler.reduce((acc, row) => acc + (row.iskonto1Tutar || 0), 0);
                    setEditIsk1Tutar(parseFloat(toplamKdvHaricIskonto.toFixed(2)).toString());
                    const docIsk1Oran = brutAraToplam > 0 ? (toplamKdvHaricIskonto / brutAraToplam) * 100 : 0;
                    setEditIsk1Oran(parseFloat(docIsk1Oran.toFixed(3)).toString());
                }
                return newKalemler;
            });
            const kdvDurumMetni = isKdvDahil ? t('KDV Dahil') : t('KDV Hariç');
            toast.success(t('{{adi}} kampanyası ({{tutar}} ₺ {{kdvDurum}} indirim) siparişe uygulandı.', { 
                adi: kampanya.kampanyaAdi, 
                tutar: kampanyaIndirimTutari,
                kdvDurum: kdvDurumMetni
            }));
        } else if (kampanya.aksiyonTipi === 3 && kampanya.hediyeUrunVeHizmetKartiId) {
            const defaultDepo = depolar.length > 0 ? (depolar[0] as any).id : '';
            const defaultKargo = kargoFirmalari.length > 0 ? (kargoFirmalari[0] as any).id : '';
            const hediyeKalem = {
                id: Math.random().toString(),
                kampanyaId: kampanya.kampanyaId,
                isHediyeKalem: true,
                urunVeHizmetKartiId: kampanya.hediyeUrunVeHizmetKartiId,
                urunKodu: 'HEDIYE',
                barkod: '',
                birimAdi: 'Adet',
                birimTipiId: null,
                birimCarpan: 1,
                urunAdi: `${kampanya.hediyeUrunVeHizmetAdi || t('Hediye Ürün')} (${t('Kampanya Hediyesi')})`,
                aramaMetni: kampanya.hediyeUrunVeHizmetAdi || '',
                miktar: 1,
                baseListeFiyati: 0,
                listeFiyati: 0,
                kdvOrani: 0,
                kdvHaricFiyat: 0,
                iskonto1Oran: 100,
                iskonto1Tutar: 0,
                iskonto2Oran: 0,
                iskonto2Tutar: 0,
                kdvHaricTutar: 0,
                kdvDahilTutar: 0,
                brutTutar: 0,
                sevkEdilenMiktar: 0,
                kalanMiktar: 1,
                valorTarihi: formData.tarih,
                depoId: defaultDepo,
                kargoFirmasiId: defaultKargo,
                teslimTarihi: formData.tarih
            };
            setKalemler((prev: any[]) => [...prev.filter((r: any) => r.urunVeHizmetKartiId), hediyeKalem]);
            toast.success(t('{{adi}} kampanyası hediye ürünü sepete eklendi.', { adi: kampanya.kampanyaAdi }));
        }
    };

    const handleKampanyaKaldir = (kampanyaToRevert?: KampanyaDegerlendirmeSonucuDto) => {
        const kampanya = kampanyaToRevert || uygulananKampanya;
        if (!kampanya) return;

        if (kampanya.aksiyonTipi === 1 || kampanya.aksiyonTipi === 2) {
            setEditIsk1Oran('');
            setEditIsk1Tutar('');
            setKalemler((prev: any[]) => {
                const newKalemler = [...prev];
                newKalemler.forEach(k => {
                    const satirBrut = ((k.miktar || 0) * (k.kdvHaricFiyat || 0) * (k.birimCarpan || 1));
                    k.iskonto1Oran = 0;
                    k.iskonto1Tutar = 0;
                    const brutSonrasi = satirBrut;
                    const isk2Tutar = k.iskonto2Oran > 0 ? brutSonrasi * (k.iskonto2Oran / 100) : (k.iskonto2Tutar || 0);
                    k.kdvHaricTutar = brutSonrasi - isk2Tutar;
                    k.kdvDahilTutar = k.kdvHaricTutar * (1 + (k.kdvOrani || 0) / 100);
                    k.brutTutar = satirBrut;
                });
                return newKalemler;
            });
        } else if (kampanya.aksiyonTipi === 3) {
            setKalemler((prev: any[]) => prev.filter((k: any) => k.kampanyaId !== kampanya.kampanyaId && k.urunKodu !== 'HEDIYE' && !k.isHediyeKalem));
        }

        setUygulananKampanya(null);
        toast.success(t('{{adi}} kampanyası siparişten kaldırıldı.', { adi: kampanya.kampanyaAdi }));
    };

    // Tabs
    const [activeTab, setActiveTab] = useState(1);
    const tabs = [
        { id: 1, title: t('common.general', 'Genel'), icon: <FileText size={16} /> },
        { id: 2, title: t('orders.shipping_address', 'Nakliye Adresi'), icon: <MapPin size={16} /> },
        { id: 3, title: t('orders.billing_address', 'Fatura Adresi'), icon: <MapPin size={16} /> },
        { id: 4, title: t('common.note', 'Not'), icon: <AlignLeft size={16} /> }
    ];

    const location = useLocation();
    const navigate = useNavigate();

    const { clearDraft } = useDocumentDraft(
        `draft_siparis_${tip}`,
        { formData, kalemler, activeRowId },
        (draft) => {
            if (draft.formData) setFormData(draft.formData);
            if (draft.kalemler) setKalemler(draft.kalemler);
            if (draft.activeRowId !== undefined) setActiveRowId(draft.activeRowId);
        },
        !initialData?.id // Sadece yeni siparişlerde
    );

    useEffect(() => {
        if (location.state?.newlyAddedUrunId && activeRowId !== null) {
            const newId = location.state.newlyAddedUrunId;
            window.history.replaceState({}, document.title); 

            axios.get(`/api/UrunVeHizmetKartlari/${newId}`)
                .then(res => {
                    if (res.data) {
                        handleUrunSelect(res.data, activeRowId);
                        toast.success(t('orders.newly_created_product_added', 'Yeni oluşturulan ürün başarıyla eklendi.'));
                    }
                })
                .catch(err => {
                    console.error("Yeni eklenen ürün getirilemedi", err);
                    toast.error(t('orders.newly_created_product_fetch_error', 'Yeni eklenen ürün getirilemedi.'));
                });
        }
    }, [location.state?.newlyAddedUrunId, activeRowId]);

    useEffect(() => {
        // Dropdown verilerini (Cariler, Ürünler, Depolar vb.) API'den eşzamanlı olarak getirir
        const fetchData = async () => {
            try {
                const [carilerRes, urunlerRes, paraBirimleriRes, depolarRes, kargoFirmalariRes] = await Promise.all([
                    axios.get('/api/Cari?sayfaBoyutu=1000'),
                    axios.get('/api/UrunVeHizmetKartlari?sayfaBoyutu=1000'),
                    axios.get('/api/ParaBirimleri'),
                    axios.get('/api/Depolar'),
                    axios.get('/api/KargoFirmasi')
                ]);
                setCariler(carilerRes.data || []);
                setUrunler(urunlerRes.data?.veriler || []);
                setDepolar(depolarRes.data || []);
                setKargoFirmalari(kargoFirmalariRes.data || []);

                const pBirimleri = paraBirimleriRes.data || [];
                const varsayilanPb = pBirimleri.find(p => p.varsayilanMi);
                if (varsayilanPb) {
                    setVarsayilanParaBirimi(varsayilanPb.kod);
                    if (!initialData) {
                        setFormData(prev => ({ ...prev, paraBirimi: varsayilanPb.kod }));
                    }
                }

                // Eğer form yeni açılıyorsa boş olan ilk satıra default değerleri ata
                setKalemler(prev => prev.map(k => {
                    if (!k.urunVeHizmetKartiId) {
                        return {
                            ...k,
                            depoId: k.depoId || (depolarRes.data?.length > 0 ? depolarRes.data[0].id : ''),
                            kargoFirmasiId: k.kargoFirmasiId || (kargoFirmalariRes.data?.length > 0 ? kargoFirmalariRes.data[0].id : '')
                        };
                    }
                    return k;
                }));
            } catch (err) {
                toast.error(t('orders.required_lists_load_error', 'Gerekli listeler (Cari/Ürün/Para Birimi) yüklenemedi.'));
            }
        };
        fetchData();

        if (initialData) {
            setFormData({
                cariId: initialData.cariId || '',
                cariMetni: initialData.cariAd || initialData.cariUnvan || '',
                belgeNo: initialData.belgeNo || '',
                tarih: initialData.tarih ? initialData.tarih.split('T')[0] : new Date().toISOString().split('T')[0],
                gecerlilikTarihi: initialData.gecerlilikTarihi ? initialData.gecerlilikTarihi.split('T')[0] : '',
                aciklama: initialData.aciklama || '',
                disSistemId: initialData.disSistemId || '',
                teslimAlacakKisi: initialData.teslimAlacakKisi || '',
                nakliyeTelefon: initialData.nakliyeTelefon || '',
                nakliyeAdres: initialData.sevkAdresMetni || '',
                nakliyeIlId: initialData.sevkIlId || initialData.nakliyeIlId || null,
                nakliyeIlceId: initialData.sevkIlceId || initialData.nakliyeIlceId || null,
                nakliyeIlAdi: initialData.sevkIlAdi || initialData.nakliyeIlAdi || null,
                nakliyeIlceAdi: initialData.sevkIlceAdi || initialData.nakliyeIlceAdi || null,
                nakliyeAdresIds: initialData.sevkAdresiId ? { genelAdresId: initialData.sevkAdresiId } : null,
                faturaUnvan: initialData.faturaUnvan || '',
                vergiDairesi: initialData.vergiDairesi || '',
                vergiNo: initialData.vergiNo || '',
                faturaAdres: initialData.faturaAdresMetni || '',
                faturaIlId: initialData.faturaIlId || null,
                faturaIlceId: initialData.faturaIlceId || null,
                faturaIlAdi: initialData.faturaIlAdi || null,
                faturaIlceAdi: initialData.faturaIlceAdi || null,
                faturaAdresIds: initialData.faturaAdresiId ? { genelAdresId: initialData.faturaAdresiId } : null,
                siparisNotu: initialData.siparisNotu || '',
                paraBirimi: initialData.paraBirimi || 'TRY'
            });

            if (initialData.kalemler) {
                setKalemler(initialData.kalemler.map(k => ({
                    id: k.id || Math.random().toString(),
                    kaynakSiparisId: k.kaynakSiparisId || null,
                    kaynakSiparisKalemiId: k.kaynakSiparisKalemiId || null,
                    siparisFisiNo: k.kaynakSiparisNo || k.siparisFisiNo || '',
                    siparisAramaMetni: '',
                    urunVeHizmetKartiId: k.urunVeHizmetKartiId || '',
                    urunKodu: k.urunVeHizmetKodu || '',
                    barkod: k.barkod || '',
                    birimAdi: k.birimAdi || 'Adet',
                    urunAdi: k.urunVeHizmetAdi || '',
                    aramaMetni: k.urunVeHizmetAdi || '',
                    miktar: k.miktar || 1,
                    listeFiyati: k.listeFiyati || 0,
                    kdvOrani: k.kdvOrani || 0,
                    kdvHaricFiyat: k.kdvHaricFiyat || 0,
                    iskonto1Oran: k.iskonto1Oran || 0,
                    iskonto1Tutar: k.iskonto1Tutar || 0,
                    iskonto2Oran: k.iskonto2Oran || 0,
                    iskonto2Tutar: k.iskonto2Tutar || 0,
                    kdvHaricTutar: k.kdvHaricTutar || 0,
                    kdvDahilTutar: k.kdvDahilTutar || 0,
                    brutTutar: k.brutTutar || 0,
                    sevkEdilenMiktar: k.sevkEdilenMiktar || 0,
                    kalanMiktar: k.kalanMiktar || 0,
                    valorTarihi: k.valorTarihi ? k.valorTarihi.split('T')[0] : '',
                    depoId: k.depoId || '',
                    kargoFirmasiId: k.kargoFirmasiId || '',
                    teslimTarihi: k.teslimTarihi ? k.teslimTarihi.split('T')[0] : ''
                })));
            }
        } else {
            // Boş bir satırla başla
            handleAddRow(true);
        }

        const belgeId = getBelgeIdFromTip(tip);
        axios.get(`/api/BelgeAyarlari/${belgeId}`).then(res => {
            const ayar = res.data;
            setBelgeAyar(ayar);

            // Eğer yeni bir belge oluşturuluyorsa otomatik numara ataması yap
            if (!initialData && ayar && ayar.otomatikNumaraVerilsinMi) {
                const yeniBelgeNo = generateBelgeNo(ayar, new Date());
                setFormData(prev => ({ ...prev, belgeNo: yeniBelgeNo }));
            }
        }).catch(err => console.error("Belge ayarları alınamadı", err));

    }, [initialData, tip]);

    const [sortConfig, setSortConfig] = React.useState(null);

    const handleSort = (colId, direction) => {
        if (!colId || !direction) {
            setSortConfig(null);
        } else {
            setSortConfig({ colId, direction });
        }
    };

    const displayedKalemler = React.useMemo(() => {
        if (!sortConfig) return kalemler;

        const filledRows = kalemler.filter(r => r.urunVeHizmetKartiId);
        const emptyRows = kalemler.filter(r => !r.urunVeHizmetKartiId);

        const sorted = [...filledRows].sort((a, b) => {
            const { colId, direction } = sortConfig;
            let key = colId;
            if (colId === 'urun') key = 'urunAdi';
            if (colId === 'birim') key = 'birimAdi';
            if (colId === 'kdvOrani') key = 'kdvDeger';

            let valA = a[key];
            let valB = b[key];

            if (valA === null || valA === undefined) valA = '';
            if (valB === null || valB === undefined) valB = '';

            if (typeof valA === 'string' && typeof valB === 'string') {
                valA = valA.toLocaleLowerCase('tr-TR');
                valB = valB.toLocaleLowerCase('tr-TR');
            }

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });

        return [...sorted, ...emptyRows];
    }, [kalemler, sortConfig]);

    const handleGridConfigChange = async (visibleCols, colWidths) => {
        if (!belgeAyar) return;

        const belgeId = getBelgeIdFromTip(tip);
        const updatedAyar = {
            ...belgeAyar,
            gorunenKolonlar: visibleCols,
            kolonGenislikleri: colWidths
        };

        setBelgeAyar(updatedAyar);
        try {
            await axios.post(`/api/BelgeAyarlari/${belgeId}`, updatedAyar);
        } catch (err) {
            console.error("Kolon ayarları kaydedilemedi", err);
        }
    };

    /**
     * Master form alanlarındaki (tarih, açıklama, belge no vb.) değişiklikleri işler.
     * Değer değiştiğinde state'i günceller ve formun dirty (kaydedilmemiş değişiklik var) state'ini aktif eder.
     */
    const handleMasterChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (field === 'cariMetni') {
            setFormData(prev => ({ ...prev, cariId: '', cariUnvan: '' })); // Kullanıcı metni değiştirirse cariId ve seçili ünvan sıfırlanmalı
        }
        if (onDirtyChange) onDirtyChange(true);
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const handleCariKeyDown = (e) => {
        if (e.key === 'Tab' && formData.cariMetni && !formData.cariId) {
            e.preventDefault();
            setCariAramaMetni(formData.cariMetni);
            setCariModalOpen(true);
        }
    };

    const handleCariSelect = async (selectedItem) => {
        if (!selectedItem) return;
        const targetId = selectedItem.id ?? selectedItem.Id;
        if (!targetId) return;

        setCariModalOpen(false);

        const resolveCariName = (c) => {
            return (c.tipi === 1 ? c.unvan : [c.ad, c.ortaIsim, c.soyad].filter(Boolean).join(' '))
                || c.unvan
                || [c.ad, c.soyad].filter(Boolean).join(' ')
                || c.kod
                || '';
        };

        const buildCariUpdates = (cari) => {
            const cariTamIsim = resolveCariName(cari);
            const updates: any = {
                cariId: String(cari.id ?? targetId),
                cariMetni: cariTamIsim,
                cariUnvan: cariTamIsim,
                faturaUnvan: cariTamIsim,
                teslimAlacakKisi: cariTamIsim,
                vergiDairesi: cari.vergiDairesi || '',
                vergiNo: cari.vergiNo || cari.tcKimlikNo || '',
                nakliyeTelefon: cari.varsayilanAdresTelefon || cari.telefon || ''
            };

            if (cari.adresler && cari.adresler.length > 0) {
                const faturaAdresleri = cari.adresler.filter(a => a.tipi === 1 || a.tipi === 3);
                const nakliyeAdresleri = cari.adresler.filter(a => a.tipi === 2 || a.tipi === 3);

                const varsayilanFatura = faturaAdresleri.find(a => a.varsayilanMi) || faturaAdresleri[0] || cari.adresler[0];
                const varsayilanNakliye = nakliyeAdresleri.find(a => a.varsayilanMi) || nakliyeAdresleri[0] || cari.adresler[0];

                updates.faturaAdres = varsayilanFatura ? (varsayilanFatura.formattedAdres || varsayilanFatura.acikAdres || varsayilanFatura.baslik || '') : '';
                updates.nakliyeAdres = varsayilanNakliye ? (varsayilanNakliye.formattedAdres || varsayilanNakliye.acikAdres || varsayilanNakliye.baslik || '') : '';

                if (varsayilanFatura && (varsayilanFatura.tipi === 1 || varsayilanFatura.tipi === 3)) {
                    updates.vergiDairesi = varsayilanFatura.vergiDairesi || updates.vergiDairesi;
                    updates.vergiNo = varsayilanFatura.vergiNo || updates.vergiNo;
                    updates.faturaUnvan = varsayilanFatura.firmaAdi || varsayilanFatura.isimSoyisim || updates.faturaUnvan;
                }

                if (varsayilanNakliye) {
                    updates.teslimAlacakKisi = varsayilanNakliye.isimSoyisim || updates.teslimAlacakKisi;
                }

                const getAdresIds = (adres) => {
                    if (!adres) return null;
                    if (adres.adresIds) return adres.adresIds;
                    if (adres.ilId) {
                        return {
                            adresIlId: adres.ilId,
                            adresIlceId: adres.ilceId,
                            adresKoyId: adres.koyId,
                            adresMahalleId: adres.mahalleId,
                            adresCaddeSokakId: adres.caddeSokakId,
                            adresDisKapiId: adres.disKapiId,
                            adresIcKapiId: adres.icKapiId
                        };
                    }
                    return null;
                };

                updates.faturaAdresIds = getAdresIds(varsayilanFatura);
                updates.nakliyeAdresIds = getAdresIds(varsayilanNakliye);
            }

            return updates;
        };

        // İade fişinde farklı bir cari seçilirse önceki cariye ait sipariş satırlarını temizle
        if (isIade && formData.cariId && String(formData.cariId) !== String(targetId)) {
            const defaultDepo = depolar.length > 0 ? depolar[0].id : '';
            const defaultKargo = kargoFirmalari.length > 0 ? kargoFirmalari[0].id : '';
            setKalemler([
                { id: Math.random().toString(), kaynakSiparisId: null, kaynakSiparisKalemiId: null, siparisFisiNo: '', siparisAramaMetni: '', urunVeHizmetKartiId: '', urunKodu: '', barkod: '', birimAdi: '', birimTipiId: null, birimCarpan: 1, urunAdi: '', aramaMetni: '', koduAramaMetni: '', miktar: 1, baseListeFiyati: 0, listeFiyati: 0, kdvOrani: 0, kdvHaricFiyat: 0, iskonto1Oran: 0, iskonto1Tutar: 0, iskonto2Oran: 0, iskonto2Tutar: 0, kdvHaricTutar: 0, kdvDahilTutar: 0, brutTutar: 0, sevkEdilenMiktar: 0, kalanMiktar: 1, valorTarihi: formData.tarih, depoId: defaultDepo, kargoFirmasiId: defaultKargo, teslimTarihi: formData.tarih }
            ]);
        }

        // Seçilen öğe ile derhal formu doldur (anında geri bildirim)
        const initialUpdates = buildCariUpdates(selectedItem);
        setFormData(prev => ({ ...prev, ...initialUpdates }));
        setErrors(prev => ({ ...prev, cariId: null }));
        if (onDirtyChange) onDirtyChange(true);

        try {
            setLoading(true);
            const res = await axios.get(`/api/Cari/${targetId}`);
            if (res?.data) {
                const fullUpdates = buildCariUpdates(res.data);
                setFormData(prev => ({ ...prev, ...fullUpdates }));
            }
        } catch (err) {
            console.warn("Cari detayları yüklenirken hata:", err);
            toast.error(t('Cari detayları yüklenemedi.'));
        } finally {
            setLoading(false);
            setTimeout(() => {
                const firstProductInput = document.querySelector('.spreadsheet-cell input:not([readonly])') as HTMLElement;
                if (firstProductInput) {
                    firstProductInput.focus();
                }
            }, 100);
        }
    };

    const handleAddRow = (isInitialization = false) => {
        setKalemler(prev => {
            const hasEmptyRow = prev.some(r => !r.urunVeHizmetKartiId);
            if (hasEmptyRow) return prev;

            const lastValorTarihi = prev.length > 0 ? (prev[prev.length - 1].valorTarihi || formData.tarih) : formData.tarih;
            const defaultDepo = depolar.length > 0 ? depolar[0].id : '';
            const defaultKargo = kargoFirmalari.length > 0 ? kargoFirmalari[0].id : '';

            return [
                ...prev,
                { id: Math.random().toString(), kaynakSiparisId: null, kaynakSiparisKalemiId: null, siparisFisiNo: '', siparisAramaMetni: '', urunVeHizmetKartiId: '', urunKodu: '', barkod: '', birimAdi: '', birimTipiId: null, birimCarpan: 1, urunAdi: '', aramaMetni: '', koduAramaMetni: '', miktar: 1, baseListeFiyati: 0, listeFiyati: 0, kdvOrani: 0, kdvHaricFiyat: 0, iskonto1Oran: 0, iskonto1Tutar: 0, iskonto2Oran: 0, iskonto2Tutar: 0, kdvHaricTutar: 0, kdvDahilTutar: 0, brutTutar: 0, sevkEdilenMiktar: 0, kalanMiktar: 1, valorTarihi: lastValorTarihi, depoId: defaultDepo, kargoFirmasiId: defaultKargo, teslimTarihi: formData.tarih }
            ];
        });
    };

    const handleClearRow = (rowId: any) => {
        const defaultDepo = depolar.length > 0 ? depolar[0].id : '';
        const defaultKargo = kargoFirmalari.length > 0 ? kargoFirmalari[0].id : '';
        setKalemler(prev => prev.map(row => {
            if (row.id === rowId) {
                return {
                    id: row.id,
                    kaynakSiparisId: null,
                    kaynakSiparisKalemiId: null,
                    siparisFisiNo: '',
                    siparisAramaMetni: '',
                    urunVeHizmetKartiId: '',
                    urunKodu: '',
                    barkod: '',
                    birimAdi: '',
                    birimTipiId: null,
                    birimCarpan: 1,
                    urunAdi: '',
                    aramaMetni: '',
                    koduAramaMetni: '',
                    miktar: 1,
                    baseListeFiyati: 0,
                    listeFiyati: 0,
                    kdvOrani: 0,
                    kdvHaricFiyat: 0,
                    iskonto1Oran: 0,
                    iskonto1Tutar: 0,
                    iskonto2Oran: 0,
                    iskonto2Tutar: 0,
                    kdvHaricTutar: 0,
                    kdvDahilTutar: 0,
                    brutTutar: 0,
                    sevkEdilenMiktar: 0,
                    kalanMiktar: 1,
                    valorTarihi: formData.tarih,
                    depoId: row.depoId || defaultDepo,
                    kargoFirmasiId: row.kargoFirmasiId || defaultKargo,
                    teslimTarihi: formData.tarih
                };
            }
            return row;
        }));
        if (onDirtyChange) onDirtyChange(true);
    };

    const handleRemoveRow = (rowId) => {
        const targetItem = kalemler.find(r => r.id === rowId);
        setKalemler(prev => prev.filter(r => r.id !== rowId));
        if (targetItem && (targetItem.urunVeHizmetKartiId || targetItem.urunId) && onDirtyChange) {
            onDirtyChange(true);
        }
    };

    /**
     * Sipariş satırlarındaki (Grid üzerindeki kalemler) hücre değişikliklerini yönetir.
     * Miktar, Fiyat, İskonto veya KDV gibi değerler değiştiğinde satırın KDV hariç/dahil
     * tutarlarını ve iskonto tutarlarını yeniden hesaplar.
     */
    const handleRowChange = (rowId, field, value) => {
        setKalemler(prev => prev.map(row => {
            if (row.id === rowId) {
                let newRow = { ...row, [field]: value };

                // Arama metni değişirse ürün ve kaynak sipariş seçimini sıfırla
                if (field === 'aramaMetni' || field === 'koduAramaMetni' || field === 'siparisAramaMetni') {
                    newRow.urunVeHizmetKartiId = '';
                    newRow.urunAdi = '';
                    newRow.urunKodu = '';
                    if (isIade) {
                        newRow.kaynakSiparisId = null;
                        newRow.kaynakSiparisKalemiId = null;
                        newRow.siparisFisiNo = '';
                    }
                }

                // Tutar hesaplama
                const miktar = field === 'miktar' ? parseFloat(value || 0) : parseFloat(newRow.miktar || 0);
                let fiyat = field === 'listeFiyati' ? parseFloat(value || 0) : parseFloat(newRow.listeFiyati || 0);
                const kdvOrani = field === 'kdvOrani' ? parseFloat(value || 0) : parseFloat(newRow.kdvOrani || 0);
                const carpan = parseFloat(newRow.birimCarpan || 1);

                let iskonto1Oran = field === 'iskonto1Oran' ? parseFloat(value || 0) : parseFloat(newRow.iskonto1Oran || 0);
                let iskonto1Tutar = field === 'iskonto1Tutar' ? parseFloat(value || 0) : parseFloat(newRow.iskonto1Tutar || 0);
                let iskonto2Oran = field === 'iskonto2Oran' ? parseFloat(value || 0) : parseFloat(newRow.iskonto2Oran || 0);
                let iskonto2Tutar = field === 'iskonto2Tutar' ? parseFloat(value || 0) : parseFloat(newRow.iskonto2Tutar || 0);

                if (field === 'kdvHaricFiyat') {
                    const kdvHaric = parseFloat(value || 0);
                    newRow.kdvHaricFiyat = kdvHaric;
                    fiyat = kdvHaric * (1 + kdvOrani / 100);
                    newRow.listeFiyati = fiyat;
                } else if (field === 'brutTutar' || field === 'kdvDahilTutar') {
                    const yeniBrut = parseFloat(value || 0);
                    let kdvHaric = yeniBrut / (1 + kdvOrani / 100);
                    let araTop = kdvHaric + iskonto1Tutar + iskonto2Tutar;
                    if (miktar > 0 && carpan > 0) {
                        newRow.kdvHaricFiyat = araTop / (miktar * carpan);
                    }
                    fiyat = newRow.kdvHaricFiyat * (1 + kdvOrani / 100);
                    newRow.listeFiyati = fiyat;
                } else {
                    newRow.listeFiyati = fiyat;
                    newRow.kdvHaricFiyat = fiyat / (1 + kdvOrani / 100);
                }

                let araToplam = miktar * (newRow.kdvHaricFiyat * carpan);

                if (field === 'iskonto1Oran') {
                    iskonto1Tutar = araToplam * (iskonto1Oran / 100);
                } else if (field === 'iskonto1Tutar') {
                    iskonto1Oran = araToplam > 0 ? (iskonto1Tutar / araToplam) * 100 : 0;
                }
                newRow.iskonto1Oran = parseFloat(iskonto1Oran.toFixed(3));
                newRow.iskonto1Tutar = parseFloat(iskonto1Tutar.toFixed(2));

                let iskonto1Sonrasi = araToplam - newRow.iskonto1Tutar;

                if (field === 'iskonto2Oran') {
                    iskonto2Tutar = iskonto1Sonrasi * (iskonto2Oran / 100);
                } else if (field === 'iskonto2Tutar') {
                    iskonto2Oran = iskonto1Sonrasi > 0 ? (iskonto2Tutar / iskonto1Sonrasi) * 100 : 0;
                }
                newRow.iskonto2Oran = parseFloat(iskonto2Oran.toFixed(3));
                newRow.iskonto2Tutar = parseFloat(iskonto2Tutar.toFixed(2));

                newRow.kdvHaricTutar = araToplam - newRow.iskonto1Tutar - newRow.iskonto2Tutar;
                newRow.kdvDahilTutar = newRow.kdvHaricTutar * (1 + kdvOrani / 100);
                newRow.brutTutar = newRow.kdvDahilTutar;

                newRow.kdvOrani = kdvOrani;
                newRow.kalanMiktar = miktar - (newRow.sevkEdilenMiktar || 0);

                return newRow;
            }
            return row;
        }));
        if (onDirtyChange) onDirtyChange(true);
    };

    const handleBirimChange = (rowId, birim) => {
        setKalemler(prev => prev.map(row => {
            if (row.id === rowId) {
                let newRow = { ...row, birimAdi: birim.ad, birimCarpan: birim.carpan || 1 };

                const miktar = parseFloat(newRow.miktar || 0);
                const fiyat = parseFloat(newRow.listeFiyati || 0);
                const carpan = parseFloat(newRow.birimCarpan || 1);
                const kdvOrani = parseFloat(newRow.kdvOrani || 0);
                const is1O = parseFloat(newRow.iskonto1Oran || 0);
                const is2O = parseFloat(newRow.iskonto2Oran || 0);

                newRow.kdvHaricFiyat = fiyat / (1 + kdvOrani / 100);

                let araToplam = miktar * (newRow.kdvHaricFiyat * carpan);
                newRow.iskonto1Tutar = parseFloat((araToplam * (is1O / 100)).toFixed(2));
                let is1S = araToplam - newRow.iskonto1Tutar;
                newRow.iskonto2Tutar = parseFloat((is1S * (is2O / 100)).toFixed(2));

                newRow.kdvHaricTutar = araToplam - newRow.iskonto1Tutar - newRow.iskonto2Tutar;
                newRow.kdvDahilTutar = newRow.kdvHaricTutar * (1 + kdvOrani / 100);
                newRow.brutTutar = newRow.kdvDahilTutar;

                return newRow;
            }
            return row;
        }));
        if (onDirtyChange) onDirtyChange(true);
    };

    const openIadeSiparisSecici = (rowId: any = null, searchText: string = '') => {
        if (!formData.cariId) {
            toast.error(
                isAlis
                    ? t('orders.select_supplier_first_for_return', 'Sipariş satırı seçebilmek için önce Tedarikçi (Cari) seçmelisiniz.')
                    : t('orders.select_customer_first_for_return', 'Sipariş satırı seçebilmek için önce Müşteri (Cari) seçmelisiniz.')
            );
            const cariInput = document.getElementById('cariId');
            if (cariInput) cariInput.focus();
            return;
        }
        setSiparisAramaMetni(searchText || '');
        setActiveRowId(rowId);
        lastFocusedInputRef.current = document.activeElement;
        setSiparisSeciciModalOpen(true);
    };

    const handleSiparisKalemleriSelect = (mockSiparis: any, selectedItems: any[], overrideRowId: any = null) => {
        if (!selectedItems || selectedItems.length === 0) return;

        const targetRowId = overrideRowId || activeRowId;
        const defaultDepo = depolar.length > 0 ? depolar[0].id : '';
        const defaultKargo = kargoFirmalari.length > 0 ? kargoFirmalari[0].id : '';

        const buildRowFromSiparisKalem = (k: any, rowIdToAssign?: string) => {
            const miktar = parseFloat(k.miktar || 1);
            const listeFiyati = parseFloat(k.listeFiyati || 0);
            const kdvOrani = parseFloat(k.kdvOrani || 0);
            const kdvHaricFiyat = (k.kdvHaricFiyat !== undefined && k.kdvHaricFiyat !== null && Number(k.kdvHaricFiyat) > 0)
                ? parseFloat(k.kdvHaricFiyat)
                : (listeFiyati / (1 + kdvOrani / 100));
            const carpan = 1;
            const isk1Oran = parseFloat(k.iskonto1Oran || 0);
            const isk2Oran = parseFloat(k.iskonto2Oran || 0);
            const araToplam = miktar * (kdvHaricFiyat * carpan);
            const isk1Tutar = parseFloat((araToplam * (isk1Oran / 100)).toFixed(2));
            const is1Sonrasi = araToplam - isk1Tutar;
            const isk2Tutar = parseFloat((is1Sonrasi * (isk2Oran / 100)).toFixed(2));
            const kdvHaricTutar = araToplam - isk1Tutar - isk2Tutar;
            const kdvDahilTutar = kdvHaricTutar * (1 + kdvOrani / 100);

            return {
                id: rowIdToAssign || Math.random().toString(),
                kaynakSiparisId: k.siparisFisiId || mockSiparis?.id || null,
                kaynakSiparisKalemiId: k.id || null,
                siparisFisiNo: k.siparisFisiNo || k.belgeNo || mockSiparis?.belgeNo || '',
                siparisAramaMetni: '',
                urunVeHizmetKartiId: String(k.urunVeHizmetKartiId || ''),
                urunKodu: k.urunKodu || '',
                barkod: k.barkod || '',
                birimAdi: k.birimAdi || 'Adet',
                birimTipiId: k.birimTipiId || null,
                birimCarpan: 1,
                urunAdi: k.urunAdi || '',
                aramaMetni: '',
                koduAramaMetni: '',
                miktar,
                baseListeFiyati: listeFiyati,
                listeFiyati,
                kdvOrani,
                kdvHaricFiyat,
                iskonto1Oran: parseFloat(isk1Oran.toFixed(3)),
                iskonto1Tutar: isk1Tutar,
                iskonto2Oran: parseFloat(isk2Oran.toFixed(3)),
                iskonto2Tutar: isk2Tutar,
                kdvHaricTutar,
                kdvDahilTutar,
                brutTutar: kdvDahilTutar,
                sevkEdilenMiktar: 0,
                kalanMiktar: miktar,
                valorTarihi: k.valorTarihi ? k.valorTarihi.split('T')[0] : formData.tarih,
                depoId: k.depoId || defaultDepo,
                kargoFirmasiId: k.kargoFirmasiId || defaultKargo,
                teslimTarihi: k.teslimTarihi ? k.teslimTarihi.split('T')[0] : formData.tarih
            };
        };

        setKalemler(prev => {
            const existingKalemIds = new Set(
                prev
                    .filter(r => r.id !== targetRowId && r.kaynakSiparisKalemiId)
                    .map(r => Number(r.kaynakSiparisKalemiId))
            );
            const filteredItems = selectedItems.filter(k => !k.id || !existingKalemIds.has(Number(k.id)));
            if (filteredItems.length === 0) return prev;

            const targetIndex = targetRowId ? prev.findIndex(r => r.id === targetRowId) : -1;
            if (targetIndex !== -1) {
                const updated = [...prev];
                const firstRow = buildRowFromSiparisKalem(filteredItems[0], prev[targetIndex].id);
                const extraRows = filteredItems.slice(1).map(item => buildRowFromSiparisKalem(item));
                updated.splice(targetIndex, 1, firstRow, ...extraRows);
                return updated;
            } else {
                const nonEmptyRows = prev.filter(r => r.urunVeHizmetKartiId);
                const newRows = filteredItems.map(item => buildRowFromSiparisKalem(item));
                return [...nonEmptyRows, ...newRows];
            }
        });

        setSiparisSeciciModalOpen(false);
        setActiveRowId(null);
        if (onDirtyChange) onDirtyChange(true);
        setTimeout(() => lastFocusedInputRef.current?.focus(), 50);
    };

    const handleUrunSelect = (selectedItem, overrideRowId = null) => {
        const targetRowId = overrideRowId || activeRowId;
        setKalemler(prev => prev.map(row => {
            if (row.id === targetRowId) {
                const newRow = {
                    ...row,
                    urunVeHizmetKartiId: selectedItem.id.toString(),
                    urunKodu: selectedItem.kod || '',
                    barkod: selectedItem.barkod || '',
                    birimAdi: selectedItem.birimAdi || 'Adet',
                    birimTipiId: selectedItem.birimTipiId,
                    birimCarpan: 1, // Varsayılan olarak üründen gelen fiyat 1 çarpanlıdır
                    urunAdi: selectedItem.ad,
                    aramaMetni: '',
                    koduAramaMetni: '',
                    baseListeFiyati: selectedItem.satisFiyati || 0,
                    listeFiyati: selectedItem.satisFiyati || 0,
                    kdvOrani: selectedItem.satisKdvOrani || selectedItem.kdvOrani || 0
                };

                // Tutar hesaplama güncellemesi
                const miktar = parseFloat(newRow.miktar || 0);
                const fiyat = parseFloat(newRow.listeFiyati || 0);
                const carpan = parseFloat(newRow.birimCarpan || 1);
                const kdvOrani = parseFloat(newRow.kdvOrani || 0);
                const is1O = parseFloat(newRow.iskonto1Oran || 0);
                const is2O = parseFloat(newRow.iskonto2Oran || 0);

                newRow.kdvHaricFiyat = fiyat / (1 + kdvOrani / 100);

                let araToplam = miktar * (newRow.kdvHaricFiyat * carpan);
                newRow.iskonto1Tutar = araToplam * (is1O / 100);
                let is1S = araToplam - newRow.iskonto1Tutar;
                newRow.iskonto2Tutar = is1S * (is2O / 100);

                newRow.kdvHaricTutar = araToplam - newRow.iskonto1Tutar - newRow.iskonto2Tutar;
                newRow.kdvDahilTutar = newRow.kdvHaricTutar * (1 + kdvOrani / 100);
                newRow.brutTutar = newRow.kdvDahilTutar;
                newRow.kalanMiktar = miktar - (newRow.sevkEdilenMiktar || 0);

                if (!newRow.depoId) newRow.depoId = depolar.length > 0 ? depolar[0].id : '';
                if (!newRow.kargoFirmasiId) newRow.kargoFirmasiId = kargoFirmalari.length > 0 ? kargoFirmalari[0].id : '';
                if (!newRow.teslimTarihi) newRow.teslimTarihi = formData.tarih;

                return newRow;
            }
            return row;
        }));
        setUrunModalOpen(false);
        setActiveRowId(null);
        if (onDirtyChange) onDirtyChange(true);
        setTimeout(() => lastFocusedInputRef.current?.focus(), 50);
    };

    /**
     * Grid üzerinde barkod okutulduğunda tetiklenir.
     * İade fişlerinde carinin sipariş satırları içinde arar, normal sipariş fişlerinde ürün kartlarında arar.
     */
    const handleBarkodOkutuldu = async (rowId, barkod) => {
        if (!barkod) return;

        if (isIade) {
            if (!formData.cariId) {
                openIadeSiparisSecici(rowId, barkod);
                return;
            }
            try {
                const kaynakIslemTuru = isAlis ? 2 : 1;
                const res = await axios.get(`/api/SatisBelgeleri/AcikKalemler?cariId=${formData.cariId}&islemTuru=${kaynakIslemTuru}&tumKalemler=true`);
                const tumSatirlar = res.data || [];
                const mevcutKalemIds = new Set(
                    kalemler
                        .filter(k => k.id !== rowId && k.kaynakSiparisKalemiId)
                        .map(k => Number(k.kaynakSiparisKalemiId))
                );
                const eslesenler = tumSatirlar.filter((k: any) =>
                    !mevcutKalemIds.has(Number(k.id)) &&
                    (k.barkod === barkod || k.urunKodu === barkod)
                );
                if (eslesenler.length === 1) {
                    const secilen = eslesenler[0];
                    handleSiparisKalemleriSelect({ id: secilen.siparisFisiId, belgeNo: secilen.siparisFisiNo }, [secilen], rowId);
                } else {
                    openIadeSiparisSecici(rowId, barkod);
                }
            } catch (err) {
                console.error("Sipariş kalemlerinde barkod aranırken hata:", err);
                toast.error(t('orders.order_line_fetch_error', 'Sipariş satırları getirilirken bir hata oluştu.'));
            }
            return;
        }

        try {
            // Barkod'a tam eşleşme arıyoruz
            const res = await axios.get(`/api/UrunVeHizmetKartlari?barkod=${encodeURIComponent(barkod)}&aktifMi=true`);
            const data = res.data;
            if (data.toplam === 1) {
                // Sadece 1 kayıt bulunduysa otomatik seç
                const urun = data.veriler[0];
                handleUrunSelect(urun, rowId);
            } else if (data.toplam > 1 || data.toplam === 0) {
                // Eşleşen ürün yoksa (veya birden fazlaysa) Arama Metni olarak ayarla ve listeyi aç
                setUrunAramaMetni(barkod);
                setActiveRowId(rowId);
                setUrunModalOpen(true);
            }
        } catch (err) {
            console.error("Barkod aranırken hata:", err);
            toast.error(t('orders.product_info_fetch_error', 'Ürün bilgisi getirilirken bir hata oluştu.'));
        }
    };

    const validate = () => {
        const { isValid, errors: validationErrors } = validateSiparisForm(formData, kalemler, t, isIade);
        setErrors(validationErrors);

        if (validationErrors.genel) {
            toast.error(validationErrors.genel);
        }

        return isValid;
    };

    /**
     * Formu API'ye göndermeden önce kaydedilecek verileri (master ve kalemleri) formatlar.
     * Yeni kayıt (POST) veya güncelleme (PUT) işlemini gerçekleştirir.
     */
    const handleSave = async () => {
        if (!validate()) {
            return;
        }

        setLoading(true);
        try {
            const gecerliKalemler = kalemler.filter(k => k.urunVeHizmetKartiId);

            let totalBrut = 0;
            let totalIsk1 = 0;
            let totalIsk2 = 0;
            gecerliKalemler.forEach(k => {
                const sb = parseFloat(k.miktar || 0) * parseFloat(k.listeFiyati || 0) * parseFloat(k.birimCarpan || 1);
                totalBrut += sb;
                totalIsk1 += parseFloat(k.iskonto1Tutar || 0);
                totalIsk2 += parseFloat(k.iskonto2Tutar || 0);
            });
            const documentIskonto1Oran = totalBrut > 0 ? (totalIsk1 / totalBrut) * 100 : 0;
            const araToplamSonrasi = totalBrut - totalIsk1;
            const documentIskonto2Oran = araToplamSonrasi > 0 ? (totalIsk2 / araToplamSonrasi) * 100 : 0;

            const payload: any = {
                cariId: parseInt(formData.cariId) || null,
                belgeNo: formData.belgeNo || null,
                tarih: formData.tarih ? new Date(formData.tarih).toISOString() : null,
                islemTuru: getIslemTuruFromTip(tip),
                gecerlilikTarihi: formData.gecerlilikTarihi ? new Date(formData.gecerlilikTarihi).toISOString() : null,
                aciklama: formData.aciklama,
                disSistemId: formData.disSistemId || null,
                paraBirimi: formData.paraBirimi,
                siparisNotu: formData.siparisNotu,
                faturaUnvan: formData.faturaUnvan,
                vergiDairesi: formData.vergiDairesi,
                vergiNo: formData.vergiNo,
                faturaAdresiId: formData.faturaAdresIds?.genelAdresId || null,
                faturaAdresDetay: formData.faturaAdresIds || null,
                faturaAdresMetni: formData.faturaAdres || null,
                teslimAlacakKisi: formData.teslimAlacakKisi,
                nakliyeTelefon: formData.nakliyeTelefon,
                sevkAdresiId: formData.nakliyeAdresIds?.genelAdresId || null,
                sevkAdresDetay: formData.nakliyeAdresIds || null,
                sevkAdresMetni: formData.nakliyeAdres || null,
                iskonto1Oran: documentIskonto1Oran,
                iskonto2Oran: documentIskonto2Oran,
                kalemler: gecerliKalemler.map(k => ({
                    id: (k.id && !isNaN(k.id)) ? parseInt(k.id) : null,
                    urunVeHizmetKartiId: parseInt(k.urunVeHizmetKartiId),
                    miktar: parseFloat(k.miktar || 0),
                    listeFiyati: parseFloat(k.listeFiyati || 0) * parseFloat(k.birimCarpan || 1),
                    kdvOrani: parseFloat(k.kdvOrani || 0),
                    kdvHaricFiyat: parseFloat(k.kdvHaricFiyat || 0),
                    iskonto1Oran: parseFloat(k.iskonto1Oran || 0),
                    iskonto1Tutar: parseFloat(k.iskonto1Tutar || 0),
                    iskonto2Oran: parseFloat(k.iskonto2Oran || 0),
                    iskonto2Tutar: parseFloat(k.iskonto2Tutar || 0),
                    valorTarihi: k.valorTarihi ? new Date(k.valorTarihi).toISOString() : null,
                    depoId: k.depoId ? parseInt(k.depoId) : null,
                    kargoFirmasiId: k.kargoFirmasiId ? parseInt(k.kargoFirmasiId) : null,
                    teslimTarihi: k.teslimTarihi ? new Date(k.teslimTarihi).toISOString() : null,
                    kaynakSiparisId: k.kaynakSiparisId ? parseInt(k.kaynakSiparisId) : null,
                    kaynakSiparisKalemiId: k.kaynakSiparisKalemiId ? parseInt(k.kaynakSiparisKalemiId) : null,
                    kaynakSiparisNo: k.siparisFisiNo || k.kaynakSiparisNo || null
                }))
            };

            let res;
            const endpointBase = 'SatisBelgeleri';
            if (initialData?.id) {
                res = await axios.put(`/api/${endpointBase}/${initialData.id}`, payload);
            } else {
                res = await axios.post(`/api/${endpointBase}/siparis`, payload);
            }

            toast.success(t('orders.save_success', 'Sipariş başarıyla kaydedildi.'));
            if (onDirtyChange) onDirtyChange(false);
            if (onSuccess) onSuccess(res.data?.id);
            clearDraft();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.response?.data?.mesaj || t('orders.save_error', 'Kaydetme işlemi başarısız oldu.'));
        } finally {
            setLoading(false);
        }
    };

    const handleTopluIskontoKaydet = () => {
        const newKalemler = [...kalemler];

        let val1Oran = parseFloat(editIsk1Oran) || 0;
        let val1Tutar = parseFloat(editIsk1Tutar) || 0;

        let val2Oran = parseFloat(editIsk2Oran) || 0;
        let val2Tutar = parseFloat(editIsk2Tutar) || 0;

        const brutAraToplam = newKalemler.reduce((acc, row) => acc + ((row.miktar || 0) * (row.kdvHaricFiyat || 0) * (row.birimCarpan || 1)), 0);

        if (val1Oran > 0) {
            newKalemler.forEach(k => {
                const satirBrut = ((k.miktar || 0) * (k.kdvHaricFiyat || 0) * (k.birimCarpan || 1));
                k.iskonto1Oran = parseFloat(val1Oran.toFixed(3));
                k.iskonto1Tutar = parseFloat((satirBrut * (val1Oran / 100)).toFixed(2));
            });
        } else if (val1Tutar > 0 && brutAraToplam > 0) {
            newKalemler.forEach(k => {
                const satirBrut = ((k.miktar || 0) * (k.kdvHaricFiyat || 0) * (k.birimCarpan || 1));
                const distRatio = satirBrut / brutAraToplam;
                k.iskonto1Tutar = parseFloat((val1Tutar * distRatio).toFixed(2));
                k.iskonto1Oran = satirBrut > 0 ? parseFloat(((k.iskonto1Tutar / satirBrut) * 100).toFixed(3)) : 0;
            });
        } else if (val1Oran === 0 && val1Tutar === 0) {
            newKalemler.forEach(k => { k.iskonto1Oran = 0; k.iskonto1Tutar = 0; });
        }

        const newIsk1Toplam = newKalemler.reduce((acc, row) => acc + (row.iskonto1Tutar || 0), 0);
        const araToplamSonrasi = brutAraToplam - newIsk1Toplam;

        if (val2Oran > 0) {
            newKalemler.forEach(k => {
                const satirBrut = ((k.miktar || 0) * (k.kdvHaricFiyat || 0) * (k.birimCarpan || 1));
                const is1Sonrasi = satirBrut - (k.iskonto1Tutar || 0);
                k.iskonto2Oran = parseFloat(val2Oran.toFixed(3));
                k.iskonto2Tutar = parseFloat((is1Sonrasi * (val2Oran / 100)).toFixed(2));
            });
        } else if (val2Tutar > 0 && araToplamSonrasi > 0) {
            newKalemler.forEach(k => {
                const satirBrut = ((k.miktar || 0) * (k.kdvHaricFiyat || 0) * (k.birimCarpan || 1));
                const is1Sonrasi = satirBrut - (k.iskonto1Tutar || 0);
                const distRatio = is1Sonrasi / araToplamSonrasi;
                k.iskonto2Tutar = parseFloat((val2Tutar * distRatio).toFixed(2));
                k.iskonto2Oran = is1Sonrasi > 0 ? parseFloat(((k.iskonto2Tutar / is1Sonrasi) * 100).toFixed(3)) : 0;
            });
        } else if (val2Oran === 0 && val2Tutar === 0) {
            newKalemler.forEach(k => { k.iskonto2Oran = 0; k.iskonto2Tutar = 0; });
        }

        newKalemler.forEach(k => {
            const satirBrut = ((k.miktar || 0) * (k.kdvHaricFiyat || 0) * (k.birimCarpan || 1));
            k.kdvHaricTutar = satirBrut - (k.iskonto1Tutar || 0) - (k.iskonto2Tutar || 0);
            k.kdvDahilTutar = k.kdvHaricTutar * (1 + (k.kdvOrani || 0) / 100);
        });

        setKalemler(newKalemler);
        if (onDirtyChange) onDirtyChange(true);
    };



    const brütAraToplam = kalemler.reduce((acc, row) => acc + ((row.miktar || 0) * (row.kdvHaricFiyat || 0) * (row.birimCarpan || 1)), 0);
    const iskonto1Toplam = kalemler.reduce((acc, row) => acc + (row.iskonto1Tutar || 0), 0);
    const iskonto2Toplam = kalemler.reduce((acc, row) => acc + (row.iskonto2Tutar || 0), 0);
    const araToplam = brütAraToplam - iskonto1Toplam - iskonto2Toplam;
    const kdvToplam = kalemler.reduce((acc, row) => acc + ((row.kdvDahilTutar || 0) - (row.kdvHaricTutar || 0)), 0);
    const genelToplam = araToplam + kdvToplam;

    const handleIsk1OranChange = (val) => {
        setEditIsk1Oran(val);
        const num = parseFloat(val.replace(',', '.')) || 0;
        if (val === '') setEditIsk1Tutar('');
        else setEditIsk1Tutar(parseFloat((brütAraToplam * (num / 100)).toFixed(2)).toString());
    };

    const handleIsk1TutarChange = (val) => {
        setEditIsk1Tutar(val);
        const num = parseFloat(val.replace(',', '.')) || 0;
        if (val === '') setEditIsk1Oran('');
        else setEditIsk1Oran(brütAraToplam > 0 ? parseFloat(((num / brütAraToplam) * 100).toFixed(3)).toString() : '0');
    };

    const handleIsk2OranChange = (val) => {
        setEditIsk2Oran(val);
        const num = parseFloat(val.replace(',', '.')) || 0;
        const is1Tutar = parseFloat(editIsk1Tutar.replace(',', '.')) || 0;
        const araToplamSonrasi = brütAraToplam - is1Tutar;
        if (val === '') setEditIsk2Tutar('');
        else setEditIsk2Tutar(parseFloat((araToplamSonrasi * (num / 100)).toFixed(2)).toString());
    };

    const handleIsk2TutarChange = (val) => {
        setEditIsk2Tutar(val);
        const num = parseFloat(val.replace(',', '.')) || 0;
        const is1Tutar = parseFloat(editIsk1Tutar.replace(',', '.')) || 0;
        const araToplamSonrasi = brütAraToplam - is1Tutar;
        if (val === '') setEditIsk2Oran('');
        else setEditIsk2Oran(araToplamSonrasi > 0 ? parseFloat(((num / araToplamSonrasi) * 100).toFixed(3)).toString() : '0');
    };

    const activeIsk1Tutar = isEditingAltToplam ? (parseFloat(editIsk1Tutar.replace(',', '.')) || 0) : iskonto1Toplam;
    const activeIsk2Tutar = isEditingAltToplam ? (parseFloat(editIsk2Tutar.replace(',', '.')) || 0) : iskonto2Toplam;
    const activeAraToplam = brütAraToplam - activeIsk1Tutar - activeIsk2Tutar;

    const docIsk1Oran = brütAraToplam > 0 ? (activeIsk1Tutar / brütAraToplam) * 100 : 0;
    const araToplamSonrasi = brütAraToplam - activeIsk1Tutar;
    const docIsk2Oran = araToplamSonrasi > 0 ? (activeIsk2Tutar / araToplamSonrasi) * 100 : 0;

    let activeKdvToplam = 0;
    if (isEditingAltToplam) {

        kalemler.forEach(k => {
            if (k.urunVeHizmetKartiId) {
                const satirBrut = ((k.miktar || 0) * (k.kdvHaricFiyat || 0) * (k.birimCarpan || 1));
                const satirIsk1 = satirBrut * (docIsk1Oran / 100);
                const satirIsk1Sonrasi = satirBrut - satirIsk1;
                const satirIsk2 = satirIsk1Sonrasi * (docIsk2Oran / 100);
                const satirMatrah = satirBrut - satirIsk1 - satirIsk2;
                activeKdvToplam += satirMatrah * ((k.kdvOrani || 0) / 100);
            }
        });
    } else {
        activeKdvToplam = kdvToplam;
    }

    const activeGenelToplam = activeAraToplam + activeKdvToplam;

    const ortalamaValorTarihi = React.useMemo(() => {
        let toplamTutar = 0;
        let agirlikliZamanToplami = 0;

        kalemler.forEach(row => {
            if (row.brutTutar && row.valorTarihi) {
                const tutar = row.brutTutar;
                const timestamp = new Date(row.valorTarihi).getTime();
                if (!isNaN(timestamp)) {
                    toplamTutar += tutar;
                    agirlikliZamanToplami += (tutar * timestamp);
                }
            }
        });

        if (toplamTutar === 0 || agirlikliZamanToplami === 0) return null;

        const ortalamaTimestamp = agirlikliZamanToplami / toplamTutar;
        return new Date(ortalamaTimestamp).toLocaleDateString('tr-TR');
    }, [kalemler]);

    const gridColumns = [
        ...(isIade ? [{
            id: 'siparisFisiNo',
            header: t('orders.order_slip_no', 'Sipariş No'),
            width: '150px',
            render: (row) => (
                <SiparisSeciciInput
                    value={row.siparisAramaMetni !== undefined && row.siparisAramaMetni !== '' ? row.siparisAramaMetni : (row.siparisFisiNo || '')}
                    onChange={(e) => handleRowChange(row.id, 'siparisAramaMetni', e.target ? e.target.value : e)}
                    onKeyDown={(e) => {
                        if ((e.key === 'Tab' || e.key === 'Enter') && (row.siparisAramaMetni || !row.kaynakSiparisKalemiId) && !e.shiftKey) {
                            if (!row.kaynakSiparisKalemiId) {
                                e.preventDefault();
                                openIadeSiparisSecici(row.id, row.siparisAramaMetni || '');
                            }
                        }
                    }}
                    onMenuClick={() => {
                        openIadeSiparisSecici(row.id, row.siparisAramaMetni || row.siparisFisiNo || '');
                    }}
                    hasSelection={!!(row.kaynakSiparisKalemiId || row.siparisFisiNo)}
                    onClear={() => handleClearRow(row.id)}
                    placeholder={t('orders.select_from_order', 'Siparişten Seç...')}
                    detailsUrl={row.kaynakSiparisId ? `/${isAlis ? 'verilen-siparisler' : 'alinan-siparisler'}/duzenle/${row.kaynakSiparisId}` : null}
                />
            )
        }] : []),
        {
            id: 'urunKodu',
            header: t('orders.product_code', 'Ürün Kodu'),
            width: '120px',
            render: (row) => (
                <UrunSeciciInput
                    value={row.koduAramaMetni || row.urunKodu}
                    onChange={(e) => handleRowChange(row.id, 'koduAramaMetni', e.target.value)}
                    onKeyDown={(e) => {
                        if ((e.key === 'Tab' || e.key === 'Enter') && row.koduAramaMetni && !e.shiftKey) {
                            if (!row.urunVeHizmetKartiId) {
                                e.preventDefault();
                                if (isIade) {
                                    openIadeSiparisSecici(row.id, row.koduAramaMetni);
                                } else {
                                    setUrunAramaMetni(row.koduAramaMetni);
                                    setActiveRowId(row.id);
                                    lastFocusedInputRef.current = document.activeElement;
                                    setUrunModalOpen(true);
                                }
                            }
                        }
                    }}
                    onMenuClick={() => {
                        if (isIade) {
                            openIadeSiparisSecici(row.id, row.koduAramaMetni || row.urunKodu);
                        } else {
                            setUrunAramaMetni(row.koduAramaMetni || row.urunKodu);
                            setActiveRowId(row.id);
                            lastFocusedInputRef.current = document.activeElement;
                            setUrunModalOpen(true);
                        }
                    }}
                    hasSelection={!!row.urunVeHizmetKartiId}
                    onClear={() => handleClearRow(row.id)}
                    placeholder={t('orders.code_placeholder', 'Kodu...')}
                    detailsUrl={row.urunVeHizmetKartiId ? `/popup/urun-ve-hizmetler/form?id=${row.urunVeHizmetKartiId}` : null}
                />
            )
        },
        {
            id: 'urun',
            header: t('orders.product_or_service', 'Ürün / Hizmet'),
            width: '250px',
            render: (row) => (
                <UrunSeciciInput
                    value={row.aramaMetni || row.urunAdi}
                    onChange={(e) => handleRowChange(row.id, 'aramaMetni', e.target.value)}
                    onKeyDown={(e) => {
                        if ((e.key === 'Tab' || e.key === 'Enter') && row.aramaMetni && !e.shiftKey) {
                            if (!row.urunVeHizmetKartiId) {
                                e.preventDefault();
                                if (isIade) {
                                    openIadeSiparisSecici(row.id, row.aramaMetni);
                                } else {
                                    setUrunAramaMetni(row.aramaMetni);
                                    setActiveRowId(row.id);
                                    lastFocusedInputRef.current = document.activeElement;
                                    setUrunModalOpen(true);
                                }
                            }
                        }
                    }}
                    onMenuClick={() => {
                        if (isIade) {
                            openIadeSiparisSecici(row.id, row.aramaMetni || row.urunAdi);
                        } else {
                            setUrunAramaMetni(row.aramaMetni || row.urunAdi);
                            setActiveRowId(row.id);
                            lastFocusedInputRef.current = document.activeElement;
                            setUrunModalOpen(true);
                        }
                    }}
                    hasSelection={!!row.urunVeHizmetKartiId}
                    onClear={() => handleClearRow(row.id)}
                    placeholder={isIade ? t('orders.select_order_line_placeholder', 'Sipariş Satırı Seç...') : undefined}
                    detailsUrl={row.urunVeHizmetKartiId ? `/popup/urun-ve-hizmetler/form?id=${row.urunVeHizmetKartiId}` : null}
                />
            )
        },
        {
            id: 'barkod',
            header: t('orders.barcode', 'Barkod'),
            width: '120px',
            render: (row) => (
                <BarcodeScannerInput
                    inputClassName="form-control siparis-grid-barcode-input"
                    value={row.barkod}
                    onChange={(e) => handleRowChange(row.id, 'barkod', e.target.value)}
                    onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === 'Tab') && row.barkod && !e.shiftKey) {
                            if (!row.urunVeHizmetKartiId) {
                                e.preventDefault();
                                handleBarkodOkutuldu(row.id, row.barkod);
                            }
                        }
                    }}
                    onScan={(scannedText) => {
                        handleRowChange(row.id, 'barkod', scannedText);
                        handleBarkodOkutuldu(row.id, scannedText);
                    }}
                />
            )
        },
        {
            id: 'miktar',
            header: t('orders.quantity', 'Miktar'),
            width: '100px',
            render: (row) => (
                <input
                    type="number"
                    className="form-control siparis-grid-cell-input"
                    value={row.miktar}
                    min="0"
                    step="0.01"
                    onChange={(e) => handleRowChange(row.id, 'miktar', e.target.value)}
                />
            )
        },
        {
            id: 'birim',
            header: t('orders.unit', 'Birim'),
            width: '100px',
            render: (row) => (
                <BirimSecici
                    value={row.birimAdi || 'Adet'}
                    birimTipiId={row.birimTipiId}
                    disabled={!row.urunVeHizmetKartiId}
                    matchByName={true}
                    variant="grid"
                    onChange={(id, birimObj) => handleBirimChange(row.id, birimObj)}
                />
            )
        },
        {
            id: 'kdvHaricFiyat',
            header: t('orders.unit_price_excl_vat', 'KDV Hariç B. Fiyat'),
            width: '130px',
            render: (row) => (
                <CurrencyInput
                    className="form-control siparis-grid-cell-input"
                    value={row.kdvHaricFiyat}
                    onChange={(e) => handleRowChange(row.id, 'kdvHaricFiyat', e.target.value)}
                />
            )
        },
        {
            id: 'fiyat',
            header: t('orders.unit_price', 'B. Fiyatı'),
            width: '120px',
            render: (row) => (
                <CurrencyInput
                    className="form-control siparis-grid-cell-input"
                    value={row.listeFiyati}
                    onChange={(e) => handleRowChange(row.id, 'listeFiyati', e.target.value)}
                />
            )
        },
        {
            id: 'kdvOrani',
            header: t('orders.vat_rate', 'KDV (%)'),
            width: '80px',
            render: (row) => (
                <input
                    type="number"
                    className="form-control siparis-grid-cell-input"
                    value={row.kdvOrani}
                    min="0"
                    step="1"
                    onChange={(e) => handleRowChange(row.id, 'kdvOrani', e.target.value)}
                />
            )
        },
        {
            id: 'iskonto1Oran',
            header: t('orders.disc1_rate', 'İsk.1 (%)'),
            width: '80px',
            render: (row) => (
                <input
                    type="number"
                    className="form-control siparis-grid-cell-input"
                    value={row.iskonto1Oran}
                    min="0"
                    step="1"
                    onChange={(e) => handleRowChange(row.id, 'iskonto1Oran', e.target.value)}
                />
            )
        },
        {
            id: 'iskonto1Tutar',
            header: t('orders.disc1_amount', 'İsk.1 Tutar'),
            width: '110px',
            render: (row) => (
                <CurrencyInput
                    className="form-control siparis-grid-cell-input"
                    value={row.iskonto1Tutar}
                    onChange={(e) => handleRowChange(row.id, 'iskonto1Tutar', e.target.value)}
                />
            )
        },
        {
            id: 'iskonto2Oran',
            header: t('orders.disc2_rate', 'İsk.2 (%)'),
            width: '80px',
            render: (row) => (
                <input
                    type="number"
                    className="form-control siparis-grid-cell-input"
                    value={row.iskonto2Oran}
                    min="0"
                    step="1"
                    onChange={(e) => handleRowChange(row.id, 'iskonto2Oran', e.target.value)}
                />
            )
        },
        {
            id: 'iskonto2Tutar',
            header: t('orders.disc2_amount', 'İsk.2 Tutar'),
            width: '110px',
            render: (row) => (
                <CurrencyInput
                    className="form-control siparis-grid-cell-input"
                    value={row.iskonto2Tutar}
                    onChange={(e) => handleRowChange(row.id, 'iskonto2Tutar', e.target.value)}
                />
            )
        },
        {
            id: 'kdvHaricTutar',
            header: t('orders.amount_excl_vat', 'KDV Hariç Tutar'),
            width: '130px',
            render: (row) => (
                <CurrencyInput
                    className="form-control siparis-grid-cell-input"
                    value={row.kdvHaricTutar}
                    onChange={(e) => handleRowChange(row.id, 'kdvHaricTutar', e.target.value)}
                />
            )
        },
        {
            id: 'tutar',
            header: t('common.total', 'Toplam'),
            width: '120px',
            render: (row) => (
                <CurrencyInput
                    className="form-control siparis-grid-cell-input"
                    value={row.kdvDahilTutar}
                    onChange={(e) => handleRowChange(row.id, 'kdvDahilTutar', e.target.value)}
                />
            )
        },
        {
            id: 'valorTarihi',
            header: t('orders.value_date', 'Valör Tarihi'),
            width: '130px',
            render: (row) => (
                <DateInput
                    className="form-control siparis-grid-cell-input"
                    value={row.valorTarihi || ''}
                    onChange={(e) => handleRowChange(row.id, 'valorTarihi', e.target.value)}
                />
            )
        },
        {
            id: 'depo',
            header: t('common.warehouse', 'Depo'),
            width: '150px',
            render: (row) => (
                <select
                    className="form-control siparis-grid-cell-input"
                    value={row.depoId || ''}
                    onChange={(e) => handleRowChange(row.id, 'depoId', e.target.value)}
                >
                    <option value="">{t('auto_seciniz_501d')}</option>
                    {depolar.map(d => (
                        <option key={d.id} value={d.id}>{d.ad}</option>
                    ))}
                </select>
            )
        },
        {
            id: 'kargoFirmasi',
            header: t('orders.shipping_company', 'Nakliye Firması'),
            width: '150px',
            render: (row) => (
                <select
                    className="form-control siparis-grid-cell-input"
                    value={row.kargoFirmasiId || ''}
                    onChange={(e) => handleRowChange(row.id, 'kargoFirmasiId', e.target.value)}
                >
                    <option value="">{t('auto_seciniz_501d')}</option>
                    {kargoFirmalari.map(k => (
                        <option key={k.id} value={k.id}>{k.ad}</option>
                    ))}
                </select>
            )
        },
        {
            id: 'teslimTarihi',
            header: t('orders.delivery_date', 'Teslim Tarihi'),
            width: '130px',
            isLastFocusable: true,
            render: (row) => (
                <DateInput
                    className="form-control siparis-grid-cell-input"
                    value={row.teslimTarihi || ''}
                    onChange={(e) => handleRowChange(row.id, 'teslimTarihi', e.target.value)}
                />
            )
        },
        {
            id: 'sevk',
            header: t('orders.shipped_remaining', 'Sevk/Kalan'),
            width: '180px',
            padding: '0 12px',
            render: (row) => (
                <div className="siparis-grid-sevk-wrap">
                    <span className="siparis-grid-sevk-badge is-sent" title={t('orders.shipped', 'Sevk Edilen')}>
                        {row.sevkEdilenMiktar || 0} {t('orders.sent_short', 'Gitti')}
                    </span>
                    <span className="siparis-grid-sevk-badge is-remaining" title={t('orders.pending', 'Bekleyen')}>
                        {row.kalanMiktar || row.miktar || 0} {t('orders.remaining_short', 'Kalan')}
                    </span>
                </div>
            )
        }
    ];

    const campaignActions = React.useMemo(() => {
        if (!isCampaignEligible) return [];
        return [
            {
                label: (kampanyaAnalizSonucu?.uygulanabilirKampanyalar?.length || 0) > 0
                    ? `${t('Kampanyalar')} (${kampanyaAnalizSonucu?.uygulanabilirKampanyalar?.length} ${t('Uygulanabilir')})`
                    : t('Kampanyalar ve Fırsatlar'),
                icon: <Sparkles size={16} />,
                onClick: () => setKampanyaModalOpen(true)
            },
            ...(uygulananKampanya ? [{
                label: t('Kampanyayı Kaldır'),
                icon: <Trash2 size={16} />,
                onClick: () => handleKampanyaKaldir(),
                danger: true
            }] : [])
        ];
    }, [isCampaignEligible, kampanyaAnalizSonucu, uygulananKampanya, t]);

    const siparisActionMenu = useSiparisActionMenu({
        activeTab,
        formData,
        onAddressChange: handleMasterChange,
        extraDropdownActions: campaignActions
    });

    return (
        <>
            <BaseDocumentPage
                formId="redesignForm"
                onSubmit={handleSave}
                minFooterHeight={60}
                maxFooterHeight={200}
                documentId={initialData?.id}
                documentType={getBelgeIdFromTip(tip)}
                documentNo={formData.belgeNo}
                errors={errors}
                tabs={tabs}
                activeTabId={activeTab}
                onTabChange={setActiveTab}
                settingsColumnPosition="inline"
                isSaving={loading}
                currencyProps={{
                    value: formData.paraBirimi,
                    onChange: (pb) => handleMasterChange('paraBirimi', pb)
                }}
                actionMenuTrigger={siparisActionMenu.actionMenuTrigger}
                actionMenuDropdownHeader={siparisActionMenu.actionMenuDropdownHeader}
                onActionMenuTriggerClick={siparisActionMenu.onActionMenuTriggerClick}
                extraDropdownActions={siparisActionMenu.extraDropdownActions}
                headerContent={
                    <>
                        {activeTab === 1 && isCampaignEligible && (
                            <>
                                {uygulananKampanya ? (
                                    <div className="kampanya-applied-banner">
                                        <div className="flex items-center gap-8 text-xs font-semibold">
                                            <Sparkles size={16} className="text-primary" />
                                            <span>
                                                {t('Uygulanan Kampanya: {{adi}}', { adi: uygulananKampanya.kampanyaAdi })}
                                                {uygulananKampanya.aksiyonTipi === 1 && ` (%${uygulananKampanya.aksiyonDegeri} ${t('İndirim')})`}
                                                {uygulananKampanya.aksiyonTipi === 2 && ` (${uygulananKampanya.aksiyonDegeri?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ ${t('İndirim')})`}
                                                {uygulananKampanya.aksiyonTipi === 3 && ` (${t('Hediye Ürün')})`}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-8">
                                            <button
                                                type="button"
                                                className="btn-link text-xs font-bold text-primary flex items-center gap-4 cursor-pointer"
                                                onClick={() => setKampanyaModalOpen(true)}
                                            >
                                                {t('Detaylar')} <ArrowRight size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-outline-danger flex items-center gap-4 cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleKampanyaKaldir();
                                                }}
                                            >
                                                <Trash2 size={13} />
                                                {t('Kampanyayı Kaldır')}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    (kampanyaAnalizSonucu?.uygulanabilirKampanyalar?.length || 0) > 0 && (
                                        <div
                                            className="kampanya-alert-banner"
                                            onClick={() => setKampanyaModalOpen(true)}
                                        >
                                            <div className="flex items-center gap-8 text-xs font-semibold text-success">
                                                <Sparkles size={16} />
                                                <span>{t('Bu sipariş için {{count}} adet uygulanabilir kampanya bulundu!', { count: kampanyaAnalizSonucu?.uygulanabilirKampanyalar.length })}</span>
                                            </div>
                                            <span className="text-xs font-bold text-success flex items-center gap-4">
                                                {t('İncele & Uygula')} <ArrowRight size={14} />
                                            </span>
                                        </div>
                                    )
                                )}
                            </>
                        )}

                        {activeTab === 1 && (
                            <div className="form-grid">
                                <DocumentHeaderField name="tarih" label={t('common.date', 'Tarih')} required>
                                    <DateInput
                                        id="tarihInput"
                                        name="tarih"
                                        className="form-input"
                                        value={formData.tarih}
                                        onChange={(e: any) => handleMasterChange('tarih', e.target ? e.target.value : e)}
                                        required
                                    />
                                </DocumentHeaderField>
                                <DocumentHeaderField name="belgeNo" label={t('orders.doc_no', 'Belge No')}>
                                    <div className="input-with-icon">
                                        <span className="icon"><FileText size={16} /></span>
                                        <input
                                            type="text"
                                            name="belgeNo"
                                            className="form-input"
                                            value={formData.belgeNo || ''}
                                            onChange={(e) => handleMasterChange('belgeNo', e.target.value)}
                                            disabled={belgeAyar?.otomatikNumaraVerilsinMi}
                                            placeholder={belgeAyar?.otomatikNumaraVerilsinMi ? t('orders.auto_number_placeholder', '[OTOMATIK]') : t('orders.doc_no_placeholder', 'Belge No Giriniz')}
                                            autoFocus={!belgeAyar?.otomatikNumaraVerilsinMi}
                                        />
                                    </div>
                                </DocumentHeaderField>
                                <DocumentHeaderField name="cariId" label={isAlis ? t('orders.supplier', 'Tedarikçi') : t('orders.customer', 'Müşteri')} required>
                                    <CariSeciciInput
                                        value={formData.cariMetni || formData.cariUnvan || ''}
                                        onChange={(e) => handleMasterChange('cariMetni', e.target.value)}
                                        onKeyDown={handleCariKeyDown}
                                        onMenuClick={() => {
                                            setCariAramaMetni(formData.cariMetni || formData.cariUnvan || '');
                                            setCariModalOpen(true);
                                        }}
                                        onSelect={handleCariSelect}
                                        hasSelection={!!formData.cariId}
                                        onClear={() => {
                                            handleMasterChange('cariId', '');
                                            handleMasterChange('cariMetni', '');
                                            handleMasterChange('cariUnvan', '');
                                            if (isIade) {
                                                const defaultDepo = depolar.length > 0 ? depolar[0].id : '';
                                                const defaultKargo = kargoFirmalari.length > 0 ? kargoFirmalari[0].id : '';
                                                setKalemler([
                                                    { id: Math.random().toString(), kaynakSiparisId: null, kaynakSiparisKalemiId: null, siparisFisiNo: '', siparisAramaMetni: '', urunVeHizmetKartiId: '', urunKodu: '', barkod: '', birimAdi: '', birimTipiId: null, birimCarpan: 1, urunAdi: '', aramaMetni: '', koduAramaMetni: '', miktar: 1, baseListeFiyati: 0, listeFiyati: 0, kdvOrani: 0, kdvHaricFiyat: 0, iskonto1Oran: 0, iskonto1Tutar: 0, iskonto2Oran: 0, iskonto2Tutar: 0, kdvHaricTutar: 0, kdvDahilTutar: 0, brutTutar: 0, sevkEdilenMiktar: 0, kalanMiktar: 1, valorTarihi: formData.tarih, depoId: defaultDepo, kargoFirmasiId: defaultKargo, teslimTarihi: formData.tarih }
                                                ]);
                                            }
                                        }}
                                        detailsUrl={formData.cariId ? `/cariler?id=${formData.cariId}` : null}
                                        placeholder={isAlis ? t('orders.select_supplier', 'Tedarikçi Ara veya Seç...') : t('orders.select_customer', 'Müşteri Ara veya Seç...')}
                                        autoFocus={belgeAyar?.otomatikNumaraVerilsinMi}
                                    />
                                </DocumentHeaderField>
                            </div>
                        )}

                        {activeTab === 2 && (
                            <div className="form-grid">
                                <DocumentHeaderField label={t('auto_teslim_alacak_kisi_bea9', 'Teslim Alacak Kişi')}>
                                    <div className="input-with-icon">
                                        <span className="icon"><User size={16} /></span>
                                        <input
                                            type="text"
                                            name="teslimAlacakKisi"
                                            className="form-input"
                                            value={formData.teslimAlacakKisi || ''}
                                            onChange={(e) => handleMasterChange('teslimAlacakKisi', e.target.value)}
                                            placeholder={t('auto_isim_soyisim', 'İsim Soyisim')}
                                        />
                                    </div>
                                </DocumentHeaderField>

                                <DocumentHeaderField label={t('auto_iletisim_numarasi', 'İletişim Numarası')}>
                                    <PhoneInput
                                        name="nakliyeTelefon"
                                        value={formData.nakliyeTelefon || ''}
                                        onChange={(val) => handleMasterChange('nakliyeTelefon', val)}
                                        placeholder={t('auto_telefon', 'Telefon')}
                                    />
                                </DocumentHeaderField>

                                <div className="col-span-full">
                                    <AdresInput
                                        ilId={formData.nakliyeIlId}
                                        ilceId={formData.nakliyeIlceId}
                                        ilAdi={formData.nakliyeIlAdi}
                                        ilceAdi={formData.nakliyeIlceAdi}
                                        acikAdres={formData.nakliyeAdres}
                                        adresLabel={t('auto_teslimat_adresi_label', 'Teslimat / Sevk Adresi')}
                                        onChange={(val) => {
                                            handleMasterChange('nakliyeIlId', val.ilId);
                                            handleMasterChange('nakliyeIlceId', val.ilceId);
                                            handleMasterChange('nakliyeIlAdi', val.ilAdi);
                                            handleMasterChange('nakliyeIlceAdi', val.ilceAdi);
                                            handleMasterChange('nakliyeAdres', val.acikAdres || val.adres || '');
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 3 && (
                            <div className="form-grid">
                                <DocumentHeaderField label={t('auto_fatura_unvani', 'Fatura Ünvanı')} fullWidth>
                                    <div className="input-with-icon">
                                        <span className="icon"><Building size={16} /></span>
                                        <input
                                            type="text"
                                            name="faturaUnvan"
                                            className="form-input"
                                            value={formData.faturaUnvan || ''}
                                            onChange={(e) => handleMasterChange('faturaUnvan', e.target.value)}
                                            placeholder={t('auto_fatura_unvani_placeholder', 'Fatura ünvanı...')}
                                        />
                                    </div>
                                </DocumentHeaderField>
                                <DocumentHeaderField label={t('Vergi Dairesi', 'Vergi Dairesi')}>
                                    <div className="input-with-icon">
                                        <span className="icon"><FileText size={16} /></span>
                                        <input
                                            type="text"
                                            name="vergiDairesi"
                                            className="form-input"
                                            value={formData.vergiDairesi || ''}
                                            onChange={(e) => handleMasterChange('vergiDairesi', e.target.value)}
                                            placeholder={t('auto_vergi_dairesi_placeholder', 'Vergi dairesi...')}
                                        />
                                    </div>
                                </DocumentHeaderField>
                                <DocumentHeaderField label={t('Vergi No', 'Vergi No')}>
                                    <div className="input-with-icon">
                                        <span className="icon"><FileText size={16} /></span>
                                        <input
                                            type="text"
                                            name="vergiNo"
                                            className="form-input"
                                            value={formData.vergiNo || ''}
                                            onChange={(e) => handleMasterChange('vergiNo', e.target.value)}
                                            placeholder={t('auto_vergi_no_placeholder', 'Vergi no...')}
                                        />
                                    </div>
                                </DocumentHeaderField>
                                <div className="col-span-full">
                                    <AdresInput
                                        ilId={formData.faturaIlId}
                                        ilceId={formData.faturaIlceId}
                                        ilAdi={formData.faturaIlAdi}
                                        ilceAdi={formData.faturaIlceAdi}
                                        acikAdres={formData.faturaAdres}
                                        adresLabel={t('auto_fatura_adresi_label', 'Fatura Adresi')}
                                        onChange={(val) => {
                                            handleMasterChange('faturaIlId', val.ilId);
                                            handleMasterChange('faturaIlceId', val.ilceId);
                                            handleMasterChange('faturaIlAdi', val.ilAdi);
                                            handleMasterChange('faturaIlceAdi', val.ilceAdi);
                                            handleMasterChange('faturaAdres', val.acikAdres || val.adres || '');
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 4 && (
                            <div className="form-grid">
                                <DocumentHeaderField label={t('orders.description_or_note', 'Açıklama / Sipariş Notu')} fullWidth>
                                    <NotInput
                                        name="aciklama"
                                        value={formData.aciklama || ''}
                                        onChange={(e) => handleMasterChange('aciklama', e.target.value)}
                                        placeholder={t('orders.general_notes_placeholder', 'Siparişe ait genel notlar...')}
                                        rows={4}
                                    />
                                </DocumentHeaderField>
                            </div>
                        )}
                    </>
                }
                gridProps={{
                    columns: gridColumns,
                    data: displayedKalemler,
                    onAddRow: handleAddRow,
                    striped: true,
                    onRemoveRow: (rowIndex) => handleRemoveRow(displayedKalemler[rowIndex].id),
                    isEmptyRow: (row) => !row.urunVeHizmetKartiId,
                    initialVisibleColumns: isIade && belgeAyar?.gorunenKolonlar && !belgeAyar.gorunenKolonlar.includes('siparisFisiNo')
                        ? ['siparisFisiNo', ...belgeAyar.gorunenKolonlar]
                        : belgeAyar?.gorunenKolonlar,
                    initialColumnWidths: belgeAyar?.kolonGenislikleri,
                    onConfigChange: handleGridConfigChange,
                    onSort: handleSort,
                    additionalAddActions: isIade ? [
                        {
                            label: isAlis
                                ? t('orders.select_from_given_orders', 'Verilen Siparişlerden Satır Seç')
                                : t('orders.select_from_received_orders', 'Alınan Siparişlerden Satır Seç'),
                            icon: <ShoppingCart size={16} />,
                            onClick: () => openIadeSiparisSecici(null, '')
                        }
                    ] : undefined,
                    mobileCardRender: (row, index) => (
                        <div className="siparis-grid-mobile-card">
                            <div className="siparis-grid-mobile-title">
                                {row.urunAdi || row.aramaMetni || row.urunKodu || t('orders.new_product_or_service', 'Yeni Ürün / Hizmet')}
                            </div>
                            <div className="siparis-grid-mobile-row">
                                <span>{row.miktar} {row.birimAdi || t('common.piece', 'Adet')}</span>
                                <span className="siparis-grid-mobile-amount">
                                    {getCurrencySymbol(formData.paraBirimi)}{(row.brutTutar || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            {row.kdvHaricFiyat > 0 && (
                                <div className="siparis-grid-mobile-sub">
                                    {t('orders.unit_price_label', 'Birim Fiyat')}: {getCurrencySymbol(formData.paraBirimi)}{(row.kdvHaricFiyat || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            )}
                        </div>
                    )
                }}
                footerContent={
                    <DocumentResultPanelsGroup align="end">
                        <DocumentResultPanel
                            title={t('Alt Toplam')}
                            variant="primary"
                            readOnly={false}
                            hideAddButton={true}
                            minWidth={320}
                            maxWidth={400}
                            onEditStart={() => {
                                setIsEditingAltToplam(true);
                                const docIsk1Oran = brütAraToplam > 0 ? (iskonto1Toplam / brütAraToplam) * 100 : 0;
                                const docIsk2Oran = (brütAraToplam - iskonto1Toplam) > 0 ? (iskonto2Toplam / (brütAraToplam - iskonto1Toplam)) * 100 : 0;

                                setEditIsk1Oran(iskonto1Toplam > 0 ? parseFloat(docIsk1Oran.toFixed(3)).toString() : '');
                                setEditIsk1Tutar(iskonto1Toplam > 0 ? parseFloat(iskonto1Toplam.toFixed(2)).toString() : '');
                                setEditIsk2Oran(iskonto2Toplam > 0 ? parseFloat(docIsk2Oran.toFixed(3)).toString() : '');
                                setEditIsk2Tutar(iskonto2Toplam > 0 ? parseFloat(iskonto2Toplam.toFixed(2)).toString() : '');
                            }}
                            onCancel={() => {
                                setIsEditingAltToplam(false);
                                setEditIsk1Oran('');
                                setEditIsk1Tutar('');
                                setEditIsk2Oran('');
                                setEditIsk2Tutar('');
                            }}
                            onSave={() => {
                                setIsEditingAltToplam(false);
                                handleTopluIskontoKaydet();
                            }}
                            items={[
                                {
                                    id: 'araToplam',
                                    label: t('Ara Toplam'),
                                    value: `${brütAraToplam.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${getCurrencySymbol(formData.paraBirimi)}`,
                                    isEditable: false,
                                    visibilityRule: 'p3'
                                },
                                {
                                    id: 'isk1',
                                    label: docIsk1Oran > 0 ? `${t('İsk1')} (%${parseFloat(docIsk1Oran.toFixed(3))})` : t('İsk1'),
                                    value: `-${iskonto1Toplam.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${getCurrencySymbol(formData.paraBirimi)}`,
                                    isAccent: true,
                                    isEditable: true,
                                    visibilityRule: 'p1',
                                    numericValue: iskonto1Toplam,
                                    hideWhenZero: true,
                                    editLabelNode: (
                                        <div className="panel-edit-field-group">
                                            <span className="panel-edit-field-label">{t('auto_isk1_9f15')}</span>
                                            <div className="panel-edit-input-wrapper">
                                                <span className="panel-edit-addon addon-prefix">%</span>
                                                <input
                                                    type="number"
                                                    className="form-input panel-edit-input-rate"
                                                    value={editIsk1Oran}
                                                    onChange={e => handleIsk1OranChange(e.target.value)}
                                                    placeholder={t('auto_oran', 'Oran')}
                                                />
                                            </div>
                                        </div>
                                    ),
                                    editValueNode: (
                                        <div className="panel-edit-amount-wrapper">
                                            <input
                                                type="number"
                                                className="form-input panel-edit-input-amount"
                                                value={editIsk1Tutar}
                                                onChange={e => handleIsk1TutarChange(e.target.value)}
                                                placeholder={t('auto_tutar', 'Tutar')}
                                            />
                                            <span className="panel-edit-addon addon-suffix">{getCurrencySymbol(formData.paraBirimi)}</span>
                                        </div>
                                    )
                                },
                                {
                                    id: 'isk2',
                                    label: docIsk2Oran > 0 ? `${t('İsk2')} (%${parseFloat(docIsk2Oran.toFixed(3))})` : t('İsk2'),
                                    value: `-${iskonto2Toplam.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${getCurrencySymbol(formData.paraBirimi)}`,
                                    isAccent: true,
                                    isEditable: true,
                                    visibilityRule: 'p1',
                                    numericValue: iskonto2Toplam,
                                    hideWhenZero: true,
                                    editLabelNode: (
                                        <div className="panel-edit-field-group">
                                            <span className="panel-edit-field-label">{t('auto_isk2_d0cf')}</span>
                                            <div className="panel-edit-input-wrapper">
                                                <span className="panel-edit-addon addon-prefix">%</span>
                                                <input
                                                    type="number"
                                                    className="form-input panel-edit-input-rate"
                                                    value={editIsk2Oran}
                                                    onChange={e => handleIsk2OranChange(e.target.value)}
                                                    placeholder={t('auto_oran', 'Oran')}
                                                />
                                            </div>
                                        </div>
                                    ),
                                    editValueNode: (
                                        <div className="panel-edit-amount-wrapper">
                                            <input
                                                type="number"
                                                className="form-input panel-edit-input-amount"
                                                value={editIsk2Tutar}
                                                onChange={e => handleIsk2TutarChange(e.target.value)}
                                                placeholder={t('auto_tutar', 'Tutar')}
                                            />
                                            <span className="panel-edit-addon addon-suffix">{getCurrencySymbol(formData.paraBirimi)}</span>
                                        </div>
                                    )
                                },
                                {
                                    id: 'toplamIskonto',
                                    label: t('İskonto'),
                                    value: `-${(activeIsk1Tutar + activeIsk2Tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${getCurrencySymbol(formData.paraBirimi)}`,
                                    isAccent: true,
                                    isEditable: false,
                                    visibilityRule: 'p3-fallback-p1',
                                    numericValue: activeIsk1Tutar + activeIsk2Tutar,
                                    hideWhenZero: true
                                },
                                {
                                    id: 'matrah',
                                    label: t('Matrah'),
                                    value: `${activeAraToplam.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${getCurrencySymbol(formData.paraBirimi)}`,
                                    isEditable: false,
                                    visibilityRule: 'p3'
                                },
                                {
                                    id: 'toplamKdv',
                                    label: t('KDV Toplam'),
                                    value: `${activeKdvToplam.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${getCurrencySymbol(formData.paraBirimi)}`,
                                    isEditable: false,
                                    visibilityRule: 'p3'
                                },
                                {
                                    id: 'genelToplam',
                                    label: t('Genel Toplam'),
                                    value: `${activeGenelToplam.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${getCurrencySymbol(formData.paraBirimi)}`,
                                    isPrimary: true,
                                    isEditable: false,
                                    visibilityRule: 'p4'
                                }
                            ]}
                        />
                    </DocumentResultPanelsGroup>
                }
            />

            <CariSeciciModal
                isOpen={cariModalOpen}
                onClose={() => setCariModalOpen(false)}
                onSelect={handleCariSelect}
                initialSearchText={cariAramaMetni}
            />

            <UrunSeciciModal
                isOpen={urunModalOpen}
                onClose={() => {
                    setUrunModalOpen(false);
                    setTimeout(() => lastFocusedInputRef.current?.focus(), 50);
                }}
                onSelect={handleUrunSelect}
                initialSearchText={urunAramaMetni}
            />

            {isIade && (
                <SiparisSeciciList
                    isOpen={siparisSeciciModalOpen}
                    onClose={() => {
                        setSiparisSeciciModalOpen(false);
                        setTimeout(() => lastFocusedInputRef.current?.focus(), 50);
                    }}
                    onSelect={(mockSiparis, selectedItems) => handleSiparisKalemleriSelect(mockSiparis, selectedItems)}
                    initialSearchText={siparisAramaMetni}
                    cariId={formData.cariId}
                    cariUnvan={formData.cariId ? (formData.cariUnvan || formData.cariMetni) : ''}
                    islemTuru={isAlis ? 2 : 1}
                    tumKalemler={true}
                    excludedIds={kalemler
                        .filter((k: any) => k.kaynakSiparisKalemiId && k.id !== activeRowId)
                        .map((k: any) => Number(k.kaynakSiparisKalemiId))}
                />
            )}

            <SiparisKampanyaAnalizModal
                isOpen={kampanyaModalOpen}
                onClose={() => setKampanyaModalOpen(false)}
                analizSonucu={kampanyaAnalizSonucu}
                isLoading={isKampanyaLoading}
                onKampanyaUygula={handleKampanyaUygula}
                uygulananKampanya={uygulananKampanya}
                onKampanyaKaldir={handleKampanyaKaldir}
            />

            {siparisActionMenu.renderAddressModals()}
        </>
    );
};

export default SiparisForm;
