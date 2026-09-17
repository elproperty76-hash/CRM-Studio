import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Customer, Lead } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Users, Target, TrendingUp, CheckCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

import { getStoredCustomers, getStoredLeads } from '../lib/storage';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#64748b'];

export default function Dashboard() {
  const [customers, setCustomers] = useState<Customer[]>(() => getStoredCustomers());
  const [leads, setLeads] = useState<Lead[]>(() => getStoredLeads());
  const [loading, setLoading] = useState(() => {
    const initCustomers = getStoredCustomers();
    const initLeads = getStoredLeads();
    return initCustomers.length === 0 && initLeads.length === 0;
  });

  useEffect(() => {
    const unsubCustomers = onSnapshot(query(collection(db, 'customers'), orderBy('createdAt', 'desc')), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      if (docs.length > 0) {
        setCustomers(docs);
      }
      setLoading(false);
    }, (err) => {
      console.warn('Dashboard offline mode:', err);
      setLoading(false);
    });

    const unsubLeads = onSnapshot(query(collection(db, 'leads'), orderBy('createdAt', 'desc')), (snapshot) => {
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
  }, []);

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
        <div className="flex items-center gap-2">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl hover:bg-[var(--bg-hover)] transition-colors font-medium shadow-sm"
          >
            <Download size={18} className="text-green-600" />
            Excel
          </button>
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl hover:bg-[var(--bg-hover)] transition-colors font-medium shadow-sm"
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
