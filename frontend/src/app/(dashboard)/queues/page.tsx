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
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Layers, Pause, Play, Plus, Trash2, Workflow, HelpCircle, ArrowRight, Settings } from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

export default function QueuesPage() {
  const { activeOrg, activeProject } = useAuth();
  const { socket } = useSocket();
  const { toast } = useToast();
  const [queues, setQueues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create queue modal state
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(1);
  const [concurrency, setConcurrency] = useState(5);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Confirm delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchQueues = useCallback(async () => {
    if (!activeOrg || !activeProject) return;
    try {
      const res = await api.get(`/organizations/${activeOrg.slug}/projects/${activeProject.slug}/queues`);
      setQueues(res.data.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [activeOrg?.slug, activeProject?.slug]);

  useEffect(() => {
    fetchQueues();
  }, [fetchQueues]);

  useEffect(() => {
    if (!socket) return;
    socket.on('queue:updated', fetchQueues);
    return () => {
      socket.off('queue:updated', fetchQueues);
    };
  }, [socket, fetchQueues]);

  const handlePause = async (queueName: string) => {
    try {
      await api.post(`/organizations/${activeOrg!.slug}/projects/${activeProject!.slug}/queues/${queueName}/pause`);
      toast({ title: 'Queue paused', description: `${queueName} has been paused successfully.`, variant: 'warning' });
      fetchQueues();
    } catch {
      toast({ title: 'Error', description: 'Failed to pause the queue.', variant: 'error' });
    }
  };

  const handleResume = async (queueName: string) => {
    try {
      await api.post(`/organizations/${activeOrg!.slug}/projects/${activeProject!.slug}/queues/${queueName}/resume`);
      toast({ title: 'Queue resumed', description: `${queueName} is now processing jobs.`, variant: 'success' });
      fetchQueues();
    } catch {
      toast({ title: 'Error', description: 'Failed to resume the queue.', variant: 'error' });
    }
  };

  const confirmDelete = (queueName: string) => {
    setDeleteTarget(queueName);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/organizations/${activeOrg!.slug}/projects/${activeProject!.slug}/queues/${deleteTarget}`);
      toast({ title: 'Queue deleted', description: `${deleteTarget} has been removed.`, variant: 'success' });
      setDeleteTarget(null);
      fetchQueues();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete the queue.', variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setErrorMsg(null);
    try {
      await api.post(`/organizations/${activeOrg!.slug}/projects/${activeProject!.slug}/queues`, {
        name: name.trim(),
        description: description.trim(),
        priority,
        concurrencyLimit: concurrency,
      });
      toast({ title: 'Queue created', description: `${name} queue is online.`, variant: 'success' });
      setName('');
      setDescription('');
      setPriority(1);
      setConcurrency(5);
      setShowModal(false);
      fetchQueues();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message ?? 'Failed to create queue.');
    } finally {
      setCreating(false);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <EmptyState icon={Layers} title="No project selected" description="Please choose a project or create one to configure and manage job queues." />
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Queues</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage execution pipelines, concurrency limits, and priority weighting.</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="sm:self-center">
          <Plus className="h-4 w-4" /> Create Queue
        </Button>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : queues.length === 0 ? (
        <motion.div variants={item}>
          <EmptyState
            icon={Layers}
            title="No queues found"
            description="You don't have any queues set up in this project. Create one to start scheduling background jobs."
            action={
              <Button onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4" /> Create First Queue
              </Button>
            }
          />
        </motion.div>
      ) : (
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {queues.map((q) => (
              <motion.div
                key={q.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <Card className="h-full flex flex-col justify-between overflow-hidden group hover:border-primary/40 hover:shadow-lg hover:shadow-primary/3 transition-all duration-300">
                  <CardContent className="p-5 flex-1">
                    <div className="flex items-start justify-between mb-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-600/10 to-indigo-600/10 flex items-center justify-center ring-1 ring-violet-500/20">
                          <Workflow className="h-5 w-5 text-violet-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm tracking-tight">{q.name}</h3>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Queue</p>
                        </div>
                      </div>
                      <Badge variant={q.status === 'ACTIVE' ? 'success' : 'warning'} size="sm" className="font-semibold">
                        {q.status}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 mb-5 min-h-[2rem] leading-relaxed">
                      {q.description || 'No description provided for this queue pipeline.'}
                    </p>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-secondary/40 rounded-xl p-2.5 border border-border/30">
                        <span className="block font-bold text-sm tracking-tight text-foreground">{q.priority}</span>
                        <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5 block">Priority</span>
                      </div>
                      <div className="bg-secondary/40 rounded-xl p-2.5 border border-border/30">
                        <span className="block font-bold text-sm tracking-tight text-foreground">{q.concurrencyLimit}</span>
                        <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5 block">Concurrency</span>
                      </div>
                      <div className="bg-secondary/40 rounded-xl p-2.5 border border-border/30">
                        <span className="block font-semibold text-xs tracking-tight text-foreground uppercase truncate mt-0.5">
                          {q.retryStrategy?.slice(0, 4) || 'EXP'}
                        </span>
                        <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider mt-1 block">Retry</span>
                      </div>
                    </div>
                  </CardContent>

                  <div className="flex items-center justify-between px-5 py-3 border-t border-border/50 bg-secondary/15">
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Settings className="h-3 w-3 opacity-60" /> Custom Config
                    </div>
                    <div className="flex items-center gap-1.5">
                      {q.status === 'ACTIVE' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePause(q.name)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
                          title="Pause processing"
                        >
                          <Pause className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResume(q.name)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10"
                          title="Resume processing"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmDelete(q.name)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete queue"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Create Queue Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Queue" description="Configure a new task pipeline with dedicated concurrency options.">
        {errorMsg && (
          <div className="bg-destructive/8 border border-destructive/20 text-destructive text-xs rounded-xl p-3.5 mb-4 font-medium flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
            {errorMsg}
          </div>
        )}
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Queue Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. email-delivery-high"
            required
            className="focus-visible:ring-violet-500/30"
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="E.g. Queue for critical outbound notifications."
              className="w-full bg-secondary/50 border border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none h-20 transition-all text-foreground placeholder:text-muted-foreground/45"
            />
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <Input
              label="Priority Weight (1-100)"
              type="number"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value) || 1)}
              min={1}
              max={100}
            />
            <Input
              label="Concurrency Limit"
              type="number"
              value={concurrency}
              onChange={(e) => setConcurrency(parseInt(e.target.value) || 1)}
              min={1}
              max={100}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border/40">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Create Queue
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Queue"
        description={`Are you absolutely sure you want to delete the "${deleteTarget}" queue? All pending and completed job records associated with this queue will be permanently deleted. This action cannot be undone.`}
        confirmText="Delete Pipeline"
        confirmVariant="destructive"
        loading={deleting}
      />
    </motion.div>
  );
}
