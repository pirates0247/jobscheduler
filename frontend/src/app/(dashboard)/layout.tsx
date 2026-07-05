'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/providers/auth-provider';
import { useSocket } from '@/components/providers/socket-provider';
import { api } from '@/lib/api';
import { CommandPalette } from '@/components/ui/command-palette';
import {
  LayoutDashboard, Layers, Terminal, Cpu, BarChart3, Users,
  LogOut, Activity, Menu, ChevronDown, ChevronLeft,
  Search, Bell, Settings, X, ArrowRight, Loader2, CheckCircle,
  AlertTriangle, Info, Plus, Zap, Workflow,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, shortcut: '1' },
  { name: 'Queues', href: '/queues', icon: Layers, shortcut: '2' },
  { name: 'Job Explorer', href: '/jobs', icon: Terminal, shortcut: '3' },
  { name: 'Workers', href: '/workers', icon: Cpu, shortcut: '4' },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, shortcut: '5' },
  { name: 'Members', href: '/members', icon: Users, shortcut: '6' },
  { name: 'Settings', href: '/settings', icon: Settings, shortcut: '7' },
];

function NavTooltip({ label, shortcut, children }: { label: string; shortcut?: string; children: React.ReactNode }) {
  return (
    <div className="group relative">
      {children}
      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-popover border border-border/60 text-popover-foreground text-xs font-medium rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 flex items-center gap-2">
        {label}
        {shortcut && <kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border/40 text-[10px] text-muted-foreground font-mono">{shortcut}</kbd>}
      </div>
    </div>
  );
}

const getNotificationMessage = (event: string, data: any): string | null => {
  switch (event) {
    case 'job:created': return `Job "${data?.name ?? data?.id?.slice(0, 8) ?? 'Unknown'}" created in "${data?.queue?.name ?? '?'}"`;
    case 'job:updated': return `Job "${data?.name ?? data?.id?.slice(0, 8) ?? 'Unknown'}" → ${data?.status ?? 'updated'}`;
    case 'queue:updated': return `Queue "${data?.name ?? '?'}" was ${data?.status === 'PAUSED' ? 'paused' : 'resumed'}`;
    case 'worker:heartbeat': return `Worker "${data?.name ?? '?'}" heartbeat (${data?.activeJobs ?? 0} active)`;
    default: return null;
  }
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, organizations, activeOrg, switchOrg, projects, activeProject, switchProject } = useAuth();
  const { socket, connected } = useSocket();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = React.useState(false);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showCreateMenu, setShowCreateMenu] = React.useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const createRef = useRef<HTMLDivElement>(null);
  const headerControlsRef = useRef<HTMLDivElement>(null);
  const mountedRef = React.useRef(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdPaletteOpen(true); }
      if (e.key === 'Escape') { setShowSearchDropdown(false); setShowNotifications(false); setShowCreateMenu(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      // Close dropdowns only when the click happens outside their containers.
      // Prevents “New” from immediately closing when clicking its button.
      if (searchRef.current && !searchRef.current.contains(target)) setShowSearchDropdown(false);
      if (notifRef.current && !notifRef.current.contains(target)) setShowNotifications(false);
      if (createRef.current && !createRef.current.contains(target)) setShowCreateMenu(false);
    };

    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);




  useEffect(() => {
    if (!socket) return;
    const addNotif = (event: string, data: any) => {
      const msg = getNotificationMessage(event, data);
      if (!msg) return;
      setNotifications((prev) => [
        { id: `${event}-${Date.now()}-${Math.random()}`, event, message: msg, timestamp: new Date(), read: false },
        ...prev.slice(0, 49),
      ]);
    };
    socket.on('job:created', (d: any) => addNotif('job:created', d));
    socket.on('job:updated', (d: any) => addNotif('job:updated', d));
    socket.on('queue:updated', (d: any) => addNotif('queue:updated', d));
    socket.on('worker:heartbeat', (d: any) => addNotif('worker:heartbeat', d));
    return () => {
      socket.off('job:created'); socket.off('job:updated');
      socket.off('queue:updated'); socket.off('worker:heartbeat');
    };
  }, [socket]);

  useEffect(() => {
    if (!searchQuery.trim() || !activeOrg || !activeProject) {
      setSearchResults([]); setShowSearchDropdown(false); return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const q = searchQuery.trim();
        const res = await api.get(`/organizations/${activeOrg.slug}/projects/${activeProject.slug}/queues`);
        const queues = res.data.data ?? [];
        const results: any[] = [];
        for (const queue of queues.slice(0, 5)) {
          const jobRes = await api.get(`/organizations/${activeOrg.slug}/projects/${activeProject.slug}/queues/${queue.name}/jobs?search=${encodeURIComponent(q)}&limit=5`);
          const jobs = jobRes.data.data.data ?? [];
          jobs.forEach((j: any) => results.push({ type: 'job', queue: queue.name, ...j }));
        }
        queues.filter((queue: any) => queue.name.toLowerCase().includes(q.toLowerCase()))
          .slice(0, 5).forEach((queue: any) => results.push({ type: 'queue', ...queue }));
        setSearchResults(results.slice(0, 10));
        setShowSearchDropdown(results.length > 0);
      } catch { setSearchResults([]); } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeOrg?.slug, activeProject?.slug]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  if (!user) return null;

  const currentPage = navigation.find((n) => pathname === n.href);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ─── DESKTOP SIDEBAR ─── */}
      <motion.aside
        layout
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        // Use CSS variables so theme switch affects sidebar properly.
        style={{ backgroundColor: 'hsl(var(--sidebar-bg))' }}
        onMouseDown={(e) => e.stopPropagation()}
      >

        <div className="flex flex-col flex-1 min-h-0">

          {/* Logo */}
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} h-16 px-4 border-b border-sidebar-border`}>
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-violet-500/20">
                C
              </div>
              {!sidebarCollapsed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <span className="font-bold text-sm tracking-tight text-foreground">Codity</span>
                  <span className="block text-[9px] font-medium text-muted-foreground/60 tracking-widest uppercase -mt-0.5">Job Scheduler</span>

                </motion.div>
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="flex items-center gap-1.5">
                <span className={`relative flex h-1.5 w-1.5 ${connected ? 'animate-pulse-dot' : ''}`}>
                  <span className={`absolute inset-0 rounded-full ${connected ? 'bg-emerald-400' : 'bg-sidebar-foreground/20'}`} />
                  {connected && <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />}
                </span>
                <span className={`text-[9px] font-semibold tracking-widest uppercase ${connected ? 'text-emerald-400' : 'text-sidebar-foreground/30'}`}>
                  {connected ? 'Live' : 'Off'}
                </span>
              </div>
            )}
          </div>

          {/* Context Switchers */}
          {!sidebarCollapsed && (
            <div className="px-3 py-3 space-y-2 border-b border-sidebar-border">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1.5 px-1">Organization</label>

                <div className="relative">
                  <select
                    value={activeOrg?.slug ?? ''}
                    onChange={(e) => switchOrg(e.target.value)}
                    className="w-full bg-sidebar-foreground/5 text-xs text-sidebar-foreground/80 rounded-lg px-3 py-2 pr-8 appearance-none border border-sidebar-border focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all cursor-pointer"
                  >
                    {organizations.map((org) => (
                      <option key={org.slug} value={org.slug} style={{ background: 'hsl(var(--sidebar-bg))', color: 'hsl(var(--sidebar-foreground))' }}>{org.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-2.5 h-3 w-3 text-muted-foreground/30 pointer-events-none" />
                </div>
              </div>
              <div>

                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1.5 px-1">Project</label>

                <div className="relative">
                  <select
                    value={activeProject?.slug ?? ''}
                    onChange={(e) => switchProject(e.target.value)}
                    disabled={projects.length === 0}
                    className="w-full bg-sidebar-foreground/5 text-xs text-sidebar-foreground/80 rounded-lg px-3 py-2 pr-8 appearance-none border border-sidebar-border focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    {projects.length === 0 ? (
                      <option style={{ background: 'hsl(var(--sidebar-bg))', color: 'hsl(var(--sidebar-foreground))' }}>No projects</option>
                    ) : (
                      projects.map((p) => (
                        <option key={p.slug} value={p.slug} style={{ background: 'hsl(var(--sidebar-bg))', color: 'hsl(var(--sidebar-foreground))' }}>{p.name}</option>
                      ))
                    )}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-2.5 h-3 w-3 text-muted-foreground/30 pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
            {navigation.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  {sidebarCollapsed ? (
                    <NavTooltip label={item.name} shortcut={item.shortcut}>
                      <div className={cn(
                        'flex items-center justify-center rounded-lg py-2.5 transition-all duration-150',
                        active
                          ? 'bg-violet-600/20 text-violet-400'
                          : 'text-sidebar-foreground/40 hover:text-sidebar-foreground/80 hover:bg-sidebar-foreground/6',
                      )}>
                        <item.icon className="h-4.5 w-4.5 shrink-0" style={{ width: '18px', height: '18px' }} />
                      </div>
                    </NavTooltip>
                  ) : (
                    <div className={cn(
                      'flex items-center rounded-lg text-sm font-medium transition-all duration-150 px-3 py-2.5 group',
                      active
                        ? 'sidebar-item-active'
                        : 'text-sidebar-foreground/50 hover:text-sidebar-foreground/90 hover:bg-sidebar-foreground/6',
                    )}>
                      <item.icon className={cn('shrink-0 mr-3', active ? 'opacity-100' : 'opacity-60 group-hover:opacity-100')} style={{ width: '16px', height: '16px' }} />
                      <span className="flex-1">{item.name}</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Collapse Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="px-3 py-2.5 border-t border-sidebar-border flex items-center justify-center text-sidebar-foreground/30 hover:text-sidebar-foreground/70 hover:bg-sidebar-foreground/5 transition-colors"
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform duration-200', sidebarCollapsed && 'rotate-180')} />
          </button>

          {/* User Profile */}
          <div className={cn('border-t border-sidebar-border flex items-center', sidebarCollapsed ? 'justify-center p-3' : 'p-3 gap-2.5')}>
            <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-violet-500/40 to-indigo-600/40 flex items-center justify-center font-bold text-xs text-sidebar-foreground/70 ring-1 ring-violet-500/20">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            {!sidebarCollapsed && (
              <>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-semibold truncate text-sidebar-foreground/90">{user.firstName} {user.lastName}</p>
                  <p className="text-[10px] text-sidebar-foreground/30 truncate">{user.email}</p>
                </div>
                <button onClick={logout} title="Logout" className="p-1.5 rounded-md hover:bg-sidebar-foreground/8 text-sidebar-foreground/30 hover:text-rose-400 transition-colors shrink-0">
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </motion.aside>

      {/* ─── MOBILE SIDEBAR ─── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex md:hidden"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{ backgroundColor: 'hsl(var(--sidebar-bg))' }}
              className="relative flex flex-col w-72 shadow-2xl border-r border-sidebar-border"
            >
              <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border">
                <div className="flex items-center space-x-2.5">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-lg">C</div>
                  <span className="font-bold text-sidebar-foreground">Codity</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-sidebar-foreground/30 hover:text-sidebar-foreground hover:bg-sidebar-foreground/8 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-3 py-3 space-y-2 border-b border-sidebar-border">
                <select value={activeOrg?.slug ?? ''} onChange={(e) => { switchOrg(e.target.value); setMobileOpen(false); }}
                  className="w-full bg-sidebar-foreground/5 text-xs text-sidebar-foreground/80 rounded-lg px-3 py-2 border border-sidebar-border cursor-pointer appearance-none">
                  {organizations.map((org) => <option key={org.slug} value={org.slug} style={{ background: 'hsl(var(--sidebar-bg))', color: 'hsl(var(--sidebar-foreground))' }}>{org.name}</option>)}
                </select>
                <select value={activeProject?.slug ?? ''} onChange={(e) => { switchProject(e.target.value); setMobileOpen(false); }}
                  className="w-full bg-sidebar-foreground/5 text-xs text-sidebar-foreground/80 rounded-lg px-3 py-2 border border-sidebar-border cursor-pointer appearance-none">
                  {projects.map((p) => <option key={p.slug} value={p.slug} style={{ background: 'hsl(var(--sidebar-bg))', color: 'hsl(var(--sidebar-foreground))' }}>{p.name}</option>)}
                </select>
              </div>
              <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
                {navigation.map((item) => (
                  <Link key={item.name} href={item.href} onClick={() => setMobileOpen(false)}>
                    <div className={cn(
                      'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      pathname === item.href ? 'sidebar-item-active' : 'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-foreground/6',
                    )}>
                      <item.icon className="h-4 w-4 mr-3 opacity-70" />
                      {item.name}
                    </div>
                  </Link>
                ))}
              </nav>
              <div className="p-3 border-t border-sidebar-border flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center font-bold text-xs text-sidebar-foreground/70 ring-1 ring-violet-500/20">
                  {user.firstName[0]}{user.lastName[0]}
                </div>
                <span className="text-sm font-semibold text-sidebar-foreground/90 flex-1">{user.firstName}</span>
                <button onClick={logout} className="p-1.5 rounded-md hover:bg-sidebar-foreground/8 text-sidebar-foreground/30 hover:text-rose-400 transition-colors">
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* ─── HEADER ─── */}
        <header className="relative flex items-center justify-between h-16 px-4 border-b border-border/60 bg-card/90 backdrop-blur-sm md:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg md:hidden hover:bg-secondary text-muted-foreground transition-colors">
              <Menu className="h-5 w-5" />
            </button>
            {/* Breadcrumb */}
            <div className="hidden md:flex items-center gap-2 text-sm">
              <span className="text-muted-foreground/60 text-xs">{activeOrg?.name}</span>
              <span className="text-muted-foreground/30">/</span>
              <span className="text-muted-foreground/60 text-xs">{activeProject?.name ?? 'No Project'}</span>
              {currentPage && (
                <>
                  <span className="text-muted-foreground/30">/</span>
                  <span className="font-semibold text-foreground text-xs">{currentPage.name}</span>
                </>
              )}
            </div>
            {/* Search */}
            <div className="hidden lg:flex relative ml-2" ref={searchRef}>
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
                placeholder="Search jobs, queues…"
                className="w-64 bg-secondary/50 border border-border/50 rounded-lg pl-8 pr-14 py-1.5 text-xs placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring focus:w-80 transition-all duration-200"
              />
              <button
                onClick={() => { setCmdPaletteOpen(true); searchInputRef.current?.blur(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[9px] text-muted-foreground/40 font-mono hover:text-muted-foreground transition-colors"
                title="Open command palette (⌘K)"
              >
                <kbd className="px-1 py-0.5 rounded bg-secondary border border-border/30 text-[9px]">⌘K</kbd>
              </button>
              <AnimatePresence>
                {showSearchDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
                    className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border/60 rounded-xl shadow-xl overflow-hidden z-50 min-w-[320px]"
                  >
                    <div className="max-h-72 overflow-y-auto p-1.5">
                      {searching && (
                        <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> Searching…
                        </div>
                      )}
                      {!searching && searchResults.map((item, i) => (
                        <button
                          key={`${item.type}-${item.id ?? item.name}-${i}`}
                          onClick={() => { router.push(item.type === 'queue' ? '/queues' : '/jobs'); setShowSearchDropdown(false); setSearchQuery(''); }}
                          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-left hover:bg-secondary/50 transition-colors"
                        >
                          <div className={`p-1 rounded ${item.type === 'job' ? 'bg-primary/10' : 'bg-amber-500/10'}`}>
                            {item.type === 'job' ? <Terminal className="h-3 w-3 text-primary" /> : <Layers className="h-3 w-3 text-amber-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{item.name ?? item.id?.slice(0, 12)}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {item.type === 'job' ? `${item.queue} · ${item.status}` : `${item.name} queue`}
                            </p>
                          </div>
                          <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Create Menu */}
            <div className="relative" ref={createRef}>
              <button
                type="button"
                onClick={() => { setShowCreateMenu((v) => !v); }}
                className="hidden md:flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20 transition-all mr-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> New
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>
            </div>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-card" />
                )}
              </button>
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.96 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-1.5 w-80 bg-card border border-border/60 rounded-xl shadow-xl overflow-hidden z-50"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
                          className="text-[10px] text-primary hover:text-primary/80 transition-colors font-medium">
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                          <Bell className="h-7 w-7 text-muted-foreground/20 mb-2" />
                          <p className="text-xs font-medium text-muted-foreground">No notifications yet</p>
                          <p className="text-[10px] text-muted-foreground/50 mt-0.5">Real-time events appear here</p>
                        </div>
                      ) : (
                        notifications.slice(0, 20).map((n) => (
                          <button
                            key={n.id}
                            onClick={() => setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x))}
                            className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-secondary/30 transition-colors border-b border-border/30 last:border-0 ${!n.read ? 'bg-primary/3' : ''}`}
                          >
                            <div className={`p-1.5 rounded-lg mt-0.5 ${n.event === 'job:created' ? 'bg-emerald-500/10' : n.event === 'job:updated' ? 'bg-sky-500/10' : n.event === 'queue:updated' ? 'bg-amber-500/10' : 'bg-primary/10'}`}>
                              {n.event === 'job:created' ? <CheckCircle className="h-3 w-3 text-emerald-500" /> :
                                n.event === 'job:updated' ? <Info className="h-3 w-3 text-sky-500" /> :
                                  n.event === 'queue:updated' ? <AlertTriangle className="h-3 w-3 text-amber-500" /> :
                                    <Activity className="h-3 w-3 text-primary" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-foreground leading-relaxed">{n.message}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <ThemeToggle />

          </div>
        </header>

        {/* ─── PAGE CONTENT ─── */}
        <main className="flex-1 relative overflow-y-auto bg-background p-4 md:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <CommandPalette open={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} />

      {showCreateMenu && (
        <div
          className="fixed right-4 top-14 w-44 bg-background border border-border/80 rounded-xl shadow-2xl shadow-black/20 z-[9999]"
          onClick={(e) => { e.stopPropagation(); }}
        >
          <div className="py-1">
            {[
              { label: 'Queue', icon: Layers, href: '/queues' },
              { label: 'Job', icon: Zap, href: '/jobs' },
              { label: 'Invite Member', icon: Users, href: '/members' },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => { router.push(item.href); setShowCreateMenu(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent/20 transition-colors"
              >
                <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

    </div >
  );
}
