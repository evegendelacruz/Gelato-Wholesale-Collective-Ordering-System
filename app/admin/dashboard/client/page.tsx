'use client';
import Sidepanel from '@/app/components/sidepanel/page';
import Header from '@/app/components/header/page';

export default function ClientAccountPage() {
  return (
     <div className="min-h-screen flex" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
      <Sidepanel />
      <div className="flex-1 flex flex-col">
              <Header />
      <div className="flex-1 p-6">
        <h1>Client Account Page</h1>
      </div>
      </div>
    </div>
  );
}
