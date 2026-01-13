'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/client';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session && isMounted) {
          router.replace('/admin');
          return;
        }
        
        if (isMounted) {
          setIsChecking(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        if (isMounted) {
          router.replace('/admin');
        }
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && isMounted) {
        router.replace('/admin');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  // Don't render anything while checking or if not authenticated
  if (isChecking) {
    return null;
  }

  return <>{children}</>;
}