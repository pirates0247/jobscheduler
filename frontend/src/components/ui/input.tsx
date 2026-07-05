'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && <label className="block text-xs font-semibold text-foreground">{label}</label>}
        <div className="relative">
          {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">{icon}</div>}
          <input
            ref={ref}
            className={cn(
              'w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm transition-all duration-200',
              'placeholder:text-muted-foreground/50',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent focus:bg-background',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              icon && 'pl-10',
              error && 'border-destructive focus:ring-destructive',
              className,
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';
