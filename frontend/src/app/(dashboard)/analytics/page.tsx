'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/providers/auth-provider';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Clock, PieChart, Calendar, RefreshCw, Layers, Sparkles } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart as RPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS: Record<string, string> = {
  QUEUED: '#3b82f6',
  SCHEDULED: '#8b5cf6',
  RUNNING: '#06b6d4',
  COMPLETED: '#10b981',
  FAILED: '#f43f5e',
  RETRYING: '#f59e0b',
  DEAD_LETTER: '#ef4444',
  CANCELLED: '#6b7280',
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } } };

const ChartTooltip = ({ active, payload, label }: any) => {
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

export default function AnalyticsPage() {
  const { activeOrg } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [queueStats, setQueueStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');

  useEffect(() => {
    const fetchAll = async () => {
      if (!activeOrg) return;
      setLoading(true);
      try {
        const [metricsRes] = await Promise.all([
          api.get(`/organizations/${activeOrg.slug}/dashboard/metrics`),
        ]);
        setMetrics(metricsRes.data.data);

        const projRes = await api.get(`/organizations/${activeOrg.slug}/projects`);
        const projects = projRes.data.data.data ?? [];
        const allStats: any[] = [];
        for (const proj of projects) {
          const queuesRes = await api.get(`/organizations/${activeOrg.slug}/projects/${proj.slug}/queues`);
          const queues = queuesRes.data.data ?? [];
          for (const q of queues) {
            const statsRes = await api.get(`/organizations/${activeOrg.slug}/projects/${proj.slug}/queues/${q.name}/stats`);
            allStats.push({
              queueName: q.name,
              projectName: proj.name,
              ...statsRes.data.data,
            });
          }
        }
        setQueueStats(allStats);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [activeOrg?.slug]);

  if (loading || !metrics) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-56 mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-80 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const { stats, charts, avgProcessingTimeMs } = metrics;
  const pieData = Object.entries(stats)
    .filter(([k]) => k !== 'TOTAL')
    .map(([name, value]) => ({
      name,
      value: value as number,
      color: COLORS[name] ?? '#6b7280',
    }));

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Execution performance, queue capacity distribution, and latency aggregates.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Calendar className="h-4 w-4 text-muted-foreground/60" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-secondary/50 border border-border/50 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer text-muted-foreground hover:text-foreground font-semibold"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </motion.div>

      {/* Dynamic Grid KPIs */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Avg Latency', value: avgProcessingTimeMs > 0 ? `${(avgProcessingTimeMs / 1000).toFixed(2)}s` : '0s', desc: 'Job execution delay' },
          { label: 'Success Rate', value: stats.TOTAL > 0 ? `${(((stats.COMPLETED || 0) / stats.TOTAL) * 100).toFixed(1)}%` : '0%', desc: 'Completed vs Failures' },
          { label: 'Total Processing', value: stats.TOTAL ?? 0, desc: 'Jobs scheduled all-time' },
          { label: 'Error Ratio', value: stats.TOTAL > 0 ? `${(((stats.FAILED || 0) / stats.TOTAL) * 100).toFixed(1)}%` : '0%', desc: 'Failed execution logs' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card border border-border/50 rounded-xl p-4.5">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">{kpi.label}</span>
            <span className="text-2xl font-bold tracking-tight text-foreground block mt-1">{kpi.value}</span>
            <span className="text-[10px] text-muted-foreground/60 block mt-0.5">{kpi.desc}</span>
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={item}>
          <Card className="border-border/50 hover:border-primary/20 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span className="font-semibold text-sm">Daily Throughput Trend</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="fGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} dy={8} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '3 3' }} />
                    <Legend verticalAlign="top" height={36} iconSize={8} />
                    <Area type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2.5} fill="url(#aGrad)" name="Completed" dot={false} />
                    <Area type="monotone" dataKey="failed" stroke="#f43f5e" strokeWidth={2.5} fill="url(#fGrad)" name="Failed" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-border/50 hover:border-primary/20 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Status Distribution</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RPieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={96} paddingAngle={3} dataKey="value">
                      {pieData.map((e, i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend verticalAlign="bottom" height={36} iconSize={8} />
                  </RPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-border/50 hover:border-primary/20 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-amber-500" />
                <span className="font-semibold text-sm">Queue Job Volume Distribution</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {queueStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={queueStats} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis dataKey="queueName" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} dy={5} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
                      <Legend verticalAlign="top" height={36} iconSize={8} />
                      <Bar dataKey="QUEUED" fill="#3b82f6" radius={[2, 2, 0, 0]} name="Queued" />
                      <Bar dataKey="RUNNING" fill="#06b6d4" radius={[2, 2, 0, 0]} name="Running" />
                      <Bar dataKey="COMPLETED" fill="#10b981" radius={[2, 2, 0, 0]} name="Completed" />
                      <Bar dataKey="FAILED" fill="#f43f5e" radius={[2, 2, 0, 0]} name="Failed" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No active queue data captured.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-border/50 hover:border-primary/20 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Aggregate Summary Matrix</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {pieData.map((s) => (
                  <div key={s.name} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-xs font-semibold capitalize text-muted-foreground">{s.name.toLowerCase().replace('_', ' ')}</span>
                    </div>
                    <span className="text-xs font-bold text-foreground">{s.value}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <span className="text-xs font-bold text-foreground">Total Enqueued Messages</span>
                  <span className="text-sm font-extrabold text-primary">{stats.TOTAL ?? 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {queueStats.length > 0 && (
        <motion.div variants={item}>
          <Card className="overflow-hidden border-border/50 hover:border-primary/15 transition-all shadow-sm">
            <CardHeader>
              <h3 className="font-semibold text-sm">Per-Queue Detail Breakdown</h3>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-secondary/30">
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Project Scope</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Queue Pipeline</th>
                    <th className="text-center px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Queued</th>
                    <th className="text-center px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Running</th>
                    <th className="text-center px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Completed</th>
                    <th className="text-center px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Failed</th>
                    <th className="text-center px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">DLQ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {queueStats.map((qs, i) => (
                    <tr key={i} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">{qs.projectName}</td>
                      <td className="px-4 py-3.5 font-bold text-xs text-foreground">{qs.queueName}</td>
                      <td className="px-4 py-3.5 text-center text-xs font-semibold">{qs.QUEUED ?? 0}</td>
                      <td className="px-4 py-3.5 text-center text-xs font-semibold">{qs.RUNNING ?? 0}</td>
                      <td className="px-4 py-3.5 text-center text-xs text-emerald-500 font-semibold">{qs.COMPLETED ?? 0}</td>
                      <td className="px-4 py-3.5 text-center text-xs text-rose-500 font-semibold">{qs.FAILED ?? 0}</td>
                      <td className="px-4 py-3.5 text-center text-xs text-destructive font-semibold">{qs.DEAD_LETTER ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
