/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ClientStatus {
  NEW_INQUIRY = 'New Inquiry',
  CONSULTATION = 'Consultation Scheduled',
  QUOTATION_DRAFT = 'Quotation Draft',
  QUOTATION_SENT = 'Quotation Sent',
  AWAITING_APPROVAL = 'Awaiting Approval',
  APPROVED = 'Approved',
  DEPOSIT_PAID = 'Deposit Paid',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Event Completed',
  CLOSED = 'Closed',
  CANCELLED = 'Cancelled',
}

export enum EventType {
  WEDDING = 'Wedding',
  INTRODUCTION = 'Introduction Ceremony',
  BIRTHDAY = 'Birthday',
  GRADUATION = 'Graduation',
  BABY_SHOWER = 'Baby Shower',
  KITCHEN_PARTY = 'Kitchen Party',
  CORPORATE = 'Corporate Event',
  CONFERENCE = 'Conference',
  FUNERAL = 'Funeral Reception',
  PRIVATE_DINNER = 'Private Dinner',
  OUTDOOR = 'Outdoor Event',
  OTHER = 'Other',
}

export enum DocumentStatus {
  DRAFT = 'Draft',
  CREATED = 'Created',
  SENT = 'Sent',
  RECEIVED = 'Received',
  APPROVED = 'Approved',
  DECLINED = 'Declined',
  PAID = 'Paid',
  UNPAID = 'Unpaid',
  PENDING_PAYMENT = 'Pending Payment',
  PARTIALLY_PAID = 'Partially Paid',
  OVERDUE = 'Overdue',
  CANCELLED = 'Cancelled',
}

export interface Client {
  id?: number;
  fullName: string;
  companyName?: string;
  phone: string;
  altPhone?: string;
  email: string;
  address: string;
  communicationChannel: string;
  tags: string[];
  notes: string;
  status: ClientStatus;
  createdAt: number;
  assignedStaff: string;
}

export interface Event {
  id?: number;
  clientId: number;
  title: string;
  type: string; // Can be EventType or custom string
  date: string;
  time: string;
  venueName: string;
  venueAddress: string;
  guestCount: number;
  themeNotes: string;
  serviceRequirements: string;
  assignedPlanner: string;
  status: string;
  verifiedItems?: Record<number, boolean>;
  additionalItems?: QuotationLineItem[];
  clientVerification?: 'Verified' | 'Unverified';
  requirements: {
    decor?: string;
    seating?: string;
    catering?: string;
    equipment?: string;
    floral?: string;
    stage?: string;
    staffing?: string;
    logistics?: string;
    special?: string;
  };
}

export interface CatalogItem {
  id?: number;
  name: string;
  sku: string;
  category: string;
  subcategory?: string;
  unit: string;
  supplierPrice: number;
  clientPrice: number;
  defaultMarkup?: number;
  isTaxable: boolean;
  description: string;
  internalCostNote?: string;
  isArchived: boolean;
  preferredSupplier?: string;
  imageUrl?: string;
}

export interface QuotationLineItem {
  itemId?: number;
  name: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number; // The price actually charged (overridden or default)
  discount: number;
  notes?: string;
}

export interface Quotation {
  id?: number;
  clientId: number;
  eventId: number;
  number: string;
  date: string;
  validUntil: string;
  currency: string;
  status: DocumentStatus;
  items: QuotationLineItem[];
  subtotal: number;
  discountTotal: number;
  globalDiscount: number;
  taxTotal: number;
  depositRequired: number;
  grandTotal: number;
  version: number;
  revisionNotes?: string;
  preparedBy: string;
  createdAt: number;
}

export interface Invoice {
  id?: number;
  clientId: number;
  eventId: number;
  quotationId?: number;
  number: string;
  type: 'Deposit' | 'Interim' | 'Final' | 'Full';
  issueDate: string;
  dueDate: string;
  status: DocumentStatus;
  items: QuotationLineItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  amountPaid: number;
  grandTotal: number;
  notes: string;
}

export interface Payment {
  id?: number;
  clientId: number;
  invoiceIds: number[];
  amount: number;
  date: string;
  method: string;
  reference: string;
  proofUrl?: string;
  notes: string;
  receivedBy: string;
}

export interface Receipt {
  id?: number;
  number: string;
  paymentId: number;
  clientId: number;
  eventId: number;
  amount: number;
  date: string;
  createdAt: number;
}

export interface ActivityLog {
  id?: number;
  clientId?: number;
  timestamp: number;
  user: string;
  actionType: string;
  description: string;
  linkedId?: number;
  linkedType?: 'Quotation' | 'Invoice' | 'Receipt' | 'Event' | 'Client' | 'Catalog' | 'ActivityLog';
  revertData?: any;
  isReverted?: boolean;
}

export interface BusinessSettings {
  id?: number;
  name: string;
  logoUrl?: string;
  brandColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  phone: string;
  email: string;
  address: string;
  footerText: string;
  paymentInstructions: string;
  terms: string;
  defaultValidityDays: number;
  currency: string;
  taxRate: number;
  adminName: string;
}
