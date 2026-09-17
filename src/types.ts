export type MessageStatus = 'sent' | 'read' | 'replied';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city?: string;
  company?: string;
  createdAt: number;
  lastMessageAt?: number;
  lastMessageStatus?: MessageStatus;
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost';

export interface Lead {
  id: string;
  customerId?: string;
  name: string;
  city?: string;
  company?: string;
  value?: number;
  status: LeadStatus;
  notes: string;
  phone?: string;
  createdAt: number;
  lastMessageAt?: number;
  lastMessageStatus?: MessageStatus;
}
