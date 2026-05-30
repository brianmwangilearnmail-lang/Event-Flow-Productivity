import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Zap,
  Plus,
  Trash2,
  Search,
  Package,
  Users,
  UserPlus,
  FileText,
  ChevronRight,
  Send,
  Save,
  Receipt,
  Calendar,
} from 'lucide-react';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { supabase } from '../lib/supabase';
import { logActivity } from '../db';
import {
  Client,
  CatalogItem,
  DocumentStatus,
  QuotationLineItem,
  ClientStatus,
  Quotation,
} from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';

interface QuickInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  optimisticInsert?: (item: any) => void;
}

export default function QuickInvoiceModal({
  isOpen,
  onClose,
  optimisticInsert,
}: QuickInvoiceModalProps) {
  const { settings } = useSettings();
  const { success: toastSuccess, error: toastError } = useToast();

  // Client mode
  const [isExistingClient, setIsExistingClient] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientSearch, setClientSearch] = useState('');

  // Temp client fields
  const [tempName, setTempName] = useState('');
  const [tempPhone, setTempPhone] = useState('');
  const [tempEmail, setTempEmail] = useState('');

  // Invoice fields
  const [lineItems, setLineItems] = useState<QuotationLineItem[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [invoiceType, setInvoiceType] = useState<'Deposit' | 'Interim' | 'Final' | 'Full'>('Full');

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [showCatalog, setShowCatalog] = useState(false);
  const [showQuotationPicker, setShowQuotationPicker] = useState(false);
  const catalogRef = useRef<HTMLDivElement>(null);

  const { data: clients = [] } = useSupabaseQuery<Client>(
    'clients',
    (q) => q.select('*').order('fullName'),
    []
  );

  const { data: catalogItems = [] } = useSupabaseQuery<CatalogItem>(
    'catalog',
    (q) => q.select('*').eq('isArchived', false).order('name'),
    []
  );

  const { data: quotations = [] } = useSupabaseQuery<Quotation>(
    'quotations',
    (q) => {
      if (selectedClientId) {
        return q
          .select('*')
          .eq('clientId', selectedClientId)
          .order('id', { ascending: false });
      }
      return q.select('*').limit(0);
    },
    [selectedClientId]
  );

  // Reset all state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsExistingClient(true);
      setSelectedClientId(null);
      setClientSearch('');
      setTempName('');
      setTempPhone('');
      setTempEmail('');
      setLineItems([]);
      setDueDate('');
      setNotes('');
      setInvoiceType('Full');
      setShowCatalog(false);
      setShowQuotationPicker(false);
    } else {
      // Default due date: 7 days from today
      const d = new Date();
      d.setDate(d.getDate() + 7);
      setDueDate(d.toISOString().split('T')[0]);
    }
  }, [isOpen]);

  // Close catalog on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catalogRef.current && !catalogRef.current.contains(e.target as Node)) {
        setShowCatalog(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice * (1 - item.discount / 100),
      0
    );
    return { subtotal, grandTotal: subtotal };
  }, [lineItems]);

  const filteredClients = useMemo(() => {
    const s = clientSearch.toLowerCase();
    return clients.filter(
      (c) =>
        c.fullName.toLowerCase().includes(s) ||
        (c.phone || '').includes(clientSearch) ||
        (c.email || '').toLowerCase().includes(s)
    );
  }, [clients, clientSearch]);

  const filteredCatalog = useMemo(() => {
    const s = catalogSearch.toLowerCase();
    return catalogItems.filter(
      (i) =>
        i.name.toLowerCase().includes(s) ||
        (i.category || '').toLowerCase().includes(s)
    );
  }, [catalogItems, catalogSearch]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) || null,
    [clients, selectedClientId]
  );

  const addFromCatalog = (item: CatalogItem) => {
    setLineItems((prev) => [
      ...prev,
      {
        itemId: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        quantity: 1,
        unit: item.unit,
        unitPrice: item.clientPrice,
        discount: 0,
      },
    ]);
    setShowCatalog(false);
    setCatalogSearch('');
  };

  const addFromQuotation = (q: Quotation) => {
    setLineItems((prev) => [...prev, ...q.items]);
    setShowQuotationPicker(false);
  };

  const addManualItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        name: '',
        description: '',
        category: 'General',
        quantity: 1,
        unit: 'pcs',
        unitPrice: 0,
        discount: 0,
      },
    ]);
  };

  const updateItem = (index: number, field: keyof QuotationLineItem, value: any) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (status: DocumentStatus) => {
    if (isSaving) return;

    // Validate client
    let finalClientId = selectedClientId;
    if (!isExistingClient) {
      if (!tempName.trim()) {
        toastError('Please enter a client name');
        return;
      }
      // Create temp client
      const { data: created, error: clientErr } = await supabase
        .from('clients')
        .insert({
          fullName: tempName.trim(),
          phone: tempPhone.trim() || 'no-phone',
          email: tempEmail.trim() || 'no-email@temporary.com',
          address: 'Temporary Address',
          communicationChannel: 'Email',
          tags: ['temporary'],
          notes: 'Created via Quick Invoice',
          status: ClientStatus.NEW_INQUIRY,
          assignedStaff: settings?.adminName || 'Admin',
        })
        .select()
        .single();

      if (clientErr) {
        toastError('Error creating client: ' + clientErr.message);
        return;
      }
      finalClientId = created.id;
    } else {
      if (!finalClientId) {
        toastError('Please select a client');
        return;
      }
    }

    if (lineItems.length === 0) {
      toastError('Please add at least one item');
      return;
    }

    setIsSaving(true);

    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const today = new Date().toISOString().split('T')[0];

    const invoiceData = {
      clientId: finalClientId,
      number: invoiceNumber,
      type: invoiceType,
      issueDate: today,
      dueDate: dueDate || today,
      status,
      items: lineItems,
      subtotal: totals.subtotal,
      taxTotal: 0,
      discountTotal: 0,
      amountPaid: 0,
      grandTotal: totals.grandTotal,
      notes: notes.trim(),
    };

    // Optimistic insert
    if (optimisticInsert) {
      optimisticInsert({
        id: -Date.now(),
        ...invoiceData,
        clients: isExistingClient ? selectedClient : { fullName: tempName },
        events: null,
      });
    }
    onClose();

    const { data: result, error } = await supabase
      .from('invoices')
      .insert(invoiceData)
      .select();

    if (error) {
      toastError('Error saving invoice: ' + error.message);
      setIsSaving(false);
      return;
    }

    const invoiceId = result[0].id;
    await logActivity(
      finalClientId!,
      'Invoice Created',
      `Quick Invoice #${invoiceNumber} created for ${formatCurrency(totals.grandTotal)}`,
      invoiceId,
      'Invoice'
    );

    toastSuccess(`Invoice #${invoiceNumber} created successfully!`);
    setIsSaving(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-5 border-b border-black/5"
              style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-yellow-400/10 flex items-center justify-center">
                  <Zap size={18} className="text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-white font-black text-sm tracking-tight">Quick Invoice</h2>
                  <p className="text-white/40 text-[10px] uppercase tracking-widest">
                    Fast · Simple · No event required
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">

                {/* ── CLIENT SECTION ── */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40">
                      Client
                    </h3>
                    {/* Toggle */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
                      <button
                        onClick={() => { setIsExistingClient(true); setSelectedClientId(null); setClientSearch(''); }}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all',
                          isExistingClient
                            ? 'bg-white text-black shadow-sm'
                            : 'text-black/40 hover:text-black'
                        )}
                      >
                        <Users size={11} /> Existing
                      </button>
                      <button
                        onClick={() => { setIsExistingClient(false); setSelectedClientId(null); }}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all',
                          !isExistingClient
                            ? 'bg-white text-black shadow-sm'
                            : 'text-black/40 hover:text-black'
                        )}
                      >
                        <UserPlus size={11} /> New
                      </button>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {isExistingClient ? (
                      <motion.div
                        key="existing"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-2"
                      >
                        {/* Search */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/20" size={14} />
                          <input
                            type="text"
                            placeholder="Search by name, phone or email…"
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-black/20 transition-colors"
                          />
                        </div>
                        {/* Client list */}
                        <div className="max-h-44 overflow-y-auto rounded-xl border border-black/5 divide-y divide-black/5">
                          {filteredClients.length === 0 ? (
                            <p className="py-6 text-center text-[10px] uppercase tracking-widest text-black/20 font-black">
                              No clients found
                            </p>
                          ) : (
                            filteredClients.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => { setSelectedClientId(c.id!); setClientSearch(''); }}
                                className={cn(
                                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                                  selectedClientId === c.id
                                    ? 'bg-black text-white'
                                    : 'bg-white hover:bg-gray-50'
                                )}
                              >
                                <div
                                  className={cn(
                                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-black',
                                    selectedClientId === c.id ? 'bg-white/10 text-white' : 'bg-gray-100 text-black/40'
                                  )}
                                >
                                  {c.fullName.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className={cn('text-xs font-black truncate', selectedClientId === c.id ? 'text-white' : 'text-black')}>
                                    {c.fullName}
                                  </p>
                                  <p className={cn('text-[9px] uppercase tracking-widest truncate', selectedClientId === c.id ? 'text-white/50' : 'text-black/30')}>
                                    {c.phone}
                                  </p>
                                </div>
                                {selectedClientId === c.id && (
                                  <div className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center shrink-0">
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                      <polyline points="1.5,5 4,7.5 8.5,2.5" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </div>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                        {selectedClient && (
                          <div
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold"
                            style={{ backgroundColor: `${settings?.brandColors?.secondary || '#D4AF37'}15`, color: settings?.brandColors?.secondary || '#D4AF37' }}
                          >
                            <Users size={12} />
                            <span>{selectedClient.fullName} selected</span>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="temp"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-3"
                      >
                        <div className="bg-yellow-50 border border-yellow-200/60 rounded-xl px-4 py-3">
                          <p className="text-[9px] font-black uppercase tracking-widest text-yellow-700">
                            ⚡ Temporary client — can be promoted to full record later
                          </p>
                        </div>
                        <input
                          type="text"
                          placeholder="Client Name *"
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-black/20 transition-colors"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="tel"
                            placeholder="Phone (optional)"
                            value={tempPhone}
                            onChange={(e) => setTempPhone(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-black/20 transition-colors"
                          />
                          <input
                            type="email"
                            placeholder="Email (optional)"
                            value={tempEmail}
                            onChange={(e) => setTempEmail(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-black/20 transition-colors"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>

                <div className="border-t border-black/5" />

                {/* ── INVOICE META ── */}
                <section className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40">
                    Invoice Details
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-black/30 mb-1.5">
                        Invoice Type
                      </label>
                      <select
                        value={invoiceType}
                        onChange={(e) => setInvoiceType(e.target.value as any)}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-black/20 appearance-none"
                      >
                        <option value="Full">Full</option>
                        <option value="Deposit">Deposit</option>
                        <option value="Interim">Interim</option>
                        <option value="Final">Final</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-black/30 mb-1.5">
                        <span className="flex items-center gap-1"><Calendar size={10} /> Due Date</span>
                      </label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-black/20"
                      />
                    </div>
                  </div>
                </section>

                <div className="border-t border-black/5" />

                {/* ── LINE ITEMS ── */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40">
                      Items
                    </h3>
                    <div className="flex items-center gap-2">
                      {/* From Quotation — only if existing client selected */}
                      {isExistingClient && selectedClientId && (
                        <button
                          onClick={() => setShowQuotationPicker(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-black/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-black/50 hover:text-black hover:border-black transition-all"
                        >
                          <FileText size={11} /> From Quote
                        </button>
                      )}
                      {/* Add from catalog */}
                      <div className="relative" ref={catalogRef}>
                        <button
                          onClick={() => setShowCatalog((v) => !v)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-black/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-black/50 hover:text-black hover:border-black transition-all"
                        >
                          <Package size={11} /> Catalog
                        </button>
                        <AnimatePresence>
                          {showCatalog && (
                            <motion.div
                              initial={{ opacity: 0, y: 4, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 4, scale: 0.97 }}
                              transition={{ duration: 0.12 }}
                              className="absolute right-0 top-full mt-2 w-72 bg-white border border-black/10 rounded-2xl shadow-2xl shadow-black/10 z-20 overflow-hidden"
                            >
                              <div className="p-3 border-b border-black/5">
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/20" size={13} />
                                  <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search catalog…"
                                    value={catalogSearch}
                                    onChange={(e) => setCatalogSearch(e.target.value)}
                                    className="w-full pl-8 pr-3 py-2 bg-gray-50 rounded-lg text-xs font-bold outline-none"
                                  />
                                </div>
                              </div>
                              <div className="max-h-56 overflow-y-auto">
                                {filteredCatalog.length === 0 ? (
                                  <p className="py-6 text-center text-[9px] uppercase tracking-widest text-black/20 font-black">
                                    No items
                                  </p>
                                ) : (
                                  filteredCatalog.map((item) => (
                                    <button
                                      key={item.id}
                                      onClick={() => addFromCatalog(item)}
                                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-black/5 last:border-0"
                                    >
                                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                        <Package size={14} className="text-black/20" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black truncate">{item.name}</p>
                                        <p className="text-[9px] text-black/30 uppercase tracking-widest">
                                          {formatCurrency(item.clientPrice)} / {item.unit}
                                        </p>
                                      </div>
                                      <Plus size={14} className="text-black/20 shrink-0" />
                                    </button>
                                  ))
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      {/* Manual add */}
                      <button
                        onClick={addManualItem}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-black/80 transition-all"
                      >
                        <Plus size={11} /> Manual
                      </button>
                    </div>
                  </div>

                  {/* Items table */}
                  <div className="border border-black/5 rounded-2xl overflow-hidden">
                    {lineItems.length === 0 ? (
                      <div className="py-10 text-center">
                        <Receipt size={24} className="mx-auto text-black/10 mb-3" />
                        <p className="text-[9px] uppercase tracking-widest font-black text-black/20">
                          No items added yet
                        </p>
                        <p className="text-[9px] text-black/20 mt-1">Use Catalog, From Quote, or Manual above</p>
                      </div>
                    ) : (
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-gray-50/80">
                            <th className="px-4 py-2.5 text-[8px] font-black uppercase tracking-widest text-black/30">Item</th>
                            <th className="px-2 py-2.5 text-[8px] font-black uppercase tracking-widest text-black/30 text-center w-16">Qty</th>
                            <th className="px-2 py-2.5 text-[8px] font-black uppercase tracking-widest text-black/30 text-right w-24">Rate</th>
                            <th className="px-2 py-2.5 text-[8px] font-black uppercase tracking-widest text-black/30 text-right w-20">Total</th>
                            <th className="w-8" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5">
                          {lineItems.map((item, i) => (
                            <tr key={i} className="group hover:bg-gray-50/50">
                              <td className="px-4 py-2.5">
                                <input
                                  value={item.name}
                                  onChange={(e) => updateItem(i, 'name', e.target.value)}
                                  placeholder="Item name…"
                                  className="text-xs font-bold bg-transparent border-none p-0 outline-none w-full placeholder:text-black/20"
                                />
                              </td>
                              <td className="px-2 py-2.5">
                                <input
                                  type="number"
                                  min={1}
                                  value={item.quantity}
                                  onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))}
                                  className="text-xs font-bold bg-gray-100 border-none rounded-md p-1 outline-none w-full text-center"
                                />
                              </td>
                              <td className="px-2 py-2.5 text-right">
                                <input
                                  type="number"
                                  min={0}
                                  value={item.unitPrice}
                                  onChange={(e) => updateItem(i, 'unitPrice', Number(e.target.value))}
                                  className="text-xs font-bold bg-gray-100 border-none rounded-md p-1 outline-none w-full text-right"
                                />
                              </td>
                              <td className="px-2 py-2.5 text-right text-xs font-black text-black/70">
                                {formatCurrency(item.quantity * item.unitPrice * (1 - item.discount / 100))}
                              </td>
                              <td className="pr-2 py-2.5 text-right">
                                <button
                                  onClick={() => removeItem(i)}
                                  className="opacity-0 group-hover:opacity-100 text-black/20 hover:text-red-500 transition-all"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50/60 border-t border-black/5">
                          <tr>
                            <td colSpan={3} className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-black/40">
                              Grand Total
                            </td>
                            <td className="px-2 py-3 text-right text-sm font-black text-black">
                              {formatCurrency(totals.grandTotal)}
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>
                </section>

                <div className="border-t border-black/5" />

                {/* ── NOTES ── */}
                <section className="space-y-2">
                  <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-black/40">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Payment instructions, terms, remarks…"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-black/20 resize-none transition-colors placeholder:text-black/20"
                  />
                </section>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="border-t border-black/5 px-6 py-4 bg-white/90 backdrop-blur-sm flex gap-3">
              <button
                onClick={() => handleSave(DocumentStatus.DRAFT)}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-3 border border-black/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-black/60 hover:text-black hover:border-black transition-all disabled:opacity-40"
              >
                <Save size={13} />
                Save Draft
              </button>
              <button
                onClick={() => handleSave(DocumentStatus.SENT)}
                disabled={isSaving}
                style={{ backgroundColor: settings?.brandColors?.primary || '#000000' }}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-black/10 disabled:opacity-40"
              >
                <Send size={13} />
                {isSaving ? 'Saving…' : 'Send Invoice'}
              </button>
            </div>

            {/* Quotation Picker overlay */}
            <AnimatePresence>
              {showQuotationPicker && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white z-30 flex flex-col"
                >
                  <div className="flex items-center justify-between px-6 py-4 border-b border-black/5">
                    <h3 className="text-sm font-black">Import from Quotation</h3>
                    <button
                      onClick={() => setShowQuotationPicker(false)}
                      className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-black/40 transition-all"
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {quotations.length === 0 ? (
                      <div className="py-16 text-center">
                        <FileText size={24} className="mx-auto text-black/10 mb-3" />
                        <p className="text-[9px] uppercase tracking-widest font-black text-black/20">
                          No quotations found for this client
                        </p>
                      </div>
                    ) : (
                      quotations.map((q) => (
                        <button
                          key={q.id}
                          onClick={() => addFromQuotation(q)}
                          className="w-full flex items-center gap-4 p-4 border border-black/5 rounded-xl hover:border-black transition-all text-left group"
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: `${settings?.brandColors?.secondary || '#D4AF37'}15`,
                              color: settings?.brandColors?.secondary || '#D4AF37',
                            }}
                          >
                            <FileText size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black uppercase tracking-tight">#{q.number}</p>
                            <p className="text-[9px] font-bold text-black/30 uppercase tracking-widest">
                              {q.status} · {q.items.length} items
                            </p>
                            <p className="text-sm font-black text-black mt-0.5">
                              {formatCurrency(q.grandTotal, q.currency)}
                            </p>
                          </div>
                          <ChevronRight size={16} className="text-black/10 group-hover:text-black transition-colors" />
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
