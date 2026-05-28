import React, { useRef } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Download, Printer, FileText, Mail } from 'lucide-react';
import { Quotation, Invoice, Receipt, BusinessSettings } from '../types';
import { formatCurrency } from '../lib/utils';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { supabase } from '../lib/supabase';
import { useSettings } from '../context/SettingsContext';

interface DocumentGeneratorProps {
  type: 'Quotation' | 'Invoice' | 'Receipt';
  data: Quotation | Invoice | Receipt;
  onClose: () => void;
}

export default function DocumentGenerator({ type, data, onClose }: DocumentGeneratorProps) {
  const documentRef = useRef<HTMLDivElement>(null);
  const { settings: rawSettings } = useSettings();
  const settings = rawSettings || {
    name: 'EventFlow Business',
    address: 'Business Address Not Set',
    phone: 'Phone Not Set',
    email: 'Email Not Set',
    paymentInstructions: 'Please contact us for payment instructions.',
    terms: 'Standard terms and conditions apply.',
    footerText: 'Thank you for your business.',
    documentFont: 'Inter, sans-serif'
  };

  const { data: clientList = [], loading: loadingClient } = useSupabaseQuery<any>('clients', (q) => q.select('*').eq('id', data.clientId), [data.clientId]);
  const client = clientList[0];

  const eventId = (data as any).eventId;
  const { data: eventList = [] } = useSupabaseQuery<any>('events', (q) => {
    if (eventId) return q.select('*').eq('id', eventId);
    return q.select('*').limit(0);
  }, [eventId]);
  const event = eventList[0];

  const [editableData, setEditableData] = React.useState<any>(data);
  const [editableSettings, setEditableSettings] = React.useState<any>(settings);
  const [editableClient, setEditableClient] = React.useState<any>(null);
  const [editableEvent, setEditableEvent] = React.useState<any>(null);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // Editable Items and Transport/Labour
  const [lineItems, setLineItems] = React.useState<any[]>([]);
  const [transportPrice, setTransportPrice] = React.useState(0);
  const [laborPrice, setLaborPrice] = React.useState(0);
  const [laborStaffCount, setLaborStaffCount] = React.useState(0);
  const [laborCost, setLaborCost] = React.useState(0);

  React.useEffect(() => {
    if (data) {
      setEditableData(data);
      if (type === 'Quotation') {
        const rawItems = (data as Quotation).items || [];
        const transportItem = rawItems.find(item => item.category === 'Transport');
        const laborItem = rawItems.find(item => item.category === 'Labour');
        
        setTransportPrice(transportItem ? transportItem.unitPrice : 0);
        setLaborPrice(laborItem ? laborItem.unitPrice : 0);
        setLaborStaffCount(laborItem ? laborItem.quantity : 0);
        setLaborCost(laborItem ? (laborItem.quantity > 0 && laborItem.unitPrice > 0 ? laborItem.quantity * laborItem.unitPrice : laborItem.unitPrice) : 0);
        
        const filteredItems = rawItems.filter(
          item => item.category !== 'Transport' && item.category !== 'Labour'
        );
        setLineItems(filteredItems);
      } else {
        setLineItems((data as any).items || []);
      }
    }
  }, [data, type]);

  React.useEffect(() => {
    setEditableSettings(settings);
  }, [rawSettings]); // Use rawSettings to detect changes from context

  React.useEffect(() => {
    if (client) setEditableClient(client);
  }, [client]);

  React.useEffect(() => {
    if (event) setEditableEvent(event);
  }, [event]);

  const [invoice, setInvoice] = React.useState<any>(null);
  React.useEffect(() => {
    const fetchInvoice = async () => {
      if (type === 'Receipt' && (data as any).paymentId) {
        const { data: payment } = await supabase.from('payments').select('invoiceIds').eq('id', (data as any).paymentId).single();
        if (payment?.invoiceIds?.length > 0) {
          const { data: inv } = await supabase.from('invoices').select('*').eq('id', payment.invoiceIds[0]).single();
          setInvoice(inv);
        }
      }
    };
    fetchInvoice();
  }, [type, (data as any).paymentId]);

  const totals = React.useMemo(() => {
    if (type === 'Quotation') {
      const itemsSubtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (1 - (item.discount || 0)/100)), 0);
      const transportCost = transportPrice;
      const subtotal = itemsSubtotal + transportCost + laborCost;
      
      const globalDiscount = editableData.globalDiscount || 0;
      const discountAmount = subtotal * (globalDiscount / 100);
      const subtotalAfterDiscount = subtotal - discountAmount;
      
      const taxRate = editableData.taxRate !== undefined ? editableData.taxRate : (rawSettings?.taxRate || 0);
      const taxTotal = subtotalAfterDiscount * (taxRate / 100);
      const grandTotal = subtotalAfterDiscount + taxTotal;
      
      return {
        subtotal,
        discountAmount,
        taxTotal,
        grandTotal,
        taxRate
      };
    } else {
      const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (1 - (item.discount || 0)/100)), 0);
      const grandTotal = subtotal;
      return {
        subtotal,
        discountAmount: 0,
        taxTotal: 0,
        grandTotal,
        taxRate: 0
      };
    }
  }, [type, lineItems, transportPrice, laborCost, editableData.globalDiscount, editableData.taxRate, rawSettings?.taxRate]);

  const handleUpdate = (type: 'data' | 'settings' | 'client' | 'event', field: string, value: any) => {
    setHasChanges(true);
    if (type === 'data') setEditableData({ ...editableData, [field]: value });
    if (type === 'settings') setEditableSettings({ ...editableSettings, [field]: value });
    if (type === 'client') setEditableClient({ ...editableClient, [field]: value });
    if (type === 'event') setEditableEvent({ ...editableEvent, [field]: value });
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      // 1. Save Document Meta
      const table = type === 'Quotation' ? 'quotations' : type === 'Invoice' ? 'invoices' : 'receipts';
      const docUpdate: any = {
        number: editableData.number,
        date: editableData.date || editableData.issueDate,
      };
      if (type === 'Invoice') docUpdate.issueDate = editableData.date || editableData.issueDate;
      
      if (type === 'Quotation') {
        const finalItems = [...lineItems];
        if (transportPrice > 0) {
          finalItems.push({
            name: 'Transport Fee',
            description: 'Transport & Logistics charges',
            category: 'Transport',
            quantity: 1,
            unit: 'Trip',
            unitPrice: transportPrice,
            discount: 0
          });
        }
        if (laborCost > 0) {
          const hasStaffDetails = laborStaffCount > 0 && laborPrice > 0 && (laborPrice * laborStaffCount === laborCost);
          finalItems.push({
            name: 'Labour charges',
            description: hasStaffDetails 
              ? `Labour for ${laborStaffCount} staff members`
              : 'Labour charges (Estimated)',
            category: 'Labour',
            quantity: hasStaffDetails ? laborStaffCount : 1,
            unit: hasStaffDetails ? 'Pax' : 'Flat',
            unitPrice: hasStaffDetails ? laborPrice : laborCost,
            discount: 0
          });
        }
        
        docUpdate.items = finalItems;
        docUpdate.subtotal = totals.subtotal;
        docUpdate.discountTotal = totals.discountAmount;
        docUpdate.globalDiscount = editableData.globalDiscount || 0;
        docUpdate.taxTotal = totals.taxTotal;
        docUpdate.grandTotal = totals.grandTotal;
        docUpdate.depositRequired = editableData.depositRequired || 0;
      }
      
      await supabase.from(table).update(docUpdate).eq('id', editableData.id);

      // 2. Save Business Settings (if changed)
      if (JSON.stringify(editableSettings) !== JSON.stringify(settings)) {
        await supabase.from('settings').update({
          name: editableSettings.name,
          address: editableSettings.address,
          phone: editableSettings.phone,
          email: editableSettings.email,
          paymentInstructions: editableSettings.paymentInstructions,
          terms: editableSettings.terms,
          footerText: editableSettings.footerText,
          bankName: editableSettings.bankName,
          accountName: editableSettings.accountName,
          accountNumber: editableSettings.accountNumber,
          swiftCode: editableSettings.swiftCode
        }).eq('id', settings.id);
      }

      // 3. Save Client Info
      if (editableClient) {
        await supabase.from('clients').update({ fullName: editableClient.fullName }).eq('id', editableClient.id);
      }

      // 4. Save Event Info
      if (editableEvent) {
        await supabase.from('events').update({ title: editableEvent.title }).eq('id', editableEvent.id);
      }

      setHasChanges(false);
      alert('Changes saved successfully!');
    } catch (err: any) {
      alert('Error saving changes: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePromoteClient = async () => {
    if (!client) return;
    const newTags = (client.tags || []).filter((t: string) => t !== 'temporary');
    const { error } = await supabase
      .from('clients')
      .update({ tags: newTags })
      .eq('id', client.id);
    
    if (error) {
      alert('Error promoting client: ' + error.message);
    } else {
      alert('Client successfully added to database!');
      if (editableClient) {
        setEditableClient({ ...editableClient, tags: newTags });
      }
    }
  };

  const handleDownloadPDF = async () => {
    if (!documentRef.current) return;

    // Temporarily force full A4 width for accurate capture
    const el = documentRef.current;
    const prevStyle = el.getAttribute('style') || '';
    el.style.width = '794px'; // ~210mm at 96dpi
    el.style.maxWidth = '794px';
    el.style.padding = '64px';

    await new Promise(r => setTimeout(r, 100)); // let layout settle

    const imgData = await toPng(el, {
      pixelRatio: 2,
      backgroundColor: '#FFFFFF',
      filter: (node: any) => {
        if (node.classList && node.classList.contains('no-print')) {
          return false;
        }
        return true;
      }
    });

    el.setAttribute('style', prevStyle);

    const imgWidth = el.offsetWidth;
    const imgHeight = el.offsetHeight;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgHeight * pdfWidth) / imgWidth;

    // Handle multi-page documents
    const pageHeight = pdf.internal.pageSize.getHeight();
    if (pdfHeight <= pageHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    } else {
      // Split across pages
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      img.src = imgData;
      await new Promise(r => { img.onload = r; });

      const scale = (pdfWidth / imgWidth) * (imgWidth / img.width);
      const pageHeightPx = (pageHeight / pdfWidth) * img.width;
      let y = 0;

      while (y < img.height) {
        const sliceH = Math.min(pageHeightPx, img.height - y);
        canvas.width = img.width;
        canvas.height = sliceH;
        ctx.drawImage(img, 0, y, img.width, sliceH, 0, 0, img.width, sliceH);
        const sliceData = canvas.toDataURL('image/png');
        if (y > 0) pdf.addPage();
        pdf.addImage(sliceData, 'PNG', 0, 0, pdfWidth, (sliceH * pdfWidth) / img.width);
        y += sliceH;
      }
    }

    pdf.save(`${type}-${(data as any).number || (data as any).id}.pdf`);
  };

  if (loadingClient) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 border-4 border-black/5 border-t-gold-deep rounded-full animate-spin"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40">Securing Ledger Data...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-10 text-center">
        <p className="text-red-500 font-bold">Error: Client information not found.</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-black text-white rounded-lg text-xs uppercase font-black">Close</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 max-h-[92vh] md:max-h-[90vh]">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}} />

      {/* Action Bar */}
      <div className="flex items-center justify-between px-1 flex-nowrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 md:w-11 md:h-11 border border-black/5 bg-white flex items-center justify-center text-gold-deep shrink-0 rounded-xl">
            <FileText size={18} />
          </div>
          <div>
            <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest italic leading-none">Output</h3>
            <p className="hidden sm:block text-[8px] md:text-[9px] text-black/40 uppercase tracking-[0.2em] font-bold mt-1">Standard format ready.</p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-nowrap justify-end">
          {hasChanges && (
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 md:px-5 md:py-2 bg-green-600 text-white text-[8px] font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-xl shadow-green-900/20 rounded-xl"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
          <button
            onClick={() => {
              const body = `Hi ${editableClient?.fullName || client.fullName},\n\nPlease find the ${type} attached.\n\nThank you for choosing ${editableSettings.name}.`;
              window.open(`mailto:${editableClient?.email || client.email}?subject=${type}&body=${encodeURIComponent(body)}`);
            }}
            className="flex items-center justify-center gap-1.5 p-2.5 md:px-3 md:py-2 border border-black/5 text-[8px] font-black uppercase tracking-widest hover:bg-bg-base transition-all rounded-xl"
            title="Share via Email"
          >
            <Mail size={15} /> <span className="hidden md:inline">Email</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-1.5 p-2.5 md:px-3 md:py-2 border border-black/5 text-[8px] font-black uppercase tracking-widest hover:bg-bg-base transition-all rounded-xl"
          >
            <Printer size={15} /> <span className="hidden md:inline">Print</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 md:px-5 md:py-2 bg-black text-white text-[8px] font-black uppercase tracking-widest hover:bg-gold-deep transition-all shadow-xl shadow-black/20 rounded-xl"
          >
            <Download size={15} /> <span className="hidden md:inline">PDF</span>
          </button>
        </div>
      </div>

      {/* Promotion Banner */}
      {editableClient?.tags?.includes('temporary') && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-xl flex items-center justify-between gap-4 no-print mx-1">
          <p className="text-[10px] font-bold uppercase tracking-wider">
            This client is currently temporary and excluded from your main Client Database.
          </p>
          <button
            onClick={handlePromoteClient}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-md shrink-0"
          >
            Add Client to Database
          </button>
        </div>
      )}

      {/* Document Preview — scrollable, fluid width */}
      <div className="flex-1 overflow-auto doc-scroll-container bg-bg-base/30 border border-black/5 rounded-2xl p-2 sm:p-4 md:p-6">
        {/*
          No CSS scale() transforms. The document fills available width on mobile
          and caps at A4 width (210mm ≈ 794px) on larger screens.
          On small screens the outer container scrolls horizontally if needed.
        */}
        <div
          id="print-document"
          ref={documentRef}
          className="bg-white mx-auto w-full shadow-none sm:shadow-xl rounded-none sm:rounded-xl"
          style={{
            maxWidth: '794px',       /* A4 width at 96dpi — fits naturally on desktop/tablet */
            minWidth: '320px',       /* never narrower than a small phone */
            padding: 'clamp(16px, 5vw, 64px)',  /* fluid inner padding: tight on mobile, spacious on desktop */
            boxSizing: 'border-box',
            fontFamily: settings.documentFont || 'Inter, sans-serif'
          }}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-black/10 pb-5 sm:pb-10 gap-6">
            <div className="space-y-3 sm:space-y-5">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Company Logo" className="h-7 sm:h-14 object-contain grayscale" />
              ) : (
                <input 
                  value={editableSettings.name}
                  onChange={(e) => handleUpdate('settings', 'name', e.target.value)}
                  className="text-lg sm:text-3xl font-serif font-black tracking-tighter italic bg-transparent border-none outline-none p-0 w-full focus:ring-1 focus:ring-black/5 rounded"
                  style={{ color: settings.brandColors?.secondary || '#B8860B' }}
                />
              )}
              <div className="text-[8px] sm:text-[10px] uppercase font-bold tracking-[0.2em] text-black/40 leading-relaxed max-w-[240px]">
                <textarea 
                  value={editableSettings.address}
                  onChange={(e) => handleUpdate('settings', 'address', e.target.value)}
                  className="border-l pl-3 bg-transparent border-none outline-none p-0 w-full resize-none h-auto focus:ring-1 focus:ring-black/5 rounded"
                  style={{ borderColor: settings.brandColors?.secondary || '#B8860B' }}
                  rows={2}
                />
                <div className="border-l pl-3 mt-1.5 flex items-center gap-1" style={{ borderColor: settings.brandColors?.secondary || '#B8860B' }}>
                  <input 
                    value={editableSettings.phone}
                    onChange={(e) => handleUpdate('settings', 'phone', e.target.value)}
                    className="bg-transparent border-none outline-none p-0 w-24 focus:ring-1 focus:ring-black/5 rounded"
                  />
                  <span>•</span>
                  <input 
                    value={editableSettings.email}
                    onChange={(e) => handleUpdate('settings', 'email', e.target.value)}
                    className="bg-transparent border-none outline-none p-0 w-full focus:ring-1 focus:ring-black/5 rounded"
                  />
                </div>
              </div>
            </div>
            <div className="text-left sm:text-right uppercase">
              <h1 className="text-2xl sm:text-5xl font-serif font-black tracking-tighter text-black/80 italic">{type}</h1>
              <div className="mt-2 sm:mt-5 space-y-1.5">
                <div className="flex flex-col sm:items-end">
                  <span className="text-[7px] sm:text-[9px] font-black tracking-[0.3em]" style={{ color: settings.brandColors?.secondary || '#B8860B' }}>Serial Number</span>
                  <input 
                    value={editableData.number}
                    onChange={(e) => handleUpdate('data', 'number', e.target.value)}
                    className="text-[9px] sm:text-xs font-bold tracking-tight bg-transparent border-none outline-none p-0 text-left sm:text-right w-full focus:ring-1 focus:ring-black/5 rounded"
                  />
                </div>
                <div className="flex flex-col sm:items-end mt-1">
                  <span className="text-[7px] sm:text-[9px] font-black text-black/20 tracking-[0.3em]">Issue Date</span>
                  <input 
                    type="date"
                    value={editableData.date || editableData.issueDate}
                    onChange={(e) => handleUpdate('data', editableData.date ? 'date' : 'issueDate', e.target.value)}
                    className="text-[9px] sm:text-xs font-bold bg-transparent border-none outline-none p-0 text-left sm:text-right focus:ring-1 focus:ring-black/5 rounded"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Client & Event Info */}
          <div className="grid grid-cols-2 gap-5 sm:gap-12 py-5 sm:py-10">
            <div className="space-y-2 sm:space-y-4">
              <h4 className="text-[7px] sm:text-[9px] font-black uppercase tracking-[0.3em] border-b border-black/5 pb-1.5" style={{ color: settings.brandColors?.secondary || '#B8860B' }}>Target</h4>
              <div className="space-y-0.5">
                <input 
                  value={editableClient?.fullName || ''}
                  onChange={(e) => handleUpdate('client', 'fullName', e.target.value)}
                  className="font-serif text-sm sm:text-xl italic text-black font-black leading-tight bg-transparent border-none outline-none p-0 w-full focus:ring-1 focus:ring-black/5 rounded"
                />
                {client.companyName && <p className="text-[7px] sm:text-[9px] text-black/40 font-bold uppercase tracking-widest">{client.companyName}</p>}
              </div>
            </div>
            {event && (
              <div className="space-y-2 sm:space-y-4">
                <h4 className="text-[7px] sm:text-[9px] font-black uppercase tracking-[0.3em] border-b border-black/5 pb-1.5" style={{ color: settings.brandColors?.secondary || '#B8860B' }}>Scope</h4>
                <div className="space-y-0.5">
                  <input 
                    value={editableEvent?.title || ''}
                    onChange={(e) => handleUpdate('event', 'title', e.target.value)}
                    className="font-serif text-sm sm:text-xl italic text-black font-black leading-tight bg-transparent border-none outline-none p-0 w-full focus:ring-1 focus:ring-black/5 rounded"
                  />
                  <p className="text-[7px] sm:text-[9px] text-black/40 font-bold uppercase tracking-widest">{event.type} • {event.date}</p>
                </div>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="mt-3 sm:mt-5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-y border-black/10 bg-bg-base/30">
                  <th className="py-2.5 px-2 sm:py-4 sm:px-3 text-[7px] sm:text-[9px] uppercase font-black tracking-[0.3em] text-black/40">Item</th>
                  <th className="py-2.5 px-2 sm:py-4 sm:px-3 text-[7px] sm:text-[9px] uppercase font-black tracking-[0.3em] text-black/40 text-center">Qty</th>
                  <th className="py-2.5 px-2 sm:py-4 sm:px-3 text-[7px] sm:text-[9px] uppercase font-black tracking-[0.3em] text-black/40 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {type === 'Receipt' ? (
                  <tr>
                    <td className="py-3 px-2 sm:py-5 sm:px-3">
                      <p className="text-[9px] sm:text-sm font-bold uppercase tracking-tight">Payment for Invoice #{invoice?.number || '---'}</p>
                      <p className="text-[7px] sm:text-[9px] text-black/30 mt-0.5 uppercase leading-relaxed">Amount credited to account</p>
                    </td>
                    <td className="py-3 px-2 sm:py-5 sm:px-3 text-center text-[9px] sm:text-xs font-bold">1</td>
                    <td className="py-3 px-2 sm:py-5 sm:px-3 text-right text-[9px] sm:text-base font-serif italic">{formatCurrency((data as any).amount)}</td>
                  </tr>
                ) : type === 'Quotation' ? (
                  <>
                    {lineItems.map((item: any, i: number) => (
                      <tr key={i} className="group hover:bg-gray-50/50 relative">
                        <td className="py-2 px-2 sm:py-3 sm:px-3">
                          <input 
                            value={item.name}
                            onChange={(e) => {
                              const updated = [...lineItems];
                              updated[i] = { ...updated[i], name: e.target.value };
                              setLineItems(updated);
                              setHasChanges(true);
                            }}
                            className="w-full text-[9px] sm:text-sm font-bold uppercase tracking-tight bg-transparent border-none outline-none p-0 focus:ring-1 focus:ring-black/5 rounded focus:text-gold-deep"
                            placeholder="Item Name"
                          />
                          <input 
                            value={item.description || ''}
                            onChange={(e) => {
                              const updated = [...lineItems];
                              updated[i] = { ...updated[i], description: e.target.value };
                              setLineItems(updated);
                              setHasChanges(true);
                            }}
                            className="w-full text-[7px] sm:text-[9px] text-black/30 mt-0.5 uppercase leading-relaxed bg-transparent border-none outline-none p-0 focus:ring-1 focus:ring-black/5 rounded focus:text-black"
                            placeholder="Add brief description..."
                          />
                        </td>
                        <td className="py-2 px-2 sm:py-3 sm:px-3 text-center w-16">
                          <input 
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const updated = [...lineItems];
                              updated[i] = { ...updated[i], quantity: Number(e.target.value) };
                              setLineItems(updated);
                              setHasChanges(true);
                            }}
                            className="w-full text-center text-[9px] sm:text-xs font-bold bg-transparent border-none outline-none p-0 focus:ring-1 focus:ring-black/5 rounded"
                          />
                        </td>
                        <td className="py-2 px-2 sm:py-3 sm:px-3 text-right w-24">
                          <div className="flex items-center justify-end gap-1">
                            <input 
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => {
                                const updated = [...lineItems];
                                updated[i] = { ...updated[i], unitPrice: Number(e.target.value) };
                                setLineItems(updated);
                                setHasChanges(true);
                              }}
                              className="w-full text-right text-[9px] sm:text-base font-serif italic bg-transparent border-none outline-none p-0 focus:ring-1 focus:ring-black/5 rounded focus:text-gold-deep"
                            />
                            <button
                              onClick={() => {
                                setLineItems(lineItems.filter((_, idx) => idx !== i));
                                setHasChanges(true);
                              }}
                              className="p-1 text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity no-print"
                              title="Delete Item"
                            >
                              <span className="text-xs">✕</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* Transport Cost Row */}
                    <tr className="bg-bg-base/20 border-t border-black/5">
                      <td className="py-2 px-2 sm:py-3 sm:px-3">
                        <p className="text-[9px] sm:text-sm font-bold uppercase tracking-tight text-black/50">Transport & Logistics</p>
                        <p className="text-[7px] sm:text-[9px] text-black/30 mt-0.5 uppercase">Transport fee for event</p>
                      </td>
                      <td className="py-2 px-2 sm:py-3 sm:px-3 text-center text-[9px] sm:text-xs font-bold text-black/40">1</td>
                      <td className="py-2 px-2 sm:py-3 sm:px-3 text-right">
                        <input 
                          type="number"
                          value={transportPrice}
                          onChange={(e) => {
                            setTransportPrice(Number(e.target.value));
                            setHasChanges(true);
                          }}
                          className="w-full text-right text-[9px] sm:text-base font-serif italic bg-transparent border-none outline-none p-0 focus:ring-1 focus:ring-black/5 rounded"
                          placeholder="0"
                        />
                      </td>
                    </tr>
                    {/* Labour Row */}
                    <tr className="bg-bg-base/20 border-t border-black/5">
                      <td className="py-2 px-2 sm:py-3 sm:px-3">
                        <p className="text-[9px] sm:text-sm font-bold uppercase tracking-tight text-black/50">Labour charges</p>
                        <p className="text-[7px] sm:text-[9px] text-black/30 mt-0.5 uppercase">Staffing for execution</p>
                      </td>
                      <td className="py-2 px-2 sm:py-3 sm:px-3 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <input 
                            type="number"
                            value={laborStaffCount}
                            onChange={(e) => {
                              const count = Number(e.target.value);
                              setLaborStaffCount(count);
                              setLaborCost(laborPrice * count);
                              setHasChanges(true);
                            }}
                            className="w-8 text-center text-[9px] sm:text-xs font-bold bg-transparent border-none outline-none p-0 focus:ring-1 focus:ring-black/5 rounded"
                            placeholder="0"
                          />
                          <span className="text-[6px] sm:text-[8px] text-black/30 uppercase font-black">Pax</span>
                        </div>
                      </td>
                      <td className="py-2 px-2 sm:py-3 sm:px-3 text-right">
                        <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[6px] sm:text-[8px] text-black/30 uppercase font-black whitespace-nowrap">Rate:</span>
                            <input 
                              type="number"
                              value={laborPrice}
                              onChange={(e) => {
                                const price = Number(e.target.value);
                                setLaborPrice(price);
                                setLaborCost(price * laborStaffCount);
                                setHasChanges(true);
                              }}
                              className="w-12 text-right text-[9px] sm:text-base font-serif italic bg-transparent border-none outline-none p-0 focus:ring-1 focus:ring-black/5 rounded"
                              placeholder="0"
                            />
                          </div>
                          <div className="flex items-center gap-1 border-t sm:border-t-0 sm:border-l border-black/5 pt-1 sm:pt-0 sm:pl-2">
                            <span className="text-[6px] sm:text-[8px] text-black/30 uppercase font-black whitespace-nowrap">Cost:</span>
                            <input 
                              type="number"
                              value={laborCost}
                              onChange={(e) => {
                                const cost = Number(e.target.value);
                                setLaborCost(cost);
                                setHasChanges(true);
                              }}
                              className="w-16 text-right text-[9px] sm:text-base font-serif italic bg-transparent border-none outline-none p-0 focus:ring-1 focus:ring-black/5 rounded"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  </>
                ) : (
                  ((data as any).items || []).map((item: any, i: number) => (
                    <tr key={i}>
                      <td className="py-3 px-2 sm:py-5 sm:px-3">
                        <p className="text-[9px] sm:text-sm font-bold uppercase tracking-tight">{item.name}</p>
                        {item.description && <p className="text-[7px] sm:text-[9px] text-black/30 mt-0.5 uppercase leading-relaxed">{item.description}</p>}
                      </td>
                      <td className="py-3 px-2 sm:py-5 sm:px-3 text-center text-[9px] sm:text-xs font-bold">{item.quantity}</td>
                      <td className="py-3 px-2 sm:py-5 sm:px-3 text-right text-[9px] sm:text-base font-serif italic">{formatCurrency(item.quantity * item.unitPrice)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {type === 'Quotation' && (
              <div className="mt-3 flex justify-start no-print">
                <button
                  onClick={() => {
                    const newCustomItem = {
                      name: 'New Custom Item',
                      description: '',
                      category: 'Custom',
                      quantity: 1,
                      unit: 'pcs',
                      unitPrice: 0,
                      discount: 0
                    };
                    setLineItems([...lineItems, newCustomItem]);
                    setHasChanges(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 border border-black/5 hover:border-black text-black/50 hover:text-black rounded-lg font-bold text-[8px] sm:text-[9px] uppercase tracking-widest transition-all bg-white shadow-sm"
                >
                  + Custom Item
                </button>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="mt-5 sm:mt-10 flex justify-end">
            <div className="w-full sm:w-1/2 space-y-2 sm:space-y-3">
              {type === 'Receipt' && invoice && (
                <>
                  <div className="flex justify-between text-[7px] sm:text-[9px] uppercase font-bold tracking-widest border-b border-black/5 pb-1.5">
                    <span className="text-black/30">Total Value</span>
                    <span className="text-black">{formatCurrency(invoice.grandTotal || 0)}</span>
                  </div>
                  <div className="flex justify-between text-[7px] sm:text-[9px] uppercase font-bold tracking-widest border-b border-black/5 pb-1.5">
                    <span className="text-black/30">Balance Remaining</span>
                    <span className="text-black">{formatCurrency((invoice.grandTotal || 0) - (invoice.amountPaid || 0))}</span>
                  </div>
                </>
              )}
              {type === 'Quotation' ? (
                <>
                  <div className="flex justify-between text-[7px] sm:text-[9px] uppercase font-bold tracking-widest border-b border-black/5 pb-1.5 items-center">
                    <span className="text-black/30">Subtotal</span>
                    <span className="text-black">{formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[7px] sm:text-[9px] uppercase font-bold tracking-widest border-b border-black/5 pb-1.5 items-center">
                    <span className="text-black/30">Rebate (%)</span>
                    <input 
                      type="number"
                      value={editableData.globalDiscount || 0}
                      onChange={(e) => {
                        handleUpdate('data', 'globalDiscount', Number(e.target.value));
                      }}
                      className="w-12 text-right bg-transparent border-none outline-none font-bold p-0 focus:ring-1 focus:ring-black/5 rounded"
                    />
                  </div>
                  {totals.discountAmount > 0 && (
                    <div className="flex justify-between text-[7px] sm:text-[9px] uppercase font-bold tracking-widest border-b border-black/5 pb-1.5 items-center text-red-500">
                      <span>Discount Amt</span>
                      <span>-{formatCurrency(totals.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[7px] sm:text-[9px] uppercase font-bold tracking-widest border-b border-black/5 pb-1.5 items-center">
                    <span className="text-black/30">Tax ({totals.taxRate}%)</span>
                    <span className="text-black">{formatCurrency(totals.taxTotal)}</span>
                  </div>
                </>
              ) : type !== 'Receipt' ? (
                <div className="flex justify-between text-[7px] sm:text-[9px] uppercase font-bold tracking-widest border-b border-black/5 pb-1.5">
                  <span className="text-black/30">Subtotal</span>
                  <span className="text-black">{formatCurrency(totals.subtotal)}</span>
                </div>
              ) : null}
              <div className="flex justify-between pt-3 sm:pt-5 items-end">
                <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.4em] text-black">
                  {type === 'Receipt' ? 'Amount Received' : 'Total'}
                </span>
                <span className="text-xl sm:text-4xl font-black tracking-tighter leading-none" style={{ color: settings.brandColors?.secondary || '#B8860B' }}>
                  {formatCurrency(totals.grandTotal || (data as any).amount || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer & T&Cs */}
          <div className="mt-10 sm:mt-20 pt-5 sm:pt-10 border-t border-black/5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-12">
              <div className="space-y-3 sm:space-y-5">
                <h4 className="text-[8px] font-black uppercase tracking-[0.4em] italic" style={{ color: settings.brandColors?.secondary || '#B8860B' }}>Settlement Policy & Bank Details</h4>
                <div className="space-y-3">
                  <textarea 
                    value={editableSettings.paymentInstructions}
                    onChange={(e) => handleUpdate('settings', 'paymentInstructions', e.target.value)}
                    className="text-[9px] text-black/40 leading-loose font-bold whitespace-pre-wrap bg-transparent border-none outline-none p-0 w-full resize-none h-auto focus:ring-1 focus:ring-black/5 rounded"
                    rows={4}
                  />
                  {(settings.bankName || settings.accountNumber) && (
                    <div className="p-4 border-l-2 space-y-1 mt-2" style={{ backgroundColor: `${settings.brandColors?.accent || '#fdfbf7'}80`, borderColor: `${settings.brandColors?.secondary || '#B8860B'}33` }}>
                      <p className="text-[7px] uppercase font-black tracking-widest text-black/20">Official Bank Account</p>
                      <div className="grid grid-cols-1 gap-1">
                        <input 
                          value={editableSettings.bankName || ''}
                          onChange={(e) => handleUpdate('settings', 'bankName', e.target.value)}
                          className="text-[9px] font-black text-black/60 uppercase tracking-tight bg-transparent border-none outline-none p-0 w-full focus:ring-1 focus:ring-black/5 rounded"
                          placeholder="Bank Name"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-bold text-black/40 whitespace-nowrap">Name:</span>
                          <input 
                            value={editableSettings.accountName || ''}
                            onChange={(e) => handleUpdate('settings', 'accountName', e.target.value)}
                            className="text-[9px] font-bold text-black/40 bg-transparent border-none outline-none p-0 w-full focus:ring-1 focus:ring-black/5 rounded"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-bold text-black/40 whitespace-nowrap">Acc:</span>
                          <input 
                            value={editableSettings.accountNumber || ''}
                            onChange={(e) => handleUpdate('settings', 'accountNumber', e.target.value)}
                            className="text-[9px] font-bold text-black/40 bg-transparent border-none outline-none p-0 w-full focus:ring-1 focus:ring-black/5 rounded"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-bold text-black/40 whitespace-nowrap">SWIFT:</span>
                          <input 
                            value={editableSettings.swiftCode || ''}
                            onChange={(e) => handleUpdate('settings', 'swiftCode', e.target.value)}
                            className="text-[9px] font-bold text-black/40 bg-transparent border-none outline-none p-0 w-full focus:ring-1 focus:ring-black/5 rounded"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3 sm:space-y-5">
                <h4 className="text-[8px] font-black uppercase tracking-[0.4em] italic" style={{ color: settings.brandColors?.secondary || '#B8860B' }}>Legal & Engagement Clauses</h4>
                <textarea 
                  value={editableSettings.terms}
                  onChange={(e) => handleUpdate('settings', 'terms', e.target.value)}
                  className="text-[9px] text-black/40 leading-loose font-medium whitespace-pre-wrap bg-transparent border-none outline-none p-0 w-full resize-none h-auto focus:ring-1 focus:ring-black/5 rounded"
                  rows={6}
                />
              </div>
            </div>
            <div className="mt-10 sm:mt-16 text-center">
              <div className="w-12 h-0.5 mx-auto mb-4" style={{ backgroundColor: `${settings.brandColors?.secondary || '#B8860B'}33` }}></div>
              <p className="text-[8px] uppercase font-black tracking-[0.5em] text-black/20 italic">
                <input 
                  value={editableSettings.footerText || `Thank you for your valued patronage • ${editableSettings.name}`}
                  onChange={(e) => handleUpdate('settings', 'footerText', e.target.value)}
                  className="bg-transparent border-none outline-none p-0 w-full text-center focus:ring-1 focus:ring-black/5 rounded"
                />
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
