import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const success = useCallback((message: string) => toast(message, 'success'), [toast]);
  const error = useCallback((message: string) => toast(message, 'error'), [toast]);
  const warning = useCallback((message: string) => toast(message, 'warning'), [toast]);
  const info = useCallback((message: string) => toast(message, 'info'), [toast]);

  // Intercept/Override window.alert so all standard alerts use this toast context
  useEffect(() => {
    const originalAlert = window.alert;
    
    window.alert = (message: string) => {
      const msgStr = String(message).toLowerCase();
      let type: ToastType = 'info';
      if (msgStr.includes('success') || msgStr.includes('saved')) {
        type = 'success';
      } else if (msgStr.includes('error') || msgStr.includes('fail') || msgStr.includes('invalid') || msgStr.includes('no longer exists')) {
        type = 'error';
      } else if (msgStr.includes('warning') || msgStr.includes('attention')) {
        type = 'warning';
      }
      toast(message, type);
    };

    return () => {
      window.alert = originalAlert;
    };
  }, [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            className="pointer-events-auto w-full bg-black text-white rounded-xl shadow-2xl border border-white/10 overflow-hidden flex items-stretch"
          >
            {/* Left accent color bar & icon */}
            <div className={`w-12 flex items-center justify-center shrink-0 ${
              toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
              toast.type === 'error' ? 'bg-red-500/20 text-red-400' :
              toast.type === 'warning' ? 'bg-amber-500/20 text-amber-400' :
              'bg-gold-deep/20 text-gold-deep'
            }`}>
              {toast.type === 'success' && <CheckCircle2 size={20} />}
              {toast.type === 'error' && <AlertCircle size={20} />}
              {toast.type === 'warning' && <AlertTriangle size={20} />}
              {toast.type === 'info' && <Info size={20} />}
            </div>

            {/* Content area */}
            <div className="flex-1 p-4 pr-2 flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold tracking-wide uppercase text-white/90 leading-relaxed">
                {toast.message}
              </span>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 text-white/40 hover:text-white transition-colors hover:bg-white/5 rounded-lg"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
