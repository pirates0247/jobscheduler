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
import { Eye, EyeOff, Mail, Lock, ArrowRight, AlertCircle, Zap } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const loginSchema = zod.object({
  email: zod.string().email('Please enter a valid email address'),
  password: zod.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = zod.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await login(values.email, values.password);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message ?? 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      {/* Animated background */}
      <div className="absolute inset-0 bg-grid opacity-[0.2]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-gradient-to-b from-violet-600/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 -left-48 h-80 w-80 rounded-full bg-violet-600/8 blur-[80px] animate-float pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 h-80 w-80 rounded-full bg-indigo-600/8 blur-[80px] animate-float pointer-events-none" style={{ animationDelay: '-3s' }} />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-full max-w-[440px]"
      >
        {/* Card */}
        <div className="rounded-2xl border border-border/60 bg-card/85 backdrop-blur-xl p-8 shadow-2xl shadow-black/10 space-y-7">

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
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to your <span className="font-semibold text-foreground">Codity</span> account
            </p>
          </div>

          {/* Demo hint */}
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-primary/5 border border-primary/15">
            <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Demo credentials: </span>
              admin@codity.ai / password123
            </div>
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
            <Input
              label="Email address"
              type="email"
              {...register('email')}
              placeholder="you@example.com"
              error={errors.email?.message}
              icon={<Mail className="h-4 w-4" />}
            />
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-foreground">Password</label>
                <button type="button" className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className="w-full bg-secondary/60 border border-border/60 rounded-lg pl-10 pr-10 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent focus:bg-background transition-all duration-200"
                  placeholder="Enter your password"
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

            <Button type="submit" loading={loading} className="w-full h-11 text-sm font-semibold">
              {loading ? 'Signing in…' : 'Sign In'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground pt-1 border-t border-border/50">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-primary hover:text-primary/80 transition-colors">
              Create one free
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
