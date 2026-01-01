'use client';

import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Truck, User, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import supabase from '@/lib/client';

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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Get current auth session
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authUser) {
          console.error('Auth error:', authError);
          setLoading(false);
          return;
        }

        // Fetch from client_user table
        const { data: clientData, error: clientError } = await supabase
          .from('client_user')
          .select('client_person_incharge, client_businessName, client_email, client_id, client_profile, client_auth_id')
          .eq('client_auth_id', authUser.id)
          .single();

        if (!clientError && clientData) {
          // Use client_person_incharge, fallback to client_businessName if not available
          const displayName = clientData.client_person_incharge || clientData.client_businessName || 'Unknown User';
          
          setUser({
            id: clientData.client_id,
            name: displayName,
            email: clientData.client_email,
            client_profile: clientData.client_profile,
            userType: 'client'
          });

          // Set profile photo if exists
          if (clientData.client_profile) {
            const { data: urlData } = supabase.storage
              .from('gwc_files')
              .getPublicUrl(clientData.client_profile);
            
            if (urlData?.publicUrl) {
              setProfilePhoto(`${urlData.publicUrl}?t=${Date.now()}`);
            }
          }
        } else {
          // Try by email as fallback
          const { data: emailData, error: emailError } = await supabase
            .from('client_user')
            .select('client_person_incharge, client_businessName, client_email, client_id, client_profile, client_auth_id')
            .eq('client_email', authUser.email)
            .single();

          if (!emailError && emailData) {
            // Use client_person_incharge, fallback to client_businessName if not available
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
          }
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);
  // Real-time updates useEffect - SINGLE VERSION
  useEffect(() => {
    if (!user?.id) return;

    // Set up real-time subscription based on user type
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
            
            // Update profile photo
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

            // Update user name if changed (prioritize client_person_incharge, fallback to client_businessName)
            if (newData.client_person_incharge || newData.client_businessName) {
              const displayName = newData.client_person_incharge || newData.client_businessName;
              setUser(prev => prev ? { ...prev, name: displayName } : null);
            }
          } else {
            const newData = payload.new as { incharge_profile?: string; incharge_name?: string };
            
            // Update profile photo
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

            // Update user name if changed
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
  }, [user?.id, user?.userType]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white border-b shadow-sm pt-2 pb-3 border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <h1 
          className="text-2xl font-bold tracking-tight"
          style={{ 
            color: '#7d3c3c',
            fontFamily: "'Roboto Condensed', sans-serif"
          }}
        >
          Gelato Wholesale Collective
        </h1>
        
        <div className="flex items-center gap-6">
        <Link
          href="/client/basket"
          className="hover:opacity-70 transition-opacity"
          aria-label="Cart"
        >
          <ShoppingCart size={24} style={{ color: '#e84e1b', strokeWidth: 1.5 }} />
        </Link>

        <Link
          href="/client/order"
          className="hover:opacity-70 transition-opacity"
          aria-label="Orders"
        >
          <Truck size={24} style={{ color: '#e84e1b', strokeWidth: 1.5 }} />
        </Link>

          
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 hover:opacity-70 transition-opacity"
            >
              {/* Profile Picture */}
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
              {/* User Name */}
              <span className="text-sm font-medium" style={{ color: '#e84e1b' }}>
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
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <User size={16} />
                  My Profile
                </Link>
                
                <hr className="my-1 border-gray-200" />
                
                <Link
                  href="/"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <svg className="w-4 h-4" fill="none" strokeWidth="2" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}