'use client';

import Sidepanel from '@/app/components/sidepanel/page';
import Header from '@/app/components/header/page';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
      {/* Sidebar Component */}
      <Sidepanel />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-6" style={{ backgroundColor: '#FCF0E3' }}>
          {children}
        </main>
      </div>
    </div>
  );
}