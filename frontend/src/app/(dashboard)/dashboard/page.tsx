'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useSocket } from '@/components/providers/socket-provider';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Layers, CheckCircle, AlertTriangle, Play, TrendingUp, Clock,
  Activity, Zap, Plus, ArrowRight, Cpu, Workflow, Terminal, Send, BarChart3, ShieldAlert
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StatCardSkeleton } from '@/components/ui/skeleton';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

const statCards = [
  { key: 'TOTAL', name: 'Total Job Count', icon: Layers, color: 'from-violet-600/10 to-indigo-600/10', iconColor: 'text-violet-400', ringColor: 'ring-violet-500/20', description: 'All time enqueued jobs' },
  { key: 'RUNNING', name: 'Executing Now', icon: Play, color: 'from-sky-500/10 to-cyan-500/10', iconColor: 'text-sky-400', ringColor: 'ring-sky-500/20', description: 'Currently running nodes' },
  { key: 'COMPLETED', name: 'Succeeded Jobs', icon: CheckCircle, color: 'from-emerald-500/10 to-green-500/10', iconColor: 'text-emerald-400', ringColor: 'ring-emerald-500/20', description: 'Successfully finished' },
  { key: 'FAILED', name: 'Failures & DLQ', icon: AlertTriangle, color: 'from-rose-500/10 to-red-500/10', iconColor: 'text-rose-400', ringColor: 'ring-rose-500/20', description: 'Dead-lettered messages' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-xs text-muted-foreground mb-1.5 font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { activeOrg, activeProject } = useAuth();
  const { socket } = useSocket();
  const router = useRouter();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [queues, setQueues] = useState<any[]>([]);

  const fetchMetrics = useCallback(async () => {
    if (!activeOrg) return;
    try {
      const res = await api.get(`/organizations/${activeOrg.slug}/dashboard/metrics`);
      setMetrics(res.data.data);
    } catch {
      /* ignored */
    } finally {
      setLoading(false);
    }
  }, [activeOrg?.slug]);

  const fetchRecentJobs = useCallback(async () => {
    if (!activeOrg || !activeProject) return;
    try {
      const qsRes = await api.get(`/organizations/${activeOrg.slug}/projects/${activeProject.slug}/queues`);
      const qs = qsRes.data.data ?? [];
      setQueues(qs);
      const all: any[] = [];
      for (const q of qs.slice(0, 3)) {
        const res = await api.get(`/organizations/${activeOrg.slug}/projects/${activeProject.slug}/queues/${q.name}/jobs?limit=5`);
        all.push(...(res.data.data.data ?? []).map((j: any) => ({ ...j, queueName: q.name })));
      }
      all.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRecentJobs(all.slice(0, 6));
    } catch {
      /* ignore */
    }
  }, [activeOrg?.slug, activeProject?.slug]);

  useEffect(() => {
    fetchRecentJobs();
  }, [fetchRecentJobs]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => {
      fetchMetrics();
      fetchRecentJobs();
    };
    socket.on('job:created', refresh);
    socket.on('job:updated', refresh);
    socket.on('worker:heartbeat', refresh);
    socket.on('queue:updated', refresh);
    return () => {
      socket.off('job:created', refresh);
      socket.off('job:updated', refresh);
      socket.off('worker:heartbeat', refresh);
      socket.off('queue:updated', refresh);
    };
  }, [socket, fetchMetrics, fetchRecentJobs]);

  if (loading || !metrics) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-7 w-48 bg-secondary rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-secondary/50 rounded mt-2 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-80 bg-card border border-border rounded-xl animate-pulse" />
      </div>
    );
  }

  const { stats, activeWorkers, avgProcessingTimeMs, charts } = metrics;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Title */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time status updates and execution metrics for enqueued operations.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/5 rounded-full px-3 py-1.5 border border-emerald-500/15">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 rounded-full bg-emerald-400" />
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-45" />
          </span>
          Live connection active
        </div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={item} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const value = card.key === 'FAILED' ? (stats.FAILED || 0) + (stats.DEAD_LETTER || 0) : (stats[card.key] || 0);
          return (
            <div
              key={card.key}
              className="group relative bg-card border border-border/50 rounded-xl overflow-hidden transition-all duration-300 hover:border-primary/45 hover:shadow-lg hover:shadow-primary/3"
            >
              <div className="relative p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{card.name}</p>
                    <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
                    <p className="text-[10px] text-muted-foreground/60">{card.description}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${card.color} ring-1 ${card.ringColor} ${card.iconColor} shrink-0`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Active Workers & Metrics */}
      <motion.div variants={item} className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="bg-card border border-border/50 rounded-xl p-5 hover:border-primary/20 transition-all duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/25">
              <Activity className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Workers</span>
          </div>
          <p className="text-3xl font-bold tracking-tight text-foreground">{activeWorkers}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <Badge variant="success" size="sm">
              Online & Polling
            </Badge>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-5 hover:border-primary/20 transition-all duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-amber-500/10 ring-1 ring-amber-500/25">
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Average Latency</span>
          </div>
          <p className="text-3xl font-bold tracking-tight text-foreground">
            {avgProcessingTimeMs > 0 ? `${(avgProcessingTimeMs / 1000).toFixed(2)}s` : '0.00s'}
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-2">Claim to completion processing delay</p>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-5 hover:border-primary/20 transition-all duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-violet-500/10 ring-1 ring-violet-500/25">
              <Zap className="h-4 w-4 text-violet-400" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Throughput Volume</span>
          </div>
          <p className="text-3xl font-bold tracking-tight text-foreground">{stats.COMPLETED || 0}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-2">Succeeded jobs processed by cluster</p>
        </div>
      </motion.div>

      {/* Chart */}
      <motion.div variants={item} className="bg-card border border-border/50 rounded-xl p-6 hover:border-primary/20 transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="font-semibold text-sm">Execution History Graph</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Succeeded vs failed job records (7-day trend)</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span className="text-muted-foreground">Failed</span>
            </div>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={charts} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="failedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} dy={8} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '3 3' }} />
              <Area
                type="monotone"
                dataKey="completed"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#completedGrad)"
                name="Completed"
                dot={false}
                activeDot={{ r: 4, stroke: '#10b981', strokeWidth: 2, fill: '#10b981' }}
              />
              <Area
                type="monotone"
                dataKey="failed"
                stroke="#f43f5e"
                strokeWidth={2.5}
                fill="url(#failedGrad)"
                name="Failed"
                dot={false}
                activeDot={{ r: 4, stroke: '#f43f5e', strokeWidth: 2, fill: '#f43f5e' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Quick Actions & Recent Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <motion.div variants={item} className="space-y-3">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Quick Shortcuts</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push('/queues')}
              className="group bg-card border border-border/50 rounded-xl p-4 text-left transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="p-2 rounded-lg bg-primary/10 ring-1 ring-primary/20 w-fit mb-3">
                <Plus className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs font-bold text-foreground">Create Queue</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">New task pipeline</p>
            </button>
            <button
              onClick={() => router.push('/jobs')}
              className="group bg-card border border-border/50 rounded-xl p-4 text-left transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="p-2 rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/25 w-fit mb-3">
                <Send className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-xs font-bold text-foreground">Submit Job</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">Enqueue new work</p>
            </button>
            <button
              onClick={() => router.push('/workers')}
              className="group bg-card border border-border/50 rounded-xl p-4 text-left transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="p-2 rounded-lg bg-amber-500/10 ring-1 ring-amber-500/25 w-fit mb-3">
                <Cpu className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-xs font-bold text-foreground">Monitor Cluster</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">View polling nodes</p>
            </button>
            <button
              onClick={() => router.push('/analytics')}
              className="group bg-card border border-border/50 rounded-xl p-4 text-left transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="p-2 rounded-lg bg-sky-500/10 ring-1 ring-sky-500/25 w-fit mb-3">
                <BarChart3 className="h-4 w-4 text-sky-400" />
              </div>
              <p className="text-xs font-bold text-foreground">Analytics Matrix</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">Performance charts</p>
            </button>
          </div>
        </motion.div>

        {/* Recent Jobs */}
        <motion.div variants={item} className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Recent Job Messages</h3>
            <button
              onClick={() => router.push('/jobs')}
              className="text-[10px] text-primary hover:text-primary/80 transition-colors font-semibold flex items-center gap-1"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="bg-card border border-border/50 rounded-xl overflow-hidden hover:border-primary/20 transition-all shadow-sm">
            {recentJobs.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                <Terminal className="h-4 w-4 mr-2 opacity-50" /> No recent jobs Submitted.
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {recentJobs.map((job) => {
                  const statusCfg: Record<string, { color: string; bg: string }> = {
                    COMPLETED: { color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    FAILED: { color: 'text-rose-500', bg: 'bg-rose-500/10' },
                    RUNNING: { color: 'text-sky-500', bg: 'bg-sky-500/10' },
                    QUEUED: { color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    DEAD_LETTER: { color: 'text-destructive', bg: 'bg-destructive/10' },
                    RETRYING: { color: 'text-amber-500', bg: 'bg-amber-500/10' },
                    CANCELLED: { color: 'text-muted-foreground', bg: 'bg-secondary' },
                  };
                  const cfg = statusCfg[job.status] ?? { color: 'text-muted-foreground', bg: 'bg-secondary' };
                  return (
                    <div
                      key={job.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors cursor-pointer"
                      onClick={() => router.push('/jobs')}
                    >
                      <div className={`p-1.5 rounded-lg ${cfg.bg} shrink-0`}>
                        <Activity className={`h-3.5 w-3.5 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{job.name || job.id.slice(0, 12)}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Queue: {job.queueName} · Type: {job.type}
                        </p>
                      </div>
                      <Badge
                        variant={
                          job.status === 'COMPLETED'
                            ? 'success'
                            : job.status === 'FAILED' || job.status === 'DEAD_LETTER'
                            ? 'error'
                            : job.status === 'RUNNING'
                            ? 'info'
                            : job.status === 'RETRYING'
                            ? 'warning'
                            : 'default'
                        }
                        size="sm"
                        className="font-bold"
                      >
                        {job.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Queue Health Overview */}
      <motion.div variants={item} className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pipeline Health Status</h3>
          <button
            onClick={() => router.push('/queues')}
            className="text-[10px] text-primary hover:text-primary/80 transition-colors font-semibold flex items-center gap-1"
          >
            Manage pipelines <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {queues.length === 0 ? (
            <div className="lg:col-span-4 flex items-center justify-center py-6 bg-card border border-border/50 rounded-xl text-xs text-muted-foreground">
              <Workflow className="h-4 w-4 mr-2 opacity-50" /> No queues configured in workspace.
            </div>
          ) : (
            queues.slice(0, 4).map((q) => (
              <div
                key={q.id}
                className="group bg-card border border-border/50 rounded-xl p-4 transition-all duration-200 hover:border-primary/35 hover:shadow-md cursor-pointer"
                onClick={() => router.push('/queues')}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600/10 to-indigo-600/10 flex items-center justify-center border border-violet-500/10 shrink-0">
                      <Workflow className="h-4.5 w-4.5 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight text-foreground">{q.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Pipeline</p>
                    </div>
                  </div>
                  <Badge variant={q.status === 'ACTIVE' ? 'success' : 'warning'} size="sm" className="font-semibold">
                    {q.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60 border-t border-border/30 pt-2.5 mt-2">
                  <span>Priority {q.priority}</span>
                  <span className="text-border/50">|</span>
                  <span>{q.concurrencyLimit} conc</span>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
