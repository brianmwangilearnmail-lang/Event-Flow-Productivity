import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  Download, 
  Printer, 
  Trash2, 
  CheckCircle2, 
  Clock,
  ArrowRight,
  Filter,
  Eye,
  Copy,
  XCircle,
  Send,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  ArrowLeft,
  Zap,
  Calendar,
  MoreHorizontal,
  Pencil
} from 'lucide-react';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { supabase } from '../lib/supabase';
import { logActivity } from '../db';
import { Quotation, DocumentStatus } from '../types';
import Modal from './Modal';
import { cn, formatCurrency } from '../lib/utils';
import QuotationBuilder from './QuotationBuilder';
import DocumentGenerator from './DocumentGenerator';
import ScheduleEventModal from './ScheduleEventModal';
import { useSettings } from '../context/SettingsContext';

interface QuotationViewProps {
  onNavigate?: (view: any) => void;
}

export default function QuotationView({ onNavigate }: QuotationViewProps) {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isQuickMode, setIsQuickMode] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'All'>('All');

  const { settings } = useSettings();

  const { data: quotations = [], optimisticInsert, optimisticUpdate, optimisticDelete } = useSupabaseQuery<any>('quotations', (q) => {
    let query = q.select('*, clients(fullName), events(title)').order('id', { ascending: false });
    return query;
  }, []);

  const filteredQuotations = React.useMemo(() => {
    return quotations.map(q => {
      const validUntil = new Date(q.validUntil);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = validUntil.getTime() - today.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...q,
        daysLeft,
        clientName: q.clients?.fullName || 'Unknown Client',
        eventName: q.events?.title || 'Tentative / No Event'
      };
    }).filter(q => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        (q.number?.toLowerCase() || '').includes(search) ||
        (q.clientName?.toLowerCase() || '').includes(search) ||
        (q.eventName?.toLowerCase() || '').includes(search);
      
      const matchesStatus = statusFilter === 'All' || q.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [quotations, searchTerm, statusFilter]);

  const handleStatusChange = async (id: number, status: DocumentStatus) => {
    // Instant UI update
    optimisticUpdate(q => q.id === id, { status });

    const { data: existing, error: fetchError } = await supabase.from('quotations').select('*').eq('id', id).single();
    if (fetchError) return;

    const { error: updateError } = await supabase.from('quotations').update({ status }).eq('id', id);
    if (updateError) {
      // Revert on error (refetch will happen via realtime, but let's be explicit)
      return;
    }

    if (existing) {
      logActivity(existing.clientId, 'Quotation Updated', `Quote #${existing.number} status changed to ${status}`, id, 'Quotation', existing);
    }
  };

  const deleteQuotation = async (id: number) => {
    if (confirm('Are you sure you want to delete this quotation?')) {
      // Instant removal
      optimisticDelete(q => q.id === id);

      const { data: existing } = await supabase.from('quotations').select('*').eq('id', id).single();
      const { error } = await supabase.from('quotations').delete().eq('id', id);
      
      if (error) {
        alert('Error deleting quotation: ' + error.message);
        return;
      }
      
      if (existing) {
        logActivity(existing.clientId, 'Record Deleted', `Quotation #${existing.number} was deleted`, id, 'Quotation', existing);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            <h1 className="text-2xl font-black text-black">Quotations</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Design & Manage proposals</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setIsQuickMode(true); setIsBuilderOpen(true); }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold text-xs hover:bg-black/80 transition-all shadow-lg shadow-black/10"
          >
            <Zap size={14} className="text-yellow-400" />
            Quick Quotation
          </button>
          <button 
            onClick={() => { setIsQuickMode(false); setIsBuilderOpen(true); }}
            style={{ backgroundColor: settings?.brandColors?.primary || '#000000' }}
            className="flex items-center justify-center gap-2 px-6 py-3 text-white rounded-xl font-bold text-xs hover:opacity-90 transition-all shadow-lg shadow-black/10"
          >
            <Plus size={16} />
            New Quotation
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl md:rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-gray-50 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-xs outline-none font-bold"
            />
          </div>
          <div className="relative min-w-[140px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-deep" size={14} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border-none rounded-xl text-[10px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer"
            >
              <option value="All">All Status</option>
              {Object.values(DocumentStatus).filter(s => 
                [DocumentStatus.DRAFT, DocumentStatus.CREATED, DocumentStatus.SENT, DocumentStatus.RECEIVED, DocumentStatus.APPROVED, DocumentStatus.DECLINED].includes(s)
              ).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <MoreHorizontal size={14} />
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-gray-400">Quote Reference</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-gray-400">Client & Event</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-gray-400">Amount</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-gray-400">Valid Until</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-gray-400">Status</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredQuotations.map((quote: any) => (
                <tr key={quote.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                    <div 
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ 
                        backgroundColor: `${settings?.brandColors?.secondary || '#D4AF37'}1A`,
                        color: settings?.brandColors?.secondary || '#D4AF37'
                      }}
                    >
                      <FileText size={18} />
                    </div>
                      <div>
                        <p className="font-bold text-sm">#{quote.number}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">Created: {new Date(quote.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div>
                      <p className="font-bold text-sm">{quote.clientName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{quote.eventName}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-bold text-sm">{formatCurrency(quote.grandTotal, quote.currency)}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">{(quote.items || []).length} Items</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-bold text-gray-700">{quote.validUntil || 'N/A'}</p>
                    {quote.status !== DocumentStatus.APPROVED && quote.status !== DocumentStatus.DECLINED && (
                      <p className={cn(
                        "text-[10px] uppercase tracking-widest mt-0.5",
                        quote.daysLeft < 0 ? "text-red-500 font-bold" : "text-gray-400"
                      )}>
                        {quote.daysLeft < 0 ? `Expired ${Math.abs(quote.daysLeft)}d ago` : `${quote.daysLeft} days left`}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <select
                      value={quote.status}
                      onChange={(e) => handleStatusChange(quote.id!, e.target.value as DocumentStatus)}
                      className={cn(
                        "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider appearance-none cursor-pointer outline-none border-none pr-6 bg-no-repeat",
                        quote.status === DocumentStatus.APPROVED ? "bg-green-50 text-green-600" :
                        quote.status === DocumentStatus.RECEIVED ? "bg-green-50 text-green-600" :
                        quote.status === DocumentStatus.SENT ? "bg-blue-50 text-blue-600" :
                        quote.status === DocumentStatus.CREATED ? "bg-purple-50 text-purple-600" :
                        quote.status === DocumentStatus.DRAFT ? "bg-gray-100 text-gray-500" :
                        "bg-red-50 text-red-600"
                      )}
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg stroke='currentColor' fill='none' stroke-width='2' viewBox='0 0 24 24' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                        backgroundPosition: 'right 6px center',
                        backgroundSize: '12px'
                      }}
                    >
                      <option value={DocumentStatus.DRAFT} className="bg-white text-black font-medium">Draft</option>
                      <option value={DocumentStatus.CREATED} className="bg-white text-black font-medium">Created</option>
                      <option value={DocumentStatus.SENT} className="bg-white text-black font-medium">Sent</option>
                      <option value={DocumentStatus.RECEIVED} className="bg-white text-black font-medium">Received</option>
                      <option value={DocumentStatus.APPROVED} className="bg-white text-black font-medium">Approved</option>
                      <option value={DocumentStatus.DECLINED} className="bg-white text-black font-medium">Declined</option>
                    </select>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      {!quote.eventId && (
                        <button 
                          onClick={() => { setSelectedQuote(quote); setIsScheduleModalOpen(true); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-gold-deep hover:bg-gold-deep/10 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest"
                          title="Schedule Event"
                        >
                          <Calendar size={14} />
                          <span className="hidden lg:inline">Schedule Event</span>
                        </button>
                      )}
                      <button 
                        onClick={() => { setSelectedQuote(quote); setIsViewModalOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-black/40 hover:text-white rounded-lg transition-all text-[10px] font-black uppercase tracking-widest" 
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = settings?.brandColors?.primary || '#000000';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        title="View & Share"
                      >
                        <Eye size={14} />
                        <span className="hidden lg:inline">View</span>
                      </button>
                      <button 
                        onClick={() => { setSelectedQuote(quote); setIsBuilderOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-black/40 hover:text-white rounded-lg transition-all text-[10px] font-black uppercase tracking-widest"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = settings?.brandColors?.primary || '#000000';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        title="Edit Quotation"
                      >
                        <Pencil size={14} />
                        <span className="hidden lg:inline">Edit</span>
                      </button>
                      <button 
                        onClick={() => deleteQuotation(quote.id!)}
                        className="p-3 md:p-2 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all" 
                        title="Delete"
                      >
                        <Trash2 size={18} className="md:w-4 md:h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-50">
          {filteredQuotations.map((quote: any) => (
            <div key={quote.id} className="p-4 flex flex-col gap-3 group active:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between" onClick={() => { setSelectedQuote(quote); setIsViewModalOpen(true); }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div 
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ 
                      backgroundColor: `${settings?.brandColors?.secondary || '#D4AF37'}1A`,
                      color: settings?.brandColors?.secondary || '#D4AF37'
                    }}
                  >
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">#{quote.number} • {quote.clientName}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-tight truncate">
                      {quote.eventName} • {formatCurrency(quote.grandTotal, quote.currency)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedQuote(quote); setIsBuilderOpen(true); }}
                    className="p-2 text-black/20 hover:text-black transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
              </div>
              <div className="flex items-center  justify-between pl-12 border-t border-gray-50 pt-2">
                 <select
                    value={quote.status}
                    onChange={(e) => handleStatusChange(quote.id!, e.target.value as DocumentStatus)}
                    className={cn(
                      "inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest appearance-none cursor-pointer outline-none border-none pr-7 bg-no-repeat shadow-sm",
                      quote.status === DocumentStatus.APPROVED ? "bg-green-50 text-green-600" :
                      quote.status === DocumentStatus.RECEIVED ? "bg-green-50 text-green-600" :
                      quote.status === DocumentStatus.SENT ? "bg-blue-50 text-blue-600" :
                      quote.status === DocumentStatus.CREATED ? "bg-purple-50 text-purple-600" :
                      quote.status === DocumentStatus.DRAFT ? "bg-gray-100 text-gray-500" :
                      "bg-red-50 text-red-600"
                    )}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg stroke='currentColor' fill='none' stroke-width='2' viewBox='0 0 24 24' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                      backgroundPosition: 'right 8px center',
                      backgroundSize: '10px'
                    }}
                  >
                    <option value={DocumentStatus.DRAFT} className="bg-white text-black font-medium">Draft</option>
                    <option value={DocumentStatus.CREATED} className="bg-white text-black font-medium">Created</option>
                    <option value={DocumentStatus.SENT} className="bg-white text-black font-medium">Sent</option>
                    <option value={DocumentStatus.RECEIVED} className="bg-white text-black font-medium">Received</option>
                    <option value={DocumentStatus.APPROVED} className="bg-white text-black font-medium">Approved</option>
                    <option value={DocumentStatus.DECLINED} className="bg-white text-black font-medium">Declined</option>
                  </select>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    {new Date(quote.date || quote.createdAt).toLocaleDateString()}
                  </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <QuotationBuilder 
        isOpen={isBuilderOpen} 
        onClose={() => {
          setIsBuilderOpen(false);
          setIsQuickMode(false);
          setSelectedQuote(null);
        }} 
        initialQuotation={selectedQuote || undefined}
        optimisticInsert={optimisticInsert}
        optimisticUpdate={optimisticUpdate}
        defaultQuickQuote={isQuickMode}
      />

      {selectedQuote && (
        <ScheduleEventModal 
          isOpen={isScheduleModalOpen}
          onClose={() => {
            setIsScheduleModalOpen(false);
            setSelectedQuote(null);
          }}
          quotation={selectedQuote}
          onSuccess={() => {
            // Success handler if needed (Supabase realtime will handle UI update)
          }}
        />
      )}

      <Modal 
        isOpen={isViewModalOpen} 
        onClose={() => setIsViewModalOpen(false)} 
        title={`Quotation Preview ${selectedQuote ? '#' + selectedQuote.number : ''}`}
        size="full"
      >
        {selectedQuote && (
          <DocumentGenerator 
            type="Quotation" 
            data={selectedQuote} 
            onClose={() => setIsViewModalOpen(false)} 
          />
        )}
      </Modal>
    </div>
  );
}
