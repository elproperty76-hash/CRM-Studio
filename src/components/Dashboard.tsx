import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Customer, Lead } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Users, Target, TrendingUp, CheckCircle, Download, FileSpreadsheet, X, FileText, Check } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

import { getStoredCustomers, getStoredLeads } from '../lib/storage';
import { useAuth } from '../context/AuthContext';
import { 
  exportCustomersToCSV, 
  exportLeadsToCSV, 
  exportUnifiedBackupToCSV, 
  exportBothCSVFiles 
} from '../lib/exportCsv';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#64748b'];

export default function Dashboard() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>(() => getStoredCustomers(user?.uid));
  const [leads, setLeads] = useState<Lead[]>(() => getStoredLeads(user?.uid));
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => {
    const initCustomers = getStoredCustomers(user?.uid);
    const initLeads = getStoredLeads(user?.uid);
    return initCustomers.length === 0 && initLeads.length === 0;
  });

  useEffect(() => {
    if (!user) return;

    setCustomers(getStoredCustomers(user.uid));
    setLeads(getStoredLeads(user.uid));

    const userCustColl = collection(db, 'users', user.uid, 'customers');
    const userLeadColl = collection(db, 'users', user.uid, 'leads');

    const unsubCustomers = onSnapshot(query(userCustColl, orderBy('createdAt', 'desc')), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      if (docs.length > 0) {
        setCustomers(docs);
      }
      setLoading(false);
    }, (err) => {
      console.warn('Dashboard offline mode:', err);
      setLoading(false);
    });

    const unsubLeads = onSnapshot(query(userLeadColl, orderBy('createdAt', 'desc')), (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          status: d.status === 'proposal' ? 'qualified' : d.status
        } as Lead;
      });
      if (data.length > 0) {
        setLeads(data);
      }
      setLoading(false);
    }, (err) => {
      console.warn('Dashboard offline mode:', err);
      setLoading(false);
    });

    return () => {
      unsubCustomers();
      unsubLeads();
    };
  }, [user?.uid]);

  const exportToExcel = () => {
    // Prepare Leads Data
    const leadsData = leads.map(l => ({
      'Nama Prospek': l.name,
      'Domisili Kota': l.city || l.company || '-',
      'Telepon': l.phone || '-',
      'Status': l.status,
      'Catatan': l.notes || '-',
      'Tanggal Dibuat': format(l.createdAt, 'dd/MM/yyyy HH:mm')
    }));

    // Prepare Customers Data
    const customersData = customers.map(c => ({
      'Nama Pelanggan': c.name,
      'Domisili Kota': c.city || c.company || '-',
      'Telepon': c.phone,
      'Email': c.email || '-',
      'Tanggal Bergabung': format(c.createdAt, 'dd/MM/yyyy HH:mm')
    }));

    const wb = XLSX.utils.book_new();
    const wsLeads = XLSX.utils.json_to_sheet(leadsData);
    const wsCustomers = XLSX.utils.json_to_sheet(customersData);

    XLSX.utils.book_append_sheet(wb, wsLeads, "Data Prospek");
    XLSX.utils.book_append_sheet(wb, wsCustomers, "Data Pelanggan");

    XLSX.writeFile(wb, `Laporan_CRM_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const today = format(new Date(), 'dd/MM/yyyy');
    
    // Header
    doc.setFontSize(20);
    doc.text('Laporan Rekap CRM', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Tanggal Cetak: ${today}`, 14, 30);
    
    // Summary
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Ringkasan Performa', 14, 45);
    
    doc.setFontSize(11);
    doc.text(`Total Pelanggan: ${customers.length}`, 14, 55);
    doc.text(`Total Prospek: ${leads.length}`, 14, 62);
    doc.text(`Prospek Aktif: ${leads.filter(l => !['won', 'lost'].includes(l.status)).length}`, 14, 69);
    doc.text(`Prospek Deal (Won): ${leads.filter(l => l.status === 'won').length}`, 14, 76);

    // Leads Table
    doc.setFontSize(14);
    doc.text('Daftar Prospek Terbaru', 14, 95);
    
    const tableData = leads.slice(0, 20).map(l => [
      l.name,
      l.city || l.company || '-',
      l.status.toUpperCase(),
      format(l.createdAt, 'dd/MM/yyyy')
    ]);

    autoTable(doc, {
      startY: 100,
      head: [['Nama Prospek', 'Domisili Kota', 'Status', 'Tanggal']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`Laporan_CRM_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  if (loading) return <div className="text-neutral-500 animate-pulse">Memuat dashboard...</div>;

  const activeLeads = leads.filter(l => !['won', 'lost'].includes(l.status)).length;
  const wonLeads = leads.filter(l => l.status === 'won').length;

  const statusCount = leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(statusCount).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }));

  // Group leads by domisili kota for bar chart
  const cityCount = leads.reduce((acc, lead) => {
    const loc = lead.city || lead.company || 'Lainnya';
    acc[loc] = (acc[loc] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const barData = Object.entries(cityCount).map(([name, value]) => ({ name, value: Number(value) })).sort((a,b) => b.value - a.value).slice(0, 5);

  return (
    <div className="space-y-8 fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Dashboard Analitik</h2>
          <p className="text-[var(--text-secondary)]">Ringkasan performa penjualan dan pelanggan Anda.</p>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <button 
            onClick={() => setIsBackupModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors font-medium shadow-sm cursor-pointer"
            title="Cadangkan data ke format CSV"
          >
            <Download size={18} className="text-blue-600 dark:text-blue-400" />
            Backup CSV
          </button>
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl hover:bg-[var(--bg-hover)] transition-colors font-medium shadow-sm cursor-pointer"
          >
            <Download size={18} className="text-green-600" />
            Excel
          </button>
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl hover:bg-[var(--bg-hover)] transition-colors font-medium shadow-sm cursor-pointer"
          >
            <Download size={18} className="text-red-600" />
            PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Pelanggan" value={customers.length} icon={<Users size={24} className="text-blue-600" />} />
        <StatCard title="Total Prospek" value={leads.length} icon={<TrendingUp size={24} className="text-purple-600" />} />
        <StatCard title="Prospek Aktif" value={activeLeads} icon={<Target size={24} className="text-orange-600" />} />
        <StatCard title="Prospek Deal (Won)" value={wonLeads} icon={<CheckCircle size={24} className="text-emerald-600" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm">
          <h3 className="text-lg font-semibold mb-6 text-[var(--text-primary)]">Status Prospek</h3>
          <div className="h-[300px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[var(--text-secondary)]">Belum ada data prospek</div>
            )}
          </div>
        </div>

        <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm">
          <h3 className="text-lg font-semibold mb-6 text-[var(--text-primary)]">Top 5 Domisili Kota Prospek</h3>
          <div className="h-[300px]">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                  <XAxis type="number" allowDecimals={false} stroke="var(--text-secondary)" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} stroke="var(--border-color)" />
                  <Tooltip formatter={(value: number) => [`${value} Prospek`, 'Jumlah']} contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[var(--text-secondary)]">Belum ada data domisili</div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Backup CSV */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-opacity animate-in fade-in duration-200">
          <div className="bg-[var(--bg-card)] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-[var(--border-color)] animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Cadangkan Data (Backup CSV)</h3>
                  <p className="text-xs text-[var(--text-secondary)]">Ekspor data ke format CSV yang kompatibel dengan Excel & spreadsheet</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsBackupModalOpen(false);
                  setDownloadSuccess(null);
                }}
                className="p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Ringkasan Data Saat Ini */}
              <div className="p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Data siap dicadangkan:</span>
                <div className="flex gap-2 font-medium">
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    {customers.length} Pelanggan
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                    {leads.length} Prospek
                  </span>
                </div>
              </div>

              {downloadSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 animate-in fade-in">
                  <Check size={16} className="shrink-0" />
                  <span>{downloadSuccess}</span>
                </div>
              )}

              {/* Opsi Unduhan Backup */}
              <div className="space-y-2.5">
                <button
                  onClick={() => {
                    exportUnifiedBackupToCSV(customers, leads);
                    setDownloadSuccess('File CSV backup lengkap berhasil diunduh.');
                  }}
                  className="w-full p-3.5 rounded-xl border border-[var(--border-color)] hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 text-left transition-all flex items-start gap-3.5 group cursor-pointer"
                >
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 group-hover:scale-105 transition-transform shrink-0">
                    <Download size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-between">
                      <span>Backup Lengkap (1 File CSV)</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">Rekomendasi</span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Menyatukan seluruh data Pelanggan & Prospek dalam 1 dokumen terpadu untuk arsip lengkap.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    exportBothCSVFiles(customers, leads);
                    setDownloadSuccess('2 file CSV (Pelanggan & Prospek) berhasil diunduh.');
                  }}
                  className="w-full p-3.5 rounded-xl border border-[var(--border-color)] hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-900/20 text-left transition-all flex items-start gap-3.5 group cursor-pointer"
                >
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400 group-hover:scale-105 transition-transform shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-purple-600 dark:group-hover:text-purple-400">
                      Backup 2 File CSV Terpisah
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Mengunduh otomatis 1 file CSV Pelanggan dan 1 file CSV Prospek secara bersamaan.
                    </p>
                  </div>
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => {
                      exportCustomersToCSV(customers);
                      setDownloadSuccess('File CSV Pelanggan berhasil diunduh.');
                    }}
                    className="p-3 rounded-xl border border-[var(--border-color)] hover:border-blue-400 hover:bg-[var(--bg-hover)] text-left transition-all flex items-center gap-2.5 cursor-pointer"
                  >
                    <Download size={15} className="text-blue-600 shrink-0" />
                    <div className="truncate">
                      <div className="text-xs font-semibold text-[var(--text-primary)]">CSV Pelanggan Saja</div>
                      <div className="text-[11px] text-[var(--text-secondary)]">{customers.length} kontak pelanggan</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      exportLeadsToCSV(leads);
                      setDownloadSuccess('File CSV Prospek berhasil diunduh.');
                    }}
                    className="p-3 rounded-xl border border-[var(--border-color)] hover:border-blue-400 hover:bg-[var(--bg-hover)] text-left transition-all flex items-center gap-2.5 cursor-pointer"
                  >
                    <Download size={15} className="text-purple-600 shrink-0" />
                    <div className="truncate">
                      <div className="text-xs font-semibold text-[var(--text-primary)]">CSV Prospek Saja</div>
                      <div className="text-[11px] text-[var(--text-secondary)]">{leads.length} data prospek</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsBackupModalOpen(false);
                    setDownloadSuccess(null);
                  }}
                  className="px-4 py-2 bg-[var(--bg-main)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl text-sm font-medium transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: React.ReactNode, icon: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm flex items-center gap-4">
      <div className="p-4 bg-[var(--bg-main)] rounded-xl">
        {icon}
      </div>
      <div>
        <p className="text-sm text-[var(--text-secondary)] font-medium">{title}</p>
        <p className="text-2xl font-bold mt-1 text-[var(--text-primary)]">{value}</p>
      </div>
    </div>
  );
}
