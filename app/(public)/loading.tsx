// Loading skeleton shown during Server Component navigation
// Prevents blank screen when navigating between pages

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse space-y-8">
      {/* Hero skeleton */}
      <div className="h-64 sm:h-80 rounded-2xl bg-muted" />

      {/* Grid skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-40 rounded-lg bg-muted" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[2/3] rounded-xl bg-muted" />
              <div className="h-4 rounded bg-muted" />
              <div className="h-3 w-2/3 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>

      {/* Second grid */}
      <div className="space-y-4">
        <div className="h-6 w-48 rounded-lg bg-muted" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[2/3] rounded-xl bg-muted" />
              <div className="h-4 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
