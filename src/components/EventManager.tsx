import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Circle, Plus, FileText, Check, Save, Loader2, Truck, Users, Trash2 } from 'lucide-react';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { supabase } from '../lib/supabase';
import { logActivity } from '../db';
import { Event, Quotation, Invoice, QuotationLineItem, DocumentStatus, StaffAssignment } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import Modal from './Modal';

interface EventManagerProps {
  eventId: number;
  onBack: () => void;
  onNavigate?: (view: any) => void;
}

export default function EventManager({ eventId, onBack, onNavigate }: EventManagerProps) {
  const { data: eventData = [] } = useSupabaseQuery<Event>('events', (q) => q.select('*').eq('id', eventId), [eventId]);
  const event = eventData[0];
  const { data: quotations = [] } = useSupabaseQuery<Quotation>('quotations', (q) => q.select('*').eq('eventId', eventId), [eventId]);
  
  // Find the latest approved or sent quote
  const activeQuote = quotations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  const [verifiedItems, setVerifiedItems] = useState<Record<number, boolean>>({});
  const [additionalItems, setAdditionalItems] = useState<QuotationLineItem[]>([]);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [clientVerification, setClientVerification] = useState<'Verified' | 'Unverified'>('Unverified');

  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [transportAssignments, setTransportAssignments] = useState<StaffAssignment[]>([]);
  const [labourAssignments, setLabourAssignments] = useState<StaffAssignment[]>([]);
  const [isAddAssignmentModalOpen, setIsAddAssignmentModalOpen] = useState<{ type: 'Transport' | 'Labour' } | null>(null);

  useEffect(() => {
    if (event) {
      setVerifiedItems(event.verifiedItems || {});
      setAdditionalItems(event.additionalItems || []);
      setClientVerification(event.clientVerification || 'Unverified');
      setTransportAssignments(event.transportAssignments || []);
      setLabourAssignments(event.labourAssignments || []);
    }
  }, [event]);

  if (!event) return null;

  const handleToggleVerify = async (index: number) => {
    const newVerifiedItems = { ...verifiedItems, [index]: !verifiedItems[index] };
    setVerifiedItems(newVerifiedItems);
    const { error } = await supabase.from('events').update({ verifiedItems: newVerifiedItems }).eq('id', eventId);
    if (error) {
      console.error('Error updating verification:', error);
      // Revert state on error
      setVerifiedItems(verifiedItems);
      alert('Failed to update item status. Please try again.');
    }
  };

  const handleAddCustomItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newItem: QuotationLineItem = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      category: 'Additional',
      quantity: Number(formData.get('quantity')),
      unit: 'Item',
      unitPrice: Number(formData.get('unitPrice')),
      discount: 0
    };

    const newAdditionalItems = [...additionalItems, newItem];
    setAdditionalItems(newAdditionalItems);
    const { error } = await supabase.from('events').update({ additionalItems: newAdditionalItems }).eq('id', eventId);
    
    if (error) {
      console.error('Error adding item:', error);
      setAdditionalItems(additionalItems); // Revert
      alert('Failed to add item to event. Please try again.');
    } else {
      setIsAddItemModalOpen(false);
      await logActivity(event.clientId, 'Event Item Added', `Added ${newItem.name} to event`, eventId, 'Event');
    }
  };

  const handleUpdateVerificationStatus = async (status: 'Verified' | 'Unverified') => {
    setClientVerification(status);
    const { error } = await supabase.from('events').update({ clientVerification: status }).eq('id', eventId);
    if (error) {
      console.error('Error updating verification status:', error);
      setClientVerification(clientVerification); // Revert
      alert('Failed to update verification status.');
    }
  };

  const handleGenerateInvoice = async () => {
    if (additionalItems.length === 0) {
      alert("No additional items to invoice.");
      return;
    }

    setIsGeneratingInvoice(true);
    
    const allItems = [...additionalItems];
    const subtotal = allItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice) - item.discount, 0);
    const taxTotal = subtotal * 0.16; // Example 16% VAT, can be fetched from settings
    const grandTotal = subtotal + taxTotal;

    const newInvoice: Invoice = {
      clientId: event.clientId,
      eventId: event.id!,
      quotationId: activeQuote?.id, // link if available
      number: `INV-${Date.now().toString().slice(-6)}`,
      type: 'Final',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      status: DocumentStatus.PENDING_PAYMENT,
      items: allItems,
      subtotal,
      taxTotal,
      discountTotal: 0,
      amountPaid: 0,
      grandTotal,
      notes: "Auto-generated from Event Manager containing additional items."
    };

    const { error } = await supabase.from('invoices').insert(newInvoice);
    setIsGeneratingInvoice(false);
    if (error) {
      alert('Error generating invoice: ' + error.message);
    } else {
      logActivity(event.clientId, 'Invoice Generated', `Created final invoice from Event Manager for additional items`, event.id, 'Event');
      if (onNavigate) {
        onNavigate('invoices');
      } else {
        alert("Invoice generated! Check your Invoices tab or Client Profile.");
      }
    }
  };

  const handleAddAssignment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAddAssignmentModalOpen) return;

    const formData = new FormData(e.currentTarget);
    const newAssignment: StaffAssignment = {
      name: formData.get('name') as string,
      responsibility: formData.get('responsibility') as string
    };

    const isTransport = isAddAssignmentModalOpen.type === 'Transport';
    const current = isTransport ? transportAssignments : labourAssignments;
    const updated = [...current, newAssignment];

    if (isTransport) setTransportAssignments(updated);
    else setLabourAssignments(updated);

    const updateField = isTransport ? 'transportAssignments' : 'labourAssignments';
    const { error } = await supabase.from('events').update({ [updateField]: updated }).eq('id', eventId);
    
    if (error) {
      alert('Error updating assignments: ' + error.message);
      if (isTransport) setTransportAssignments(current);
      else setLabourAssignments(current);
    } else {
      setIsAddAssignmentModalOpen(null);
      logActivity(event.clientId, 'Assignment Updated', `Added ${newAssignment.name} to ${isAddAssignmentModalOpen.type}`, eventId, 'Event');
    }
  };

  const removeAssignment = async (type: 'Transport' | 'Labour', index: number) => {
    const isTransport = type === 'Transport';
    const current = isTransport ? transportAssignments : labourAssignments;
    const updated = current.filter((_, i) => i !== index);

    if (isTransport) setTransportAssignments(updated);
    else setLabourAssignments(updated);

    const updateField = isTransport ? 'transportAssignments' : 'labourAssignments';
    await supabase.from('events').update({ [updateField]: updated }).eq('id', eventId);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-black text-white p-4 md:p-8 shrink-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6">
        <div>
          <button onClick={onBack} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2 md:mb-4">
            <ArrowLeft size={12} md={14} /> Back
          </button>
          <h1 className="text-2xl md:text-4xl font-serif italic text-gold-deep mb-1 md:mb-2">Event Manager</h1>
          <p className="text-[10px] md:text-sm font-bold uppercase tracking-widest text-white/50">{event.title}</p>
        </div>
        <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-start sm:items-center md:items-end lg:items-center gap-2 md:gap-4 shrink-0 w-full md:w-auto">
          <div className="flex items-center gap-2 md:gap-4 bg-white/10 p-3 md:p-4 rounded-lg md:rounded-xl w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-[9px] md:text-xs font-bold uppercase tracking-widest text-white/50">Verification:</span>
            <select
              value={clientVerification}
              onChange={(e) => handleUpdateVerificationStatus(e.target.value as 'Verified' | 'Unverified')}
              className={cn(
                "bg-transparent font-bold text-xs md:text-sm outline-none border-none cursor-pointer",
                clientVerification === 'Verified' ? "text-green-400" : "text-yellow-400"
              )}
            >
              <option value="Unverified" className="text-black">Unverified</option>
              <option value="Verified" className="text-black">Verified</option>
            </select>
          </div>
          <button 
            onClick={handleGenerateInvoice}
            disabled={isGeneratingInvoice}
            className={cn(
              "px-4 py-3 bg-gold-deep text-black font-bold uppercase tracking-widest text-[10px] md:text-xs transition-all flex items-center justify-center gap-2 w-full sm:w-auto rounded-lg",
              isGeneratingInvoice ? "opacity-75 cursor-not-allowed" : "hover:bg-gold-deep/90"
            )}
          >
            {isGeneratingInvoice ? (
              <Loader2 size={12} md={14} className="animate-spin" />
            ) : (
              <FileText size={12} md={14} />
            )}
            {isGeneratingInvoice ? "Generating..." : "Generate Invoice"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        
        {/* Quote Checklist */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base md:text-lg font-bold">Quote Checklist</h2>
            <span className="text-[10px] md:text-xs px-3 py-1 bg-black text-white rounded-full font-bold">
              {activeQuote ? Object.values(verifiedItems).filter(Boolean).length : 0} / {activeQuote?.items.length || 0} Verified
            </span>
          </div>

          {activeQuote ? (
            <div className="space-y-2">
              {activeQuote.items.map((item, index) => (
                <div 
                  key={index} 
                  className={cn(
                    "p-3 md:p-4 bg-white border cursor-pointer transition-all flex items-start gap-3 md:gap-4 hover:shadow-md",
                    verifiedItems[index] ? "border-green-500 bg-green-50/10" : "border-gray-200"
                  )}
                  onClick={() => handleToggleVerify(index)}
                >
                  <button className={cn("mt-0.5 shrink-0", verifiedItems[index] ? "text-green-500" : "text-gray-300")}>
                    {verifiedItems[index] ? <CheckCircle size={18} /> : <Circle size={18} />}
                  </button>
                  <div className="flex-1">
                    <p className={cn("font-bold text-sm", verifiedItems[index] && "line-through text-gray-500")}>
                      {item.quantity}x {item.name}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{item.description}</p>
                    <p className="text-xs font-bold mt-1.5">{formatCurrency(item.unitPrice * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-white border border-dashed border-gray-300 text-center text-xs text-gray-500 font-medium">
              No active quotes found.
            </div>
          )}
        </div>

        {/* Additional Needs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base md:text-lg font-bold">Additional Needs</h2>
            <button 
              onClick={() => setIsAddItemModalOpen(true)}
              className="px-3 py-1.5 bg-black text-white text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-black/80 transition-all flex items-center gap-1.5 rounded-md"
            >
              <Plus size={12} /> Add
            </button>
          </div>

          <div className="space-y-2">
            {additionalItems.length > 0 ? additionalItems.map((item, index) => (
              <div key={index} className="p-3 md:p-4 bg-white border border-gold-deep/30 bg-gold-50/10 flex justify-between items-center group rounded-lg">
                <div>
                  <p className="font-bold text-xs md:text-sm">{item.quantity}x {item.name}</p>
                  <p className="text-[10px] text-black/50 mt-0.5">{item.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xs md:text-sm text-gold-deep">{formatCurrency(item.unitPrice * item.quantity)}</p>
                  <button 
                    className="text-[10px] text-red-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                    onClick={async () => {
                      const newItems = additionalItems.filter((_, i) => i !== index);
                      setAdditionalItems(newItems);
                      await supabase.from('events').update({ additionalItems: newItems }).eq('id', eventId);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )) : (
              <div className="p-6 bg-white border border-dashed border-gray-300 text-center text-xs text-gray-500 font-medium">
                No extra items.
              </div>
            )}
          </div>
        </div>

        {/* Transport Assignments */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base md:text-lg font-bold flex items-center gap-2">
              <Truck size={18} className="text-black" />
              Transport
            </h2>
            <button 
              onClick={() => setIsAddAssignmentModalOpen({ type: 'Transport' })}
              className="px-3 py-1.5 bg-black text-white text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-black/80 transition-all flex items-center gap-1.5 rounded-md"
            >
              <Plus size={12} /> Assign
            </button>
          </div>

          <div className="space-y-2">
            {transportAssignments.length > 0 ? transportAssignments.map((a, i) => (
              <div key={i} className="p-3 bg-white border border-black/5 flex justify-between items-center group rounded-xl">
                <div>
                  <p className="font-bold text-xs md:text-sm">{a.name}</p>
                  <p className="text-[10px] text-black/40 uppercase tracking-widest font-bold mt-0.5">{a.responsibility}</p>
                </div>
                <button 
                  onClick={() => removeAssignment('Transport', i)}
                  className="p-2 text-black/10 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )) : (
              <div className="p-6 bg-white border border-dashed border-gray-200 text-center text-xs text-gray-400 font-medium rounded-xl italic">
                No transport assigned
              </div>
            )}
          </div>
        </div>

        {/* Labour Assignments */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base md:text-lg font-bold flex items-center gap-2">
              <Users size={18} className="text-black" />
              Labour
            </h2>
            <button 
              onClick={() => setIsAddAssignmentModalOpen({ type: 'Labour' })}
              className="px-3 py-1.5 bg-black text-white text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-black/80 transition-all flex items-center gap-1.5 rounded-md"
            >
              <Plus size={12} /> Assign
            </button>
          </div>

          <div className="space-y-2">
            {labourAssignments.length > 0 ? labourAssignments.map((a, i) => (
              <div key={i} className="p-3 bg-white border border-black/5 flex justify-between items-center group rounded-xl">
                <div>
                  <p className="font-bold text-xs md:text-sm">{a.name}</p>
                  <p className="text-[10px] text-black/40 uppercase tracking-widest font-bold mt-0.5">{a.responsibility}</p>
                </div>
                <button 
                  onClick={() => removeAssignment('Labour', i)}
                  className="p-2 text-black/10 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )) : (
              <div className="p-6 bg-white border border-dashed border-gray-200 text-center text-xs text-gray-400 font-medium rounded-xl italic">
                No labour assigned
              </div>
            )}
          </div>
        </div>

      </div>

      <Modal 
        isOpen={!!isAddAssignmentModalOpen} 
        onClose={() => setIsAddAssignmentModalOpen(null)} 
        title={`Assign ${isAddAssignmentModalOpen?.type} Staff`}
      >
        <form onSubmit={handleAddAssignment} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Personnel Name *</label>
            <input required name="name" type="text" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-gold-deep" placeholder="e.g. John Doe" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Responsibility / Role *</label>
            <input required name="responsibility" type="text" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-gold-deep" placeholder="e.g. Lead Driver, Heavy Lifting" />
          </div>
          <button type="submit" className="w-full py-4 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-black/90 transition-colors rounded-xl">
            Confirm Assignment
          </button>
        </form>
      </Modal>

      <Modal isOpen={isAddItemModalOpen} onClose={() => setIsAddItemModalOpen(false)} title="Add Additional Item">
        <form onSubmit={handleAddCustomItem} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Item Name *</label>
            <input required name="name" type="text" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-gold-deep" placeholder="e.g. Extra Lighting" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Description</label>
            <textarea name="description" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-gold-deep" placeholder="Details about this requirement..."></textarea>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Quantity *</label>
              <input required name="quantity" type="number" min="1" step="1" defaultValue="1" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-gold-deep" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Unit Price *</label>
              <input required name="unitPrice" type="number" min="0" step="0.01" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-gold-deep" placeholder="e.g. 5000" />
            </div>
          </div>
          <button type="submit" className="w-full py-4 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-black/90 transition-colors rounded-xl">
            Add to Event
          </button>
        </form>
      </Modal>

    </div>
  );
}
