'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/providers/auth-provider';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  User, Building2, Key, Bell, Save, Copy, Plus, Trash2,
  ChevronDown, Eye, EyeOff, RefreshCw, Shield, Globe, Clock, Check
} from 'lucide-react';

const TABS = [
  { id: 'profile', label: 'Profile Settings', icon: User },
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'api-tokens', label: 'Developer Keys', icon: Key },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const itemAnim = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export default function SettingsPage() {
  const { user, activeOrg, organizations, switchOrg } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemAnim}>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure your developer profile, team organization structures, API tokens, and webhook notifications.</p>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemAnim} className="flex gap-1.5 flex-wrap border-b border-border/50 pb-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 -mb-[1px] ${
                active
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </motion.div>

      <div className="pt-2">
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'organization' && <OrganizationTab />}
        {activeTab === 'api-tokens' && <ApiTokensTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
      </div>
    </motion.div>
  );
}

function ProfileTab() {
  const { user, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [showCurPw, setShowCurPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setEmail(user.email);
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/auth/me', { firstName, lastName });
      await refreshUserData();
      toast({ title: 'Profile updated', description: 'Your personal settings have been updated.', variant: 'success' });
    } catch {
      toast({ title: 'Error', variant: 'error', description: 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({ title: 'Error', variant: 'error', description: 'New password must be at least 8 characters long.' });
      return;
    }
    setSavingPw(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      toast({ title: 'Password changed', description: 'Your login credentials have been updated.', variant: 'success' });
      setCurrentPassword('');
      setNewPassword('');
    } catch {
      toast({ title: 'Error', variant: 'error', description: 'Failed to verify current password.' });
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <motion.div variants={itemAnim} className="max-w-2xl space-y-6">
      <Card className="border-border/50 hover:border-primary/10 transition-all shadow-sm">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-4 pb-4 border-b border-border/50">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-600/30 to-indigo-600/30 flex items-center justify-center font-bold text-2xl text-violet-400 ring-4 ring-violet-500/10">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <h3 className="font-bold text-lg">{user?.firstName} {user?.lastName}</h3>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
            <Input label="Registered Email Address" type="email" value={email} disabled />
            <div className="flex justify-end pt-3 border-t border-border/40">
              <Button type="submit" loading={saving}>
                <Save className="h-4 w-4" /> Save Profile Details
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/50 hover:border-primary/10 transition-all shadow-sm">
        <CardContent className="p-6">
          <h3 className="font-bold text-base text-foreground">Change Password</h3>
          <p className="text-xs text-muted-foreground mb-5">Update your password regularly to maintain authentication hygiene.</p>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="relative">
              <Input
                label="Current Password"
                type={showCurPw ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurPw(!showCurPw)}
                className="absolute right-3.5 top-[35px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {showCurPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="relative">
              <Input
                label="New Password"
                type={showNewPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3.5 top-[35px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex justify-end pt-3 border-t border-border/40">
              <Button type="submit" loading={savingPw}>
                <RefreshCw className="h-4 w-4" /> Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function OrganizationTab() {
  const { activeOrg, organizations, switchOrg } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(activeOrg?.name ?? '');
  const [description, setDescription] = useState(activeOrg?.description ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeOrg) {
      setName(activeOrg.name);
      setDescription(activeOrg.description ?? '');
    }
  }, [activeOrg]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    setSaving(true);
    try {
      await api.put(`/organizations/${activeOrg.slug}`, { name, description });
      toast({ title: 'Organization updated', description: 'Organization workspace details saved.', variant: 'success' });
    } catch {
      toast({ title: 'Error', variant: 'error', description: 'Failed to update organization metadata.' });
    } finally {
      setSaving(false);
    }
  };

  if (!activeOrg) return null;

  return (
    <motion.div variants={itemAnim} className="max-w-2xl space-y-6">
      <Card className="border-border/50 hover:border-primary/10 transition-all shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 pb-4 border-b border-border/50 mb-5">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 flex items-center justify-center ring-1 ring-violet-500/10">
              <Building2 className="h-7 w-7 text-violet-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{activeOrg.name}</h3>
              <p className="text-xs text-muted-foreground font-mono">ID: {activeOrg.slug}</p>
            </div>
            <Badge variant="purple" className="ml-auto font-semibold">
              <Shield className="h-3 w-3 shrink-0" />
              {organizations.find((o) => o.slug === activeOrg.slug)?.role ?? 'MEMBER'}
            </Badge>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <Input label="Workspace Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">Workspace Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="E.g. Engineering & data pipelines operations workspace."
                className="w-full bg-secondary/50 border border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none h-20 transition-all text-foreground placeholder:text-muted-foreground/45"
              />
            </div>
            <div className="flex justify-end pt-3 border-t border-border/40">
              <Button type="submit" loading={saving}>
                <Save className="h-4 w-4" /> Save Workspace Settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/50 hover:border-primary/10 transition-all shadow-sm">
        <CardContent className="p-6">
          <h3 className="font-bold text-base">Switch Organization Workspace</h3>
          <p className="text-xs text-muted-foreground mb-4">Select and switch contexts into alternative billing or organization scopes.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {organizations
              .filter((o) => o.slug !== activeOrg.slug)
              .map((org) => (
                <button
                  key={org.slug}
                  onClick={() => switchOrg(org.slug)}
                  className="flex items-center gap-3 bg-secondary/40 border border-border/50 rounded-xl px-4 py-3 text-left hover:bg-secondary hover:border-primary/30 transition-all duration-200"
                >
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-600/20 to-indigo-600/20 flex items-center justify-center font-bold text-violet-400">
                    {org.name[0]}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{org.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{org.slug}</p>
                  </div>
                </button>
              ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ApiTokensTab() {
  const { toast } = useToast();
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  
  // Revoke token state
  const [revokeTarget, setRevokeTarget] = useState<any | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const res = await api.get('/api-tokens');
      setTokens(res.data.data ?? []);
    } catch {
      setTokens([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const res = await api.post('/api-tokens', { name: newName });
      setCreatedToken(res.data.data.token);
      setNewName('');
      setShowCreate(false);
      fetchTokens();
    } catch {
      toast({ title: 'Error', variant: 'error', description: 'API tokens are restricted on the Free plan.' });
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await api.delete(`/api-tokens/${revokeTarget.id}`);
      toast({ title: 'Token Revoked', description: ' პროგრამული გასაღები წაშლილია.', variant: 'success' });
      setRevokeTarget(null);
      fetchTokens();
    } catch {
      toast({ title: 'Error', variant: 'error', description: 'Failed to revoke token.' });
    } finally {
      setRevoking(false);
    }
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
    toast({ title: 'Copied', description: 'API token copied to clipboard.', variant: 'success' });
  };

  if (loading) {
    return <div className="h-32 bg-card border border-border rounded-xl animate-pulse" />;
  }

  return (
    <motion.div variants={itemAnim} className="max-w-2xl space-y-6">
      <Card className="border-border/50 hover:border-primary/10 transition-all shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-base">Developer Access Tokens</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Integrate codity schedule pipelines with external microservices.</p>
            </div>
            <Button
              onClick={() => {
                setShowCreate(true);
                setCreatedToken(null);
              }}
            >
              <Plus className="h-4 w-4" /> New Token
            </Button>
          </div>

          {createdToken && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Key className="h-4 w-4 shrink-0" /> Token Created Successfully
              </div>
              <p className="text-[11px] text-muted-foreground">Make sure to copy this key now. For security purposes, it will not be displayed again.</p>
              <div className="flex items-center gap-2 bg-black/40 border border-border/50 rounded-lg px-3 py-2 font-mono text-xs text-emerald-400">
                <span className="flex-1 truncate">{createdToken}</span>
                <button onClick={() => copyToken(createdToken)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                  {copiedToken ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {showCreate && !createdToken && (
            <form onSubmit={handleCreate} className="flex items-end gap-3 mb-4 p-4 bg-secondary/30 rounded-xl border border-border/50">
              <Input
                label="Token Label Description"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. AWS Worker Agent"
                className="flex-1"
                required
              />
              <Button type="submit" className="mb-0.5">
                Generate
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowCreate(false)} className="mb-0.5">
                Cancel
              </Button>
            </form>
          )}

          {tokens.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              <Key className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p>No program tokens configured yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className="flex items-center justify-between bg-secondary/30 border border-border/50 rounded-xl px-4 py-3 group hover:border-primary/25 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Key className="h-4 w-4 text-muted-foreground/60" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">{token.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Created {new Date(token.createdAt).toLocaleDateString()}
                        {token.lastUsedAt && ` · Last used ${new Date(token.lastUsedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={token.status === 'ACTIVE' ? 'success' : 'default'} size="sm" className="font-bold">
                      {token.status || 'ACTIVE'}
                    </Badge>
                    <button
                      onClick={() => setRevokeTarget(token)}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoke confirmation dialog */}
      <ConfirmDialog
        open={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title="Revoke Program Token"
        description={`Are you sure you want to revoke the developer key "${revokeTarget?.name}"? Any active SDK agents or background tasks relying on this key will throw authentication errors immediately.`}
        confirmText="Revoke Token"
        confirmVariant="destructive"
        loading={revoking}
      />
    </motion.div>
  );
}

function NotificationsTab() {
  const [settings, setSettings] = useState({
    jobCompleted: true,
    jobFailed: true,
    workerOffline: true,
    queuePaused: true,
    memberJoined: true,
    dailyDigest: false,
    emailNotifications: true,
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const groups = [
    {
      title: 'Job Events',
      items: [
        { key: 'jobCompleted' as const, label: 'Job Success Completed', desc: 'When a job finishes execution without throwing' },
        { key: 'jobFailed' as const, label: 'Job Execution Failures', desc: 'When a job is sent to dead letter or fails' },
      ],
    },
    {
      title: 'Infrastructure Changes',
      items: [
        { key: 'workerOffline' as const, label: 'Worker Offline Alert', desc: 'When a worker node heartbeats timeout' },
        { key: 'queuePaused' as const, label: 'Queue Paused Events', desc: 'When a queue pipeline is paused or restarted' },
      ],
    },
    {
      title: 'Activity Summary digest',
      items: [
        { key: 'dailyDigest' as const, label: 'Daily Analytics Digest', desc: 'Receive aggregated daily scheduling matrix logs' },
      ],
    },
  ];

  return (
    <motion.div variants={itemAnim} className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">Select event parameters to route updates to workspace listeners.</p>
        <div className="flex items-center gap-2.5 text-xs font-semibold">
          <span className="text-muted-foreground">Global Email notifications:</span>
          <button
            onClick={() => toggle('emailNotifications')}
            className={`relative inline-flex h-5 w-9.5 items-center rounded-full transition-colors shrink-0 ${
              settings.emailNotifications ? 'bg-primary' : 'bg-secondary'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                settings.emailNotifications ? 'translate-x-[20px]' : 'translate-x-[3px]'
              }`}
            />
          </button>
        </div>
      </div>
      {groups.map((group) => (
        <Card key={group.title} className="border-border/50 hover:border-primary/10 transition-all shadow-sm">
          <CardContent className="p-5">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3.5">{group.title}</h4>
            <div className="space-y-3">
              {group.items.map((item) => (
                <div key={item.key} className="flex items-center justify-between py-1.5">
                  <div className="pr-4">
                    <p className="text-xs font-semibold text-foreground">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => toggle(item.key)}
                    className={`relative inline-flex h-5 w-9.5 items-center rounded-full transition-colors shrink-0 ${
                      settings[item.key] ? 'bg-primary' : 'bg-secondary'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                        settings[item.key] ? 'translate-x-[20px]' : 'translate-x-[3px]'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </motion.div>
  );
}
