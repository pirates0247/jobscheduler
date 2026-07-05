'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/providers/auth-provider';
import { useSocket } from '@/components/providers/socket-provider';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Drawer } from '@/components/ui/drawer';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import {
  Terminal, Search, Clock, CheckCircle, Play, RotateCcw, XCircle, AlertCircle,
  ChevronLeft, ChevronRight, ChevronDown, Plus, Send, Calendar, Code2, Tag,
  Cpu, Activity, RefreshCw, X, ShieldAlert, ArrowUpRight, Copy, Check
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { variant: 'info' | 'purple' | 'success' | 'warning' | 'error'; icon: React.ElementType }> = {
  QUEUED: { variant: 'info', icon: Clock },
  SCHEDULED: { variant: 'purple', icon: Clock },
  CLAIMED: { variant: 'info', icon: Play },
  RUNNING: { variant: 'info', icon: Play },
  COMPLETED: { variant: 'success', icon: CheckCircle },
  RETRYING: { variant: 'warning', icon: RotateCcw },
  FAILED: { variant: 'error', icon: XCircle },
  DEAD_LETTER: { variant: 'error', icon: AlertCircle },
  CANCELLED: { variant: 'default' as any, icon: XCircle },
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const rowItem = { hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } };

export default function JobsPage() {
  const { activeOrg, activeProject } = useAuth();
  const { socket } = useSocket();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedQueue, setSelectedQueue] = useState('');
  const [queues, setQueues] = useState<any[]>([]);
  
  // Drawer & detail viewing
  const [viewingJob, setViewingJob] = useState<any>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Job Submission Form
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [jobForm, setJobForm] = useState({
    name: '', queueName: '', type: 'IMMEDIATE', payload: '{\n  "userId": "usr_99",\n  "action": "sync_profile"\n}', priority: 0,
    runAt: '', cronExpression: '', idempotencyKey: '', tags: '',
  });
  const [jobFormError, setJobFormError] = useState<string | null>(null);
  const [creatingJob, setCreatingJob] = useState(false);
  const [payloadError, setPayloadError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!activeOrg || !activeProject) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);

      const qsRes = await api.get(`/organizations/${activeOrg.slug}/projects/${activeProject.slug}/queues`);
      const qs = qsRes.data.data ?? [];
      setQueues(qs);

      if (selectedQueue) {
        const res = await api.get(`/organizations/${activeOrg.slug}/projects/${activeProject.slug}/queues/${selectedQueue}/jobs?${params}`);
        setJobs(res.data.data.data ?? []);
        setTotalPages(Math.ceil((res.data.data.total ?? 0) / 20));
      } else {
        const all: any[] = [];
        let total = 0;
        for (const q of qs) {
          const res = await api.get(`/organizations/${activeOrg.slug}/projects/${activeProject.slug}/queues/${q.name}/jobs?${params}`);
          all.push(...(res.data.data.data ?? []).map((j: any) => ({ ...j, queueName: q.name })));
          total += res.data.data.total ?? 0;
        }
        all.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setJobs(all.slice(0, 20));
        setTotalPages(Math.ceil(total / 20));
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [activeOrg?.slug, activeProject?.slug, page, search, statusFilter, typeFilter, selectedQueue]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchJobs();
    socket.on('job:created', refresh);
    socket.on('job:updated', refresh);
    return () => {
      socket.off('job:created', refresh);
      socket.off('job:updated', refresh);
    };
  }, [socket, fetchJobs]);

  const handleCancel = async (queueName: string, jobId: string) => {
    try {
      await api.post(`/organizations/${activeOrg!.slug}/projects/${activeProject!.slug}/queues/${queueName}/jobs/${jobId}/cancel`);
      toast({ title: 'Job Cancelled', description: 'Job request aborted.', variant: 'warning' });
      fetchJobs();
    } catch {
      toast({ title: 'Error', variant: 'error', description: 'Failed to cancel the job.' });
    }
  };

  const handleRetry = async (queueName: string, jobId: string) => {
    try {
      await api.post(`/organizations/${activeOrg!.slug}/projects/${activeProject!.slug}/queues/${queueName}/jobs/${jobId}/retry`);
      toast({ title: 'Job Requeued', description: 'Job set for retry.', variant: 'success' });
      fetchJobs();
    } catch {
      toast({ title: 'Error', variant: 'error', description: 'Failed to retry the job.' });
    }
  };

  const handleViewJob = async (queueName: string, jobId: string) => {
    try {
      const res = await api.get(`/organizations/${activeOrg!.slug}/projects/${activeProject!.slug}/queues/${queueName}/jobs/${jobId}`);
      setViewingJob({ ...res.data.data, queueName });
    } catch {
      toast({ title: 'Error', description: 'Could not load job details.', variant: 'error' });
    }
  };

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    toast({ title: 'Copied', description: 'Job ID copied to clipboard.', variant: 'success' });
  };

  const getQueueName = (queueId: string) => queues.find((q) => q.id === queueId)?.name ?? queueId?.slice(0, 8);

  if (!activeProject) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <EmptyState icon={Terminal} title="No project selected" description="Select a project to explore job history and analytics." />
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={rowItem} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Job Explorer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Explore active payloads, queue statuses, error logs, and execution steps.</p>
        </div>
        <Button
          onClick={() => {
            if (!activeProject) return;
            setJobForm({ ...jobForm, queueName: selectedQueue || queues[0]?.name || '' });
            setShowCreateJob(true);
          }}
          disabled={!activeProject}
        >
          <Plus className="h-4 w-4" /> Submit Job
        </Button>
      </motion.div>

      {/* Filters Bar */}
      <motion.div variants={rowItem} className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by job name/ID..."
            className="w-full bg-secondary/50 border border-border/50 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-all placeholder:text-muted-foreground/45"
          />
        </div>
        <div className="relative">
          <select
            value={selectedQueue}
            onChange={(e) => {
              setSelectedQueue(e.target.value);
              setPage(1);
            }}
            className="bg-secondary/50 border border-border/50 rounded-xl px-3 py-2 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-all cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <option value="">All Queues</option>
            {queues.map((q) => (
              <option key={q.name} value={q.name}>
                {q.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-3 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-secondary/50 border border-border/50 rounded-xl px-3 py-2 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-all cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <option value="">All Statuses</option>
            {Object.keys(STATUS_CONFIG).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-3 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="bg-secondary/50 border border-border/50 rounded-xl px-3 py-2 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-all cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <option value="">All Types</option>
            <option value="IMMEDIATE">Immediate</option>
            <option value="DELAYED">Delayed</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="RECURRING">Recurring</option>
            <option value="BATCH">Batch</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-3 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
        </div>
        <Button variant="secondary" onClick={() => { setSearch(''); setStatusFilter(''); setTypeFilter(''); setSelectedQueue(''); setPage(1); }} className="h-[38px] px-3.5 text-xs">
          Clear Filters
        </Button>
      </motion.div>

      {/* Table grid */}
      {loading ? (
        <motion.div variants={rowItem}>
          <Card className="p-4">
            <TableSkeleton rows={6} />
          </Card>
        </motion.div>
      ) : jobs.length === 0 ? (
        <motion.div variants={rowItem}>
          <Card>
            <EmptyState icon={Terminal} title="No jobs found" description="No jobs match the current search filters." />
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={rowItem}>
          <Card className="overflow-hidden border-border/60 hover:border-primary/20 transition-all duration-300 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-secondary/30">
                    <th className="text-left px-4 py-3.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Job Name / ID</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Queue Name</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Status</th>
                    <th className="text-center px-4 py-3.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Attempts</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Created</th>
                    <th className="text-right px-4 py-3.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  <AnimatePresence>
                    {jobs.map((job) => {
                      const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.QUEUED;
                      const Icon = cfg.icon;
                      const qName = job.queueName ?? getQueueName(job.queueId);
                      return (
                        <motion.tr
                          key={job.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-secondary/20 transition-colors cursor-pointer group"
                          onClick={() => handleViewJob(qName, job.id)}
                        >
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-foreground truncate max-w-[200px]" title={job.name}>
                              {job.name || <span className="font-mono text-muted-foreground/60 text-xs">{job.id.slice(0, 12)}...</span>}
                            </div>
                            {job.name && <span className="text-[10px] font-mono text-muted-foreground/60 block mt-0.5">{job.id.slice(0, 8)}</span>}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">{qName}</td>
                          <td className="px-4 py-3.5">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-lg border border-border/20">
                              {job.type}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge variant={cfg.variant} size="sm">
                              <Icon className="h-3 w-3 shrink-0" />
                              {job.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 text-center text-xs font-semibold">
                            {job.attempts} <span className="text-muted-foreground/50">/</span> {job.maxRetries}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">
                            {new Date(job.createdAt).toLocaleDateString()}{' '}
                            <span className="text-muted-foreground/60 ml-1">
                              {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {(job.status === 'QUEUED' || job.status === 'SCHEDULED' || job.status === 'RETRYING') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCancel(qName, job.id)}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {(job.status === 'FAILED' || job.status === 'DEAD_LETTER' || job.status === 'CANCELLED') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRetry(qName, job.id)}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}

      {totalPages > 1 && (
        <motion.div variants={rowItem} className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Submit New Job Modal */}
      <Modal open={showCreateJob} onClose={() => setShowCreateJob(false)} title="Submit New Job" description="Enqueue a new task message with metadata onto a scheduling pipeline." className="max-w-xl">
        {jobFormError && (
          <div className="bg-destructive/8 border border-destructive/20 text-destructive text-xs rounded-xl p-3.5 mb-4 font-medium">
            {jobFormError}
          </div>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setCreatingJob(true);
            setJobFormError(null);
            setPayloadError(null);
            let parsedPayload = {};
            if (jobForm.payload.trim()) {
              try {
                parsedPayload = JSON.parse(jobForm.payload);
              } catch {
                setPayloadError('Invalid JSON structure. Please verify keys and quotes.');
                setCreatingJob(false);
                return;
              }
            }
            const qName = jobForm.queueName || queues[0]?.name;
            if (!qName) {
              setJobFormError('No queues available in this project. Please create a queue pipeline first.');
              setCreatingJob(false);
              return;
            }
            try {
              await api.post(`/organizations/${activeOrg!.slug}/projects/${activeProject!.slug}/queues/${qName}/jobs`, {
                name: jobForm.name || undefined,
                type: jobForm.type,
                payload: parsedPayload,
                priority: jobForm.priority,
                runAt: jobForm.runAt || undefined,
                cronExpression: jobForm.cronExpression || undefined,
                idempotencyKey: jobForm.idempotencyKey || undefined,
                tags: jobForm.tags ? jobForm.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : undefined,
              });
              toast({ title: 'Job enqueued', description: `Job successfully sent to ${qName} pipeline.`, variant: 'success' });
              setShowCreateJob(false);
              setJobForm({
                name: '', queueName: '', type: 'IMMEDIATE', payload: '{\n  "userId": "usr_99",\n  "action": "sync_profile"\n}', priority: 0,
                runAt: '', cronExpression: '', idempotencyKey: '', tags: '',
              });
              fetchJobs();
            } catch (err: any) {
              setJobFormError(err.response?.data?.message ?? 'Failed to submit the job.');
            } finally {
              setCreatingJob(false);
            }
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3.5">
            <Input
              label="Job Name / Tag Label"
              value={jobForm.name}
              onChange={(e) => setJobForm({ ...jobForm, name: e.target.value })}
              placeholder="e.g. process-invoice"
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">Select Queue</label>
              <div className="relative">
                <select
                  value={jobForm.queueName}
                  onChange={(e) => setJobForm({ ...jobForm, queueName: e.target.value })}
                  className="w-full bg-secondary/50 border border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer appearance-none text-foreground"
                >
                  {queues.length === 0 && <option>No queues configured</option>}
                  {queues.map((q) => (
                    <option key={q.name} value={q.name}>
                      {q.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">Execution Pattern</label>
              <div className="relative">
                <select
                  value={jobForm.type}
                  onChange={(e) => setJobForm({ ...jobForm, type: e.target.value })}
                  className="w-full bg-secondary/50 border border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer appearance-none text-foreground"
                >
                  <option value="IMMEDIATE">Immediate (ASAP)</option>
                  <option value="DELAYED">Delayed</option>
                  <option value="SCHEDULED">Scheduled (Epoch)</option>
                  <option value="RECURRING">Recurring (Cron)</option>
                </select>
                <ChevronDown className="absolute right-3 top-3 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
              </div>
            </div>
            <Input
              label="Priority Level (0-100)"
              type="number"
              value={jobForm.priority}
              onChange={(e) => setJobForm({ ...jobForm, priority: parseInt(e.target.value) || 0 })}
              min={0}
              max={100}
            />
          </div>

          {(jobForm.type === 'DELAYED' || jobForm.type === 'SCHEDULED') && (
            <Input
              label={jobForm.type === 'DELAYED' ? 'Execution Delay (At Timestamp)' : 'Scheduled Date'}
              type="datetime-local"
              value={jobForm.runAt}
              onChange={(e) => setJobForm({ ...jobForm, runAt: e.target.value })}
            />
          )}

          {jobForm.type === 'RECURRING' && (
            <div className="bg-secondary/20 border border-border/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" /> Cron Settings
              </div>
              <Input
                label="Expression Pattern"
                value={jobForm.cronExpression}
                onChange={(e) => setJobForm({ ...jobForm, cronExpression: e.target.value })}
                placeholder="e.g. */10 * * * *"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { val: '*/5 * * * *', label: '5m' },
                  { val: '0 * * * *', label: 'Hourly' },
                  { val: '0 0 * * *', label: 'Daily' },
                  { val: '0 0 * * 0', label: 'Weekly' },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setJobForm({ ...jobForm, cronExpression: preset.val })}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-bold tracking-wide uppercase transition-colors ${
                      jobForm.cronExpression === preset.val
                        ? 'bg-primary/15 text-primary border border-primary/35'
                        : 'bg-secondary/60 hover:bg-secondary text-muted-foreground border border-border/30'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground">Payload Editor</label>
            <div className="relative">
              <textarea
                value={jobForm.payload}
                onChange={(e) => {
                  setJobForm({ ...jobForm, payload: e.target.value });
                  setPayloadError(null);
                }}
                className="w-full bg-black/40 border border-border/50 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-none h-28 text-emerald-400 placeholder:text-muted-foreground/30"
                spellCheck={false}
              />
            </div>
            {payloadError && <p className="text-xs text-destructive font-medium">{payloadError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <Input
              label="Idempotency Key"
              value={jobForm.idempotencyKey}
              onChange={(e) => setJobForm({ ...jobForm, idempotencyKey: e.target.value })}
              placeholder="UUID or unique token"
            />
            <Input
              label="Labels / Tags (comma-separated)"
              value={jobForm.tags}
              onChange={(e) => setJobForm({ ...jobForm, tags: e.target.value })}
              placeholder="backend, worker-core"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border/40">
            <Button variant="secondary" type="button" onClick={() => setShowCreateJob(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creatingJob}>
              <Send className="h-4 w-4" /> Submit to Queue
            </Button>
          </div>
        </form>
      </Modal>

      {/* Job Details Sliding Drawer */}
      <Drawer
        open={viewingJob !== null}
        onClose={() => setViewingJob(null)}
        title={
          viewingJob && (
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-foreground bg-secondary/80 px-2 py-0.5 rounded-lg border border-border/20">
                {viewingJob.name || 'Job Info'}
              </span>
              <Badge variant={STATUS_CONFIG[viewingJob.status]?.variant ?? 'default'} size="sm">
                {viewingJob.status}
              </Badge>
            </div>
          )
        }
        description="Detailed diagnostics, parameters, and logs for the selected task execution."
        size="lg"
      >
        {viewingJob && (
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-secondary/20 border border-border/30 rounded-xl p-3.5">
                <span className="block text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Job ID</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-[11px] truncate text-foreground flex-1">{viewingJob.id}</span>
                  <button
                    onClick={() => copyId(viewingJob.id)}
                    className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title="Copy job ID"
                  >
                    {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div className="bg-secondary/20 border border-border/30 rounded-xl p-3.5">
                <span className="block text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Queue Name</span>
                <span className="block text-xs font-semibold text-foreground mt-1.5">{viewingJob.queueName}</span>
              </div>
            </div>

            {/* Timings */}
            <div className="bg-secondary/10 border border-border/20 rounded-xl p-4.5 space-y-2.5">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Timestamps</h4>
              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <div className="flex justify-between border-b border-border/20 pb-1.5">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium text-foreground">{new Date(viewingJob.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-border/20 pb-1.5 pl-4">
                  <span className="text-muted-foreground">Attempts</span>
                  <span className="font-bold text-foreground">
                    {viewingJob.attempts} <span className="text-muted-foreground/60 font-normal">/ {viewingJob.maxRetries}</span>
                  </span>
                </div>
                {viewingJob.startedAt && (
                  <div className="flex justify-between border-b border-border/20 pb-1.5 col-span-2">
                    <span className="text-muted-foreground">Started Execution</span>
                    <span className="font-medium text-foreground">{new Date(viewingJob.startedAt).toLocaleString()}</span>
                  </div>
                )}
                {viewingJob.completedAt && (
                  <div className="flex justify-between col-span-2">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="font-medium text-foreground">{new Date(viewingJob.completedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {viewingJob.errorMessage && (
              <div className="bg-destructive/8 border border-destructive/20 text-destructive rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                  <ShieldAlert className="h-4 w-4 shrink-0" /> Execution Failure Exception
                </div>
                <p className="text-xs font-mono leading-relaxed bg-black/20 p-2.5 rounded-lg border border-destructive/10 overflow-x-auto whitespace-pre-wrap">
                  {viewingJob.errorMessage}
                </p>
              </div>
            )}

            {/* Payload & Result */}
            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">Input Parameters (Payload)</h4>
              <pre className="bg-black/35 border border-border/40 rounded-xl p-4 text-xs font-mono text-emerald-400 overflow-x-auto max-h-48">
                {JSON.stringify(viewingJob.payload, null, 2)}
              </pre>
            </div>

            {viewingJob.result && (
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">Output Result</h4>
                <pre className="bg-black/35 border border-border/40 rounded-xl p-4 text-xs font-mono text-sky-400 overflow-x-auto max-h-48">
                  {JSON.stringify(viewingJob.result, null, 2)}
                </pre>
              </div>
            )}

            {/* Logs */}
            {viewingJob.executionLogs?.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Console Logs</h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {viewingJob.executionLogs.map((log: any) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-2.5 bg-secondary/20 rounded-xl px-3.5 py-2.5 text-[11px] border border-border/30"
                    >
                      <span
                        className={`font-bold shrink-0 uppercase text-[9px] tracking-wider px-1.5 py-0.5 rounded-md ${
                          log.level === 'error'
                            ? 'bg-destructive/10 text-destructive border border-destructive/20'
                            : log.level === 'warn'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                            : 'bg-secondary text-muted-foreground border border-border/30'
                        }`}
                      >
                        {log.level}
                      </span>
                      <span className="text-muted-foreground shrink-0 mt-0.5">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                      <span className="font-mono text-foreground break-all leading-relaxed">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </motion.div>
  );
}
