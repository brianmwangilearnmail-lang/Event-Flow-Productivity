import React, { useState } from 'react';
import { Calendar, MapPin, Clock, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logActivity } from '../db';
import { Quotation, EventType } from '../types';
import Modal from './Modal';

import { useSettings } from '../context/SettingsContext';

interface ScheduleEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation;
  onSuccess: () => void;
}

export default function ScheduleEventModal({ isOpen, onClose, quotation, onSuccess }: ScheduleEventModalProps) {
  const [loading, setLoading] = useState(false);
  const { settings } = useSettings();

  const handleSchedule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    const eventData = {
      clientId: quotation.clientId,
      title: formData.get('title') as string,
      type: formData.get('type') as string,
      date: formData.get('date') as string,
      time: formData.get('time') as string,
      venueName: formData.get('venueName') as string,
      venueAddress: formData.get('venueAddress') as string,
      status: 'Confirmed',
      requirements: {}
    };

    try {
      // 1. Create Event
      const { data: event, error: eventError } = await supabase.from('events').insert(eventData).select().single();
      if (eventError) throw eventError;

      // 2. Link Quotation to Event
      const { error: quoteError } = await supabase.from('quotations').update({ eventId: event.id }).eq('id', quotation.id);
      if (quoteError) throw quoteError;

      // 3. Log Activity
      await logActivity(quotation.clientId, 'Event Scheduled', `Event "${eventData.title}" scheduled from Quotation #${quotation.number}`, event.id, 'Event');

      onSuccess();
      onClose();
    } catch (error: any) {
      alert('Error scheduling event: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Event from Quote" size="lg">
      <form onSubmit={handleSchedule} className="space-y-6">
        <div className="bg-bg-base/50 p-4 border border-black/5 rounded-xl flex items-center gap-4 mb-6">
          <div 
            className="w-10 h-10 text-white flex items-center justify-center rounded-lg shrink-0 shadow-sm"
            style={{ backgroundColor: settings?.brandColors?.primary || '#000000' }}
          >
            <Info size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Linking to Quote</p>
            <p className="text-xs font-bold text-black">#{quotation.number} • {(quotation.grandTotal || 0).toLocaleString()} KES</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-black/40">Event Title *</label>
            <input 
              required 
              name="title" 
              type="text" 
              placeholder="e.g. Summer Gala 2024"
              className="w-full px-4 py-3 bg-bg-base border border-black/5 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-gold-deep" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-black/40">Event Type</label>
            <select 
              name="type"
              className="w-full px-4 py-3 bg-bg-base border border-black/5 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-gold-deep"
            >
              {Object.values(EventType).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-black/40">Date *</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-black/20" size={14} />
              <input 
                required 
                name="date" 
                type="date" 
                className="w-full pl-10 pr-4 py-3 bg-bg-base border border-black/5 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-gold-deep" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-black/40">Time</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-black/20" size={14} />
              <input 
                name="time" 
                type="time" 
                className="w-full pl-10 pr-4 py-3 bg-bg-base border border-black/5 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-gold-deep" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-black/40">Venue Name</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-black/20" size={14} />
              <input 
                name="venueName" 
                type="text" 
                placeholder="e.g. Imperial Botanical Garden"
                className="w-full pl-10 pr-4 py-3 bg-bg-base border border-black/5 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-gold-deep" 
              />
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-black/40">Venue Address</label>
            <input 
              name="venueAddress" 
              type="text" 
              placeholder="Full physical address..."
              className="w-full px-4 py-3 bg-bg-base border border-black/5 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-gold-deep" 
            />
          </div>
        </div>

        <div className="flex gap-4 pt-4 border-t border-black/5">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-4 border border-black/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-bg-base transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading}
            style={{ backgroundColor: settings?.brandColors?.primary || '#000000' }}
            className="flex-[2] py-4 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-black/10 disabled:opacity-50"
          >
            {loading ? 'Scheduling...' : 'Schedule Event'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
