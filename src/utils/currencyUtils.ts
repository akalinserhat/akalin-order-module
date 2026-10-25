export const getCurrencySymbol = (code: string | undefined): string => {
    if (!code) return '';
    const upperCode = code.toUpperCase();
    
    // EURO exception to map to correct ISO code
    const isoCode = upperCode === 'EURO' ? 'EUR' : (upperCode === 'TL' ? 'TRY' : upperCode);

    try {
        const formatter = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: isoCode });
        const parts = formatter.formatToParts(0);
        const symbolPart = parts.find(p => p.type === 'currency');
        return symbolPart ? symbolPart.value : code;
    } catch (e) {
        // Fallback for invalid currency codes
        const symbols: Record<string, string> = { 
            'TRY': '₺', 
            'USD': '$', 
            'EUR': '€', 
            'GBP': '£'
        };
        return symbols[isoCode] || code;
    }
};

export default getCurrencySymbol;
