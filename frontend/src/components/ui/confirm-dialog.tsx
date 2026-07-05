'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button } from './button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  confirmVariant?: 'primary' | 'destructive';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  confirmVariant = 'destructive',
  loading = false,
  icon,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-card border border-border/60 rounded-2xl shadow-2xl max-w-md w-full p-6"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 rounded-xl ${confirmVariant === 'destructive' ? 'bg-destructive/10 ring-1 ring-destructive/20' : 'bg-primary/10 ring-1 ring-primary/20'}`}>
                {icon ?? <AlertTriangle className={`h-5 w-5 ${confirmVariant === 'destructive' ? 'text-destructive' : 'text-primary'}`} />}
              </div>
              <div>
                <h3 className="text-base font-semibold">{title}</h3>
                {description && <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{description}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
              <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
              <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
                {confirmText}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
