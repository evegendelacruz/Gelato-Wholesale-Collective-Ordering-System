'use client';

interface SkeletonProps {
  className?: string;
}

// Basic skeleton element with shimmer animation
export const Skeleton = ({ className = '' }: SkeletonProps) => (
  <div
    className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] rounded ${className}`}
    style={{
      animation: 'shimmer 1.5s ease-in-out infinite',
    }}
  />
);

// Table skeleton loader
export const TableSkeleton = ({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) => (
  <div className="w-full">
    {/* Header skeleton */}
    <div className="flex gap-4 py-3 px-4 border-b-2 border-gray-200">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={`header-${i}`} className="h-4 flex-1" />
      ))}
    </div>
    {/* Row skeletons */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={`row-${rowIndex}`} className="flex gap-4 py-4 px-4 border-b border-gray-100">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton
            key={`cell-${rowIndex}-${colIndex}`}
            className={`h-4 flex-1 ${colIndex === 0 ? 'max-w-[40px]' : ''}`}
          />
        ))}
      </div>
    ))}
  </div>
);

// Card skeleton loader
export const CardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
    <div className="flex items-center gap-4">
      <Skeleton className="w-12 h-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-5/6" />
    <Skeleton className="h-4 w-4/6" />
  </div>
);

// Dashboard card skeleton
export const DashboardCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-sm p-6">
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="w-10 h-10 rounded-full" />
    </div>
    <Skeleton className="h-8 w-24 mb-2" />
    <Skeleton className="h-3 w-20" />
  </div>
);

// Product list skeleton
export const ProductListSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="w-full">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="flex items-center gap-4 py-3 px-4 border-b border-gray-100">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="w-8 h-8 rounded" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
        </div>
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-6 w-16 rounded" />
      </div>
    ))}
  </div>
);

// Page content skeleton with header
export const PageContentSkeleton = ({ rows = 8 }: { rows?: number }) => (
  <div className="bg-white rounded-lg shadow-sm p-6">
    {/* Header area */}
    <div className="flex items-center justify-between mb-6">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-3">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
    </div>

    {/* Table skeleton */}
    <TableSkeleton rows={rows} columns={7} />

    {/* Pagination skeleton */}
    <div className="flex items-center justify-between mt-6">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-16" />
    </div>
  </div>
);

// Report skeleton
export const ReportSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="bg-white rounded-lg shadow-sm p-6">
    <div className="flex items-center justify-between mb-6">
      <Skeleton className="h-8 w-56" />
      <div className="flex gap-3">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>
    </div>
    <TableSkeleton rows={rows} columns={5} />
  </div>
);

// Order skeleton
export const OrderSkeleton = ({ rows = 6 }: { rows?: number }) => (
  <div className="bg-white rounded-lg shadow-sm p-6">
    <div className="flex items-center justify-between mb-6">
      <Skeleton className="h-8 w-40" />
      <div className="flex gap-3">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
    </div>
    <TableSkeleton rows={rows} columns={8} />
  </div>
);

// Client skeleton
export const ClientSkeleton = ({ rows = 6 }: { rows?: number }) => (
  <div className="bg-white rounded-lg shadow-sm p-6">
    <div className="flex items-center justify-between mb-6">
      <Skeleton className="h-8 w-44" />
      <div className="flex gap-3">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
    </div>
    <TableSkeleton rows={rows} columns={7} />
  </div>
);

// Add shimmer keyframes to global styles
export const SkeletonStyles = () => (
  <style jsx global>{`
    @keyframes shimmer {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }
  `}</style>
);

export default function SkeletonLoader({ type = 'page', rows = 6 }: { type?: 'page' | 'table' | 'card' | 'dashboard' | 'product' | 'report' | 'order' | 'client'; rows?: number }) {
  return (
    <>
      <SkeletonStyles />
      {type === 'page' && <PageContentSkeleton rows={rows} />}
      {type === 'table' && <TableSkeleton rows={rows} />}
      {type === 'card' && <CardSkeleton />}
      {type === 'dashboard' && <DashboardCardSkeleton />}
      {type === 'product' && <ProductListSkeleton rows={rows} />}
      {type === 'report' && <ReportSkeleton rows={rows} />}
      {type === 'order' && <OrderSkeleton rows={rows} />}
      {type === 'client' && <ClientSkeleton rows={rows} />}
    </>
  );
}
