'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

const variants = {
  default: 'bg-secondary text-secondary-foreground border-border',
  success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  error: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  info: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
  purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

export function Badge({ variant = 'default', size = 'sm', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        size === 'sm' ? 'px-2 py-0.5 text-[10px] gap-1' : 'px-2.5 py-1 text-xs gap-1.5',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
