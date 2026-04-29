import React from 'react';
import { db, logActivity } from '../db';
import { Invoice, DocumentStatus } from '../types';
import { formatCurrency } from '../lib/utils';
import { Save, DollarSign } from 'lucide-react';

interface ReceiptFormProps {
  invoice: Invoice;
  onSuccess: () => void;
}

export default function ReceiptForm({ invoice, onSuccess }: ReceiptFormProps) {
  const balance = invoice.grandTotal - invoice.amountPaid;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    const method = formData.get('method') as string;
    const reference = formData.get('reference') as string;
    const date = formData.get('date') as string;

    if (amount <= 0 || amount > balance) {
      alert('Invalid payment amount');
      return;
    }

    // 1. Create Payment
    const paymentId = await db.payments.add({
      clientId: invoice.clientId,
      invoiceIds: [invoice.id!],
      amount,
      date,
      method,
      reference,
      receivedBy: 'Admin User',
      notes: formData.get('notes') as string
    });

    // 2. Create Receipt
    const receiptNumber = `RCP-${Date.now().toString().slice(-6)}`;
    await db.receipts.add({
      number: receiptNumber,
      paymentId,
      clientId: invoice.clientId,
      eventId: invoice.eventId,
      amount,
      date,
      createdAt: Date.now()
    });

    // 3. Update Invoice
    const newAmountPaid = invoice.amountPaid + amount;
    const newStatus = newAmountPaid >= invoice.grandTotal ? DocumentStatus.PAID : DocumentStatus.PARTIALLY_PAID;
    
    await db.invoices.update(invoice.id!, {
      amountPaid: newAmountPaid,
      status: newStatus
    });

    // 4. Log Activity
    await logActivity(invoice.clientId, 'Payment Recorded', `Payment of ${formatCurrency(amount)} received for Invoice #${invoice.number}`, paymentId, 'Receipt', invoice);

    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gold-50 p-6 rounded-2xl border border-gold-100 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-[#D4AF37] uppercase tracking-widest font-bold">Outstanding Balance</p>
          <p className="text-2xl font-black text-black">{formatCurrency(balance)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Invoice Reference</p>
          <p className="text-sm font-bold text-gray-600">#{invoice.number}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Amount Received *</label>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              required 
              name="amount" 
              type="number" 
              step="0.01" 
              max={balance}
              defaultValue={balance}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37] font-bold" 
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Payment Date</label>
          <input 
            required 
            name="date" 
            type="date" 
            defaultValue={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]" 
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Payment Method</label>
          <select name="method" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]">
            <option>Bank Transfer (EFT)</option>
            <option>Mobile Money (MTN/Airtel)</option>
            <option>Cash</option>
            <option>Cheque</option>
            <option>Card Payment</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Transaction Reference</label>
          <input name="reference" type="text" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]" placeholder="e.g. Bank Ref #, Tx ID" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Internal Notes</label>
        <textarea name="notes" rows={2} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]" placeholder="Any details for the records..."></textarea>
      </div>

      <div className="flex gap-4 pt-4">
        <button 
          type="submit" 
          className="flex-1 py-4 bg-black text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
        >
          <Save size={16} /> Record & Generate Receipt
        </button>
      </div>
    </form>
  );
}
