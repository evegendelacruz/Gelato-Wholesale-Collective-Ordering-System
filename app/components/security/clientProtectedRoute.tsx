'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/client';

export default function ClientProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          if (isMounted) {
            setIsAuthenticated(false);
            setIsChecking(false);
            router.replace('/');
          }
          return;
        }
        
        if (isMounted) {
          setIsAuthenticated(true);
          setIsChecking(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        if (isMounted) {
          setIsAuthenticated(false);
          setIsChecking(false);
          router.replace('/');
        }
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && isMounted) {
        setIsAuthenticated(false);
        router.replace('/');
      } else if (session && isMounted) {
        setIsAuthenticated(true);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  // Don't render anything while checking or if not authenticated
  if (isChecking || !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}