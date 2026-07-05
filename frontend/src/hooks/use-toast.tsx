'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning';
}

interface ToastContextType {
  toasts: Toast[];
  toast: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const iconMap = {
  default: Info,
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
};

const colorMap = {
  default: 'bg-card/90 border-border/50 text-foreground',
  success: 'bg-emerald-600/90 border-emerald-500/30 text-white',
  error: 'bg-destructive/90 border-destructive/30 text-destructive-foreground',
  warning: 'bg-amber-600/90 border-amber-500/30 text-white',
};

const iconColorMap = {
  default: 'text-primary',
  success: 'text-emerald-200',
  error: 'text-destructive-foreground/80',
  warning: 'text-amber-200',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => {
            const Icon = iconMap[t.variant ?? 'default'];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-md flex items-start gap-3 ${colorMap[t.variant ?? 'default']}`}
              >
                <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconColorMap[t.variant ?? 'default']}`} />
                <div className="flex-1 min-w-0">
                  {t.title && <p className="font-semibold text-sm">{t.title}</p>}
                  {t.description && <p className="text-xs opacity-90 mt-0.5">{t.description}</p>}
                </div>
                <button onClick={() => dismiss(t.id)} className="shrink-0 p-0.5 rounded-md opacity-60 hover:opacity-100 transition-opacity">
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
