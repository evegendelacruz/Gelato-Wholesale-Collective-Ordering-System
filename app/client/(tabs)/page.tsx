'use client';

import { Suspense } from 'react';
import ClientHeader from '@/app/components/clientHeader/page';
import LoadingSpinner from '@/app/components/loader/page';
import ClientProtectedRoute from '@/app/components/security/clientProtectedRoute';

export default function ClientTabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientProtectedRoute>
      <div className="min-h-screen flex flex-col" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
        {/* Client Header Component */}
        <ClientHeader />

        {/* Main Content */}
        <main className="flex-1" style={{ backgroundColor: '#f5ebe0' }}>
          <Suspense fallback={
            <LoadingSpinner 
              duration={500}
              onComplete={() => {}}
            />
          }>
            {children}
          </Suspense>
        </main>
      </div>
    </ClientProtectedRoute>
  );
}