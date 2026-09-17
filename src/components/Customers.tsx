import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getStoredCustomers, saveStoredCustomers } from '../lib/storage';
import { Customer } from '../types';
import { useAuth } from '../context/AuthContext';
import { MessageCircle, Plus, Trash2, Edit2, Search, MapPin, Download } from 'lucide-react';
import { format } from 'date-fns';
import WhatsAppModal from './WhatsAppModal';
import MessageStatusIndicator from './MessageStatusIndicator';
import { exportCustomersToCSV } from '../lib/exportCsv';

export default function Customers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>(() => getStoredCustomers(user?.uid));
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<{id: string, name: string, phone: string} | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<{id: string, name: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', city: '' });

  useEffect(() => {
    if (!user) return;

    // Reset/load cache khusus untuk pengguna yang sedang aktif
    const cached = getStoredCustomers(user.uid);
    setCustomers(cached);

    const userColl = collection(db, 'users', user.uid, 'customers');
    const q = query(userColl, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const docsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
      if (docsData.length > 0) {
        setCustomers(docsData);
        saveStoredCustomers(docsData, user.uid);
      } else {
        // Jika data pengguna kosong di cloud, cek cache lokal atau koleksi legacy
        const local = getStoredCustomers(user.uid);
        if (local.length > 0) {
          for (const c of local) {
            try {
              const { id, ...cData } = c;
              await addDoc(userColl, { ...cData, userId: user.uid });
            } catch (err) {
              console.warn('Gagal sinkronisasi data lokal ke cloud:', err);
            }
          }
        } else {
          // Migrasi data legacy awal (jika ada) ke ruang akun pengguna ini
          try {
            const legacySnap = await getDocs(collection(db, 'customers'));
            if (!legacySnap.empty) {
              const migrated: Customer[] = [];
              for (const lDoc of legacySnap.docs) {
                const lData = lDoc.data();
                const newRef = await addDoc(userColl, {
                  ...lData,
                  userId: user.uid,
                  createdAt: lData.createdAt || Date.now()
                });
                migrated.push({ id: newRef.id, ...lData, userId: user.uid } as Customer);
              }
              if (migrated.length > 0) {
                setCustomers(migrated);
                saveStoredCustomers(migrated, user.uid);
              }
            }
          } catch (err) {
            console.warn('Cek migrasi legacy diabaikan:', err);
          }
        }
      }
    }, (error) => {
      console.warn('Firestore offline/error, menggunakan cache browser lokal:', error);
      const local = getStoredCustomers(user.uid);
      if (local.length > 0) {
        setCustomers(local);
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.city || c.company || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const payload = {
      userId: user.uid,
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      city: formData.city.trim(),
      company: formData.city.trim() // backward compatibility
    };

    if (editingId) {
      // 1. Simpan langsung ke state & browser storage agar tidak pernah hilang
      const updated = customers.map(c => c.id === editingId ? { ...c, ...payload } : c);
      setCustomers(updated);
      saveStoredCustomers(updated, user.uid);

      // 2. Kirim update ke cloud Firestore
      try {
        if (!editingId.startsWith('cust_')) {
          await updateDoc(doc(db, 'users', user.uid, 'customers', editingId), payload);
        }
      } catch (err) {
        console.warn('Data pelanggan tetap aman di browser:', err);
      }
    } else {
      const tempId = 'cust_' + Date.now();
      const newCustomer: Customer = {
        id: tempId,
        ...payload,
        createdAt: Date.now()
      };
      
      // 1. Simpan langsung ke state & browser storage
      const updated = [newCustomer, ...customers];
      setCustomers(updated);
      saveStoredCustomers(updated, user.uid);

      // 2. Kirim ke cloud Firestore
      try {
        const docRef = await addDoc(collection(db, 'users', user.uid, 'customers'), {
          ...payload,
          createdAt: Date.now()
        });
        const finalized = updated.map(c => c.id === tempId ? { ...c, id: docRef.id } : c);
        setCustomers(finalized);
        saveStoredCustomers(finalized, user.uid);
      } catch (err) {
        console.warn('Data pelanggan tetap aman di browser:', err);
      }
    }
    closeModal();
  };

  const openEdit = (customer: Customer) => {
    setFormData({ 
      name: customer.name, 
      email: customer.email || '', 
      phone: customer.phone, 
      city: customer.city || customer.company || '' 
    });
    setEditingId(customer.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', email: '', phone: '', city: '' });
  };

  const promptDelete = (customer: Customer) => {
    setDeletingCustomer({ id: customer.id, name: customer.name });
  };

  const confirmDelete = async () => {
    if (!deletingCustomer || !user) return;
    try {
      setIsDeleting(true);
      // Hapus langsung dari browser storage
      const updated = customers.filter(c => c.id !== deletingCustomer.id);
      setCustomers(updated);
      saveStoredCustomers(updated, user.uid);

      if (!deletingCustomer.id.startsWith('cust_')) {
        await deleteDoc(doc(db, 'users', user.uid, 'customers', deletingCustomer.id));
      }
      setDeletingCustomer(null);
    } catch (error) {
      console.error('Gagal menghapus data pelanggan di cloud:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Manajemen Pelanggan</h2>
          <p className="text-[var(--text-secondary)]">Kelola data pelanggan dan hubungi via WhatsApp.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => exportCustomersToCSV(customers)}
            disabled={customers.length === 0}
            className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] px-3.5 py-2 rounded-xl transition-colors flex items-center gap-2 font-medium shadow-sm cursor-pointer disabled:opacity-50"
            title="Ekspor daftar pelanggan ke file CSV"
          >
            <Download size={16} className="text-blue-600" />
            <span className="hidden sm:inline">Export</span> CSV
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-sm cursor-pointer"
          >
            <Plus size={18} />
            Tambah Pelanggan
          </button>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm overflow-hidden transition-colors">
        <div className="p-4 border-b border-[var(--border-color)]">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
            <input 
              type="text" 
              placeholder="Cari pelanggan berdasarkan nama atau domisili kota..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-[var(--text-secondary)]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-[var(--bg-main)]/50 text-sm">
                <th className="px-6 py-4 font-medium text-[var(--text-secondary)]">Nama / Domisili Kota</th>
                <th className="px-6 py-4 font-medium text-[var(--text-secondary)]">Kontak</th>
                <th className="px-6 py-4 font-medium text-[var(--text-secondary)]">Tanggal Dibuat</th>
                <th className="px-6 py-4 font-medium text-[var(--text-secondary)]">Status WA</th>
                <th className="px-6 py-4 font-medium text-[var(--text-secondary)] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filteredCustomers.length > 0 ? filteredCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-[var(--text-primary)]">{customer.name}</div>
                    <div className="text-sm text-[var(--text-secondary)] flex items-center gap-1 mt-0.5">
                      <MapPin size={13} className="text-blue-500 shrink-0" />
                      <span>{customer.city || customer.company || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-[var(--text-primary)]">{customer.phone}</div>
                    <div className="text-sm text-[var(--text-secondary)]">{customer.email || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {format(customer.createdAt, 'dd MMM yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <MessageStatusIndicator 
                      status={customer.lastMessageStatus} 
                      date={customer.lastMessageAt} 
                      collectionName="customers" 
                      documentId={customer.id}
                      userId={user?.uid}
                    />
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={() => {
                        setSelectedContact({ id: customer.id, name: customer.name, phone: customer.phone });
                        setWaModalOpen(true);
                      }}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 transition-colors cursor-pointer"
                      title="Kirim pesan WhatsApp"
                    >
                      <MessageCircle size={16} />
                    </button>
                    <button 
                      onClick={() => openEdit(customer)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-400 transition-colors cursor-pointer"
                      title="Edit pelanggan"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => promptDelete(customer)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-400 transition-colors cursor-pointer"
                      title="Hapus pelanggan"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[var(--text-secondary)]">
                    Tidak ada pelanggan ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-[var(--bg-card)] rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[var(--border-color)]">
              <h3 className="text-xl font-bold text-[var(--text-primary)]">{editingId ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Nama Lengkap</label>
                <input required type="text" placeholder="Nama lengkap pelanggan" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-[var(--text-secondary)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Domisili Kota</label>
                <input required type="text" placeholder="Cth: Jakarta, Surabaya, Bandung..." value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-[var(--text-secondary)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Nomor WhatsApp (Cth: 0812...)</label>
                <input required type="tel" placeholder="08123456789" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-[var(--text-secondary)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Email (Opsional)</label>
                <input type="email" placeholder="nama@email.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-[var(--text-secondary)]" />
              </div>
              <div className="pt-4 flex gap-3 justify-end">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-xl font-medium transition-colors cursor-pointer">
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors cursor-pointer">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedContact && (
        <WhatsAppModal
          isOpen={waModalOpen}
          onClose={() => setWaModalOpen(false)}
          recipientName={selectedContact.name}
          recipientPhone={selectedContact.phone}
          collectionName="customers"
          documentId={selectedContact.id}
          userId={user?.uid}
        />
      )}

      {deletingCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-[var(--bg-card)] rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200 p-6 border border-[var(--border-color)]">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-center text-[var(--text-primary)] mb-2">Hapus Data Pelanggan?</h3>
            <p className="text-sm text-center text-[var(--text-secondary)] mb-6">
              Apakah Anda yakin ingin menghapus data <strong>{deletingCustomer.name}</strong>? Data yang dihapus tidak dapat dikembalikan.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingCustomer(null)}
                className="flex-1 px-4 py-2 border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-xl font-medium transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
