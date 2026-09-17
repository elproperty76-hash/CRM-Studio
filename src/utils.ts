export const formatIDR = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

export const openWhatsApp = (phone: string, text: string = '') => {
  if (!phone) return;
  // Clean phone number: remove non-digits
  let cleaned = phone.replace(/\D/g, '');
  // Assuming Indonesian numbers starting with 0
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }
  const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};
