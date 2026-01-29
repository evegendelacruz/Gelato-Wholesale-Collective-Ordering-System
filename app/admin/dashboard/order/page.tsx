'use client';
import Sidepanel from '@/app/components/sidepanel/page';
import Header from '@/app/components/header/page';
import supabase from '@/lib/client';
import ClientInvoice from '@/app/components/clientInvoice';
import ClientOrderModal from '@/app/components/clientOrderModal/page';
import LabelGenerator from '@/app/components/orderLabel/page';
import EditOrderModal from '@/app/components/editOrder/page';
import { useState, useEffect, Fragment } from 'react';
import { Search, Filter, Plus, X, Check, ChevronDown } from 'lucide-react';

interface Order {
  id: number;
  order_id: string;
  client_auth_id: string;
  order_date: string;
  delivery_date: string;
  delivery_address: string;
  total_amount: number;
  status: string;
  notes: string | null;
  invoice_id: string;
  tracking_no: string;
  created_at: string;
  updated_at: string;
  company_name: string;
}

interface SupabaseOrderResponse {
  id: number;
  order_id: string;
  client_auth_id: string;
  order_date: string;
  delivery_date: string;
  delivery_address: string;
  total_amount: number;
  status: string;
  notes: string | null;
  invoice_id: string;
  tracking_no: string;
  created_at: string;
  updated_at: string;
  client_user?: { client_businessName?: string } | Array<{ client_businessName?: string }>;
}

export default function OrderPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const itemsPerPage = 10;
  const [updatingStatus, setUpdatingStatus] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [clientData, setClientData] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [rowOrderItems, setRowOrderItems] = useState({});
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [sortBy, setSortBy] = useState('order_date_desc'); 
  const [filterStatus, setFilterStatus] = useState('all');
  const [showLabelGenerator, setShowLabelGenerator] = useState(false);
  const [selectedOrderItems, setSelectedOrderItems] = useState([]);
  const [selectedClientData, setSelectedClientData] = useState(null);
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleteSuccessOpen, setIsDeleteSuccessOpen] = useState(false);
  const [isEditSuccessOpen, setIsEditSuccessOpen] = useState(false);
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [headerOptions, setHeaderOptions] = useState([]);
  const [selectedHeaderId, setSelectedHeaderId] = useState(null);
  const [showHeaderEditor, setShowHeaderEditor] = useState(false);
  const [editingHeaderId, setEditingHeaderId] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [headerToDelete, setHeaderToDelete] = useState(null);
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  const [headerToEdit, setHeaderToEdit] = useState(null);
  const [footerOptions, setFooterOptions] = useState<
      Array<{
        id: number;
        option_name: string;
        line1: string;
        line2: string;
        line3: string;
        line4: string;
        line5: string;
        is_default: boolean;
      }>
    >([]);
  const [selectedFooterId, setSelectedFooterId] = useState<number | null>(null);
  const [showFooterEditor, setShowFooterEditor] = useState(false);
  const [editingFooterId, setEditingFooterId] = useState<number | null>(null);
  const [footerFormData, setFooterFormData] = useState({
    option_name: "",
    line1: "",
    line2: "",
    line3: "",
    line4: "",
    line5: "",
  });
  const [showFooterDeleteConfirmModal, setShowFooterDeleteConfirmModal] = useState(false);
  const [footerToDelete, setFooterToDelete] = useState<number | null>(null);
  const [showFooterEditConfirmModal, setShowFooterEditConfirmModal] = useState(false);
  const [footerToEdit, setFooterToEdit] = useState<{
    id: number;
    option_name: string;
    line1: string;
    line2: string;
    line3: string;
    line4: string;
    line5: string;
    is_default: boolean;
  } | null>(null);
  const [headerFormData, setHeaderFormData] = useState({
  option_name: '',
  line1: '',
  line2: '',
  line3: '',
  line4: '',
  line5: '',
  line6: '',
  line7: '',
});
  
  const toggleRowExpansion = (orderId) => {
  setExpandedRows(prev => ({
    ...prev,
    [orderId]: !prev[orderId]
  }));
};

// Fetch header options
useEffect(() => {
  const fetchHeaderOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('header_options')
        .select('*')
        .order('is_default', { ascending: false });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setHeaderOptions(data);
        // Set the default header as selected
        const defaultHeader = data.find(h => h.is_default) || data[0];
        setSelectedHeaderId(defaultHeader.id);
      }
    } catch (error) {
      console.error('Error fetching header options:', error);
    }
  };

  fetchHeaderOptions();
}, []);

useEffect(() => {
  const fetchFooterOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("footer_options")
        .select("*")
        .order("is_default", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setFooterOptions(data);
        const defaultFooter = data.find((f) => f.is_default) || data[0];
        setSelectedFooterId(defaultFooter.id);
      }
    } catch (error) {
      console.error("Error fetching footer options:", error);
    }
  };

  fetchFooterOptions();
}, []);

// Add this new useEffect to check for date filter from calendar
useEffect(() => {
  const filterDate = sessionStorage.getItem('filterDeliveryDate');
  if (filterDate) {
    setSearchQuery(filterDate); // Use search query to filter by date
    // Clear the sessionStorage after applying the filter
    sessionStorage.removeItem('filterDeliveryDate');
  }
}, []);

useEffect(() => {
  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      console.log('Fetching orders from client_order table...');
      
      // Fetch all orders with client information using client_auth_id
      const { data, error: supabaseError } = await supabase
        .from('client_order')
        .select(`
          id,
          order_id,
          client_auth_id,
          order_date,
          delivery_date,
          delivery_address,
          total_amount,
          status,
          notes,
          invoice_id,
          tracking_no,
          created_at,
          updated_at,
          client_user!client_order_client_auth_id_fkey(client_businessName)
        `)
        .order('order_date', { ascending: false });

      console.log('Response:', { data, error: supabaseError });

      if (supabaseError) {
        throw new Error(`${supabaseError.message} (Code: ${supabaseError.code})`);
      }

      if (!data) {
        console.warn('No data returned from the database');
        setOrders([]);
      } else {
        console.log(`Successfully fetched ${data.length} orders`);
        // Flatten the nested client_user data - handle both array and object cases
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ordersWithCompany = data.map((order: any) => {
          let companyName = 'N/A';
          
          if (order.client_user) {
            if (Array.isArray(order.client_user)) {
              companyName = order.client_user[0]?.client_businessName || 'N/A';
            } else {
              companyName = order.client_user.client_businessName || 'N/A';
            }
          }
          
          return {
            ...order,
            company_name: companyName
          };
        });
        setOrders(ordersWithCompany);
      }
      
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching orders';
      setError(errorMessage);
      console.error('Error fetching orders:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  fetchOrders();
}, []);

  const filteredOrders = orders.filter(order => {
  const searchLower = searchQuery.toLowerCase();
  
  // Format delivery_date to match YYYY-MM-DD for comparison
  const deliveryDateStr = order.delivery_date ? new Date(order.delivery_date).toISOString().split('T')[0] : '';
  
  const matchesSearch = (
    order.order_id?.toString().toLowerCase().includes(searchLower) ||
    order.delivery_address?.toLowerCase().includes(searchLower) ||
    order.status?.toLowerCase().includes(searchLower) ||
    order.tracking_no?.toLowerCase().includes(searchLower) ||
    order.company_name?.toLowerCase().includes(searchLower) ||
    deliveryDateStr.includes(searchQuery) // Check if delivery date matches the search
  );

  // Apply status filter
  const matchesFilter = filterStatus === 'all' || 
    order.status?.toLowerCase() === filterStatus.toLowerCase();

  return matchesSearch && matchesFilter;
}).sort((a, b) => {
  // Apply sorting
  switch (sortBy) {
    case 'order_date_desc':
      return new Date(b.order_date).getTime() - new Date(a.order_date).getTime();
    case 'order_date_asc':
      return new Date(a.order_date).getTime() - new Date(b.order_date).getTime();
    case 'delivery_date_desc':
      return new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime();
    case 'delivery_date_asc':
      return new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime();
    case 'amount_desc':
      return (b.total_amount || 0) - (a.total_amount || 0);
    case 'amount_asc':
      return (a.total_amount || 0) - (b.total_amount || 0);
    case 'order_id_asc':
      return (a.order_id || '').localeCompare(b.order_id || '');
    case 'order_id_desc':
      return (b.order_id || '').localeCompare(a.order_id || '');
    case 'company_asc':
      return (a.company_name || '').localeCompare(b.company_name || '');
    case 'company_desc':
      return (b.company_name || '').localeCompare(a.company_name || '');
    default:
      return 0;
  }
});

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  const handleSaveFooterOption = async () => {
    try {
      if (!footerFormData.option_name.trim()) {
        setWarningMessage("Please enter an option name");
        setShowWarningModal(true);
        return;
      }

      if (editingFooterId) {
        const { error } = await supabase
          .from("footer_options")
          .update({
            option_name: footerFormData.option_name,
            line1: footerFormData.line1,
            line2: footerFormData.line2,
            line3: footerFormData.line3,
            line4: footerFormData.line4,
            line5: footerFormData.line5,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingFooterId);

        if (error) throw error;

        const { data: updatedData } = await supabase
          .from("footer_options")
          .select("*")
          .order("is_default", { ascending: false });

        if (updatedData) {
          setFooterOptions(updatedData);
        }

        setSuccessMessage("Footer option updated successfully!");
      } else {
        const { data, error } = await supabase
          .from("footer_options")
          .insert([
            {
              option_name: footerFormData.option_name,
              line1: footerFormData.line1,
              line2: footerFormData.line2,
              line3: footerFormData.line3,
              line4: footerFormData.line4,
              line5: footerFormData.line5,
              is_default: false,
            },
          ])
          .select();

        if (error) throw error;

        const { data: updatedData } = await supabase
          .from("footer_options")
          .select("*")
          .order("is_default", { ascending: false });

        if (updatedData) {
          setFooterOptions(updatedData);
          if (data && data[0]) {
            setSelectedFooterId(data[0].id);
          }
        }

        setSuccessMessage("Footer option created successfully!");
      }

      setShowSuccessModal(true);
      setShowFooterEditor(false);
      setEditingFooterId(null);
      setFooterFormData({
        option_name: "",
        line1: "",
        line2: "",
        line3: "",
        line4: "",
        line5: "",
      });
    } catch (error) {
      console.error("Error saving footer option:", error);
      setWarningMessage("Failed to save footer option");
      setShowWarningModal(true);
    }
  };

  const handleEditFooterOption = (footer: {
    id: number;
    option_name: string;
    line1: string;
    line2: string;
    line3: string;
    line4: string;
    line5: string;
    is_default: boolean;
  }) => {
    setFooterToEdit(footer);
    setShowFooterEditConfirmModal(true);
  };

  const handleDeleteFooterOption = async (footerId: number) => {
    setFooterToDelete(footerId);
    setShowFooterDeleteConfirmModal(true);
  };

  const handleSaveHeaderOption = async () => {
  try {
    if (!headerFormData.option_name.trim()) {
      setWarningMessage('Please enter an option name');
      setShowWarningModal(true);
      return;
    }

    if (editingHeaderId) {
      const { error } = await supabase
        .from('header_options')
        .update({
          option_name: headerFormData.option_name,
          line1: headerFormData.line1,
          line2: headerFormData.line2,
          line3: headerFormData.line3,
          line4: headerFormData.line4,
          line5: headerFormData.line5,
          line6: headerFormData.line6,
          line7: headerFormData.line7,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingHeaderId);

      if (error) throw error;

      const { data: updatedData } = await supabase
        .from('header_options')
        .select('*')
        .order('is_default', { ascending: false });
      
      if (updatedData) {
        setHeaderOptions(updatedData);
      }

      setSuccessMessage('Header option updated successfully!');
    } else {
      const { data, error } = await supabase
        .from('header_options')
        .insert([{
          option_name: headerFormData.option_name,
          line1: headerFormData.line1,
          line2: headerFormData.line2,
          line3: headerFormData.line3,
          line4: headerFormData.line4,
          line5: headerFormData.line5,
          line6: headerFormData.line6,
          line7: headerFormData.line7,
          is_default: false
        }])
        .select();

      if (error) throw error;

      const { data: updatedData } = await supabase
        .from('header_options')
        .select('*')
        .order('is_default', { ascending: false });
      
      if (updatedData) {
        setHeaderOptions(updatedData);
        if (data && data[0]) {
          setSelectedHeaderId(data[0].id);
        }
      }

      setSuccessMessage('Header option created successfully!');
    }

    setShowSuccessModal(true);
    setShowHeaderEditor(false);
    setEditingHeaderId(null);
    setHeaderFormData({
      option_name: '',
      line1: '',
      line2: '',
      line3: '',
      line4: '',
      line5: '',
      line6: '',
      line7: '',
    });
  } catch (error) {
    console.error('Error saving header option:', error);
    setWarningMessage('Failed to save header option');
    setShowWarningModal(true);
  }
};

const handleEditHeaderOption = (header) => {
  setEditingHeaderId(header.id);
  setShowEditConfirmModal(true);
  setHeaderFormData({
    option_name: header.option_name,
    line1: header.line1 || '',
    line2: header.line2 || '',
    line3: header.line3 || '',
    line4: header.line4 || '',
    line5: header.line5 || '',
    line6: header.line6 || '',
    line7: header.line7 || '',
  });
  setShowHeaderEditor(true);
};

const handleDeleteHeaderOption = async (headerId) => {
  setHeaderToDelete(headerId);
  setShowDeleteConfirmModal(true);
};

const renderHeaderInPDF = (doc, selectedHeader) => {
  if (!selectedHeader) return;

  doc.setFontSize(10);
  let yPos = 20;
  const lineHeight = 5;

  // Line 1 - Bold
  if (selectedHeader.line1) {
    doc.setFont('helvetica', 'bold');
    doc.text(selectedHeader.line1, 20, yPos);
    yPos += lineHeight;
  }

  // Lines 2-7 - Normal
  doc.setFont('helvetica', 'normal');
  const lines = [
    selectedHeader.line2,
    selectedHeader.line3,
    selectedHeader.line4,
    selectedHeader.line5,
    selectedHeader.line6,
    selectedHeader.line7,
  ];

  lines.forEach(line => {
    if (line) {
      doc.text(line, 20, yPos);
      yPos += lineHeight;
    }
  });
};

const renderFooterInPDF = (doc, selectedFooter) => {
  if (!selectedFooter) return;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  let footerY = 275;
  const lineHeight = 4;

  const lines = [
    selectedFooter.line1,
    selectedFooter.line2,
    selectedFooter.line3,
    selectedFooter.line4,
    selectedFooter.line5,
  ];

  lines.forEach((line) => {
    if (line) {
      doc.text(line, 105, footerY, { align: "center" });
      footerY += lineHeight;
    }
  });
};

  const handleSelectAll = (checked: boolean) => {
  if (checked) {
    const allIds = new Set(currentOrders.map(order => order.id));
    setSelectedRows(allIds);
  } else {
    setSelectedRows(new Set());
  }
};

const handleSelectRow = (orderId: number, checked: boolean) => {
  const newSelected = new Set(selectedRows);
  if (checked) {
    newSelected.add(orderId);
  } else {
    newSelected.delete(orderId);
  }
  setSelectedRows(newSelected);
};

const handleEdit = () => {
  const orderId = Array.from(selectedRows)[0];
  const order = orders.find(o => o.id === orderId);
  if (order) {
    setSelectedOrder(order);
    setShowEditOrderModal(true);
  }
};

const handleDelete = async () => {
  try {
    setLoading(true);
    const idsToDelete = Array.from(selectedRows);
    
    // Delete orders and their related items
    const { error: itemsError } = await supabase
      .from('client_order_item')
      .delete()
      .in('order_id', idsToDelete);
    
    if (itemsError) throw itemsError;
    
    const { error: ordersError } = await supabase
      .from('client_order')
      .delete()
      .in('id', idsToDelete);
    
    if (ordersError) throw ordersError;
    
    // Refresh orders list
    const { data, error: fetchError } = await supabase
      .from('client_order')
      .select(`
        id,
        order_id,
        client_auth_id,
        order_date,
        delivery_date,
        delivery_address,
        total_amount,
        status,
        notes,
        invoice_id,
        tracking_no,
        created_at,
        updated_at,
        client_user!client_order_client_auth_id_fkey(client_businessName)
      `)
      .order('order_date', { ascending: false });

    if (!fetchError && data) {
      const ordersWithCompany = data.map((order: SupabaseOrderResponse): Order => {
        let companyName = 'N/A';
        if (order.client_user) {
          if (Array.isArray(order.client_user)) {
            companyName = order.client_user[0]?.client_businessName || 'N/A';
          } else {
            companyName = order.client_user.client_businessName || 'N/A';
          }
        }
        return { ...order, company_name: companyName };
      });
      setOrders(ordersWithCompany);
    }
    
    setSelectedRows(new Set());
    setIsDeleteConfirmOpen(false);
    setIsDeleteSuccessOpen(true);
    
  } catch (error) {
    console.error('Error deleting orders:', error);
    alert('Failed to delete order(s). Please try again.');
  } finally {
    setLoading(false);
  }
};

  const handleGenerateLabels = async (order) => {
  try {
    // Fetch order items with product details including ingredients and allergen
    const { data: items, error: fetchError } = await supabase
      .from('client_order_item')
      .select(`
        *,
        product_list(
          product_ingredient,
          product_allergen
        )
      `)
      .eq('order_id', order.id);

    if (fetchError) {
      console.error('Error fetching order items:', fetchError);
      throw fetchError;
    }

    console.log('Fetched items:', items);

    // Helper function to convert PostgreSQL date to DD/MM/YYYY
    const formatDateDisplay = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // Map items to include product details at root level
    const itemsWithDetails = items?.map(item => {
      // Handle both array and object responses from Supabase
      let productIngredients = 'Ingredients not available';
      let productAllergen = 'Our products are crafted in a facility that also processes dairy, gluten, and nuts.';

      if (item.product_list) {
        if (Array.isArray(item.product_list)) {
          productIngredients = item.product_list[0]?.product_ingredient || productIngredients;
          productAllergen = item.product_list[0]?.product_allergen || productAllergen;
        } else {
          productIngredients = item.product_list.product_ingredient || productIngredients;
          productAllergen = item.product_list.product_allergen || productAllergen;
        }
      }

      return {
        ...item,
        // Use saved label data if available, otherwise fall back to product data
        ingredients: item.label_ingredients || productIngredients,
        allergen: item.label_allergens || productAllergen,
        bestBefore: item.best_before ? formatDateDisplay(item.best_before) : '',
        batchNumber: item.batch_number ? String(item.batch_number) : '',
        order_date: order.order_date
      };
    }) || [];

    console.log('Items with details:', itemsWithDetails);

    // Fetch client data
    const { data: client, error: clientError } = await supabase
      .from('client_user')
      .select('client_businessName, client_delivery_address')
      .eq('client_auth_id', order.client_auth_id)
      .single();

    if (clientError) {
      console.error('Error fetching client data:', clientError);
      throw clientError;
    }

    if (itemsWithDetails.length === 0) {
      alert('No items found for this order');
      return;
    }

    setSelectedOrderItems(itemsWithDetails);
    setSelectedClientData(client);
    setShowLabelGenerator(true);
  } catch (error) {
    console.error('Error loading data for labels:', error);
    alert('Failed to load order data: ' + (error.message || 'Unknown error'));
  }
};

  const handleRowExpand = async (order) => {
    // If already expanded, just toggle
    if (expandedRows[order.id]) {
      toggleRowExpansion(order.id);
      return;
    }

    // Fetch order items if not already fetched
    if (!rowOrderItems[order.id]) {
      try {
        const { data: items } = await supabase
          .from('client_order_item')
          .select(`
            *,
            product_list!client_order_item_product_id_fkey(
              product_type,
              product_name,
              product_weight
            )
          `)
          .eq('order_id', order.id);

        // Map items to include product details at root level
        const itemsWithType = items?.map(item => ({
          ...item,
          product_type: item.product_list?.product_type || 'N/A',
          // Use product_name from product_list, fallback to stored product_name
          display_product_name: item.product_list?.product_name || item.product_name,
          // Calculate weight: product_weight * quantity
          calculated_weight: item.calculated_weight || 
            (item.product_list?.product_weight ? 
              (Number(item.product_list.product_weight) * Number(item.quantity)).toFixed(2) : 
              '-')
        })) || [];

        setRowOrderItems(prev => ({
          ...prev,
          [order.id]: itemsWithType
        }));
      } catch (error) {
        console.error('Error fetching order items:', error);
      }
    }

    toggleRowExpansion(order.id);
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
  try {
    setUpdatingStatus(prev => ({ ...prev, [orderId]: true }));
    
    const { error: updateError } = await supabase
      .from('client_order')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (updateError) throw updateError;

    // Update local state
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  } catch (err) {
    console.error('Error updating status:', err);
    alert('Failed to update status');
  } finally {
    setUpdatingStatus(prev => ({ ...prev, [orderId]: false }));
  }
};

const handlePrintInvoice = async () => {
  if (!selectedOrder || !clientData) return;
  
  try {
    const jsPDF = (await import('jspdf')).default;
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const subtotal = getSubtotal(orderItems);
    const gst = getGST(orderItems);

    doc.setFont('helvetica');

    const selectedHeader = headerOptions.find(h => h.id === selectedHeaderId);
    renderHeaderInPDF(doc, selectedHeader);

    // Title
    doc.setFontSize(16);
    doc.setTextColor("#0D909A");
    doc.text('Invoice', 20, 57);
    doc.setTextColor(0, 0, 0);

    // Bill To, Ship To, Invoice Details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO', 20, 67);
    doc.setFont('helvetica', 'normal');
    doc.text(clientData.client_businessName || 'N/A', 20, 72);
    const billAddress = doc.splitTextToSize(clientData.client_billing_address || 'N/A', 45);
    doc.text(billAddress, 20, 77);

    doc.setFont('helvetica', 'bold');
    doc.text('SHIP TO', 75, 67);
    doc.setFont('helvetica', 'normal');
    doc.text(clientData.client_businessName || 'N/A', 75, 72);
    const shipAddressParts = [
      clientData.ad_streetName,
      clientData.ad_country,
      clientData.ad_postal
    ].filter(Boolean).join(', ') || selectedOrder.delivery_address || 'N/A';
    const shipAddress = doc.splitTextToSize(shipAddressParts, 45);
    doc.text(shipAddress, 75, 77);

    // Invoice Details
    const labelX = 155;
    const valueX = 157;
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE NO.', labelX, 67, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(selectedOrder.invoice_id, valueX, 67);

    doc.setFont('helvetica', 'bold');
    doc.text('DATE', labelX, 72, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(selectedOrder.delivery_date), valueX, 72);

    doc.setFont('helvetica', 'bold');
    doc.text('DUE DATE', labelX, 77, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(selectedOrder.delivery_date), valueX, 77);

    doc.setFont('helvetica', 'bold');
    doc.text('TERMS', labelX, 82, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text('Due on receipt', valueX, 82);

    // Horizontal line
    doc.setDrawColor(77, 184, 186);
    doc.line(20, 87, 190, 87);

    // Shipping info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SHIP DATE', 20, 93);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(selectedOrder.delivery_date), 20, 98);
    doc.setFont('helvetica', 'bold');
    doc.text('TRACKING NO.', 100, 93);
    doc.setFont('helvetica', 'normal');
    doc.text(selectedOrder.tracking_no, 100, 98);

    // Table Header
    const tableStartY = 104;
    doc.setFillColor(184, 230, 231);
    doc.rect(20, tableStartY, 170, 8, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setTextColor("#0D909A");
    doc.setFontSize(9);
    doc.text('PRODUCT /', 22, tableStartY + 3);
    doc.text('SERVICES', 22, tableStartY + 6);
    doc.text('DESCRIPTION', 60, tableStartY + 5);
    doc.text('QTY', 150, tableStartY + 5, { align: 'center' });
    doc.text('UNIT', 168, tableStartY + 3, { align: 'right' });
    doc.text('PRICE', 168, tableStartY + 6, { align: 'right' });
    doc.text('AMOUNT', 185, tableStartY + 5, { align: 'right' });

    // Table Rows
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    let yPos = tableStartY + 13;

    orderItems.forEach((item) => {
      const productText = `${item.product_type || item.product_name}`;
      
      doc.setFont('helvetica', 'bold');
      const productLines = doc.splitTextToSize(productText, 30);
      const descriptionText = item.product_billingName || productText;
      doc.text(productLines, 22, yPos);
      
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(descriptionText, 50);
      doc.text(descLines, 60, yPos);
      
      const maxLines = Math.max(productLines.length, descLines.length);
      const centerY = yPos + ((maxLines - 1) * 4) / 2;
      
      doc.text(item.quantity.toString(), 150, centerY, { align: 'center' });
      doc.text(item.unit_price.toFixed(2), 168, centerY, { align: 'right' });
      doc.text(item.subtotal.toFixed(2), 185, centerY, { align: 'right' });
      
      yPos += (maxLines * 4) + 1;
    });

    doc.setDrawColor('#e0e0e0');
    doc.setLineWidth(0.2);
    for (let i = 20; i < 190; i += 1.5) {
      doc.line(i, yPos + 2, i + 0.75, yPos + 2);
    }

    // Terms & Conditions
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.text('Terms & Conditions', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const terms1 = doc.splitTextToSize(
      'We acknowledge that the above goods are received in good condition. Please inform us of any issues within 24 hours. Otherwise, kindly note no return or refunds accepted.',
      70
    );
    doc.text(terms1, 20, yPos + 5);

    const terms2 = doc.splitTextToSize(
      'We are not liable for any damage to products once stored at your premises. Please keep frozen products (gelato and / or popsicles) frozen at -18 degree Celsius and below.',
      70
    );
    doc.text(terms2, 20, yPos + 25);

    // Signature line
    doc.setDrawColor(0, 0, 0);
    doc.line(20, yPos + 50, 85, yPos + 50);
    doc.setFontSize(10);
    doc.text("Client's Signature & Company Stamp", 20, yPos + 55);

    const totalsLabelX = 100;
    const totalsValueX = 185;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('SUBTOTAL', totalsLabelX, yPos + 5);
    doc.text(subtotal.toFixed(2), totalsValueX, yPos + 5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.text('GST 9%', totalsLabelX, yPos + 10);
    doc.text(gst.toFixed(2), totalsValueX, yPos + 10, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.text('TOTAL', totalsLabelX, yPos + 15);
    doc.text(selectedOrder.total_amount.toFixed(2), totalsValueX, yPos + 15, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.text('BALANCE DUE', totalsLabelX, yPos + 23);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${selectedOrder.total_amount.toFixed(2)}`, totalsValueX, yPos + 23, { align: 'right' });

    // Footer
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const selectedFooter = footerOptions.find(f => f.id === selectedFooterId);
    renderFooterInPDF(doc, selectedFooter);
        // Enable auto-print
    doc.autoPrint();
    
    // Generate blob and open in new window
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    window.open(blobUrl, '_blank');

  } catch (error) {
    console.error('Error generating PDF for print:', error);
    alert('Failed to open print preview. Please try Download PDF instead.');
  }
};

const handleDownloadPDF = async () => {
  if (!selectedOrder || !clientData) return;
  
  setIsGeneratingPDF(true);
  
  try {
    const jsPDF = (await import('jspdf')).default;
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const subtotal = getSubtotal(orderItems);
    const gst = getGST(orderItems);

    doc.setFont('helvetica');

    const selectedHeader = headerOptions.find(h => h.id === selectedHeaderId);
    renderHeaderInPDF(doc, selectedHeader);

    // Title
    doc.setFontSize(16);
    doc.setTextColor("#0D909A");
    doc.text('Invoice', 20, 57);
    doc.setTextColor(0, 0, 0);

    // Bill To, Ship To, Invoice Details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO', 20, 67);
    doc.setFont('helvetica', 'normal');
    doc.text(clientData.client_businessName || 'N/A', 20, 72);
    const billAddress = doc.splitTextToSize(clientData.client_billing_address || 'N/A', 45);
    doc.text(billAddress, 20, 77);

    doc.setFont('helvetica', 'bold');
    doc.text('SHIP TO', 75, 67);
    doc.setFont('helvetica', 'normal');
    doc.text(clientData.client_businessName || 'N/A', 75, 72);
    const shipAddressParts = [
      clientData.ad_streetName,
      clientData.ad_country,
      clientData.ad_postal
    ].filter(Boolean).join(', ') || selectedOrder.delivery_address || 'N/A';
    const shipAddress = doc.splitTextToSize(shipAddressParts, 45);
    doc.text(shipAddress, 75, 77);

    // Invoice Details
    const labelX = 155;
    const valueX = 157;
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE NO.', labelX, 67, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(selectedOrder.invoice_id, valueX, 67);

    doc.setFont('helvetica', 'bold');
    doc.text('DATE', labelX, 72, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(selectedOrder.delivery_date), valueX, 72);

    doc.setFont('helvetica', 'bold');
    doc.text('DUE DATE', labelX, 77, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(selectedOrder.delivery_date), valueX, 77);

    doc.setFont('helvetica', 'bold');
    doc.text('TERMS', labelX, 82, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text('Due on receipt', valueX, 82);

    // Horizontal line
    doc.setDrawColor(77, 184, 186);
    doc.line(20, 87, 190, 87);

    // Shipping info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SHIP DATE', 20, 93);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(selectedOrder.delivery_date), 20, 98);
    doc.setFont('helvetica', 'bold');
    doc.text('TRACKING NO.', 100, 93);
    doc.setFont('helvetica', 'normal');
    doc.text(selectedOrder.tracking_no, 100, 98);

    // Table Header
    const tableStartY = 104;
    doc.setFillColor(184, 230, 231);
    doc.rect(20, tableStartY, 170, 8, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setTextColor("#0D909A");
    doc.setFontSize(9);
    doc.text('PRODUCT /', 22, tableStartY + 3);
    doc.text('SERVICES', 22, tableStartY + 6);
    doc.text('DESCRIPTION', 60, tableStartY + 5);
    doc.text('QTY', 150, tableStartY + 5, { align: 'center' });
    doc.text('UNIT', 168, tableStartY + 3, { align: 'right' });
    doc.text('PRICE', 168, tableStartY + 6, { align: 'right' });
    doc.text('AMOUNT', 185, tableStartY + 5, { align: 'right' });

    // Table Rows
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    let yPos = tableStartY + 13;

    orderItems.forEach((item) => {
      const productText = `${item.product_type || item.product_name}`;
      
      doc.setFont('helvetica', 'bold');
      const productLines = doc.splitTextToSize(productText, 30);
      const descriptionText = item.product_billingName || productText;
      doc.text(productLines, 22, yPos);
      
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(descriptionText, 50);
      doc.text(descLines, 60, yPos);
      
      const maxLines = Math.max(productLines.length, descLines.length);
      const centerY = yPos + ((maxLines - 1) * 4) / 2;
      
      doc.text(item.quantity.toString(), 150, centerY, { align: 'center' });
      doc.text(item.unit_price.toFixed(2), 168, centerY, { align: 'right' });
      doc.text(item.subtotal.toFixed(2), 185, centerY, { align: 'right' });
      
      yPos += (maxLines * 4) + 1;
    });

    doc.setDrawColor('#e0e0e0');
    doc.setLineWidth(0.2);
    for (let i = 20; i < 190; i += 1.5) {
      doc.line(i, yPos + 2, i + 0.75, yPos + 2);
    }


    // Terms & Conditions
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.text('Terms & Conditions', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const terms1 = doc.splitTextToSize(
      'We acknowledge that the above goods are received in good condition. Please inform us of any issues within 24 hours. Otherwise, kindly note no return or refunds accepted.',
      70
    );
    doc.text(terms1, 20, yPos + 5);

    const terms2 = doc.splitTextToSize(
      'We are not liable for any damage to products once stored at your premises. Please keep frozen products (gelato and / or popsicles) frozen at -18 degree Celsius and below.',
      70
    );
    doc.text(terms2, 20, yPos + 25);

    // Signature line
    doc.setDrawColor(0, 0, 0);
    doc.line(20, yPos + 50, 85, yPos + 50);
    doc.setFontSize(10);
    doc.text("Client's Signature & Company Stamp", 20, yPos + 55);

    const totalsLabelX = 100;
    const totalsValueX = 185;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('SUBTOTAL', totalsLabelX, yPos + 5);
    doc.text(subtotal.toFixed(2), totalsValueX, yPos + 5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.text('GST 9%', totalsLabelX, yPos + 10);
    doc.text(gst.toFixed(2), totalsValueX, yPos + 10, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.text('TOTAL', totalsLabelX, yPos + 15);
    doc.text(selectedOrder.total_amount.toFixed(2), totalsValueX, yPos + 15, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.text('BALANCE DUE', totalsLabelX, yPos + 23);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${selectedOrder.total_amount.toFixed(2)}`, totalsValueX, yPos + 23, { align: 'right' });

    // Footer
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const selectedFooter = footerOptions.find(f => f.id === selectedFooterId);
    renderFooterInPDF(doc, selectedFooter);

    // Save PDF
    const fileName = `Invoice_${selectedOrder.invoice_id}_${formatDate(selectedOrder.delivery_date).replace(/\//g, '-')}.pdf`;
    
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 100);

  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF. Please try again.');
  } finally {
    setIsGeneratingPDF(false);
  }
};

const handleViewInvoice = async (order) => {
  try {
    // Fetch client data with address details
    const { data: client } = await supabase
      .from('client_user')
      .select('client_businessName, client_billing_address, client_person_incharge, ad_streetName, ad_country, ad_postal')
      .eq('client_auth_id', order.client_auth_id)
      .single();

    // Fetch order items with product type and billing name
    const { data: items } = await supabase
      .from('client_order_item')
      .select(`
         *,
        product_list!client_order_item_product_id_fkey(
          product_type,
          product_billingName
        )
      `)
      .eq('order_id', order.id);

    // Map the items to include product_type and product_billingName at the root level
    const itemsWithDetails = items?.map(item => ({
      ...item,
      product_type: item.product_list?.product_type || item.product_list?.[0]?.product_type || item.product_name,
      product_billingName: item.product_list?.product_billingName || item.product_list?.[0]?.product_billingName || item.product_name
    })) || [];

    // Combine client data - keep all address fields from client_user
    const combinedClientData = {
      ...client,
      // Only override if order has a specific delivery address
      ...(order.delivery_address && order.delivery_address !== client.ad_streetName && {
        ad_streetName: order.delivery_address
      })
    };

    setClientData(combinedClientData);
    setOrderItems(itemsWithDetails);
    setSelectedOrder(order);
    setShowInvoiceModal(true);
  } catch (error) {
    console.error('Error loading invoice:', error);
    alert('Failed to load invoice');
  }
};

  const getSubtotal = (items) => {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const getGST = (items) => {
    const subtotal = getSubtotal(items);
    return subtotal * 0.09;
  };

  // Format currency helper
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '0.00';
    return parseFloat(amount).toFixed(2);
  };

  // Get status badge styling
  const getStatusBadge = (status) => {
    const statusLower = status?.toLowerCase() || 'pending';
    
    const statusStyles = {
      paid: 'bg-green-100 text-green-700',
      pending: 'bg-orange-100 text-orange-700',
      completed: 'bg-blue-100 text-blue-700',
      cancelled: 'bg-red-100 text-red-700',
      processing: 'bg-yellow-100 text-yellow-700',
      shipped: 'bg-indigo-100 text-indigo-700'
    };

    return statusStyles[statusLower] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
        <Sidepanel />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6" style={{ backgroundColor: '#FCF0E3' }}>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold" style={{ color: '#5C2E1F' }}>
                Client Orders
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
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Sort By Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowSortDropdown(!showSortDropdown);
                    setShowFilterDropdown(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ChevronDown size={20} />
                  <span>Sort</span>
                </button>
                
                {showSortDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setSortBy('order_date_desc');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortBy === 'order_date_desc' ? 'bg-gray-50 font-medium' : ''}`}
                      >
                        Order Date (Newest First)
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('order_date_asc');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortBy === 'order_date_asc' ? 'bg-gray-50 font-medium' : ''}`}
                      >
                        Order Date (Oldest First)
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('delivery_date_desc');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortBy === 'delivery_date_desc' ? 'bg-gray-50 font-medium' : ''}`}
                      >
                        Delivery Date (Newest First)
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('delivery_date_asc');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortBy === 'delivery_date_asc' ? 'bg-gray-50 font-medium' : ''}`}
                      >
                        Delivery Date (Oldest First)
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('amount_desc');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortBy === 'amount_desc' ? 'bg-gray-50 font-medium' : ''}`}
                      >
                        Amount (High to Low)
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('amount_asc');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortBy === 'amount_asc' ? 'bg-gray-50 font-medium' : ''}`}
                      >
                        Amount (Low to High)
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('order_id_asc');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortBy === 'order_id_asc' ? 'bg-gray-50 font-medium' : ''}`}
                      >
                        Order ID (A-Z)
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('order_id_desc');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortBy === 'order_id_desc' ? 'bg-gray-50 font-medium' : ''}`}
                      >
                        Order ID (Z-A)
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('company_asc');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortBy === 'company_asc' ? 'bg-gray-50 font-medium' : ''}`}
                      >
                        Company Name (A-Z)
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('company_desc');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortBy === 'company_desc' ? 'bg-gray-50 font-medium' : ''}`}
                      >
                        Company Name (Z-A)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Filter Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowFilterDropdown(!showFilterDropdown);
                    setShowSortDropdown(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Filter size={20} />
                  <span>Filter</span>
                  {filterStatus !== 'all' && (
                    <span className="ml-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                      1
                    </span>
                  )}
                </button>
                
                {showFilterDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Status</div>
                      <button
                        onClick={() => {
                          setFilterStatus('all');
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${filterStatus === 'all' ? 'bg-gray-50 font-medium' : ''}`}
                      >
                        All Orders
                      </button>
                      <button
                        onClick={() => {
                          setFilterStatus('pending');
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${filterStatus === 'pending' ? 'bg-gray-50 font-medium' : ''}`}
                      >
                        Pending
                      </button>
                      <button
                        onClick={() => {
                          setFilterStatus('completed');
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${filterStatus === 'completed' ? 'bg-gray-50 font-medium' : ''}`}
                      >
                        Completed
                      </button>
                      <button
                        onClick={() => {
                          setFilterStatus('cancelled');
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${filterStatus === 'cancelled' ? 'bg-gray-50 font-medium' : ''}`}
                      >
                        Cancelled
                      </button>
                      {filterStatus !== 'all' && (
                        <>
                          <div className="border-t border-gray-200 my-1"></div>
                          <button
                            onClick={() => {
                              setFilterStatus('all');
                              setShowFilterDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-gray-100"
                          >
                            Clear Filter
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

                {/* Create Order Button */}
               <button 
                onClick={() => setShowCreateOrderModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#FF5722' }}
              >
                <Plus size={20} />
                <span>Create Order</span>
              </button>
              </div>
            </div>

            {/* Results Info */}
            {!loading && !error && (
              <div className="mb-4 text-sm text-gray-600">
                Showing {currentOrders.length} of {filteredOrders.length} orders
                {searchQuery && ` (filtered from ${orders.length} total)`}
              </div>
            )}

            {/* Date Filter Badge */}
            {searchQuery && searchQuery.match(/^\d{4}-\d{2}-\d{2}$/) && (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-sm text-gray-600">Filtering by delivery date:</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-2">
                  {new Date(searchQuery).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                  <button
                    onClick={() => setSearchQuery('')}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X size={14} />
                  </button>
                </span>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b-2" style={{ borderColor: '#5C2E1F' }}>
                  <th className="text-left py-3 px-2 w-10">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 cursor-pointer"
                      checked={selectedRows.size === currentOrders.length && currentOrders.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th className="text-left py-3 px-2 font-bold text-xs whitespace-nowrap" style={{ color: '#5C2E1F' }}>
                    ORDER ID
                  </th>
                  <th className="text-left py-3 px-3 font-bold text-xs whitespace-nowrap" style={{ color: '#5C2E1F' }}>
                    COMPANY NAME
                  </th>
                  <th className="text-left py-3 px-2 font-bold text-xs whitespace-nowrap" style={{ color: '#5C2E1F' }}>
                    ORDER DATE
                  </th>
                  <th className="text-left py-3 px-2 font-bold text-xs whitespace-nowrap" style={{ color: '#5C2E1F' }}>
                    DELIVERY DATE
                  </th>
                  <th className="text-left py-3 px-2 font-bold text-xs whitespace-nowrap" style={{ color: '#5C2E1F' }}>
                    DELIVERY ADDRESS
                  </th>
                  <th className="text-left py-3 px-2 font-bold text-xs whitespace-nowrap" style={{ color: '#5C2E1F' }}>
                    AMOUNT ($)
                  </th>
                  <th className="text-left py-3 px-2 font-bold text-xs whitespace-nowrap" style={{ color: '#5C2E1F' }}>
                    STATUS
                  </th>
                  <th className="text-left py-3 px-2 font-bold text-xs whitespace-nowrap" style={{ color: '#5C2E1F' }}>
                    TRACKING NO
                  </th>
                  <th className="text-left py-3 px-2 font-bold text-xs whitespace-nowrap" style={{ color: '#5C2E1F' }}>
                    INVOICE
                  </th>
                  <th className="text-left py-3 px-2 font-bold text-xs whitespace-nowrap" style={{ color: '#5C2E1F' }}>
                    LABEL
                  </th>
                  <th className="text-left py-3 px-2 font-bold text-xs whitespace-nowrap" style={{ color: '#5C2E1F' }}>
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-gray-500">
                    Loading orders...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={11} className="text-center py-8">
                    <div className="text-red-500 font-medium">Error loading orders</div>
                    <div className="text-sm text-gray-600 mt-1">{error}</div>
                  </td>
                </tr>
              ) : currentOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-gray-500">
                    {searchQuery 
                      ? 'No orders found matching your search.' 
                      : 'No orders found. Click "Create Order" to get started.'}
                  </td>
                </tr>
              ) : (
                <>
                  {currentOrders.map((order) => (
                    <Fragment key={order.id}>
                      {/* Main Order Row */}
                      <tr className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 cursor-pointer"
                            checked={selectedRows.has(order.id)}
                            onChange={(e) => handleSelectRow(order.id, e.target.checked)}
                          />
                        </td>
                        <td className="py-3 px-2 text-xs font-medium whitespace-nowrap">{order.order_id}</td>
                        <td className="py-3 px-3 text-xs max-w-37.5 truncate" title={order.company_name}>
                          {order.company_name}
                        </td>
                        <td className="py-3 px-2 text-xs whitespace-nowrap">
                          {formatDate(order.order_date)}
                        </td>
                        <td className="py-3 px-2 text-xs whitespace-nowrap">
                          {formatDate(order.delivery_date)}
                        </td>
                        <td className="py-3 px-2 text-xs max-w-37.5 truncate" title={order.delivery_address || ''}>
                          {order.delivery_address || '-'}
                        </td>
                        <td className="py-3 px-2 text-xs font-medium whitespace-nowrap">
                          ${formatCurrency(order.total_amount)}
                        </td>
                        <td className="py-3 px-2">
                          <select
                            value={order.status || 'pending'}
                            onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                            disabled={updatingStatus[order.id]}
                            className={`px-2 py-1 text-xs font-semibold rounded border-0 cursor-pointer ${getStatusBadge(order.status)} ${
                              updatingStatus[order.id] ? 'opacity-50 cursor-wait' : ''
                            }`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="py-3 px-2 text-xs whitespace-nowrap">
                          {order.tracking_no || '-'}
                        </td>
                        <td className="py-3 px-2">
                          {order.invoice_id ? (
                            <button
                              onClick={() => handleViewInvoice(order)}
                              className="text-xs font-normal text-blue-700 hover:underline cursor-pointer transition-all"
                            >
                              View Invoice
                            </button>
                          ) : (
                            <span className="text-xs font-normal text-gray-700">
                              Not Generated
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                        <button
                          onClick={() => handleGenerateLabels(order)}
                          className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                          title="Generate Product Labels"
                        >
                          Labels
                        </button>
                        </td>
                        <td className="py-3 px-2">
                          <button
                            onClick={() => handleRowExpand(order)}
                            className="text-gray-600 hover:text-gray-900 transition-colors p-1"
                            title={expandedRows[order.id] ? "Collapse" : "Expand"}
                          >
                            {expandedRows[order.id] ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Order Items - Header Row */}
                      {expandedRows[order.id] && (
                        <tr className="">
                          <td className="py-2 px-2"></td>
                          <td className="py-2 px-2 text-xs font-bold border-l border-gray-400" style={{ color: 'gray' }}>PRODUCT ID</td>
                          <td className="py-2 px-4 text-xs font-bold" style={{ color: 'gray' }}>NAME</td>
                          <td className="py-2 px-2 text-xs font-bold" style={{ color: 'gray' }}>TYPE</td>
                          <td className="py-2 px-2 text-xs font-bold" style={{ color: 'gray' }}>GELATO TYPE</td>
                          <td className="py-2 px-2 text-xs font-bold text-center" style={{ color: 'gray' }}>QUANTITY</td>
                          <td className="py-2 px-2 text-xs font-bold text-right" style={{ color: 'gray' }}>WEIGHT (kg)</td>
                          <td className="py-2 px-2 text-xs font-bold text-right" style={{ color: 'gray' }}>UNIT PRICE</td>
                          <td className="py-2 px-2 text-xs font-bold text-right" style={{ color: 'gray' }}>AMOUNT ($)</td>
                          <td className="py-2 px-2"></td>
                          <td className="py-2 px-2"></td>
                        </tr>
                      )}
                      {/* Expanded Order Items - Data Rows */}
                      {expandedRows[order.id] && rowOrderItems[order.id] && rowOrderItems[order.id].length > 0 ? (
                        rowOrderItems[order.id].map((item, index) => (
                          <tr key={`${order.id}-item-${index}`} className="bg-white border-b border-gray-200 hover:bg-gray-50">
                            <td className="py-2 px-2"></td>
                            <td className="py-2 px-2 text-xs border-l border-gray-400">{item.product_id}</td>
                            <td className="py-2 px-3 text-xs">{item.display_product_name}</td>
                            <td className="py-2 px-2 text-xs">{item.product_type}</td>
                            <td className="py-2 px-2 text-xs">{item.gelato_type || 'Dairy'}</td>
                            <td className="py-2 px-2 text-xs text-center">{item.quantity}</td>
                            <td className="py-2 px-2 text-xs text-right">{item.calculated_weight}</td>
                            <td className="py-2 px-2 text-xs text-right">{item.unit_price.toFixed(2)}</td>
                            <td className="py-2 px-2 text-xs text-right font-medium">{formatCurrency(item.subtotal)}</td>
                            <td className="py-2 px-2"></td>
                            <td className="py-2 px-2"></td>
                          </tr>
                        ))
                      ) : expandedRows[order.id] ? (
                        <tr className="bg-white border-b border-gray-200">
                          <td className="py-2 px-2"></td>
                          <td colSpan={10} className="text-center py-4 text-gray-500 text-xs border-l border-gray-400">
                            Loading order items...
                          </td>
                          <td className="py-2 px-2"></td>
                        </tr>
                      ) : null}
                      {/* Notes Row */}
                      {expandedRows[order.id] && (
                        <tr className="bg-blue-50 border-b border-gray-200">
                          <td className="py-3 px-2"></td>
                          <td colSpan={10} className="py-3 px-2 border-l border-gray-400">
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-bold text-gray-700">NOTES:</span>
                              <span className="text-xs text-gray-600 flex-1">
                                {order.notes || 'No additional notes'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-2"></td>
                        </tr>
                      )}
                      </Fragment>
                  ))}
                </>
              )}
              
              </tbody>
            </table>
          </div>

            {/* Pagination */}
            {!loading && !error && filteredOrders.length > 0 && (
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="text-sm hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ color: '#5C2E1F' }}
                >
                  Previous
                </button>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: '#5C2E1F' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
                
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
          {/* Invoice Modal */}
          {showInvoiceModal && selectedOrder && clientData && (
            <div className="fixed inset-0 z-50 overflow-auto flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
              <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 shrink-0 rounded-t-lg flex justify-between items-center">
                  <h3 className="text-xl font-bold" style={{ color: '#5C2E1F' }}>
                    Invoice Preview
                  </h3>
                  <button
                    onClick={() => setShowInvoiceModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Header Editor Modal */}
                {showHeaderEditor && (
                  <div 
                    className="fixed inset-0 flex items-center justify-center z-50 p-4"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                    onClick={() => {
                      setShowHeaderEditor(false);
                      setEditingHeaderId(null);
                      setHeaderFormData({
                        option_name: '',
                        line1: '',
                        line2: '',
                        line3: '',
                        line4: '',
                        line5: '',
                        line6: '',
                        line7: '',
                      });
                    }}
                  >
                    <div 
                      className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                        <h3 className="text-xl font-bold" style={{ color: '#5C2E1F' }}>
                          {editingHeaderId ? 'Edit Header Option' : 'Create Header Option'}
                        </h3>
                        <div className="flex items-center gap-2">
                          {editingHeaderId && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                handleDeleteHeaderOption(editingHeaderId);
                              }}
                              className="text-red-600 hover:text-red-800 text-sm px-3 py-1 border border-red-300 rounded hover:bg-red-50"
                              title="Delete this header"
                            >
                              Delete
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setShowHeaderEditor(false);
                              setEditingHeaderId(null);
                              setHeaderFormData({
                                option_name: '',
                                line1: '',
                                line2: '',
                                line3: '',
                                line4: '',
                                line5: '',
                                line6: '',
                                line7: '',
                        
                              });
                            }}
                            className="text-gray-500 hover:text-gray-700 text-2xl"
                          >
                            ×
                          </button>
                        </div>
                      </div>

                      <div className="p-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                            Option Name *
                          </label>
                          <input
                            type="text"
                            value={headerFormData.option_name}
                            onChange={(e) => setHeaderFormData({ ...headerFormData, option_name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g., Momolato Pte Ltd"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                            Line 1 (Company Name - Bold)
                          </label>
                          <input
                            type="text"
                            value={headerFormData.line1}
                            onChange={(e) => setHeaderFormData({ ...headerFormData, line1: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Momolato Pte Ltd"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                            Line 2 (Address Line 1)
                          </label>
                          <input
                            type="text"
                            value={headerFormData.line2}
                            onChange={(e) => setHeaderFormData({ ...headerFormData, line2: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="21 Tampines Street 92, #04-06"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                            Line 3 (Address Line 2)
                          </label>
                          <input
                            type="text"
                            value={headerFormData.line3}
                            onChange={(e) => setHeaderFormData({ ...headerFormData, line3: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Singapore"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                            Line 4 (Email/Contact No.)
                          </label>
                          <input
                            type="text"
                            value={headerFormData.line4}
                            onChange={(e) => setHeaderFormData({ ...headerFormData, line4: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="finance@momolato.com"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                            Line 5 (GST Registration/ Email)
                          </label>
                          <input
                            type="text"
                            value={headerFormData.line5}
                            onChange={(e) => setHeaderFormData({ ...headerFormData, line5: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="GST Registration No. : 201319550R"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                            Line 6 (Company Registration Label)
                          </label>
                          <input
                            type="text"
                            value={headerFormData.line6}
                            onChange={(e) => setHeaderFormData({ ...headerFormData, line6: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Company Registration No. UEN:"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                            Line 7 (Company Registration Number)
                          </label>
                          <input
                            type="text"
                            value={headerFormData.line7}
                            onChange={(e) => setHeaderFormData({ ...headerFormData, line7: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="201319550R"
                          />
                        </div>
                      </div>

                      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
                        <button
                          onClick={handleSaveHeaderOption}
                          className="flex-1 px-4 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity"
                          style={{ backgroundColor: '#FF5722' }}
                        >
                          {editingHeaderId ? 'Update' : 'Create'}
                        </button>
                        <button
                          onClick={() => {
                            setShowHeaderEditor(false);
                            setEditingHeaderId(null);
                            setHeaderFormData({
                              option_name: '',
                              line1: '',
                              line2: '',
                              line3: '',
                              line4: '',
                              line5: '',
                              line6: '',
                              line7: '',
                            });
                          }}
                          className="flex-1 px-4 py-2 border-2 rounded font-medium hover:bg-gray-50 transition-colors"
                          style={{ borderColor: '#5C2E1F', color: '#5C2E1F' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Header Options Selection */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="text-sm font-medium" style={{ color: '#5C2E1F' }}>
                      Invoice Header:
                    </label>
                    <div className="flex items-center gap-3 flex-wrap">
                      {headerOptions.map((header) => (
                        <label key={header.id} className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-gray-200 hover:border-orange-300 transition-colors">
                          <input
                            type="radio"
                            name="headerOption"
                            value={header.id}
                            checked={selectedHeaderId === header.id}
                            onChange={() => setSelectedHeaderId(header.id)}
                            className="cursor-pointer accent-orange-500"
                          />
                          <span className="text-sm font-medium">{header.option_name}</span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleEditHeaderOption(header);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-xs ml-1 underline"
                            title="Edit this header"
                          >
                            Edit
                          </button>
                        </label>
                      ))}
                      <button
                        onClick={() => {
                          setEditingHeaderId(null);
                          setHeaderFormData({
                            option_name: '',
                            line1: '',
                            line2: '',
                            line3: '',
                            line4: '',
                            line5: '',
                            line6: '',
                            line7: '',
                          });
                          setShowHeaderEditor(true);
                        }}
                        className="text-sm px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors font-medium"
                        style={{ color: '#5C2E1F' }}
                      >
                        + New Header
                      </button>
                    </div>
                  </div>
                </div>

                {/* Invoice Content */}
                <div className="flex-1 overflow-auto p-6 bg-gray-100">
                  <div className="bg-white shadow-lg rounded-lg">
                    <ClientInvoice 
                        order={{...selectedOrder, items: orderItems}}
                        clientData={clientData}
                        formatDate={formatDate}
                        getSubtotal={() => getSubtotal(orderItems)}
                        getGST={() => getGST(orderItems)}
                        selectedHeader={headerOptions.find(h => h.id === selectedHeaderId)}
                        selectedFooter={footerOptions.find(f => f.id === selectedFooterId)}
                      />
                  </div>
                </div>
                
                {/* Footer Options Selection */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="text-sm font-medium" style={{ color: '#5C2E1F' }}>
                      Invoice Footer:
                    </label>
                    <div className="flex items-center gap-3 flex-wrap">
                      {footerOptions.map((footer) => (
                        <label key={footer.id} className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-gray-200 hover:border-orange-300 transition-colors">
                          <input
                            type="radio"
                            name="footerOption"
                            value={footer.id}
                            checked={selectedFooterId === footer.id}
                            onChange={() => setSelectedFooterId(footer.id)}
                            className="cursor-pointer accent-orange-500"
                          />
                          <span className="text-sm font-medium">{footer.option_name}</span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleEditFooterOption(footer);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-xs ml-1 underline"
                            title="Edit this footer"
                          >
                            Edit
                          </button>
                        </label>
                      ))}
                      <button
                        onClick={() => {
                          setEditingFooterId(null);
                          setFooterFormData({
                            option_name: '',
                            line1: '',
                            line2: '',
                            line3: '',
                            line4: '',
                            line5: '',
                          });
                          setShowFooterEditor(true);
                        }}
                        className="text-sm px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors font-medium"
                        style={{ color: '#5C2E1F' }}
                      >
                        + New Footer
                      </button>
                    </div>
                  </div>
                </div>
                {/* Footer Actions */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 shrink-0 rounded-b-lg shadow-lg">
                  <button
                    onClick={handlePrintInvoice}
                    className="flex-1 px-4 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#FF5722' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 6 2 18 2 18 9"></polyline>
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                      <rect x="6" y="14" width="12" height="8"></rect>
                    </svg>
                    Print Invoice
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF}
                    className="flex-1 px-4 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#4db8ba' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    {isGeneratingPDF ? 'Generating PDF...' : 'Download PDF'}
                  </button>
                  <button
                    onClick={() => setShowInvoiceModal(false)}
                    className="flex-1 px-4 py-3 rounded-lg border-2 font-medium hover:bg-gray-50 transition-colors"
                    style={{ borderColor: '#5C2E1F', color: '#5C2E1F' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
                  
          {/* Label Generator Modal */}
          {showLabelGenerator && selectedOrderItems.length > 0 && selectedClientData && (
            <LabelGenerator 
            orderItems={selectedOrderItems}
            clientData={selectedClientData}
            onUpdate={(updatedItems) => {
              // Update the selectedOrderItems with new data
              setSelectedOrderItems(updatedItems);
            }}
          />
          )}

          {showCreateOrderModal && (
          <ClientOrderModal
            isOpen={showCreateOrderModal}
            onClose={() => setShowCreateOrderModal(false)}
            onSuccess={() => {
            setShowCreateOrderModal(false);
            // Refresh orders after successful creation
            const fetchOrders = async () => {
              try {
                setLoading(true);
                const { data, error: supabaseError } = await supabase
                  .from('client_order')
                  .select(`
                    id,
                    order_id,
                    client_auth_id,
                    order_date,
                    delivery_date,
                    delivery_address,
                    total_amount,
                    status,
                    notes,
                    invoice_id,
                    tracking_no,
                    created_at,
                    updated_at,
                    client_user!client_order_client_auth_id_fkey(client_businessName)
                  `)
                  .order('order_date', { ascending: false });

                if (supabaseError) throw supabaseError;

                if (data) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const ordersWithCompany = data.map((order: any) => {
                    let companyName = 'N/A';
                    if (order.client_user) {
                      if (Array.isArray(order.client_user)) {
                        companyName = order.client_user[0]?.client_businessName || 'N/A';
                      } else {
                        companyName = order.client_user.client_businessName || 'N/A';
                      }
                    }
                    return { ...order, company_name: companyName };
                  });
                  setOrders(ordersWithCompany);
                }
                setError(null);
              } catch (err) {
                console.error('Error refreshing orders:', err);
              } finally {
                setLoading(false);
              }
            };
            fetchOrders();
          }}
          />
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
                <X size={16} />
                <span className="text-sm">Remove</span>
              </button>
            </div>
          )}
          
          {showEditOrderModal && selectedOrder && (
          <EditOrderModal
            isOpen={showEditOrderModal}
            onClose={() => {
              setShowEditOrderModal(false);
              setSelectedOrder(null);
              setSelectedRows(new Set());
            }}
            onSuccess={() => {
              setShowEditOrderModal(false);
              setSelectedOrder(null);
              setSelectedRows(new Set());
              setIsEditSuccessOpen(true);
              
              // Refresh orders after successful update
              const fetchOrders = async () => {
                try {
                  setLoading(true);
                  const { data, error: supabaseError } = await supabase
                    .from('client_order')
                    .select(`
                      id,
                      order_id,
                      client_auth_id,
                      order_date,
                      delivery_date,
                      delivery_address,
                      total_amount,
                      status,
                      notes,
                      invoice_id,
                      tracking_no,
                      created_at,
                      updated_at,
                      client_user!client_order_client_auth_id_fkey(client_businessName)
                    `)
                    .order('order_date', { ascending: false });

                  if (supabaseError) throw supabaseError;

                  if (data) {
                    const ordersWithCompany = data.map((order: SupabaseOrderResponse): Order => {
                      let companyName = 'N/A';
                      if (order.client_user) {
                        if (Array.isArray(order.client_user)) {
                          companyName = order.client_user[0]?.client_businessName || 'N/A';
                        } else {
                          companyName = order.client_user.client_businessName || 'N/A';
                        }
                      }
                      return { ...order, company_name: companyName };
                    });
                    setOrders(ordersWithCompany);
                  }
                  setError(null);
                } catch (err) {
                  console.error('Error refreshing orders:', err);
                } finally {
                  setLoading(false);
                }
              };
              fetchOrders();
            }}
            order={selectedOrder}
          />
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
                  Confirm Order Removal
                </h2>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to remove {selectedRows.size} {selectedRows.size === 1 ? 'order' : 'orders'}? This action cannot be undone.
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
                    {loading ? 'Removing...' : 'Remove'}
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
                  Order(s) have been removed from the system.
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
                  Order information has been updated successfully.
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
                    <Check size={24} className="text-green-600" />
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
          {/* Warning Modal */}
          {showWarningModal && (
            <div 
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              onClick={() => setShowWarningModal(false)}
            >
              <div 
                className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium mb-2" style={{ color: '#5C2E1F' }}>
                    Warning
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    {warningMessage}
                  </p>
                  <button
                    onClick={() => setShowWarningModal(false)}
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
            >
              <div 
                className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <X size={24} className="text-red-600" />
                  </div>
                  <h3 className="text-lg font-medium mb-2" style={{ color: '#5C2E1F' }}>
                    Confirm Deletion
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Are you sure you want to delete this header option? This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowDeleteConfirmModal(false);
                        setHeaderToDelete(null);
                      }}
                      className="flex-1 px-4 py-2 border-2 rounded font-medium hover:bg-gray-50 transition-colors"
                      style={{ borderColor: '#5C2E1F', color: '#5C2E1F' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (headerToDelete) {
                          try {
                            const { error } = await supabase
                              .from('header_options')
                              .delete()
                              .eq('id', headerToDelete);

                            if (error) throw error;

                            const { data: updatedData } = await supabase
                              .from('header_options')
                              .select('*')
                              .order('is_default', { ascending: false });
                            
                            if (updatedData) {
                              setHeaderOptions(updatedData);
                              if (selectedHeaderId === headerToDelete && updatedData.length > 0) {
                                setSelectedHeaderId(updatedData[0].id);
                              }
                            }

                            setShowDeleteConfirmModal(false);
                            setHeaderToDelete(null);
                            setShowHeaderEditor(false);
                            setSuccessMessage('Header option deleted successfully!');
                            setShowSuccessModal(true);
                          } catch (error) {
                            console.error('Error deleting header option:', error);
                            setShowDeleteConfirmModal(false);
                            setHeaderToDelete(null);
                            setWarningMessage('Failed to delete header option');
                            setShowWarningModal(true);
                          }
                        }
                      }}
                      className="flex-1 px-4 py-2 rounded font-medium text-white hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: '#DC2626' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Edit Confirmation Modal */}
          {showEditConfirmModal && headerToEdit && (
            <div 
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            >
              <div 
                className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium mb-2" style={{ color: '#5C2E1F' }}>
                    Edit Header Option
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Do you want to edit &quot;{headerToEdit.option_name}&quot;?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowEditConfirmModal(false);
                        setHeaderToEdit(null);
                      }}
                      className="flex-1 px-4 py-2 border-2 rounded font-medium hover:bg-gray-50 transition-colors"
                      style={{ borderColor: '#5C2E1F', color: '#5C2E1F' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setEditingHeaderId(headerToEdit.id);
                        setHeaderFormData({
                          option_name: headerToEdit.option_name,
                          line1: headerToEdit.line1 || '',
                          line2: headerToEdit.line2 || '',
                          line3: headerToEdit.line3 || '',
                          line4: headerToEdit.line4 || '',
                          line5: headerToEdit.line5 || '',
                          line6: headerToEdit.line6 || '',
                          line7: headerToEdit.line7 || '',
                        });
                        setShowHeaderEditor(true);
                        setShowEditConfirmModal(false);
                        setHeaderToEdit(null);
                      }}
                      className="flex-1 px-4 py-2 rounded font-medium text-white hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: '#FF5722' }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Footer Editor Modal */}
          {showFooterEditor && (
            <div 
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              onClick={() => {
                setShowFooterEditor(false);
                setEditingFooterId(null);
                setFooterFormData({
                  option_name: '',
                  line1: '',
                  line2: '',
                  line3: '',
                  line4: '',
                  line5: '',
                });
              }}
            >
              <div 
                className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                  <h3 className="text-xl font-bold" style={{ color: '#5C2E1F' }}>
                    {editingFooterId ? 'Edit Footer Option' : 'Create Footer Option'}
                  </h3>
                  <div className="flex items-center gap-2">
                    {editingFooterId && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteFooterOption(editingFooterId);
                        }}
                        className="text-red-600 hover:text-red-800 text-sm px-3 py-1 border border-red-300 rounded hover:bg-red-50"
                        title="Delete this footer"
                      >
                        Delete
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowFooterEditor(false);
                        setEditingFooterId(null);
                        setFooterFormData({
                          option_name: '',
                          line1: '',
                          line2: '',
                          line3: '',
                          line4: '',
                          line5: '',
                        });
                      }}
                      className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                      Option Name *
                    </label>
                    <input
                      type="text"
                      value={footerFormData.option_name}
                      onChange={(e) => setFooterFormData({ ...footerFormData, option_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="e.g., Standard Payment Info"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                      Line 1
                    </label>
                    <input
                      type="text"
                      value={footerFormData.line1}
                      onChange={(e) => setFooterFormData({ ...footerFormData, line1: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="The team at Momolato deeply appreciates your kind support."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                      Line 2
                    </label>
                    <input
                      type="text"
                      value={footerFormData.line2}
                      onChange={(e) => setFooterFormData({ ...footerFormData, line2: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Payment instructions:"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                      Line 3
                    </label>
                    <input
                      type="text"
                      value={footerFormData.line3}
                      onChange={(e) => setFooterFormData({ ...footerFormData, line3: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="PayNow : UEN201319550R..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                      Line 4
                    </label>
                    <input
                      type="text"
                      value={footerFormData.line4}
                      onChange={(e) => setFooterFormData({ ...footerFormData, line4: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="OCBC BANK | SWIFT: OCBCSGSG..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                      Line 5
                    </label>
                    <input
                      type="text"
                      value={footerFormData.line5}
                      onChange={(e) => setFooterFormData({ ...footerFormData, line5: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Additional line"
                    />
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
                  <button
                    onClick={handleSaveFooterOption}
                    className="flex-1 px-4 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#FF5722' }}
                  >
                    {editingFooterId ? 'Update' : 'Create'}
                  </button>
                  <button
                    onClick={() => {
                      setShowFooterEditor(false);
                      setEditingFooterId(null);
                      setFooterFormData({
                        option_name: '',
                        line1: '',
                        line2: '',
                        line3: '',
                        line4: '',
                        line5: '',
                      });
                    }}
                    className="flex-1 px-4 py-2 border-2 rounded font-medium hover:bg-gray-50 transition-colors"
                    style={{ borderColor: '#5C2E1F', color: '#5C2E1F' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer Delete Confirmation Modal */}
          {showFooterDeleteConfirmModal && (
            <div 
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            >
              <div 
                className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <X size={24} className="text-red-600" />
                  </div>
                  <h3 className="text-lg font-medium mb-2" style={{ color: '#5C2E1F' }}>
                    Confirm Deletion
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Are you sure you want to delete this footer option? This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowFooterDeleteConfirmModal(false);
                        setFooterToDelete(null);
                      }}
                      className="flex-1 px-4 py-2 border-2 rounded font-medium hover:bg-gray-50 transition-colors"
                      style={{ borderColor: '#5C2E1F', color: '#5C2E1F' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (footerToDelete) {
                          try {
                            const { error } = await supabase
                              .from('footer_options')
                              .delete()
                              .eq('id', footerToDelete);

                            if (error) throw error;

                            const { data: updatedData } = await supabase
                              .from('footer_options')
                              .select('*')
                              .order('is_default', { ascending: false });
                            
                            if (updatedData) {
                              setFooterOptions(updatedData);
                              if (selectedFooterId === footerToDelete && updatedData.length > 0) {
                                setSelectedFooterId(updatedData[0].id);
                              }
                            }

                            setShowFooterDeleteConfirmModal(false);
                            setFooterToDelete(null);
                            setShowFooterEditor(false);
                            setSuccessMessage('Footer option deleted successfully!');
                            setShowSuccessModal(true);
                          } catch (error) {
                            console.error('Error deleting footer option:', error);
                            setShowFooterDeleteConfirmModal(false);
                            setFooterToDelete(null);
                            setWarningMessage('Failed to delete footer option');
                            setShowWarningModal(true);
                          }
                        }
                      }}
                      className="flex-1 px-4 py-2 rounded font-medium text-white hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: '#DC2626' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Edit Confirmation Modal */}
          {showFooterEditConfirmModal && footerToEdit && (
            <div 
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            >
              <div 
                className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium mb-2" style={{ color: '#5C2E1F' }}>
                    Edit Footer Option
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Do you want to edit `&quot;`{footerToEdit.option_name}`&quot;`?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowFooterEditConfirmModal(false);
                        setFooterToEdit(null);
                      }}
                      className="flex-1 px-4 py-2 border-2 rounded font-medium hover:bg-gray-50 transition-colors"
                      style={{ borderColor: '#5C2E1F', color: '#5C2E1F' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setEditingFooterId(footerToEdit.id);
                        setFooterFormData({
                          option_name: footerToEdit.option_name,
                          line1: footerToEdit.line1 || '',
                          line2: footerToEdit.line2 || '',
                          line3: footerToEdit.line3 || '',
                          line4: footerToEdit.line4 || '',
                          line5: footerToEdit.line5 || '',
                        });
                        setShowFooterEditor(true);
                        setShowFooterEditConfirmModal(false);
                        setFooterToEdit(null);
                      }}
                      className="flex-1 px-4 py-2 rounded font-medium text-white hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: '#FF5722' }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}