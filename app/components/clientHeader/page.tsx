'use client';

import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Truck, User, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import supabase from '@/lib/client';
import { usePathname, useRouter } from 'next/navigation';
import LoadingSpinner from '../loader/page';

interface User {
  id: string;
  name: string;
  email: string;
  client_profile?: string;
  userType: 'client' | 'person_incharge';
}

export default function ClientHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const [basketCount, setBasketCount] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);

  useEffect(() => {
  let isMounted = true;

  const checkAuth = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      if (isMounted) {
        setIsAuthenticated(false);
      }
      return;
    }
    
    if (isMounted) {
      setIsAuthenticated(true);
    }
  };

  checkAuth();

  // Listen for auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      if (isMounted) {
        setIsAuthenticated(false);
        setShowSessionModal(true);
        
        setTimeout(async () => {
          await supabase.auth.signOut();
          router.replace('/');
        }, 2000);
      }
    } else if (session && isMounted) {
      setIsAuthenticated(true);
    }
  });

  return () => {
    isMounted = false;
    subscription.unsubscribe();
  };
}, [router]);

  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchBasketCount = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authUser) return;

        const { data, error } = await supabase
          .from('client_basket')
          .select('quantity')
          .eq('client_auth_id', authUser.id);

        if (!error && data) {
          const totalCount = data.reduce((sum, item) => sum + (item.quantity || 0), 0);
          setBasketCount(totalCount);
        }
      } catch (error) {
        console.error('Failed to fetch basket count:', error);
      }
    };

    fetchBasketCount();

    const setupRealtimeSubscription = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        const channel = supabase
          .channel('basket_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'client_basket',
              filter: `client_auth_id=eq.${authUser.id}`
            },
            () => {
              fetchBasketCount();
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    };

    setupRealtimeSubscription();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchUser = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authUser) {
          console.error('Auth error:', authError);
          setIsAuthenticated(false);
          router.replace('/');
          setLoading(false);
          return;
        }

        const { data: clientData, error: clientError } = await supabase
          .from('client_user')
          .select('client_person_incharge, client_businessName, client_email, client_id, client_profile, client_auth_id')
          .eq('client_auth_id', authUser.id)
          .single();

        if (!clientError && clientData) {
          const displayName = clientData.client_person_incharge || clientData.client_businessName || 'Unknown User';
          
          setUser({
            id: clientData.client_id,
            name: displayName,
            email: clientData.client_email,
            client_profile: clientData.client_profile,
            userType: 'client'
          });

          if (clientData.client_profile) {
            const { data: urlData } = supabase.storage
              .from('gwc_files')
              .getPublicUrl(clientData.client_profile);
            
            if (urlData?.publicUrl) {
              setProfilePhoto(`${urlData.publicUrl}?t=${Date.now()}`);
            }
          }
        } else {
          const { data: emailData, error: emailError } = await supabase
            .from('client_user')
            .select('client_person_incharge, client_businessName, client_email, client_id, client_profile, client_auth_id')
            .eq('client_email', authUser.email)
            .single();

          if (!emailError && emailData) {
            const displayName = emailData.client_person_incharge || emailData.client_businessName || 'Unknown User';
            
            setUser({
              id: emailData.client_id,
              name: displayName,
              email: emailData.client_email,
              client_profile: emailData.client_profile,
              userType: 'client'
            });

            if (emailData.client_profile) {
              const { data: urlData } = supabase.storage
                .from('gwc_files')
                .getPublicUrl(emailData.client_profile);
              
              if (urlData?.publicUrl) {
                setProfilePhoto(`${urlData.publicUrl}?t=${Date.now()}`);
              }
            }
          } else {
            console.error('User not found');
            setIsAuthenticated(false);
            router.replace('/');
          }
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        setIsAuthenticated(false);
        router.replace('/');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router, isAuthenticated]);

  useEffect(() => {
    if (!user?.id || !isAuthenticated) return;

    const tableName = user.userType === 'client' ? 'client_user' : 'person_incharge';
    const filterColumn = user.userType === 'client' ? 'client_acc_id' : 'incharge_id';

    const channel = supabase
      .channel(`${tableName}_changes`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: tableName,
          filter: `${filterColumn}=eq.${user.id}`
        },
        (payload) => {
          console.log('Profile updated in real-time:', payload);
          
          if (user.userType === 'client') {
            const newData = payload.new as { 
              client_profile?: string; 
              client_person_incharge?: string;
              client_businessName?: string;
            };
            
            if (newData.client_profile !== undefined) {
              if (newData.client_profile) {
                const { data: urlData } = supabase.storage
                  .from('gwc_files')
                  .getPublicUrl(newData.client_profile);
                
                if (urlData?.publicUrl) {
                  setProfilePhoto(`${urlData.publicUrl}?t=${Date.now()}`);
                }
              } else {
                setProfilePhoto(null);
              }
            }

            if (newData.client_person_incharge || newData.client_businessName) {
              const displayName = newData.client_person_incharge || newData.client_businessName;
              setUser(prev => prev ? { ...prev, name: displayName } : null);
            }
          } else {
            const newData = payload.new as { incharge_profile?: string; incharge_name?: string };
            
            if (newData.incharge_profile !== undefined) {
              if (newData.incharge_profile) {
                const { data: urlData } = supabase.storage
                  .from('gwc_files')
                  .getPublicUrl(newData.incharge_profile);
                
                if (urlData?.publicUrl) {
                  setProfilePhoto(`${urlData.publicUrl}?t=${Date.now()}`);
                }
              } else {
                setProfilePhoto(null);
              }
            }

            if (newData.incharge_name) {
              setUser(prev => prev ? { ...prev, name: newData.incharge_name } : null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.userType, isAuthenticated]);

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
    setIsLoggingOut(true);
    setIsDropdownOpen(false);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await supabase.auth.signOut();
    
    window.location.href = '/';
  };

  // Don't render anything if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <header className="bg-white border-b shadow-sm pt-2 pb-3 border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link 
            href="/client"
            onClick={() => setIsNavigating(true)}
          >
            <h1 
              className="text-2xl font-bold tracking-tight cursor-pointer hover:opacity-80 transition-opacity"
              style={{ 
                color: '#7d3c3c',
                fontFamily: "'Roboto Condensed', sans-serif"
              }}
            >
              <span className="hidden md:inline">Gelato Wholesale Collective</span>
              <span className="md:hidden">GWC</span>
            </h1>
          </Link>

                  
          <div className="flex items-center gap-6">
            <Link
              href="/client/basket"
              className={`hover:opacity-70 transition-opacity relative ${
                pathname === '/client/basket' ? 'after:absolute after:-bottom-3 after:left-0 after:right-0 after:h-0.5 after:bg-[#e84e1b]' : ''
              }`}
              aria-label="Cart"
            >
              <div className="relative">
                <ShoppingCart 
                  size={24} 
                  style={{ 
                    color: '#e84e1b', 
                    strokeWidth: pathname === '/client/basket' ? 2.5 : 1.5 
                  }} 
                />
                {pathname !== '/client/basket' && basketCount > 0 && (
                <span 
                  className="absolute -top-2 -right-2 flex items-center justify-center min-w-4.5 h-4.5 text-[10px] font-bold text-white rounded-full px-1"
                  style={{ backgroundColor: '#e84e1b' }}
                >
                  {basketCount > 99 ? '99+' : basketCount}
                </span>
              )}
              </div>
            </Link>

            <Link
              href="/client/order"
              className={`hover:opacity-70 transition-opacity relative ${
                pathname === '/client/order' ? 'after:absolute after:-bottom-3 after:left-0 after:right-0 after:h-0.5 after:bg-[#e84e1b]' : ''
              }`}
              aria-label="Orders"
            >
              <Truck 
                size={24} 
                style={{ 
                  color: '#e84e1b', 
                  strokeWidth: pathname === '/client/order' ? 2.5 : 1.5 
                }} 
              />
            </Link>
            
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 hover:opacity-70 transition-opacity"
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
                <span className="hidden md:inline" style={{ color: '#e84e1b' }}>|</span>
                <span className="text-sm font-medium hidden md:inline" style={{ color: '#e84e1b' }}>
                  {loading ? 'Loading...' : user?.name || 'Unknown User'}
                </span>
                
                <ChevronDown 
                  size={16} 
                  style={{ color: '#e84e1b' }}
                  className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <Link
                    href="/client/profile"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsNavigating(true);
                    }}
                  >
                    <User size={16} />
                    My Profile
                  </Link>
                  
                  <hr className="my-1 border-gray-200" />
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors w-full text-left"
                    disabled={isLoggingOut}
                  >
                    <svg className="w-4 h-4" fill="none" strokeWidth="2" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {isLoggingOut ? 'Logging out...' : 'Logout'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {(loading || isNavigating || isLoggingOut) && (
          <LoadingSpinner 
            duration={loading ? 500 : isLoggingOut ? 500 : 500}
            onComplete={() => {
              setLoading(false);
              setIsNavigating(false);
              if (!isLoggingOut) {
                setIsLoggingOut(false);
              }
            }}
          />
        )}
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