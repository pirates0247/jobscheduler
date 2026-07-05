'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '../components/providers/auth-provider';
import {
  Zap,
  Shield,
  Globe2,
  BarChart3,
  Clock,
  Users,
  ArrowRight,
  CheckCircle,
  Layers,
  Cpu,
  Activity,
  Workflow,
  Terminal,
  RefreshCw,
  Star,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const features = [
  {
    icon: Layers,
    title: 'Priority Queues',
    description: 'Route jobs to isolated queues with configurable priority, concurrency limits, and retry strategies.',
    color: 'from-violet-500/20 to-purple-600/20',
    iconColor: 'text-violet-500',
  },
  {
    icon: Cpu,
    title: 'Distributed Workers',
    description: 'Spin up workers anywhere. Atomic job claiming with PostgreSQL FOR UPDATE SKIP LOCKED prevents race conditions.',
    color: 'from-sky-500/20 to-cyan-600/20',
    iconColor: 'text-sky-500',
  },
  {
    icon: Activity,
    title: 'Real-time Monitoring',
    description: 'Live metrics, job lifecycle events, and worker heartbeats via Socket.IO — zero latency observability.',
    color: 'from-emerald-500/20 to-green-600/20',
    iconColor: 'text-emerald-500',
  },
  {
    icon: RefreshCw,
    title: 'Smart Retry Logic',
    description: 'Fixed, linear, and exponential backoff strategies. Automatic dead-letter queuing after max retries.',
    color: 'from-amber-500/20 to-orange-600/20',
    iconColor: 'text-amber-500',
  },
  {
    icon: Workflow,
    title: 'Multiple Job Types',
    description: 'Immediate, delayed, scheduled, recurring (cron), and batch jobs — all in one unified API.',
    color: 'from-rose-500/20 to-red-600/20',
    iconColor: 'text-rose-500',
  },
  {
    icon: Shield,
    title: 'Multi-tenant RBAC',
    description: 'Organizations, projects, and granular roles (Owner → Viewer). Secure JWT auth with refresh rotation.',
    color: 'from-indigo-500/20 to-blue-600/20',
    iconColor: 'text-indigo-500',
  },
];

const stats = [
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '<5ms', label: 'Avg Claim Latency' },
  { value: '∞', label: 'Horizontal Scale' },
  { value: '100%', label: 'Open Source' },
];

const testimonials = [
  {
    quote: 'Replaced our custom cron-job setup in a weekend. Dead letter queuing alone saved us hours of debugging.',
    author: 'Sarah Chen',
    role: 'Lead Engineer @ Veritas',
    avatar: 'SC',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    quote: "The real-time dashboard is exactly what we needed. We can see every job's state instantly without polling.",
    author: 'Marcus Webb',
    role: 'CTO @ Synapse Labs',
    avatar: 'MW',
    gradient: 'from-sky-500 to-cyan-600',
  },
  {
    quote: 'Multi-tenant support made it trivial to isolate our customer workloads. The RBAC model is clean and intuitive.',
    author: 'Priya Nair',
    role: 'Platform Engineer @ Fluxr',
    avatar: 'PN',
    gradient: 'from-emerald-500 to-green-600',
  },
];

const pricingPlans = [
  {
    name: 'Starter',
    price: '$0',
    desc: 'Perfect for side projects and evaluation',
    features: ['3 queues', '10k jobs/month', '1 organization', 'Community support'],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$49',
    desc: 'For production workloads and growing teams',
    features: ['Unlimited queues', '5M jobs/month', '5 organizations', 'Priority support', 'Custom retry policies', 'API tokens'],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    desc: 'Dedicated infrastructure and SLAs',
    features: ['Everything in Pro', 'Dedicated cluster', 'SSO / SAML', 'Audit logs', 'SLA guarantees', 'Dedicated Slack'],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 animate-pulse" />
          <p className="text-xs text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ─── NAV ─── */}
      <header className="sticky top-0 z-50 glass-strong border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-violet-500/20">
              C
            </div>
            <span className="font-bold text-lg tracking-tight">Codity</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">Testimonials</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="http://localhost:4000/api/docs" target="_blank" rel="noopener" className="hover:text-foreground transition-colors flex items-center gap-1">
              Docs <ArrowRight className="h-3 w-3" />
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
              Sign in
            </Link>
            <Link
              href="/register"
              className="h-9 px-4 inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20 transition-all"
            >
              Get Started <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="relative pt-20 pb-24 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-grid opacity-[0.3]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-gradient-to-b from-violet-600/10 to-transparent blur-3xl" />
        <div className="absolute top-1/3 left-0 w-64 h-64 bg-indigo-600/8 rounded-full blur-3xl animate-float" />
        <div className="absolute top-1/3 right-0 w-64 h-64 bg-violet-600/8 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={container} initial="hidden" animate="show" className="text-center">
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-primary/20 bg-primary/5 text-primary mb-6">
                <Zap className="h-3 w-3" />
                Production-ready Job Scheduler
              </span>
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.06] mb-6">
              Schedule any job.{' '}
              <span className="text-gradient">At any scale.</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              A multi-tenant distributed job scheduler with real-time monitoring, priority queues, smart retries, 
              and role-based access — built for teams that ship fast.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="h-12 px-8 inline-flex items-center gap-2 text-base font-bold rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-200"
              >
                Start for free <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="http://localhost:4000/api/docs"
                target="_blank"
                rel="noopener"
                className="h-12 px-8 inline-flex items-center gap-2 text-base font-semibold rounded-xl border border-border bg-card hover:bg-secondary/50 hover:border-primary/30 transition-all duration-200"
              >
                <Terminal className="h-4 w-4" />
                View API Docs
              </a>
            </motion.div>
          </motion.div>

          {/* Dashboard preview card */}
          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.7, ease: 'easeOut' }}
            className="mt-16 mx-auto max-w-5xl"
          >
            <div className="rounded-2xl border border-border/60 bg-card/80 shadow-2xl shadow-black/10 overflow-hidden">
              {/* Mock browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60 bg-secondary/30">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-rose-400/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-400/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
                </div>
                <div className="flex-1 mx-4 h-6 bg-secondary/60 rounded-md flex items-center px-3 text-[11px] text-muted-foreground font-mono">
                  app.codity.ai/dashboard
                </div>
              </div>
              {/* Dashboard mockup content */}
              <div className="p-6 bg-background/50">
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Total Jobs', value: '48,291', color: 'text-violet-500', bg: 'bg-violet-500/10' },
                    { label: 'Running', value: '142', color: 'text-sky-500', bg: 'bg-sky-500/10' },
                    { label: 'Completed', value: '47,039', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    { label: 'Failed', value: '1,110', color: 'text-rose-500', bg: 'bg-rose-500/10' },
                  ].map((card) => (
                    <div key={card.label} className="bg-card border border-border/60 rounded-xl p-4">
                      <div className={`inline-flex p-2 rounded-lg ${card.bg} mb-2`}>
                        <div className={`h-3 w-3 rounded-sm ${card.bg}`} />
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{card.label}</p>
                      <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                    </div>
                  ))}
                </div>
                {/* Mini chart rows */}
                <div className="bg-card border border-border/60 rounded-xl p-4">
                  <p className="text-xs font-semibold mb-3 text-muted-foreground">Job Execution Throughput — 7 days</p>
                  <div className="flex items-end gap-1.5 h-16">
                    {[30, 52, 45, 68, 55, 80, 72].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col gap-0.5 items-center">
                        <div className="w-full rounded-t bg-gradient-to-t from-violet-600/60 to-violet-600/30 transition-all" style={{ height: `${h}%` }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── STATS STRIP ─── */}
      <section className="py-10 border-y border-border/50 bg-secondary/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-extrabold text-gradient">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-primary/20 bg-primary/5 text-primary mb-4"
            >
              <Globe2 className="h-3 w-3" /> Everything you need
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl font-extrabold tracking-tight"
            >
              Built for production from day one
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-muted-foreground mt-3 max-w-xl mx-auto"
            >
              No half-baked features. Codity ships with everything a distributed system needs.
            </motion.p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="group relative bg-card border border-border/60 rounded-2xl p-6 overflow-hidden hover-lift"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feat.color} opacity-0 group-hover:opacity-60 transition-opacity duration-300`} />
                <div className="relative">
                  <div className={`inline-flex p-3 rounded-xl bg-secondary/60 ring-1 ring-border/30 mb-4`}>
                    <feat.icon className={`h-5 w-5 ${feat.iconColor}`} />
                  </div>
                  <h3 className="text-base font-semibold mb-2">{feat.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feat.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section id="testimonials" className="py-24 bg-secondary/20 border-y border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="flex items-center justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 text-amber-400 fill-amber-400" />)}
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight">Loved by engineering teams</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border/60 rounded-2xl p-6 hover-lift"
              >
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.author}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold tracking-tight">Simple, transparent pricing</h2>
            <p className="text-lg text-muted-foreground mt-3">Start free, scale when you need to.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricingPlans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl p-8 border ${
                  plan.highlighted
                    ? 'bg-gradient-to-b from-primary/5 to-card border-primary/40 shadow-xl shadow-primary/10'
                    : 'bg-card border-border/60'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md">
                      Most Popular
                    </span>
                  </div>
                )}
                <p className="text-sm font-semibold text-muted-foreground mb-1">{plan.name}</p>
                <p className="text-4xl font-extrabold mb-1">
                  {plan.price}
                  {plan.price !== 'Custom' && <span className="text-base font-normal text-muted-foreground">/mo</span>}
                </p>
                <p className="text-sm text-muted-foreground mb-6">{plan.desc}</p>
                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block w-full h-11 text-center leading-none flex items-center justify-center font-semibold rounded-xl text-sm transition-all ${
                    plan.highlighted
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20 hover:shadow-violet-500/40 hover:scale-105'
                      : 'border border-border hover:border-primary/40 hover:bg-secondary/50'
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative bg-gradient-to-r from-violet-600/10 via-indigo-600/10 to-violet-600/10 border border-primary/20 rounded-3xl p-14 overflow-hidden">
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-primary/15 blur-3xl rounded-full" />
            <div className="relative">
              <h2 className="text-4xl font-extrabold tracking-tight mb-4">Ready to stop managing cron jobs?</h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Get started in minutes. No credit card required.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 h-13 px-10 text-base font-bold rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-200"
              >
                Create free account <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border/50 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              C
            </div>
            <span className="font-semibold">Codity</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Codity. Built with ❤️ for developers.
          </p>
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground transition-colors">Sign in</Link>
            <a href="http://localhost:4000/api/docs" target="_blank" rel="noopener" className="hover:text-foreground transition-colors">API Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
