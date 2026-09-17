import React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { updateStoredMessageStatus } from '../lib/storage';
import { format } from 'date-fns';

interface Props {
  status?: 'sent' | 'read' | 'replied';
  date?: number;
  collectionName: string;
  documentId: string;
  userId?: string;
}

export default function MessageStatusIndicator({ status, date, collectionName, documentId, userId }: Props) {
  if (!status || !date) return <span className="text-xs text-[var(--text-secondary)]">Belum dihubungi</span>;

  const toggleStatus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Urutan toggle: terkirim -> terbaca -> dibalas -> terkirim
    const nextStatus = status === 'sent' ? 'read' : status === 'read' ? 'replied' : 'sent';
    
    if (collectionName === 'customers' || collectionName === 'leads') {
      updateStoredMessageStatus(collectionName, documentId, nextStatus, date, userId);
    }

    try {
      const docRef = userId
        ? doc(db, 'users', userId, collectionName, documentId)
        : doc(db, collectionName, documentId);

      await updateDoc(docRef, {
        lastMessageStatus: nextStatus
      });
    } catch (error) {
      console.error("Gagal mengubah status pesan di cloud", error);
    }
  };

  return (
    <button 
      onClick={toggleStatus}
      className="flex items-center gap-1.5 text-xs hover:bg-[var(--bg-hover)] p-1 -ml-1 rounded transition-colors"
      title="Klik untuk ubah status pesan"
    >
      {status === 'sent' && <Check size={14} className="text-[var(--text-secondary)]" />}
      {status === 'read' && <CheckCheck size={14} className="text-blue-500" />}
      {status === 'replied' && <CheckCheck size={14} className="text-emerald-500" />}
      
      <span className={
        status === 'sent' ? 'text-[var(--text-secondary)]' : 
        status === 'read' ? 'text-blue-600 dark:text-blue-500' : 'text-emerald-600 dark:text-emerald-500'
      }>
        {status === 'sent' ? 'Terkirim' : status === 'read' ? 'Terbaca' : 'Dibalas'}
      </span>
      <span className="text-[var(--text-secondary)] opacity-70 text-[10px]">
        • {format(date, 'dd MMM, HH:mm')}
      </span>
    </button>
  );
}
