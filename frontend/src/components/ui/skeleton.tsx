'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-shimmer rounded-lg bg-gradient-to-r from-secondary via-muted/40 to-secondary bg-[length:200%_100%]', className)} />;
}

export function StatCardSkeleton() {
  return <div className="h-28 bg-card border border-border rounded-xl p-5"><div className="flex items-center gap-4"><Skeleton className="h-12 w-12 rounded-lg" /><div className="space-y-2 flex-1"><Skeleton className="h-4 w-20" /><Skeleton className="h-6 w-16" /></div></div></div>;
}

export function CardSkeleton({ className }: { className?: string }) {
  return <div className={cn('bg-card border border-border rounded-xl p-5 animate-pulse', className)}>
    <Skeleton className="h-5 w-32 mb-3" />
    <Skeleton className="h-4 w-full mb-2" />
    <Skeleton className="h-4 w-3/4 mb-6" />
    <div className="space-y-2">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  </div>;
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-4 p-3"><Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-16" /></div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3"><Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-16" /></div>
      ))}
    </div>
  );
}
