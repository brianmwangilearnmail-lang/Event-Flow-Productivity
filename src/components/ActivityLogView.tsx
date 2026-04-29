import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, logActivity } from '../db';
import { ActivityLog, DocumentStatus } from '../types';
import { 
  History, 
  RotateCcw, 
  Search, 
  User, 
  Clock, 
  ExternalLink,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';
import Modal from './Modal';
import DocumentGenerator from './DocumentGenerator';

export default function ActivityLogView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [selectedDoc, setSelectedDoc] = useState<{ type: string, data: any } | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const logs = useLiveQuery(async () => {
    const allLogs = await db.activityLogs.reverse().toArray();
    return allLogs;
  }) || [];

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         log.actionType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'All' || log.linkedType === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleView = async (log: ActivityLog) => {
    if (!log.linkedId || !log.linkedType) return;
    
    try {
      let data = null;
      switch (log.linkedType) {
        case 'Quotation':
          data = await db.quotations.get(log.linkedId);
          break;
        case 'Invoice':
          data = await db.invoices.get(log.linkedId);
          break;
        case 'Receipt':
          data = await db.receipts.get(log.linkedId);
          break;
        case 'Client':
          data = await db.clients.get(log.linkedId);
          break;
      }

      if (data) {
        setSelectedDoc({ type: log.linkedType, data });
        setIsViewModalOpen(true);
      } else {
        alert('Record no longer exists.');
      }
    } catch (error) {
      console.error('Failed to fetch document:', error);
    }
  };

  const handleUndo = async (log: ActivityLog) => {
    if (!log.revertData || log.isReverted) return;

    if (!confirm('Are you sure you want to undo this action? This will revert the record to its previous state.')) {
      return;
    }

    try {
      const type = log.linkedType;
      const id = log.linkedId;

      if (!type || !id) return;

      let success = false;
      switch (type) {
        case 'Client':
          await db.clients.put({ ...log.revertData, id });
          success = true;
          break;
        case 'Event':
          await db.events.put({ ...log.revertData, id });
          success = true;
          break;
        case 'Quotation':
          await db.quotations.put({ ...log.revertData, id });
          success = true;
          break;
        case 'Invoice':
          await db.invoices.put({ ...log.revertData, id });
          success = true;
          break;
        case 'Receipt':
          // Reverting a payment means deleting the receipt, the payment, and reverting the invoice
          if (log.revertData && log.linkedId) {
            // Revert the invoice
            await db.invoices.put({ ...log.revertData, id: log.revertData.id });
            
            // Delete the related receipt and payment
            const receipt = await db.receipts.where('paymentId').equals(log.linkedId).first();
            if (receipt) {
              await db.receipts.delete(receipt.id!);
            }
            await db.payments.delete(log.linkedId);
            success = true;
          }
          break;
        case 'Catalog':
          await db.catalog.put({ ...log.revertData, id });
          success = true;
          break;
      }

      if (success) {
        await db.activityLogs.update(log.id!, { isReverted: true });
        await logActivity(
          log.clientId, 
          'Action Undone', 
          `Undid action: ${log.actionType} - ${log.description}`, 
          log.id, 
          'ActivityLog'
        );
      }
    } catch (error) {
      console.error('Failed to undo action:', error);
      alert('Failed to undo action. Please try again.');
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'Action Undone': return <RotateCcw className="text-orange-500" size={16} />;
      case 'Quotation Created':
      case 'Invoice Created': return <CheckCircle2 className="text-green-500" size={16} />;
      case 'Record Deleted': return <XCircle className="text-red-500" size={16} />;
      default: return <History className="text-blue-500" size={16} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter text-black uppercase">Activity Ledger</h1>
          <p className="text-[10px] text-black/40 uppercase tracking-[0.2em] mt-1 font-bold">Comprehensive system audit trail</p>
        </div>
      </div>

      <div className="bg-white border border-black/5 shadow-sm rounded-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-black/5 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={16} />
            <input 
              type="text" 
              placeholder="SEARCH LOGS..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-bg-base border-none rounded-xl text-xs uppercase outline-none font-bold placeholder:text-black/10 focus:ring-2 ring-black/5"
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-3 bg-bg-base border-none rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer hover:bg-black/5 transition-colors"
            >
              <option value="All">All Entities</option>
              <option value="Client">Clients</option>
              <option value="Event">Events</option>
              <option value="Quotation">Quotations</option>
              <option value="Invoice">Invoices</option>
              <option value="Catalog">Catalog</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {/* Desktop Table View */}
          <table className="w-full text-left border-collapse hidden lg:table">
            <thead>
              <tr className="bg-bg-base/30">
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-black/30 whitespace-nowrap">Timestamp</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-black/30 whitespace-nowrap">Action</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-black/30">Description</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-black/30 whitespace-nowrap text-center">Entity</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-black/30 text-right whitespace-nowrap">Activity Tools</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredLogs.map((log) => (
                <tr key={log.id} className={cn(
                  "group transition-colors h-[72px]",
                  log.isReverted ? "bg-red-50/30 opacity-60" : "hover:bg-bg-base/20"
                )}>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-black/20" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase">{formatDistanceToNow(log.timestamp, { addSuffix: true })}</span>
                        <span className="text-[8px] font-bold text-black/30">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.actionType)}
                      <span className="text-[10px] font-black uppercase tracking-tight">{log.actionType}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <p className="text-[11px] font-medium text-black/60 truncate max-w-[200px] lg:max-w-xs">{log.description}</p>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-center">
                    {log.linkedType && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-black/5 text-[8px] font-black uppercase tracking-widest text-black/60">
                        {log.linkedType}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      {log.linkedType && log.linkedType !== 'Catalog' && (log.linkedType as string) !== 'ActivityLog' && (
                        <button 
                          onClick={() => handleView(log)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-base text-black/60 hover:bg-black hover:text-white transition-all rounded-lg text-[9px] font-black uppercase tracking-widest border border-black/5"
                          title="View associated document"
                        >
                          <Eye size={12} />
                          View
                        </button>
                      )}
                      {log.revertData && !log.isReverted && (
                        <button 
                          onClick={() => handleUndo(log)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white hover:bg-gold-deep transition-all rounded-lg text-[9px] font-black uppercase tracking-widest"
                          title="Rollback this change"
                        >
                          <RotateCcw size={12} />
                          Undo
                        </button>
                      )}
                      {log.isReverted && (
                        <span className="text-[8px] font-black uppercase text-red-500/60 bg-red-50 px-2 py-1 rounded">Reverted</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile/Tablet Card View */}
          <div className="lg:hidden divide-y divide-black/5">
            {filteredLogs.map((log) => (
              <div key={log.id} className={cn(
                "p-4 space-y-3",
                log.isReverted ? "bg-red-50/30 opacity-60" : "active:bg-bg-base/20"
              )}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    {getActionIcon(log.actionType)}
                    <span className="text-[10px] font-black uppercase tracking-tight">{log.actionType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black uppercase text-black/30 bg-black/5 px-1.5 py-0.5 rounded whitespace-nowrap">
                      {log.linkedType}
                    </span>
                  </div>
                </div>
                
                <p className="text-xs font-medium text-black/70 leading-relaxed break-words">{log.description}</p>
                
                <div className="flex justify-between items-center pt-1">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-black/20" />
                      <span className="text-[9px] font-bold text-black/40 uppercase">
                        {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                    <span className="text-[7px] font-bold text-black/20 uppercase tracking-tighter ml-4">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {log.linkedType && log.linkedType !== 'Catalog' && (log.linkedType as string) !== 'ActivityLog' && (
                      <button 
                        onClick={() => handleView(log)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-base text-black/60 rounded-lg text-[9px] font-black uppercase tracking-widest border border-black/5"
                      >
                        <Eye size={10} />
                        View
                      </button>
                    )}
                    {log.revertData && !log.isReverted && (
                    <button 
                      onClick={() => handleUndo(log)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white hover:bg-gold-deep transition-all rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-black/10"
                    >
                      <RotateCcw size={10} />
                      Undo
                    </button>
                  )}
                  {log.isReverted && (
                    <span className="text-[8px] font-black uppercase text-red-500/60 font-bold bg-red-50/50 px-2 py-1 rounded border border-red-100">Reverted</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

          {filteredLogs.length === 0 && (
            <div className="py-24 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-bg-base rounded-full flex items-center justify-center">
                  <History size={32} className="text-black/10" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/20">No matching activities recorded</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal 
        isOpen={isViewModalOpen} 
        onClose={() => setIsViewModalOpen(false)} 
        title={`Preview: ${selectedDoc?.type}`}
        size="full"
      >
        {selectedDoc && (
          selectedDoc.type === 'Client' ? (
            <div className="space-y-6 p-4">
              <h2 className="text-2xl font-black italic tracking-tighter text-black uppercase">{selectedDoc.data.fullName}</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-black/40 uppercase tracking-[0.2em] font-bold">Email</p>
                  <p className="text-sm font-bold">{selectedDoc.data.email}</p>
                </div>
                <div>
                  <p className="text-[10px] text-black/40 uppercase tracking-[0.2em] font-bold">Phone</p>
                  <p className="text-sm font-bold">{selectedDoc.data.phone}</p>
                </div>
              </div>
            </div>
          ) : (
            <DocumentGenerator 
              type={selectedDoc.type as any} 
              data={selectedDoc.data} 
              onClose={() => setIsViewModalOpen(false)} 
            />
          )
        )}
      </Modal>
    </div>
  );
}
