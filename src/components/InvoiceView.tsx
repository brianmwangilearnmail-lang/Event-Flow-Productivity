import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Users,
  FileText, 
  TrendingUp, 
  Download, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Filter,
  DollarSign,
  Trash2,
  ChevronRight,
  ArrowLeft,
  MoreHorizontal,
  Eye
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, logActivity } from '../db';
import { Invoice, DocumentStatus, Client } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import ReceiptForm from './ReceiptForm';
import InvoiceForm from './InvoiceForm';
import DocumentGenerator from './DocumentGenerator';
import Modal from './Modal';

interface InvoiceViewProps {
  onNavigate?: (view: any) => void;
}

export default function InvoiceView({ onNavigate }: InvoiceViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'All'>('All');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  const invoices = useLiveQuery(async () => {
    const invs = await db.invoices.reverse().toArray();
    const clients = await db.clients.toArray();
    
    return invs.map(i => ({
      ...i,
      clientName: clients.find(c => c.id === i.clientId)?.fullName || 'Unknown Client',
    })).filter(i => {
      const matchesSearch = i.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.clientName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'All' || i.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter]) || [];

  const clients = useLiveQuery(() => db.clients.toArray()) || [];

  const handleStatusChange = async (invoice: any, status: DocumentStatus) => {
    try {
      const existing = await db.invoices.get(invoice.id);
      if (existing) {
        await db.invoices.update(invoice.id, { status });
        await logActivity(
          invoice.clientId,
          'Updated Invoice Status',
          `Invoice status updated to ${status}`,
          invoice.id,
          'Invoice',
          existing
        );
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleMarkPaid = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsReceiptModalOpen(true);
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete?.id) return;
    if (!deleteReason.trim()) {
      alert("Please provide a reason for deletion.");
      return;
    }
    
    try {
      const existing = await db.invoices.get(invoiceToDelete.id);
      if (existing) {
        await db.invoices.delete(invoiceToDelete.id);
        await logActivity(
          invoiceToDelete.clientId,
          'Record Deleted',
          `Invoice #${invoiceToDelete.number} deleted. Reason: ${deleteReason}`,
          invoiceToDelete.id,
          'Invoice',
          existing
        );
        setInvoiceToDelete(null);
        setDeleteReason("");
      }
    } catch (error) {
      console.error("Error deleting invoice:", error);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 md:px-0">
        <div className="flex items-center gap-4">
          {onNavigate && (
            <button 
              onClick={() => onNavigate('documents')}
              className="md:hidden p-2 hover:bg-white text-gray-400 hover:text-black transition-all border border-black/5 shrink-0 rounded-lg"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-black text-black italic">Invoices</h1>
            <p className="text-[10px] text-black/40 uppercase tracking-[0.2em] mt-1 font-bold">Financial records</p>
          </div>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-black text-white hover:bg-gold-deep transition-all font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-xl shadow-black/10 mx-4 sm:mx-0"
        >
          <Plus size={16} />
          New Invoice
        </button>
      </div>

      <div className="bg-white border border-black/5 shadow-sm overflow-hidden flex flex-col rounded-2xl mx-4 md:mx-0">
        <div className="p-3 border-b border-black/5 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={16} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2 bg-bg-base border-none rounded-xl text-[10px] uppercase outline-none font-bold"
            />
          </div>
          <div className="relative min-w-[140px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-deep" size={14} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full pl-9 pr-8 py-2.5 bg-bg-base border-none rounded-xl text-[10px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer"
            >
              <option value="All">All Status</option>
              {[DocumentStatus.DRAFT, DocumentStatus.SENT, DocumentStatus.UNPAID, DocumentStatus.PENDING_PAYMENT, DocumentStatus.PAID].map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-black/20">
              <MoreHorizontal className="rotate-90" size={14} />
            </div>
          </div>
        </div>

        <div className="hidden md:block flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-bg-base/30">
                <th className="px-8 py-4 text-[9px] uppercase tracking-[0.3em] font-black text-black/40 border-b border-black/5">Invoice Meta</th>
                <th className="px-8 py-4 text-[9px] uppercase tracking-[0.3em] font-black text-black/40 border-b border-black/5">Client Name</th>
                <th className="px-8 py-4 text-[9px] uppercase tracking-[0.3em] font-black text-black/40 border-b border-black/5 text-right w-40">Gross Value</th>
                <th className="px-8 py-4 text-[9px] uppercase tracking-[0.3em] font-black text-black/40 border-b border-black/5 text-right w-40">Captured</th>
                <th className="px-8 py-4 text-[9px] uppercase tracking-[0.3em] font-black text-black/40 border-b border-black/5 text-right w-40">Arrears</th>
                <th className="px-8 py-4 text-[9px] uppercase tracking-[0.3em] font-black text-black/40 border-b border-black/5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-bg-base/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-9 h-9 border border-black/5 flex items-center justify-center transition-colors",
                        inv.status === DocumentStatus.PAID ? "bg-green-50 text-green-600" : "bg-white text-gold-deep"
                      )}>
                        <FileText size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-xs uppercase tracking-tight">#{inv.number}</p>
                        <p className="text-[9px] text-black/30 uppercase tracking-widest mt-1">{inv.type} • {inv.issueDate}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-serif text-lg italic text-black/80">{inv.clientName}</p>
                  </td>
                  <td className="px-8 py-6 text-right font-serif text-lg tracking-tight text-black/60">
                    {formatCurrency(inv.grandTotal)}
                  </td>
                  <td className="px-8 py-6 text-right font-bold text-xs text-green-600">
                    {inv.amountPaid > 0 ? formatCurrency(inv.amountPaid) : '--'}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <p className={cn(
                      "font-serif text-lg tracking-tight italic",
                      inv.grandTotal - inv.amountPaid > 0 ? "text-gold-deep" : "text-black/10"
                    )}>
                      {inv.grandTotal - inv.amountPaid > 0 ? formatCurrency(inv.grandTotal - inv.amountPaid) : 'Settled'}
                    </p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <select
                        value={inv.status}
                        onChange={(e) => handleStatusChange(inv, e.target.value as DocumentStatus)}
                        className={cn(
                          "inline-flex items-center px-3 py-1 font-black shadow-sm text-[9px] uppercase tracking-[0.2em] appearance-none cursor-pointer outline-none pr-6 bg-no-repeat border",
                          inv.status === DocumentStatus.PAID ? "bg-green-50 text-green-600 border-green-200" :
                          inv.status === DocumentStatus.UNPAID ? "bg-red-50 text-red-600 border-red-200" :
                          inv.status === DocumentStatus.PENDING_PAYMENT ? "bg-purple-50 text-purple-600 border-purple-200" :
                          "bg-bg-base text-gold-deep border-black/10"
                        )}
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg stroke='currentColor' fill='none' stroke-width='2' viewBox='0 0 24 24' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                          backgroundPosition: 'right 6px center',
                          backgroundSize: '12px'
                        }}
                      >
                        <option value={DocumentStatus.DRAFT} className="bg-white text-black font-medium">Draft</option>
                        <option value={DocumentStatus.SENT} className="bg-white text-black font-medium">Sent</option>
                        <option value={DocumentStatus.UNPAID} className="bg-white text-black font-medium">Unpaid</option>
                        <option value={DocumentStatus.PENDING_PAYMENT} className="bg-white text-black font-medium">Pending Payment</option>
                        {inv.status === DocumentStatus.PAID && (
                          <option value={DocumentStatus.PAID} className="bg-white text-black font-medium" disabled>Paid</option>
                        )}
                      </select>
                      {inv.status !== DocumentStatus.PAID && (
                        <button 
                          onClick={() => handleMarkPaid(inv)}
                          className="px-4 py-2 bg-black text-white text-[9px] font-bold uppercase tracking-widest hover:bg-gold-deep transition-all shadow-lg shadow-black/10"
                        >
                          Process Payment
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setIsViewModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-black/40 hover:bg-black hover:text-white rounded-lg transition-all text-[10px] font-black uppercase tracking-widest"
                        title="View Invoice"
                      >
                        <Eye size={14} />
                        <span className="hidden lg:inline">View</span>
                      </button>
                      <button 
                        onClick={() => setInvoiceToDelete(inv)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-black/40 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest ml-1"
                        title="Delete Invoice"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-32 text-center">
                    <div className="max-w-xs mx-auto space-y-4">
                      <TrendingUp size={32} className="mx-auto text-black/5" />
                      <p className="text-[10px] uppercase tracking-[0.4em] font-black text-black/20 italic">No ledger entries detected</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-50">
          {invoices.map((inv: any) => (
            <div key={inv.id} className="p-4 flex flex-col gap-3 group active:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between" onClick={() => { setSelectedInvoice(inv); setIsViewModalOpen(true); }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "w-9 h-9 border border-black/5 flex items-center justify-center shrink-0",
                    inv.status === DocumentStatus.PAID ? "bg-green-50 text-green-600" : "bg-white text-gold-deep"
                  )}>
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">#{inv.number} • {inv.clientName}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-tight truncate">
                      {inv.type} • {formatCurrency(inv.grandTotal - inv.amountPaid)} Due
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </div>
              <div className="flex items-center justify-between pl-12 border-t border-gray-50 pt-2">
                 <select
                    value={inv.status}
                    onChange={(e) => handleStatusChange(inv, e.target.value as DocumentStatus)}
                    className={cn(
                      "inline-flex items-center px-3 py-1 font-black shadow-sm text-[9px] uppercase tracking-[0.2em] appearance-none cursor-pointer outline-none pr-7 bg-no-repeat border rounded-md",
                      inv.status === DocumentStatus.PAID ? "bg-green-50 text-green-600 border-green-200" :
                      inv.status === DocumentStatus.UNPAID ? "bg-red-50 text-red-600 border-red-200" :
                      inv.status === DocumentStatus.PENDING_PAYMENT ? "bg-purple-50 text-purple-600 border-purple-200" :
                      "bg-bg-base text-gold-deep border-black/10"
                    )}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg stroke='currentColor' fill='none' stroke-width='2' viewBox='0 0 24 24' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                      backgroundPosition: 'right 8px center',
                      backgroundSize: '10px'
                    }}
                  >
                    <option value={DocumentStatus.DRAFT} className="bg-white text-black font-medium">Draft</option>
                    <option value={DocumentStatus.SENT} className="bg-white text-black font-medium">Sent</option>
                    <option value={DocumentStatus.UNPAID} className="bg-white text-black font-medium">Unpaid</option>
                    <option value={DocumentStatus.PENDING_PAYMENT} className="bg-white text-black font-medium">Pending Payment</option>
                    {inv.status === DocumentStatus.PAID && (
                      <option value={DocumentStatus.PAID} className="bg-white text-black font-medium" disabled>Paid</option>
                    )}
                  </select>
                  {inv.status !== DocumentStatus.PAID && (
                    <button 
                      onClick={() => handleMarkPaid(inv)}
                      className="px-3 py-1 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-md"
                    >
                      Pay
                    </button>
                  )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal 
        isOpen={isViewModalOpen} 
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedInvoice(null);
        }} 
        title={`Invoice #${selectedInvoice?.number}`}
        size="full"
      >
        {selectedInvoice && (
          <DocumentGenerator 
            type="Invoice" 
            data={selectedInvoice} 
            onClose={() => {
              setIsViewModalOpen(false);
              setSelectedInvoice(null);
            }} 
          />
        )}
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
        isOpen={isCreateModalOpen} 
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedClient(null);
        }} 
        title={selectedClient ? `Invoice for ${selectedClient.fullName}` : "Select Client"}
      >
        {!selectedClient ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/20" size={14} />
              <input 
                type="text" 
                placeholder="Find client..." 
                value={clientSearchTerm}
                onChange={(e) => setClientSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-bg-base border border-black/5 rounded-xl text-xs font-bold outline-none"
              />
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto pr-2">
              {clients.filter(c => 
                c.fullName.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                c.phone.includes(clientSearchTerm)
              ).map(client => (
                <button 
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className="flex items-center gap-3 p-3 border border-black/5 rounded-xl hover:border-black transition-all text-left"
                >
                  <div className="w-10 h-10 bg-bg-base text-black/20 rounded-lg flex items-center justify-center shrink-0">
                    <Users size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-tight">{client.fullName}</p>
                    <p className="text-[8px] font-bold text-black/30 uppercase tracking-widest">{client.phone}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <InvoiceForm 
            client={selectedClient} 
            onSuccess={() => {
              setIsCreateModalOpen(false);
              setSelectedClient(null);
            }} 
          />
        )}
      </Modal>

      <Modal
        isOpen={!!invoiceToDelete}
        onClose={() => {
          setInvoiceToDelete(null);
          setDeleteReason("");
        }}
        title="Verify Annulment"
      >
        <div className="space-y-8">
          <div className="p-6 bg-[#1a1a1a] border-l-4 border-red-500 text-white shadow-xl shadow-red-900/10">
            <h4 className="font-serif italic text-xl tracking-tight mb-2 text-red-100">Critical: Irreversible Action</h4>
            <p className="text-xs text-white/70 leading-relaxed uppercase tracking-widest">
              You are about to expunge invoice <span className="font-bold text-red-400">#{invoiceToDelete?.number}</span> valued at <span className="font-bold text-white">{invoiceToDelete && formatCurrency(invoiceToDelete.grandTotal)}</span>. This operation cannot be reversed and will be permanently recorded in the audit log.
            </p>
          </div>
          
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-black/60">Auditing Justification (Required) <span className="text-red-500">*</span></label>
            <textarea 
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              className="w-full p-4 bg-bg-base border border-black/10 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm font-medium transition-all resize-none"
              rows={4}
              placeholder="Provide a detailed justification for the annulment of this invoice..."
            />
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t border-black/10 mt-8">
            <button 
              onClick={() => {
                setInvoiceToDelete(null);
                setDeleteReason("");
              }}
              className="px-8 py-4 bg-white text-black border border-black/10 font-black uppercase tracking-[0.2em] text-[10px] hover:bg-bg-base transition-colors"
            >
              Abort
            </button>
            <button 
              onClick={handleDeleteInvoice}
              className={cn(
                "px-8 py-4 font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-xl",
                deleteReason.trim() ? "bg-red-600 text-white hover:bg-red-700 shadow-red-900/20" : "bg-black/5 text-black/20 cursor-not-allowed shadow-none"
              )}
              disabled={!deleteReason.trim()}
            >
              Confirm Annulment
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
