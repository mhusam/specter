export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded ${className}`} />
}

export function ProjectListSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-b-2 border-zinc-200">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  )
}
