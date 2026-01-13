'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, Eye, EyeOff, FileText, User, Briefcase, Menu, X } from 'lucide-react';
import Image from 'next/image';
import supabase from '@/lib/client';
import ClientHeader from '@/app/components/clientHeader/page';

interface ClientUser {
  client_id: string;
  client_person_incharge: string;
  client_email: string;
  client_person_contact: number | null;
  client_businessName: string | null;
  client_operationName: string | null;
  client_delivery_address: string | null;
  client_business_contact: number | null;
  client_type_business: string | null;
  client_ACRA: string | null;
  client_profile: string | null;
  client_auth_id: string;
  client_password: string | null;
  ad_streetName: string | null;
  ad_country: string | null;
  ad_postal: string | null;
}

interface Message {
  type: 'success' | 'error' | '';
  text: string;
}

export default function ClientProfilePage() {
  const [user, setUser] = useState<ClientUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [message, setMessage] = useState<Message>({ type: '', text: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeSection, setActiveSection] = useState<'account' | 'business' | 'privacy'>('account');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    personIncharge: '',
    email: '',
    personContact: '',
    businessName: '',
    operationName: '',
    deliveryAddress: '',
    ad_streetName: '',
    ad_country: '',
    ad_postal: '',
    businessContact: '',
    typeBusiness: '',
    password: '',
    confirmPassword: ''
  });

  const [contactErrors, setContactErrors] = useState({
    personContact: '',
    businessContact: ''
  });

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPhotoMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToSection = (section: 'account' | 'business' | 'privacy') => {
    setActiveSection(section);
    setIsMobileMenuOpen(false);
  };

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setMessage({ type: 'error', text: 'Please log in to view your profile.' });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('client_user')
        .select('*')
        .eq('client_auth_id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching user:', error);
        setMessage({ type: 'error', text: 'Failed to load profile information' });
        setLoading(false);
        return;
      }

      setUser(data);

      if (data.client_profile) {
        const { data: urlData } = supabase.storage
          .from('gwc_files')
          .getPublicUrl(data.client_profile);
        
        if (urlData?.publicUrl) {
          setProfilePhoto(`${urlData.publicUrl}?t=${Date.now()}`);
        }
      }

      setFormData({
        personIncharge: data.client_person_incharge || '',
        email: data.client_email || '',
        personContact: data.client_person_contact?.toString() || '',
        businessName: data.client_businessName || '',
        operationName: data.client_operationName || '',
        deliveryAddress: data.client_delivery_address || '',
        ad_streetName: data.ad_streetName || '',
        ad_country: data.ad_country || '',
        ad_postal: data.ad_postal || '',
        businessContact: data.client_business_contact?.toString() || '',
        typeBusiness: data.client_type_business || '',
        password: '',
        confirmPassword: ''
      });

    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: 'Failed to load profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'personContact' || name === 'businessContact') {
      const digitsOnly = value.replace(/\D/g, '');
      const limitedValue = digitsOnly.slice(0, 8);
      
      setFormData({ ...formData, [name]: limitedValue });
      
      if (limitedValue.length > 0 && limitedValue.length < 8) {
        setContactErrors(prev => ({ ...prev, [name]: 'Must be exactly 8 digits' }));
      } else {
        setContactErrors(prev => ({ ...prev, [name]: '' }));
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSaveChanges = async () => {
    if (!user) return;

    if (formData.personContact && formData.personContact.length !== 8) {
      setMessage({ type: 'error', text: 'Contact number must be exactly 8 digits' });
      setTimeout(() => setMessage({ type: '', text: '' }), 1000);
      return;
    }

    if (formData.businessContact && formData.businessContact.length !== 8) {
      setMessage({ type: 'error', text: 'Business contact must be exactly 8 digits' });
      setTimeout(() => setMessage({ type: '', text: '' }), 1000);
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      setTimeout(() => setMessage({ type: '', text: '' }), 1000);
      return;
    }

    if (formData.password && formData.password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      setTimeout(() => setMessage({ type: '', text: '' }), 1000);
      return;
    }

    try {
      setSaving(true);

      const updateData: Partial<ClientUser> = {};
      
      if (formData.personIncharge !== user.client_person_incharge) {
        updateData.client_person_incharge = formData.personIncharge;
      }
      if (formData.personContact !== user.client_person_contact?.toString()) {
        updateData.client_person_contact = formData.personContact ? parseInt(formData.personContact) : null;
      }
      if (formData.businessName !== user.client_businessName) {
        updateData.client_businessName = formData.businessName;
      }
      if (formData.operationName !== user.client_operationName) {
        updateData.client_operationName = formData.operationName;
      }
      if (formData.ad_streetName !== user.ad_streetName) {
        updateData.ad_streetName = formData.ad_streetName;
      }
      if (formData.ad_country !== user.ad_country) {
        updateData.ad_country = formData.ad_country;
      }
      if (formData.ad_postal !== user.ad_postal) {
        updateData.ad_postal = formData.ad_postal;
      }
      if (formData.businessContact !== user.client_business_contact?.toString()) {
        updateData.client_business_contact = formData.businessContact ? parseInt(formData.businessContact) : null;
      }
      if (formData.typeBusiness !== user.client_type_business) {
        updateData.client_type_business = formData.typeBusiness;
      }

      if (formData.password) {
        const { error: authError } = await supabase.auth.updateUser({
          password: formData.password
        });

        if (authError) {
          console.error('Auth password update error:', authError);
          throw new Error('Failed to update password. Please try again.');
        }
        
        updateData.client_password = formData.password;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: dbError } = await supabase
          .from('client_user')
          .update(updateData)
          .eq('client_auth_id', user.client_auth_id);

        if (dbError) {
          console.error('Database update error:', dbError);
          throw dbError;
        }
      }

      await fetchCurrentUser();

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      setIsEditMode(false);
      
      setTimeout(() => setMessage({ type: '', text: '' }), 1000);
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile. Please try again.';
      setMessage({ 
        type: 'error', 
        text: errorMessage
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 1000);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        personIncharge: user.client_person_incharge || '',
        email: user.client_email || '',
        personContact: user.client_person_contact?.toString() || '',
        businessName: user.client_businessName || '',
        operationName: user.client_operationName || '',
        deliveryAddress: user.client_delivery_address || '',
        ad_streetName: user.ad_streetName || '',
        ad_country: user.ad_country || '',
        ad_postal: user.ad_postal || '',
        businessContact: user.client_business_contact?.toString() || '',
        typeBusiness: user.client_type_business || '',
        password: '',
        confirmPassword: ''
      });
    }
    setIsEditMode(false);
  };

  const handlePreviewACRA = () => {
    if (!user?.client_ACRA) {
      setMessage({ type: 'error', text: 'No ACRA file available' });
      setTimeout(() => setMessage({ type: '', text: '' }), 1000);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('gwc_files')
      .getPublicUrl(user.client_ACRA);
    
    if (urlData?.publicUrl) {
      window.open(urlData.publicUrl, '_blank');
    }
  };

  const handleUploadPhoto = async () => {
    if (!user) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/jpg,image/webp';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Image size must be less than 5MB' });
        setTimeout(() => setMessage({ type: '', text: '' }), 1000);
        return;
      }
      
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setMessage({ type: 'error', text: 'Please upload a valid image file' });
        setTimeout(() => setMessage({ type: '', text: '' }), 1000);
        return;
      }
      
      try {
        setUploadingPhoto(true);
        setShowPhotoMenu(false);
        
        if (user.client_profile) {
          const { error: deleteError } = await supabase.storage
            .from('gwc_files')
            .remove([user.client_profile]);
          
          if (deleteError) {
            console.error('Error deleting old photo:', deleteError);
          }
        }
        
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const fileName = `client_profile/${user.client_id}_${timestamp}_${randomStr}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('gwc_files')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }
        
        const { error: updateError } = await supabase
          .from('client_user')
          .update({ client_profile: fileName })
          .eq('client_auth_id', user.client_auth_id);
        
        if (updateError) {
          await supabase.storage.from('gwc_files').remove([fileName]);
          throw updateError;
        }
        
        const { data: urlData } = supabase.storage
          .from('gwc_files')
          .getPublicUrl(fileName);
        
        const publicUrl = urlData?.publicUrl ? `${urlData.publicUrl}?t=${timestamp}` : null;
        
        setUser(prev => prev ? { ...prev, client_profile: fileName } : null);
        setProfilePhoto(publicUrl);
        
        setMessage({ type: 'success', text: 'Profile photo updated successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 1000);
        
      } catch (error) {
        console.error('Error uploading photo:', error);
        setMessage({ type: 'error', text: 'Failed to upload photo. Please try again.' });
        setTimeout(() => setMessage({ type: '', text: '' }), 1000);
      } finally {
        setUploadingPhoto(false);
      }
    };
    
    input.click();
  };

  const handleRemovePhoto = async () => {
    if (!user || !user.client_profile) return;
    
    try {
      setUploadingPhoto(true);
      setShowPhotoMenu(false);
      
      const { error: deleteError } = await supabase.storage
        .from('gwc_files')
        .remove([user.client_profile]);
      
      if (deleteError) throw deleteError;
      
      const { error: updateError } = await supabase
        .from('client_user')
        .update({ client_profile: null })
        .eq('client_auth_id', user.client_auth_id);
      
      if (updateError) throw updateError;
      
      await fetchCurrentUser();
      
      setMessage({ type: 'success', text: 'Profile photo removed successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 1000);
      
    } catch (error) {
      console.error('Error removing photo:', error);
      setMessage({ type: 'error', text: 'Failed to remove photo' });
      setTimeout(() => setMessage({ type: '', text: '' }), 1000);
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <>
      <style jsx>{`
        .main-container {
          display: flex;
          gap: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }
        
        .sidebar {
          width: 280px;
          background-color: white;
          padding: 32px 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          border-radius: 12px;
          height: fit-content;
          position: sticky;
          top: 24px;
        }
        
        .content-area {
          flex: 1;
        }
        
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        
        .action-buttons {
          display: flex;
          gap: 12px;
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }
        
        .mobile-menu-toggle {
          display: none;
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background-color: #e84e1b;
          border: none;
          color: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          cursor: pointer;
          align-items: center;
          justify-content: center;
          z-index: 999;
        }
        
        .mobile-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0,0,0,0.5);
          z-index: 998;
        }
        
        .mobile-close-btn {
          display: none;
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          color: #666;
        }
        
        @media (max-width: 768px) {
          .main-container {
            flex-direction: column;
          }
          
          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            width: 85%;
            max-width: 320px;
            height: 100vh;
            z-index: 999;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            overflow-y: auto;
            border-radius: 0;
          }
          
          .sidebar.mobile-open {
            transform: translateX(0);
          }
          
          .mobile-menu-toggle {
            display: flex;
          }
          
          .mobile-overlay.active {
            display: block;
          }
          
          .mobile-close-btn {
            display: block;
          }
          
          .content-area {
            width: 100%;
          }
          
          .form-grid {
            grid-template-columns: 1fr;
          }
          
          .action-buttons {
            flex-direction: column;
          }
          
          .action-buttons button {
            width: 100%;
          }
          
          .section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          
          .section-header > div {
            width: 100%;
          }
        }
        
        @media (max-width: 480px) {
          .profile-card {
            padding: 20px 16px !important;
          }
          
          .sidebar {
            padding: 24px 16px;
            width: 90%;
          }
        }
      `}</style>

      <div className="min-h-screen" style={{ fontFamily: '"Roboto Condensed"', backgroundColor: '#f5e6d3' }}>
        <ClientHeader />
        
        <button
          className="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu size={24} />
        </button>

        {isMobileMenuOpen && (
          <div
            className="mobile-overlay active"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <div style={{ backgroundColor: '#f5ebe0', minHeight: '100vh', padding: '20px' }}>
          <div className="main-container">
            
            <div className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
              <button
                className="mobile-close-btn"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X size={24} />
              </button>

              <h2 style={{
                fontSize: '22px',
                fontWeight: 'bold',
                color: '#7d3c3c',
                marginBottom: '32px'
              }}>Profile</h2>
              
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <div ref={dropdownRef} style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  border: '3px solid #e84e1b',
                  overflow: 'visible',
                  backgroundColor: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  {uploadingPhoto ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div style={{
                        width: '30px',
                        height: '30px',
                        border: '3px solid #f3f3f3',
                        borderTop: '3px solid #e84e1b',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                      <span style={{ fontSize: '11px', color: '#666' }}>Uploading...</span>
                    </div>
                  ) : profilePhoto ? (
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      overflow: 'hidden',
                      borderRadius: '50%'
                    }}>
                      <Image 
                        src={profilePhoto} 
                        alt="Profile"
                        fill
                        style={{ objectFit: 'cover' }}
                        unoptimized
                      />
                    </div>
                  ) : (
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  )}
                  <button
                    onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                    disabled={uploadingPhoto}
                    style={{
                      position: 'absolute',
                      bottom: '4px',
                      right: '4px',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#e84e1b',
                      border: '2px solid white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'white'
                    }}
                  >
                    <Camera size={16} />
                  </button>

                  {showPhotoMenu && !uploadingPhoto && (
                    <div style={{
                      position: 'absolute',
                      top: '130px',
                      right: '0',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      overflow: 'hidden',
                      zIndex: 10,
                      minWidth: '160px'
                    }}>
                      <button
                        onClick={handleUploadPhoto}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: 'none',
                          backgroundColor: 'white',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: '#333',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f5f5f5'}
                        onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'white'}
                      >
                        Upload Photo
                      </button>
                      <div style={{ height: '1px', backgroundColor: '#eee' }}></div>
                      <button
                        onClick={handleRemovePhoto}
                        disabled={!profilePhoto}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: 'none',
                          backgroundColor: 'white',
                          textAlign: 'left',
                          cursor: profilePhoto ? 'pointer' : 'not-allowed',
                          fontSize: '14px',
                          color: profilePhoto ? '#e53e3e' : '#ccc',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (profilePhoto) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f5f5f5';
                        }}
                        onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'white'}
                      >
                        Remove Photo
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#7d3c3c',
                  marginBottom: '4px',
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase'
                }}>
                  {loading ? 'Loading...' : user?.client_person_incharge || 'Unknown User'}
                </h3>
                <p style={{ color: '#666', fontSize: '13px' }}>
                  {loading ? '...' : user?.client_id || 'Unknown ID'}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => scrollToSection('account')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    backgroundColor: activeSection === 'account' ? '#f5e6d3' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: activeSection === 'account' ? '600' : '500',
                    color: activeSection === 'account' ? '#7d3c3c' : '#666',
                    transition: 'all 0.2s',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => {
                    if (activeSection !== 'account') {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f9f9f9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeSection !== 'account') {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <User size={18} />
                  Account Information
                </button>

                <button
                  onClick={() => scrollToSection('business')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    backgroundColor: activeSection === 'business' ? '#f5e6d3' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: activeSection === 'business' ? '600' : '500',
                    color: activeSection === 'business' ? '#7d3c3c' : '#666',
                    transition: 'all 0.2s',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => {
                    if (activeSection !== 'business') {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f9f9f9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeSection !== 'business') {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <Briefcase size={18} />
                  Business Information
                </button>
              </div>
            </div>

            <div className="content-area">
              {message.text && (
                <div style={{
                  marginBottom: '20px',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
                  color: message.type === 'success' ? '#155724' : '#721c24',
                  border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
                }}>
                  {message.text}
                </div>
              )}

              {activeSection === 'account' && (
                <div className="profile-card" style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '32px 40px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  marginBottom: '24px'
                }}>
                  <div className="section-header">
                    <h2 style={{
                      fontSize: '22px',
                      fontWeight: 'bold',
                      color: '#7d3c3c',
                      margin: 0
                    }}>Account Information</h2>
                    
                    {!isEditMode ? (
                    <button
                      onClick={() => setIsEditMode(true)}
                      disabled={loading || saving}
                      style={{
                        padding: '10px 24px',
                        backgroundColor: (loading || saving) ? '#ccc' : '#e84e1b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: (loading || saving) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Edit Profile
                    </button>
                  ) : (
                      <div className="action-buttons">
                        <button
                          onClick={handleSaveChanges}
                          disabled={loading || saving}
                          style={{
                            padding: '10px 24px',
                            backgroundColor: (loading || saving) ? '#ccc' : '#e84e1b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: (loading || saving) ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={loading || saving}
                          style={{
                            padding: '10px 24px',
                            backgroundColor: '#e0e0e0',
                            color: '#666',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: (loading || saving) ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="form-grid">
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: '8px'
                      }}>
                        Person Incharge
                      </label>
                      <input
                        type="text"
                        name="personIncharge"
                        value={formData.personIncharge}
                        onChange={handleInputChange}
                        disabled={!isEditMode || loading || saving}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px',
                          outline: 'none',
                          backgroundColor: (!isEditMode || loading || saving) ? '#f5f5f5' : 'white',
                          cursor: (!isEditMode || loading || saving) ? 'not-allowed' : 'text',
                          color: (!isEditMode || loading || saving) ? '#666' : '#333'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: '8px'
                      }}>
                        Mobile Contact
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{
                          position: 'absolute',
                          left: '14px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: (!isEditMode || loading || saving) ? '#666' : '#333',
                          fontSize: '14px',
                          pointerEvents: 'none'
                        }}>
                          +65
                        </span>
                        <input
                          type="text"
                          name="personContact"
                          value={formData.personContact}
                          onChange={handleInputChange}
                          disabled={!isEditMode || loading || saving}
                          placeholder="12345678"
                          maxLength={8}
                          style={{
                            width: '100%',
                            padding: '10px 14px 10px 50px',
                            border: `1px solid ${contactErrors.personContact && isEditMode ? '#e53e3e' : '#ddd'}`,
                            borderRadius: '6px',
                            fontSize: '14px',
                            outline: 'none',
                            backgroundColor: (!isEditMode || loading || saving) ? '#f5f5f5' : 'white',
                            cursor: (!isEditMode || loading || saving) ? 'not-allowed' : 'text',
                            color: (!isEditMode || loading || saving) ? '#666' : '#333'
                          }}
                        />
                      </div>
                      {contactErrors.personContact && isEditMode && (
                        <span style={{ fontSize: '12px', color: '#e53e3e', marginTop: '4px', display: 'block' }}>
                          {contactErrors.personContact}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: '32px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#333',
                      marginBottom: '8px'
                    }}>
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      disabled={true}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: '#f5f5f5',
                        cursor: 'not-allowed',
                        color: '#666'
                      }}
                    />
                  </div>

                  <div style={{
                    borderTop: '2px solid #f0f0f0',
                    paddingTop: '32px',
                    marginTop: '32px'
                  }}>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#7d3c3c',
                      marginBottom: '24px'
                    }}>Account Settings</h3>

                    <div className="form-grid">
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#333',
                          marginBottom: '8px'
                        }}>
                          New Password
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            disabled={!isEditMode || loading || saving}
                            placeholder="Leave blank to keep current"
                            style={{
                              width: '100%',
                              padding: '10px 40px 10px 14px',
                              border: '1px solid #ddd',
                              borderRadius: '6px',
                              fontSize: '14px',
                              outline: 'none',
                              backgroundColor: (!isEditMode || loading || saving) ? '#f5f5f5' : 'white',
                              cursor: (!isEditMode || loading || saving) ? 'not-allowed' : 'text',
                              color: (!isEditMode || loading || saving) ? '#666' : '#333'
                            }}
                          />
                          {isEditMode && !loading && !saving && (
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#666',
                                padding: '4px'
                              }}
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#333',
                          marginBottom: '8px'
                        }}>
                          Confirm New Password
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            disabled={!isEditMode || loading || saving}
                            placeholder="Leave blank to keep current"
                            style={{
                              width: '100%',
                              padding: '10px 40px 10px 14px',
                              border: '1px solid #ddd',
                              borderRadius: '6px',
                              fontSize: '14px',
                              outline: 'none',
                              backgroundColor: (!isEditMode || loading || saving) ? '#f5f5f5' : 'white',
                              cursor: (!isEditMode || loading || saving) ? 'not-allowed' : 'text',
                              color: (!isEditMode || loading || saving) ? '#666' : '#333'
                            }}
                          />
                          {isEditMode && !loading && !saving && (
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#666',
                                padding: '4px'
                              }}
                            >
                              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'business' && (
                <div className="profile-card" style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '32px 40px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  marginBottom: '24px'
                }}>
                  <div className="section-header">
                    <h2 style={{
                      fontSize: '22px',
                      fontWeight: 'bold',
                      color: '#7d3c3c',
                      margin: 0
                    }}>Business Information</h2>
                    
                    {!isEditMode ? (
                      <button
                        onClick={() => setIsEditMode(true)}
                        disabled={loading || saving}
                        style={{
                          padding: '10px 24px',
                          backgroundColor: (loading || saving) ? '#ccc' : '#e84e1b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: (loading || saving) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Edit Profile
                      </button>
                    ) : (
                      <div className="action-buttons">
                        <button
                          onClick={handleSaveChanges}
                          disabled={loading || saving}
                          style={{
                            padding: '10px 24px',
                            backgroundColor: (loading || saving) ? '#ccc' : '#e84e1b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: (loading || saving) ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={loading || saving}
                          style={{
                            padding: '10px 24px',
                            backgroundColor: '#e0e0e0',
                            color: '#666',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: (loading || saving) ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="form-grid">
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: '8px'
                      }}>
                        R.O.C Business Name
                      </label>
                      <input
                        type="text"
                        name="businessName"
                        value={formData.businessName}
                        onChange={handleInputChange}
                        disabled={!isEditMode || loading || saving}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px',
                          outline: 'none',
                          backgroundColor: (!isEditMode || loading || saving) ? '#f5f5f5' : 'white',
                          cursor: (!isEditMode || loading || saving) ? 'not-allowed' : 'text',
                          color: (!isEditMode || loading || saving) ? '#666' : '#333'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: '8px'
                      }}>
                        Operation Name
                      </label>
                      <input
                        type="text"
                        name="operationName"
                        value={formData.operationName}
                        onChange={handleInputChange}
                        disabled={!isEditMode || loading || saving}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px',
                          outline: 'none',
                          backgroundColor: (!isEditMode || loading || saving) ? '#f5f5f5' : 'white',
                          cursor: (!isEditMode || loading || saving) ? 'not-allowed' : 'text',
                          color: (!isEditMode || loading || saving) ? '#666' : '#333'
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="form-grid">
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#333',
                      marginBottom: '8px'
                    }}>
                      Street Name
                    </label>
                    <input
                      type="text"
                      name="ad_streetName"
                      value={formData.ad_streetName}
                      onChange={handleInputChange}
                      disabled={!isEditMode || loading || saving}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: (!isEditMode || loading || saving) ? '#f5f5f5' : 'white',
                        cursor: (!isEditMode || loading || saving) ? 'not-allowed' : 'text',
                        color: (!isEditMode || loading || saving) ? '#666' : '#333'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#333',
                      marginBottom: '8px'
                    }}>
                      Country
                    </label>
                    <input
                      type="text"
                      name="ad_country"
                      value={formData.ad_country}
                      onChange={handleInputChange}
                      disabled={!isEditMode || loading || saving}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: (!isEditMode || loading || saving) ? '#f5f5f5' : 'white',
                        cursor: (!isEditMode || loading || saving) ? 'not-allowed' : 'text',
                        color: (!isEditMode || loading || saving) ? '#666' : '#333'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '8px'
                  }}>
                    Postal Code
                  </label>
                  <input
                    type="text"
                    name="ad_postal"
                    value={formData.ad_postal}
                    onChange={handleInputChange}
                    disabled={!isEditMode || loading || saving}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: (!isEditMode || loading || saving) ? '#f5f5f5' : 'white',
                      cursor: (!isEditMode || loading || saving) ? 'not-allowed' : 'text',
                      color: (!isEditMode || loading || saving) ? '#666' : '#333'
                    }}
                  />
                </div>

                  <div className="form-grid">
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: '8px'
                      }}>
                        Mobile Contact
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{
                          position: 'absolute',
                          left: '14px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: (!isEditMode || loading || saving) ? '#666' : '#333',
                          fontSize: '14px',
                          pointerEvents: 'none'
                        }}>
                          +65
                        </span>
                        <input
                          type="text"
                          name="businessContact"
                          value={formData.businessContact}
                          onChange={handleInputChange}
                          disabled={!isEditMode || loading || saving}
                          placeholder="12345678"
                          maxLength={8}
                          style={{
                            width: '100%',
                            padding: '10px 14px 10px 50px',
                            border: `1px solid ${contactErrors.businessContact && isEditMode ? '#e53e3e' : '#ddd'}`,
                            borderRadius: '6px',
                            fontSize: '14px',
                            outline: 'none',
                            backgroundColor: (!isEditMode || loading || saving) ? '#f5f5f5' : 'white',
                            cursor: (!isEditMode || loading || saving) ? 'not-allowed' : 'text',
                            color: (!isEditMode || loading || saving) ? '#666' : '#333'
                          }}
                        />
                      </div>
                      {contactErrors.businessContact && isEditMode && (
                        <span style={{ fontSize: '12px', color: '#e53e3e', marginTop: '4px', display: 'block' }}>
                          {contactErrors.businessContact}
                        </span>
                      )}
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: '8px'
                      }}>
                        Type of Business
                      </label>
                      <select
                        name="typeBusiness"
                        value={formData.typeBusiness}
                        onChange={handleInputChange}
                        disabled={!isEditMode || loading || saving}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px',
                          outline: 'none',
                          backgroundColor: (!isEditMode || loading || saving) ? '#f5f5f5' : 'white',
                          cursor: (!isEditMode || loading || saving) ? 'not-allowed' : 'pointer',
                          color: (!isEditMode || loading || saving) ? '#666' : '#333',
                          appearance: 'auto'
                        }}
                      >
                        <option value="">Select business type</option>
                        <option value="Sole Proprietor">Sole Proprietor</option>
                        <option value="Partnership">Partnership</option>
                        <option value="Private Limited">Private Limited</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: '20px' }}>
                    <button
                      onClick={handlePreviewACRA}
                      disabled={!user?.client_ACRA}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        backgroundColor: user?.client_ACRA ? '#7d3c3c' : '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: user?.client_ACRA ? 'pointer' : 'not-allowed'
                      }}
                    >
                      <FileText size={18} />
                      Preview ACRA File
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}