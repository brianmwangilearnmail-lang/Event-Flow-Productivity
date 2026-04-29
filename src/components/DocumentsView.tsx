/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FileText, TrendingUp, Receipt, ChevronRight, History } from 'lucide-react';
import { cn } from '../lib/utils';

interface DocumentsViewProps {
  onNavigate: (view: any) => void;
}

export default function DocumentsView({ onNavigate }: DocumentsViewProps) {
  const documentTypes = [
    { 
      id: 'quotations', 
      label: 'Quotations', 
      desc: 'Proposals & Estimates',
      icon: FileText, 
      color: 'text-gold-deep',
      bg: 'bg-gold-deep/5'
    },
    { 
      id: 'invoices', 
      label: 'Invoices', 
      desc: 'Payment Requests',
      icon: TrendingUp, 
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    { 
      id: 'receipts', 
      label: 'Receipts', 
      desc: 'Proof of Payments',
      icon: Receipt, 
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    { 
      id: 'history', 
      label: 'Activity Log', 
      desc: 'System Audit Ledger',
      icon: History, 
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
  ];

  return (
    <div className="space-y-6">
      <div className="p-4 md:p-0">
        <h1 className="text-2xl font-black text-black">Documents</h1>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Financial & Legal Records</p>
      </div>

      <div className="grid grid-cols-1 gap-3 px-4 md:px-0">
        {documentTypes.map((doc) => (
          <button
            key={doc.id}
            onClick={() => onNavigate(doc.id)}
            className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm transition-all hover:border-black group text-left active:scale-[0.98]"
          >
            <div className={cn("p-3 rounded-xl shrink-0 transition-transform group-active:scale-90", doc.bg, doc.color)}>
              <doc.icon size={24} />
            </div>
            <div className="flex-1">
              <h4 className="font-black text-sm uppercase tracking-tight">{doc.label}</h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{doc.desc}</p>
            </div>
            <ChevronRight size={18} className="text-gray-200 group-hover:text-black transition-colors" />
          </button>
        ))}
      </div>

      <div className="px-4 md:px-0 mt-8">
        <div className="bg-bg-base border border-black/5 rounded-2xl p-6 text-center">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] leading-relaxed">
            All documents generated here are stored in the secure local database and synced across your session.
          </p>
        </div>
      </div>
    </div>
  );
}
