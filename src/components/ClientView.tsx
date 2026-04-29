import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Mail, 
  Phone, 
  Calendar, 
  ChevronRight,
  ExternalLink,
  Trash2,
  Edit2,
  Tag,
  Briefcase,
  Users
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, logActivity } from '../db';
import { Client, ClientStatus } from '../types';
import Modal from './Modal';
import { cn } from '../lib/utils';
import ClientProfile from './ClientProfile';

interface ClientViewProps {
  onNavigate: (view: any) => void;
}

export default function ClientView({ onNavigate }: ClientViewProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const clients = useLiveQuery(() => {
    let collection = db.clients.toCollection();
    if (searchTerm) {
      return db.clients.filter(c => 
        c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
      ).reverse().toArray();
    }
    return collection.reverse().toArray();
  }, [searchTerm]) || [];

  const handleAddClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newClient: Omit<Client, 'id'> = {
      fullName: formData.get('fullName') as string,
      companyName: formData.get('companyName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      altPhone: formData.get('altPhone') as string,
      address: formData.get('address') as string,
      communicationChannel: formData.get('communicationChannel') as string,
      notes: formData.get('notes') as string,
      tags: (formData.get('tags') as string).split(',').map(t => t.trim()).filter(t => t),
      status: ClientStatus.NEW_INQUIRY,
      createdAt: Date.now(),
      assignedStaff: 'Admin User'
    };

    const id = await db.clients.add(newClient as Client);
    await logActivity(id, 'Client Created', `New client added: ${newClient.fullName}`, id, 'Client');
    setIsAddModalOpen(false);
  };

  const deleteClient = async (id: number) => {
    if (confirm('Are you sure you want to delete this client? All events and documents will remain but unlinked.')) {
      const clientToDelete = await db.clients.get(id);
      if (clientToDelete) {
        await db.clients.delete(id);
        await logActivity(id, 'Record Deleted', `Client ${clientToDelete.fullName} was deleted`, id, 'Client', clientToDelete);
      }
    }
  };

  if (isProfileOpen && selectedClient) {
    return <ClientProfile client={selectedClient} onBack={() => setIsProfileOpen(false)} onNavigate={onNavigate} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-black">Clients</h1>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Manage event pipelines</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold text-xs"
        >
          <Plus size={16} />
          New Client
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-gray-50">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-xs outline-none"
            />
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-gray-400 border-b border-gray-50">Client Identity</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-gray-400 border-b border-gray-50">Contact Info</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-gray-400 border-b border-gray-50">Pipeline Status</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-gray-400 border-b border-gray-50">Added</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-gray-400 border-b border-gray-50 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-bold text-sm">
                        {client.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{client.fullName}</p>
                        {client.companyName && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Briefcase size={10} /> {client.companyName}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 flex items-center gap-2">
                        <Mail size={12} className="text-[#D4AF37]" /> {client.email}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-2">
                        <Phone size={12} className="text-[#D4AF37]" /> {client.phone}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={cn(
                      "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      client.status === ClientStatus.COMPLETED ? "bg-green-50 text-green-600" :
                      client.status === ClientStatus.APPROVED ? "bg-blue-50 text-blue-600" :
                      client.status === ClientStatus.CANCELLED ? "bg-red-50 text-red-600" :
                      "bg-gold-50 text-[#D4AF37]"
                    )}>
                      {client.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-xs text-gray-400">
                    {new Date(client.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setSelectedClient(client); setIsProfileOpen(true); }}
                        className="flex items-center gap-2 p-3 md:px-3 md:py-2 text-xs font-bold hover:bg-black hover:text-white rounded-lg transition-all"
                        title="View Profile"
                      >
                        <ExternalLink size={16} className="md:w-3.5 md:h-3.5" /> <span className="hidden md:inline">View Profile</span>
                      </button>
                      <button 
                        onClick={() => deleteClient(client.id!)}
                        className="p-3 md:p-2 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all"
                        title="Delete"
                      >
                        <Trash2 size={18} className="md:w-4 md:h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-50">
          {clients.map((client) => (
            <div key={client.id} className="p-4 flex items-center justify-between group active:bg-gray-50 transition-colors" onClick={() => { setSelectedClient(client); setIsProfileOpen(true); }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {client.fullName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{client.fullName}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-tight truncate">
                    {client.status} • {client.companyName || 'Private'}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </div>
          ))}
        </div>

      </div>

      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        title="Add New Client"
        size="md"
      >
        <form onSubmit={handleAddClient} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Full Name *</label>
              <input required name="fullName" type="text" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]" placeholder="e.g. John Doe" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Company Name</label>
              <input name="companyName" type="text" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]" placeholder="e.g. Acme Corp" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Email Address *</label>
              <input required name="email" type="email" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]" placeholder="john@example.com" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Phone Number *</label>
              <input required name="phone" type="tel" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]" placeholder="+256..." />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Alternative Phone</label>
              <input name="altPhone" type="tel" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]" placeholder="+256..." />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Preferred Channel</label>
              <select name="communicationChannel" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]">
                <option>WhatsApp</option>
                <option>Email</option>
                <option>Phone Call</option>
                <option>Physical Meeting</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Physical Address</label>
            <textarea name="address" rows={2} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]" placeholder="Location details..."></textarea>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Tags (comma separated)</label>
            <input name="tags" type="text" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]" placeholder="wedding, corporate, VIP..." />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Initial Notes</label>
            <textarea name="notes" rows={3} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]" placeholder="Any relevant details..."></textarea>
          </div>
          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={() => setIsAddModalOpen(false)}
              className="flex-1 py-4 border border-gray-100 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-1 py-4 bg-black text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-gray-800 transition-all shadow-lg shadow-black/10"
            >
              Create Client
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
