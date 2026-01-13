'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import supabase from '@/lib/client';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
  admin_profile?: string;
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Authentication check effect - MUST BE FIRST
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        // No session found, redirect to login
        setIsAuthenticated(false);
        router.replace('/admin');
        return;
      }
      
      setIsAuthenticated(true);
    };

    checkAuth();
  }, [router]);

  // Session monitoring effect
  useEffect(() => {
    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        // Session ended
        setIsAuthenticated(false);
        setShowSessionModal(true);
        
        // Auto logout after 2 seconds
        setTimeout(async () => {
          await supabase.auth.signOut();
          router.replace('/admin');
        }, 2000);
      }
    });

    // Cleanup listener
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    // Only fetch user if authenticated
    if (!isAuthenticated) return;

    const fetchUser = async () => {
      try {
        // Get current auth session
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authUser) {
          console.error('Auth error:', authError);
          setIsAuthenticated(false);
          router.replace('/admin');
          setLoading(false);
          return;
        }

        // Fetch user details from admin_user table
        const { data: userData, error: userError } = await supabase
          .from('admin_user')
          .select('admin_fullName, admin_email, admin_acc_id, admin_profile, admin_auth_id')
          .eq('admin_auth_id', authUser.id)
          .single();

        if (userError) {
          // If not found by auth_id, try by email
          const { data: emailData, error: emailError } = await supabase
            .from('admin_user')
            .select('admin_fullName, admin_email, admin_acc_id, admin_profile, admin_auth_id')
            .eq('admin_email', authUser.email)
            .single();

          if (emailError || !emailData) {
            console.error('User not found:', emailError);
            setIsAuthenticated(false);
            router.replace('/admin');
            setLoading(false);
            return;
          }

          setUser({
            id: emailData.admin_acc_id,
            name: emailData.admin_fullName,
            email: emailData.admin_email,
            admin_profile: emailData.admin_profile
          });

          // Set profile photo if exists
          if (emailData.admin_profile) {
            const { data: urlData } = supabase.storage
              .from('gwc_files')
              .getPublicUrl(emailData.admin_profile);
            
            if (urlData?.publicUrl) {
              setProfilePhoto(`${urlData.publicUrl}?t=${Date.now()}`);
            }
          }
        } else if (userData) {
          setUser({
            id: userData.admin_acc_id,
            name: userData.admin_fullName,
            email: userData.admin_email,
            admin_profile: userData.admin_profile
          });

          // Set profile photo if exists
          if (userData.admin_profile) {
            const { data: urlData } = supabase.storage
              .from('gwc_files')
              .getPublicUrl(userData.admin_profile);
            
            if (urlData?.publicUrl) {
              setProfilePhoto(`${urlData.publicUrl}?t=${Date.now()}`);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        setIsAuthenticated(false);
        router.replace('/admin');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router, isAuthenticated]);

  // Separate useEffect for real-time updates
  useEffect(() => {
    if (!user?.id || !isAuthenticated) return;

    const channel = supabase
      .channel('admin_user_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'admin_user',
          filter: `admin_acc_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Profile updated in real-time:', payload);
          
          const newData = payload.new as { admin_profile?: string; admin_fullName?: string };
          
          if (newData.admin_profile !== undefined) {
            if (newData.admin_profile) {
              const { data: urlData } = supabase.storage
                .from('gwc_files')
                .getPublicUrl(newData.admin_profile);
              
              if (urlData?.publicUrl) {
                setProfilePhoto(`${urlData.publicUrl}?t=${Date.now()}`);
              }
            } else {
              setProfilePhoto(null);
            }
          }

          if (newData.admin_fullName) {
            setUser(prev => prev ? { ...prev, name: newData.admin_fullName || prev.name } : null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isAuthenticated]); 

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    await supabase.auth.signOut();
    router.replace('/admin');
  };

  // Don't render anything if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <header className="bg-white shadow-sm pt-2 px-4 pb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: '#7d3c3c' }}>
          Admin Panel
        </h1>
        
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 px-4 py-2 rounded hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden relative" style={{ border: '2px solid #e84e1b' }}>
              {loading ? (
                <span className="text-gray-400 text-xs">...</span>
              ) : profilePhoto ? (
                <Image 
                  src={profilePhoto} 
                  alt={user?.name || 'User'} 
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="font-semibold" style={{ color: '#e84e1b' }}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <span style={{ color: '#e84e1b' }}>|</span>
            <span className="text-sm font-medium" style={{ color: '#e84e1b' }}>
               {loading ? 'Loading...' : user?.name || 'Unknown User'}
            </span>
            
            <svg 
              className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
              style={{ color: '#e84e1b' }}
              fill="none" 
              strokeWidth="2" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <Link
                href="/admin/dashboard/profile"
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setIsDropdownOpen(false)}
              >
                <svg className="w-4 h-4" fill="none" strokeWidth="2" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                My Profile
              </Link>
              
              <hr className="my-1 border-gray-200" />
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors w-full text-left"
              >
                <svg className="w-4 h-4" fill="none" strokeWidth="2" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Session Expired Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-9999">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4 animate-fade-in">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" strokeWidth="2" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Session Expired</h3>
              <p className="text-sm text-gray-600 mb-4">Your session has ended. You will be logged out automatically.</p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging out...
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}