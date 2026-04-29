import React, { useState } from 'react';
import { 
  Search, 
  Receipt as ReceiptIcon, 
  Download, 
  Printer, 
  ArrowRight,
  Filter,
  Eye,
  Calendar,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { cn, formatCurrency } from '../lib/utils';
import Modal from './Modal';
import DocumentGenerator from './DocumentGenerator';

interface ReceiptViewProps {
  onNavigate?: (view: any) => void;
}

export default function ReceiptView({ onNavigate }: ReceiptViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  const receipts = useLiveQuery(async () => {
    const rcs = await db.receipts.reverse().toArray();
    const clients = await db.clients.toArray();
    const events = await db.events.toArray();
    
    return rcs.map(r => ({
      ...r,
      clientName: clients.find(c => c.id === r.clientId)?.fullName || 'Unknown Client',
      eventName: events.find(e => e.id === r.eventId)?.title || 'Unknown Event'
    })).filter(r => 
      r.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]) || [];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 md:px-0 mt-4 md:mt-0">
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
            <h1 className="text-2xl font-black text-black italic">Archive</h1>
            <p className="text-[10px] text-black/40 uppercase tracking-[0.2em] mt-1 font-bold">Transaction history</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-black/5 shadow-sm overflow-hidden flex flex-col rounded-2xl mx-4 md:mx-0">
        <div className="p-3 border-b border-black/5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={16} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2 bg-bg-base border-none rounded-xl text-[10px] uppercase outline-none font-bold"
            />
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-bg-base/30">
                <th className="px-8 py-4 text-[9px] uppercase tracking-[0.3em] font-black text-black/40 border-b border-black/5">Receipt Meta</th>
                <th className="px-8 py-4 text-[9px] uppercase tracking-[0.3em] font-black text-black/40 border-b border-black/5">Entity Info</th>
                <th className="px-8 py-4 text-[9px] uppercase tracking-[0.3em] font-black text-black/40 border-b border-black/5">Associated Event</th>
                <th className="px-8 py-4 text-[9px] uppercase tracking-[0.3em] font-black text-black/40 border-b border-black/5 text-right w-40">Value Captured</th>
                <th className="px-8 py-4 text-[9px] uppercase tracking-[0.3em] font-black text-black/40 border-b border-black/5 text-right w-40">Settlement Date</th>
                <th className="px-8 py-4 text-[9px] uppercase tracking-[0.3em] font-black text-black/40 border-b border-black/5 text-right w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {receipts.map((rcp: any) => (
                <tr key={rcp.id} className="hover:bg-bg-base/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 border border-black/5 bg-white flex items-center justify-center text-green-600">
                        <ReceiptIcon size={16} />
                      </div>
                      <p className="font-bold text-xs uppercase tracking-tight">#{rcp.number}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-serif text-lg italic text-black/80">{rcp.clientName}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-[10px] text-black/40 uppercase tracking-widest font-bold">{rcp.eventName}</p>
                  </td>
                  <td className="px-8 py-6 text-right font-serif text-lg tracking-tight text-green-600">
                    {formatCurrency(rcp.amount)}
                  </td>
                  <td className="px-8 py-6 text-right text-[10px] font-bold uppercase tracking-widest text-black/40">
                    {rcp.date}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setSelectedReceipt(rcp); setIsViewModalOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-black/40 hover:bg-black hover:text-white rounded-lg transition-all text-[10px] font-black uppercase tracking-widest" 
                        title="View Details"
                      >
                        <Eye size={14} />
                        <span className="hidden lg:inline">View</span>
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
          {receipts.map((rcp: any) => (
            <div key={rcp.id} className="p-4 flex items-center justify-between group active:bg-gray-50 transition-colors" onClick={() => { setSelectedReceipt(rcp); setIsViewModalOpen(true); }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 border border-black/5 bg-gray-50 flex items-center justify-center text-green-600 shrink-0">
                  <ReceiptIcon size={16} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">#{rcp.number} • {rcp.clientName}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-tight truncate">
                    {rcp.date} • {formatCurrency(rcp.amount)}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </div>
          ))}
        </div>
      </div>
      <Modal 
        isOpen={isViewModalOpen} 
        onClose={() => setIsViewModalOpen(false)} 
        title={`Receipt Preview ${selectedReceipt ? '#' + selectedReceipt.number : ''}`}
        size="full"
      >
        {selectedReceipt && (
          <DocumentGenerator 
            type="Receipt" 
            data={selectedReceipt} 
            onClose={() => setIsViewModalOpen(false)} 
          />
        )}
      </Modal>
    </div>
  );
}
