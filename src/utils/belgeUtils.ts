import { applyCasing, HarfDonusumu } from '@akalin/ui';

export const generateBelgeNo = (ayar: any, tarih?: any): string => {
    if (!ayar || !ayar.otomatikNumaraVerilsinMi) return '';
    
    const sablon = ayar.kodSablonu || '[Yıl][Ay][Gün]-[Harf Serisi][Sayaç]';
    const dateObj = tarih ? new Date(tarih) : new Date();
    
    const year = dateObj.getFullYear().toString();
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const day = dateObj.getDate().toString().padStart(2, '0');
    const seriNo = ayar.seriNo || '';
    const sayacLength = ayar.sayacUzunlugu || 4;
    const sayacStr = '?'.repeat(sayacLength);

    return sablon
        .replace(/\[Yıl(?::([^\]]+))?\]/gi, (_, mod) => mod ? applyCasing(year, mod as HarfDonusumu) : year)
        .replace(/\[Ay(?::([^\]]+))?\]/gi, (_, mod) => mod ? applyCasing(month, mod as HarfDonusumu) : month)
        .replace(/\[Gün(?::([^\]]+))?\]/gi, (_, mod) => mod ? applyCasing(day, mod as HarfDonusumu) : day)
        .replace(/\[Harf Serisi(?::([^\]]+))?\]/gi, (_, mod) => mod ? applyCasing(seriNo, mod as HarfDonusumu) : seriNo)
        .replace(/\[Sayaç(?::([^\]]+))?\]/gi, sayacStr);
};

export default generateBelgeNo;
