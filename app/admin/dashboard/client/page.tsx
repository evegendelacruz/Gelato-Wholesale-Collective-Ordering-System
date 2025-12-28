'use client';
import Sidepanel from '@/app/components/sidepanel/page';
import Header from '@/app/components/header/page';

import { useState, useEffect } from 'react';
import { Search, Filter, Plus, X, Upload, Check, UserMinus } from 'lucide-react';
import supabase from '@/lib/client';

interface Client {
  client_id: string;
  client_auth_id: string;
  client_password: string;
  client_account_date: string;
  client_businessName: string;
  client_operationName: string;
  client_delivery_address: string;
  client_business_contact: string;
  client_business_activities: string;
  client_type_business: string;
  client_person_incharge: string;
  client_person_contact: string;
  client_email: string;
  client_billing_address: string;
  client_bankName: string;
  client_bankNumber: string;
  client_ACRA: string | null;
  client_created_at: string;
  is_online: boolean;
}

interface Message {
  type: 'success' | 'error' | '';
  text: string;
}

export default function ClientAccountPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [acraFile, setAcraFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [message, setMessage] = useState<Message>({ type: '', text: '' });
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteSuccessOpen, setIsDeleteSuccessOpen] = useState(false);
  const [isEditSuccessOpen, setIsEditSuccessOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'business-asc' | 'business-desc'>('newest');
  const [filterBy, setFilterBy] = useState<'all' | 'online' | 'offline' | 'sole' | 'partnership' | 'private'>('all');
  const itemsPerPage = 10;
  const [contactErrors, setContactErrors] = useState({
    business: '',
    person: ''
  });

  // Form data state
  const [formData, setFormData] = useState(() => ({
    client_id: '',
    client_account_date: '',
    client_businessName: '',
    client_operationName: '',
    client_delivery_address: '',
    client_business_contact: '',
    client_business_activities: '',
    client_type_business: 'Sole Proprietor',
    client_person_incharge: '',
    client_person_contact: '',
    client_email: '',
    client_billing_address: '',
    client_bankName: '',
    client_bankNumber: ''
  }));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Close dropdowns when clicking outside
      if (!target.closest('.relative')) {
        setIsSortDropdownOpen(false);
        setIsFilterDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchClients();
    
    // Set up real-time subscription for online status
    const channel = supabase
      .channel('client_status_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_user'
        },
        () => {
          fetchClients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('client_user')
        .select('*')
        .order('client_created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setMessage({ type: 'error', text: 'Failed to load clients' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  const generateClientId = async (): Promise<string> => {
    try {
      // Generate random 4-character alphanumeric string
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let randomId = '';
      
      // Keep generating until we find a unique ID
      let isUnique = false;
      while (!isUnique) {
        randomId = 'CUST-';
        for (let i = 0; i < 4; i++) {
          randomId += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        // Check if ID already exists
        const { error } = await supabase
          .from('client_user')
          .select('client_id')
          .eq('client_id', randomId)
          .single();
        
        if (error && error.code === 'PGRST116') {
          // ID doesn't exist, it's unique
          isUnique = true;
        }
      }
      
      return randomId;
    } catch (error) {
      console.error('Error generating client ID:', error);
      return `CUST-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle mobile contact fields with +65 prefix
    if (name === 'client_business_contact' || name === 'client_person_contact') {
      // Remove +65 prefix if present to get just the digits
      const digitsOnly = value.replace(/^\+65/, '').replace(/\D/g, '');
      
      // Limit to 8 digits
      const limitedDigits = digitsOnly.slice(0, 8);
      
      // Update form data with +65 prefix
      setFormData(prev => ({
        ...prev,
        [name]: limitedDigits ? `+65${limitedDigits}` : ''
      }));
      
      // Validate and set error message
      const errorKey = name === 'client_business_contact' ? 'business' : 'person';
      if (limitedDigits.length > 0 && limitedDigits.length < 8) {
        setContactErrors(prev => ({
          ...prev,
          [errorKey]: 'Mobile number must be exactly 8 digits'
        }));
      } else {
        setContactErrors(prev => ({
          ...prev,
          [errorKey]: ''
        }));
      }
    } 
    // Handle bank account number - only allow numeric digits with max 25 digits
    else if (name === 'client_bankNumber') {
      // Remove all non-numeric characters
      const digitsOnly = value.replace(/\D/g, '');
      
      // Limit to 25 digits
      const limitedDigits = digitsOnly.slice(0, 25);
      
      setFormData(prev => ({
        ...prev,
        [name]: limitedDigits
      }));
    } 
    else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'File size must be less than 10MB' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        return;
      }
      
      // Validate file type
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(file.type)) {
        setMessage({ type: 'error', text: 'Please upload a valid document (PDF or DOC)' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        return;
      }
      
      setAcraFile(file);
    }
  };

  const handleProceed = () => {
    // Validate step 1 fields
    if (!formData.client_account_date || !formData.client_businessName || !formData.client_delivery_address || !formData.client_business_contact) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    
    // Validate mobile contact has exactly 8 digits (excluding +65)
    const businessDigits = formData.client_business_contact.replace(/^\+65/, '');
    if (businessDigits.length !== 8) {
      setMessage({ type: 'error', text: 'Business mobile number must be exactly 8 digits' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    
    setMessage({ type: '', text: '' });
    setModalStep(2);
  };

  const handleSubmit = async () => {
  // Validate step 2 fields
  if (!formData.client_person_incharge || !formData.client_person_contact || !formData.client_email) {
    setMessage({ type: 'error', text: 'Please fill in all required fields' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    return;
  }

  // Validate person mobile contact has exactly 8 digits (excluding +65)
  const personDigits = formData.client_person_contact.replace(/^\+65/, '');
  if (personDigits.length !== 8) {
    setMessage({ type: 'error', text: 'Mobile number must be exactly 8 digits' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    return;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.client_email)) {
    setMessage({ type: 'error', text: 'Please enter a valid email address' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    return;
  }

  try {
    setLoading(true);
    setMessage({ type: '', text: '' });

    // Save the current admin session before creating client
    const { data: { session: adminSession } } = await supabase.auth.getSession();

    // Generate new client ID
    const clientId = await generateClientId();
    const clientPassword = clientId; // Password same as client_id
    
    let acraFilePath = null;

    // Upload ACRA file if exists
    if (acraFile) {
      const fileExt = acraFile.name.split('.').pop()?.toLowerCase() || 'pdf';
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const fileName = `client_acra/${clientId}_${timestamp}_${randomStr}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('gwc_files')
        .upload(fileName, acraFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: acraFile.type
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload ACRA file: ' + uploadError.message);
      }

      if (!uploadData?.path) {
        throw new Error('Upload succeeded but no file path was returned');
      }

      acraFilePath = fileName;
    }

    // Create user in Supabase Auth with display name
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.client_email,
      password: clientPassword,
      options: {
        data: {
          display_name: formData.client_person_incharge,
          client_id: clientId
        },
        emailRedirectTo: undefined // Prevent confirmation email
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      // Rollback - delete uploaded file if exists
      if (acraFilePath) {
        await supabase.storage.from('gwc_files').remove([acraFilePath]);
      }
      throw new Error('Failed to create authentication: ' + authError.message);
    }

    if (!authData.user) {
      // Rollback - delete uploaded file if exists
      if (acraFilePath) {
        await supabase.storage.from('gwc_files').remove([acraFilePath]);
      }
      throw new Error('Failed to create user account');
    }

    const authId = authData.user.id;

    // IMPORTANT: Restore admin session immediately after client creation
    if (adminSession) {
      await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token
      });
    }

    // Insert client into database
    const { data: insertData, error: insertError } = await supabase
      .from('client_user')
      .insert({
        client_id: clientId,
        client_auth_id: authId,
        client_password: clientPassword,
        client_account_date: formData.client_account_date,
        client_businessName: formData.client_businessName,
        client_operationName: formData.client_operationName || null,
        client_delivery_address: formData.client_delivery_address,
        client_business_contact: formData.client_business_contact,
        client_business_activities: formData.client_business_activities || null,
        client_type_business: formData.client_type_business,
        client_person_incharge: formData.client_person_incharge,
        client_person_contact: formData.client_person_contact,
        client_email: formData.client_email,
        client_billing_address: formData.client_billing_address || null,
        client_bankName: formData.client_bankName || null,
        client_bankNumber: formData.client_bankNumber || null,
        client_ACRA: acraFilePath,
        client_created_at: new Date().toISOString(),
        is_online: false
      })
      .select();

    if (insertError) {
      console.error('Database insert error:', insertError);
      // Rollback - delete uploaded file and auth user
      if (acraFilePath) {
        await supabase.storage.from('gwc_files').remove([acraFilePath]);
      }
      // Note: You may want to delete the auth user here if possible
      throw new Error('Failed to save client data: ' + insertError.message);
    }

    console.log('Insert successful:', insertData);

    // Refresh clients list
    await fetchClients();

    // Close modal and show success
    setIsModalOpen(false);
    setIsSuccessModalOpen(true);
    setModalStep(1);
    
    // Reset form
    setFormData({
      client_id: '',
      client_account_date: '',
      client_businessName: '',
      client_operationName: '',
      client_delivery_address: '',
      client_business_contact: '',
      client_business_activities: '',
      client_type_business: 'Sole Proprietor',
      client_person_incharge: '',
      client_person_contact: '',
      client_email: '',
      client_billing_address: '',
      client_bankName: '',
      client_bankNumber: ''
    });
    setAcraFile(null);

    setMessage({ type: 'success', text: 'Client added successfully!' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);

  } catch (error) {
    console.error('Error submitting form:', error);
    setMessage({ 
      type: 'error', 
      text: error instanceof Error ? error.message : 'Failed to add client. Please try again.' 
    });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  } finally {
    setLoading(false);
  }
};

  const openModal = async () => {
    const newId = await generateClientId();
    setFormData(prev => ({ ...prev, client_id: newId }));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalStep(1);
    setIsEditMode(false);
    setSelectedClient(null);
    setAcraFile(null);
    setMessage({ type: '', text: '' });
    // Reset form
    setFormData({
      client_id: '',
      client_account_date: '',
      client_businessName: '',
      client_operationName: '',
      client_delivery_address: '',
      client_business_contact: '',
      client_business_activities: '',
      client_type_business: 'Sole Proprietor',
      client_person_incharge: '',
      client_person_contact: '',
      client_email: '',
      client_billing_address: '',
      client_bankName: '',
      client_bankNumber: ''
    });
  };

  const closeSuccessModal = () => {
    setIsSuccessModalOpen(false);
  };

  const handleSelectAll = (checked: boolean) => {
  if (checked) {
    const allIds = new Set(currentClients.map(client => client.client_id));
    setSelectedRows(allIds);
  } else {
    setSelectedRows(new Set());
  }
};

const handleSelectRow = (clientId: string, checked: boolean) => {
  const newSelected = new Set(selectedRows);
  if (checked) {
    newSelected.add(clientId);
  } else {
    newSelected.delete(clientId);
  }
  setSelectedRows(newSelected);
};

const handleEdit = () => {
  const clientId = Array.from(selectedRows)[0];
  const client = clients.find(c => c.client_id === clientId);
  if (client) {
    setIsEditMode(true);
    setFormData({
      client_id: client.client_id,
      client_account_date: client.client_account_date,
      client_businessName: client.client_businessName,
      client_operationName: client.client_operationName || '',
      client_delivery_address: client.client_delivery_address,
      client_business_contact: client.client_business_contact,
      client_business_activities: client.client_business_activities || '',
      client_type_business: client.client_type_business,
      client_person_incharge: client.client_person_incharge,
      client_person_contact: client.client_person_contact,
      client_email: client.client_email,
      client_billing_address: client.client_billing_address || '',
      client_bankName: client.client_bankName || '',
      client_bankNumber: client.client_bankNumber || ''
    });
    setSelectedClient(client);
    setIsModalOpen(true);
    setModalStep(1); 
  }
};

const handleDelete = async () => {
  try {
    setLoading(true);
    const idsToDelete = Array.from(selectedRows);
    
    // Get clients to delete for ACRA file cleanup
    const clientsToDelete = clients.filter(c => idsToDelete.includes(c.client_id));
    
    // Delete ACRA files
    const acraFilesToDelete = clientsToDelete
      .filter(c => c.client_ACRA)
      .map(c => c.client_ACRA as string);
    
    if (acraFilesToDelete.length > 0) {
      await supabase.storage.from('gwc_files').remove(acraFilesToDelete);
    }
    
    // Delete from database
    const { error } = await supabase
      .from('client_user')
      .delete()
      .in('client_id', idsToDelete);
    
    if (error) throw error;
    
    // Refresh clients list
    await fetchClients();
    
    setSelectedRows(new Set());
    setIsDeleteConfirmOpen(false);
    setIsDeleteSuccessOpen(true);
    
  } catch (error) {
    console.error('Error deleting clients:', error);
    setMessage({ 
      type: 'error', 
      text: 'Failed to delete client(s). Please try again.' 
    });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  } finally {
    setLoading(false);
  }
};

const handleUpdate = async () => {
  if (!selectedClient) return;
  
  // Validate step 1 fields
  if (!formData.client_account_date || !formData.client_businessName || !formData.client_delivery_address || !formData.client_business_contact) {
    setMessage({ type: 'error', text: 'Please fill in all required fields in Step 1' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    return;
  }

  // Validate business mobile contact
  const businessDigits = formData.client_business_contact.replace(/^\+65/, '');
  if (businessDigits.length !== 8) {
    setMessage({ type: 'error', text: 'Business mobile number must be exactly 8 digits' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    return;
  }

  // Validate step 2 fields
  if (!formData.client_person_incharge || !formData.client_person_contact || !formData.client_email) {
    setMessage({ type: 'error', text: 'Please fill in all required fields in Step 2' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    return;
  }

  // Validate person mobile contact
  const personDigits = formData.client_person_contact.replace(/^\+65/, '');
  if (personDigits.length !== 8) {
    setMessage({ type: 'error', text: 'Mobile number must be exactly 8 digits' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.client_email)) {
    setMessage({ type: 'error', text: 'Please enter a valid email address' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    return;
  }

  try {
    setLoading(true);
    setMessage({ type: '', text: '' });

    let acraFilePath = selectedClient.client_ACRA;

    // Upload new ACRA file if changed
    if (acraFile) {
      // Delete old file if exists
      if (selectedClient.client_ACRA) {
        await supabase.storage.from('gwc_files').remove([selectedClient.client_ACRA]);
      }

      const fileExt = acraFile.name.split('.').pop()?.toLowerCase() || 'pdf';
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const fileName = `client_acra/${selectedClient.client_id}_${timestamp}_${randomStr}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('gwc_files')
        .upload(fileName, acraFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: acraFile.type
        });

      if (uploadError) throw new Error('Failed to upload ACRA file');
      acraFilePath = fileName;
    }

    // Update client in database - INCLUDING STEP 1 FIELDS
    const { error: updateError } = await supabase
      .from('client_user')
      .update({
        // Step 1 fields
        client_account_date: formData.client_account_date,
        client_businessName: formData.client_businessName,
        client_operationName: formData.client_operationName || null,
        client_delivery_address: formData.client_delivery_address,
        client_business_contact: formData.client_business_contact,
        client_business_activities: formData.client_business_activities || null,
        client_type_business: formData.client_type_business,
        // Step 2 fields
        client_person_incharge: formData.client_person_incharge,
        client_person_contact: formData.client_person_contact,
        client_email: formData.client_email,
        client_billing_address: formData.client_billing_address || null,
        client_bankName: formData.client_bankName || null,
        client_bankNumber: formData.client_bankNumber || null,
        client_ACRA: acraFilePath
      })
      .eq('client_id', selectedClient.client_id);

    if (updateError) throw updateError;

    // Refresh clients list
    await fetchClients();

    // Close modal and show success
    setIsModalOpen(false);
    setIsEditSuccessOpen(true);
    setModalStep(1);
    setIsEditMode(false);
    setSelectedRows(new Set());
    
    // Reset form
    setFormData({
      client_id: '',
      client_account_date: '',
      client_businessName: '',
      client_operationName: '',
      client_delivery_address: '',
      client_business_contact: '',
      client_business_activities: '',
      client_type_business: 'Sole Proprietor',
      client_person_incharge: '',
      client_person_contact: '',
      client_email: '',
      client_billing_address: '',
      client_bankName: '',
      client_bankNumber: ''
    });
    setAcraFile(null);
    setSelectedClient(null);

  } catch (error) {
    console.error('Error updating client:', error);
    setMessage({ 
      type: 'error', 
      text: error instanceof Error ? error.message : 'Failed to update client. Please try again.' 
    });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  } finally {
    setLoading(false);
  }
};

  const handleRowClick = (client: Client) => {
    setSelectedClient(client);
    setIsViewModalOpen(true);
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedClient(null);
  };

  const downloadAcraFile = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('gwc_files')
        .download(filePath);

      if (error) throw error;

      // Create download link
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath.split('/').pop() || 'acra-file';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      setMessage({ type: 'error', text: 'Failed to download file' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  // Filter and sort clients based on search query, filter, and sort options
  const filteredClients = clients
    .filter(client => {
      // Search filter
      const matchesSearch = 
        client.client_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.client_person_incharge?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.client_businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.client_email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      // Status and business type filter
      if (filterBy === 'online') return client.is_online;
      if (filterBy === 'offline') return !client.is_online;
      if (filterBy === 'sole') return client.client_type_business === 'Sole Proprietor';
      if (filterBy === 'partnership') return client.client_type_business === 'Partnership';
      if (filterBy === 'private') return client.client_type_business === 'Private Limited';
      
      return true; // 'all' filter
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.client_created_at).getTime() - new Date(a.client_created_at).getTime();
        case 'oldest':
          return new Date(a.client_created_at).getTime() - new Date(b.client_created_at).getTime();
        case 'name-asc':
          return a.client_person_incharge.localeCompare(b.client_person_incharge);
        case 'name-desc':
          return b.client_person_incharge.localeCompare(a.client_person_incharge);
        case 'business-asc':
          return a.client_businessName.localeCompare(b.client_businessName);
        case 'business-desc':
          return b.client_businessName.localeCompare(a.client_businessName);
        default:
          return 0;
      }
    });

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentClients = filteredClients.slice(startIndex, endIndex);

  return (
  <div className="min-h-screen flex" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
      <Sidepanel />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6" style={{ backgroundColor: '#FCF0E3' }}>
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

          {/* Action Toast for Selected Rows */}
          {selectedRows.size > 0 && (
            <div 
              style={{
                position: 'fixed',
                bottom: '30px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#4A5568',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                zIndex: 9999,
                minWidth: 'auto'
              }}
            >
              <button
                onClick={() => setSelectedRows(new Set())}
                className="text-white hover:text-gray-300 transition-colors"
                aria-label="Close"
                style={{ padding: '2px' }}
              >
                <X size={16} />
              </button>
              
              <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255, 255, 255, 0.3)' }}></div>
              
              <span className="text-sm" style={{ minWidth: '100px' }}>
                {selectedRows.size} item{selectedRows.size === 1 ? '' : 's'} selected
              </span>
              
              <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255, 255, 255, 0.3)' }}></div>
              
              {selectedRows.size === 1 && (
                <>
                  <button
                    onClick={handleEdit}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-white hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ padding: '2px 6px' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    <span className="text-sm">Edit</span>
                  </button>
                  
                  <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255, 255, 255, 0.3)' }}></div>
                </>
              )}
              
              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                disabled={loading}
                className="flex items-center gap-1.5 text-white hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ padding: '2px 6px' }}
              >
                <UserMinus size={16} />
                <span className="text-sm">Remove</span>
              </button>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold" style={{ color: '#5C2E1F' }}>
                Client Accounts
              </h1>
              
              <div className="flex items-center gap-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                    size={20} 
                  />
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Sort By Button */}
<div className="relative">
  <button 
    onClick={() => {
      setIsSortDropdownOpen(!isSortDropdownOpen);
      setIsFilterDropdownOpen(false);
    }}
    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
  >
    <Filter size={20} />
    <span>Sort by</span>
  </button>
  
  {isSortDropdownOpen && (
    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
      <div className="py-1">
        <button
          onClick={() => {
            setSortBy('newest');
            setIsSortDropdownOpen(false);
            setCurrentPage(1);
          }}
          className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${sortBy === 'newest' ? 'bg-orange-50 text-orange-600' : ''}`}
        >
          Newest First
        </button>
        <button
          onClick={() => {
            setSortBy('oldest');
            setIsSortDropdownOpen(false);
            setCurrentPage(1);
          }}
          className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${sortBy === 'oldest' ? 'bg-orange-50 text-orange-600' : ''}`}
        >
          Oldest First
        </button>
        <button
          onClick={() => {
            setSortBy('name-asc');
            setIsSortDropdownOpen(false);
            setCurrentPage(1);
          }}
          className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${sortBy === 'name-asc' ? 'bg-orange-50 text-orange-600' : ''}`}
        >
          Name (A-Z)
        </button>
        <button
          onClick={() => {
            setSortBy('name-desc');
            setIsSortDropdownOpen(false);
            setCurrentPage(1);
          }}
          className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${sortBy === 'name-desc' ? 'bg-orange-50 text-orange-600' : ''}`}
        >
          Name (Z-A)
        </button>
        <button
          onClick={() => {
            setSortBy('business-asc');
            setIsSortDropdownOpen(false);
            setCurrentPage(1);
          }}
          className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${sortBy === 'business-asc' ? 'bg-orange-50 text-orange-600' : ''}`}
        >
          Business Name (A-Z)
        </button>
        <button
          onClick={() => {
            setSortBy('business-desc');
            setIsSortDropdownOpen(false);
            setCurrentPage(1);
          }}
          className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${sortBy === 'business-desc' ? 'bg-orange-50 text-orange-600' : ''}`}
        >
          Business Name (Z-A)
        </button>
      </div>
    </div>
  )}
</div>

    {/* Filter Button */}
    <div className="relative">
      <button 
        onClick={() => {
          setIsFilterDropdownOpen(!isFilterDropdownOpen);
          setIsSortDropdownOpen(false);
        }}
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Filter size={20} />
        <span>Filter</span>
      </button>
      
      {isFilterDropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
          <div className="py-1">
            <button
              onClick={() => {
                setFilterBy('all');
                setIsFilterDropdownOpen(false);
                setCurrentPage(1);
              }}
              className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${filterBy === 'all' ? 'bg-orange-50 text-orange-600' : ''}`}
            >
              All Clients
            </button>
            <div className="border-t border-gray-200 my-1"></div>
            <div className="px-4 py-2 text-xs text-gray-500 font-medium">Status</div>
            <button
              onClick={() => {
                setFilterBy('online');
                setIsFilterDropdownOpen(false);
                setCurrentPage(1);
              }}
              className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${filterBy === 'online' ? 'bg-orange-50 text-orange-600' : ''}`}
            >
              Online
            </button>
            <button
              onClick={() => {
                setFilterBy('offline');
                setIsFilterDropdownOpen(false);
                setCurrentPage(1);
              }}
              className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${filterBy === 'offline' ? 'bg-orange-50 text-orange-600' : ''}`}
            >
              Offline
            </button>
            <div className="border-t border-gray-200 my-1"></div>
            <div className="px-4 py-2 text-xs text-gray-500 font-medium">Business Type</div>
            <button
              onClick={() => {
                setFilterBy('sole');
                setIsFilterDropdownOpen(false);
                setCurrentPage(1);
              }}
              className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${filterBy === 'sole' ? 'bg-orange-50 text-orange-600' : ''}`}
            >
              Sole Proprietor
            </button>
            <button
              onClick={() => {
                setFilterBy('partnership');
                setIsFilterDropdownOpen(false);
                setCurrentPage(1);
              }}
              className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${filterBy === 'partnership' ? 'bg-orange-50 text-orange-600' : ''}`}
            >
              Partnership
            </button>
            <button
              onClick={() => {
                setFilterBy('private');
                setIsFilterDropdownOpen(false);
                setCurrentPage(1);
              }}
              className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${filterBy === 'private' ? 'bg-orange-50 text-orange-600' : ''}`}
            >
              Private Limited
            </button>
          </div>
        </div>
      )}
    </div>

                {/* Add New Client Button */}
                <button 
                  onClick={openModal}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#FF5722' }}
                >
                  <Plus size={20} />
                  <span>Add New Client</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr className="border-b-2" style={{ borderColor: '#5C2E1F' }}>
                    <th className="text-left py-3 px-4" style={{ minWidth: '50px' }}>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 cursor-pointer"
                        checked={selectedRows.size === currentClients.length && currentClients.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      CLIENT ID
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      PERSON INCHARGE
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      BUSINESS NAME
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      EMAIL
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      CONTACT NUMBER
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      DELIVERY ADDRESS
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      STATUS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-500">
                        Loading clients...
                      </td>
                    </tr>
                  ) : currentClients.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-500">
                        {searchQuery ? 'No clients found matching your search.' : 'No clients found. Click "Add New Client" to get started.'}
                      </td>
                    </tr>
                  ) : (
                    currentClients.map((client) => (
                      <tr 
                        key={client.client_id} 
                        className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleRowClick(client)}
                      >
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 cursor-pointer"
                            checked={selectedRows.has(client.client_id)}
                            onChange={(e) => handleSelectRow(client.client_id, e.target.checked)}
                          />
                        </td>
                        <td className="py-3 px-4 text-sm">{client.client_id}</td>
                        <td className="py-3 px-4 text-sm">{client.client_person_incharge}</td>
                        <td className="py-3 px-4 text-sm">{client.client_businessName}</td>
                        <td className="py-3 px-4 text-sm">{client.client_email}</td>
                        <td className="py-3 px-4 text-sm">{client.client_person_contact}</td>
                        <td className="py-3 px-4 text-sm">{client.client_delivery_address}</td>
                        <td className="py-3 px-4">
                          <span className={`text-sm ${client.is_online ? 'text-green-600' : 'text-gray-500'}`}>
                            {client.is_online ? 'Online' : 'Offline'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && filteredClients.length > 0 && (
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="text-sm hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ color: '#5C2E1F' }}
                >
                  Previous
                </button>
                
                <span className="text-sm" style={{ color: '#5C2E1F' }}>
                  Page {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="text-sm hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ color: '#5C2E1F' }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add New Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-3xl font-bold" style={{ color: '#5C2E1F' }}>
                    {isEditMode ? 'Edit Client' : 'New Client'}
                  </h2>
                  <p className="text-gray-500 mt-1">
                    {modalStep === 1 ? 'Account Opening and Credit Form' : 'Accounts Department'}
                  </p>
                </div>
                <button onClick={closeModal} disabled={loading} className="text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed">
                  <X size={24} />
                </button>
              </div>

              {/* Message Display in Modal */}
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

              {modalStep === 1 ? (
                // Step 1: Account Opening and Credit Form
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                        Client ID
                      </label>
                      <input
                        type="text"
                        name="client_id"
                        value={formData.client_id}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-100"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                        Account Opened Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="client_account_date"
                        value={formData.client_account_date}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                        R.O.C Business Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="client_businessName"
                        value={formData.client_businessName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                        Operation Name <span className="text-gray-400 font-normal">(if any)</span>
                      </label>
                      <input
                        type="text"
                        name="client_operationName"
                        value={formData.client_operationName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                        Business/Delivery Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="client_delivery_address"
                        value={formData.client_delivery_address}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                        Mobile Contact <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="client_business_contact"
                        value={formData.client_business_contact}
                        onChange={handleInputChange}
                        placeholder="+65"
                        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                          contactErrors.business ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-orange-500'
                        }`}
                        required
                      />
                      {contactErrors.business && (
                        <p className="text-red-500 text-xs mt-1">{contactErrors.business}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                        Business Activities
                      </label>
                      <input
                        type="text"
                        name="client_business_activities"
                        value={formData.client_business_activities}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                        Type of Business <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="client_type_business"
                        value={formData.client_type_business}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      >
                        <option value="Sole Proprietor">Sole Proprietor</option>
                        <option value="Partnership">Partnership</option>
                        <option value="Private Limited">Private Limited</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-center mt-6">
                    <button
                      onClick={handleProceed}
                      disabled={loading}
                      className="px-24 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: '#FF5722' }}
                    >
                      Proceed
                    </button>
                  </div>
                </div>
              ) : (
                // Step 2: Accounts Department
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                        Person in Charge <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="client_person_incharge"
                        value={formData.client_person_incharge}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                        Mobile Contact <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="client_person_contact"
                        value={formData.client_person_contact}
                        onChange={handleInputChange}
                        placeholder="+65"
                        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                          contactErrors.person ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-orange-500'
                        }`}
                        required
                      />
                      {contactErrors.person && (
                        <p className="text-red-500 text-xs mt-1">{contactErrors.person}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="client_email"
                        value={formData.client_email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                        Billing Address
                      </label>
                      <input
                        type="text"
                        name="client_billing_address"
                        value={formData.client_billing_address}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                        Bank Name
                      </label>
                      <input
                        type="text"
                        name="client_bankName"
                        value={formData.client_bankName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                        Bank Account No.
                      </label>
                      <input
                        type="text"
                        name="client_bankNumber"
                        value={formData.client_bankNumber}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                      ACRA Form <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <input
                        type="file"
                        id="acra-upload"
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".pdf,.doc,.docx"
                      />
                      <label
                        htmlFor="acra-upload"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        <Upload className="text-gray-400 mb-2" size={32} />
                        <span className="text-gray-500">
                          {acraFile ? acraFile.name : 'Upload the ACRA Form'}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-center mt-6">
                    <button
                      onClick={isEditMode ? handleUpdate : handleSubmit}
                      disabled={loading}
                      className="px-24 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: '#FF5722' }}
                    >
                      {loading ? (isEditMode ? 'Updating...' : 'Adding Client...') : (isEditMode ? 'Update Client' : 'Add New Client')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
            <button
              onClick={closeSuccessModal}
              className="float-right text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <Check size={32} className="text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#5C2E1F' }}>
              Client Added Successfully!
            </h2>
            <p className="text-gray-600 mb-6">
              Client&apos;s account details were added successfully to the system.
            </p>
            <button
              onClick={closeSuccessModal}
              className="px-16 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#FF5722' }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <X size={32} className="text-red-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#5C2E1F' }}>
                Confirm Client Removal
              </h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to remove {selectedRows.size} {selectedRows.size === 1 ? 'client' : 'clients'}? This action cannot be undone.
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="px-8 py-2 border border-gray-300 rounded font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-8 py-2 bg-red-500 text-white rounded font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Removing...' : 'Removed'}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Delete Success Modal */}
      {isDeleteSuccessOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
            <button
              onClick={() => setIsDeleteSuccessOpen(false)}
              className="float-right text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <Check size={32} className="text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#5C2E1F' }}>
              Successfully Removed!
            </h2>
            <p className="text-gray-600 mb-6">
              Client(s) have been removed from the system.
            </p>
            <button
              onClick={() => setIsDeleteSuccessOpen(false)}
              className="px-16 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#FF5722' }}
            >
              OK
            </button>
          </div>
        </div>
      )}

    {/* Edit Success Modal */}
    {isEditSuccessOpen && (
      <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
          <button
            onClick={() => setIsEditSuccessOpen(false)}
            className="float-right text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
              <Check size={32} className="text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#5C2E1F' }}>
            Successfully Updated!
          </h2>
          <p className="text-gray-600 mb-6">
            Client information has been updated successfully.
          </p>
          <button
            onClick={() => setIsEditSuccessOpen(false)}
            className="px-16 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#FF5722' }}
          >
            OK
          </button>
        </div>
      </div>
    )}

      {/* View Client Details Modal */}
      {isViewModalOpen && selectedClient && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold" style={{ color: '#5C2E1F' }}>
                    Client Details
                  </h2>
                  <p className="text-gray-500 mt-1">Complete information for {selectedClient.client_id}</p>
                </div>
                <button onClick={closeViewModal} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Account Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3" style={{ color: '#5C2E1F' }}>Account Information</h3>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Client ID</p>
                      <p className="font-medium">{selectedClient.client_id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Account Opened Date</p>
                      <p className="font-medium">{new Date(selectedClient.client_account_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className={`font-medium ${selectedClient.is_online ? 'text-green-600' : 'text-gray-500'}`}>
                        {selectedClient.is_online ? 'Online' : 'Offline'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Created At</p>
                      <p className="font-medium">{new Date(selectedClient.client_created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Business Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3" style={{ color: '#5C2E1F' }}>Business Information</h3>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Business Name</p>
                      <p className="font-medium">{selectedClient.client_businessName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Operation Name</p>
                      <p className="font-medium">{selectedClient.client_operationName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Type of Business</p>
                      <p className="font-medium">{selectedClient.client_type_business}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Business Activities</p>
                      <p className="font-medium">{selectedClient.client_business_activities || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Delivery Address</p>
                      <p className="font-medium">{selectedClient.client_delivery_address}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Business Contact</p>
                      <p className="font-medium">{selectedClient.client_business_contact}</p>
                    </div>
                  </div>
                </div>

                {/* Contact Person Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3" style={{ color: '#5C2E1F' }}>Contact Person</h3>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Person in Charge</p>
                      <p className="font-medium">{selectedClient.client_person_incharge}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Mobile Contact</p>
                      <p className="font-medium">{selectedClient.client_person_contact}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{selectedClient.client_email}</p>
                    </div>
                  </div>
                </div>

                {/* Financial Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3" style={{ color: '#5C2E1F' }}>Financial Information</h3>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Billing Address</p>
                      <p className="font-medium">{selectedClient.client_billing_address || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Bank Name</p>
                      <p className="font-medium">{selectedClient.client_bankName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Bank Account Number</p>
                      <p className="font-medium">{selectedClient.client_bankNumber || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Authentication Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3" style={{ color: '#5C2E1F' }}>Authentication</h3>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Auth ID</p>
                      <p className="font-medium text-xs">{selectedClient.client_auth_id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Password</p>
                      <p className="font-medium">{selectedClient.client_password}</p>
                    </div>
                  </div>
                </div>

                {/* ACRA Document */}
                {selectedClient.client_ACRA && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3" style={{ color: '#5C2E1F' }}>Documents</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">ACRA Form</p>
                          <p className="font-medium text-sm">{selectedClient.client_ACRA.split('/').pop()}</p>
                        </div>
                        <button
                          onClick={() => downloadAcraFile(selectedClient.client_ACRA!)}
                          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center mt-6">
                <button
                  onClick={closeViewModal}
                  className="px-16 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#FF5722' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}