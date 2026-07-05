'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { api } from '@/lib/api';
import {
  Search,
  LayoutDashboard,
  Layers,
  Terminal,
  Cpu,
  BarChart3,
  Users,
  Settings,
  Plus,
  FileText,
  Clock,
  Command,
  ArrowRight,
  Workflow,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Action {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  href?: string;
  action?: () => void;
  category: string;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { activeOrg, activeProject } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [queues, setQueues] = useState<any[]>([]);
  const [loadingQueues, setLoadingQueues] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      if (activeOrg && activeProject) {
        setLoadingQueues(true);
        api.get(`/organizations/${activeOrg.slug}/projects/${activeProject.slug}/queues`)
          .then((res) => setQueues(res.data.data ?? []))
          .catch(() => {})
          .finally(() => setLoadingQueues(false));
      }
    }
  }, [open, activeOrg?.slug, activeProject?.slug]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
      }
    };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const navigate = useCallback((href: string) => {
    router.push(href);
    onClose();
  }, [router, onClose]);

  const actions: Action[] = [
    { id: 'nav-dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, href: '/dashboard', category: 'Navigation' },
    { id: 'nav-queues', label: 'Go to Queues', icon: Layers, href: '/queues', category: 'Navigation' },
    { id: 'nav-jobs', label: 'Go to Job Explorer', icon: Terminal, href: '/jobs', category: 'Navigation' },
    { id: 'nav-workers', label: 'Go to Workers', icon: Cpu, href: '/workers', category: 'Navigation' },
    { id: 'nav-analytics', label: 'Go to Analytics', icon: BarChart3, href: '/analytics', category: 'Navigation' },
    { id: 'nav-members', label: 'Go to Members', icon: Users, href: '/members', category: 'Navigation' },
    { id: 'nav-settings', label: 'Go to Settings', icon: Settings, href: '/settings', category: 'Navigation' },
    ...queues.map((q) => ({
      id: `queue-${q.name}`, label: `View queue: ${q.name}`, description: `${q.status} · Priority ${q.priority}`,
      icon: Layers, href: '/queues', category: 'Queues',
    })),
  ];

  const filtered = query.trim()
    ? actions.filter((a) => {
        const q = query.toLowerCase();
        return a.label.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q);
      })
    : actions;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered[selectedIndex]) {
      const item = filtered[selectedIndex];
      if (item.href) navigate(item.href);
      else if (item.action) { item.action(); onClose(); }
    }
  };

  const categories = [...new Set(filtered.map((a) => a.category))];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="relative w-full max-w-xl bg-card border border-border/50 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/50">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                onKeyDown={handleKeyDown}
                placeholder="Search pages, queues, actions..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
              />
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-secondary border border-border/30 text-[10px] font-mono text-muted-foreground/60">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2" onMouseDown={(e) => e.preventDefault()}>
              {loadingQueues && query.length === 0 && (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
                </div>
              )}
              {filtered.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No results for &ldquo;{query}&rdquo;
                </div>
              )}
              {categories.map((cat) => (
                <div key={cat}>
                  <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{cat}</div>
                  {filtered.filter((a) => a.category === cat).map((item, idx) => {
                    const globalIdx = filtered.indexOf(item);
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => item.href ? navigate(item.href) : undefined}
                        className={cn(
                          'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left text-sm transition-colors',
                          globalIdx === selectedIndex ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary/50',
                        )}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                      >
                        <Icon className={cn('h-4 w-4 shrink-0', globalIdx === selectedIndex ? 'text-primary' : 'text-muted-foreground')} />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{item.label}</span>
                          {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
                        </div>
                        <ArrowRight className={cn('h-3.5 w-3.5 text-muted-foreground/50', globalIdx === selectedIndex ? 'opacity-100' : 'opacity-0')} />
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 px-4 py-2.5 border-t border-border/50 bg-secondary/20 text-[10px] text-muted-foreground">
              <span><kbd className="px-1 py-0.5 rounded bg-secondary border border-border/30 font-mono">↑↓</kbd> Navigate</span>
              <span><kbd className="px-1 py-0.5 rounded bg-secondary border border-border/30 font-mono">↵</kbd> Open</span>
              <span><kbd className="px-1 py-0.5 rounded bg-secondary border border-border/30 font-mono">Esc</kbd> Close</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
