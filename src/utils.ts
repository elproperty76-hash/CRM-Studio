export const formatIDR = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

export const formatWhatsAppNumber = (phone: string): string => {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8') && cleaned.length >= 9 && cleaned.length <= 13) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
};

export const getWhatsAppUrl = (phone: string, text: string = ''): string => {
  const cleaned = formatWhatsAppNumber(phone);
  if (!cleaned) return '';
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
};

export const openWhatsApp = (phone: string, text: string = '') => {
  if (!phone) return;
  const url = getWhatsAppUrl(phone, text);
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

export const getCustomerWhatsAppTemplate = (name: string, city?: string): string => {
  const locationInfo = city ? ` di ${city}` : '';
  return `Halo Kak ${name},\n\nPerkenalkan saya dari tim CRM Studio. Semoga aktivitasnya berjalan lancar! Apakah ada yang bisa kami bantu terkait kebutuhan produk/layanan Anda${locationInfo}?\n\nTerima kasih.`;
};

export const getLeadWhatsAppTemplate = (name: string, status?: string, city?: string): string => {
  const locationInfo = city ? ` di ${city}` : '';
  if (status === 'won') {
    return `Halo Kak ${name},\n\nTerima kasih banyak atas kerja sama dan kepercayaan Anda bersama kami! Jika ada hal yang dapat kami bantu lebih lanjut, jangan ragu untuk mengabari kami.\n\nSalam hangat,\nTim CRM Studio`;
  }
  if (status === 'qualified' || status === 'contacted') {
    return `Halo Kak ${name},\n\nMenindaklanjuti rencana kebutuhan Anda${locationInfo}, apakah ada perkembangan terbaru atau informasi tambahan yang Bapak/Ibu perlukan?\n\nTerima kasih.`;
  }
  return `Halo Kak ${name},\n\nPerkenalkan saya dari tim CRM Studio. Menindaklanjuti ketertarikan Anda terkait penawaran kami${locationInfo}, apakah ada waktu luang untuk berdiskusi santai hari ini?\n\nTerima kasih!`;
};
