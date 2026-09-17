import { Customer, Lead } from '../types';
import { format } from 'date-fns';

/**
 * Escapes a cell value for standard CSV compatibility:
 * - Wraps in double quotes if it contains commas, double quotes, or line breaks.
 * - Doubles any internal double quotes.
 */
function escapeCSVCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Converts array of headers and rows into a formatted CSV string with UTF-8 BOM.
 */
export function generateCSVString(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const headerLine = headers.map(escapeCSVCell).join(',');
  const rowLines = rows.map(row => row.map(escapeCSVCell).join(','));
  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
}

/**
 * Triggers a client-side download of a CSV file.
 */
export function triggerCSVDownload(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports Customer data to a CSV backup file.
 */
export function exportCustomersToCSV(customers: Customer[], customFilename?: string): void {
  const headers = [
    'ID Pelanggan',
    'Nama Pelanggan',
    'Domisili Kota',
    'Nomor Telepon / WA',
    'Alamat Email',
    'Status Pesan WA',
    'Waktu Pesan Terakhir',
    'Tanggal Terdaftar'
  ];

  const rows = customers.map(c => [
    c.id,
    c.name,
    c.city || c.company || '-',
    c.phone,
    c.email || '-',
    c.lastMessageStatus || 'Belum dihubungi',
    c.lastMessageAt ? format(c.lastMessageAt, 'yyyy-MM-dd HH:mm:ss') : '-',
    c.createdAt ? format(c.createdAt, 'yyyy-MM-dd HH:mm:ss') : '-'
  ]);

  const filename = customFilename || `Backup_Pelanggan_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
  const csv = generateCSVString(headers, rows);
  triggerCSVDownload(filename, csv);
}

/**
 * Exports Lead data to a CSV backup file.
 */
export function exportLeadsToCSV(leads: Lead[], customFilename?: string): void {
  const headers = [
    'ID Prospek',
    'Nama Prospek',
    'Domisili Kota',
    'Nomor Telepon / WA',
    'Status Prospek',
    'Catatan / Notes',
    'Status Pesan WA',
    'Waktu Pesan Terakhir',
    'Tanggal Dibuat'
  ];

  const rows = leads.map(l => [
    l.id,
    l.name,
    l.city || l.company || '-',
    l.phone || '-',
    l.status,
    l.notes || '-',
    l.lastMessageStatus || 'Belum dihubungi',
    l.lastMessageAt ? format(l.lastMessageAt, 'yyyy-MM-dd HH:mm:ss') : '-',
    l.createdAt ? format(l.createdAt, 'yyyy-MM-dd HH:mm:ss') : '-'
  ]);

  const filename = customFilename || `Backup_Prospek_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
  const csv = generateCSVString(headers, rows);
  triggerCSVDownload(filename, csv);
}

/**
 * Exports both Customers and Leads in a unified comprehensive backup CSV file.
 */
export function exportUnifiedBackupToCSV(customers: Customer[], leads: Lead[], customFilename?: string): void {
  const headers = [
    'Tipe Entitas',
    'ID Entitas',
    'Nama Kontak / Bisnis',
    'Domisili Kota',
    'Nomor Telepon / WA',
    'Email / Status Penjualan',
    'Catatan Tambahan',
    'Status Pesan WA Terakhir',
    'Waktu Pesan Terakhir',
    'Tanggal Dibuat'
  ];

  const customerRows = customers.map(c => [
    'Pelanggan',
    c.id,
    c.name,
    c.city || c.company || '-',
    c.phone,
    c.email || '-',
    '-',
    c.lastMessageStatus || 'Belum dihubungi',
    c.lastMessageAt ? format(c.lastMessageAt, 'yyyy-MM-dd HH:mm:ss') : '-',
    c.createdAt ? format(c.createdAt, 'yyyy-MM-dd HH:mm:ss') : '-'
  ]);

  const leadRows = leads.map(l => [
    'Prospek (Lead)',
    l.id,
    l.name,
    l.city || l.company || '-',
    l.phone || '-',
    `Status: ${l.status}`,
    l.notes || '-',
    l.lastMessageStatus || 'Belum dihubungi',
    l.lastMessageAt ? format(l.lastMessageAt, 'yyyy-MM-dd HH:mm:ss') : '-',
    l.createdAt ? format(l.createdAt, 'yyyy-MM-dd HH:mm:ss') : '-'
  ]);

  const rows = [...customerRows, ...leadRows];
  const filename = customFilename || `Backup_CRM_Lengkap_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
  const csv = generateCSVString(headers, rows);
  triggerCSVDownload(filename, csv);
}

/**
 * Exports both separate CSV files (Pelanggan and Prospek) in one action.
 */
export function exportBothCSVFiles(customers: Customer[], leads: Lead[]): void {
  exportCustomersToCSV(customers);
  setTimeout(() => {
    exportLeadsToCSV(leads);
  }, 250);
}
