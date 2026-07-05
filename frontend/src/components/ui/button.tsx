'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline' | 'gradient';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'relative inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97] select-none',
        variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20',
        variant === 'gradient' && 'text-white shadow-md shadow-primary/25 overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-violet-600 before:to-indigo-600 before:transition-opacity hover:before:opacity-90',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/50',
        variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm shadow-destructive/20',
        variant === 'ghost' && 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
        variant === 'outline' && 'border border-border bg-transparent hover:bg-secondary/50 text-foreground hover:border-primary/40',
        size === 'xs' && 'h-7 px-2.5 text-xs gap-1',
        size === 'sm' && 'h-8 px-3 text-xs gap-1.5',
        size === 'md' && 'h-9 px-4 text-sm gap-2',
        size === 'lg' && 'h-11 px-6 text-sm gap-2',
        size === 'icon' && 'h-9 w-9 p-0',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {variant === 'gradient' && <span className="relative z-10 flex items-center gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{children}</span>}
      {variant !== 'gradient' && (
        <>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {children}
        </>
      )}
    </button>
  );
}
