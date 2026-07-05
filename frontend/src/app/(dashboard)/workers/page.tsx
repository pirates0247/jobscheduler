'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/providers/auth-provider';
import { useSocket } from '@/components/providers/socket-provider';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCardSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Cpu, Activity, Wifi, WifiOff, Clock, HardDrive, BarChart3, Heart, Trash2, ShieldAlert } from 'lucide-react';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const itemAnim = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

export default function WorkersPage() {
  const { activeOrg } = useAuth();
  const { socket } = useSocket();
  const { toast } = useToast();
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Stale/Offline worker deletion states
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchWorkers = useCallback(async () => {
    try {
      const res = await api.get('/workers');
      setWorkers(res.data.data ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  useEffect(() => {
    if (!socket) return;
    socket.on('worker:heartbeat', fetchWorkers);
    return () => {
      socket.off('worker:heartbeat', fetchWorkers);
    };
  }, [socket, fetchWorkers]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/workers/${deleteTarget.id}`);
      toast({ title: 'Worker deregistered', description: `${deleteTarget.name} has been removed.`, variant: 'success' });
      setDeleteTarget(null);
      fetchWorkers();
    } catch {
      toast({ title: 'Error', description: 'Failed to deregister the worker.', variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const online = workers.filter((w) => w.status === 'ONLINE');
  const offline = workers.filter((w) => w.status === 'OFFLINE');

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-7 w-40 bg-secondary rounded-lg animate-pulse" />
          <div className="h-4 w-56 bg-secondary/50 rounded mt-2 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-52 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemAnim} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workers</h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-normal">Monitor and manage execution nodes polling jobs from your queues.</p>
        </div>
        {offline.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              // Trigger batch delete or prompt for the first offline
              setDeleteTarget(offline[0]);
            }}
            className="hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-2" /> Clean Offline
          </Button>
        )}
      </motion.div>

      {/* Overview Cards */}
      <motion.div variants={itemAnim} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Online Nodes', value: online.length, icon: Wifi, color: 'from-emerald-500/20 to-green-600/20', iconColor: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Stale / Offline', value: offline.length, icon: WifiOff, color: 'from-rose-500/20 to-red-600/20', iconColor: 'text-rose-500', bg: 'bg-rose-500/10' },
          { label: 'Total Instances', value: workers.length, icon: Cpu, color: 'from-primary/20 to-purple-600/20', iconColor: 'text-primary', bg: 'bg-primary/10' },
        ].map((s) => (
          <div key={s.label} className="group relative bg-card border border-border/50 rounded-xl p-5 overflow-hidden transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
            <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-40 group-hover:opacity-60 transition-opacity`} />
            <div className="relative flex items-center gap-4">
              <div className={`p-3 rounded-xl ${s.bg} ring-1 ring-${s.iconColor === 'text-primary' ? 'primary' : 'border'}/20`}>
                <s.icon className={`h-5 w-5 ${s.iconColor}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{s.label}</p>
                <p className="text-3xl font-bold mt-0.5 tracking-tight">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Workers Grid */}
      {workers.length === 0 ? (
        <motion.div variants={itemAnim}>
          <Card>
            <EmptyState icon={Cpu} title="No workers registered" description="Statically or dynamically deployed nodes will register upon startup." />
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={itemAnim} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {workers.map((worker) => {
              const lastHb = worker.heartbeats?.[0];
              const isOnline = worker.status === 'ONLINE';
              const cpuValue = lastHb?.cpuPct ?? 0;
              const memValue = lastHb?.memoryMb ?? 0;

              return (
                <motion.div
                  key={worker.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="h-full border-border/50 hover:border-primary/35 hover:shadow-lg hover:shadow-primary/4 transition-all duration-300 overflow-hidden flex flex-col justify-between">
                    <CardContent className="p-5 flex-1">
                      <div className="flex items-start justify-between mb-4.5">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-xl ${isOnline ? 'bg-emerald-500/10 ring-emerald-500/20' : 'bg-secondary ring-border/20'} flex items-center justify-center ring-1`}>
                            <Cpu className={`h-5 w-5 ${isOnline ? 'text-emerald-500' : 'text-muted-foreground/60'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm tracking-tight text-foreground">{worker.name}</h3>
                              {isOnline && (
                                <span className="relative flex h-2 w-2">
                                  <span className="absolute inset-0 rounded-full bg-emerald-500" />
                                  <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-30" />
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{worker.hostname || 'local-host'}</p>
                          </div>
                        </div>
                        <Badge variant={isOnline ? 'success' : worker.status === 'DRAINING' ? 'warning' : 'default'} size="sm" className="font-semibold">
                          <Heart className={`h-3 w-3 shrink-0 mr-1 ${isOnline ? 'animate-pulse' : ''}`} />
                          {worker.status}
                        </Badge>
                      </div>

                      {/* Concurrency & Active Stats */}
                      <div className="grid grid-cols-3 gap-2 text-center mb-4.5">
                        <div className="bg-secondary/40 rounded-xl p-2 border border-border/30">
                          <span className="block font-bold text-sm tracking-tight">{worker.concurrency}</span>
                          <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider block">Limit</span>
                        </div>
                        <div className="bg-secondary/40 rounded-xl p-2 border border-border/30">
                          <span className={`block font-bold text-sm tracking-tight ${lastHb?.activeJobs > 0 ? 'text-primary' : ''}`}>
                            {lastHb?.activeJobs ?? 0}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider block">Active</span>
                        </div>
                        <div className="bg-secondary/40 rounded-xl p-2 border border-border/30">
                          <span className="block font-bold text-sm tracking-tight">{worker.queues?.length ?? 0}</span>
                          <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider block">Queues</span>
                        </div>
                      </div>

                      {/* CPU & Memory Progress Metrics */}
                      {isOnline && (
                        <div className="space-y-2.5 mb-4 pt-1 border-t border-border/20">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                              <span>CPU USAGE</span>
                              <span className="text-foreground">{cpuValue}%</span>
                            </div>
                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${cpuValue}%` }} />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                              <span>MEMORY ALLOCATION</span>
                              <span className="text-foreground">{memValue} MB</span>
                            </div>
                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${Math.min(100, (memValue / 2048) * 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>

                    {/* Footer / Actions */}
                    <div className="flex items-center justify-between px-5 py-3 border-t border-border/50 bg-secondary/15">
                      <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        Hb: {worker.lastHeartbeat ? new Date(worker.lastHeartbeat).toLocaleTimeString() : 'Never'}
                      </span>
                      {!isOnline && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(worker)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Deregister stale node"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Deregister Confirmation dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Deregister Worker Node"
        description={`Are you sure you want to remove the worker node "${deleteTarget?.name}"? If the node is still active, it may automatically re-register upon sending its next heartbeat.`}
        confirmText="Remove Worker"
        confirmVariant="destructive"
        loading={deleting}
      />
    </motion.div>
  );
}
