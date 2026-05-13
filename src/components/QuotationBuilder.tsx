import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Calculator, 
  Save, 
  X, 
  Search, 
  Package, 
  Settings as SettingsIcon,
  ChevronDown,
  Info,
  DollarSign,
  Briefcase,
  Image as ImageIcon,
  Zap,
  Calendar
} from 'lucide-react';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { supabase } from '../lib/supabase';
import { logActivity } from '../db';
import { 
  Client, 
  Event, 
  CatalogItem, 
  Quotation, 
  DocumentStatus, 
  QuotationLineItem,
  BusinessSettings
} from '../types';
import { cn, formatCurrency } from '../lib/utils';
import Modal from './Modal';
import { useSettings } from '../context/SettingsContext';

interface QuotationBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuotation?: Quotation;
  optimisticInsert?: (item: Quotation) => void;
  optimisticUpdate?: (predicate: (item: Quotation) => boolean, update: Partial<Quotation>) => void;
  defaultQuickQuote?: boolean;
}

export default function QuotationBuilder({ isOpen, onClose, initialQuotation, optimisticInsert, optimisticUpdate, defaultQuickQuote }: QuotationBuilderProps) {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [lineItems, setLineItems] = useState<QuotationLineItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [depositRequired, setDepositRequired] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [isItemFinderOpen, setIsItemFinderOpen] = useState(false);
  const [priceMode, setPriceMode] = useState<'client' | 'supplier'>('client');
  const [isQuickQuote, setIsQuickQuote] = useState(defaultQuickQuote || false);
  const [quickQuoteTitle, setQuickQuoteTitle] = useState('');
  const [quickQuoteDate, setQuickQuoteDate] = useState('');

  const { data: clients = [] } = useSupabaseQuery<Client>('clients', (q) => q.select('*').order('fullName'));
  const { data: events = [] } = useSupabaseQuery<Event>('events', (q) => {
    if (selectedClientId) {
      return q.select('*').eq('clientId', selectedClientId).order('date');
    }
    return q.select('*').limit(0);
  }, [selectedClientId]);
  const { data: catalogItems = [] } = useSupabaseQuery<CatalogItem>('catalog', (q) => q.select('*').eq('isArchived', false).order('name'));
  const { settings } = useSettings();

  useEffect(() => {
    if (isOpen) {
      if (initialQuotation) {
        setSelectedClientId(initialQuotation.clientId);
        setSelectedEventId(initialQuotation.eventId || null);
        setLineItems(initialQuotation.items || []);
        setGlobalDiscount(initialQuotation.globalDiscount || 0);
        setDepositRequired(initialQuotation.depositRequired || 0);
        setTaxRate((initialQuotation.taxTotal / (initialQuotation.subtotal - initialQuotation.discountTotal)) * 100 || settings?.taxRate || 0);
        setIsQuickQuote(!initialQuotation.eventId);
        // If it's a quick quote, try to find the event title from related events if possible
        // but usually quick quotes don't have events yet.
      } else {
        setSelectedClientId(null);
        setSelectedEventId(null);
        setLineItems([]);
        setGlobalDiscount(0);
        setDepositRequired(0);
        setTaxRate(settings?.taxRate || 0);
        setIsQuickQuote(defaultQuickQuote || false);
        setQuickQuoteTitle('');
        setQuickQuoteDate('');
      }
    }
  }, [isOpen, initialQuotation, settings]);

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (1 - item.discount/100)), 0);
    const discountAmount = subtotal * (globalDiscount / 100);
    const subtotalAfterDiscount = subtotal - discountAmount;
    const taxTotal = subtotalAfterDiscount * (taxRate / 100);
    const grandTotal = subtotalAfterDiscount + taxTotal;
    
    return {
      subtotal,
      discountAmount,
      taxTotal,
      grandTotal,
      balanceAfterDeposit: grandTotal - depositRequired
    };
  }, [lineItems, globalDiscount, taxRate, depositRequired]);

  const handleAddLineItem = (item: CatalogItem) => {
    const newLineItem: QuotationLineItem = {
      itemId: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      quantity: 1,
      unit: item.unit,
      unitPrice: priceMode === 'client' ? item.clientPrice : item.supplierPrice,
      discount: 0
    };
    setLineItems([...lineItems, newLineItem]);
    setIsItemFinderOpen(false);
  };

  const updateLineItem = (index: number, field: keyof QuotationLineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleSave = async (status: DocumentStatus, createEvent = false) => {
    if (!selectedClientId) {
      alert('Please select a client');
      return;
    }

    if (!isQuickQuote && !selectedEventId) {
      alert('Please select an event');
      return;
    }

    let finalEventId = selectedEventId;

    // If Schedule Event is requested or it's a quick quote that needs an event now
    if (createEvent && isQuickQuote) {
      if (!quickQuoteTitle) {
        alert('Please enter an event title to schedule it');
        return;
      }

      const newEvent = {
        clientId: selectedClientId,
        title: quickQuoteTitle,
        date: quickQuoteDate || new Date().toISOString().split('T')[0],
        status: 'Confirmed',
        venue: 'TBD',
        startTime: '09:00',
        endTime: '17:00'
      };

      const { data: createdEvent, error: eventError } = await supabase.from('events').insert(newEvent).select();
      if (eventError) {
        alert('Error creating event: ' + eventError.message);
        return;
      }
      finalEventId = createdEvent[0].id;
      await logActivity(selectedClientId, 'Event Created', `Quick event "${quickQuoteTitle}" scheduled via Quotation Builder`, finalEventId, 'Event');
    }

    const quotationData: any = {
      clientId: selectedClientId,
      eventId: finalEventId || undefined,
      number: initialQuotation?.number || `QTN-${Date.now().toString().slice(-6)}`,
      date: initialQuotation?.date || new Date().toISOString().split('T')[0],
      validUntil: initialQuotation?.validUntil || new Date(Date.now() + (settings?.defaultValidityDays || 14) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: settings?.currency || 'KES',
      status,
      items: lineItems,
      subtotal: totals.subtotal,
      discountTotal: totals.discountAmount,
      globalDiscount,
      taxTotal: totals.taxTotal,
      depositRequired,
      grandTotal: totals.grandTotal,
      version: (initialQuotation?.version || 0) + 1,
      preparedBy: initialQuotation?.preparedBy || 'Admin User'
    };

    // Optimistic Update
    if (initialQuotation?.id) {
      if (optimisticUpdate) {
        optimisticUpdate(q => q.id === initialQuotation.id, quotationData);
      }
    } else if (optimisticInsert) {
      optimisticInsert({ id: -Date.now(), ...quotationData } as Quotation);
    }
    onClose();

    const { data: result, error } = initialQuotation?.id
      ? await supabase.from('quotations').update(quotationData).eq('id', initialQuotation.id).select()
      : await supabase.from('quotations').insert(quotationData).select();

    if (error) {
      alert('Error saving quotation: ' + error.message);
      return;
    }
    const id = result[0].id;
    await logActivity(
      selectedClientId, 
      initialQuotation?.id ? 'Quotation Updated' : 'Quotation Created', 
      `Quotation #${quotationData.number} ${initialQuotation?.id ? 'updated' : 'saved'} as ${status}`, 
      id, 
      'Quotation'
    );
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quotation Builder" size="full">
      <div className="flex flex-col xl:grid xl:grid-cols-4 gap-4 xl:gap-8 h-full">
        {/* Builder Panel */}
        <div className="xl:col-span-3 flex flex-col gap-4 md:gap-8 h-full">
          {/* Header Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-8 bg-bg-base/50 p-4 md:p-8 border border-black/5 rounded-xl">
            <div className="space-y-3 md:space-y-6">
              <div className="space-y-1">
                <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/30">Client</label>
                <select 
                  className="w-full px-2 py-1.5 bg-white border border-black/5 rounded-lg outline-none focus:ring-1 focus:ring-gold-deep font-bold text-[10px]"
                  value={selectedClientId || ''}
                  onChange={(e) => setSelectedClientId(Number(e.target.value))}
                >
                  <option value="">Select client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                </select>
              </div>
              
              <div className="pt-2 border-t border-black/5 mt-2">
                <button 
                  onClick={() => setIsQuickQuote(!isQuickQuote)}
                  className={cn(
                    "w-full flex items-center justify-between p-2 rounded-lg transition-all",
                    isQuickQuote ? "bg-black text-white" : "bg-white text-black/40 hover:text-black border border-black/5"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Zap size={14} className={isQuickQuote ? "text-yellow-400" : ""} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Quick Quote Mode</span>
                  </div>
                  <div className={cn(
                    "w-8 h-4 rounded-full relative transition-all",
                    isQuickQuote ? "bg-yellow-400" : "bg-black/10"
                  )}>
                    <div className={cn(
                      "w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all",
                      isQuickQuote ? "right-0.5" : "left-0.5"
                    )} />
                  </div>
                </button>
              </div>

              {isQuickQuote ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/30">Tentative Event Title</label>
                    <input 
                      type="text"
                      placeholder="e.g. Summer Gala 2024"
                      className="w-full px-2 py-1.5 bg-white border border-black/5 rounded-lg outline-none focus:ring-1 focus:ring-gold-deep font-bold text-[10px]"
                      value={quickQuoteTitle}
                      onChange={(e) => setQuickQuoteTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/30">Event Date (Optional)</label>
                    <div className="relative">
                      <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 text-black/20" size={12} />
                      <input 
                        type="date"
                        className="w-full pl-7 pr-2 py-1.5 bg-white border border-black/5 rounded-lg outline-none focus:ring-1 focus:ring-gold-deep font-bold text-[10px]"
                        value={quickQuoteDate}
                        onChange={(e) => setQuickQuoteDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 animate-in fade-in duration-300">
                  <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/30">Event</label>
                  <select 
                    disabled={!selectedClientId}
                    className={cn(
                      "w-full px-2 py-1.5 bg-white border border-black/5 rounded-lg outline-none focus:ring-1 focus:ring-gold-deep font-bold text-[10px]",
                      !selectedClientId && "opacity-50"
                    )}
                    value={selectedEventId || ''}
                    onChange={(e) => setSelectedEventId(Number(e.target.value))}
                  >
                    <option value="">Select event...</option>
                    {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex flex-row md:flex-col justify-between items-center md:items-end gap-3">
              <div className="shrink-0">
                <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/30 block mb-1">Strategy</label>
                <div className="flex bg-white p-0.5 border border-black/5 w-fit rounded-lg">
                  <button 
                    onClick={() => setPriceMode('client')}
                    className={cn(
                      "px-3 py-1 text-[8px] font-black uppercase tracking-widest transition-all rounded-md", 
                      priceMode === 'client' ? "text-white" : "text-black/40 hover:text-black"
                    )}
                    style={priceMode === 'client' ? { backgroundColor: settings?.brandColors?.primary || '#000000' } : {}}
                  >
                    Client
                  </button>
                  <button 
                    onClick={() => setPriceMode('supplier')}
                    className={cn(
                      "px-3 py-1 text-[8px] font-black uppercase tracking-widest transition-all rounded-md", 
                      priceMode === 'supplier' ? "text-white" : "text-black/40 hover:text-black"
                    )}
                    style={priceMode === 'supplier' ? { backgroundColor: settings?.brandColors?.primary || '#000000' } : {}}
                  >
                    Supplier
                  </button>
                </div>
              </div>
              <div 
                className="p-2 md:p-3 border rounded-lg flex items-center gap-2"
                style={{ 
                  backgroundColor: `${settings?.brandColors?.secondary || '#D4AF37'}1A`,
                  borderColor: `${settings?.brandColors?.secondary || '#D4AF37'}33`
                }}
              >
                <Info size={10} style={{ color: settings?.brandColors?.secondary || '#D4AF37' }} className="shrink-0" />
                <p 
                  className="text-[8px] font-black uppercase tracking-widest"
                  style={{ color: settings?.brandColors?.secondary || '#D4AF37' }}
                >
                  {priceMode}
                </p>
              </div>
            </div>
          </div>

          {/* Line Items Container */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="bg-white border border-black/5 shadow-sm flex flex-col h-full rounded-xl overflow-hidden">
              <div className="p-4 md:p-8 border-b border-black/5 flex items-center justify-between shrink-0">
                <h3 className="text-[9px] md:text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
                  <Calculator size={12} style={{ color: settings?.brandColors?.secondary || '#D4AF37' }} />
                  Items
                </h3>
                <button 
                  onClick={() => setIsItemFinderOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-white rounded-lg font-bold text-[8px] md:text-[10px] uppercase tracking-widest hover:opacity-90 transition-all"
                  style={{ backgroundColor: settings?.brandColors?.primary || '#000000' }}
                >
                  <Plus size={12} /> Catalog
                </button>
              </div>

              {/* Line Items: Mobile Card List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="md:hidden divide-y divide-gray-50">
                  {lineItems.map((item, i) => (
                    <div key={i} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center border border-black/5 shrink-0">
                            <Package size={14} className="text-black/10" />
                          </div>
                          <div className="min-w-0">
                            <input 
                              value={item.name} 
                              onChange={(e) => updateLineItem(i, 'name', e.target.value)}
                              className="text-xs font-black bg-transparent border-none p-0 outline-none w-full focus:text-gold-deep truncate"
                            />
                            <p className="text-[8px] text-gray-400 uppercase tracking-widest font-bold">{item.category}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeLineItem(i)}
                          className="p-1.5 text-gray-300 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-[7px] uppercase font-black text-gray-300 tracking-tighter">Qty</label>
                          <input 
                            type="number"
                            value={item.quantity} 
                            onChange={(e) => updateLineItem(i, 'quantity', Number(e.target.value))}
                            className="w-full bg-gray-50 rounded-lg p-1.5 text-[10px] font-bold text-center outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[7px] uppercase font-black text-gray-300 tracking-tighter">Rate</label>
                          <input 
                            type="number"
                            value={item.unitPrice} 
                            onChange={(e) => updateLineItem(i, 'unitPrice', Number(e.target.value))}
                            className="w-full bg-gray-50 rounded-lg p-1.5 text-[10px] font-bold text-center outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[7px] uppercase font-black text-gray-300 tracking-tighter">Disc%</label>
                          <input 
                            type="number"
                            value={item.discount} 
                            onChange={(e) => updateLineItem(i, 'discount', Number(e.target.value))}
                            className="w-full bg-gray-50 rounded-lg p-1.5 text-[10px] font-bold text-center outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center bg-bg-base/50 p-2 rounded-lg">
                        <span className="text-[8px] font-black uppercase text-gray-400">Item Total</span>
                        <span className="text-xs font-black text-black">
                          {formatCurrency(item.quantity * item.unitPrice * (1 - item.discount/100))}
                        </span>
                      </div>
                    </div>
                  ))}
                  {lineItems.length === 0 && (
                    <div className="py-20 text-center opacity-20 italic text-[10px] uppercase tracking-widest">
                      Awaiting Selection
                    </div>
                  )}
                </div>

                {/* Desktop Table View */}
                <table className="hidden md:table w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-bg-base/30">
                      <th className="px-8 py-4 text-[9px] uppercase tracking-[0.3em] font-bold text-black/40 border-b border-black/5 w-16">Icon</th>
                      <th className="px-8 py-4 text-[9px] uppercase tracking-[0.3em] font-bold text-black/40 border-b border-black/5">Item Detail</th>
                      <th className="px-8 py-4 text-[9px] uppercase tracking-[0.3em] font-bold text-black/40 border-b border-black/5 w-24 text-center">Qty</th>
                      <th className="px-8 py-4 text-[9px] uppercase tracking-[0.3em] font-bold text-black/40 border-b border-black/5 w-32 text-right">Rate</th>
                      <th className="px-8 py-4 text-[9px] uppercase tracking-[0.3em] font-bold text-black/40 border-b border-black/5 w-24 text-center">Disc%</th>
                      <th className="px-8 py-4 text-[9px] uppercase tracking-[0.3em] font-bold text-black/40 border-b border-black/5 text-right w-36">Total</th>
                      <th className="px-8 py-4 text-[9px] uppercase tracking-[0.3em] font-bold text-black/40 border-b border-black/5 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {lineItems.map((item, i) => {
                      const catalogItem = catalogItems.find(ci => ci.id === item.itemId);
                      return (
                        <tr key={i} className="hover:bg-bg-base/30 group transition-colors">
                          <td className="px-8 py-6">
                            <div className="w-12 h-12 rounded bg-gray-50 flex items-center justify-center overflow-hidden border border-black/5">
                              {catalogItem?.imageUrl ? (
                                <img src={catalogItem.imageUrl} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <Package size={16} className="text-black/10" />
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <input 
                              value={item.name} 
                              onChange={(e) => updateLineItem(i, 'name', e.target.value)}
                              className="text-sm font-bold bg-transparent border-none p-0 outline-none w-full focus:text-gold-deep"
                            />
                            <input 
                              value={item.description} 
                              onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                              className="text-[10px] text-black/40 uppercase tracking-widest bg-transparent border-none p-0 outline-none w-full block mt-1 focus:text-black"
                              placeholder="Brief summary..."
                            />
                          </td>
                          <td className="px-8 py-6">
                          <input 
                            type="number"
                            value={item.quantity} 
                            onChange={(e) => updateLineItem(i, 'quantity', Number(e.target.value))}
                            className="text-xs font-bold bg-bg-base/50 border border-black/5 p-2 outline-none w-full text-center"
                          />
                        </td>
                        <td className="px-8 py-6">
                          <input 
                            type="number"
                            value={item.unitPrice} 
                            onChange={(e) => updateLineItem(i, 'unitPrice', Number(e.target.value))}
                            className="text-xs font-bold bg-bg-base/50 border border-black/5 p-2 outline-none w-full text-right"
                          />
                        </td>
                        <td className="px-8 py-6">
                          <input 
                            type="number"
                            value={item.discount} 
                            onChange={(e) => updateLineItem(i, 'discount', Number(e.target.value))}
                            className="text-xs font-bold bg-bg-base/50 border border-black/5 p-2 outline-none w-full text-center"
                          />
                        </td>
                        <td className="px-8 py-6 text-right font-serif text-lg tracking-tight">
                          {formatCurrency(item.quantity * item.unitPrice * (1 - item.discount/100))}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button 
                            onClick={() => removeLineItem(i)}
                            className="p-2 text-black/20 hover:text-red-500 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Totals & Summary Panel */}
        <div className="xl:col-span-1">
          <div className="bg-white p-5 md:p-8 border border-black/5 shadow-xl flex flex-col rounded-xl">
              <h3 
                className="text-[8px] font-black uppercase tracking-[0.3em] mb-4 border-b pb-2"
                style={{ 
                  color: settings?.brandColors?.secondary || '#D4AF37',
                  borderColor: `${settings?.brandColors?.secondary || '#D4AF37'}33`
                }}
              >
                Financials
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                  <span>Gross</span>
                  <span className="text-black">{formatCurrency(totals.subtotal)}</span>
                </div>
                
                <div className="pb-3 border-b border-black/5 space-y-1.5">
                  <div className="flex justify-between items-center text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    <span>Rebate (%)</span>
                    <input 
                      type="number"
                      value={globalDiscount}
                      onChange={(e) => setGlobalDiscount(Number(e.target.value))}
                      className="w-10 bg-gray-50 border-none px-1.5 py-1 text-right text-[10px] font-black outline-none rounded-md"
                    />
                  </div>
                  {totals.discountAmount > 0 && (
                     <div className="flex justify-between items-center text-[8px] text-red-500 font-bold uppercase tracking-widest">
                      <span>Adjustment</span>
                      <span>-{formatCurrency(totals.discountAmount)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                  <span>Tax ({taxRate}%)</span>
                  <span className="text-black">{formatCurrency(totals.taxTotal)}</span>
                </div>

                <div className="pt-3 flex justify-between items-end">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-black">Total</span>
                  <span className="text-xl font-black leading-none" style={{ color: settings?.brandColors?.secondary || '#D4AF37' }}>{formatCurrency(totals.grandTotal)}</span>
                </div>

                <div className="p-3 bg-bg-base border border-black/5 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black uppercase tracking-widest text-black/30">Deposit</span>
                    <input 
                      type="number"
                      value={depositRequired}
                      onChange={(e) => setDepositRequired(Number(e.target.value))}
                      className="w-16 bg-white border border-black/10 px-1.5 py-1 text-right text-[10px] font-black outline-none rounded-md"
                    />
                  </div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-black/10">
                    <span className="text-[7px] font-black uppercase tracking-widest text-black/30">Balance</span>
                    <span className="text-[10px] font-black">{formatCurrency(totals.balanceAfterDeposit)}</span>
                  </div>
                </div>
              </div>

            <div className="pt-4 flex flex-col gap-1.5">
              {isQuickQuote ? (
                <>
                  <button 
                    onClick={() => handleSave(DocumentStatus.CREATED, true)}
                    style={{ backgroundColor: settings?.brandColors?.secondary || '#D4AF37' }}
                    className="w-full py-3 text-white font-black text-[9px] uppercase tracking-widest rounded-lg shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Calendar size={12} />
                    Schedule Event & Save
                  </button>
                  <button 
                    onClick={() => handleSave(DocumentStatus.CREATED, false)}
                    style={{ backgroundColor: settings?.brandColors?.primary || '#000000' }}
                    className="w-full py-3 text-white font-black text-[9px] uppercase tracking-widest rounded-lg shadow-lg active:scale-[0.98] transition-all"
                  >
                    Create and Save Quotation
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => handleSave(DocumentStatus.CREATED)}
                    style={{ backgroundColor: settings?.brandColors?.primary || '#000000' }}
                    className="w-full py-3 text-white font-black text-[9px] uppercase tracking-widest rounded-lg shadow-lg active:scale-[0.98] transition-all"
                  >
                    Create Proposal
                  </button>
                  <button 
                    onClick={() => handleSave(DocumentStatus.DRAFT)}
                    style={{ borderColor: settings?.brandColors?.primary || '#000000', color: settings?.brandColors?.primary || '#000000' }}
                    className="w-full py-2.5 border font-black text-[9px] uppercase tracking-widest rounded-lg"
                  >
                    Draft
                  </button>
                </>
              )}
              <button 
                onClick={onClose}
                className="w-full py-1 text-black/30 font-black uppercase tracking-widest text-[7px] active:text-red-500"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Item Finder Modal */}
      <Modal isOpen={isItemFinderOpen} onClose={() => setIsItemFinderOpen(false)} title="Add Items" size="lg">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
            <input 
              type="text" 
              placeholder="Search catalog..." 
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1 pb-4">
            {catalogItems.map(item => (
              <div 
                key={item.id} 
                onClick={() => handleAddLineItem(item)}
                className="p-3 border border-gray-100 rounded-2xl active:border-black active:bg-gray-50 cursor-pointer transition-all flex items-center gap-3 group"
              >
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-300 shrink-0 overflow-hidden border border-gray-100">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <Package size={16} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black truncate">{item.name}</p>
                  <p className="text-[8px] text-gray-400 uppercase tracking-widest font-bold">{item.category}</p>
                  <p className="text-[10px] font-black text-black mt-0.5">{formatCurrency(priceMode === 'client' ? item.clientPrice : item.supplierPrice)}</p>
                </div>
                <Plus size={16} className="text-gray-200" />
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </Modal>
  );
}
