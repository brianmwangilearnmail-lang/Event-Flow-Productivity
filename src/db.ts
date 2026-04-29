import Dexie, { Table } from 'dexie';
import { 
  Client, 
  Event, 
  CatalogItem, 
  Quotation, 
  Invoice, 
  Payment, 
  Receipt, 
  ActivityLog, 
  BusinessSettings 
} from './types';

export class BhaksDatabase extends Dexie {
  clients!: Table<Client>;
  events!: Table<Event>;
  catalog!: Table<CatalogItem>;
  quotations!: Table<Quotation>;
  invoices!: Table<Invoice>;
  payments!: Table<Payment>;
  receipts!: Table<Receipt>;
  activityLogs!: Table<ActivityLog>;
  settings!: Table<BusinessSettings>;

  constructor() {
    super('BhaksDatabase');
    this.version(1).stores({
      clients: '++id, fullName, email, phone, status, createdAt',
      events: '++id, clientId, title, type, date, status',
      catalog: '++id, name, sku, category, isArchived',
      quotations: '++id, clientId, eventId, number, date, status',
      invoices: '++id, clientId, eventId, quotationId, number, status',
      payments: '++id, clientId, date',
      receipts: '++id, number, paymentId, clientId',
      activityLogs: '++id, clientId, timestamp, actionType',
      settings: '++id'
    });
  }
}

export const db = new BhaksDatabase();

// Helper to log activity
export async function logActivity(clientId: number | undefined, actionType: string, description: string, linkedId?: number, linkedType?: any, revertData?: any) {
  await db.activityLogs.add({
    clientId,
    timestamp: Date.now(),
    user: 'System Admin',
    actionType,
    description,
    linkedId,
    linkedType,
    revertData,
    isReverted: false
  });
}
