import { Customer, Lead, LeadStatus, MessageStatus } from '../types';

const CUSTOMERS_KEY = 'crm_studio_customers_v1';
const LEADS_KEY = 'crm_studio_leads_v1';

export function getStoredCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (error) {
    console.error('Gagal membaca cache pelanggan dari localStorage:', error);
  }
  return [];
}

export function saveStoredCustomers(customers: Customer[]): void {
  try {
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
  } catch (error) {
    console.error('Gagal menyimpan cache pelanggan ke localStorage:', error);
  }
}

export function getStoredLeads(): Lead[] {
  try {
    const raw = localStorage.getItem(LEADS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (error) {
    console.error('Gagal membaca cache prospek dari localStorage:', error);
  }
  return [];
}

export function saveStoredLeads(leads: Lead[]): void {
  try {
    localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
  } catch (error) {
    console.error('Gagal menyimpan cache prospek ke localStorage:', error);
  }
}

export function updateStoredMessageStatus(
  collectionName: 'customers' | 'leads',
  id: string,
  status: MessageStatus,
  timestamp: number = Date.now()
): void {
  if (collectionName === 'customers') {
    const customers = getStoredCustomers();
    const updated = customers.map(c => 
      c.id === id ? { ...c, lastMessageStatus: status, lastMessageAt: timestamp } : c
    );
    saveStoredCustomers(updated);
  } else {
    const leads = getStoredLeads();
    const updated = leads.map(l => 
      l.id === id ? { ...l, lastMessageStatus: status, lastMessageAt: timestamp } : l
    );
    saveStoredLeads(updated);
  }
}
