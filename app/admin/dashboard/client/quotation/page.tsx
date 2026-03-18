'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, Filter, X, ChevronDown, Plus, Trash2, Edit2 } from 'lucide-react';
import Sidepanel from '@/app/components/sidepanel/page';
import Header from '@/app/components/header/page';
import { TableSkeleton, SkeletonStyles } from '@/app/components/skeletonLoader/page';
import supabase from '@/lib/client';
import Image from 'next/image';

// Helper function to load image as base64 for PDF
const loadImageAsBase64 = (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
};

interface Quotation {
  id: number;
  quotation_id: string;
  client_auth_id: string | null;
  company_name: string;
  date_created: string;
  valid_until: string;
  total_amount: number;
  status: string;
  notes: string | null;
  client_email: string;
  client_person_incharge: string;
  client_business_contact: string;
  business_address: string;
}

interface QuotationItem {
  id?: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  description: string;
}

interface Client {
  client_auth_id: string;
  client_businessName: string;
  client_email: string;
  client_person_incharge: string;
  client_business_contact: string;
  ad_streetName: string;
  ad_country: string;
  ad_postal: string;
  client_billing_address: string;
}

interface Product {
  id: number;
  product_id: string;
  product_name: string;
  product_price: number;
  product_type: string;
}

interface HeaderOption {
  id: number;
  option_name: string;
  line1?: string;
  line2?: string;
  line3?: string;
  line4?: string;
  line5?: string;
  line6?: string;
  line7?: string;
  is_default?: boolean;
}

interface FooterOption {
  id: number;
  option_name: string;
  line1?: string;
  line2?: string;
  line3?: string;
  line4?: string;
  line5?: string;
  is_default?: boolean;
}

export default function ClientQuotationPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Create quotation modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([]);
  const [quotationNotes, setQuotationNotes] = useState('');
  const [creatingQuotation, setCreatingQuotation] = useState(false);

  // Client selection states
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [isUnregisteredClient, setIsUnregisteredClient] = useState(false);
  const [unregisteredClientName, setUnregisteredClientName] = useState('');
  const [unregisteredClientAddress, setUnregisteredClientAddress] = useState('');
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // View quotation modal states
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [quotationItemsView, setQuotationItemsView] = useState<QuotationItem[]>([]);
  const [headerOptions, setHeaderOptions] = useState<HeaderOption[]>([]);
  const [footerOptions, setFooterOptions] = useState<FooterOption[]>([]);
  const [selectedHeaderId, setSelectedHeaderId] = useState<number | null>(null);
  const [selectedFooterId, setSelectedFooterId] = useState<number | null>(null);

  // Header/Footer editor states
  const [showHeaderEditor, setShowHeaderEditor] = useState(false);
  const [showFooterEditor, setShowFooterEditor] = useState(false);
  const [editingHeaderId, setEditingHeaderId] = useState<number | null>(null);
  const [editingFooterId, setEditingFooterId] = useState<number | null>(null);
  const [headerFormData, setHeaderFormData] = useState({
    option_name: '', line1: '', line2: '', line3: '', line4: '', line5: '', line6: '', line7: ''
  });
  const [footerFormData, setFooterFormData] = useState({
    option_name: '', line1: '', line2: '', line3: '', line4: '', line5: ''
  });

  // Success/Warning modals
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // Selection states
  const [selectedQuotationIds, setSelectedQuotationIds] = useState<number[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [editQuotationItems, setEditQuotationItems] = useState<QuotationItem[]>([]);
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editBusinessAddress, setEditBusinessAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const itemsPerPage = 10;

  // Close client dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchQuotations();
    fetchClients();
    fetchProducts();
    fetchHeaderOptions();
    fetchFooterOptions();
  }, []);

  const fetchHeaderOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('header_options')
        .select('*')
        .order('is_default', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setHeaderOptions(data);
        const defaultHeader = data.find(h => h.is_default) || data[0];
        setSelectedHeaderId(defaultHeader.id);
      }
    } catch (error) {
      console.error('Error fetching header options:', error);
    }
  };

  const fetchFooterOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('footer_options')
        .select('*')
        .order('is_default', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setFooterOptions(data);
        // Default to empty footer (null) for quotations
        setSelectedFooterId(null);
      }
    } catch (error) {
      console.error('Error fetching footer options:', error);
    }
  };

  // Header editor handlers
  const handleEditHeaderOption = (header: HeaderOption) => {
    setEditingHeaderId(header.id);
    setHeaderFormData({
      option_name: header.option_name,
      line1: header.line1 || '', line2: header.line2 || '', line3: header.line3 || '',
      line4: header.line4 || '', line5: header.line5 || '', line6: header.line6 || '', line7: header.line7 || ''
    });
    setShowHeaderEditor(true);
  };

  const handleSaveHeaderOption = async () => {
    try {
      if (editingHeaderId) {
        const { error } = await supabase.from('header_options').update(headerFormData).eq('id', editingHeaderId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('header_options').insert({ ...headerFormData, is_default: false });
        if (error) throw error;
      }
      fetchHeaderOptions();
      setShowHeaderEditor(false);
      setEditingHeaderId(null);
      setHeaderFormData({ option_name: '', line1: '', line2: '', line3: '', line4: '', line5: '', line6: '', line7: '' });
    } catch (error) {
      console.error('Error saving header option:', error);
    }
  };

  const handleDeleteHeaderOption = async (id: number) => {
    try {
      const { error } = await supabase.from('header_options').delete().eq('id', id);
      if (error) throw error;
      fetchHeaderOptions();
      setShowHeaderEditor(false);
      setEditingHeaderId(null);
    } catch (error) {
      console.error('Error deleting header option:', error);
    }
  };

  // Footer editor handlers
  const handleEditFooterOption = (footer: FooterOption) => {
    setEditingFooterId(footer.id);
    setFooterFormData({
      option_name: footer.option_name,
      line1: footer.line1 || '', line2: footer.line2 || '', line3: footer.line3 || '',
      line4: footer.line4 || '', line5: footer.line5 || ''
    });
    setShowFooterEditor(true);
  };

  const handleSaveFooterOption = async () => {
    try {
      if (editingFooterId) {
        const { error } = await supabase.from('footer_options').update(footerFormData).eq('id', editingFooterId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('footer_options').insert({ ...footerFormData, is_default: false });
        if (error) throw error;
      }
      fetchFooterOptions();
      setShowFooterEditor(false);
      setEditingFooterId(null);
      setFooterFormData({ option_name: '', line1: '', line2: '', line3: '', line4: '', line5: '' });
    } catch (error) {
      console.error('Error saving footer option:', error);
    }
  };

  const handleDeleteFooterOption = async (id: number) => {
    try {
      const { error } = await supabase.from('footer_options').delete().eq('id', id);
      if (error) throw error;
      fetchFooterOptions();
      setShowFooterEditor(false);
      setEditingFooterId(null);
    } catch (error) {
      console.error('Error deleting footer option:', error);
    }
  };

  const fetchQuotations = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('client_quotation')
        .select(`
          *,
          client_user!client_quotation_client_auth_id_fkey(
            client_businessName,
            client_email,
            client_person_incharge,
            client_business_contact,
            ad_streetName,
            ad_country,
            ad_postal
          )
        `)
        .order('date_created', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          console.log('Quotation table not found. Please run the migration.');
          setMessage({ type: 'error', text: 'Quotation table not found. Please run the database migration.' });
          setQuotations([]);
          return;
        }
        throw error;
      }

      if (!data || data.length === 0) {
        setQuotations([]);
      } else {
        interface RawQuotation {
          id: number;
          quotation_id: string;
          client_auth_id: string | null;
          company_name: string | null;
          date_created: string;
          valid_until: string;
          total_amount: number;
          status: string;
          notes: string | null;
          business_address: string | null;
          client_user?: {
            client_businessName: string;
            client_email: string;
            client_person_incharge: string;
            client_business_contact: string;
            ad_streetName: string;
            ad_country: string;
            ad_postal: string;
          } | Array<{
            client_businessName: string;
            client_email: string;
            client_person_incharge: string;
            client_business_contact: string;
            ad_streetName: string;
            ad_country: string;
            ad_postal: string;
          }>;
        }

        const transformedQuotations = data.map((quot: RawQuotation) => {
          let clientData = {
            client_businessName: quot.company_name || 'N/A',
            client_email: 'N/A',
            client_person_incharge: 'N/A',
            client_business_contact: 'N/A',
            ad_streetName: 'N/A',
            ad_country: 'N/A',
            ad_postal: 'N/A'
          };

          if (quot.client_user) {
            if (Array.isArray(quot.client_user)) {
              clientData = quot.client_user[0] || clientData;
            } else {
              clientData = quot.client_user;
            }
          }

          return {
            id: quot.id,
            quotation_id: quot.quotation_id,
            client_auth_id: quot.client_auth_id,
            company_name: quot.company_name || clientData.client_businessName,
            date_created: quot.date_created,
            valid_until: quot.valid_until,
            total_amount: quot.total_amount,
            status: quot.status,
            notes: quot.notes,
            client_email: clientData.client_email,
            client_person_incharge: clientData.client_person_incharge,
            client_business_contact: clientData.client_business_contact,
            business_address: quot.business_address || `${clientData.ad_streetName}, ${clientData.ad_country}, ${clientData.ad_postal}`
          };
        });

        setQuotations(transformedQuotations);
      }
    } catch (error) {
      console.error('Error fetching quotations:', error);
      setMessage({ type: 'error', text: 'Failed to fetch quotations' });
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('client_user')
        .select('client_auth_id, client_businessName, client_email, client_person_incharge, client_business_contact, ad_streetName, ad_country, ad_postal, client_billing_address')
        .order('client_businessName');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('product_list')
        .select('id, product_id, product_name, product_price, product_type')
        .eq('is_deleted', false)
        .order('product_name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const generateQuotationId = async () => {
    try {
      // Get the latest quotation number from the database
      const { data, error } = await supabase
        .from('client_quotation')
        .select('quotation_id')
        .order('id', { ascending: false })
        .limit(1);

      let nextNumber = 5000; // Start from 5000

      if (!error && data && data.length > 0) {
        // Extract number from existing quotation_id (just a number)
        const lastId = data[0].quotation_id;
        const parsedNumber = parseInt(lastId, 10);
        if (!isNaN(parsedNumber)) {
          nextNumber = parsedNumber + 1;
        }
      }

      return String(nextNumber);
    } catch (error) {
      console.error('Error generating quotation ID:', error);
      // Fallback to 5000
      return '5000';
    }
  };

  const handleAddItem = () => {
    setQuotationItems([
      ...quotationItems,
      {
        product_id: null,
        product_name: '',
        quantity: 1,
        unit_price: 0,
        subtotal: 0,
        description: ''
      }
    ]);
  };

  const handleItemChange = (index: number, field: keyof QuotationItem, value: string | number | null) => {
    const updatedItems = [...quotationItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };

    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === Number(value));
      if (product) {
        updatedItems[index].product_name = product.product_name;
        updatedItems[index].unit_price = product.product_price;
        updatedItems[index].subtotal = product.product_price * updatedItems[index].quantity;
      }
    }

    if (field === 'quantity' || field === 'unit_price') {
      const quantity = field === 'quantity' ? Number(value) : updatedItems[index].quantity;
      const unitPrice = field === 'unit_price' ? Number(value) : updatedItems[index].unit_price;
      updatedItems[index].subtotal = quantity * unitPrice;
    }

    setQuotationItems(updatedItems);
  };

  const handleRemoveItem = (index: number) => {
    setQuotationItems(quotationItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    const subtotal = quotationItems.reduce((sum, item) => sum + item.subtotal, 0);
    const gst = subtotal * 0.09;
    return subtotal + gst;
  };

  const getSelectedClientData = () => {
    if (isUnregisteredClient) {
      return {
        company_name: unregisteredClientName,
        business_address: unregisteredClientAddress,
        client_email: '',
        client_person_incharge: '',
        client_business_contact: '',
        client_billing_address: unregisteredClientAddress
      };
    }
    const client = clients.find(c => c.client_auth_id === selectedClient);
    if (client) {
      return {
        company_name: client.client_businessName,
        business_address: `${client.ad_streetName}, ${client.ad_country}, ${client.ad_postal}`,
        client_email: client.client_email,
        client_person_incharge: client.client_person_incharge,
        client_business_contact: client.client_business_contact,
        client_billing_address: client.client_billing_address || `${client.ad_streetName}, ${client.ad_country}, ${client.ad_postal}`
      };
    }
    return null;
  };

  const filteredClients = clients.filter(client =>
    client.client_businessName.toLowerCase().includes(clientSearchQuery.toLowerCase())
  );

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client.client_auth_id);
    setClientSearchQuery(client.client_businessName);
    setShowClientDropdown(false);
  };

  const handleCreateQuotation = async () => {
    if (!isUnregisteredClient && !selectedClient) {
      alert('Please select a client');
      return;
    }

    if (isUnregisteredClient && !unregisteredClientName.trim()) {
      alert('Please enter the client name');
      return;
    }

    if (quotationItems.length === 0) {
      alert('Please add at least one item');
      return;
    }

    const hasInvalidItems = quotationItems.some(item => !item.product_name || item.quantity <= 0);
    if (hasInvalidItems) {
      alert('Please fill in all item details');
      return;
    }

    try {
      setCreatingQuotation(true);

      const quotationId = await generateQuotationId();
      const dateCreated = new Date().toISOString();
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);
      const totalAmount = calculateTotal();

      const clientData = getSelectedClientData();

      // Create quotation
      const { data: quotationData, error: quotationError } = await supabase
        .from('client_quotation')
        .insert({
          quotation_id: quotationId,
          client_auth_id: isUnregisteredClient ? null : selectedClient,
          company_name: clientData?.company_name || '',
          business_address: clientData?.business_address || '',
          date_created: dateCreated,
          valid_until: validUntil.toISOString(),
          total_amount: totalAmount,
          status: 'Pending',
          notes: quotationNotes
        })
        .select('id')
        .single();

      if (quotationError) throw quotationError;

      // Create quotation items
      const itemsToInsert = quotationItems.map(item => ({
        quotation_id: quotationData.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        description: item.description
      }));

      const { error: itemsError } = await supabase
        .from('client_quotation_item')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      setSuccessMessage('Quotation created successfully!');
      setShowSuccessModal(true);
      setShowCreateModal(false);
      resetCreateForm();
      fetchQuotations();
    } catch (error) {
      console.error('Error creating quotation:', error);
      alert('Failed to create quotation');
    } finally {
      setCreatingQuotation(false);
    }
  };

  const generateQuotationPDF = async (
    quotationId: string,
    clientData: ReturnType<typeof getSelectedClientData>,
    items: QuotationItem[],
    totalAmount: number,
    notes: string
  ) => {
    try {
      const jsPDF = (await import('jspdf')).default;

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const selectedHeader = headerOptions.find(h => h.id === selectedHeaderId);
      const selectedFooter = footerOptions.find(f => f.id === selectedFooterId);

      // Load and add logo at top right
      try {
        const logoBase64 = await loadImageAsBase64('/assets/file_logo.png');
        doc.addImage(logoBase64, 'PNG', 165, 10, 30, 20);
      } catch (logoError) {
        console.error('Error loading logo:', logoError);
      }

      // Header
      doc.setFont('helvetica');
      doc.setFontSize(10);
      let yPos = 20;

      if (selectedHeader?.line1) {
        doc.setFont('helvetica', 'bold');
        doc.text(selectedHeader.line1, 20, yPos);
        yPos += 5;
      }
      doc.setFont('helvetica', 'normal');
      if (selectedHeader?.line2) { doc.text(selectedHeader.line2, 20, yPos); yPos += 5; }
      if (selectedHeader?.line3) { doc.text(selectedHeader.line3, 20, yPos); yPos += 5; }
      if (selectedHeader?.line4) { doc.text(selectedHeader.line4, 20, yPos); yPos += 5; }
      if (selectedHeader?.line5) { doc.text(selectedHeader.line5, 20, yPos); yPos += 5; }
      if (selectedHeader?.line6) { doc.text(selectedHeader.line6, 20, yPos); yPos += 5; }
      if (selectedHeader?.line7) { doc.text(selectedHeader.line7, 20, yPos); yPos += 5; }

      // Title
      yPos = 58;
      doc.setFontSize(20);
      doc.setTextColor("#0D909A");
      doc.text('Quotation', 20, yPos);

      // Three column section
      yPos = 70;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);

      // BILL TO
      doc.setFont('helvetica', 'bold');
      doc.text('TO', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(clientData?.company_name || 'N/A', 20, yPos + 5);
      const address = doc.splitTextToSize(clientData?.business_address || 'N/A', 50);
      doc.text(address, 20, yPos + 10);

      // Quotation details - Right side
      const rightX = 190;
      const quotationLabel = 'QUOTATION NO.  ';
      const dateLabel = 'DATE  ';
      const dateValue = new Date().toLocaleDateString('en-GB');

      // Calculate positions to avoid overlap
      doc.setFont('helvetica', 'normal');
      const quotationValueWidth = doc.getTextWidth(quotationId);
      const dateValueWidth = doc.getTextWidth(dateValue);
      doc.setFont('helvetica', 'bold');
      const quotationLabelWidth = doc.getTextWidth(quotationLabel);
      const dateLabelWidth = doc.getTextWidth(dateLabel);

      // Draw quotation number
      doc.setFont('helvetica', 'bold');
      doc.text(quotationLabel, rightX - quotationValueWidth - quotationLabelWidth, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(quotationId, rightX, yPos, { align: 'right' });

      // Draw date
      doc.setFont('helvetica', 'bold');
      doc.text(dateLabel, rightX - dateValueWidth - dateLabelWidth, yPos + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(dateValue, rightX, yPos + 6, { align: 'right' });

      // Horizontal divider
      yPos = 90;
      doc.setDrawColor(77, 184, 186);
      doc.line(20, yPos, 190, yPos);

      // Table header
      yPos = 105;
      doc.setFillColor(184, 230, 231);
      doc.rect(20, yPos - 5, 170, 8, 'F');
      doc.setTextColor("#4db8ba");
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('PRODUCT / SERVICES', 22, yPos);
      doc.text('DESCRIPTION', 70, yPos);
      doc.text('QTY', 120, yPos, { align: 'center' });
      doc.text('UNIT PRICE', 150, yPos, { align: 'right' });
      doc.text('AMOUNT', 185, yPos, { align: 'right' });

      // Table rows
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      yPos += 8;

      items.forEach((item) => {
        doc.text(item.product_name.substring(0, 25), 22, yPos);
        doc.text((item.description || '').substring(0, 30), 70, yPos);
        doc.text(String(item.quantity), 120, yPos, { align: 'center' });
        doc.text(item.unit_price.toFixed(2), 150, yPos, { align: 'right' });
        doc.text(item.subtotal.toFixed(2), 185, yPos, { align: 'right' });
        yPos += 6;
      });

      // Dotted line
      yPos += 5;
      (doc as any).setLineDashPattern([1, 1], 0);
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPos, 190, yPos);
      (doc as any).setLineDashPattern([], 0);

      // Totals
      const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
      const gst = subtotal * 0.09;

      yPos += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('SUBTOTAL', 140, yPos, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(subtotal.toFixed(2), 185, yPos, { align: 'right' });

      yPos += 6;
      doc.setFont('helvetica', 'bold');
      doc.text('GST 9%', 140, yPos, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(gst.toFixed(2), 185, yPos, { align: 'right' });

      yPos += 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('QUOTATION TOTAL', 140, yPos, { align: 'right' });
      doc.setFontSize(14);
      doc.text('$' + totalAmount.toFixed(2), 185, yPos, { align: 'right' });
      doc.setFontSize(10);

      // Notes
      if (notes) {
        yPos += 15;
        doc.setFont('helvetica', 'bold');
        doc.text('Notes', 20, yPos);
        doc.setFont('helvetica', 'normal');

        // Split notes into paragraphs and render each with proper spacing
        const paragraphs = notes.split('\n').filter(p => p.trim());
        let noteY = yPos + 6;
        paragraphs.forEach((paragraph) => {
          const paragraphLines = doc.splitTextToSize(paragraph.trim(), 80);
          doc.text(paragraphLines, 20, noteY);
          noteY += (paragraphLines.length * 4) + 4;
        });
      }

      // Footer
      const footerY = 260;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');

      if (selectedFooter?.line1) {
        doc.text(selectedFooter.line1, 105, footerY, { align: 'center' });
      }
      if (selectedFooter?.line2) {
        doc.text(selectedFooter.line2, 105, footerY + 5, { align: 'center' });
      }
      if (selectedFooter?.line3) {
        doc.text(selectedFooter.line3, 105, footerY + 10, { align: 'center' });
      }
      if (selectedFooter?.line4) {
        doc.text(selectedFooter.line4, 105, footerY + 15, { align: 'center' });
      }
      if (selectedFooter?.line5) {
        doc.text(selectedFooter.line5, 105, footerY + 20, { align: 'center' });
      }

      // Download
      const fileName = `Quotation_${quotationId}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const resetCreateForm = () => {
    setSelectedClient('');
    setClientSearchQuery('');
    setIsUnregisteredClient(false);
    setUnregisteredClientName('');
    setUnregisteredClientAddress('');
    setQuotationItems([]);
    setQuotationNotes('');
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedQuotationIds.length === currentQuotations.length) {
      setSelectedQuotationIds([]);
    } else {
      setSelectedQuotationIds(currentQuotations.map(q => q.id));
    }
  };

  const handleSelectQuotation = (id: number) => {
    setSelectedQuotationIds(prev =>
      prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedQuotationIds.length === 0) return;
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteQuotations = async () => {
    try {
      setLoading(true);
      setShowDeleteConfirmModal(false);

      const deleteCount = selectedQuotationIds.length;

      // Delete quotation items first
      const { error: itemsError } = await supabase
        .from('client_quotation_item')
        .delete()
        .in('quotation_id', selectedQuotationIds);

      if (itemsError) throw itemsError;

      // Delete quotations
      const { error: quotationsError } = await supabase
        .from('client_quotation')
        .delete()
        .in('id', selectedQuotationIds);

      if (quotationsError) throw quotationsError;

      setSelectedQuotationIds([]);
      setSuccessMessage(`${deleteCount} quotation(s) deleted successfully!`);
      setShowSuccessModal(true);
      fetchQuotations();
    } catch (error) {
      console.error('Error deleting quotations:', error);
      setSuccessMessage('Failed to delete quotations');
      setShowSuccessModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSelected = async () => {
    if (selectedQuotationIds.length !== 1) {
      alert('Please select exactly one quotation to edit');
      return;
    }

    const quotation = quotations.find(q => q.id === selectedQuotationIds[0]);
    if (!quotation) return;

    try {
      // Fetch quotation items
      const { data: items, error } = await supabase
        .from('client_quotation_item')
        .select('*')
        .eq('quotation_id', quotation.id);

      if (error) throw error;

      setEditingQuotation(quotation);
      setEditCompanyName(quotation.company_name);
      setEditBusinessAddress(quotation.business_address);
      setEditNotes(quotation.notes || '');
      setEditQuotationItems(items || []);
      setShowEditModal(true);
    } catch (error) {
      console.error('Error loading quotation for edit:', error);
      alert('Failed to load quotation');
    }
  };

  const handleEditItemChange = (index: number, field: keyof QuotationItem, value: string | number | null) => {
    const updatedItems = [...editQuotationItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };

    if (field === 'quantity' || field === 'unit_price') {
      const quantity = field === 'quantity' ? Number(value) : updatedItems[index].quantity;
      const unitPrice = field === 'unit_price' ? Number(value) : updatedItems[index].unit_price;
      updatedItems[index].subtotal = quantity * unitPrice;
    }

    setEditQuotationItems(updatedItems);
  };

  const handleAddEditItem = () => {
    setEditQuotationItems([
      ...editQuotationItems,
      {
        product_id: null,
        product_name: '',
        quantity: 1,
        unit_price: 0,
        subtotal: 0,
        description: ''
      }
    ]);
  };

  const handleRemoveEditItem = (index: number) => {
    setEditQuotationItems(editQuotationItems.filter((_, i) => i !== index));
  };

  const calculateEditTotal = () => {
    const subtotal = editQuotationItems.reduce((sum, item) => sum + item.subtotal, 0);
    const gst = subtotal * 0.09;
    return subtotal + gst;
  };

  const handleSaveEdit = async () => {
    if (!editingQuotation) return;

    if (editQuotationItems.length === 0) {
      alert('Please add at least one item');
      return;
    }

    const hasInvalidItems = editQuotationItems.some(item => !item.product_name || item.quantity <= 0);
    if (hasInvalidItems) {
      alert('Please fill in all item details');
      return;
    }

    try {
      setLoading(true);

      const totalAmount = calculateEditTotal();

      // Update quotation
      const { error: quotationError } = await supabase
        .from('client_quotation')
        .update({
          company_name: editCompanyName,
          business_address: editBusinessAddress,
          notes: editNotes,
          total_amount: totalAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingQuotation.id);

      if (quotationError) throw quotationError;

      // Delete existing items
      const { error: deleteError } = await supabase
        .from('client_quotation_item')
        .delete()
        .eq('quotation_id', editingQuotation.id);

      if (deleteError) throw deleteError;

      // Insert updated items
      const itemsToInsert = editQuotationItems.map(item => ({
        quotation_id: editingQuotation.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        description: item.description
      }));

      const { error: itemsError } = await supabase
        .from('client_quotation_item')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      setShowEditModal(false);
      setEditingQuotation(null);
      setSelectedQuotationIds([]);
      setSuccessMessage('Quotation updated successfully!');
      setShowSuccessModal(true);
      fetchQuotations();
    } catch (error) {
      console.error('Error updating quotation:', error);
      alert('Failed to update quotation');
    } finally {
      setLoading(false);
    }
  };

  const handleViewQuotation = async (quotation: Quotation) => {
    try {
      setLoading(true);

      const { data: items, error } = await supabase
        .from('client_quotation_item')
        .select('*')
        .eq('quotation_id', quotation.id);

      if (error) throw error;

      setSelectedQuotation(quotation);
      setQuotationItemsView(items || []);
      setShowQuotationModal(true);
    } catch (error) {
      console.error('Error loading quotation:', error);
      alert('Failed to load quotation');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintQuotation = async () => {
    if (!selectedQuotation || !quotationItemsView) return;

    try {
      const jsPDF = (await import('jspdf')).default;

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const selectedHeader = headerOptions.find(h => h.id === selectedHeaderId);
      const selectedFooter = footerOptions.find(f => f.id === selectedFooterId);

      // Load and add logo at top right
      try {
        const logoBase64 = await loadImageAsBase64('/assets/file_logo.png');
        doc.addImage(logoBase64, 'PNG', 165, 10, 30, 20);
      } catch (logoError) {
        console.error('Error loading logo:', logoError);
      }

      // Header
      doc.setFont('helvetica');
      doc.setFontSize(10);
      let yPos = 20;

      if (selectedHeader?.line1) {
        doc.setFont('helvetica', 'bold');
        doc.text(selectedHeader.line1, 20, yPos);
        yPos += 5;
      }
      doc.setFont('helvetica', 'normal');
      if (selectedHeader?.line2) { doc.text(selectedHeader.line2, 20, yPos); yPos += 5; }
      if (selectedHeader?.line3) { doc.text(selectedHeader.line3, 20, yPos); yPos += 5; }
      if (selectedHeader?.line4) { doc.text(selectedHeader.line4, 20, yPos); yPos += 5; }
      if (selectedHeader?.line5) { doc.text(selectedHeader.line5, 20, yPos); yPos += 5; }
      if (selectedHeader?.line6) { doc.text(selectedHeader.line6, 20, yPos); yPos += 5; }
      if (selectedHeader?.line7) { doc.text(selectedHeader.line7, 20, yPos); yPos += 5; }

      // Title
      yPos = 58;
      doc.setFontSize(20);
      doc.setTextColor("#0D909A");
      doc.text('Quotation', 20, yPos);

      // Three column section
      yPos = 70;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);

      // TO
      doc.setFont('helvetica', 'bold');
      doc.text('TO', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(selectedQuotation.company_name || 'N/A', 20, yPos + 5);
      const address = doc.splitTextToSize(selectedQuotation.business_address || 'N/A', 50);
      doc.text(address, 20, yPos + 10);

      // Quotation details - Right side
      const rightX = 190;
      const quotationLabel = 'QUOTATION NO.  ';
      const dateLabel = 'DATE  ';
      const dateValue = new Date(selectedQuotation.date_created).toLocaleDateString('en-GB');

      // Calculate positions to avoid overlap
      doc.setFont('helvetica', 'normal');
      const quotationValueWidth = doc.getTextWidth(selectedQuotation.quotation_id);
      const dateValueWidth = doc.getTextWidth(dateValue);
      doc.setFont('helvetica', 'bold');
      const quotationLabelWidth = doc.getTextWidth(quotationLabel);
      const dateLabelWidth = doc.getTextWidth(dateLabel);

      // Draw quotation number
      doc.setFont('helvetica', 'bold');
      doc.text(quotationLabel, rightX - quotationValueWidth - quotationLabelWidth, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(selectedQuotation.quotation_id, rightX, yPos, { align: 'right' });

      // Draw date
      doc.setFont('helvetica', 'bold');
      doc.text(dateLabel, rightX - dateValueWidth - dateLabelWidth, yPos + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(dateValue, rightX, yPos + 6, { align: 'right' });

      // Horizontal divider
      yPos = 90;
      doc.setDrawColor(77, 184, 186);
      doc.line(20, yPos, 190, yPos);

      // Table header
      yPos = 105;
      doc.setFillColor(184, 230, 231);
      doc.rect(20, yPos - 5, 170, 8, 'F');
      doc.setTextColor("#4db8ba");
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('PRODUCT / SERVICES', 22, yPos);
      doc.text('DESCRIPTION', 70, yPos);
      doc.text('QTY', 120, yPos, { align: 'center' });
      doc.text('UNIT PRICE', 150, yPos, { align: 'right' });
      doc.text('AMOUNT', 185, yPos, { align: 'right' });

      // Table rows
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      yPos += 8;

      quotationItemsView.forEach((item) => {
        doc.text(item.product_name.substring(0, 25), 22, yPos);
        doc.text((item.description || '').substring(0, 30), 70, yPos);
        doc.text(String(item.quantity), 120, yPos, { align: 'center' });
        doc.text(item.unit_price.toFixed(2), 150, yPos, { align: 'right' });
        doc.text(item.subtotal.toFixed(2), 185, yPos, { align: 'right' });
        yPos += 6;
      });

      // Dotted line
      yPos += 5;
      (doc as any).setLineDashPattern([1, 1], 0);
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPos, 190, yPos);
      (doc as any).setLineDashPattern([], 0);

      // Totals
      const subtotal = quotationItemsView.reduce((sum, item) => sum + item.subtotal, 0);
      const gst = subtotal * 0.09;

      yPos += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('SUBTOTAL', 140, yPos, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(subtotal.toFixed(2), 185, yPos, { align: 'right' });

      yPos += 6;
      doc.setFont('helvetica', 'bold');
      doc.text('GST 9%', 140, yPos, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(gst.toFixed(2), 185, yPos, { align: 'right' });

      yPos += 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('QUOTATION TOTAL', 140, yPos, { align: 'right' });
      doc.setFontSize(14);
      doc.text('$' + selectedQuotation.total_amount.toFixed(2), 185, yPos, { align: 'right' });
      doc.setFontSize(10);

      // Notes
      if (selectedQuotation.notes) {
        yPos += 15;
        doc.setFont('helvetica', 'bold');
        doc.text('Notes', 20, yPos);
        doc.setFont('helvetica', 'normal');

        // Split notes into paragraphs and render each with proper spacing
        const paragraphs = selectedQuotation.notes.split('\n').filter(p => p.trim());
        let noteY = yPos + 6;
        paragraphs.forEach((paragraph) => {
          const paragraphLines = doc.splitTextToSize(paragraph.trim(), 80);
          doc.text(paragraphLines, 20, noteY);
          noteY += (paragraphLines.length * 4) + 4;
        });
      }

      // Footer
      const footerY = 260;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');

      if (selectedFooter?.line1) {
        doc.text(selectedFooter.line1, 105, footerY, { align: 'center' });
      }
      if (selectedFooter?.line2) {
        doc.text(selectedFooter.line2, 105, footerY + 5, { align: 'center' });
      }
      if (selectedFooter?.line3) {
        doc.text(selectedFooter.line3, 105, footerY + 10, { align: 'center' });
      }
      if (selectedFooter?.line4) {
        doc.text(selectedFooter.line4, 105, footerY + 15, { align: 'center' });
      }
      if (selectedFooter?.line5) {
        doc.text(selectedFooter.line5, 105, footerY + 20, { align: 'center' });
      }

      doc.autoPrint();
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      window.open(blobUrl, '_blank');

    } catch (error) {
      console.error('Error generating quotation for print:', error);
      alert('Failed to open print preview.');
    }
  };

  const handleDownloadQuotation = async () => {
    if (!selectedQuotation || !quotationItemsView) return;

    await generateQuotationPDF(
      selectedQuotation.quotation_id,
      {
        company_name: selectedQuotation.company_name,
        business_address: selectedQuotation.business_address,
        client_email: selectedQuotation.client_email,
        client_person_incharge: selectedQuotation.client_person_incharge,
        client_business_contact: selectedQuotation.client_business_contact,
        client_billing_address: selectedQuotation.business_address
      },
      quotationItemsView,
      selectedQuotation.total_amount,
      selectedQuotation.notes || ''
    );
  };

  const handleSort = (option: string) => {
    setSortBy(option);
    setShowSortMenu(false);
  };

  const filteredQuotations = quotations
    .filter(quotation =>
      quotation.quotation_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quotation.company_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.date_created).getTime() - new Date(a.date_created).getTime();
        case 'company':
          return a.company_name.localeCompare(b.company_name);
        case 'amount':
          return b.total_amount - a.total_amount;
        default:
          return 0;
      }
    });

  const totalPages = Math.ceil(filteredQuotations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentQuotations = filteredQuotations.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen flex" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
      <Sidepanel />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6" style={{ backgroundColor: '#FCF0E3' }}>
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

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold" style={{ color: '#5C2E1F' }}>
                Client Quotation
              </h1>

              <div className="flex items-center gap-4">
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

                <div className="relative">
                  <button
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <ChevronDown size={20} />
                    <span>Sort</span>
                  </button>

                  {showSortMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                      <button
                        onClick={() => handleSort('date')}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${sortBy === 'date' ? 'bg-orange-50 text-orange-600' : ''}`}
                      >
                        Date Created
                      </button>
                      <button
                        onClick={() => handleSort('company')}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${sortBy === 'company' ? 'bg-orange-50 text-orange-600' : ''}`}
                      >
                        Company Name
                      </button>
                      <button
                        onClick={() => handleSort('amount')}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${sortBy === 'amount' ? 'bg-orange-50 text-orange-600' : ''}`}
                      >
                        Total Amount
                      </button>
                    </div>
                  )}
                </div>

                <button
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Filter size={20} />
                  <span>Filter</span>
                </button>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#FF5722' }}
                >
                  <Plus size={20} />
                  <span>Create Quotation</span>
                </button>
              </div>
            </div>


            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr className="border-b-2" style={{ borderColor: '#5C2E1F' }}>
                    <th className="py-2 px-2 w-10">
                      <input
                        type="checkbox"
                        checked={currentQuotations.length > 0 && selectedQuotationIds.length === currentQuotations.length}
                        onChange={handleSelectAll}
                        className="w-4 h-4 accent-orange-500 cursor-pointer"
                      />
                    </th>
                    <th className="text-left py-2 px-3 font-bold text-xs" style={{ color: '#5C2E1F' }}>
                      COMPANY NAME
                    </th>
                    <th className="text-left py-2 px-3 font-bold text-xs" style={{ color: '#5C2E1F' }}>
                      DATE CREATED
                    </th>
                    <th className="text-left py-2 px-3 font-bold text-xs" style={{ color: '#5C2E1F' }}>
                      TOTAL
                    </th>
                    <th className="text-left py-2 px-3 font-bold text-xs" style={{ color: '#5C2E1F' }}>
                      QUOTATION
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-0">
                        <SkeletonStyles />
                        <TableSkeleton rows={8} columns={5} />
                      </td>
                    </tr>
                  ) : currentQuotations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-500">
                        {searchQuery ? 'No quotations found matching your search.' : 'No quotations available.'}
                      </td>
                    </tr>
                  ) : (
                    currentQuotations.map((quotation) => (
                      <tr
                        key={quotation.id}
                        className={`border-b border-gray-200 hover:bg-gray-50 ${selectedQuotationIds.includes(quotation.id) ? 'bg-orange-50' : ''}`}
                      >
                        <td className="py-2 px-2">
                          <input
                            type="checkbox"
                            checked={selectedQuotationIds.includes(quotation.id)}
                            onChange={() => handleSelectQuotation(quotation.id)}
                            className="w-4 h-4 accent-orange-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 text-xs">{quotation.company_name}</td>
                        <td className="py-2 px-3 text-xs">
                          {new Date(quotation.date_created).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3 text-xs">S$ {quotation.total_amount.toFixed(2)}</td>
                        <td className="py-2 px-3">
                          <button
                            onClick={() => handleViewQuotation(quotation)}
                            disabled={loading}
                            className="text-xs font-normal text-blue-700 hover:underline cursor-pointer transition-all disabled:opacity-50"
                          >
                            View Quotation
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredQuotations.length > 0 && (
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

          {/* Create Quotation Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 z-50 overflow-auto flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
              <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 shrink-0 rounded-t-lg flex justify-between items-center">
                  <h3 className="text-xl font-bold" style={{ color: '#5C2E1F' }}>
                    Create New Quotation
                  </h3>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetCreateForm();
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-6 space-y-6">
                  {/* Client Type Toggle */}
                  <div className="flex items-center gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="clientType"
                        checked={!isUnregisteredClient}
                        onChange={() => {
                          setIsUnregisteredClient(false);
                          setUnregisteredClientName('');
                          setUnregisteredClientAddress('');
                        }}
                        className="accent-orange-500"
                      />
                      <span className="text-sm font-medium" style={{ color: '#5C2E1F' }}>Registered Client</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="clientType"
                        checked={isUnregisteredClient}
                        onChange={() => {
                          setIsUnregisteredClient(true);
                          setSelectedClient('');
                          setClientSearchQuery('');
                        }}
                        className="accent-orange-500"
                      />
                      <span className="text-sm font-medium" style={{ color: '#5C2E1F' }}>Unregistered Client</span>
                    </label>
                  </div>

                  {/* Client Selection */}
                  {!isUnregisteredClient ? (
                    <div ref={clientDropdownRef} className="relative">
                      <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                        Search & Select Client *
                      </label>
                      <div className="relative">
                        <Search
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                          size={18}
                        />
                        <input
                          type="text"
                          placeholder="Search client by name..."
                          value={clientSearchQuery}
                          onChange={(e) => {
                            setClientSearchQuery(e.target.value);
                            setShowClientDropdown(true);
                          }}
                          onFocus={() => setShowClientDropdown(true)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      {showClientDropdown && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                          {filteredClients.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-500">No clients found</div>
                          ) : (
                            filteredClients.map((client) => (
                              <button
                                key={client.client_auth_id}
                                onClick={() => handleSelectClient(client)}
                                className={`w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                                  selectedClient === client.client_auth_id ? 'bg-orange-50' : ''
                                }`}
                              >
                                <div className="font-medium text-sm">{client.client_businessName}</div>
                                <div className="text-xs text-gray-500">{client.client_email}</div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                      {selectedClient && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800">
                            Selected: <strong>{clients.find(c => c.client_auth_id === selectedClient)?.client_businessName}</strong>
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                          Client Name *
                        </label>
                        <input
                          type="text"
                          placeholder="Enter client/company name"
                          value={unregisteredClientName}
                          onChange={(e) => setUnregisteredClientName(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                          Address
                        </label>
                        <textarea
                          placeholder="Enter client address"
                          value={unregisteredClientAddress}
                          onChange={(e) => setUnregisteredClientAddress(e.target.value)}
                          rows={2}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Quotation Items */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium" style={{ color: '#5C2E1F' }}>
                        Quotation Items
                      </label>
                      <button
                        onClick={handleAddItem}
                        className="flex items-center gap-1 text-sm px-3 py-1 rounded border border-orange-500 text-orange-500 hover:bg-orange-50 transition-colors"
                      >
                        <Plus size={16} />
                        Add Item
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2" style={{ borderColor: '#5C2E1F' }}>
                            <th className="text-left py-2 px-2 font-bold text-xs w-[25%]">PRODUCT</th>
                            <th className="text-left py-2 px-2 font-bold text-xs w-[20%]">DESCRIPTION</th>
                            <th className="text-center py-2 px-2 font-bold text-xs w-[12%]">QTY</th>
                            <th className="text-right py-2 px-2 font-bold text-xs w-[15%]">UNIT PRICE</th>
                            <th className="text-right py-2 px-2 font-bold text-xs w-[15%]">SUBTOTAL</th>
                            <th className="text-center py-2 px-2 font-bold text-xs w-[8%]">ACTION</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quotationItems.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center py-8 text-gray-400">
                                No items added. Click &quot;Add Item&quot; to start.
                              </td>
                            </tr>
                          ) : (
                            quotationItems.map((item, index) => (
                              <tr key={index} className="border-b border-gray-200">
                                <td className="py-2 px-2">
                                  <select
                                    value={item.product_id || ''}
                                    onChange={(e) => handleItemChange(index, 'product_id', e.target.value ? Number(e.target.value) : null)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                  >
                                    <option value="">-- Select or type --</option>
                                    {products.map((product) => (
                                      <option key={product.id} value={product.id}>
                                        {product.product_name}
                                      </option>
                                    ))}
                                  </select>
                                  {!item.product_id && (
                                    <input
                                      type="text"
                                      value={item.product_name}
                                      onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                                      placeholder="Or enter custom name"
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs mt-1"
                                    />
                                  )}
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="text"
                                    value={item.description}
                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                    placeholder="Additional details"
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                                    min="1"
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-center text-xs"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="number"
                                    value={item.unit_price}
                                    onChange={(e) => handleItemChange(index, 'unit_price', Number(e.target.value))}
                                    step="0.01"
                                    min="0"
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-right text-xs"
                                  />
                                </td>
                                <td className="py-2 px-2 text-right text-xs font-medium">
                                  ${item.subtotal.toFixed(2)}
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <button
                                    onClick={() => handleRemoveItem(index)}
                                    className="text-red-500 hover:text-red-700 transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {quotationItems.length > 0 && (
                      <div className="mt-4 flex justify-end">
                        <div className="w-64 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal:</span>
                            <span>${quotationItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>GST (9%):</span>
                            <span>${(quotationItems.reduce((sum, item) => sum + item.subtotal, 0) * 0.09).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold border-t pt-2" style={{ color: '#5C2E1F' }}>
                            <span>Total:</span>
                            <span>S${calculateTotal().toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                      Notes
                    </label>
                    <textarea
                      value={quotationNotes}
                      onChange={(e) => setQuotationNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Additional notes or terms..."
                    />
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 shrink-0 rounded-b-lg">
                  <button
                    onClick={handleCreateQuotation}
                    disabled={creatingQuotation}
                    className="flex-1 px-4 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: '#FF5722' }}
                  >
                    {creatingQuotation ? 'Creating...' : 'Create Quotation'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetCreateForm();
                    }}
                    className="flex-1 px-4 py-3 rounded-lg border-2 font-medium hover:bg-gray-50 transition-colors"
                    style={{ borderColor: '#5C2E1F', color: '#5C2E1F' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* View Quotation Modal */}
          {showQuotationModal && selectedQuotation && (
            <div className="fixed inset-0 z-50 overflow-auto flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
              <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 shrink-0 rounded-t-lg flex justify-between items-center">
                  <h3 className="text-xl font-bold" style={{ color: '#5C2E1F' }}>
                    Quotation Preview
                  </h3>
                  <button
                    onClick={() => setShowQuotationModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Header Options Selection - Compact */}
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="text-xs font-medium" style={{ color: '#5C2E1F' }}>
                      Header:
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {headerOptions.map((header) => (
                        <label key={header.id} className="flex items-center gap-1 cursor-pointer bg-white px-2 py-1 rounded border border-gray-200 hover:border-orange-300 transition-colors">
                          <input
                            type="radio"
                            name="headerOption"
                            value={header.id}
                            checked={selectedHeaderId === header.id}
                            onChange={() => setSelectedHeaderId(header.id)}
                            className="cursor-pointer accent-orange-500 w-3 h-3"
                          />
                          <span className="text-xs font-medium">{header.option_name}</span>
                          <button
                            onClick={(e) => { e.preventDefault(); handleEditHeaderOption(header); }}
                            className="text-blue-500 hover:text-blue-700 text-xs ml-1 underline"
                          >Edit</button>
                        </label>
                      ))}
                      <button
                        onClick={() => {
                          setEditingHeaderId(null);
                          setHeaderFormData({ option_name: '', line1: '', line2: '', line3: '', line4: '', line5: '', line6: '', line7: '' });
                          setShowHeaderEditor(true);
                        }}
                        className="text-xs px-2 py-1 border border-dashed border-gray-300 rounded hover:border-orange-400 hover:bg-orange-50 transition-colors"
                        style={{ color: '#5C2E1F' }}
                      >+ New Header</button>
                    </div>
                  </div>
                </div>

                {/* A4 Paper Preview - Invoice Style */}
                <div className="flex-1 overflow-auto px-6 py-6" style={{ backgroundColor: '#e5e7eb' }}>
                  <div
                    className="mx-auto bg-white shadow-lg"
                    style={{
                      width: '210mm',
                      minHeight: '297mm',
                      padding: '15mm',
                      position: 'relative',
                      fontFamily: 'Arial, Helvetica, sans-serif',
                    }}
                  >
                    {/* Header Section */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '5px' }}>
                      <div style={{ fontSize: '10pt', lineHeight: '1.5' }}>
                        {(() => {
                          const selectedHeader = headerOptions.find(h => h.id === selectedHeaderId);
                          if (!selectedHeader) return null;
                          return (
                            <>
                              {selectedHeader.line1 && <div style={{ fontWeight: 'bold' }}>{selectedHeader.line1}</div>}
                              {selectedHeader.line2 && <div>{selectedHeader.line2}</div>}
                              {selectedHeader.line3 && <div>{selectedHeader.line3}</div>}
                              {selectedHeader.line4 && <div>{selectedHeader.line4}</div>}
                              {selectedHeader.line5 && <div>{selectedHeader.line5}</div>}
                              {selectedHeader.line6 && <div>{selectedHeader.line6}</div>}
                              {selectedHeader.line7 && <div>{selectedHeader.line7}</div>}
                            </>
                          );
                        })()}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
                        <Image
                          src="/assets/file_logo.png"
                          alt="Company Logo"
                          width={80}
                          height={60}
                          style={{ objectFit: 'contain' }}
                        />
                      </div>
                    </div>

                    {/* Title */}
                    <div style={{ fontSize: '20pt', color: '#0D909A', fontWeight: '300', margin: '5px 0' }}>
                      Quotation
                    </div>

                    {/* Three Column Section */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '18px', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '10pt', fontWeight: 'bold', marginBottom: '5px' }}>TO</div>
                        <div style={{ fontSize: '10pt' }}>
                          <strong>{selectedQuotation.company_name}</strong>
                        </div>
                        <div style={{ fontSize: '10pt', maxWidth: '150px', wordWrap: 'break-word' }}>
                          {selectedQuotation.business_address}
                        </div>
                      </div>

                      <div></div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10pt', marginBottom: '3px' }}>
                          <strong>QUOTATION NO.</strong> {selectedQuotation.quotation_id}
                        </div>
                        <div style={{ fontSize: '10pt' }}>
                          <strong>DATE</strong> {new Date(selectedQuotation.date_created).toLocaleDateString('en-GB')}
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <hr style={{ border: 'none', borderTop: '1px solid #4db8ba', margin: '12px 0' }} />

                    {/* Items Table */}
                    <div style={{ margin: '12px 0' }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1.8fr 0.6fr 0.8fr 0.8fr',
                        background: 'rgba(184, 230, 231, 0.5)',
                        padding: '8px 10px',
                        fontSize: '10pt',
                        fontWeight: 'bold',
                        color: '#4db8ba'
                      }}>
                        <div>PRODUCT / SERVICES</div>
                        <div>DESCRIPTION</div>
                        <div style={{ textAlign: 'center' }}>QTY</div>
                        <div style={{ textAlign: 'right' }}>UNIT PRICE</div>
                        <div style={{ textAlign: 'right' }}>AMOUNT</div>
                      </div>

                      {quotationItemsView.map((item, idx) => (
                        <div key={idx} style={{
                          display: 'grid',
                          gridTemplateColumns: '1.2fr 1.8fr 0.6fr 0.8fr 0.8fr',
                          padding: '6px 10px',
                          fontSize: '10pt'
                        }}>
                          <div>{item.product_name}</div>
                          <div>{item.description || ''}</div>
                          <div style={{ textAlign: 'center' }}>{item.quantity}</div>
                          <div style={{ textAlign: 'right' }}>{item.unit_price.toFixed(2)}</div>
                          <div style={{ textAlign: 'right' }}>{item.subtotal.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    {(() => {
                      const subtotal = quotationItemsView.reduce((sum, item) => sum + item.subtotal, 0);
                      const gst = subtotal * 0.09;
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '35px', marginTop: '10px', paddingTop: '10px', borderTop: '2px dotted #e0e0e0' }}>
                          <div style={{ paddingRight: '18px' }}>
                            {selectedQuotation.notes && (
                              <>
                                <div style={{ fontSize: '10pt', fontWeight: 'bold', marginBottom: '8px' }}>Notes</div>
                                <div style={{ fontSize: '10pt', lineHeight: '1.8', textAlign: 'justify' }}>
                                  {selectedQuotation.notes.split('\n').map((paragraph, idx) => (
                                    paragraph.trim() && (
                                      <p key={idx} style={{ margin: '0 0 8px 0' }}>{paragraph}</p>
                                    )
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '7px 0', fontSize: '10pt' }}>
                              <div style={{ width: '130px', textAlign: 'right', paddingRight: '18px', fontWeight: 'bold' }}>SUBTOTAL</div>
                              <div style={{ width: '90px', textAlign: 'right' }}>{subtotal.toFixed(2)}</div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '7px 0', fontSize: '10pt' }}>
                              <div style={{ width: '130px', textAlign: 'right', paddingRight: '18px', fontWeight: 'bold' }}>GST 9%</div>
                              <div style={{ width: '90px', textAlign: 'right' }}>{gst.toFixed(2)}</div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', fontSize: '10pt' }}>
                              <div style={{ width: '150px', textAlign: 'right', paddingRight: '18px', fontWeight: 'bold' }}>QUOTATION TOTAL</div>
                              <div style={{ width: '90px', textAlign: 'right', fontSize: '16pt', fontWeight: 'bold' }}>${selectedQuotation.total_amount.toFixed(2)}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Footer */}
                    {(() => {
                      const selectedFooter = footerOptions.find(f => f.id === selectedFooterId);
                      return (
                        <div style={{ position: 'absolute', bottom: '15mm', left: '15mm', right: '15mm', textAlign: 'center', fontSize: '10pt', lineHeight: '1.6', fontWeight: 'normal' }}>
                          {selectedFooter?.line1 && <p style={{ margin: '4px 0' }}>{selectedFooter.line1}</p>}
                          {selectedFooter?.line2 && <p style={{ margin: '4px 0' }}>{selectedFooter.line2}</p>}
                          {selectedFooter?.line3 && <p style={{ margin: '4px 0' }}>{selectedFooter.line3}</p>}
                          {selectedFooter?.line4 && <p style={{ margin: '4px 0' }}>{selectedFooter.line4}</p>}
                          {selectedFooter?.line5 && <p style={{ margin: '4px 0' }}>{selectedFooter.line5}</p>}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Footer Options Selection - Compact */}
                <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="text-xs font-medium" style={{ color: '#5C2E1F' }}>
                      Footer:
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Empty Option */}
                      <label className="flex items-center gap-1 cursor-pointer bg-white px-2 py-1 rounded border border-gray-200 hover:border-orange-300 transition-colors">
                        <input
                          type="radio"
                          name="footerOption"
                          value=""
                          checked={selectedFooterId === null}
                          onChange={() => setSelectedFooterId(null)}
                          className="cursor-pointer accent-orange-500 w-3 h-3"
                        />
                        <span className="text-xs font-medium">Empty</span>
                      </label>
                      {footerOptions.map((footer) => (
                        <label key={footer.id} className="flex items-center gap-1 cursor-pointer bg-white px-2 py-1 rounded border border-gray-200 hover:border-orange-300 transition-colors">
                          <input
                            type="radio"
                            name="footerOption"
                            value={footer.id}
                            checked={selectedFooterId === footer.id}
                            onChange={() => setSelectedFooterId(footer.id)}
                            className="cursor-pointer accent-orange-500 w-3 h-3"
                          />
                          <span className="text-xs font-medium">{footer.option_name}</span>
                          <button
                            onClick={(e) => { e.preventDefault(); handleEditFooterOption(footer); }}
                            className="text-blue-500 hover:text-blue-700 text-xs ml-1 underline"
                          >Edit</button>
                        </label>
                      ))}
                      <button
                        onClick={() => {
                          setEditingFooterId(null);
                          setFooterFormData({ option_name: '', line1: '', line2: '', line3: '', line4: '', line5: '' });
                          setShowFooterEditor(true);
                        }}
                        className="text-xs px-2 py-1 border border-dashed border-gray-300 rounded hover:border-orange-400 hover:bg-orange-50 transition-colors"
                        style={{ color: '#5C2E1F' }}
                      >+ New Footer</button>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-3 flex gap-3 shrink-0 rounded-b-lg shadow-lg">
                  <button
                    onClick={handlePrintQuotation}
                    className="flex-1 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#FF5722' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 6 2 18 2 18 9"></polyline>
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                      <rect x="6" y="14" width="12" height="8"></rect>
                    </svg>
                    Print
                  </button>
                  <button
                    onClick={handleDownloadQuotation}
                    className="flex-1 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#4db8ba' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download
                  </button>
                  <button
                    onClick={() => setShowQuotationModal(false)}
                    className="flex-1 px-4 py-2 rounded-lg border-2 font-medium hover:bg-gray-50 transition-colors"
                    style={{ borderColor: '#5C2E1F', color: '#5C2E1F' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success Modal */}
          {showSuccessModal && (
            <div
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              onClick={() => setShowSuccessModal(false)}
            >
              <div
                className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium mb-2" style={{ color: '#5C2E1F' }}>
                    Success!
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    {successMessage}
                  </p>
                  <button
                    onClick={() => setShowSuccessModal(false)}
                    className="w-full px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#FF5722' }}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirmModal && (
            <div
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              onClick={() => setShowDeleteConfirmModal(false)}
            >
              <div
                className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-medium mb-2" style={{ color: '#5C2E1F' }}>
                    Confirm Delete
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Are you sure you want to delete {selectedQuotationIds.length} quotation{selectedQuotationIds.length === 1 ? '' : 's'}? This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteConfirmModal(false)}
                      className="flex-1 px-4 py-2 rounded-lg border-2 font-medium hover:bg-gray-50 transition-colors"
                      style={{ borderColor: '#5C2E1F', color: '#5C2E1F' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDeleteQuotations}
                      disabled={loading}
                      className="flex-1 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                      style={{ backgroundColor: '#dc2626' }}
                    >
                      {loading ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Edit Quotation Modal */}
          {showEditModal && editingQuotation && (
            <div className="fixed inset-0 z-50 overflow-auto flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
              <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 shrink-0 rounded-t-lg flex justify-between items-center">
                  <h3 className="text-xl font-bold" style={{ color: '#5C2E1F' }}>
                    Edit Quotation - {editingQuotation.quotation_id}
                  </h3>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingQuotation(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-6 space-y-6">
                  {/* Company Name */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={editCompanyName}
                      onChange={(e) => setEditCompanyName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Business Address */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                      Business Address
                    </label>
                    <textarea
                      value={editBusinessAddress}
                      onChange={(e) => setEditBusinessAddress(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Quotation Items */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium" style={{ color: '#5C2E1F' }}>
                        Quotation Items
                      </label>
                      <button
                        onClick={handleAddEditItem}
                        className="flex items-center gap-1 text-sm px-3 py-1 rounded border border-orange-500 text-orange-500 hover:bg-orange-50 transition-colors"
                      >
                        <Plus size={16} />
                        Add Item
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2" style={{ borderColor: '#5C2E1F' }}>
                            <th className="text-left py-2 px-2 font-bold text-xs w-[25%]">PRODUCT</th>
                            <th className="text-left py-2 px-2 font-bold text-xs w-[20%]">DESCRIPTION</th>
                            <th className="text-center py-2 px-2 font-bold text-xs w-[12%]">QTY</th>
                            <th className="text-right py-2 px-2 font-bold text-xs w-[15%]">UNIT PRICE</th>
                            <th className="text-right py-2 px-2 font-bold text-xs w-[15%]">SUBTOTAL</th>
                            <th className="text-center py-2 px-2 font-bold text-xs w-[8%]">ACTION</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editQuotationItems.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center py-8 text-gray-400">
                                No items. Click &quot;Add Item&quot; to add.
                              </td>
                            </tr>
                          ) : (
                            editQuotationItems.map((item, index) => (
                              <tr key={index} className="border-b border-gray-200">
                                <td className="py-2 px-2">
                                  <select
                                    value={item.product_id || ''}
                                    onChange={(e) => {
                                      const productId = e.target.value ? Number(e.target.value) : null;
                                      handleEditItemChange(index, 'product_id', productId);
                                      if (productId) {
                                        const product = products.find(p => p.id === productId);
                                        if (product) {
                                          const updatedItems = [...editQuotationItems];
                                          updatedItems[index].product_name = product.product_name;
                                          updatedItems[index].unit_price = product.product_price;
                                          updatedItems[index].subtotal = product.product_price * updatedItems[index].quantity;
                                          setEditQuotationItems(updatedItems);
                                        }
                                      }
                                    }}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                  >
                                    <option value="">-- Select or type --</option>
                                    {products.map((product) => (
                                      <option key={product.id} value={product.id}>
                                        {product.product_name}
                                      </option>
                                    ))}
                                  </select>
                                  {!item.product_id && (
                                    <input
                                      type="text"
                                      value={item.product_name}
                                      onChange={(e) => handleEditItemChange(index, 'product_name', e.target.value)}
                                      placeholder="Or enter custom name"
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs mt-1"
                                    />
                                  )}
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="text"
                                    value={item.description || ''}
                                    onChange={(e) => handleEditItemChange(index, 'description', e.target.value)}
                                    placeholder="Additional details"
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => handleEditItemChange(index, 'quantity', Number(e.target.value))}
                                    min="1"
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-center text-xs"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="number"
                                    value={item.unit_price}
                                    onChange={(e) => handleEditItemChange(index, 'unit_price', Number(e.target.value))}
                                    step="0.01"
                                    min="0"
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-right text-xs"
                                  />
                                </td>
                                <td className="py-2 px-2 text-right text-xs font-medium">
                                  ${item.subtotal.toFixed(2)}
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <button
                                    onClick={() => handleRemoveEditItem(index)}
                                    className="text-red-500 hover:text-red-700 transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {editQuotationItems.length > 0 && (
                      <div className="mt-4 flex justify-end">
                        <div className="w-64 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal:</span>
                            <span>${editQuotationItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>GST (9%):</span>
                            <span>${(editQuotationItems.reduce((sum, item) => sum + item.subtotal, 0) * 0.09).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold border-t pt-2" style={{ color: '#5C2E1F' }}>
                            <span>Total:</span>
                            <span>S${calculateEditTotal().toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                      Notes
                    </label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Additional notes or terms..."
                    />
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 shrink-0 rounded-b-lg">
                  <button
                    onClick={handleSaveEdit}
                    disabled={loading}
                    className="flex-1 px-4 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: '#FF5722' }}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingQuotation(null);
                    }}
                    className="flex-1 px-4 py-3 rounded-lg border-2 font-medium hover:bg-gray-50 transition-colors"
                    style={{ borderColor: '#5C2E1F', color: '#5C2E1F' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Action Toast for Selected Rows - Center Bottom */}
          {selectedQuotationIds.length > 0 && (
            <div
              style={{
                position: "fixed",
                bottom: "30px",
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: "#4A5568",
                color: "white",
                padding: "8px 16px",
                borderRadius: "6px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                zIndex: 9999,
                minWidth: "auto",
              }}
            >
              <button
                onClick={() => setSelectedQuotationIds([])}
                className="text-white hover:text-gray-300 transition-colors"
                aria-label="Close"
                style={{ padding: "2px" }}
              >
                <X size={16} />
              </button>

              <div
                style={{
                  width: "1px",
                  height: "20px",
                  backgroundColor: "rgba(255, 255, 255, 0.3)",
                }}
              ></div>

              <span className="text-sm" style={{ minWidth: "100px" }}>
                {selectedQuotationIds.length} item{selectedQuotationIds.length === 1 ? "" : "s"} selected
              </span>

              <div
                style={{
                  width: "1px",
                  height: "20px",
                  backgroundColor: "rgba(255, 255, 255, 0.3)",
                }}
              ></div>

              {selectedQuotationIds.length === 1 && (
                <>
                  <button
                    onClick={handleEditSelected}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-white hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ padding: "2px 6px" }}
                  >
                    <Edit2 size={16} />
                    <span className="text-sm">Edit</span>
                  </button>

                  <div
                    style={{
                      width: "1px",
                      height: "20px",
                      backgroundColor: "rgba(255, 255, 255, 0.3)",
                    }}
                  ></div>
                </>
              )}

              <button
                onClick={handleDeleteSelected}
                disabled={loading}
                className="flex items-center gap-1.5 text-white hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ padding: "2px 6px" }}
              >
                <Trash2 size={16} />
                <span className="text-sm">Delete</span>
              </button>
            </div>
          )}

          {/* Header Editor Modal */}
          {showHeaderEditor && (
            <div className="fixed inset-0 flex items-center justify-center z-[60] p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={() => setShowHeaderEditor(false)}>
              <div className="bg-white rounded-lg max-w-lg w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
                  <h3 className="text-lg font-bold" style={{ color: '#5C2E1F' }}>{editingHeaderId ? 'Edit Header' : 'New Header'}</h3>
                  <div className="flex items-center gap-2">
                    {editingHeaderId && (
                      <button onClick={() => handleDeleteHeaderOption(editingHeaderId)} className="text-red-600 hover:text-red-800 text-xs px-2 py-1 border border-red-300 rounded">Delete</button>
                    )}
                    <button onClick={() => setShowHeaderEditor(false)} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#5C2E1F' }}>Option Name *</label>
                    <input type="text" value={headerFormData.option_name} onChange={(e) => setHeaderFormData({ ...headerFormData, option_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g., Momolato Pte Ltd" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#5C2E1F' }}>Line 1 (Company Name)</label>
                    <input type="text" value={headerFormData.line1} onChange={(e) => setHeaderFormData({ ...headerFormData, line1: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#5C2E1F' }}>Line 2</label>
                    <input type="text" value={headerFormData.line2} onChange={(e) => setHeaderFormData({ ...headerFormData, line2: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#5C2E1F' }}>Line 3</label>
                    <input type="text" value={headerFormData.line3} onChange={(e) => setHeaderFormData({ ...headerFormData, line3: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#5C2E1F' }}>Line 4</label>
                    <input type="text" value={headerFormData.line4} onChange={(e) => setHeaderFormData({ ...headerFormData, line4: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#5C2E1F' }}>Line 5</label>
                    <input type="text" value={headerFormData.line5} onChange={(e) => setHeaderFormData({ ...headerFormData, line5: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#5C2E1F' }}>Line 6</label>
                    <input type="text" value={headerFormData.line6} onChange={(e) => setHeaderFormData({ ...headerFormData, line6: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#5C2E1F' }}>Line 7</label>
                    <input type="text" value={headerFormData.line7} onChange={(e) => setHeaderFormData({ ...headerFormData, line7: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                </div>
                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-2">
                  <button onClick={handleSaveHeaderOption} className="flex-1 px-3 py-2 text-white rounded text-sm font-medium hover:opacity-90" style={{ backgroundColor: '#FF5722' }}>{editingHeaderId ? 'Update' : 'Create'}</button>
                  <button onClick={() => setShowHeaderEditor(false)} className="flex-1 px-3 py-2 border rounded text-sm font-medium hover:bg-gray-50" style={{ borderColor: '#5C2E1F', color: '#5C2E1F' }}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Footer Editor Modal */}
          {showFooterEditor && (
            <div className="fixed inset-0 flex items-center justify-center z-[60] p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={() => setShowFooterEditor(false)}>
              <div className="bg-white rounded-lg max-w-lg w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
                  <h3 className="text-lg font-bold" style={{ color: '#5C2E1F' }}>{editingFooterId ? 'Edit Footer' : 'New Footer'}</h3>
                  <div className="flex items-center gap-2">
                    {editingFooterId && (
                      <button onClick={() => handleDeleteFooterOption(editingFooterId)} className="text-red-600 hover:text-red-800 text-xs px-2 py-1 border border-red-300 rounded">Delete</button>
                    )}
                    <button onClick={() => setShowFooterEditor(false)} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#5C2E1F' }}>Option Name *</label>
                    <input type="text" value={footerFormData.option_name} onChange={(e) => setFooterFormData({ ...footerFormData, option_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g., Standard Footer" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#5C2E1F' }}>Line 1</label>
                    <input type="text" value={footerFormData.line1} onChange={(e) => setFooterFormData({ ...footerFormData, line1: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#5C2E1F' }}>Line 2</label>
                    <input type="text" value={footerFormData.line2} onChange={(e) => setFooterFormData({ ...footerFormData, line2: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#5C2E1F' }}>Line 3</label>
                    <input type="text" value={footerFormData.line3} onChange={(e) => setFooterFormData({ ...footerFormData, line3: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#5C2E1F' }}>Line 4</label>
                    <input type="text" value={footerFormData.line4} onChange={(e) => setFooterFormData({ ...footerFormData, line4: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#5C2E1F' }}>Line 5</label>
                    <input type="text" value={footerFormData.line5} onChange={(e) => setFooterFormData({ ...footerFormData, line5: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                </div>
                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-2">
                  <button onClick={handleSaveFooterOption} className="flex-1 px-3 py-2 text-white rounded text-sm font-medium hover:opacity-90" style={{ backgroundColor: '#FF5722' }}>{editingFooterId ? 'Update' : 'Create'}</button>
                  <button onClick={() => setShowFooterEditor(false)} className="flex-1 px-3 py-2 border rounded text-sm font-medium hover:bg-gray-50" style={{ borderColor: '#5C2E1F', color: '#5C2E1F' }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
