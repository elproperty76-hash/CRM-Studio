import { Customer, Lead, MessageStatus } from '../types';

function getCustomerKey(userId?: string): string {
  return userId ? `crm_studio_customers_${userId}` : 'crm_studio_customers_v1';
}

function getLeadKey(userId?: string): string {
  return userId ? `crm_studio_leads_${userId}` : 'crm_studio_leads_v1';
}

export function getStoredCustomers(userId?: string): Customer[] {
  try {
    const key = getCustomerKey(userId);
    let raw = localStorage.getItem(key);
    // If empty for specific user, check if we have legacy data we can migrate
    if (!raw && userId) {
      raw = localStorage.getItem('crm_studio_customers_v1');
    }
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

export function saveStoredCustomers(customers: Customer[], userId?: string): void {
  try {
    const key = getCustomerKey(userId);
    localStorage.setItem(key, JSON.stringify(customers));
  } catch (error) {
    console.error('Gagal menyimpan cache pelanggan ke localStorage:', error);
  }
}

export function getStoredLeads(userId?: string): Lead[] {
  try {
    const key = getLeadKey(userId);
    let raw = localStorage.getItem(key);
    // If empty for specific user, check if we have legacy data we can migrate
    if (!raw && userId) {
      raw = localStorage.getItem('crm_studio_leads_v1');
    }
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

export function saveStoredLeads(leads: Lead[], userId?: string): void {
  try {
    const key = getLeadKey(userId);
    localStorage.setItem(key, JSON.stringify(leads));
  } catch (error) {
    console.error('Gagal menyimpan cache prospek ke localStorage:', error);
  }
}

export function updateStoredMessageStatus(
  collectionName: 'customers' | 'leads',
  id: string,
  status: MessageStatus,
  timestamp: number = Date.now(),
  userId?: string
): void {
  if (collectionName === 'customers') {
    const customers = getStoredCustomers(userId);
    const updated = customers.map(c => 
      c.id === id ? { ...c, lastMessageStatus: status, lastMessageAt: timestamp } : c
    );
    saveStoredCustomers(updated, userId);
  } else {
    const leads = getStoredLeads(userId);
    const updated = leads.map(l => 
      l.id === id ? { ...l, lastMessageStatus: status, lastMessageAt: timestamp } : l
    );
    saveStoredLeads(updated, userId);
  }
}
