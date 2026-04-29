import React, { useRef } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Download, Printer, FileText, CheckCircle2, Mail, MessageCircle } from 'lucide-react';
import { Quotation, Invoice, Receipt, BusinessSettings } from '../types';
import { formatCurrency } from '../lib/utils';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';

interface DocumentGeneratorProps {
  type: 'Quotation' | 'Invoice' | 'Receipt';
  data: Quotation | Invoice | Receipt;
  onClose: () => void;
}

export default function DocumentGenerator({ type, data, onClose }: DocumentGeneratorProps) {
  const documentRef = useRef<HTMLDivElement>(null);
  const settings = useLiveQuery(() => db.settings.toArray())?.[0];
  const client = useLiveQuery(() => db.clients.get(data.clientId), [data.clientId]);
  const event = useLiveQuery(() => db.events.get((data as any).eventId), [(data as any).eventId]);
  const invoice = useLiveQuery(async () => {
    if (type === 'Receipt' && (data as any).paymentId) {
      const payment = await db.payments.get((data as any).paymentId);
      if (payment && payment.invoiceIds.length > 0) {
        return await db.invoices.get(payment.invoiceIds[0]);
      }
    }
    return null;
  }, [type, (data as any).paymentId]);

  const handleDownloadPDF = async () => {
    if (!documentRef.current) return;
    
    const imgData = await toPng(documentRef.current, {
      pixelRatio: 2,
      backgroundColor: '#FFFFFF',
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left',
        margin: '0',
      }
    });
    
    const width = documentRef.current.offsetWidth;
    const height = documentRef.current.offsetHeight;
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (height * pdfWidth) / width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${type}-${(data as any).number || (data as any).id}.pdf`);
  };

  if (!settings || !client) return null;

  return (
    <div className="flex flex-col gap-4 max-h-[92vh] md:max-h-[90vh]">
      <div className="flex items-center justify-between px-2 flex-nowrap gap-4">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 md:w-12 md:h-12 border border-black/5 bg-white flex items-center justify-center text-gold-deep shrink-0 rounded-xl">
            <FileText size={20} md={24} />
          </div>
          <div>
            <h3 className="text-xs md:text-sm font-black uppercase tracking-widest italic leading-none">Output</h3>
            <p className="hidden xs:block text-[9px] md:text-[10px] text-black/40 uppercase tracking-[0.2em] font-bold mt-1">Standard format ready.</p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-nowrap justify-end">
          <button 
            onClick={() => {
              const body = `Hi ${client.fullName},\n\nPlease find the ${type} attached.\n\nThank you for choosing ${settings.name}.`;
              window.open(`mailto:${client.email}?subject=${type}&body=${encodeURIComponent(body)}`);
            }}
            className="flex items-center justify-center gap-1.5 p-3 md:px-3 md:py-2 border border-black/5 text-[9px] font-black uppercase tracking-widest hover:bg-bg-base transition-all rounded-xl"
            title="Share via Email"
          >
            <Mail size={16} className="md:w-3.5 md:h-3.5" /> <span className="hidden md:inline">Email</span>
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center justify-center gap-1.5 p-3 md:px-3 md:py-2 border border-black/5 text-[9px] font-black uppercase tracking-widest hover:bg-bg-base transition-all rounded-xl"
          >
            <Printer size={16} className="md:w-3.5 md:h-3.5" /> <span className="hidden md:inline">Print</span>
          </button>
          <button 
            onClick={handleDownloadPDF}
            className="flex items-center justify-center gap-1.5 px-5 py-3 md:px-6 md:py-2 bg-black text-white text-[9px] font-black uppercase tracking-widest hover:bg-gold-deep transition-all shadow-xl shadow-black/20 rounded-xl"
          >
            <Download size={16} className="md:w-3.5 md:h-3.5" /> <span className="hidden md:inline">PDF</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-bg-base/30 p-2 sm:p-4 lg:p-8 border border-black/5 rounded-2xl">
          <div 
          ref={documentRef}
          className="bg-white mx-auto w-full max-w-[210mm] shadow-none sm:shadow-2xl origin-top transition-transform sm:scale-[0.8] md:scale-[0.9] lg:scale-[1] rounded-none md:rounded-none min-h-fit"
          style={{ minHeight: 'fit-content' }}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-black/10 pb-6 sm:pb-12 gap-8">
            <div className="space-y-4 sm:space-y-6">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Commercial Logo" className="h-8 sm:h-16 object-contain grayscale" />
              ) : (
                <div className="text-xl sm:text-3xl font-serif font-black tracking-tighter text-gold-deep italic">{settings.name || 'BHAKS'}</div>
              )}
              <div className="text-[8px] sm:text-[10px] uppercase font-bold tracking-[0.2em] text-black/40 leading-relaxed max-w-[250px]">
                <p className="border-l border-gold-deep pl-3">{settings.address}</p>
                <p className="border-l border-gold-deep pl-3 mt-2">{settings.phone} • {settings.email}</p>
              </div>
            </div>
            <div className="text-left sm:text-right uppercase">
              <h1 className="text-3xl sm:text-6xl font-serif font-black tracking-tighter text-black/80 italic">{type}</h1>
              <div className="mt-3 sm:mt-6 space-y-2">
                <div className="flex flex-col sm:items-end">
                  <span className="text-[7px] sm:text-[9px] font-black text-gold-deep tracking-[0.3em]">Serial Number</span>
                  <span className="text-[10px] sm:text-xs font-bold tracking-tight">{(data as any).number}</span>
                </div>
                <div className="flex flex-col sm:items-end mt-1">
                  <span className="text-[7px] sm:text-[9px] font-black text-black/20 tracking-[0.3em]">Issue Date</span>
                  <span className="text-[10px] sm:text-xs font-bold">{(data as any).date || (data as any).issueDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Client & Event Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-16 py-6 sm:py-12">
            <div className="space-y-2 sm:space-y-5">
              <h4 className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-gold-deep border-b border-black/5 pb-2">Target</h4>
              <div className="space-y-1">
                <p className="font-serif text-sm sm:text-xl italic text-black font-black">{client.fullName}</p>
                {client.companyName && <p className="text-[8px] sm:text-[10px] text-black/40 font-bold uppercase tracking-widest">{client.companyName}</p>}
              </div>
            </div>
            {event && (
              <div className="space-y-2 sm:space-y-5">
                <h4 className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-gold-deep border-b border-black/5 pb-2">Scope</h4>
                <div className="space-y-1">
                  <p className="font-serif text-sm sm:text-xl italic text-black font-black">{event.title}</p>
                  <p className="text-[8px] sm:text-[10px] text-black/40 font-bold uppercase tracking-widest">{event.type} • {event.date}</p>
                </div>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="mt-4 sm:mt-6 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[300px]">
              <thead>
                <tr className="border-y border-black/10 bg-bg-base/30">
                  <th className="py-3 px-2 sm:py-5 sm:px-4 text-[7px] sm:text-[9px] uppercase font-black tracking-[0.3em] text-black/40">Item</th>
                  <th className="py-3 px-2 sm:py-5 sm:px-4 text-[7px] sm:text-[9px] uppercase font-black tracking-[0.3em] text-black/40 text-center">Qty</th>
                  <th className="py-3 px-2 sm:py-5 sm:px-4 text-[7px] sm:text-[9px] uppercase font-black tracking-[0.3em] text-black/40 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {type === 'Receipt' ? (
                  <tr>
                    <td className="py-3 px-2 sm:py-6 sm:px-4">
                      <p className="text-[10px] sm:text-sm font-bold uppercase tracking-tight">Payment for Invoice #{invoice?.number || '---'}</p>
                      <p className="text-[8px] sm:text-[10px] text-black/30 mt-1 uppercase leading-relaxed hidden sm:block">Amount credited to account</p>
                    </td>
                    <td className="py-3 px-2 sm:py-6 sm:px-4 text-center text-[10px] sm:text-xs font-bold">1</td>
                    <td className="py-3 px-2 sm:py-6 sm:px-4 text-right text-[10px] sm:text-lg font-serif italic">{formatCurrency((data as any).amount)}</td>
                  </tr>
                ) : (
                  ((data as any).items || []).map((item: any, i: number) => (
                    <tr key={i}>
                      <td className="py-3 px-2 sm:py-6 sm:px-4">
                        <p className="text-[10px] sm:text-sm font-bold uppercase tracking-tight">{item.name}</p>
                        {item.description && <p className="text-[8px] sm:text-[10px] text-black/30 mt-1 uppercase leading-relaxed hidden sm:block">{item.description}</p>}
                      </td>
                      <td className="py-3 px-2 sm:py-6 sm:px-4 text-center text-[10px] sm:text-xs font-bold">{item.quantity}</td>
                      <td className="py-3 px-2 sm:py-6 sm:px-4 text-right text-[10px] sm:text-lg font-serif italic">{formatCurrency(item.quantity * item.unitPrice)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-6 sm:mt-12 flex justify-end">
            <div className="w-full sm:w-1/2 space-y-2 sm:space-y-4">
              {type === 'Receipt' && invoice && (
                <>
                  <div className="flex justify-between text-[8px] sm:text-[10px] uppercase font-bold tracking-widest border-b border-black/5 pb-2">
                    <span className="text-black/30">Total Value</span>
                    <span className="text-black">{formatCurrency(invoice.grandTotal || 0)}</span>
                  </div>
                  <div className="flex justify-between text-[8px] sm:text-[10px] uppercase font-bold tracking-widest border-b border-black/5 pb-2">
                    <span className="text-black/30">Balance Remaining</span>
                    <span className="text-black">{formatCurrency((invoice.grandTotal || 0) - (invoice.amountPaid || 0))}</span>
                  </div>
                </>
              )}
              {type !== 'Receipt' && (
                <div className="flex justify-between text-[8px] sm:text-[10px] uppercase font-bold tracking-widest border-b border-black/5 pb-2">
                  <span className="text-black/30">Subtotal</span>
                  <span className="text-black">{formatCurrency((data as any).subtotal || 0)}</span>
                </div>
              )}
              <div className="flex justify-between py-4 sm:py-6 items-end">
                <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.4em] text-black">
                  {type === 'Receipt' ? 'Amount Received' : 'Total'}
                </span>
                <span className="text-xl sm:text-4xl font-black tracking-tighter text-gold-deep leading-none">
                  {formatCurrency((data as any).grandTotal || (data as any).amount || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer & T&Cs */}
          <div className="mt-12 sm:mt-24 pt-6 sm:pt-12 border-t border-black/5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-16">
              <div className="space-y-4 sm:space-y-6">
                <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-gold-deep italic">Settlement Policy & Bank Details</h4>
                <p className="text-[10px] text-black/40 leading-loose font-bold whitespace-pre-wrap">
                  {settings.paymentInstructions}
                </p>
              </div>
              <div className="space-y-4 sm:space-y-6">
                <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-gold-deep italic">Legal & Engagement Clauses</h4>
                <p className="text-[10px] text-black/40 leading-loose font-medium whitespace-pre-wrap">
                  {settings.terms}
                </p>
              </div>
            </div>
            <div className="mt-12 sm:mt-24 text-center">
              <div className="w-16 h-0.5 bg-gold-deep/20 mx-auto mb-6"></div>
              <p className="text-[9px] uppercase font-black tracking-[0.5em] text-black/20 italic">
                {settings.footerText || 'Thank you for your valued patronage • Generated by BHAKS Management System'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
