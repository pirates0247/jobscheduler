'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/providers/auth-provider';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { Users, Mail, Shield, UserMinus, Plus, ChevronDown, Calendar, ShieldAlert } from 'lucide-react';

const ROLE_CONFIG: Record<string, { variant: 'default' | 'success' | 'purple' | 'info' | 'warning'; label: string }> = {
  OWNER: { variant: 'warning', label: 'Owner' },
  ADMIN: { variant: 'purple', label: 'Admin' },
  DEVELOPER: { variant: 'info', label: 'Developer' },
  VIEWER: { variant: 'default', label: 'Viewer' },
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const itemAnim = { hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' as const } } };

export default function MembersPage() {
  const { activeOrg } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite member states
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('DEVELOPER');
  const [inviting, setInviting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Remove member states
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!activeOrg) return;
    try {
      const res = await api.get(`/organizations/${activeOrg.slug}/members`);
      setMembers(res.data.data ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [activeOrg?.slug]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    setInviting(true);
    setErrorMsg(null);
    try {
      await api.post(`/organizations/${activeOrg.slug}/members`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      toast({ title: 'Invitation Sent', description: `Invite sent to ${inviteEmail}.`, variant: 'success' });
      setInviteEmail('');
      setShowInvite(false);
      fetchMembers();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message ?? 'Failed to invite organization member.');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!activeOrg) return;
    try {
      await api.put(`/organizations/${activeOrg.slug}/members/${memberId}`, { role: newRole });
      toast({ title: 'Role updated', description: 'User role changes saved.', variant: 'success' });
      fetchMembers();
    } catch {
      toast({ title: 'Error', variant: 'error', description: 'Failed to update member role permissions.' });
    }
  };

  const handleRemove = async () => {
    if (!activeOrg || !deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/organizations/${activeOrg.slug}/members/${deleteTarget.id}`);
      toast({ title: 'Member removed', description: 'User has been removed from organization.', variant: 'warning' });
      setDeleteTarget(null);
      fetchMembers();
    } catch {
      toast({ title: 'Error', variant: 'error', description: 'Failed to remove user from organization.' });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-7 w-40 bg-secondary rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-secondary/50 rounded mt-2 animate-pulse" />
        </div>
        <Card className="p-4">
          <TableSkeleton rows={4} />
        </Card>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemAnim} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Members</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Invite developers, assign roles, and manage access scopes inside {activeOrg?.name}.</p>
        </div>
        <Button onClick={() => setShowInvite(true)} className="sm:self-center">
          <Plus className="h-4 w-4" /> Invite Member
        </Button>
      </motion.div>

      {members.length === 0 ? (
        <motion.div variants={itemAnim}>
          <Card>
            <EmptyState icon={Users} title="No members found" description="Invite team members to begin collaborating on schedulers." />
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={itemAnim}>
          <Card className="overflow-hidden border-border/50 hover:border-primary/10 transition-all shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-secondary/30">
                    <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Member Name</th>
                    <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Email Address</th>
                    <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Role Permissions</th>
                    <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Joined Date</th>
                    <th className="text-right px-4 py-3.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  <AnimatePresence>
                    {members.map((member: any) => {
                      const cfg = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.VIEWER;
                      return (
                        <motion.tr
                          key={member.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-secondary/20 transition-colors group"
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-600/20 to-indigo-600/20 flex items-center justify-center font-bold text-xs text-violet-300 ring-2 ring-violet-500/10">
                                {member.user?.firstName?.[0] || 'U'}
                                {member.user?.lastName?.[0] || ''}
                              </div>
                              <span className="font-semibold text-foreground">
                                {member.user?.firstName} {member.user?.lastName}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">{member.user?.email}</td>
                          <td className="px-4 py-3.5">
                            {member.role === 'OWNER' ? (
                              <Badge variant="warning" size="sm" className="font-bold">
                                <Shield className="h-3 w-3 shrink-0" />
                                OWNER
                              </Badge>
                            ) : (
                              <div className="relative inline-block">
                                <select
                                  value={member.role}
                                  onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                  className="appearance-none bg-secondary/70 border border-border/50 rounded-full pl-3 pr-7 py-1 text-[11px] font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring transition-all hover:bg-secondary"
                                >
                                  <option value="ADMIN">ADMIN</option>
                                  <option value="DEVELOPER">DEVELOPER</option>
                                  <option value="VIEWER">VIEWER</option>
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 opacity-60" />
                              {new Date(member.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {member.role !== 'OWNER' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteTarget(member)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                                title="Remove team member"
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            )}
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

      {/* Invite Member Modal */}
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invite Member" description={`Provide credentials to register a new collaborator on ${activeOrg?.name}.`}>
        {errorMsg && (
          <div className="bg-destructive/8 border border-destructive/20 text-destructive text-xs rounded-xl p-3.5 mb-4 font-medium">
            {errorMsg}
          </div>
        )}
        <form onSubmit={handleInvite} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@company.com"
            required
            icon={<Mail className="h-4 w-4 text-muted-foreground" />}
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground">Select Scope Role</label>
            <div className="relative">
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full bg-secondary/50 border border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer appearance-none text-foreground"
              >
                <option value="ADMIN">Admin (Full Control)</option>
                <option value="DEVELOPER">Developer (Write/Read)</option>
                <option value="VIEWER">Viewer (Read Only)</option>
              </select>
              <ChevronDown className="absolute right-3 top-3 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border/40">
            <Button variant="secondary" type="button" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={inviting}>
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm remove dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleRemove}
        title="Remove Team Member"
        description={`Are you sure you want to remove ${deleteTarget?.user?.firstName} ${deleteTarget?.user?.lastName} from the organization? They will lose access to all queues, jobs, and diagnostic pipelines immediately.`}
        confirmText="Remove Access"
        confirmVariant="destructive"
        loading={deleting}
      />
    </motion.div>
  );
}
