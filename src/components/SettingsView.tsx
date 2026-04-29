import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Upload, 
  Globe, 
  Phone, 
  Mail, 
  MapPin, 
  Palette, 
  FileText,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, logActivity } from '../db';
import { BusinessSettings } from '../types';
import { cn } from '../lib/utils';

export default function SettingsView() {
  const settings = useLiveQuery(() => db.settings.toArray()) || [];
  const [formData, setFormData] = useState<Partial<BusinessSettings>>({});
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (settings.length > 0) {
      setFormData(settings[0]);
    }
  }, [settings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleColorChange = (key: keyof BusinessSettings['brandColors'], value: string) => {
    setFormData(prev => ({
      ...prev,
      brandColors: {
        ...prev.brandColors!,
        [key]: value
      }
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (settings.length > 0) {
      await db.settings.update(settings[0].id!, formData);
      logActivity(undefined, 'Settings Updated', 'Business settings and branding were updated');
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }
  };

  if (!formData.name) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-black italic">Settings</h1>
          <p className="text-[10px] text-black/40 uppercase tracking-widest mt-1 font-bold">Brand & Operations</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Business Identity */}
        <section className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 bg-bg-base border border-black/5 rounded-2xl flex flex-col items-center justify-center text-black/20 group relative overflow-hidden shrink-0">
              {formData.logoUrl ? (
                <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <ImageIcon size={24} />
              )}
              <label className="absolute inset-0 bg-black/80 text-white opacity-0 group-active:opacity-100 transition-all flex items-center justify-center cursor-pointer">
                <Upload size={14} />
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>
            <div className="w-full space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black tracking-widest text-black/30">Legal Name</label>
                <input 
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-0 py-1 bg-transparent border-b border-black/5 outline-none focus:border-black font-serif italic text-xl text-black"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold tracking-widest text-black/30">Email</label>
              <input 
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-0 py-1 bg-transparent border-b border-black/5 outline-none focus:border-black text-xs font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold tracking-widest text-black/30">Phone</label>
              <input 
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-0 py-1 bg-transparent border-b border-black/5 outline-none focus:border-black text-xs font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold tracking-widest text-black/30">Address</label>
              <textarea 
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-0 py-1 bg-transparent border-b border-black/5 outline-none focus:border-black text-xs font-bold resize-none"
              />
            </div>
          </div>
        </section>

        {/* Visual Identity */}
        <section className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm space-y-6">
          <h3 className="text-[9px] font-black uppercase tracking-widest text-gold-deep border-b border-gold-deep/10 pb-2">Branding</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: 'primary', label: 'Primary' },
              { key: 'secondary', label: 'Accent' },
              { key: 'accent', label: 'Base' }
            ].map((color) => (
              <div key={color.key} className="space-y-2 text-center">
                <div 
                  className="w-12 h-12 rounded-full border border-black/10 cursor-pointer relative"
                  style={{ backgroundColor: (formData.brandColors as any)?.[color.key] }}
                >
                  <input 
                    type="color" 
                    value={(formData.brandColors as any)?.[color.key]}
                    onChange={(e) => handleColorChange(color.key as any, e.target.value)}
                    className="w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <p className="text-[8px] uppercase font-black text-black/30 tracking-tighter">{color.label}</p>
              </div>
            ))}
          </div>
        </section>

        <button 
          type="submit"
          className="w-full py-4 bg-black text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Save size={14} /> Update Profile
        </button>
      </form>
    </div>
  );
}
