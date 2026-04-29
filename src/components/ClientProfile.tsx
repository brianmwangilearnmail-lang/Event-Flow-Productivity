import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  FileText, 
  Receipt, 
  History, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  Tag as TagIcon,
  MessageSquare,
  ChevronRight,
  TrendingUp,
  MoreVertical,
  CheckCircle2,
  Clock,
  Edit2,
  Briefcase,
  DollarSign,
  Eye,
  Trash2
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, logActivity } from '../db';
import { Client, ClientStatus, DocumentStatus } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import Modal from './Modal';
import ReceiptForm from './ReceiptForm';
import { Invoice, Payment, Receipt as ReceiptRecord } from '../types';

import InvoiceForm from './InvoiceForm';
import DocumentGenerator from './DocumentGenerator';

interface ClientProfileProps {
  client: Client;
  onBack: () => void;
  onNavigate: (view: any) => void;
}

export default function ClientProfile({ client, onBack, onNavigate }: ClientProfileProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'financials' | 'history'>('overview');
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isSelectInvoiceOpen, setIsSelectInvoiceOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<'Quotation' | 'Invoice' | 'Receipt' | null>(null);

  const events = useLiveQuery(() => 
    db.events.where('clientId').equals(client.id!).toArray()
  , [client.id]) || [];

  const quotations = useLiveQuery(() => 
    db.quotations.where('clientId').equals(client.id!).toArray()
  , [client.id]) || [];

  const invoices = useLiveQuery(() => 
    db.invoices.where('clientId').equals(client.id!).toArray()
  , [client.id]) || [];

  const receipts = useLiveQuery(() => 
    db.receipts.where('clientId').equals(client.id!).toArray()
  , [client.id]) || [];

  const logs = useLiveQuery(() => 
    db.activityLogs.where('clientId').equals(client.id!).reverse().toArray()
  , [client.id]) || [];

  const totalPaid = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const balance = totalInvoiced - totalPaid;

  const handleDeleteReceipt = async (receiptId: number) => {
    if (!window.confirm('Are you sure you want to delete this receipt? This will revert the payment on the associated invoice.')) return;
    
    try {
      const receipt = await db.receipts.get(receiptId);
      if (!receipt) return;
      
      // Update the invoice
      if (receipt.paymentId) {
        const payment = await db.payments.get(receipt.paymentId);
        if (payment && payment.invoiceIds && payment.invoiceIds.length > 0) {
          const invoiceId = payment.invoiceIds[0];
          const invoice = await db.invoices.get(invoiceId);
          if (invoice) {
            const newAmountPaid = Math.max(0, invoice.amountPaid - receipt.amount);
            const newStatus = newAmountPaid === 0 ? DocumentStatus.PENDING_PAYMENT : DocumentStatus.PARTIALLY_PAID;
            await db.invoices.update(invoiceId, {
              amountPaid: newAmountPaid,
              status: newStatus
            });
          }
          await db.payments.delete(receipt.paymentId);
        }
      }
      
      // Delete the receipt
      await db.receipts.delete(receiptId);
      await logActivity(client.id, 'Receipt Deleted', `Deleted receipt #${receipt.number}`, receiptId, 'Receipt');
    } catch (error) {
      console.error('Error deleting receipt:', error);
      alert('Failed to delete receipt');
    }
  };

  const handleAddEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const eventId = await db.events.add({
      clientId: client.id!,
      title: formData.get('title') as string,
      type: formData.get('type') as string,
      date: formData.get('date') as string,
      time: formData.get('time') as string,
      venueName: formData.get('venueName') as string,
      venueAddress: formData.get('venueAddress') as string,
      guestCount: parseInt(formData.get('guestCount') as string) || 0,
      themeNotes: formData.get('themeNotes') as string,
      serviceRequirements: formData.get('serviceRequirements') as string,
      assignedPlanner: 'Admin User',
      status: 'Proposed',
      requirements: {}
    });

    await logActivity(client.id, 'Event Created', `New event added: ${formData.get('title')}`, eventId, 'Event');
    setIsAddEventModalOpen(false);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-1 px-2 hover:bg-white text-gray-400 hover:text-black transition-all border border-black/5 shrink-0 rounded-lg"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-serif italic text-black truncate">{client.fullName}</h1>
              <span className="px-4 py-1.5 bg-bg-base text-gold-deep text-[9px] font-bold uppercase tracking-tighter rounded-full border border-black/5 shrink-0">
                {client.status}
              </span>
            </div>
            <p className="text-[11px] uppercase tracking-widest text-black/40 mt-1 truncate">
              {client.companyName || 'Individual Client'} &middot; Assigned to {client.assignedStaff}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={() => setIsAddEventModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-black text-black hover:bg-black hover:text-white transition-all font-bold text-[9px] uppercase tracking-widest rounded-lg h-10"
          >
            <Plus size={14} />
            Add Event
          </button>
          
          {/* Desktop Document Buttons */}
          <div className="hidden sm:flex items-center gap-2">
            <button 
              onClick={() => setIsInvoiceModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 border border-black text-black hover:bg-black hover:text-white transition-all font-bold text-[9px] uppercase tracking-widest rounded-lg h-10"
            >
              Invoice
            </button>
            <button 
              onClick={() => setIsSelectInvoiceOpen(true)}
              className="flex items-center gap-2 px-4 py-2 border border-black text-black hover:bg-black hover:text-white transition-all font-bold text-[9px] uppercase tracking-widest rounded-lg h-10"
            >
              Receipt
            </button>
            <button 
              onClick={() => onNavigate('quotations')}
              className="flex items-center gap-2 px-4 py-2 bg-gold-deep text-black hover:bg-gold-deep/90 transition-all font-bold text-[9px] uppercase tracking-widest rounded-lg h-10"
            >
              Quote
            </button>
          </div>

          {/* Mobile Grouped Button */}
          <div className="sm:hidden relative">
            <button 
              onClick={() => onNavigate('documents')}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white transition-all font-bold text-[9px] uppercase tracking-widest rounded-lg h-10"
            >
              <FileText size={14} />
              Documents
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar Profile Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 md:p-8 border border-black/5 shadow-sm space-y-6 md:space-y-8">
            <div 
              className="md:cursor-default flex items-center justify-between"
              onClick={() => setIsMobileExpanded(!isMobileExpanded)}
            >
              <h3 className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-gold-deep mb-0">Contact Details</h3>
              <button className="md:hidden">
                {isMobileExpanded ? <ChevronRight size={16} className="rotate-90 text-gold-deep" /> : <ChevronRight size={16} className="text-gold-deep" />}
              </button>
            </div>
            <div className={cn("space-y-6 md:block", isMobileExpanded ? "block" : "hidden")}>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Mail size={16} className="text-gold-deep/40 shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm text-black/60 break-all">{client.email}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Phone size={16} className="text-gold-deep/40 shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm text-black/60">{client.phone}</span>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin size={16} className="text-gold-deep/40 shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm text-black/60">{client.address || 'No address provided'}</span>
                </li>
              </ul>
              <div>
                <h3 className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-gold-deep mb-4 font-mono">Financial Status</h3>
                <div className="space-y-4">
                  <div className="border-l-2 border-gold-deep pl-4 py-1">
                    <p className="text-[9px] md:text-[10px] text-black/40 uppercase font-bold">Total Balance</p>
                    <p className="text-lg md:text-xl font-serif tracking-tight mt-1">{formatCurrency(balance)}</p>
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] md:text-[10px] text-black/40 uppercase font-bold">Total Paid</span>
                    <span className="text-xs md:text-sm font-bold text-green-600">{formatCurrency(totalPaid)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-3 space-y-8">
          {/* Tabs */}
          {/* Desktop/Tablet Tabs */}
          <div className="hidden sm:inline-flex items-center gap-1 p-1 bg-white border border-black/5 w-full sm:w-fit rounded shadow-sm">
            {(['overview', 'events', 'financials', 'history'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 sm:flex-none px-6 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                  activeTab === tab 
                    ? "bg-black text-white" 
                    : "text-black/40 hover:text-black hover:bg-bg-base"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Android/Mobile Dropdown */}
          <div className="sm:hidden w-full">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="w-full p-3 bg-white border border-black/5 rounded text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-[#D4AF37]"
            >
              {(['overview', 'events', 'financials', 'history'] as const).map((tab) => (
                <option key={tab} value={tab}>{tab}</option>
              ))}
            </select>
          </div>

          <div className="min-h-[500px]">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Recent Events */}
                <div className="bg-white p-8 border border-black/5 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest">Active Events</h3>
                    <TrendingUp size={14} className="text-gold-deep" />
                  </div>
                  <div className="space-y-4">
                    {events.length > 0 ? (
                      events.slice(0, 3).map(event => (
                        <div key={event.id} className="p-5 border-l-2 border-gold-deep bg-bg-base/30 hover:bg-bg-base transition-all cursor-pointer group">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-serif text-lg italic">{event.title}</p>
                              <p className="text-[10px] text-black/40 uppercase tracking-widest mt-1">
                                {event.date} &bull; {event.type}
                              </p>
                            </div>
                            <ChevronRight size={16} className="text-black/10 group-hover:text-gold-deep transition-colors" />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-10 text-center text-gray-300">
                        <Calendar size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-[10px] uppercase tracking-widest font-bold">No active events</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Client Documents */}
                <div className="bg-white p-8 border border-black/5 shadow-sm overflow-hidden h-full">
                  <div 
                    className="flex items-center justify-between mb-8 cursor-pointer group"
                    onClick={() => setActiveTab('financials')}
                    title="View all financial documents"
                  >
                    <h3 className="text-[10px] font-bold uppercase tracking-widest group-hover:text-gold-deep transition-colors">Client Documents</h3>
                    <FileText size={14} className="text-gold-deep" />
                  </div>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {[
                      ...quotations.map(q => ({ type: 'Quotation', id: q.id, number: q.number, date: q.date, amount: q.grandTotal, status: q.status, raw: q })),
                      ...invoices.map(i => ({ type: 'Invoice', id: i.id, number: i.number, date: i.issueDate, amount: i.grandTotal, status: i.status, raw: i })),
                      ...receipts.map(r => ({ type: 'Receipt', id: r.id, number: r.number, date: r.date, amount: r.amount, status: 'PAID', raw: r }))
                    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).length > 0 ? (
                      [
                        ...quotations.map(q => ({ type: 'Quotation', id: q.id, number: q.number, date: q.date, amount: q.grandTotal, status: q.status, raw: q })),
                        ...invoices.map(i => ({ type: 'Invoice', id: i.id, number: i.number, date: i.issueDate, amount: i.grandTotal, status: i.status, raw: i })),
                        ...receipts.map(r => ({ type: 'Receipt', id: r.id, number: r.number, date: r.date, amount: r.amount, status: 'PAID', raw: r }))
                      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(doc => (
                        <div 
                          key={`${doc.type}-${doc.id}`}
                          onClick={() => {
                            setSelectedDocument(doc.raw);
                            setSelectedDocumentType(doc.type as 'Quotation' | 'Invoice' | 'Receipt');
                            setIsViewModalOpen(true);
                          }}
                          className="p-5 border border-black/5 bg-white hover:bg-bg-base transition-all cursor-pointer group flex justify-between items-center"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-black/5 flex items-center justify-center text-gold-deep border border-black/5">
                              <FileText size={14} />
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-tight">{doc.type} #{doc.number}</p>
                              <p className="text-[10px] text-black/40 uppercase tracking-widest">
                                {doc.status} &bull; {formatCurrency(doc.amount)} &bull; {doc.date}
                              </p>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-black/10" />
                        </div>
                      ))
                    ) : (
                      <div className="py-10 text-center text-gray-300">
                        <FileText size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-[10px] uppercase tracking-widest font-bold">No documents</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Internal Notes */}
                <div className="md:col-span-2 bg-white p-8 border border-black/5 shadow-sm">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-gold-deep mb-4">Operational Notes</h3>
                  <div className="p-6 bg-bg-base italic text-sm text-black/60 leading-relaxed border border-black/5">
                    "{client.notes || 'No internal notes found for this client.'}"
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'events' && (
              <div className="space-y-6">
                {events.map(event => (
                  <div key={event.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold">{event.title}</h3>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider rounded">
                            {event.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Event Type</p>
                            <p className="text-sm font-medium mt-1">{event.type}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Date & Time</p>
                            <p className="text-sm font-medium mt-1">{event.date} at {event.time}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Guest Count</p>
                            <p className="text-sm font-medium mt-1">{event.guestCount} Guests</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Venue</p>
                            <p className="text-sm font-medium mt-1">{event.venueName}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-row md:flex-col gap-2 shrink-0">
                        <button 
                          onClick={() => onNavigate('events')}
                          className="flex-1 md:flex-none px-4 py-2 border border-gray-100 rounded-lg text-xs font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        <button 
                          onClick={() => onNavigate('quotations')}
                          className="flex-1 md:flex-none px-4 py-2 bg-[#D4AF37] text-white rounded-lg text-xs font-bold hover:bg-[#B8962D] transition-all flex items-center justify-center gap-2"
                        >
                          <FileText size={14} /> New Quote
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {events.length === 0 && (
                  <div className="bg-white py-20 rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                    <Calendar size={64} className="text-gray-100 mb-6" />
                    <h4 className="text-lg font-bold">Schedule an Event</h4>
                    <p className="text-gray-400 text-sm mt-2 max-w-xs">Events are the container for your quotations and planning work.</p>
                    <button 
                      onClick={() => setIsAddEventModalOpen(true)}
                      className="mt-8 px-8 py-3 bg-black text-white rounded-xl font-bold text-sm shadow-xl shadow-black/10 transition-all active:scale-95"
                    >
                      Create First Event
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute left-10 top-20 bottom-10 w-px bg-gray-50"></div>
                <div className="space-y-12 relative z-10 pl-10">
                  {logs.map((log, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[45px] top-1 w-2.5 h-2.5 rounded-full bg-black ring-4 ring-white"></div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h4 className="font-bold text-sm">{log.description}</h4>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider bg-gray-50 px-2 py-1 rounded">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">{log.actionType}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-200"></span>
                        <span className="text-xs text-gray-400 italic">User: {log.user}</span>
                      </div>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <div className="text-center py-10 -ml-10 text-gray-400">
                      <History size={40} className="mx-auto mb-4 opacity-10" />
                      <p className="text-sm italic">No history records yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {activeTab === 'financials' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Outstanding</p>
                    <p className="text-2xl font-black text-red-500 mt-1">{formatCurrency(balance)}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Total Received</p>
                    <p className="text-2xl font-black text-green-500 mt-1">{formatCurrency(totalPaid)}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Total Invoiced</p>
                    <p className="text-2xl font-black text-black mt-1">{formatCurrency(totalInvoiced)}</p>
                  </div>
                </div>
                
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="font-bold">Transaction History</h3>
                    {invoices.some(inv => inv.status !== DocumentStatus.PAID) && (
                      <button 
                        onClick={() => {
                          const unpaid = invoices.find(inv => inv.status !== DocumentStatus.PAID);
                          if (unpaid) {
                            setSelectedInvoice(unpaid);
                            setIsReceiptModalOpen(true);
                          }
                        }}
                        className="text-xs font-bold text-[#D4AF37] hover:underline flex items-center gap-1"
                      >
                        <Plus size={14} /> Add Payment
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-gray-400">Date</th>
                          <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-gray-400">Ref / Type</th>
                          <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-gray-400 text-right">Amount</th>
                          <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-gray-400 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {invoices.length > 0 ? (
                          invoices.map(inv => (
                            <tr key={inv.id} className="hover:bg-gray-50/50">
                              <td className="px-6 py-4 text-sm">{inv.issueDate}</td>
                              <td className="px-6 py-4">
                                <p className="text-sm font-medium">Inv #{inv.number}</p>
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest">{inv.type} Invoice</p>
                              </td>
                              <td className="px-6 py-4 text-right font-bold text-sm">{formatCurrency(inv.grandTotal)}</td>
                              <td className="px-6 py-4 text-center">
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                                  inv.status === DocumentStatus.PAID ? "bg-green-50 text-green-600" :
                                  inv.status === DocumentStatus.UNPAID ? "bg-red-50 text-red-600" :
                                  inv.status === DocumentStatus.PENDING_PAYMENT ? "bg-purple-50 text-purple-600" :
                                  "bg-gold-50 text-[#D4AF37]"
                                )}>
                                  {inv.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {inv.status !== DocumentStatus.PAID && (
                                    <button 
                                      onClick={() => {
                                        setSelectedInvoice(inv);
                                        setIsReceiptModalOpen(true);
                                      }}
                                      className="p-2 text-[#D4AF37] hover:bg-gold-50 rounded-lg transition-colors"
                                      title="Process Payment"
                                    >
                                      <DollarSign size={14} />
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => {
                                      setSelectedDocument(inv);
                                      setSelectedDocumentType('Invoice');
                                      setIsViewModalOpen(true);
                                    }}
                                    className="p-2 hover:bg-black hover:text-white rounded-lg transition-all"
                                    title="View Invoice"
                                  >
                                    <Eye size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-6 py-10 text-center text-gray-400 italic text-sm">
                              No financial documents found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mt-8">
                  <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="font-bold">Receipts</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-gray-400">Date</th>
                          <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-gray-400">Ref</th>
                          <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-gray-400 text-right">Amount</th>
                          <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-gray-400 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {receipts.length > 0 ? (
                          receipts.map(rcp => (
                            <tr key={rcp.id} className="hover:bg-gray-50/50">
                              <td className="px-6 py-4 text-sm">{rcp.date}</td>
                              <td className="px-6 py-4 text-sm font-medium">#{rcp.number}</td>
                              <td className="px-6 py-4 text-right font-bold text-sm text-green-600">{formatCurrency(rcp.amount)}</td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                    onClick={() => {
                                      setSelectedDocument(rcp);
                                      setSelectedDocumentType('Receipt');
                                      setIsViewModalOpen(true);
                                    }}
                                    className="p-2 hover:bg-black hover:text-white rounded-lg transition-all"
                                    title="View Receipt"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteReceipt(rcp.id!)}
                                    className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
                                    title="Delete Receipt"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-6 py-10 text-center text-gray-400 italic text-sm">
                              No receipts found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={isAddEventModalOpen} onClose={() => setIsAddEventModalOpen(false)} title="Create New Event">
        <form onSubmit={handleAddEvent} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Event Title *</label>
              <input required name="title" type="text" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]" placeholder="e.g. Smith Wedding Reception" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Event Type</label>
              <select name="type" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]">
                <option>Wedding</option>
                <option>Introduction Ceremony</option>
                <option>Birthday</option>
                <option>Graduation</option>
                <option>Corporate Event</option>
                <option>Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Guest Count</label>
              <input name="guestCount" type="number" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]" placeholder="e.g. 200" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Date</label>
              <input required name="date" type="date" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Time</label>
              <input name="time" type="time" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Venue Name</label>
            <input name="venueName" type="text" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]" placeholder="e.g. Sheraton Hotel Ballroom" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Theme & Service Requirements</label>
            <textarea name="serviceRequirements" rows={4} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]" placeholder="Describe the decor style, catering needs, etc."></textarea>
          </div>
          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={() => setIsAddEventModalOpen(false)}
              className="flex-1 py-4 border border-gray-100 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-1 py-4 bg-black text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-gray-800 transition-all"
            >
              Initialize Event
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isReceiptModalOpen} 
        onClose={() => setIsReceiptModalOpen(false)} 
        title="Record Payment"
      >
        {selectedInvoice && (
          <ReceiptForm 
            invoice={selectedInvoice} 
            onSuccess={() => {
              setIsReceiptModalOpen(false);
              setSelectedInvoice(null);
            }} 
          />
        )}
      </Modal>

      <Modal 
        isOpen={isInvoiceModalOpen} 
        onClose={() => setIsInvoiceModalOpen(false)} 
        title="Create Invoice"
      >
        <InvoiceForm 
          client={client} 
          onSuccess={() => setIsInvoiceModalOpen(false)} 
        />
      </Modal>

      <Modal 
        isOpen={isSelectInvoiceOpen} 
        onClose={() => setIsSelectInvoiceOpen(false)} 
        title="Select Invoice for Receipt"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 mb-4">Choose an unpaid invoice to record a payment.</p>
          {invoices.filter(inv => inv.status !== DocumentStatus.PAID).length > 0 ? (
            invoices.filter(inv => inv.status !== DocumentStatus.PAID).map(inv => (
              <div 
                key={inv.id} 
                onClick={() => {
                  setSelectedInvoice(inv);
                  setIsSelectInvoiceOpen(false);
                  setIsReceiptModalOpen(true);
                }}
                className="p-4 border border-black/5 hover:border-gold-deep cursor-pointer flex justify-between items-center bg-white"
              >
                <div>
                  <p className="font-bold text-sm">#{inv.number}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">{inv.issueDate}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{formatCurrency(inv.grandTotal - inv.amountPaid)}</p>
                  <p className="text-[10px] text-red-500 uppercase tracking-widest font-black">Due</p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-400">
              <p>No unpaid invoices available.</p>
            </div>
          )}
        </div>
      </Modal>
      <Modal 
        isOpen={isViewModalOpen} 
        onClose={() => setIsViewModalOpen(false)} 
        title={`${selectedDocumentType} Preview ${selectedDocument ? '#' + selectedDocument.number : ''}`}
        size="lg"
      >
        {selectedDocument && selectedDocumentType && (
          <DocumentGenerator 
            type={selectedDocumentType} 
            data={{
              ...selectedDocument,
              clientName: client.fullName,
              eventName: events.find(e => e.id === selectedDocument.eventId)?.title || 'Unknown Event'
            }} 
            onClose={() => setIsViewModalOpen(false)} 
          />
        )}
      </Modal>
    </div>
  );
}
