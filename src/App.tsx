/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  FileText, 
  Receipt, 
  LayoutDashboard, 
  Package, 
  Settings as SettingsIcon,
  CircleUser,
  LogOut,
  Bell,
  Menu,
  X,
  Workflow,
  History,
  TrendingUp,
  Clock,
  CheckCircle2,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from './db';
import { useLiveQuery } from 'dexie-react-hooks';
import { cn } from './lib/utils';

// Views
import ClientView from './components/ClientView';
import CatalogView from './components/CatalogView';
import QuotationView from './components/QuotationView';
import InvoiceView from './components/InvoiceView';
import ReceiptView from './components/ReceiptView';
import SettingsView from './components/SettingsView';
import DashboardHome from './components/DashboardHome';
import EventView from './components/EventView';
import DocumentsView from './components/DocumentsView';
import ActivityLogView from './components/ActivityLogView';
import { Files } from 'lucide-react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './components/LoginPage';

type AppView = 'dashboard' | 'clients' | 'events' | 'quotations' | 'invoices' | 'receipts' | 'catalog' | 'history' | 'settings' | 'documents';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route 
        path="/*" 
        element={
          <ProtectedRoute>
            <DashboardContent />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

function DashboardContent() {
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  // Ensure default settings exist
  const settings = useLiveQuery(() => db.settings.toArray()) || [];

  useEffect(() => {
    const initSettings = async () => {
      if (settings.length === 0) {
        await db.settings.add({
          name: 'EventFlow',
          brandColors: {
            primary: '#000000',
            secondary: '#D4AF37',
            accent: '#FFFFFF'
          },
          phone: '+256 000 000 000',
          email: 'info@eventflow.com',
          address: 'Kampala, Uganda',
          footerText: 'Thank you for choosing EventFlow',
          paymentInstructions: 'Bank: X Bank\nAccount: 0000000000',
          terms: 'Subject to terms and conditions.',
          defaultValidityDays: 14,
          currency: 'KES',
          taxRate: 0,
          adminName: 'Admin'
        });
      } else if (settings[0].currency === 'UGX') {
        await db.settings.update(settings[0].id!, { currency: 'KES' });
      }
    };
    initSettings();
  }, [settings]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'quotations', label: 'Quotations', icon: FileText },
    { id: 'invoices', label: 'Invoices', icon: TrendingUp },
    { id: 'receipts', label: 'Receipts', icon: Receipt },
    { id: 'catalog', label: 'Catalog', icon: Package },
    { id: 'history', label: 'Activity Log', icon: History },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardHome onNavigate={setActiveView} />;
      case 'clients': return <ClientView onNavigate={setActiveView} />;
      case 'catalog': return <CatalogView />;
      case 'quotations': return <QuotationView onNavigate={setActiveView} />;
      case 'invoices': return <InvoiceView onNavigate={setActiveView} />;
      case 'receipts': return <ReceiptView onNavigate={setActiveView} />;
      case 'history': return <ActivityLogView />;
      case 'settings': return <SettingsView />;
      case 'events': return <EventView onNavigate={setActiveView} />;
      case 'documents': return <DocumentsView onNavigate={setActiveView} />;
      default: return <DashboardHome onNavigate={setActiveView} />;
    }
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-main font-sans selection:bg-gold-deep selection:text-white flex flex-col md:flex-row overflow-hidden h-screen">
      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "h-full bg-black text-white transition-all duration-500 z-50 border-r border-white/5 hidden md:flex flex-col shrink-0",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="p-8 flex items-center justify-between">
          <div className={cn("flex flex-col group cursor-pointer", !isSidebarOpen && "hidden")}>
            <div className="flex items-center gap-2">
              <Workflow className="text-gold-deep" size={24} />
              <span className="text-2xl font-serif font-black tracking-tighter text-white italic leading-none">EventFlow</span>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 hover:bg-white/10 text-white/40 hover:text-white transition-all outline-none"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="mt-12 px-4 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as AppView)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-4 rounded-none transition-all group relative outline-none",
                activeView === item.id 
                  ? "bg-white text-black" 
                  : "hover:bg-white/5 text-white/30 hover:text-white"
              )}
            >
              <item.icon size={18} className={cn("shrink-0 transition-transform", activeView === item.id ? "text-black scale-110" : "group-hover:text-gold-deep")} />
              <span className={cn("text-[10px] font-black uppercase tracking-[0.2em] transition-opacity duration-300", !isSidebarOpen && "opacity-0 invisible absolute")}>
                {item.label}
              </span>
              {activeView === item.id && isSidebarOpen && (
                <motion.div 
                  layoutId="activeNavIndicator"
                  className="absolute left-0 w-1 h-1/2 bg-gold-deep rounded-full ml-1"
                />
              )}
            </button>
          ))}
        </nav>

        <div className="p-8 border-t border-white/5">
           <button 
            onClick={logout}
            className="flex items-center gap-4 text-white/20 hover:text-white transition-all group outline-none"
          >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className={cn("text-[10px] font-black uppercase tracking-[0.2em] truncate", !isSidebarOpen && "hidden")}>Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-bg-base relative">
        {/* Mobile Header (Minimalist) */}
        <header className="md:hidden h-14 flex items-center justify-between px-6 bg-bg-base/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-100/50">
          <div className="flex items-center gap-2">
            <Workflow className="text-gold-deep" size={20} />
            <span className="text-xl font-serif font-black tracking-tighter text-black italic leading-none">EventFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveView('settings')}
              className={cn("p-1.5 transition-colors", activeView === 'settings' ? 'text-gold-deep' : 'text-gray-400')}
            >
              <CircleUser size={18} />
            </button>
          </div>
        </header>

        {/* Desktop Header (Minimalist Upgrade) */}
        <header className="hidden md:flex h-20 items-center justify-between px-10 border-b border-gray-100/50 bg-white/50 backdrop-blur-sm z-40">
          <div className="flex flex-col">
            <h2 className="text-lg font-serif font-black uppercase tracking-[0.05em] text-black italic">
              {navItems.find(i => i.id === activeView)?.label}
            </h2>
          </div>
          
          <div className="flex items-center gap-6">
            <button className="relative p-2 text-gray-300 hover:text-gold-deep transition-all">
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-gold-deep rounded-full"></span>
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-gray-100">
               <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-black">{user?.fullName || settings[0]?.adminName || 'Admin'}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white font-serif italic text-xs">
                {(user?.fullName || settings[0]?.adminName || 'A')[0].toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* View Container */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-5 lg:p-10 pb-24 md:pb-10 custom-scrollbar">
          <div className="max-w-6xl mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Navigation (Mobile Only) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-lg border-t border-gray-100/50 flex items-center justify-around px-2 z-50">
          {[
            { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
            { id: 'clients', label: 'Clients', icon: Users },
            { id: 'events', label: 'Events', icon: Calendar },
            { id: 'documents', label: 'Docs', icon: Files },
            { id: 'catalog', label: 'Catalog', icon: Package }
          ].map((item) => (
            <button
              key={`mobile-nav-${item.id}`}
              onClick={() => setActiveView(item.id as AppView)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-w-[60px] h-full transition-all relative",
                activeView === item.id || (item.id === 'documents' && ['quotations', 'invoices', 'receipts'].includes(activeView)) ? "text-gold-deep" : "text-gray-400"
              )}
            >
              <item.icon size={18} className={activeView === item.id || (item.id === 'documents' && ['quotations', 'invoices', 'receipts'].includes(activeView)) ? "scale-110" : ""} />
              <span className="text-[7px] font-black uppercase tracking-[0.1em]">
                {item.label}
              </span>
              {(activeView === item.id || (item.id === 'documents' && ['quotations', 'invoices', 'receipts'].includes(activeView))) && (
                <motion.div 
                  layoutId="mobileNavIndicator"
                  className="absolute bottom-0 w-8 h-0.5 bg-gold-deep rounded-full"
                />
              )}
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
}
