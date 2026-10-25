/**
 * Webakus ERP - Sıcak Satış & Pazarlık (Teklif) Sihirbazı Bileşeni (SicakSatisTeklifForm.tsx)
 *
 * Başlıca Sorumlulukları:
 * - BaseWizardPage yapısını kullanarak 3 aşamalı profesyonel sıcak satış akışı sunmak:
 *   1. Aşama: Teklif & Geçerlilik Bilgileri (Tarih, opsiyon / geçerlilik süresi, teklif no, para birimi, genel notlar)
 *   2. Aşama: Ürün Seçimi & Teklif Sepeti (Alternatif teklif seçenekleri, barkod/arama, paket yükleme, pazarlık & taksit simülatörü, kârlılık barı)
 *   3. Aşama: Tüketici Bilgileri & Onay (Müşteri/Cari seçimi, teslimat/sevk ve fatura adresleri, sepet ve ödeme özeti)
 * - Adımlar arası ileri gitmeden önce ilgili adımın doğrulama kontrollerini (onValidate) işletmek
 * - Teklif kaydetme ve tek tıkla doğrudan "Alınan Sipariş"e dönüştürme aksiyonlarını yönetmek
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { ShoppingCart } from 'lucide-react';
import {
    BaseWizardPage,
    WizardStep,
    UrunSeciciModal,
    BasePopup,
    CariAdresSecici,
    type CariAdresItem
} from '@akalin/ui';
import { CariSeciciList as CariSeciciModal } from '@akalin/customer_module';
import { getCurrencySymbol } from '../utils/currencyUtils';
import { useHeaderCollapsible } from '../hooks/useHeaderCollapsible';

import { satisBelgeleriService } from '../services/SatisBelgeleriService';
import { SicakSatisBaglamDto, SicakSatisUrunMaliyetDto } from '../dtos/SatisBelgeleriDto';
import {
    SicakSatisTeklifFormData,
    SicakSatisTeklifSecenegiState,
    SicakSatisSepetKalemi,
    getSicakSatisTeklifDefaultValues,
    createEmptyTeklifSecenegi
} from '../defaults/sicakSatisTeklifDefaultValue';
import {
    validateSicakSatisTeklifStep1,
    validateSicakSatisTeklifStep2,
    validateSicakSatisTeklifStep3,
    validateSicakSatisTeklifForm,
    validateSicakSatisTeklifField
} from '../validators/sicakSatisTeklifValidation';

import SicakSatisTeklifBilgiStep from './SicakSatisTeklifBilgiStep';
import SicakSatisUrunSecimStep from './SicakSatisUrunSecimStep';
import SicakSatisTuketiciStep from './SicakSatisTuketiciStep';
import SiparisKampanyaAnalizModal from './SiparisKampanyaAnalizModal';

import {
    kampanyalarService,
    paketVeSetService,
    type SiparisKampanyaAnalizSonucuDto,
    type KampanyaDegerlendirmeSonucuDto,
    type IPaketVeSetListItem
} from '@akalin/product_module';

export interface SicakSatisTeklifFormProps {
    initialData?: any;
    onSuccess?: (returnedId?: any) => void;
    onCancel?: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
    headerCollapsible?: boolean;
    defaultHeaderCollapsed?: boolean;
}

const SicakSatisTeklifForm: React.FC<SicakSatisTeklifFormProps> = ({
    initialData,
    onSuccess,
    onCancel,
    onDirtyChange,
    headerCollapsible = true,
    defaultHeaderCollapsed = false
}) => {
    const { t } = useTranslation();

    // Üst başlık alanının gizlenebilme özelliğini yönet (Sıcak Satış sayfasında varsayılan olarak açık)
    useHeaderCollapsible(headerCollapsible, defaultHeaderCollapsed);

    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isConvertingOrder, setIsConvertingOrder] = useState(false);

    // Sıcak Satış Bağlamı (Belge Ayarı, Kârlılık Eşikleri, POS Cihazları)
    const [baglam, setBaglam] = useState<SicakSatisBaglamDto>({
        otomatikNumaraVerilsinMi: true,
        varsayilanGecerlilikGunu: 7,
        kritikKarOrani: 5,
        hedefKarOrani: 15,
        yuksekKarOrani: 25,
        posCihazlari: []
    });

    // Form & Teklif Seçenekleri State'i
    const initialDefaults = useMemo(
        () => getSicakSatisTeklifDefaultValues(initialData, baglam.varsayilanGecerlilikGunu),
        [initialData, baglam.varsayilanGecerlilikGunu]
    );

    const [formData, setFormData] = useState<SicakSatisTeklifFormData>(initialDefaults.formData);
    const [secenekler, setSecenekler] = useState<SicakSatisTeklifSecenegiState[]>(initialDefaults.secenekler);
    const [activeSecenekId, setActiveSecenekId] = useState<string>(
        initialDefaults.secenekler[0]?.id || ''
    );
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Hızlı Barkod / Kod Arama
    const [quickSearchText, setQuickSearchText] = useState('');
    const [isSearchingProduct, setIsSearchingProduct] = useState(false);
    const quickInputRef = useRef<HTMLInputElement | null>(null);

    // Modallar
    const [cariModalOpen, setCariModalOpen] = useState(false);
    const [urunModalOpen, setUrunModalOpen] = useState(false);
    const [paketModalOpen, setPaketModalOpen] = useState(false);
    const [paketListesi, setPaketListesi] = useState<IPaketVeSetListItem[]>([]);
    const [isPaketLoading, setIsPaketLoading] = useState(false);

    // Adres Seçici Modal
    const [cariAdresModalOpen, setCariAdresModalOpen] = useState(false);
    const [targetAddressField, setTargetAddressField] = useState<'sevkAdresMetni' | 'faturaAdresMetni'>('sevkAdresMetni');

    // Kampanya Analizi State
    const [kampanyaModalOpen, setKampanyaModalOpen] = useState(false);
    const [kampanyaAnalizSonucu, setKampanyaAnalizSonucu] = useState<SiparisKampanyaAnalizSonucuDto | null>(null);

    // Aktif Teklif Seçeneği
    const activeSecenek = useMemo(() => {
        return secenekler.find(s => s.id === activeSecenekId) || secenekler[0];
    }, [secenekler, activeSecenekId]);

    const currencySymbol = useMemo(() => getCurrencySymbol(formData.paraBirimi), [formData.paraBirimi]);

    // 1. Sıcak Satış Bağlamını Yükle
    useEffect(() => {
        let mounted = true;
        satisBelgeleriService
            .getSicakSatisBaglami()
            .then((res) => {
                if (!mounted || !res) return;
                setBaglam(res);

                // Yeni kayıt ise ve POS cihazı varsa ilk seçeneğin varsayılan POS cihazını bağla
                if (!initialData?.id && res.posCihazlari && res.posCihazlari.length > 0) {
                    const defaultPos = res.posCihazlari[0];
                    const defaultTaksit = defaultPos.taksitler?.[0];
                    setSecenekler(prev =>
                        prev.map((sec, idx) =>
                            idx === 0 && !sec.secilenPosCihazId
                                ? {
                                      ...sec,
                                      secilenPosCihazId: defaultPos.posCihazId,
                                      secilenPosCihazAdi: defaultPos.posCihazAdi,
                                      secilenTaksitSayisi: defaultTaksit?.taksitSayisi || 1,
                                      musteriVadeFarkiOrani: defaultTaksit?.musteriVadeFarkiOrani || 0,
                                      bankaKesintiOrani: defaultTaksit?.bankaKesintiOrani || 0
                                  }
                                : sec
                        )
                    );
                }
            })
            .catch((err) => {
                console.error('Sıcak satış bağlamı yüklenemedi:', err);
            });
        return () => {
            mounted = false;
        };
    }, [initialData?.id]);

    // 2. Düzenleme modunda mevcut kalemlerin güncel stok/maliyet/BSH bilgilerini zenginleştir
    useEffect(() => {
        if (!initialData?.id) return;
        const allProductIds = Array.from(
            new Set(
                secenekler.flatMap(s => s.kalemler.map(k => k.urunVeHizmetKartiId)).filter(id => id > 0)
            )
        );
        if (allProductIds.length === 0) return;

        satisBelgeleriService
            .urunMaliyetAnaliz(
                allProductIds,
                formData.tarih,
                formData.cariId ? Number(formData.cariId) : null
            )
            .then((analizList) => {
                if (!analizList || analizList.length === 0) return;
                const map = new Map<number, SicakSatisUrunMaliyetDto>();
                analizList.forEach(item => map.set(item.urunId, item));

                setSecenekler(prev =>
                    prev.map(sec => ({
                        ...sec,
                        kalemler: sec.kalemler.map(k => {
                            const info = map.get(k.urunVeHizmetKartiId);
                            if (!info) return k;
                            return {
                                ...k,
                                birimAlisMaliyeti: k.birimAlisMaliyeti > 0 ? k.birimAlisMaliyeti : info.birimAlisMaliyetiKdvHaric,
                                alisMaliyetKaynagi: info.alisMaliyetKaynagi,
                                birimBshFiyatFarki: k.birimBshFiyatFarki > 0 ? k.birimBshFiyatFarki : info.birimBshFiyatFarki,
                                satilabilirStokMiktari: info.satilabilirStokMiktari,
                                toplamDepoMiktari: info.toplamDepoMiktari,
                                anaResimUrl: info.anaResimUrl
                            };
                        })
                    }))
                );
            })
            .catch(() => {});
    }, [initialData?.id]);

    // 3. Aktif Seçenek İçin Kampanya Analizi
    const fetchKampanyaAnalizi = useCallback(async () => {
        if (!activeSecenek || activeSecenek.kalemler.length === 0) {
            setKampanyaAnalizSonucu(null);
            return;
        }

        const gecerliKalemler = activeSecenek.kalemler.map(k => {
            const kdvHaricListe = k.kdvOrani > 0 ? k.listeFiyati / (1 + k.kdvOrani / 100) : k.listeFiyati;
            return {
                urunVeHizmetKartiId: k.urunVeHizmetKartiId,
                miktar: k.miktar,
                listeFiyati: k.listeFiyati,
                kdvHaricFiyat: Number(kdvHaricListe.toFixed(2)),
                kdvOrani: k.kdvOrani
            };
        });

        try {
            const res = await kampanyalarService.siparisKampanyaAnalizi({
                cariId: formData.cariId ? Number(formData.cariId) : undefined,
                tarih: formData.tarih || new Date().toISOString(),
                kalemler: gecerliKalemler
            });
            setKampanyaAnalizSonucu(res);
        } catch (err) {
            console.error('Kampanya analizi alınamadı:', err);
        }
    }, [activeSecenek, formData.cariId, formData.tarih]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchKampanyaAnalizi();
        }, 450);
        return () => clearTimeout(timer);
    }, [fetchKampanyaAnalizi]);

    // Master alan güncelleme
    const handleMasterChange = useCallback(
        (field: string, value: any) => {
            setFormData(prev => {
                const updated = { ...prev, [field]: value };
                if (field === 'cariMetni') {
                    updated.cariId = '';
                }
                return updated;
            });
            if (onDirtyChange) onDirtyChange(true);
            setErrors(prev => {
                if (!prev[field]) return prev;
                const copy = { ...prev };
                delete copy[field];
                return copy;
            });
        },
        [onDirtyChange]
    );

    // Cari Seçimi
    const handleCariSelect = useCallback(
        async (selectedItem: any) => {
            try {
                setLoading(true);
                const res = await axios.get(`/api/Cari/${selectedItem.id}`);
                const cari = res.data;

                const cariTamIsim =
                    cari.tipi === 1
                        ? cari.unvan
                        : [cari.ad, cari.ortaIsim, cari.soyad].filter(Boolean).join(' ');

                setFormData(prev => {
                    const next = {
                        ...prev,
                        cariId: String(cari.id),
                        cariMetni: cariTamIsim,
                        faturaUnvan: cariTamIsim,
                        teslimAlacakKisi: cariTamIsim,
                        vergiDairesi: cari.vergiDairesi || '',
                        vergiNo: cari.vergiNo || cari.tcKimlikNo || '',
                        nakliyeTelefon: cari.varsayilanAdresTelefon || cari.telefon || ''
                    };

                    if (cari.adresler && cari.adresler.length > 0) {
                        const faturaAdresleri = cari.adresler.filter((a: any) => a.tipi === 1 || a.tipi === 3);
                        const nakliyeAdresleri = cari.adresler.filter((a: any) => a.tipi === 2 || a.tipi === 3);
                        const varsayilanFatura =
                            faturaAdresleri.find((a: any) => a.varsayilanMi) || faturaAdresleri[0] || cari.adresler[0];
                        const varsayilanNakliye =
                            nakliyeAdresleri.find((a: any) => a.varsayilanMi) || nakliyeAdresleri[0] || cari.adresler[0];

                        next.faturaAdresMetni = varsayilanFatura
                            ? varsayilanFatura.formattedAdres || varsayilanFatura.acikAdres || ''
                            : '';
                        next.sevkAdresMetni = varsayilanNakliye
                            ? varsayilanNakliye.formattedAdres || varsayilanNakliye.acikAdres || ''
                            : '';
                    }
                    return next;
                });

                setErrors(prev => {
                    const copy = { ...prev };
                    delete copy.cariId;
                    return copy;
                });
                setCariModalOpen(false);
                if (onDirtyChange) onDirtyChange(true);
            } catch {
                toast.error(t('sicak_satis.customer_load_error', 'Cari detayları yüklenemedi.'));
            } finally {
                setLoading(false);
            }
        },
        [onDirtyChange, t]
    );

    // Cari Adres Seçimi
    const handleCariAdresSelect = useCallback(
        (adres: CariAdresItem) => {
            const fullAddress = adres.formattedAdres || adres.acikAdres || '';
            handleMasterChange(targetAddressField, fullAddress);
            if (targetAddressField === 'sevkAdresMetni' && adres.telefon && !formData.nakliyeTelefon) {
                handleMasterChange('nakliyeTelefon', adres.telefon);
            }
            setCariAdresModalOpen(false);
        },
        [handleMasterChange, targetAddressField, formData.nakliyeTelefon]
    );

    // Aktif seçeneği güncelleme
    const updateActiveSecenek = useCallback(
        (updater: (sec: SicakSatisTeklifSecenegiState) => SicakSatisTeklifSecenegiState) => {
            setSecenekler(prev =>
                prev.map(sec => (sec.id === activeSecenek.id ? updater(sec) : sec))
            );
            if (onDirtyChange) onDirtyChange(true);
            setErrors(prev => {
                if (!prev.kalemler) return prev;
                const copy = { ...prev };
                delete copy.kalemler;
                return copy;
            });
        },
        [activeSecenek?.id, onDirtyChange]
    );

    // Sepete Ürün Ekleme
    const addProductsToActiveCart = useCallback(
        async (itemsToLoad: Array<{ urunId: number; miktar: number; fallbackPrice?: number }>) => {
            if (!itemsToLoad || itemsToLoad.length === 0) return;
            try {
                setIsSearchingProduct(true);
                const urunIds = itemsToLoad.map(i => i.urunId);
                const maliyetBilgileri = await satisBelgeleriService.urunMaliyetAnaliz(
                    urunIds,
                    formData.tarih,
                    formData.cariId ? Number(formData.cariId) : null
                );

                if (!maliyetBilgileri || maliyetBilgileri.length === 0) {
                    toast.error(t('sicak_satis.product_not_found', 'Ürün bilgileri alınamadı.'));
                    return;
                }

                const miktarMap = new Map<number, number>();
                const fallbackPriceMap = new Map<number, number>();
                itemsToLoad.forEach(item => {
                    miktarMap.set(item.urunId, (miktarMap.get(item.urunId) || 0) + item.miktar);
                    if (item.fallbackPrice && item.fallbackPrice > 0) {
                        fallbackPriceMap.set(item.urunId, item.fallbackPrice);
                    }
                });

                updateActiveSecenek(sec => {
                    const mevcutKalemler = [...sec.kalemler];

                    maliyetBilgileri.forEach(info => {
                        const eklenecekMiktar = miktarMap.get(info.urunId) || 1;
                        const fallbackFiyat = fallbackPriceMap.get(info.urunId) || 0;
                        const resolvedListeFiyati = Number(info.listeSatisFiyatiKdvDahil || 0) || fallbackFiyat;
                        const existingIndex = mevcutKalemler.findIndex(
                            k => k.urunVeHizmetKartiId === info.urunId
                        );

                        if (existingIndex > -1) {
                            const existing = mevcutKalemler[existingIndex];
                            const yeniMiktar = existing.miktar + eklenecekMiktar;
                            const bazListeFiyati = existing.listeFiyati > 0 ? existing.listeFiyati : resolvedListeFiyati;
                            const bazTeklifFiyati = existing.teklifBirimFiyati > 0 ? existing.teklifBirimFiyati : bazListeFiyati;
                            const yeniSatirToplam = Number((yeniMiktar * bazTeklifFiyati).toFixed(2));
                            const yeniIskontoTutari = Math.max(
                                0,
                                Number((yeniMiktar * bazListeFiyati - yeniSatirToplam).toFixed(2))
                            );
                            mevcutKalemler[existingIndex] = {
                                ...existing,
                                miktar: yeniMiktar,
                                listeFiyati: bazListeFiyati,
                                perakendeFiyat: bazListeFiyati,
                                teklifBirimFiyati: bazTeklifFiyati,
                                satirToplam: yeniSatirToplam,
                                iskontoTutari: yeniIskontoTutari,
                                birimAlisMaliyeti: info.birimAlisMaliyetiKdvHaric,
                                alisMaliyetKaynagi: info.alisMaliyetKaynagi,
                                birimBshFiyatFarki: info.birimBshFiyatFarki,
                                satilabilirStokMiktari: info.satilabilirStokMiktari,
                                toplamDepoMiktari: info.toplamDepoMiktari
                            };
                        } else {
                            const satirToplam = Number((eklenecekMiktar * resolvedListeFiyati).toFixed(2));
                            const yeniKalem: SicakSatisSepetKalemi = {
                                id: `kalem_${Date.now()}_${info.urunId}_${Math.random().toString(36).substring(2, 6)}`,
                                urunVeHizmetKartiId: info.urunId,
                                urunKodu: info.urunKodu,
                                urunAdi: info.urunAdi,
                                barkod: info.barkod,
                                birimAdi: info.birimAdi || 'Adet',
                                miktar: eklenecekMiktar,
                                kdvOrani: Number(info.kdvOrani ?? 20),
                                listeFiyati: resolvedListeFiyati,
                                perakendeFiyat: resolvedListeFiyati,
                                teklifBirimFiyati: resolvedListeFiyati,
                                iskontoOrani: 0,
                                iskontoTutari: 0,
                                satirToplam,
                                birimAlisMaliyeti: Number(info.birimAlisMaliyetiKdvHaric || 0),
                                alisMaliyetKaynagi: info.alisMaliyetKaynagi,
                                birimBshFiyatFarki: Number(info.birimBshFiyatFarki || 0),
                                satilabilirStokMiktari: Number(info.satilabilirStokMiktari || 0),
                                toplamDepoMiktari: Number(info.toplamDepoMiktari || 0),
                                anaResimUrl: info.anaResimUrl
                            };
                            mevcutKalemler.push(yeniKalem);
                        }
                    });

                    return {
                        ...sec,
                        kalemler: mevcutKalemler
                    };
                });
            } catch (err) {
                console.error('Ürün sepete eklenirken hata:', err);
                toast.error(t('sicak_satis.add_to_cart_error', 'Ürün sepete eklenirken bir hata oluştu.'));
            } finally {
                setIsSearchingProduct(false);
            }
        },
        [formData.tarih, formData.cariId, updateActiveSecenek, t]
    );

    // Barkod veya Kod ile Hızlı Ürün Arama
    const handleQuickProductSearch = useCallback(async () => {
        const query = quickSearchText.trim();
        if (!query) return;

        try {
            setIsSearchingProduct(true);
            const res = await axios.get('/api/UrunVeHizmetKartlari', {
                params: { aramaKelimesi: query, sayfa: 1, sayfaBoyutu: 10 }
            });
            const list = Array.isArray(res.data)
                ? res.data
                : res.data?.items || res.data?.data || [];

            if (list.length === 1) {
                const u = list[0];
                const fallbackPrice = Number(u.satisFiyatiKdvDahil || u.satisFiyati || 0);
                await addProductsToActiveCart([{
                    urunId: u.id,
                    miktar: 1,
                    fallbackPrice: fallbackPrice > 0 ? fallbackPrice : undefined
                }]);
                setQuickSearchText('');
                toast.success(
                    t('sicak_satis.product_added_toast', '{{urun}} sepete eklendi.', {
                        urun: u.ad || u.kod
                    })
                );
            } else if (list.length > 1) {
                const exact = list.find(
                    (u: any) =>
                        (u.barkod && u.barkod.toLowerCase() === query.toLowerCase()) ||
                        (u.kod && u.kod.toLowerCase() === query.toLowerCase())
                );
                if (exact) {
                    const fallbackPrice = Number(exact.satisFiyatiKdvDahil || exact.satisFiyati || 0);
                    await addProductsToActiveCart([{
                        urunId: exact.id,
                        miktar: 1,
                        fallbackPrice: fallbackPrice > 0 ? fallbackPrice : undefined
                    }]);
                    setQuickSearchText('');
                    toast.success(
                        t('sicak_satis.product_added_toast', '{{urun}} sepete eklendi.', {
                            urun: exact.ad || exact.kod
                        })
                    );
                } else {
                    setUrunModalOpen(true);
                }
            } else {
                setUrunModalOpen(true);
            }
        } catch {
            setUrunModalOpen(true);
        } finally {
            setIsSearchingProduct(false);
        }
    }, [quickSearchText, addProductsToActiveCart, t]);

    // Paket / Set Rehberini Aç
    const handleOpenPaketModal = useCallback(async () => {
        setPaketModalOpen(true);
        try {
            setIsPaketLoading(true);
            const res = await paketVeSetService.getAll({ sayfa: 1, sayfaBoyutu: 100 });
            const items = Array.isArray(res) ? res : (res as any)?.items || (res as any)?.data || [];
            setPaketListesi(items.filter((p: IPaketVeSetListItem) => p.aktifMi && !p.silindiMi));
        } catch {
            toast.error(t('sicak_satis.package_load_error', 'Paket ve set listesi yüklenemedi.'));
        } finally {
            setIsPaketLoading(false);
        }
    }, [t]);

    // Seçilen Paket / Seti Sepete Yükle
    const handlePaketSelect = useCallback(
        async (paketItem: IPaketVeSetListItem) => {
            try {
                setIsPaketLoading(true);
                const detay = await paketVeSetService.getById(paketItem.id);
                const urunKalemleri = ((detay as any)?.kalemler || [])
                    .filter((k: any) => k.urunVeHizmetKartiId && Number(k.urunVeHizmetKartiId) > 0)
                    .map((k: any) => ({
                        urunId: Number(k.urunVeHizmetKartiId),
                        miktar: Number(k.miktar || 1)
                    }));

                if (urunKalemleri.length === 0) {
                    toast.error(
                        t('sicak_satis.package_empty_warning', 'Seçilen pakette doğrudan eklenecek tekil ürün bulunamadı.')
                    );
                    return;
                }

                await addProductsToActiveCart(urunKalemleri);
                setPaketModalOpen(false);
                toast.success(
                    t('sicak_satis.package_loaded_success', '{{paket}} paketindeki ürünler sepete yüklendi.', {
                        paket: paketItem.ad
                    })
                );
            } catch {
                toast.error(t('sicak_satis.package_detail_error', 'Paket içeriği yüklenirken hata oluştu.'));
            } finally {
                setIsPaketLoading(false);
            }
        },
        [addProductsToActiveCart, t]
    );

    // Yeni Teklif Seçeneği (Sekme) Ekleme
    const handleAddOptionTab = useCallback(() => {
        const nextSira = secenekler.length + 1;
        const yeniSecenek = createEmptyTeklifSecenegi(
            nextSira,
            t('sicak_satis.option_prefix', 'Seçenek')
        );
        if (baglam.posCihazlari.length > 0) {
            const defaultPos = baglam.posCihazlari[0];
            const defaultTaksit = defaultPos.taksitler?.[0];
            yeniSecenek.secilenPosCihazId = defaultPos.posCihazId;
            yeniSecenek.secilenPosCihazAdi = defaultPos.posCihazAdi;
            yeniSecenek.secilenTaksitSayisi = defaultTaksit?.taksitSayisi || 1;
            yeniSecenek.musteriVadeFarkiOrani = defaultTaksit?.musteriVadeFarkiOrani || 0;
            yeniSecenek.bankaKesintiOrani = defaultTaksit?.bankaKesintiOrani || 0;
        }
        setSecenekler(prev => [...prev, yeniSecenek]);
        setActiveSecenekId(yeniSecenek.id);
        if (onDirtyChange) onDirtyChange(true);
    }, [secenekler.length, baglam.posCihazlari, onDirtyChange, t]);

    // Mevcut Teklif Seçeneğini Kopyalama (Klonlama)
    const handleCloneActiveOptionTab = useCallback(() => {
        if (!activeSecenek) return;
        const nextSira = secenekler.length + 1;
        const cloned: SicakSatisTeklifSecenegiState = {
            ...activeSecenek,
            id: `secenek_clone_${Date.now()}_${nextSira}`,
            dbId: undefined,
            siraNo: nextSira,
            secenekAdi: `${activeSecenek.secenekAdi} (${t('sicak_satis.copy_suffix', 'Alternatif')})`,
            kalemler: activeSecenek.kalemler.map(k => ({
                ...k,
                id: `kalem_clone_${Date.now()}_${k.urunVeHizmetKartiId}_${Math.random().toString(36).substring(2, 5)}`,
                dbId: undefined
            }))
        };
        setSecenekler(prev => [...prev, cloned]);
        setActiveSecenekId(cloned.id);
        if (onDirtyChange) onDirtyChange(true);
        toast.success(
            t('sicak_satis.option_cloned_toast', '{{ad}} yeni bir seçenek olarak kopyalandı.', {
                ad: activeSecenek.secenekAdi
            })
        );
    }, [activeSecenek, secenekler.length, onDirtyChange, t]);

    // Seçenek Silme
    const handleRemoveOptionTab = useCallback(
        (secenekId: string) => {
            if (secenekler.length <= 1) {
                toast.error(t('sicak_satis.min_one_option_warning', 'Teklifte en az bir seçenek bulunmalıdır.'));
                return;
            }
            setSecenekler(prev => {
                const filtered = prev.filter(s => s.id !== secenekId).map((s, idx) => ({
                    ...s,
                    siraNo: idx + 1
                }));
                if (activeSecenekId === secenekId && filtered.length > 0) {
                    setActiveSecenekId(filtered[0].id);
                }
                return filtered;
            });
            if (onDirtyChange) onDirtyChange(true);
        },
        [secenekler.length, activeSecenekId, onDirtyChange, t]
    );

    // Seçenek Adını Değiştirme
    const handleRenameSecenek = useCallback(
        (secenekId: string, yeniAd: string) => {
            setSecenekler(prev =>
                prev.map(s => (s.id === secenekId ? { ...s, secenekAdi: yeniAd } : s))
            );
            if (onDirtyChange) onDirtyChange(true);
        },
        [onDirtyChange]
    );

    // Bir Seçeneğin Finansal ve Kârlılık Hesaplaması
    const calculateSecenekSummary = useCallback((sec: SicakSatisTeklifSecenegiState) => {
        const listeToplam = sec.kalemler.reduce((acc, k) => acc + k.miktar * k.listeFiyati, 0);
        const araToplam = sec.kalemler.reduce((acc, k) => acc + k.satirToplam, 0);
        const satirIskontoToplam = Math.max(0, listeToplam - araToplam);

        const kampanyaIndirim = Number(sec.kampanyaIndirimTutari || 0);
        const ekPazarlik = Number(sec.ekPazarlikIndirimTutari || 0);
        const netSatisToplam = Math.max(0, Number((araToplam - kampanyaIndirim - ekPazarlik).toFixed(2)));
        const toplamMusteriKazanci = Math.max(0, Number((listeToplam - netSatisToplam).toFixed(2)));

        const oranFactor = araToplam > 0 ? netSatisToplam / araToplam : 1;
        let kdvHaricNetSatisToplam = 0;
        let toplamAlisMaliyeti = 0;
        let toplamBshFiyatFarki = 0;

        sec.kalemler.forEach(k => {
            const satirPayiKdvDahil = k.satirToplam * oranFactor;
            const satirKdvHaric =
                k.kdvOrani > 0 ? satirPayiKdvDahil / (1 + k.kdvOrani / 100) : satirPayiKdvDahil;
            kdvHaricNetSatisToplam += satirKdvHaric;
            toplamAlisMaliyeti += k.miktar * (k.birimAlisMaliyeti || 0);
            toplamBshFiyatFarki += k.miktar * (k.birimBshFiyatFarki || 0);
        });

        const vadeFarkiTutari =
            sec.odemeTuru === 2
                ? Number((netSatisToplam * ((sec.musteriVadeFarkiOrani || 0) / 100)).toFixed(2))
                : 0;
        const taksitliToplam = Number((netSatisToplam + vadeFarkiTutari).toFixed(2));
        const posKomisyonTutari =
            sec.odemeTuru === 2
                ? Number((taksitliToplam * ((sec.bankaKesintiOrani || 0) / 100)).toFixed(2))
                : 0;

        const kampanyaFirmaHakEdis = Number(sec.kampanyaFirmaHakEdisTutari || 0);

        const gercekNetKarTutari = Number(
            (
                kdvHaricNetSatisToplam -
                toplamAlisMaliyeti +
                kampanyaFirmaHakEdis +
                toplamBshFiyatFarki -
                posKomisyonTutari
            ).toFixed(2)
        );

        const gercekNetKarOrani =
            kdvHaricNetSatisToplam > 0
                ? Number(((gercekNetKarTutari / kdvHaricNetSatisToplam) * 100).toFixed(2))
                : 0;

        return {
            listeToplam,
            satirIskontoToplam,
            araToplam,
            netSatisToplam,
            toplamMusteriKazanci,
            vadeFarkiTutari,
            taksitliToplam,
            posKomisyonTutari,
            toplamAlisMaliyeti,
            toplamBshFiyatFarki,
            kampanyaFirmaHakEdis,
            gercekNetKarTutari,
            gercekNetKarOrani
        };
    }, []);

    const activeSummary = useMemo(
        () => calculateSecenekSummary(activeSecenek),
        [activeSecenek, calculateSecenekSummary]
    );

    // Kampanya Uygulama
    const handleKampanyaUygula = useCallback(
        (kampanya: KampanyaDegerlendirmeSonucuDto) => {
            const araToplam = activeSummary.araToplam;
            let indirimTutari = Number(kampanya.kazanilanIndirimTutari || 0);
            if (indirimTutari <= 0 && kampanya.aksiyonTipi === 1 && kampanya.aksiyonDegeri) {
                indirimTutari = Number((araToplam * (kampanya.aksiyonDegeri / 100)).toFixed(2));
            } else if (indirimTutari <= 0 && kampanya.aksiyonTipi === 2 && kampanya.aksiyonDegeri) {
                indirimTutari = Number(kampanya.aksiyonDegeri);
            }

            let firmaHakEdis = 0;
            if (kampanya.firmaHakEdisTutari && kampanya.firmaHakEdisTutari > 0) {
                firmaHakEdis = Number(kampanya.firmaHakEdisTutari);
            } else if (kampanya.firmaHakEdisOrani && kampanya.firmaHakEdisOrani > 0) {
                firmaHakEdis = Number((indirimTutari * (kampanya.firmaHakEdisOrani / 100)).toFixed(2));
            }

            updateActiveSecenek(sec => ({
                ...sec,
                uygulananKampanyaId: kampanya.kampanyaId,
                uygulananKampanyaAdi: kampanya.kampanyaAdi,
                kampanyaIndirimTutari: indirimTutari,
                kampanyaFirmaHakEdisTutari: firmaHakEdis
            }));

            setKampanyaModalOpen(false);
            toast.success(
                t('sicak_satis.campaign_applied_toast', '{{adi}} kampanyası aktif teklif seçeneğine uygulandı.', {
                    adi: kampanya.kampanyaAdi
                })
            );
        },
        [activeSummary.araToplam, updateActiveSecenek, t]
    );

    // Kampanya Kaldırma
    const handleKampanyaKaldir = useCallback(() => {
        updateActiveSecenek(sec => ({
            ...sec,
            uygulananKampanyaId: null,
            uygulananKampanyaAdi: null,
            kampanyaIndirimTutari: 0,
            kampanyaFirmaHakEdisTutari: 0
        }));
        toast.success(t('sicak_satis.campaign_removed_toast', 'Kampanya bu seçenekten kaldırıldı.'));
    }, [updateActiveSecenek, t]);

    // Düz Hesap Hedef Net Tutara Yuvarlama
    const handleHedefNetTutarApply = useCallback(
        (hedefNet: number) => {
            const kampanyaSonrasiTutar = Math.max(
                0,
                activeSummary.araToplam - (activeSecenek.kampanyaIndirimTutari || 0)
            );
            if (hedefNet <= 0 || hedefNet > kampanyaSonrasiTutar) {
                toast.error(
                    t(
                        'sicak_satis.invalid_target_net_warning',
                        'Hedef net tutar, ara toplamdan küçük ve sıfırdan büyük olmalıdır.'
                    )
                );
                return;
            }
            const gerekenEkPazarlik = Number((kampanyaSonrasiTutar - hedefNet).toFixed(2));
            updateActiveSecenek(sec => ({
                ...sec,
                ekPazarlikIndirimTutari: gerekenEkPazarlik,
                hedefNetTutarInput: String(hedefNet)
            }));
            toast.success(
                t('sicak_satis.round_applied_toast', 'Teklif net tutarı düz hesap {{tutar}} {{pb}} yapıldı.', {
                    tutar: hedefNet.toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
                    pb: currencySymbol
                })
            );
        },
        [activeSummary.araToplam, activeSecenek?.kampanyaIndirimTutari, updateActiveSecenek, currencySymbol, t]
    );

    // Payload Oluşturma
    const buildSavePayload = useCallback(() => {
        const teklifSecenekleriPayload = secenekler.map((sec, idx) => {
            const sum = calculateSecenekSummary(sec);
            const oranFactor = sum.araToplam > 0 ? sum.netSatisToplam / sum.araToplam : 1;

            return {
                id: sec.dbId || undefined,
                secenekAdi: sec.secenekAdi,
                siraNo: idx + 1,
                secildiMi: sec.id === activeSecenek.id,
                listeToplam: sum.listeToplam,
                satirIskontoToplam: sum.satirIskontoToplam,
                kampanyaIndirimTutari: sec.kampanyaIndirimTutari || 0,
                ekPazarlikIndirimTutari: sec.ekPazarlikIndirimTutari || 0,
                netSatisToplam: sum.netSatisToplam,
                uygulananKampanyaId: sec.uygulananKampanyaId || null,
                uygulananKampanyaAdi: sec.uygulananKampanyaAdi || null,
                kampanyaFirmaHakEdisTutari: sec.kampanyaFirmaHakEdisTutari || 0,
                bshFiyatFarkiToplam: sum.toplamBshFiyatFarki,
                odemeTuru: sec.odemeTuru,
                secilenPosCihazId: sec.secilenPosCihazId || null,
                secilenPosCihazAdi: sec.secilenPosCihazAdi || null,
                secilenTaksitSayisi: sec.secilenTaksitSayisi || 1,
                musteriVadeFarkiOrani: sec.musteriVadeFarkiOrani || 0,
                vadeFarkiTutari: sum.vadeFarkiTutari,
                taksitliToplamTutar: sum.taksitliToplam,
                bankaKesintiOrani: sec.bankaKesintiOrani || 0,
                posKomisyonTutari: sum.posKomisyonTutari,
                toplamAlisMaliyeti: sum.toplamAlisMaliyeti,
                gercekNetKarTutari: sum.gercekNetKarTutari,
                gercekNetKarOrani: sum.gercekNetKarOrani,
                kalemler: sec.kalemler.map(k => {
                    const satirNetKdvDahil = Number((k.satirToplam * oranFactor).toFixed(2));
                    const kdvHaricTutar =
                        k.kdvOrani > 0
                            ? Number((satirNetKdvDahil / (1 + k.kdvOrani / 100)).toFixed(2))
                            : satirNetKdvDahil;
                    const kdvHaricListeBirim =
                        k.kdvOrani > 0
                            ? Number((k.listeFiyati / (1 + k.kdvOrani / 100)).toFixed(4))
                            : k.listeFiyati;
                    const brutKdvHaric = Number((k.miktar * kdvHaricListeBirim).toFixed(2));
                    const iskonto1Tutar = Math.max(0, Number((brutKdvHaric - kdvHaricTutar).toFixed(2)));
                    const iskonto1Oran =
                        brutKdvHaric > 0 ? Number(((iskonto1Tutar / brutKdvHaric) * 100).toFixed(2)) : 0;

                    return {
                        urunVeHizmetKartiId: k.urunVeHizmetKartiId,
                        miktar: k.miktar,
                        birimAdi: k.birimAdi,
                        birimCarpan: 1,
                        listeFiyati: k.listeFiyati,
                        kdvOrani: k.kdvOrani,
                        kdvHaricFiyat: kdvHaricListeBirim,
                        iskonto1Oran,
                        iskonto1Tutar,
                        iskonto2Oran: 0,
                        iskonto2Tutar: 0,
                        kdvHaricTutar,
                        kdvDahilTutar: satirNetKdvDahil,
                        birimAlisMaliyeti: k.birimAlisMaliyeti,
                        birimBshFiyatFarki: k.birimBshFiyatFarki
                    };
                })
            };
        });

        const aktifPayload =
            teklifSecenekleriPayload.find(p => p.secildiMi) || teklifSecenekleriPayload[0];

        return {
            belgeNo: baglam.otomatikNumaraVerilsinMi ? formData.belgeNo || '[OTOMATIK]' : formData.belgeNo,
            belgeTuru: 1, // SatisBelgeTuru.Teklif
            islemTuru: 1, // SatisIslemTuru.Satis
            tarih: formData.tarih,
            gecerlilikTarihi: formData.gecerlilikTarihi || null,
            cariId: formData.cariId ? Number(formData.cariId) : null,
            teslimAlacakKisi: formData.teslimAlacakKisi || null,
            nakliyeTelefon: formData.nakliyeTelefon || null,
            sevkAdresMetni: formData.sevkAdresMetni || null,
            faturaUnvan: formData.faturaUnvan || formData.cariMetni || null,
            vergiDairesi: formData.vergiDairesi || null,
            vergiNo: formData.vergiNo || null,
            faturaAdresMetni: formData.faturaAdresMetni || null,
            aciklama: formData.aciklama || null,
            siparisNotu: formData.siparisNotu || null,
            paraBirimi: formData.paraBirimi || 'TRY',
            kalemler: aktifPayload?.kalemler || [],
            teklifSecenekleri: teklifSecenekleriPayload
        };
    }, [secenekler, activeSecenek?.id, calculateSecenekSummary, baglam.otomatikNumaraVerilsinMi, formData]);

    // 1. AŞAMA DOĞRULAMASI (Teklif & Geçerlilik Bilgileri)
    const handleValidateStep1 = useCallback((): boolean => {
        const step1Errors = validateSicakSatisTeklifStep1(
            formData,
            baglam.otomatikNumaraVerilsinMi,
            t
        );

        if (Object.keys(step1Errors).length > 0) {
            setErrors(prev => ({ ...prev, ...step1Errors }));
            const firstErr = Object.values(step1Errors)[0];
            toast.error(firstErr);
            return false;
        }

        setErrors(prev => {
            const next = { ...prev };
            delete next.tarih;
            delete next.belgeNo;
            delete next.gecerlilikTarihi;
            return next;
        });
        return true;
    }, [formData, baglam.otomatikNumaraVerilsinMi, t]);

    // 2. AŞAMA DOĞRULAMASI (Ürün Seçimi & Sepet)
    const handleValidateStep2 = useCallback((): boolean => {
        const step2Err = validateSicakSatisTeklifStep2(secenekler, activeSecenek, t);
        if (step2Err) {
            toast.error(step2Err);
            return false;
        }
        return true;
    }, [secenekler, activeSecenek, t]);

    // 3. AŞAMA DOĞRULAMASI (Tüketici Bilgileri & Onay)
    const handleValidateStep3 = useCallback((): boolean => {
        const step3Errors = validateSicakSatisTeklifStep3(formData, t);
        if (Object.keys(step3Errors).length > 0) {
            setErrors(prev => ({ ...prev, ...step3Errors }));
            const firstErr = Object.values(step3Errors)[0];
            toast.error(firstErr);
            return false;
        }
        return true;
    }, [formData, t]);

    // TEKLİFİ KAYDETME (onFinish)
    const handleFinish = useCallback(async () => {
        const validStep1 = handleValidateStep1();
        if (!validStep1) return;

        const validStep2 = handleValidateStep2();
        if (!validStep2) return;

        const validStep3 = handleValidateStep3();
        if (!validStep3) return;

        try {
            setIsSaving(true);
            const payload = buildSavePayload();
            let savedId = initialData?.id;

            if (initialData?.id) {
                await satisBelgeleriService.update(initialData.id, {
                    id: initialData.id,
                    ...payload
                });
                toast.success(t('sicak_satis.quote_updated_success', 'Sıcak satış teklifi başarıyla güncellendi.'));
            } else {
                const res = await satisBelgeleriService.teklifOlustur(payload);
                savedId = res?.id;
                toast.success(t('sicak_satis.quote_created_success', 'Sıcak satış teklifi başarıyla kaydedildi.'));
            }

            if (onDirtyChange) onDirtyChange(false);
            if (onSuccess) onSuccess(savedId);
        } catch (err: any) {
            toast.error(
                err?.response?.data?.mesaj ||
                    err?.response?.data?.message ||
                    t('sicak_satis.save_error', 'Teklif kaydedilirken bir hata oluştu.')
            );
        } finally {
            setIsSaving(false);
        }
    }, [
        handleValidateStep1,
        handleValidateStep2,
        handleValidateStep3,
        buildSavePayload,
        initialData?.id,
        onDirtyChange,
        onSuccess,
        t
    ]);

    // SEÇİLİ SEÇENEĞİ ALINAN SİPARİŞE DÖNÜŞTÜRME
    const handleConvertToOrder = useCallback(async () => {
        const validationErrors = validateSicakSatisTeklifForm(
            formData,
            secenekler,
            baglam.otomatikNumaraVerilsinMi,
            t
        );

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            toast.error(Object.values(validationErrors)[0]);
            return;
        }

        try {
            setIsConvertingOrder(true);
            const payload = buildSavePayload();
            let belgeId = initialData?.id;

            if (belgeId) {
                await satisBelgeleriService.update(belgeId, { id: belgeId, ...payload });
            } else {
                const created = await satisBelgeleriService.teklifOlustur(payload);
                belgeId = created?.id;
            }

            if (!belgeId) {
                throw new Error('Belge ID alınamadı.');
            }

            const guncelBelge = await satisBelgeleriService.getById(belgeId);
            const secenekList = guncelBelge?.teklifSecenekleri || [];
            const activeIndex = secenekler.findIndex(s => s.id === activeSecenek.id);
            const eslesenSecenek =
                secenekList[activeIndex] ||
                secenekList.find((s: any) => s.secenekAdi === activeSecenek.secenekAdi) ||
                secenekList[0];

            if (!eslesenSecenek?.id) {
                throw new Error('Onaylanacak teklif seçeneği bulunamadı.');
            }

            const onayRes = await satisBelgeleriService.teklifSecenegiOnayla(
                belgeId,
                eslesenSecenek.id
            );

            toast.success(
                onayRes?.mesaj ||
                    t(
                        'sicak_satis.converted_to_order_success',
                        'Seçilen teklif alternatifi başarıyla Alınan Siparişe dönüştürüldü!'
                    )
            );

            if (onDirtyChange) onDirtyChange(false);
            if (onSuccess) onSuccess(belgeId);
        } catch (err: any) {
            toast.error(
                err?.response?.data?.mesaj ||
                    err?.response?.data?.message ||
                    t('sicak_satis.convert_order_error', 'Siparişe dönüştürme sırasında hata oluştu.')
            );
        } finally {
            setIsConvertingOrder(false);
        }
    }, [
        formData,
        secenekler,
        baglam.otomatikNumaraVerilsinMi,
        buildSavePayload,
        initialData?.id,
        activeSecenek,
        onDirtyChange,
        onSuccess,
        t
    ]);

    const pageTitle = initialData?.id
        ? t('sicak_satis.wizard_edit_title', 'Sıcak Satış Teklifi Düzenle')
        : t('sicak_satis.wizard_page_title', 'Sıcak Satış & Teklif Sihirbazı');

    const pageSubtitle = t(
        'sicak_satis.wizard_subtitle',
        'Teklif geçerlilik süresini belirleyin, alternatif sepetler hazırlayın ve tüketici bilgilerini tamamlayarak teklifi oluşturun.'
    );

    return (
        <>
            <BaseWizardPage
                id="sicakSatisTeklifWizardPage"
                title={pageTitle}
                subtitle={pageSubtitle}
                icon={<ShoppingCart size={20} />}
                showBackButton={true}
                onClose={onCancel}
                onFinish={handleFinish}
                finishText={t('sicak_satis.finish_save_quote', 'Teklifi Kaydet')}
                isFinishing={loading || isSaving || isConvertingOrder}
            >
                {/* 1. AŞAMA: TEKLİF & GEÇERLİLİK BİLGİLERİ */}
                <WizardStep
                    id="step-teklif-bilgileri"
                    title={t('sicak_satis.step1_title', 'Teklif & Geçerlilik Bilgileri')}
                    onValidate={handleValidateStep1}
                >
                    <SicakSatisTeklifBilgiStep
                        formData={formData}
                        onMasterChange={handleMasterChange}
                        errors={errors}
                        baglam={baglam}
                        currencySymbol={currencySymbol}
                    />
                </WizardStep>

                {/* 2. AŞAMA: ÜRÜN SEÇİMİ & TEKLİF SEPETİ */}
                <WizardStep
                    id="step-urun-secimi"
                    title={t('sicak_satis.step2_title', 'Ürün Seçimi & Teklif Sepeti')}
                    onValidate={handleValidateStep2}
                >
                    <SicakSatisUrunSecimStep
                        formData={formData}
                        onMasterChange={handleMasterChange}
                        baglam={baglam}
                        secenekler={secenekler}
                        activeSecenek={activeSecenek}
                        activeSecenekId={activeSecenekId}
                        onSelectSecenekId={setActiveSecenekId}
                        onUpdateActiveSecenek={updateActiveSecenek}
                        onAddOptionTab={handleAddOptionTab}
                        onCloneActiveOptionTab={handleCloneActiveOptionTab}
                        onRemoveOptionTab={handleRemoveOptionTab}
                        onRenameSecenek={handleRenameSecenek}
                        quickSearchText={quickSearchText}
                        setQuickSearchText={setQuickSearchText}
                        isSearchingProduct={isSearchingProduct}
                        onQuickProductSearch={handleQuickProductSearch}
                        onOpenUrunModal={() => setUrunModalOpen(true)}
                        onOpenPaketModal={handleOpenPaketModal}
                        onOpenKampanyaModal={() => setKampanyaModalOpen(true)}
                        kampanyaAnalizSonucu={kampanyaAnalizSonucu}
                        currencySymbol={currencySymbol}
                        calculateSecenekSummary={calculateSecenekSummary}
                        handleHedefNetTutarApply={handleHedefNetTutarApply}
                        quickInputRef={quickInputRef}
                        onConvertToOrder={handleConvertToOrder}
                        isConvertingOrder={isConvertingOrder}
                    />
                </WizardStep>

                {/* 3. AŞAMA: TÜKETİCİ BİLGİLERİ & ONAY */}
                <WizardStep
                    id="step-tuketici-bilgileri"
                    title={t('sicak_satis.step3_title', 'Tüketici Bilgileri & Onay')}
                    onValidate={handleValidateStep3}
                >
                    <SicakSatisTuketiciStep
                        formData={formData}
                        onMasterChange={handleMasterChange}
                        errors={errors}
                        baglam={baglam}
                        secenekler={secenekler}
                        activeSecenek={activeSecenek}
                        activeSecenekId={activeSecenekId}
                        onSelectSecenekId={setActiveSecenekId}
                        currencySymbol={currencySymbol}
                        calculateSecenekSummary={calculateSecenekSummary}
                        onOpenCariModal={() => setCariModalOpen(true)}
                        onOpenAddressModal={(target) => {
                            if (!formData.cariId) {
                                toast.error(t('CariAdresSecici_cariSeciniz', 'Lütfen önce bir cari seçiniz.'), { icon: '⚠️' });
                                return;
                            }
                            setTargetAddressField(target);
                            setCariAdresModalOpen(true);
                        }}
                        onConvertToOrder={handleConvertToOrder}
                        isConvertingOrder={isConvertingOrder}
                    />
                </WizardStep>
            </BaseWizardPage>

            {/* Cari Seçici Modal */}
            <CariSeciciModal
                isOpen={cariModalOpen}
                onClose={() => setCariModalOpen(false)}
                onSelect={handleCariSelect}
                initialSearchText={formData.cariMetni}
            />

            {/* Ürün Seçici Modal */}
            <UrunSeciciModal
                isOpen={urunModalOpen}
                onClose={() => setUrunModalOpen(false)}
                onSelect={async (selectedProduct: any) => {
                    if (!selectedProduct?.id) return;
                    const fallbackPrice = Number(selectedProduct.satisFiyatiKdvDahil || selectedProduct.satisFiyati || 0);
                    await addProductsToActiveCart([{
                        urunId: Number(selectedProduct.id),
                        miktar: 1,
                        fallbackPrice: fallbackPrice > 0 ? fallbackPrice : undefined
                    }]);
                    setUrunModalOpen(false);
                    setQuickSearchText('');
                }}
                initialSearchText={quickSearchText}
            />

            {/* Hazır Paket / Set Seçici Modal */}
            {paketModalOpen && (
                <BasePopup
                    isOpen={paketModalOpen}
                    onClose={() => setPaketModalOpen(false)}
                    title={t('sicak_satis.select_package_modal_title', 'Hazır Paket / Set Yükle')}
                    modalSize="md"
                    hideFooter={true}
                >
                    <div className="sicak-satis-paket-modal-list">
                        {isPaketLoading ? (
                            <div className="p-24 text-center text-secondary">
                                {t('common.loading', 'Yükleniyor...')}
                            </div>
                        ) : paketListesi.length === 0 ? (
                            <div className="p-24 text-center text-secondary">
                                {t('sicak_satis.no_active_package', 'Tanımlı aktif paket veya set bulunamadı.')}
                            </div>
                        ) : (
                            paketListesi.map((paket) => (
                                <div
                                    key={paket.id}
                                    className="sicak-satis-paket-item"
                                    onClick={() => handlePaketSelect(paket)}
                                >
                                    <div className="sicak-satis-paket-info">
                                        <span className="code-badge">{paket.kod}</span>
                                        <strong>{paket.ad}</strong>
                                        <span className="text-secondary text-12">
                                            ({paket.kalemSayisi} {t('sicak_satis.item_short', 'Ürün')})
                                        </span>
                                    </div>
                                    <button type="button" className="sicak-satis-paket-load-btn">
                                        <span>{t('sicak_satis.load_into_cart', 'Sepete Yükle')}</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </BasePopup>
            )}

            {/* Cari Adres Seçici Modal */}
            {cariAdresModalOpen && (
                <CariAdresSecici
                    isOpen={cariAdresModalOpen}
                    onClose={() => setCariAdresModalOpen(false)}
                    cariId={Number(formData.cariId)}
                    onSelect={handleCariAdresSelect}
                />
            )}

            {/* Kampanya Analiz Modalı */}
            <SiparisKampanyaAnalizModal
                isOpen={kampanyaModalOpen}
                onClose={() => setKampanyaModalOpen(false)}
                analizSonucu={kampanyaAnalizSonucu}
                isLoading={false}
                onKampanyaUygula={handleKampanyaUygula}
                uygulananKampanya={
                    kampanyaAnalizSonucu?.uygulanabilirKampanyalar.find(
                        k => k.kampanyaId === activeSecenek.uygulananKampanyaId
                    ) || null
                }
                onKampanyaKaldir={handleKampanyaKaldir}
            />
        </>
    );
};

export default SicakSatisTeklifForm;
