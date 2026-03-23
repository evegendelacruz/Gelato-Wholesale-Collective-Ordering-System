'use client';

import { AccessControlProvider } from '@/lib/accessControl';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AccessControlProvider>
      {children}
    </AccessControlProvider>
  );
}
