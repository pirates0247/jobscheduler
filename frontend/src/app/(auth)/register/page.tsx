'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Mail, User, Lock, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const registerSchema = zod.object({
  firstName: zod.string().min(2, 'First name must be at least 2 characters'),
  lastName: zod.string().min(2, 'Last name must be at least 2 characters'),
  email: zod.string().email('Please enter a valid email address'),
  password: zod.string().min(8, 'Password must be at least 8 characters'),
  terms: zod.boolean().refine((v) => v === true, 'You must agree to the terms'),
});

type RegisterFormValues = zod.infer<typeof registerSchema>;

const perks = [
  'Free forever plan — no credit card needed',
  'Unlimited jobs on local deployment',
  'Real-time monitoring & analytics',
];

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { terms: false },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await registerUser(values.firstName, values.lastName, values.email, values.password);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <div className="absolute inset-0 bg-grid opacity-[0.2]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-gradient-to-b from-indigo-600/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -top-24 -left-40 h-80 w-80 rounded-full bg-violet-600/8 blur-[80px] animate-float pointer-events-none" />
      <div className="absolute bottom-10 -right-40 h-80 w-80 rounded-full bg-indigo-600/8 blur-[80px] animate-float pointer-events-none" style={{ animationDelay: '-2s' }} />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-full max-w-[460px]"
      >
        <div className="rounded-2xl border border-border/60 bg-card/85 backdrop-blur-xl p-8 shadow-2xl shadow-black/10 space-y-6">
          {/* Logo + heading */}
          <div className="text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-extrabold text-xl shadow-lg shadow-violet-500/25 mb-5"
            >
              C
            </motion.div>
            <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Join <span className="font-semibold text-foreground">Codity</span> — free forever
            </p>
          </div>

          {/* Perks */}
          <div className="space-y-1.5 px-3.5 py-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
            {perks.map((p) => (
              <div key={p} className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                {p}
              </div>
            ))}
          </div>

          {/* Error */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5 rounded-xl bg-destructive/8 border border-destructive/20 p-3.5 text-sm text-destructive"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {errorMsg}
            </motion.div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-2 gap-3">
              <Input label="First Name" {...register('firstName')} placeholder="Jane" error={errors.firstName?.message} icon={<User className="h-4 w-4" />} />
              <Input label="Last Name" {...register('lastName')} placeholder="Doe" error={errors.lastName?.message} icon={<User className="h-4 w-4" />} />
            </div>
            <Input label="Email Address" type="email" {...register('email')} placeholder="you@example.com" error={errors.email?.message} icon={<Mail className="h-4 w-4" />} />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className="w-full bg-secondary/60 border border-border/60 rounded-lg pl-10 pr-10 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent focus:bg-background transition-all duration-200"
                  placeholder="Minimum 8 characters"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                id="terms"
                {...register('terms')}
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                I agree to the{' '}
                <span className="font-semibold text-primary cursor-pointer hover:underline">Terms of Service</span>
                {' '}and{' '}
                <span className="font-semibold text-primary cursor-pointer hover:underline">Privacy Policy</span>
              </label>
            </div>
            {errors.terms && <p className="text-xs text-destructive -mt-2">{errors.terms.message}</p>}

            <Button type="submit" loading={loading} className="w-full h-11 text-sm font-semibold">
              {loading ? 'Creating account…' : 'Create Account'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground pt-1 border-t border-border/50">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
