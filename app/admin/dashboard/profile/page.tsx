'use client';
import { useState, useEffect } from 'react';
import { Settings, Users, Camera, UserMinus, Plus, Eye, EyeOff } from 'lucide-react';
import Sidepanel from '@/app/components/sidepanel/page';
import Header from '@/app/components/header/page';
import supabase from '@/lib/client';
import Image from 'next/image';

interface AdminUser {
  admin_auth_id: string;
  admin_acc_id: string;
  admin_fullName: string;
  admin_email: string;
  admin_role: string;
  admin_password: string;
  created_at: string;
  admin_profile: string | null; 
}

interface Message {
  type: 'success' | 'error' | '';
  text: string;
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('account');
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false); 
  const [createdAccountId, setCreatedAccountId] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string; name: string } | null>(null);
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);
  const [deletedUserName, setDeletedUserName] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [message, setMessage] = useState<Message>({ type: '', text: '' });
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [newUserData, setNewUserData] = useState({
    fullName: '',
    email: '',
    role: 'User'
  });
  const [searchUser, setSearchUser] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
  fetchCurrentUser();
  }, []);
  useEffect(() => {
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Auth session:', session);
    if (!session) {
      console.error('No authenticated session found');
      // Optionally redirect to login
      // window.location.href = '/login';
    }
  };
  checkAuth();
}, []);

  const fetchCurrentUser = async () => {
  try {
    setLoadingUser(true);
    
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      setMessage({ type: 'error', text: 'Session error. Please try logging in again.' });
      setLoadingUser(false);
      return;
    }
    
    if (!session || !session.user) {
      console.error('No active session');
      setMessage({ type: 'error', text: 'No active session. Please log in.' });
      setLoadingUser(false);
      return;
    }
    
    console.log('Current session user ID:', session.user.id);
    
    // Fetch user data from admin_user table
    const { data, error } = await supabase
      .from('admin_user')
      .select('*')
      .eq('admin_auth_id', session.user.id)
      .single();
    
    if (error) {
      console.error('Error fetching user from admin_user:', error);
      
      if (error.code === 'PGRST116') {
        setMessage({ type: 'error', text: 'User profile not found. Please contact administrator.' });
      } else {
        setMessage({ type: 'error', text: 'Failed to load user information' });
      }
      setLoadingUser(false);
      return;
    }
    
    if (!data) {
      console.error('No user data returned');
      setMessage({ type: 'error', text: 'User profile not found' });
      setLoadingUser(false);
      return;
    }
    
    console.log('Fetched user data:', data);
    setCurrentUser(data);
    
    // Set profile photo if exists
    if (data.admin_profile) {
      try {
        // Get public URL for the profile photo
        const { data: urlData } = supabase.storage
          .from('gwc_files')
          .getPublicUrl(data.admin_profile);
        
        if (urlData && urlData.publicUrl) {
          // Add timestamp to prevent caching issues
          setProfilePhoto(`${urlData.publicUrl}?t=${Date.now()}`);
        } else {
          console.warn('Could not generate public URL for profile photo');
          setProfilePhoto(null);
        }
      } catch (urlError) {
        console.error('Error getting public URL:', urlError);
        setProfilePhoto(null);
      }
    } else {
      setProfilePhoto(null);
    }
    
    // Pre-fill the form with current user data
    setFormData({
      fullName: data.admin_fullName || '',
      email: data.admin_email || '',
      password: '',
      confirmPassword: ''
    });
    
    // Clear any previous error messages
    setMessage({ type: '', text: '' });
    
  } catch (error) {
    console.error('Error fetching current user:', error);
    setMessage({ type: 'error', text: 'Failed to load user information. Please refresh the page.' });
  } finally {
    setLoadingUser(false);
  }
};

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_user')  // Changed from 'admin_auth_id'
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage({ type: 'error', text: 'Failed to load users' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const generateAccountId = async (): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('admin_user')  // Changed from 'admin_auth_id'
        .select('admin_acc_id')
        .order('admin_acc_id', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error generating ID:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return 'GWC-0000001';
      }

      const lastId = data[0].admin_acc_id;
      const numericPart = parseInt(lastId.split('-')[1]) + 1;
      const newId = `GWC-${String(numericPart).padStart(7, '0')}`;
      
      return newId;
    } catch (error) {
      console.error('Error generating account ID:', error);
      return 'GWC-0000001';
    }
  };

  const sendEmailNotification = async (userData: {
  accountId: string;
  fullName: string;
  email: string;
  role: string;
  password: string;
  createdAt: string;
}) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const emailContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background-color: #ff5722; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
      .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
      .details { background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
      .detail-row { display: flex; padding: 10px 0; border-bottom: 1px solid #eee; }
      .label { font-weight: bold; width: 150px; color: #666; }
      .value { color: #333; }
      .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
      .footer { text-align: center; color: #999; padding: 20px; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 style="margin: 0;">Account Created Successfully</h1>
      </div>
      <div class="content">
        <p>Hello <strong>${userData.fullName}</strong>,</p>
        <p>Your admin account has been created successfully. Below are your account details:</p>
        
        <div class="details">
          <div class="detail-row">
            <span class="label">Account ID:</span>
            <span class="value">${userData.accountId}</span>
          </div>
          <div class="detail-row">
            <span class="label">Full Name:</span>
            <span class="value">${userData.fullName}</span>
          </div>
          <div class="detail-row">
            <span class="label">Email:</span>
            <span class="value">${userData.email}</span>
          </div>
          <div class="detail-row">
            <span class="label">Role:</span>
            <span class="value">${userData.role}</span>
          </div>
          <div class="detail-row">
            <span class="label">Password:</span>
            <span class="value">${userData.password}</span>
          </div>
          <div class="detail-row">
            <span class="label">Created At:</span>
            <span class="value">${new Date(userData.createdAt).toLocaleString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
          </div>
        </div>

        <div class="warning">
          <strong>⚠️ IMPORTANT:</strong>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Please keep your credentials secure and confidential</li>
            <li>We recommend changing your password after your first login</li>
            <li>Never share your password with anyone</li>
          </ul>
        </div>

        <p>If you have any questions or didn't request this account, please contact your administrator immediately.</p>
      </div>
      <div class="footer">
        <p>This is an automated notification. Please do not reply to this email.</p>
        <p>&copy; ${new Date().getFullYear()} Your Company. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
    `;

    // Console log for testing
    console.log('========================================');
    console.log('EMAIL NOTIFICATION');
    console.log('========================================');
    console.log('To:', userData.email);
    console.log('Subject: Account Created Successfully');
    console.log('========================================');
    console.log('Account Details:');
    console.log('Account ID:', userData.accountId);
    console.log('Full Name:', userData.fullName);
    console.log('Email:', userData.email);
    console.log('Role:', userData.role);
    console.log('Password:', userData.password);
    console.log('Created At:', userData.createdAt);
    console.log('========================================');
    
    // TODO: Implement actual email sending with Supabase Edge Functions
    // When ready, uncomment and use emailContent variable:
    /*
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { 
        to: userData.email, 
        subject: 'Account Created Successfully - Your Login Credentials',
        html: emailContent 
      }
    });
    
    if (error) throw error;
    */
    
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveChanges = async () => {
    if (!currentUser) {
      setMessage({ type: 'error', text: 'User not found' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    if (!formData.fullName && !formData.password) {
      setMessage({ type: 'error', text: 'Please fill in at least one field to update' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    if (formData.password && formData.password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    try {
      setLoading(true);

      // Prepare update data
      const updateData: Partial<AdminUser> = {};
      
      if (formData.fullName && formData.fullName !== currentUser.admin_fullName) {
        updateData.admin_fullName = formData.fullName;
      }

      // Update admin_user table for name changes
      if (Object.keys(updateData).length > 0) {
        const { error: dbError } = await supabase
          .from('admin_user')
          .update(updateData)
          .eq('admin_auth_id', currentUser.admin_auth_id);

        if (dbError) {
          console.error('Database update error:', dbError);
          throw dbError;
        }
      }

      // Update password in both Supabase Auth and admin_user table if provided
      if (formData.password) {
        // Update Supabase Auth password
        const { error: authError } = await supabase.auth.updateUser({
          password: formData.password
        });

        if (authError) {
          console.error('Auth password update error:', authError);
          throw authError;
        }

        // Update admin_password in admin_user table (only the new password)
        const { error: passwordError } = await supabase
          .from('admin_user')
          .update({ admin_password: formData.password })
          .eq('admin_auth_id', currentUser.admin_auth_id);

        if (passwordError) {
          console.error('Database password update error:', passwordError);
          throw passwordError;
        }
      }

      // Refresh current user data
      await fetchCurrentUser();

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // Clear password fields and disable edit mode
      setFormData(prev => ({
        ...prev,
        password: '',
        confirmPassword: ''
      }));
      setIsEditMode(false);
      
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };


  const handleCancel = () => {
  // Reset form to current user data
  if (currentUser) {
    setFormData({
      fullName: currentUser.admin_fullName || '',
      email: currentUser.admin_email || '',
      password: '',
      confirmPassword: ''
    });
  }
  setIsEditMode(false);
};

  const handleUploadPhoto = async () => {
    if (!currentUser) {
      setMessage({ type: 'error', text: 'User not logged in' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/jpg,image/webp';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Image size must be less than 5MB' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        return;
      }
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setMessage({ type: 'error', text: 'Please upload a valid image file (JPG, PNG, or WebP)' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        return;
      }
      
      try {
        setUploadingPhoto(true);
        setShowPhotoMenu(false);
        
        // Check authentication
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          throw new Error('You must be logged in to upload photos');
        }
        
        // Delete old profile photo if exists
        if (currentUser.admin_profile) {
          try {
            await supabase.storage
              .from('gwc_files')
              .remove([currentUser.admin_profile]);
          } catch (deleteErr) {
            console.warn('Could not delete old photo:', deleteErr);
          }
        }
        
        // Create filename with proper path structure
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const fileName = `admin_profile/${currentUser.admin_acc_id}_${timestamp}_${randomStr}.${fileExt}`;
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('gwc_files')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true,
            contentType: file.type
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(uploadError.message);
        }

        if (!uploadData?.path) {
          throw new Error('Upload succeeded but no file path was returned');
        }
        
        // Update database with new profile photo path
        const { error: updateError } = await supabase
          .from('admin_user')
          .update({ admin_profile: fileName })
          .eq('admin_auth_id', currentUser.admin_auth_id);
        
        if (updateError) {
          // Rollback - delete uploaded file
          await supabase.storage.from('gwc_files').remove([fileName]);
          throw new Error('Failed to update database: ' + updateError.message);
        }
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('gwc_files')
          .getPublicUrl(fileName);
        
        // Update local state
        const publicUrl = urlData?.publicUrl ? `${urlData.publicUrl}?t=${timestamp}` : null;
        setCurrentUser(prev => prev ? { ...prev, admin_profile: fileName } : null);
        setProfilePhoto(publicUrl);
        
        setMessage({ type: 'success', text: 'Profile photo updated successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        
      } catch (error) {
        console.error('Error uploading photo:', error);
        setMessage({ 
          type: 'error', 
          text: error instanceof Error ? error.message : 'Failed to upload photo'
        });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      } finally {
        setUploadingPhoto(false);
      }
    };
    
    input.click();
  };
    

  // Modified handleRemovePhoto function
  const handleRemovePhoto = async () => {
    if (!currentUser || !currentUser.admin_profile) {
      setMessage({ type: 'error', text: 'No profile photo to remove' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      setShowPhotoMenu(false);
      return;
    }
    
    try {
      setUploadingPhoto(true);
      setShowPhotoMenu(false);
      
      // Delete from storage (gwc_files bucket)
      const { error: deleteError } = await supabase.storage
        .from('gwc_files')
        .remove([currentUser.admin_profile]);
      
      if (deleteError) {
        console.error('Error deleting photo:', deleteError);
        throw deleteError;
      }
      
      // Update admin_user table to remove profile photo reference
      const { error: updateError } = await supabase
        .from('admin_user')
        .update({ admin_profile: null })
        .eq('admin_auth_id', currentUser.admin_auth_id);
      
      if (updateError) {
        console.error('Database update error:', updateError);
        throw updateError;
      }
      
      // Refresh user data
      await fetchCurrentUser();
      
      setMessage({ type: 'success', text: 'Profile photo removed successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      
    } catch (error) {
      console.error('Error removing photo:', error);
      setMessage({ type: 'error', text: 'Failed to remove photo. Please try again.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleNewUserInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setNewUserData({ ...newUserData, [e.target.name]: e.target.value });
  };

  const handleAddUser = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Validate input
      if (!newUserData.fullName || !newUserData.email) {
        setMessage({ type: 'error', text: 'Please fill in all required fields' });
        setLoading(false);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newUserData.email)) {
        setMessage({ type: 'error', text: 'Please enter a valid email address' });
        setLoading(false);
        return;
      }

      // Check if email already exists
     const { data: existingUsers, error: checkError } = await supabase
        .from('admin_user')  
        .select('admin_email')
        .eq('admin_email', newUserData.email);

      if (checkError) {
        console.error('Error checking existing email:', checkError);
        throw checkError;
      }

      if (existingUsers && existingUsers.length > 0) {
        setMessage({ type: 'error', text: 'Email already exists' });
        setLoading(false);
        return;
      }

      // Generate account ID
      const accountId = await generateAccountId();
      
      // Password is same as account ID
      const password = accountId;

      // Create user in Supabase Auth using signUp
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserData.email,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin/dashboard`,
          data: {
            full_name: newUserData.fullName,
            role: newUserData.role,
            account_id: accountId,
            admin_password: password,
          }
        }
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        throw new Error(`Failed to create user account: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Failed to create user account: No user data returned');
      }

      // Get the auth user ID
      const authUserId = authData.user.id;

      // Insert user into admin_user table with the auth user ID
    const { error: insertError } = await supabase
      .from('admin_user')  
      .insert([
        {
          admin_auth_id: authUserId,
          admin_acc_id: accountId,
          admin_fullName: newUserData.fullName,
          admin_email: newUserData.email,
          admin_role: newUserData.role,
          admin_password: password,
          created_at: new Date().toISOString()
        }
      ]);

    if (insertError) {
      console.error('Error inserting user into admin_user table:', insertError);
      throw insertError;
    }
    // Send email notification
      const emailSent = await sendEmailNotification({
        accountId,
        fullName: newUserData.fullName,
        email: newUserData.email,
        role: newUserData.role,
        password,
        createdAt: new Date().toISOString()
      });

      // Refresh user list
      await fetchUsers();

      // Store the account ID and show success modal
      setCreatedAccountId(accountId);
      setShowCreateModal(false);
      setShowSuccessModal(true);

      // Show success message
      setMessage({ 
        type: 'success', 
        text: `Account created successfully! ID: ${accountId} ${emailSent ? '(Check console for credentials)' : ''}`
      });

      // Reset form
      setNewUserData({
        fullName: '',
        email: '',
        role: 'User'
      });
      
      // Clear message after 2 seconds
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 2000);

    } catch (error) {
      console.error('Error creating user:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to create account. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
  if (!userToDelete) return;

  try {
    setLoading(true);

    // First, get the auth_id for this user
    const { data: userData, error: fetchError } = await supabase
      .from('admin_user')
      .select('admin_auth_id')
      .eq('admin_acc_id', userToDelete.id)
      .single();

    if (fetchError) {
      console.error('Error fetching user:', fetchError);
      throw fetchError;
    }

    // Delete from admin_user table
    const { error: deleteError } = await supabase
      .from('admin_user')
      .delete()
      .eq('admin_acc_id', userToDelete.id);

    if (deleteError) {
      console.error('Error deleting user from admin_user:', deleteError);
      throw deleteError;
    }

    // Delete from Supabase Auth (optional, requires admin privileges)
    try {
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
        userData.admin_auth_id
      );
      
      if (authDeleteError) {
        console.warn('Could not delete auth user (may require admin privileges):', authDeleteError);
      }
    } catch (authError) {
      console.warn('Auth deletion not available:', authError);
    }

    // Refresh users list
    await fetchUsers();

    // Store deleted user name and close delete modal
    setDeletedUserName(userToDelete.name);
    setShowDeleteModal(false);
    setUserToDelete(null);
    
    // Show delete success modal
    setShowDeleteSuccessModal(true);

  } catch (error) {
    console.error('Error deleting user:', error);
    setShowDeleteModal(false);
    setUserToDelete(null);
    setMessage({ type: 'error', text: 'Failed to delete user account' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  } finally {
    setLoading(false);
  }
};

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('admin_user')  // Changed from 'admin_auth_id'
        .update({ admin_role: newRole })
        .eq('admin_acc_id', userId);

      if (error) {
        console.error('Error updating role:', error);
        throw error;
      }

      // Refresh users
      await fetchUsers();
      setMessage({ type: 'success', text: 'Role updated successfully' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
    } catch (error) {
      console.error('Error updating role:', error);
      setMessage({ type: 'error', text: 'Failed to update role' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const filteredUsers = users.filter(user => 
    user.admin_fullName?.toLowerCase().includes(searchUser.toLowerCase()) ||
    user.admin_email?.toLowerCase().includes(searchUser.toLowerCase())
  );

  return (
    <div className="min-h-screen flex" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
      <Sidepanel />
      <div className="flex-1 flex flex-col">
        <Header />
        <div className="flex flex-1" style={{ backgroundColor: '#f5ebe0', padding: '24px', gap: '24px' }}>
          {/* Left Sidebar */}
          <div style={{
            width: '280px',
            backgroundColor: 'white',
            padding: '32px 24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderRadius: '12px',
            height: 'fit-content'
          }}>
            <h2 style={{
              fontSize: '22px',
              fontWeight: 'bold',
              color: '#7d1f1f',
              marginBottom: '32px'
            }}>Profile</h2>
            
            {/* Profile Image */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '24px'
            }}>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                border: '3px solid #d4754f',
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
                      borderTop: '3px solid #ff5722',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    <style>{`
                      @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }
                    `}</style>
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
                      style={{
                        objectFit: 'cover'
                      }}
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
                    backgroundColor: '#ff5722',
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
                
                {/* Dropdown Menu */}
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
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
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
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (profilePhoto) {
                          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f5f5f5';
                        }
                      }}
                      onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'white'}
                    >
                      Remove Photo
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Name and ID */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#7d1f1f',
                marginBottom: '4px',
                letterSpacing: '0.3px',
                textTransform: 'uppercase'
              }}>
                {loadingUser ? 'Loading...' : (currentUser?.admin_fullName || 'Unknown User')}
              </h3>
              <p style={{ color: '#666', fontSize: '13px' }}>
                {loadingUser ? '...' : (currentUser?.admin_acc_id || 'Unknown ID')}
              </p>
            </div>

            {/* Navigation */}
            <div>
              <button
                onClick={() => setActiveTab('account')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  backgroundColor: activeTab === 'account' ? '#fce4d6' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginBottom: '8px',
                  color: '#333',
                  fontSize: '14px',
                  transition: 'background-color 0.2s'
                }}
              >
                <Settings size={16} />
                <span style={{ fontWeight: '500' }}>Account Settings</span>
              </button>

              {currentUser?.admin_role === 'Admin' && (
                <button
                  onClick={() => setActiveTab('access')}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    backgroundColor: activeTab === 'access' ? '#fce4d6' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: '#333',
                    fontSize: '14px',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <Users size={16} />
                  <span style={{ fontWeight: '500' }}>Access Control</span>
                </button>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div style={{ flex: 1 }}>
            {/* Message Display */}
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

            {activeTab === 'account' ? (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '32px 40px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                height: 'fit-content'
              }}>
                <h2 style={{
                  fontSize: '22px',
                  fontWeight: 'bold',
                  color: '#7d1f1f',
                  marginBottom: '32px'
                }}>Profile Information</h2>
                
                <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#333',
                      marginBottom: '8px'
                    }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      disabled={!isEditMode || loadingUser || loading}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: (!isEditMode || loadingUser || loading) ? '#f5f5f5' : 'white',
                        cursor: (!isEditMode || loadingUser || loading) ? 'not-allowed' : 'text',
                        color: (!isEditMode || loadingUser || loading) ? '#666' : '#333'
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
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
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
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
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
                      disabled={!isEditMode || loadingUser || loading}
                      placeholder="Leave blank to keep current"
                      style={{
                        width: '100%',
                        padding: '10px 40px 10px 14px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: (!isEditMode || loadingUser || loading) ? '#f5f5f5' : 'white',
                        cursor: (!isEditMode || loadingUser || loading) ? 'not-allowed' : 'text',
                        color: (!isEditMode || loadingUser || loading) ? '#666' : '#333'
                      }}
                    />
                    {isEditMode && !loadingUser && !loading && (
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
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
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
                      disabled={!isEditMode || loadingUser || loading}
                      placeholder="Leave blank to keep current"
                      style={{
                        width: '100%',
                        padding: '10px 40px 10px 14px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: (!isEditMode || loadingUser || loading) ? '#f5f5f5' : 'white',
                        cursor: (!isEditMode || loadingUser || loading) ? 'not-allowed' : 'text',
                        color: (!isEditMode || loadingUser || loading) ? '#666' : '#333'
                      }}
                    />
                    {isEditMode && !loadingUser && !loading && (
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
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                {!isEditMode ? (
                  <button
                    onClick={() => setIsEditMode(true)}
                    disabled={loadingUser || loading}
                    style={{
                      padding: '10px 24px',
                      backgroundColor: (loadingUser || loading) ? '#ccc' : '#ff5722',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: (loadingUser || loading) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSaveChanges}
                      disabled={loadingUser || loading}
                      style={{
                        padding: '10px 24px',
                        backgroundColor: (loadingUser || loading) ? '#ccc' : '#ff5722',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: (loadingUser || loading) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={loadingUser || loading}
                      style={{
                        padding: '10px 24px',
                        backgroundColor: '#e0e0e0',
                        color: '#666',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: (loadingUser || loading) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'access' && currentUser?.admin_role === 'Admin' ? (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '32px 40px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '32px'
                }}>
                  <h2 style={{
                    fontSize: '22px',
                    fontWeight: 'bold',
                    color: '#7d1f1f'
                  }}>Access Control</h2>
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#ff5722',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Plus size={18}/>
                    Create Account
                  </button>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <div style={{ position: 'relative', maxWidth: '400px' }}>
                    <svg style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '16px',
                      height: '16px',
                      color: '#999'
                    }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search User"
                      value={searchUser}
                      onChange={(e) => setSearchUser(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 40px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
                

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee' }}>
                    <th style={{
                      textAlign: 'left',
                      padding: '14px 12px',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#666',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>NAME</th>
                    <th style={{
                      textAlign: 'left',
                      padding: '14px 12px',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#666',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>ID NUMBER</th>
                    <th style={{
                      textAlign: 'left',
                      padding: '14px 12px',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#666',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>EMAIL</th>
                    <th style={{
                      textAlign: 'left',
                      padding: '14px 12px',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#666',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>ROLE</th>
                    <th style={{
                      textAlign: 'left',
                      padding: '14px 12px',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#666',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>CREATED AT</th>
                    <th style={{
                      textAlign: 'center',
                      padding: '14px 12px',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#666',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
                        {searchUser ? 'No users found matching your search.' : 'No users found. Click "Create Account" to add your first user.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.admin_auth_id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                        <td style={{ padding: '14px 12px', fontSize: '14px', color: '#333' }}>{user.admin_fullName}</td>
                        <td style={{ padding: '14px 12px', fontSize: '14px', color: '#333' }}>{user.admin_acc_id}</td>
                        <td style={{ padding: '14px 12px', fontSize: '14px' }}>
                          <a href={`mailto:${user.admin_email}`} style={{ color: '#2563eb', textDecoration: 'underline' }}>
                            {user.admin_email}
                          </a>
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <select 
                            value={user.admin_role}
                            onChange={(e) => handleRoleChange(user.admin_acc_id, e.target.value)}
                            disabled={loading}
                            style={{
                              padding: '6px 12px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              backgroundColor: 'white',
                              fontSize: '13px',
                              color: '#333',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              outline: 'none'
                            }}
                          >
                            <option value="Admin">Admin</option>
                            <option value="User">User</option>
                          </select>
                        </td>
                        <td style={{ padding: '14px 12px', fontSize: '14px', color: '#666' }}>
                          {new Date(user.created_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            setUserToDelete({
                              id: user.admin_acc_id,
                              email: user.admin_email,
                              name: user.admin_fullName
                            });
                            setShowDeleteModal(true);
                          }}
                          disabled={loading}
                          title="Delete User"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            color: '#dc2626',
                            padding: '6px',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background-color 0.2s',
                            opacity: loading ? 0.5 : 1
                          }}
                          onMouseEnter={(e) => {
                            if (!loading) {
                              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fee2e2';
                            }
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                          }}
                        >
                          <UserMinus size={18} />
                        </button>
                      </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Create Account Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
          overflowY: 'auto'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            width: '100%',
            maxWidth: '500px',
            position: 'relative',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            margin: 'auto',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Close Button */}
            <button
              onClick={() => {
                setShowCreateModal(false);
                setMessage({ type: '', text: '' });
              }}
              disabled={loading}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: '#999',
                cursor: loading ? 'not-allowed' : 'pointer',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>

            <h2 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#7d1f1f',
              marginBottom: '24px'
            }}>Create an Account</h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#333',
                marginBottom: '8px'
              }}>
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={newUserData.fullName}
                onChange={handleNewUserInputChange}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
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
                value={newUserData.email}
                onChange={handleNewUserInputChange}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#333',
                marginBottom: '8px'
              }}>
                Role
              </label>
              <select
                name="role"
                value={newUserData.role}
                onChange={handleNewUserInputChange}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                <option value="User">User</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            {message.text && (
              <div style={{
                marginBottom: '20px',
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
                color: message.type === 'success' ? '#155724' : '#721c24',
                fontSize: '14px',
                border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
              }}>
                {message.text}
              </div>
            )}

            <button
              onClick={handleAddUser}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: loading ? '#ccc' : '#ff5722',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Creating Account...' : 'Add User'}
            </button>
          </div>
        </div>
      )}

    {showDeleteModal && userToDelete && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1001,
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px',
          width: '100%',
          maxWidth: '500px',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          position: 'relative'
        }}>
          {/* Close Button */}
          <button
            onClick={() => {
              setShowDeleteModal(false);
              setUserToDelete(null);
            }}
            disabled={loading}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#999',
              cursor: loading ? 'not-allowed' : 'pointer',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>

          {/* Warning Icon */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px'
          }}>
            <UserMinus size={40} color="white" strokeWidth={2.5} />
          </div>

          {/* Title */}
          <h2 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#7d1f1f',
            marginBottom: '16px'
          }}>Delete User Account?</h2>

          {/* Message */}
          <p style={{
            fontSize: '14px',
            color: '#666',
            marginBottom: '8px',
            lineHeight: '1.6'
          }}>
            Are you sure you want to delete this user account?
          </p>
          <p style={{
            fontSize: '14px',
            color: '#333',
            marginBottom: '8px',
            fontWeight: '600'
          }}>
            {userToDelete.name}
          </p>
          <p style={{
            fontSize: '13px',
            color: '#666',
            marginBottom: '24px'
          }}>
            {userToDelete.email}
          </p>
          <p style={{
            fontSize: '13px',
            color: '#dc2626',
            marginBottom: '24px',
            fontWeight: '500'
          }}>
            This action cannot be undone.
          </p>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center'
          }}>
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setUserToDelete(null);
              }}
              disabled={loading}
              style={{
                padding: '12px 32px',
                backgroundColor: '#e0e0e0',
                color: '#666',
                border: 'none',
                borderRadius: '6px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteUser}
              disabled={loading}
              style={{
                padding: '12px 32px',
                backgroundColor: loading ? '#f87171' : '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase'
              }}
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Delete Success Modal */}
    {showDeleteSuccessModal && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1002,
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '40px',
          width: '100%',
          maxWidth: '450px',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          position: 'relative'
        }}>
          {/* Close Button */}
          <button
            onClick={() => {
              setShowDeleteSuccessModal(false);
              setDeletedUserName('');
            }}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#999',
              cursor: 'pointer',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>

          {/* Success Icon */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: '#4CAF50',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px'
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>

          {/* Title */}
          <h2 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#7d1f1f',
            marginBottom: '16px'
          }}>User Removed Successfully</h2>

          {/* Message */}
          <p style={{
            fontSize: '14px',
            color: '#666',
            marginBottom: '24px',
            lineHeight: '1.6'
          }}>
            The user account has been removed from the system.
            <br />
            <strong>{deletedUserName}</strong>
          </p>

          {/* OK Button */}
          <button
            onClick={() => {
              setShowDeleteSuccessModal(false);
              setDeletedUserName('');
            }}
            style={{
              padding: '12px 60px',
              backgroundColor: '#ff5722',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              textTransform: 'uppercase'
            }}
          >
            OK
          </button>
        </div>
      </div>
    )}
       
    {/* Success Confirmation Modal*/}
      {showSuccessModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '40px',
            width: '100%',
            maxWidth: '450px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowSuccessModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: '#999',
                cursor: 'pointer',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>

            {/* Success Icon */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: '#4CAF50',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>

            {/* Title */}
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#7d1f1f',
              marginBottom: '16px'
            }}>Account Added Successfully</h2>

            {/* Message */}
            <p style={{
              fontSize: '14px',
              color: '#666',
              marginBottom: '24px',
              lineHeight: '1.6'
            }}>
              The new account has been created and saved successfully.
              <br />
              <strong>Account ID: {createdAccountId}</strong>
            </p>

            {/* OK Button */}
            <button
              onClick={() => setShowSuccessModal(false)}
              style={{
                padding: '12px 60px',
                backgroundColor: '#ff5722',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                textTransform: 'uppercase'
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>  
  );
}