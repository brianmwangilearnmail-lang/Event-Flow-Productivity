import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Package, 
  Archive, 
  DollarSign, 
  Tag as TagIcon,
  Layers,
  Edit2,
  Trash2,
  Eye,
  ArrowUpDown,
  Upload,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, logActivity } from '../db';
import { CatalogItem } from '../types';
import Modal from './Modal';
import { cn, formatCurrency } from '../lib/utils';

export default function CatalogView() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceMode, setPriceMode] = useState<'client' | 'supplier'>('client');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [viewingItem, setViewingItem] = useState<CatalogItem | null>(null);

  const categories = [
    'All',
    'Seating',
    'Tables',
    'Tents and structures',
    'Decor accessories',
    'Floral',
    'Lighting',
    'Table setting',
    'Backdrops',
    'Catering',
    'Drinks service',
    'Transport and logistics',
    'Staffing',
    'Custom services'
  ];

  const items = useLiveQuery(() => {
    let query = db.catalog.toCollection();
    if (selectedCategory !== 'All') {
      return db.catalog.where('category').equals(selectedCategory).filter(i => 
        !i.isArchived && (i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.sku.toLowerCase().includes(searchTerm.toLowerCase()))
      ).toArray();
    }
    return db.catalog.filter(i => 
      !i.isArchived && (i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    ).toArray();
  }, [selectedCategory, searchTerm]) || [];

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const supplierPrice = parseFloat(formData.get('supplierPrice') as string) || 0;
    const clientPrice = parseFloat(formData.get('clientPrice') as string) || 0;

    const newItem: Omit<CatalogItem, 'id'> = {
      name: formData.get('name') as string,
      sku: formData.get('sku') as string,
      category: formData.get('category') as string,
      unit: formData.get('unit') as string,
      supplierPrice,
      clientPrice,
      isTaxable: formData.get('isTaxable') === 'on',
      description: formData.get('description') as string,
      isArchived: false,
      imageUrl: imagePreview || undefined,
    };

    if (editingItem) {
      await db.catalog.update(editingItem.id!, newItem);
      logActivity(undefined, 'Catalog Updated', `Updated item: ${newItem.name}`);
    } else {
      await db.catalog.add(newItem);
      logActivity(undefined, 'Catalog Updated', `Added item: ${newItem.name}`);
    }

    setIsAddModalOpen(false);
    setEditingItem(null);
    setImagePreview(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const openEditModal = (item: CatalogItem) => {
    setEditingItem(item);
    setImagePreview(item.imageUrl || null);
    setIsAddModalOpen(true);
  };

  const handleDeleteItem = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to archive ${name}?`)) {
      await db.catalog.update(id, { isArchived: true });
      logActivity(undefined, 'Catalog Updated', `Archived item: ${name}`);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="p-4 md:p-0">
          <h1 className="text-2xl font-black text-black">Catalog</h1>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Manage event services</p>
        </div>
        <div className="flex items-center gap-2 px-4 md:px-0">
          <div className="flex-1 sm:flex-none flex bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
            <button 
              onClick={() => setPriceMode('client')}
              className={cn(
                "flex-1 md:flex-none px-3 py-2 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all",
                priceMode === 'client' ? "bg-black text-white" : "text-gray-400 hover:text-black"
              )}
            >
              Client
            </button>
            <button 
              onClick={() => setPriceMode('supplier')}
              className={cn(
                "flex-1 md:flex-none px-3 py-2 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all",
                priceMode === 'supplier' ? "bg-black text-white" : "text-gray-400 hover:text-black"
              )}
            >
              Supplier
            </button>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 w-10 h-10 bg-black text-white rounded-xl font-bold text-xs shrink-0 sm:w-auto sm:px-4 sm:py-2"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add Item</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Categories Dropdown */}
        <div className="px-4 md:px-0">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gold-deep pointer-events-none">
              <Filter size={14} />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-1 focus:ring-gold-deep appearance-none shadow-sm"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <ArrowUpDown size={14} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm mx-4 md:mx-0">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2 bg-gray-50 border-none rounded-xl text-xs outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 px-4 md:px-0">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex items-center gap-4 group active:border-black transition-all" onClick={() => setViewingItem(item)}>
                <div className="w-14 h-14 rounded-xl bg-gray-50 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={20} className="text-gray-200" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 truncate text-sm">{item.name}</h4>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest truncate mr-2">{item.category}</p>
                    <p className="text-xs font-black text-black">{formatCurrency(priceMode === 'client' ? item.clientPrice : item.supplierPrice)}</p>
                  </div>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="py-20 text-center text-gray-400">
                <Package size={48} className="mx-auto mb-4 opacity-10" />
                <p>No catalog items found in this category.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
          setImagePreview(null);
        }} 
        title={editingItem ? "Edit Catalog Item" : "Add Catalog Item"}
      >
        <form onSubmit={handleAddItem} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Product Image</label>
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-2xl p-6 hover:border-[#D4AF37] transition-colors group relative mt-1 bg-gray-50/50">
              {imagePreview ? (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-sm">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => setImagePreview(null)}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="w-full cursor-pointer flex flex-col items-center">
                  <div className="p-4 bg-white rounded-full shadow-sm text-gray-400 group-hover:text-[#D4AF37] transition-colors mb-2">
                    <Upload size={24} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Click to upload image</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Item Name *</label>
              <input required name="name" type="text" defaultValue={editingItem?.name} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]" placeholder="e.g. Gold Chiavari Chair" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">SKU / Code</label>
              <input name="sku" type="text" defaultValue={editingItem?.sku} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]" placeholder="CH-GOLD-01" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Category</label>
              <select name="category" defaultValue={editingItem?.category} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]">
                {categories.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Unit Type</label>
              <input name="unit" type="text" defaultValue={editingItem?.unit} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]" placeholder="e.g. Piece, Set, Guest" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Is Taxable?</label>
              <div className="flex items-center gap-3 h-[48px]">
                <input name="isTaxable" type="checkbox" defaultChecked={editingItem?.isTaxable} className="w-5 h-5 accent-[#D4AF37]" />
                <span className="text-sm text-gray-600">Apply standard tax</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Supplier Cost Price *</label>
              <input required name="supplierPrice" type="number" step="0.01" defaultValue={editingItem?.supplierPrice} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Client Selling Price *</label>
              <input required name="clientPrice" type="number" step="0.01" defaultValue={editingItem?.clientPrice} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Description</label>
            <textarea name="description" rows={3} defaultValue={editingItem?.description} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]" placeholder="Details about this product or service..."></textarea>
          </div>
          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingItem(null);
                setImagePreview(null);
              }}
              className="flex-1 py-4 border border-gray-100 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-1 py-4 bg-black text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-gray-800 transition-all"
            >
              {editingItem ? "Update Item" : "Save to Catalog"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={!!viewingItem} 
        onClose={() => setViewingItem(null)} 
        title={viewingItem?.name || ""}
      >
        {viewingItem && (
          <div className="space-y-6">
            <div className="aspect-video w-full bg-gray-50 rounded-2xl overflow-hidden flex items-center justify-center">
              {viewingItem.imageUrl ? (
                <img src={viewingItem.imageUrl} alt={viewingItem.name} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={64} className="text-gray-200" />
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Category</p>
                <p className="text-sm font-bold">{viewingItem.category}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">SKU</p>
                <p className="text-sm font-bold">{viewingItem.sku}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Client Price</p>
                <p className="text-sm font-bold text-[#D4AF37]">{formatCurrency(viewingItem.clientPrice)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Supplier Cost</p>
                <p className="text-sm font-bold">{formatCurrency(viewingItem.supplierPrice)}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Description</p>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">{viewingItem.description || 'No description provided.'}</p>
            </div>

            <button 
              onClick={() => {
                openEditModal(viewingItem);
                setViewingItem(null);
              }}
              className="w-full py-3 bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-gray-800 transition-all rounded-xl"
            >
              Edit Item
            </button>
          </div>
        )}
      </Modal>

    </div>
  );
}
