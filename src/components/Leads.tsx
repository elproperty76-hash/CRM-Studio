import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getStoredLeads, saveStoredLeads } from '../lib/storage';
import { Lead, LeadStatus } from '../types';
import { openWhatsApp } from '../utils';
import { MessageCircle, Plus, Edit2, Trash2, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import WhatsAppModal from './WhatsAppModal';
import MessageStatusIndicator from './MessageStatusIndicator';

const STATUS_CONFIG: Record<LeadStatus, { label: string, color: string, bg: string }> = {
  new: { label: 'Baru', color: 'text-blue-700', bg: 'bg-blue-100' },
  contacted: { label: 'Dihubungi', color: 'text-purple-700', bg: 'bg-purple-100' },
  qualified: { label: 'Kualifikasi', color: 'text-orange-700', bg: 'bg-orange-100' },
  won: { label: 'Deal (Won)', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  lost: { label: 'Gagal (Lost)', color: 'text-red-700', bg: 'bg-red-100' },
};

const STATUS_KEYS = Object.keys(STATUS_CONFIG) as LeadStatus[];

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>(() => getStoredLeads());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<{id: string, name: string, phone: string} | null>(null);
  const [deletingLead, setDeletingLead] = useState<{id: string, name: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState({ 
    name: '', city: '', phone: '', status: 'new' as LeadStatus, notes: '' 
  });

  useEffect(() => {
    const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsData = snapshot.docs.map(doc => {
        const data = doc.data();
        const rawStatus = data.status;
        const normalizedStatus: LeadStatus = (rawStatus === 'proposal' || !STATUS_CONFIG[rawStatus as LeadStatus])
          ? 'qualified'
          : (rawStatus as LeadStatus);
        return { id: doc.id, ...data, status: normalizedStatus } as Lead;
      });

      if (docsData.length > 0) {
        setLeads(docsData);
        saveStoredLeads(docsData);
      } else {
        const local = getStoredLeads();
        if (local.length > 0) {
          local.forEach(async (l) => {
            try {
              const { id, ...lData } = l;
              await addDoc(collection(db, 'leads'), lData);
            } catch (err) {
              console.warn('Gagal sinkronisasi prospek lokal ke cloud:', err);
            }
          });
        }
      }
    }, (error) => {
      console.warn('Firestore offline/error, menggunakan cache browser lokal:', error);
      const local = getStoredLeads();
      if (local.length > 0) {
        setLeads(local);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name.trim(),
      city: formData.city.trim(),
      company: formData.city.trim(), // backwards compatibility
      phone: formData.phone.trim(),
      status: formData.status,
      notes: formData.notes.trim()
    };

    if (editingId) {
      // 1. Simpan langsung ke state & browser storage agar tidak pernah hilang
      const updated = leads.map(l => l.id === editingId ? { ...l, ...payload } : l);
      setLeads(updated);
      saveStoredLeads(updated);

      try {
        if (!editingId.startsWith('lead_')) {
          await updateDoc(doc(db, 'leads', editingId), payload);
        }
      } catch (err) {
        console.warn('Data prospek tetap aman di browser:', err);
      }
    } else {
      const tempId = 'lead_' + Date.now();
      const newLead: Lead = {
        id: tempId,
        ...payload,
        createdAt: Date.now()
      };

      // 1. Simpan langsung ke state & browser storage
      const updated = [newLead, ...leads];
      setLeads(updated);
      saveStoredLeads(updated);

      try {
        const docRef = await addDoc(collection(db, 'leads'), {
          ...payload,
          createdAt: Date.now()
        });
        const finalized = updated.map(l => l.id === tempId ? { ...l, id: docRef.id } : l);
        setLeads(finalized);
        saveStoredLeads(finalized);
      } catch (err) {
        console.warn('Data prospek tetap aman di browser:', err);
      }
    }
    closeModal();
  };

  const openEdit = (lead: Lead) => {
    setFormData({ 
      name: lead.name, 
      city: lead.city || lead.company || '', 
      phone: lead.phone || '', 
      status: lead.status, 
      notes: lead.notes || '' 
    });
    setEditingId(lead.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', city: '', phone: '', status: 'new', notes: '' });
  };

  const confirmDelete = async () => {
    if (!deletingLead) return;
    try {
      setIsDeleting(true);
      // Hapus langsung dari browser storage
      const updated = leads.filter(l => l.id !== deletingLead.id);
      setLeads(updated);
      saveStoredLeads(updated);

      if (!deletingLead.id.startsWith('lead_')) {
        await deleteDoc(doc(db, 'leads', deletingLead.id));
      }
      setDeletingLead(null);
    } catch (error) {
      console.error('Gagal menghapus prospek di cloud:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const moveLead = async (id: string, newStatus: LeadStatus) => {
    // 1. Update langsung di browser storage
    const updated = leads.map(l => l.id === id ? { ...l, status: newStatus } : l);
    setLeads(updated);
    saveStoredLeads(updated);

    try {
      if (!id.startsWith('lead_')) {
        await updateDoc(doc(db, 'leads', id), { status: newStatus });
      }
    } catch (err) {
      console.warn('Gagal update status prospek di cloud:', err);
    }
  };

  return (
    <div className="space-y-6 fade-in h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Pelacakan Prospek (Leads)</h2>
          <p className="text-[var(--text-secondary)]">Kelola prospek di setiap tahapan penjualan.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
        >
          <Plus size={18} />
          Tambah Prospek
        </button>
      </div>

      <div className="flex-1 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth">
        <div className="flex gap-4 min-w-max h-full px-4 md:px-0">
          {STATUS_KEYS.map(status => {
            const columnLeads = leads.filter(l => l.status === status);
            return (
              <div key={status} className="w-[85vw] max-w-[320px] md:w-80 flex flex-col bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)] snap-center md:snap-align-none shrink-0 transition-colors">
                <div className={`p-4 border-b border-[var(--border-color)] rounded-t-2xl ${STATUS_CONFIG[status].bg} dark:bg-opacity-20`}>
                  <h3 className={`font-semibold ${STATUS_CONFIG[status].color} dark:text-opacity-90`}>
                    {STATUS_CONFIG[status].label}
                  </h3>
                  <div className="text-sm opacity-80 mt-1 text-[var(--text-secondary)]">
                    {columnLeads.length} prospek
                  </div>
                </div>
                
                <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                  {columnLeads.map(lead => (
                    <div key={lead.id} className="bg-[var(--bg-card)] p-4 rounded-xl shadow-sm border border-[var(--border-color)] hover:border-blue-300 dark:hover:border-blue-700 transition-colors group">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-[var(--text-primary)] leading-tight">{lead.name}</h4>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <button onClick={() => openEdit(lead)} className="p-1 text-[var(--text-secondary)] hover:text-blue-600 dark:hover:text-blue-400 transition-colors"><Edit2 size={14} /></button>
                          <button onClick={() => setDeletingLead({ id: lead.id, name: lead.name })} className="p-1 text-[var(--text-secondary)] hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Hapus prospek"><Trash2 size={14} /></button>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] mb-3">
                        <MapPin size={14} className="shrink-0 text-blue-500" />
                        <span className="truncate">{lead.city || lead.company || 'Kota belum diisi'}</span>
                      </div>

                      {lead.notes && (
                        <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-main)] p-2 rounded-lg mb-3 line-clamp-2">
                          {lead.notes}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)] mb-2">
                        {lead.phone ? (
                          <button 
                            onClick={() => {
                              setSelectedContact({ id: lead.id, name: lead.name, phone: lead.phone! });
                              setWaModalOpen(true);
                            }}
                            className="text-xs flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium"
                          >
                            <MessageCircle size={14} /> WhatsApp
                          </button>
                        ) : <span />}
                        
                        <select 
                          value={lead.status}
                          onChange={(e) => moveLead(lead.id, e.target.value as LeadStatus)}
                          className="text-xs border border-[var(--border-color)] bg-[var(--bg-main)] rounded-md px-2 py-1 text-[var(--text-secondary)] cursor-pointer focus:ring-1 focus:ring-blue-500"
                        >
                          {STATUS_KEYS.map(s => (
                            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                          ))}
                        </select>
                      </div>
                      <MessageStatusIndicator status={lead.lastMessageStatus} date={lead.lastMessageAt} collectionName="leads" documentId={lead.id} />
                    </div>
                  ))}
                  {columnLeads.length === 0 && (
                    <div className="text-center text-sm text-[var(--text-secondary)] py-6">
                      Kosong
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-[var(--bg-card)] rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[var(--border-color)]">
              <h3 className="text-xl font-bold text-[var(--text-primary)]">{editingId ? 'Edit Prospek' : 'Tambah Prospek Baru'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Nama Prospek</label>
                <input required type="text" placeholder="Nama lengkap prospek" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-[var(--text-secondary)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Domisili Kota</label>
                <input required type="text" placeholder="Cth: Jakarta, Bandung, Surabaya..." value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-[var(--text-secondary)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Nomor WhatsApp (Opsional)</label>
                <input type="tel" placeholder="Cth: 08123456789" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-[var(--text-secondary)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Status</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as LeadStatus})} className="w-full px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {STATUS_KEYS.map(s => (
                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Catatan</label>
                <textarea rows={3} placeholder="Catatan tambahan mengenai prospek..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-[var(--text-secondary)]" />
              </div>
              <div className="pt-4 flex gap-3 justify-end">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-xl font-medium transition-colors">
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors">
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
          collectionName="leads"
          documentId={selectedContact.id}
        />
      )}

      {deletingLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-[var(--bg-card)] rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200 p-6 border border-[var(--border-color)]">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-center text-[var(--text-primary)] mb-2">Hapus Data Prospek?</h3>
            <p className="text-sm text-center text-[var(--text-secondary)] mb-6">
              Apakah Anda yakin ingin menghapus prospek <strong>{deletingLead.name}</strong>? Data yang dihapus tidak dapat dikembalikan.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingLead(null)}
                className="flex-1 px-4 py-2 border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-xl font-medium transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
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
