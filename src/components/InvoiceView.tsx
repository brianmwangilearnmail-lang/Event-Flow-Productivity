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
  Eye,
  AlertCircle
} from 'lucide-react';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { supabase } from '../lib/supabase';
import { logActivity } from '../db';
import { Invoice, DocumentStatus, Client } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import ReceiptForm from './ReceiptForm';
import InvoiceForm from './InvoiceForm';
import DocumentGenerator from './DocumentGenerator';
import Modal from './Modal';
import { useSettings } from '../context/SettingsContext';

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

  const { settings } = useSettings();

  const { data: invoices = [], loading, error, optimisticInsert, optimisticUpdate, optimisticDelete } = useSupabaseQuery<any>('invoices', (q) => {
    let query = q.select('*, clients(fullName), events(title)').order('id', { ascending: false });
    return query;
  }, []);

  const filteredInvoices = React.useMemo(() => {
    return invoices.map(i => ({
      ...i,
      clientName: i.clients?.fullName || 'Unknown Client',
      eventName: i.events?.title || 'Unknown Event'
    })).filter(i => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        (i.number?.toLowerCase() || '').includes(search) ||
        (i.clientName?.toLowerCase() || '').includes(search);
      
      const matchesStatus = statusFilter === 'All' || i.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  const { data: clients = [] } = useSupabaseQuery<Client>('clients', (q) => q.select('*'));

  const handleStatusChange = async (invoice: any, status: DocumentStatus) => {
    // Instant UI update
    optimisticUpdate(i => i.id === invoice.id, { status });

    try {
      const { data: existing, error: fetchError } = await supabase.from('invoices').select('*').eq('id', invoice.id).single();
      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase.from('invoices').update({ status }).eq('id', invoice.id);
      if (updateError) throw updateError;

      if (existing) {
        logActivity(
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
    
    // Instant removal
    const idToDelete = invoiceToDelete.id;
    optimisticDelete(i => i.id === idToDelete);
    const invoiceCopy = { ...invoiceToDelete };
    setInvoiceToDelete(null);
    setDeleteReason("");

    try {
      const { data: existing } = await supabase.from('invoices').select('*').eq('id', idToDelete).single();
      if (existing) {
        const { error } = await supabase.from('invoices').delete().eq('id', idToDelete);
        if (error) {
          alert('Error deleting invoice: ' + error.message);
          return;
        }
        logActivity(
          invoiceCopy.clientId,
          'Record Deleted',
          `Invoice #${invoiceCopy.number} deleted. Reason: ${deleteReason}`,
          idToDelete,
          'Invoice',
          existing
        );
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
          style={{ backgroundColor: settings?.brandColors?.primary || '#000000' }}
          className="flex items-center justify-center gap-2 px-6 py-3 text-white hover:opacity-90 transition-all font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-xl shadow-black/10 mx-4 sm:mx-0"
        >
          <Plus size={16} />
          New Invoice
        </button>
      </div>

      <div className="bg-white border border-black/5 shadow-sm overflow-hidden flex flex-col rounded-2xl mx-4 md:mx-0">
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-100 flex items-center gap-3 text-red-600 text-xs font-bold uppercase tracking-wider">
            <AlertCircle size={16} />
            <span>Failed to load invoices: {error.message || String(error)}</span>
          </div>
        )}
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
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: settings?.brandColors?.secondary || '#D4AF37' }} />
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
              {filteredInvoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-bg-base/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-9 h-9 border border-black/5 flex items-center justify-center transition-colors",
                        inv.status === DocumentStatus.PAID ? "bg-green-50 text-green-600" : "bg-white"
                      )}
                      style={inv.status !== DocumentStatus.PAID ? { color: settings?.brandColors?.secondary || '#D4AF37' } : {}}
                      >
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
                      inv.grandTotal - (inv.amountPaid || 0) > 0 ? "" : "text-black/10"
                    )}
                    style={inv.grandTotal - (inv.amountPaid || 0) > 0 ? { color: settings?.brandColors?.secondary || '#D4AF37' } : {}}
                    >
                      {inv.grandTotal - (inv.amountPaid || 0) > 0 ? formatCurrency(inv.grandTotal - (inv.amountPaid || 0)) : 'Settled'}
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
                          "bg-bg-base border-black/10"
                        )}
                        style={inv.status !== DocumentStatus.PAID && inv.status !== DocumentStatus.UNPAID && inv.status !== DocumentStatus.PENDING_PAYMENT ? { color: settings?.brandColors?.secondary || '#D4AF37' } : {}}
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
                          style={{ backgroundColor: settings?.brandColors?.primary || '#000000' }}
                          className="px-4 py-2 text-white text-[9px] font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-black/10"
                        >
                          Process Payment
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setIsViewModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-black/40 hover:text-white rounded-lg transition-all text-[10px] font-black uppercase tracking-widest"
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = settings?.brandColors?.primary || '#000000'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
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
              {filteredInvoices.length === 0 && !loading && (
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
          {filteredInvoices.map((inv: any) => (
            <div key={inv.id} className="p-4 flex flex-col gap-3 group active:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between" onClick={() => { setSelectedInvoice(inv); setIsViewModalOpen(true); }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "w-9 h-9 border border-black/5 flex items-center justify-center shrink-0",
                    inv.status === DocumentStatus.PAID ? "bg-green-50 text-green-600" : "bg-white"
                  )}
                  style={inv.status !== DocumentStatus.PAID ? { color: settings?.brandColors?.secondary || '#D4AF37' } : {}}
                  >
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">#{inv.number} • {inv.clientName}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-tight truncate">
                      {inv.type} • {formatCurrency(inv.grandTotal - (inv.amountPaid || 0))} Due
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
                      "bg-bg-base border-black/10"
                    )}
                    style={inv.status !== DocumentStatus.PAID && inv.status !== DocumentStatus.UNPAID && inv.status !== DocumentStatus.PENDING_PAYMENT ? { color: settings?.brandColors?.secondary || '#D4AF37' } : {}}
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
                      style={{ backgroundColor: settings?.brandColors?.primary || '#000000' }}
                      className="px-3 py-1 text-white text-[9px] font-black uppercase tracking-widest rounded-md"
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
            optimisticUpdate={optimisticUpdate}
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
              {clients.filter(c => {
                const search = clientSearchTerm.toLowerCase();
                return (c.fullName?.toLowerCase() || '').includes(search) ||
                       (c.phone || '').includes(clientSearchTerm);
              }).map(client => (
                <button 
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className="flex items-center gap-3 p-3 border border-black/5 rounded-xl hover:border-black transition-all text-left"
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ 
                      backgroundColor: `${settings?.brandColors?.secondary || '#D4AF37'}1A`,
                      color: settings?.brandColors?.secondary || '#D4AF37'
                    }}
                  >
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
            optimisticInsert={optimisticInsert}
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
