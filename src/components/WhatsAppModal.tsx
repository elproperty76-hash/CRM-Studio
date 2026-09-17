import React, { useState, useEffect } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import { openWhatsApp } from '../utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { updateStoredMessageStatus } from '../lib/storage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  recipientPhone: string;
  collectionName?: 'customers' | 'leads';
  documentId?: string;
  userId?: string;
}

const TEMPLATES = [
  { 
    id: 'greeting', 
    label: 'Sapaan Awal', 
    text: 'Halo {{name}},\n\nPerkenalkan saya dari CRM Studio. Apakah ada waktu luang untuk berdiskusi mengenai kebutuhan perusahaan Anda?' 
  },
  { 
    id: 'followup', 
    label: 'Follow Up', 
    text: 'Halo {{name}},\n\nMenindaklanjuti pembicaraan kita sebelumnya, apakah sudah ada keputusan atau update terbaru dari sisi tim Anda?' 
  },
  { 
    id: 'custom', 
    label: 'Pesan Custom (Ketik Sendiri)', 
    text: '' 
  },
];

export default function WhatsAppModal({ isOpen, onClose, recipientName, recipientPhone, collectionName, documentId, userId }: Props) {
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      handleTemplateChange(TEMPLATES[0].id);
    }
  }, [isOpen, recipientName]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setMessage(template.text.replace(/{{name}}/g, recipientName));
    }
  };

  const handleSend = async () => {
    if (!recipientPhone) {
      alert('Nomor telepon tidak tersedia untuk kontak ini.');
      return;
    }
    
    if (collectionName && documentId) {
      updateStoredMessageStatus(collectionName, documentId, 'sent', Date.now(), userId);
      try {
        const docRef = userId 
          ? doc(db, 'users', userId, collectionName, documentId)
          : doc(db, collectionName, documentId);

        await updateDoc(docRef, {
          lastMessageAt: Date.now(),
          lastMessageStatus: 'sent'
        });
      } catch (error) {
        console.error("Gagal memperbarui status pesan di database", error);
      }
    }
    
    openWhatsApp(recipientPhone, message);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 transition-opacity">
      <div className="bg-[var(--bg-card)] rounded-2xl w-full max-w-lg overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500">
            <MessageCircle size={24} />
            <h3 className="text-xl font-bold text-[var(--text-primary)]">Kirim Pesan WhatsApp</h3>
          </div>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="bg-[var(--bg-main)] p-4 rounded-xl border border-[var(--border-color)]">
            <div className="text-sm text-[var(--text-secondary)] mb-1">Kirim ke:</div>
            <div className="font-semibold text-[var(--text-primary)]">{recipientName}</div>
            <div className="text-sm text-[var(--text-secondary)] font-mono mt-1">{recipientPhone || 'Nomor tidak tersedia'}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Pilih Template Pesan</label>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTemplateChange(t.id)}
                  className={`px-3 py-2 text-sm text-left rounded-lg transition-colors border ${
                    selectedTemplate === t.id 
                      ? 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-medium' 
                      : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Isi Pesan</label>
            <textarea 
              rows={5} 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              placeholder="Ketik pesan Anda di sini..."
              className="w-full px-4 py-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-sans placeholder:text-[var(--text-secondary)]" 
            />
          </div>
        </div>

        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-main)] flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-xl font-medium transition-colors"
          >
            Batal
          </button>
          <button 
            onClick={handleSend} 
            disabled={!recipientPhone || !message.trim()}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 disabled:dark:bg-neutral-700 disabled:dark:text-neutral-500 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            <Send size={18} />
            Buka di WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
