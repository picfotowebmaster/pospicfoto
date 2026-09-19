import React from "react";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
  );
}

export function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 8 }).map((_, ci) => (
        <div
          key={ci}
          className="flex-shrink-0 w-72 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-col"
        >
          <div className="px-3 py-2 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          <div className="flex-1 p-2 space-y-2">
            {Array.from({ length: 2 + ci % 3 }).map((_, ri) => (
              <div
                key={ri}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 p-3 space-y-2"
              >
                <Skeleton className="h-3 w-20" />
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-4 w-14 rounded" />
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-8 w-full rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-3 mb-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 space-y-2"
        >
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}
