import React, { useState, useMemo } from 'react';
import { db, logActivity } from '../db';
import { Client, DocumentStatus, QuotationLineItem, CatalogItem, Quotation } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Trash2, Search, Package, FileText, ChevronRight } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import Modal from './Modal';

interface InvoiceFormProps {
  client: Client;
  onSuccess: () => void;
}

export default function InvoiceForm({ client, onSuccess }: InvoiceFormProps) {
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [lineItems, setLineItems] = useState<QuotationLineItem[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isItemFinderOpen, setIsItemFinderOpen] = useState(false);
  const [isQuotationPickerOpen, setIsQuotationPickerOpen] = useState(false);

  const events = useLiveQuery(() => db.events.where('clientId').equals(client.id!).toArray());
  
  React.useEffect(() => {
    if (events?.length === 1 && !selectedEventId) {
      setSelectedEventId(events[0].id!);
    }
  }, [events]);

  const catalogItems = useLiveQuery(() => db.catalog.filter(i => !i.isArchived).toArray()) || [];
  const quotations = useLiveQuery(() => 
    db.quotations.where('clientId').equals(client.id!).reverse().toArray()
  ) || [];

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (1 - item.discount/100)), 0);
    const taxRate = 0; // Simplified for now
    const taxTotal = subtotal * (taxRate / 100);
    const grandTotal = subtotal + taxTotal;
    
    return { subtotal, taxTotal, grandTotal };
  }, [lineItems]);

  const handleAddCatalogItem = (item: CatalogItem) => {
    const newLineItem: QuotationLineItem = {
      itemId: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      quantity: 1,
      unit: item.unit,
      unitPrice: item.clientPrice,
      discount: 0
    };
    setLineItems([...lineItems, newLineItem]);
    setIsItemFinderOpen(false);
  };

  const handleAddItemsFromQuotation = (quotation: Quotation) => {
    setLineItems([...lineItems, ...quotation.items]);
    setIsQuotationPickerOpen(false);
  };

  const updateLineItem = (index: number, field: keyof QuotationLineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      alert('Please select an event');
      return;
    }
    if (lineItems.length === 0) {
      alert('Please add at least one item');
      return;
    }

    const invoiceId = await db.invoices.add({
      clientId: client.id!,
      eventId: selectedEventId,
      number: `INV-${Date.now().toString().slice(-6)}`,
      type: 'Full',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate,
      status: DocumentStatus.SENT,
      items: lineItems,
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      discountTotal: 0,
      amountPaid: 0,
      grandTotal: totals.grandTotal,
      notes
    });

    logActivity(client.id, 'Invoice Created', `Invoice created with ${lineItems.length} items for ${formatCurrency(totals.grandTotal)}`, Number(invoiceId), 'Invoice');
    onSuccess();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-black/30 mb-2">Related Event</label>
          <select 
            value={selectedEventId || ''} 
            onChange={(e) => setSelectedEventId(Number(e.target.value))}
            required 
            className="w-full p-3 bg-bg-base border border-black/5 rounded-xl text-xs font-bold outline-none focus:border-gold-deep"
          >
            <option value="">Select Event</option>
            {events?.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-black/30 mb-2">Due Date</label>
          <input 
            type="date" 
            value={dueDate} 
            onChange={(e) => setDueDate(e.target.value)} 
            required 
            className="w-full p-3 bg-bg-base border border-black/5 rounded-xl text-xs font-bold outline-none focus:border-gold-deep" 
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-black italic">Invoice Items</h3>
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={() => setIsQuotationPickerOpen(true)}
              className="px-3 py-1.5 border border-black/5 bg-white text-black/60 rounded-lg font-bold text-[8px] uppercase tracking-widest hover:text-black hover:border-black transition-all"
            >
              From Quotation
            </button>
            <button 
              type="button"
              onClick={() => setIsItemFinderOpen(true)}
              className="px-3 py-1.5 bg-black text-white rounded-lg font-bold text-[8px] uppercase tracking-widest flex items-center gap-1.5"
            >
              <Plus size={12} /> Add Item
            </button>
          </div>
        </div>

        <div className="border border-black/5 rounded-2xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[450px] sm:min-w-0">
              <thead>
                <tr className="bg-bg-base/50">
                  <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-black/30">Item</th>
                  <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-black/30 text-center w-20">Qty</th>
                  <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-black/30 text-right w-24">Price</th>
                  <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-black/30 text-right w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {lineItems.map((item, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <input 
                        value={item.name} 
                        onChange={(e) => updateLineItem(i, 'name', e.target.value)}
                        className="text-[10px] font-bold bg-transparent border-none p-0 outline-none w-full"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input 
                        type="number"
                        value={item.quantity} 
                        onChange={(e) => updateLineItem(i, 'quantity', Number(e.target.value))}
                        className="text-[10px] font-bold bg-bg-base/50 border border-black/5 rounded-md p-1 outline-none w-full text-center"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input 
                        type="number"
                        value={item.unitPrice} 
                        onChange={(e) => updateLineItem(i, 'unitPrice', Number(e.target.value))}
                        className="text-[10px] font-bold bg-bg-base/50 border border-black/5 rounded-md p-1 outline-none w-full text-right"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => removeLineItem(i)} className="text-black/20 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {lineItems.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[9px] uppercase tracking-widest text-black/20 italic">
                      Select items to begin
                    </td>
                  </tr>
                )}
              </tbody>
              {lineItems.length > 0 && (
                <tfoot className="bg-bg-base/30 border-t border-black/5">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-black/40">Total Amount</td>
                    <td className="px-4 py-3 text-right text-xs font-black text-black">{formatCurrency(totals.grandTotal)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-black/30">Invoice Notes</label>
        <textarea 
          value={notes} 
          onChange={(e) => setNotes(e.target.value)} 
          rows={2} 
          className="w-full p-4 bg-bg-base border border-black/5 rounded-2xl text-xs font-bold outline-none focus:border-gold-deep" 
          placeholder="Payment details, instructions, etc."
        />
      </div>

      <button 
        onClick={handleSubmit}
        className="w-full py-4 bg-black text-white hover:bg-black/90 transition-all font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-black/10"
      >
        Submit Invoice
      </button>

      {/* Item Picker Modal */}
      <Modal isOpen={isItemFinderOpen} onClose={() => setIsItemFinderOpen(false)} title="Catalog Items">
        <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto pr-2">
          {catalogItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => handleAddCatalogItem(item)}
              className="flex items-center gap-3 p-3 border border-black/5 rounded-xl hover:border-black transition-all text-left"
            >
              <div className="w-10 h-10 bg-bg-base rounded-lg flex items-center justify-center shrink-0">
                <Package size={16} className="text-black/20" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase">{item.name}</p>
                <p className="text-[8px] font-bold text-black/40">{formatCurrency(item.clientPrice)}</p>
              </div>
              <Plus size={14} className="text-black/20" />
            </button>
          ))}
        </div>
      </Modal>

      {/* Quotation Picker Modal */}
      <Modal isOpen={isQuotationPickerOpen} onClose={() => setIsQuotationPickerOpen(false)} title="Select Quotation Items">
        <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto pr-2">
          {quotations.filter(q => [DocumentStatus.SENT, DocumentStatus.RECEIVED, DocumentStatus.APPROVED].includes(q.status)).map(q => (
            <button 
              key={q.id} 
              onClick={() => handleAddItemsFromQuotation(q)}
              className="flex items-center gap-4 p-4 border border-black/5 rounded-xl hover:border-black transition-all text-left group"
            >
              <div className="w-10 h-10 bg-gold-deep/5 text-gold-deep rounded-lg flex items-center justify-center shrink-0">
                <FileText size={18} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-tight">#{q.number}</p>
                <p className="text-[8px] font-bold text-black/40 uppercase tracking-widest">{q.status} • {q.items.length} items</p>
                <p className="text-[11px] font-black text-black mt-0.5">{formatCurrency(q.grandTotal, q.currency)}</p>
              </div>
              <ChevronRight size={16} className="text-black/10 group-hover:text-black" />
            </button>
          ))}
          {quotations.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-[10px] uppercase tracking-widest font-black text-black/20">No eligible quotations found</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
