import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Search, 
  MapPin, 
  Users as UsersIcon, 
  Clock, 
  ChevronRight,
  Filter,
  LayoutGrid,
  List,
  ArrowRight,
  Plus,
  Trash2,
  AlertCircle,
  Edit2
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, logActivity } from '../db';
import { cn } from '../lib/utils';
import { EventType, Event } from '../types';
import Modal from './Modal';
import EventManager from './EventManager';

interface EventViewProps {
  onNavigate: (view: any) => void;
}

export default function EventView({ onNavigate }: EventViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [managingEventId, setManagingEventId] = useState<number | null>(null);

  const clients = useLiveQuery(() => db.clients.toArray()) || [];
  const events = useLiveQuery(async () => {
    const evs = await db.events.reverse().toArray();
    const clientsData = await db.clients.toArray();
    
    return evs.map(e => ({
      ...e,
      clientName: clientsData.find(c => c.id === e.clientId)?.fullName || 'Unknown Client'
    })).filter(e => 
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]) || [];

  const handleUpdateStatus = async (eventId: number, status: string) => {
    try {
      await db.events.update(eventId, { status });
      const event = await db.events.get(eventId);
      if (event) {
        await logActivity(event.clientId, 'Event Status Updated', `Status changed to ${status}`, eventId, 'Event');
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const eventData: Omit<Event, 'id'> = {
      clientId: Number(formData.get('clientId')),
      title: formData.get('title') as string,
      type: formData.get('type') as string,
      date: formData.get('date') as string,
      time: formData.get('time') as string,
      venueName: formData.get('venueName') as string,
      venueAddress: formData.get('venueAddress') as string,
      guestCount: Number(formData.get('guestCount')),
      themeNotes: formData.get('themeNotes') as string,
      serviceRequirements: editingEvent?.serviceRequirements || '',
      assignedPlanner: formData.get('assignedPlanner') as string,
      status: editingEvent?.status || 'Proposed',
      requirements: editingEvent?.requirements || {}
    };

    if (editingEvent?.id) {
      await db.events.update(editingEvent.id, eventData);
      await logActivity(eventData.clientId, 'Event Updated', `Updated event: ${eventData.title}`, editingEvent.id, 'Event');
    } else {
      const id = await db.events.add(eventData);
      await logActivity(eventData.clientId, 'Event Created', `Created event: ${eventData.title}`, id, 'Event');
    }
    
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const handleOpenAddModal = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (event: Event) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleDeleteEvent = async (id: number, title: string, clientId: number) => {
    if (window.confirm(`Are you sure you want to delete the event: ${title}?`)) {
      await db.events.delete(id);
      await logActivity(clientId, 'Event Deleted', `Deleted event: ${title}`);
    }
  };

  if (managingEventId) {
    return <EventManager eventId={managingEventId} onBack={() => setManagingEventId(null)} />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-black italic">Roadmap</h1>
          <p className="text-[10px] text-black/40 uppercase tracking-[0.2em] mt-1 font-bold">Planned engagements</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleOpenAddModal}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[9px]"
          >
            <Plus size={14} /> New
          </button>
        </div>
      </div>

      <div className="bg-white p-3 border border-black/5 flex items-center gap-6 rounded-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={16} />
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2 bg-bg-base border-none rounded-xl text-[10px] uppercase outline-none font-bold"
          />
        </div>
      </div>

      <div className={cn(
        "grid gap-4",
        viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
      )}>
        {events.map((event: any) => {
          return (
          <div key={event.id} className={cn(
            "bg-white border border-black/5 shadow-sm hover:shadow-md transition-all overflow-hidden rounded-2xl",
            viewMode === 'list' ? "flex flex-col md:flex-row" : "flex flex-col"
          )} onClick={() => setManagingEventId(event.id)}>
            <div className={cn(
              "text-white flex flex-col items-center justify-center p-6 shrink-0 relative bg-black transition-colors",
              event.status === 'Completed' ? 'bg-green-700' : event.status === 'Ongoing' ? 'bg-gold-deep' : 'bg-black',
              viewMode === 'list' ? "w-full md:w-32" : "h-32"
            )}>
              <p className="text-4xl font-serif font-black text-white tracking-tighter leading-none">
                {new Date(event.date).getDate()}
              </p>
              <p className="text-[10px] uppercase font-serif italic text-white/50 tracking-widest mt-1">
                {new Date(event.date).toLocaleString('default', { month: 'short' })}
              </p>
            </div>
            
            <div className="p-5 flex-1 min-w-0 flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-sm font-black text-black leading-tight truncate">{event.title}</h3>
                <p className="text-[10px] text-black/40 uppercase tracking-widest font-black mt-1 truncate">{event.clientName}</p>
                <p className="text-[9px] text-gray-400 mt-2 flex items-center gap-1">
                  <MapPin size={10} /> {event.venueName}
                </p>
              </div>
              <ChevronRight size={16} className="text-gray-200 shrink-0" />
            </div>
          </div>
          );
        })}

        {events.length === 0 && (
          <div className="col-span-full py-32 text-center">
            <div className="max-w-xs mx-auto space-y-6">
              <CalendarIcon size={48} className="mx-auto text-black/5" />
              <p className="text-[10px] uppercase tracking-[0.4em] font-black text-black/20 italic">No scheduled engagements detected</p>
            </div>
          </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingEvent(null);
        }} 
        title={editingEvent ? "Revise Engagement Details" : "Schedule New Engagement"}
        size="lg"
      >
        <form onSubmit={handleSaveEvent} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2 md:col-span-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-black/40">Event Title *</label>
              <input 
                required 
                name="title" 
                type="text" 
                defaultValue={editingEvent?.title}
                placeholder="e.g. Mwangangi Introduction Ceremony"
                className="w-full px-6 py-4 bg-bg-base border-none rounded-none text-xs font-bold outline-none focus:ring-1 focus:ring-gold-deep" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-black/40">Client / Principal *</label>
              <select 
                required 
                name="clientId"
                defaultValue={editingEvent?.clientId}
                className="w-full px-6 py-4 bg-bg-base border-none rounded-none text-xs font-bold outline-none focus:ring-1 focus:ring-gold-deep"
              >
                <option value="">Select a client...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.fullName}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-black/40">Engagement Type</label>
              <select 
                name="type"
                defaultValue={editingEvent?.type}
                className="w-full px-6 py-4 bg-bg-base border-none rounded-none text-xs font-bold outline-none focus:ring-1 focus:ring-gold-deep"
              >
                {Object.values(EventType).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-black/40">Date</label>
              <input 
                required 
                name="date" 
                type="date" 
                defaultValue={editingEvent?.date}
                className="w-full px-6 py-4 bg-bg-base border-none rounded-none text-xs font-bold outline-none focus:ring-1 focus:ring-gold-deep" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-black/40">Time</label>
              <input 
                required 
                name="time" 
                type="time" 
                defaultValue={editingEvent?.time}
                className="w-full px-6 py-4 bg-bg-base border-none rounded-none text-xs font-bold outline-none focus:ring-1 focus:ring-gold-deep" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-black/40">Venue Name</label>
              <input 
                name="venueName" 
                type="text" 
                defaultValue={editingEvent?.venueName}
                placeholder="e.g. Imperial Botanical Garden"
                className="w-full px-6 py-4 bg-bg-base border-none rounded-none text-xs font-bold outline-none focus:ring-1 focus:ring-gold-deep" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-black/40">Estimated Guest Count</label>
              <input 
                name="guestCount" 
                type="number" 
                defaultValue={editingEvent?.guestCount || "100"}
                className="w-full px-6 py-4 bg-bg-base border-none rounded-none text-xs font-bold outline-none focus:ring-1 focus:ring-gold-deep" 
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-black/40">Venue Address</label>
              <input 
                name="venueAddress" 
                type="text" 
                defaultValue={editingEvent?.venueAddress}
                placeholder="Full physical address..."
                className="w-full px-6 py-4 bg-bg-base border-none rounded-none text-xs font-bold outline-none focus:ring-1 focus:ring-gold-deep" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-black/40">Assigned Planner</label>
              <input 
                name="assignedPlanner" 
                type="text" 
                defaultValue={editingEvent?.assignedPlanner}
                placeholder="Staff name..."
                className="w-full px-6 py-4 bg-bg-base border-none rounded-none text-xs font-bold outline-none focus:ring-1 focus:ring-gold-deep" 
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-black/40">Initial Theme / Vision Notes</label>
              <textarea 
                name="themeNotes" 
                rows={3}
                defaultValue={editingEvent?.themeNotes}
                placeholder="Describe the desired aesthetic or specific requirements..."
                className="w-full px-6 py-4 bg-bg-base border-none rounded-none text-xs font-bold outline-none focus:ring-1 focus:ring-gold-deep resize-none"
              ></textarea>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingEvent(null);
              }}
              className="flex-1 py-4 border border-black/10 rounded-none text-[10px] font-black uppercase tracking-widest hover:bg-bg-base transition-colors"
            >
              Discard
            </button>
            <button 
              type="submit" 
              className="flex-[2] py-4 bg-black text-white rounded-none text-[10px] font-black uppercase tracking-widest hover:bg-gold-deep transition-all shadow-xl shadow-black/10"
            >
              {editingEvent ? "Confirm Changes" : "Initialize Engagement"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
