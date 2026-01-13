'use client';

import Sidepanel from '@/app/components/sidepanel/page';
import Header from '@/app/components/header/page';
import Calendar from '@/app/components/calendar/page';
import ProtectedRoute from '@/app/components/security/protectedroute';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
    <div className="min-h-screen flex" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
      {/* Sidebar Component */}
      <Sidepanel />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6" style={{ backgroundColor: '#FCF0E3' }}>
          <Calendar />
          {children}
        </main>
      </div>
    </div>
  </ProtectedRoute>
  );
}