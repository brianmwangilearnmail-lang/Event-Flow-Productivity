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
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { supabase } from '../lib/supabase';
import { logActivity } from '../db';
import { BusinessSettings } from '../types';
import { cn, compressImage } from '../lib/utils';

const FONTS = [
  'Inter', 'Playfair Display', 'Roboto', 'Open Sans', 'Lato', 
  'Montserrat', 'Oswald', 'Raleway', 'Merriweather', 'Nunito'
];

export default function SettingsView() {
  const { data: settingsList = [] } = useSupabaseQuery<BusinessSettings>('settings', (q) => q.select('*'));
  const settings = settingsList?.[0];
  const [formData, setFormData] = useState<Partial<BusinessSettings>>({
    brandColors: { primary: '#000000', secondary: '#ffffff', accent: '#B8860B' },
    documentFont: 'Inter'
  });
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(prev => ({
        ...prev,
        ...settings,
        brandColors: settings.brandColors || prev.brandColors,
        documentFont: settings.documentFont || prev.documentFont
      }));
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
    let error;
    if (settings?.id) {
      const res = await supabase.from('settings').update(formData).eq('id', settings.id);
      error = res.error;
    } else {
      const res = await supabase.from('settings').insert([formData]);
      error = res.error;
    }
    
    if (error) {
      alert('Error saving settings: ' + error.message);
      return;
    }
    logActivity(undefined, 'Settings Updated', 'Business settings and branding were updated');
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // Removed the line that returns null if !formData.name to prevent blank page


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
                      reader.onloadend = async () => {
                        const compressed = await compressImage(reader.result as string, 400); // Smaller size for logo
                        setFormData(prev => ({ ...prev, logoUrl: compressed }));
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

          <div className="pt-4 border-t border-black/5 mt-4">
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold tracking-widest text-black/30">Document Font</label>
              <select 
                name="documentFont"
                value={formData.documentFont || 'Inter'}
                onChange={handleInputChange}
                className="w-full px-0 py-1 bg-transparent border-b border-black/5 outline-none focus:border-black text-xs font-bold appearance-none cursor-pointer"
                style={{ fontFamily: formData.documentFont || 'Inter' }}
              >
                {FONTS.map(font => (
                  <option key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Banking Details */}
        <section className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm space-y-6">
          <h3 className="text-[9px] font-black uppercase tracking-widest text-gold-deep border-b border-gold-deep/10 pb-2">Banking Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold tracking-widest text-black/30">Bank Name</label>
              <input 
                name="bankName"
                value={formData.bankName || ''}
                onChange={handleInputChange}
                className="w-full px-0 py-1 bg-transparent border-b border-black/5 outline-none focus:border-black text-xs font-bold"
                placeholder="e.g. Stanbic Bank"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold tracking-widest text-black/30">Account Name</label>
              <input 
                name="accountName"
                value={formData.accountName || ''}
                onChange={handleInputChange}
                className="w-full px-0 py-1 bg-transparent border-b border-black/5 outline-none focus:border-black text-xs font-bold"
                placeholder="e.g. Event Flow Ltd"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold tracking-widest text-black/30">Account Number</label>
              <input 
                name="accountNumber"
                value={formData.accountNumber || ''}
                onChange={handleInputChange}
                className="w-full px-0 py-1 bg-transparent border-b border-black/5 outline-none focus:border-black text-xs font-bold"
                placeholder="0000 0000 0000"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold tracking-widest text-black/30">SWIFT / BIC Code</label>
              <input 
                name="swiftCode"
                value={formData.swiftCode || ''}
                onChange={handleInputChange}
                className="w-full px-0 py-1 bg-transparent border-b border-black/5 outline-none focus:border-black text-xs font-bold"
                placeholder="SBICKA"
              />
            </div>
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
