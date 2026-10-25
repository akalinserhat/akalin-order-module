/**
 * Webakus ERP - Sipariş Formu Otomatik Odaklanma (AutoFocus) Hook'u
 */

import { useEffect, useRef } from 'react';

export const useSiparisAutoFocus = (isAutoNumber: boolean, loading: boolean) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!loading && inputRef.current) {
            inputRef.current.focus();
        }
    }, [loading, isAutoNumber]);

    return inputRef;
};
