'use client';

import ClientHeader from '@/app/components/clientHeader/page';

export default function ClientTabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
      {/* Client Header Component */}
      <ClientHeader />

      {/* Main Content */}
      <main className="flex-1" style={{ backgroundColor: '#f5ebe0' }}>
        {children}
      </main>
    </div>
  );
}