/**
 * Webakus ERP - Sıcak Satış & Pazarlık (Teklif) Formu Otomatik Odaklanma (AutoFocus) Hook'u
 *
 * Başlıca Sorumlulukları:
 * - Sayfa ilk açıldığında veya üst sekme / teklif seçeneği sekmesi değiştiğinde
 *   barkod / ürün hızlı arama inputuna veya ilk etkin alana otomatik odaklanmayı sağlar.
 */

import { useEffect } from 'react';

export interface UseSicakSatisTeklifAutoFocusOptions {
    otomatikNumaraVerilsinMi?: boolean;
    activeHeaderTab?: string | number;
    activeOptionTabId?: string | number;
    isEditMode?: boolean;
}

export const useSicakSatisTeklifAutoFocus = ({
    activeHeaderTab,
    activeOptionTabId
}: UseSicakSatisTeklifAutoFocusOptions) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            const barkodInput = document.getElementById('sicakSatisBarkodInput') as HTMLInputElement | null;
            if (barkodInput && !barkodInput.disabled) {
                barkodInput.focus();
            }
        }, 80);

        return () => clearTimeout(timer);
    }, [activeHeaderTab, activeOptionTabId]);
};

export default useSicakSatisTeklifAutoFocus;
