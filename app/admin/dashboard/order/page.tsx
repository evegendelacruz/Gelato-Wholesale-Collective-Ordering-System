'use client';
import Sidepanel from '@/app/components/sidepanel/page';
import Header from '@/app/components/header/page';
import { TableSkeleton, SkeletonStyles } from '@/app/components/skeletonLoader/page';
import supabase from '@/lib/client';
import ClientInvoice from '@/app/components/clientInvoice';
import ClientOrderModal from '@/app/components/clientOrderModal/page';
import LabelGenerator from '@/app/components/orderLabel/page';
import EditOrderModal from '@/app/components/editOrder/page';
import { useState, useEffect, Fragment, useRef } from 'react';
import { Search, Filter, Plus, X, Check, ChevronDown, Tag } from 'lucide-react';
import { useAccessControl } from '@/lib/accessControl';
import {
  downloadMultiStickerPDF,
  downloadAllOrderStickersPDF,
  generateMultiStickerPDF,
  generateAllOrderStickersPDF,
  generateNextBbdCode,
  generateNextPbnCode,
  generateProductBarcode,
  downloadOrderBarcodeStickers,
  downloadOrderProductStickers,
  generateOrderBarcodeStickersPreview,
  generateOrderProductStickersPreview,
  type StickerData,
  type OrderStickerItem,
  type OrderItemForSticker,
} from "@/lib/stickerGenerator";

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
  gst_percentage?: number;
  billing_address?: string;
  ad_streetName?: string;
  ad_country?: string;
  ad_postal?: string;
  xero_invoice_id?: string;
  xero_synced_at?: string;
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
  client_user?: { client_operationName?: string } | Array<{ client_operationName?: string }>;
  billing_address?: string;
  ad_streetName?: string;
  ad_country?: string;
  ad_postal?: string;
}

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

export default function OrderPage() {
  // Access Control
  const { canEdit } = useAccessControl();
  const canEditOrders = canEdit('orders', 'order');

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const itemsPerPage = 10;
  const [updatingStatus, setUpdatingStatus] = useState({});

  // Status change confirmation modal
  const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false);
  const [statusChangeData, setStatusChangeData] = useState<{ orderId: number; newStatus: string; orderInvoiceId: string } | null>(null);

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
  const [invoiceHeaders, setInvoiceHeaders] = useState<Record<string, number>>({});
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

  // Sticker preview state
  const [showStickerPreview, setShowStickerPreview] = useState(false);
  const [stickerPreviewUrl, setStickerPreviewUrl] = useState<string>('');
  const [stickerPreviewData, setStickerPreviewData] = useState<{
    stickerData: StickerData;
    quantity: number;
    productName: string;
    // For "all order stickers" - store actual items for proper download
    allOrderItems?: OrderStickerItem[];
    lastBbdCode?: string | null;
    lastPbnCode?: string | null;
  } | null>(null);

  // New sticker types modal state (Barcode & Product Stickers)
  const [showNewStickerModal, setShowNewStickerModal] = useState(false);
  const [newStickerType, setNewStickerType] = useState<"barcode" | "product">("barcode");
  const [newStickerOrderId, setNewStickerOrderId] = useState<string>("");
  const [newStickerItems, setNewStickerItems] = useState<OrderItemForSticker[]>([]);
  const [newStickerOrderDate, setNewStickerOrderDate] = useState<string>("");
  const [barcodeStickerPreviewUrl, setBarcodeStickerPreviewUrl] = useState<string>("");
  const [productStickerPreviewUrl, setProductStickerPreviewUrl] = useState<string>("");
  const [lastGpbnCode, setLastGpbnCode] = useState<string | null>(null); // Last GPBN that will be generated (for display)
  const [isGeneratingNewSticker, setIsGeneratingNewSticker] = useState(false);
  const [totalStickerCount, setTotalStickerCount] = useState(0);
  const [showStickerDropdown, setShowStickerDropdown] = useState<number | null>(null);
  const [showItemStickerDropdown, setShowItemStickerDropdown] = useState<string | null>(null); // format: "orderId-itemIndex"

  // Xero sync state
  const [syncingToXero, setSyncingToXero] = useState(false);
  const [xeroSyncMessage, setXeroSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [syncingRowXero, setSyncingRowXero] = useState<Record<number, boolean>>({});
  const [xeroInvoiceMap, setXeroInvoiceMap] = useState<Record<string, { Status: string; AmountDue: number; AmountPaid: number }>>({});

  // Edit Invoice state
  const [showEditInvoiceModal, setShowEditInvoiceModal] = useState(false);
  const [editInvoiceGstPercent, setEditInvoiceGstPercent] = useState<number>(9);
  const [currentInvoiceGstPercent, setCurrentInvoiceGstPercent] = useState<number>(9);
  const [editInvoiceItems, setEditInvoiceItems] = useState<Array<{
    id: number;
    product_name: string;
    product_type: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>>([]);
  const [applyGstToFutureOrders, setApplyGstToFutureOrders] = useState(false);
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);

  // Edit Invoice Address state
  const [editBillToAddress, setEditBillToAddress] = useState('');
  const [editShipToAddress, setEditShipToAddress] = useState('');
  const [applyAddressToFutureOrders, setApplyAddressToFutureOrders] = useState(false);

  // Use ref for GPBN to avoid closure issues - this stores the starting code for current order
  const gpbnStartCodeRef = useRef<string | null>(null);

  // GPBN codes by delivery date (key = delivery_date string, value = GPBN number)
  const [deliveryDateGpbn, setDeliveryDateGpbn] = useState<Record<string, number>>({});

  // Refs for dropdown positioning
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [sortDropdownPos, setSortDropdownPos] = useState({ top: 0, right: 0 });
  const [filterDropdownPos, setFilterDropdownPos] = useState({ top: 0, right: 0 });

  // Refs for syncing horizontal scroll between header, scrollbar, and body
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  const syncScroll = (source: 'header' | 'scrollbar' | 'body') => {
    const headerEl = headerScrollRef.current;
    const scrollbarEl = scrollbarRef.current;
    const bodyEl = bodyScrollRef.current;

    if (!headerEl || !scrollbarEl || !bodyEl) return;

    let scrollLeft = 0;
    if (source === 'header') scrollLeft = headerEl.scrollLeft;
    else if (source === 'scrollbar') scrollLeft = scrollbarEl.scrollLeft;
    else if (source === 'body') scrollLeft = bodyEl.scrollLeft;

    if (source !== 'header') headerEl.scrollLeft = scrollLeft;
    if (source !== 'scrollbar') scrollbarEl.scrollLeft = scrollLeft;
    if (source !== 'body') bodyEl.scrollLeft = scrollLeft;
  };

  const toggleRowExpansion = (orderId) => {
  setExpandedRows(prev => ({
    ...prev,
    [orderId]: !prev[orderId]
  }));
};

// Load Xero invoices and build a map keyed by InvoiceID (silently skip if not connected)
useEffect(() => {
  const loadXeroStatuses = async () => {
    try {
      const res = await fetch('/api/xero/invoices');
      if (!res.ok) return;
      const data = await res.json();
      if (data.invoices) {
        const map: Record<string, { Status: string; AmountDue: number; AmountPaid: number }> = {};
        for (const inv of data.invoices) {
          if (inv.InvoiceID) {
            map[inv.InvoiceID] = { Status: inv.Status, AmountDue: inv.AmountDue ?? 0, AmountPaid: inv.AmountPaid ?? 0 };
          }
        }
        setXeroInvoiceMap(map);
      }
    } catch {
      // Xero not connected — ignore
    }
  };
  loadXeroStatuses();
}, []);

// Load default GST from localStorage on mount
useEffect(() => {
  const savedGst = localStorage.getItem('defaultGstPercent_client');
  if (savedGst) {
    const gstValue = parseFloat(savedGst);
    if (!isNaN(gstValue) && gstValue >= 0 && gstValue <= 100) {
      setCurrentInvoiceGstPercent(gstValue);
    }
  }
}, []);

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

// Load saved invoice headers from localStorage
useEffect(() => {
  try {
    const saved = localStorage.getItem('clientInvoiceHeaders');
    if (saved) {
      setInvoiceHeaders(JSON.parse(saved));
    }
  } catch (error) {
    console.error('Error loading invoice headers from localStorage:', error);
  }
}, []);

// Function to save header for a specific invoice
const saveInvoiceHeader = (invoiceId: string, headerId: number) => {
  const updated = { ...invoiceHeaders, [invoiceId]: headerId };
  setInvoiceHeaders(updated);
  setSelectedHeaderId(headerId);
  try {
    localStorage.setItem('clientInvoiceHeaders', JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving invoice headers to localStorage:', error);
  }
};

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
          billing_address,
          ad_streetName,
          ad_country,
          ad_postal,
          total_amount,
          status,
          notes,
          invoice_id,
          tracking_no,
          created_at,
          updated_at,
          gst_percentage,
          last_modified_by,
          last_modified_by_name,
          xero_invoice_id,
          xero_synced_at,
          client_user!client_order_client_auth_id_fkey(client_operationName)
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
              companyName = order.client_user[0]?.client_operationName || 'N/A';
            } else {
              companyName = order.client_user.client_operationName || 'N/A';
            }
          }

          return {
            ...order,
            company_name: companyName
          };
        });

        // Sort orders: Pending/active first, Completed/Cancelled at bottom
        const sortedOrders = ordersWithCompany.sort((a: Order, b: Order) => {
          const aIsFinished = a.status === 'Completed' || a.status === 'Cancelled';
          const bIsFinished = b.status === 'Completed' || b.status === 'Cancelled';

          // If one is finished and the other is not, finished goes to bottom
          if (aIsFinished && !bIsFinished) return 1;
          if (!aIsFinished && bIsFinished) return -1;

          // Otherwise, sort by delivery_date (most recent first)
          return new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime();
        });

        setOrders(sortedOrders);

        // Calculate GPBN by order date - all orders placed on the same day get the same GPBN
        // Fetch order dates from BOTH client orders AND online orders to ensure synchronized GPBN
        // GPBN is sequential: earliest date = 3000, next date = 3001, etc.

        // Get client order dates
        const clientOrderDates = ordersWithCompany.map((o: Order) => {
          const date = new Date(o.order_date);
          return date.toISOString().split('T')[0];
        });

        // Also fetch online order dates to ensure GPBN is synchronized
        const { data: onlineOrders } = await supabase
          .from('customer_order')
          .select('order_date');

        const onlineOrderDates = (onlineOrders || []).map((o: { order_date: string }) => {
          const date = new Date(o.order_date);
          return date.toISOString().split('T')[0];
        });

        // Combine all dates and get unique sorted dates
        const allOrderDates = [...clientOrderDates, ...onlineOrderDates];
        const uniqueOrderDates = [...new Set(allOrderDates)].sort();

        const gpbnByDate: Record<string, number> = {};
        uniqueOrderDates.forEach((dateStr, index) => {
          // GPBN = 3000 + sequential index (earliest date = 3000)
          gpbnByDate[dateStr] = 3000 + index;
        });

        setDeliveryDateGpbn(gpbnByDate);
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
  // First priority: Completed/Cancelled orders go to the bottom
  const aIsFinished = a.status === 'Completed' || a.status === 'Cancelled';
  const bIsFinished = b.status === 'Completed' || b.status === 'Cancelled';

  if (aIsFinished && !bIsFinished) return 1;
  if (!aIsFinished && bIsFinished) return -1;

  // Second priority: Apply user's chosen sorting within each group
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

const renderHeaderInPDF = (doc, selectedHeader, logoBase64?: string) => {
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

  // Add logo in upper right corner
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 165, 10, 30, 20);
    } catch (e) {
      console.error('Failed to add logo to PDF:', e);
    }
  }
};

const renderFooterInPDF = (doc, selectedFooter) => {
  if (!selectedFooter) return;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  let footerY = 268; // Footer positioned within bottom margin
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
        billing_address,
        ad_streetName,
        ad_country,
        ad_postal,
        total_amount,
        status,
        notes,
        invoice_id,
        tracking_no,
        created_at,
        updated_at,
        client_user!client_order_client_auth_id_fkey(client_operationName)
      `)
      .order('order_date', { ascending: false });

    if (!fetchError && data) {
      const ordersWithCompany = data.map((order: SupabaseOrderResponse): Order => {
        let companyName = 'N/A';
        if (order.client_user) {
          if (Array.isArray(order.client_user)) {
            companyName = order.client_user[0]?.client_operationName || 'N/A';
          } else {
            companyName = order.client_user.client_operationName || 'N/A';
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

    // Get GPBN based on order date (same as product sticker)
    const orderDateStr = new Date(order.order_date).toISOString().split('T')[0];
    const gpbnNumber = deliveryDateGpbn[orderDateStr] || 3000;
    const gpbnCode = `GPBN${gpbnNumber}`;

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
        // Use GPBN code as batch number (same as product sticker)
        batchNumber: gpbnCode,
        order_date: order.order_date
      };
    }) || [];

    console.log('Items with details:', itemsWithDetails);

    // Fetch client data
    const { data: client, error: clientError } = await supabase
      .from('client_user')
      .select('client_operationName, client_delivery_address')
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

    // Toggle immediately for better UX
    toggleRowExpansion(order.id);

    // Fetch order items if not already fetched
    if (!rowOrderItems[order.id]) {
      // Fetch order items
      const { data: items } = await supabase
        .from('client_order_item')
        .select('*')
        .eq('order_id', order.id);

      if (!items || items.length === 0) {
        setRowOrderItems(prev => ({ ...prev, [order.id]: [] }));
        return;
      }

      // Fetch ALL products for matching (same approach as Labels and online orders)
      const { data: allProducts } = await supabase
        .from('product_list')
        .select('id, product_id, product_name, product_ingredient, product_shelflife, product_description');

      // Create lookup maps for flexible matching
      const productMapById = new Map();
      const productMapByName = new Map();

      (allProducts || []).forEach(p => {
        productMapById.set(p.id, p);
        if (p.product_name) {
          productMapByName.set(p.product_name.toLowerCase().trim(), p);
        }
      });

      // Map items - find product and extract ingredient for sticker use
      const enrichedItems = items.map(item => {
        // Try to find product by id first, then by name
        let productData = null;

        if (item.product_id) {
          productData = productMapById.get(item.product_id);
        }

        // Try by name if id didn't match
        if (!productData && item.product_name) {
          productData = productMapByName.get(item.product_name.toLowerCase().trim());
        }

        const productIngredient = productData?.product_ingredient || null;
        const productShelflife = productData?.product_shelflife || '3 months';
        const productDescription = productData?.product_description || null;

        console.log('Row expand - Item:', item.product_name, '| product_id:', item.product_id, '| Found product:', productData?.product_name, '| Ingredient:', productIngredient?.substring(0, 30));

        return {
          ...item,
          product_type: item.product_type || 'N/A',
          gelato_type: item.gelato_type || 'Dairy',
          display_product_name: item.product_name || 'Unknown Product',
          calculated_weight: item.calculated_weight || '-',
          // Use label_ingredients if saved, otherwise use product_list ingredient
          label_ingredients: item.label_ingredients || productIngredient,
          product_shelflife: productShelflife,
          // Use saved product_description if available, otherwise use product_list description
          product_description: item.product_description || productDescription
        };
      });

      setRowOrderItems(prev => ({
        ...prev,
        [order.id]: enrichedItems
      }));
    }
  };

  // Generate stickers for a single order item (quantity x stickers)
  // Uses product_id to fetch ingredients directly from product_list (same as Labels)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleGenerateStickers = async (item: {
    display_product_name: string;
    product_ingredient: string | null;
    sticker_bbd_code: string | null;
    sticker_pbn_code: string | null;
    sticker_barcode: string | null;
    quantity: number;
    product_name?: string;
    product_id?: number;
  }) => {
    const productName = item.display_product_name || item.product_name || 'Unknown Product';

    let ingredients: string | null = null;
    let barcode = item.sticker_barcode;

    console.log('Single sticker - Product:', productName, 'product_id:', item.product_id);

    // Fetch product directly by product_id
    if (item.product_id) {
      const { data: product } = await supabase
        .from('product_list')
        .select('product_ingredient')
        .eq('id', item.product_id)
        .single();

      if (product) {
        console.log('Single sticker - Found by ID:', product.product_ingredient?.substring(0, 50));
        ingredients = product.product_ingredient;
      }
    }

    // Fallback: use item's stored ingredient if available
    if (!ingredients && item.product_ingredient) {
      ingredients = item.product_ingredient;
    }

    // Final fallback
    ingredients = ingredients || 'No ingredients listed';
    console.log('Single sticker - Final ingredients:', ingredients.substring(0, 50));

    // Use product-based barcode (consistent for same product)
    barcode = barcode || generateProductBarcode(productName);

    // Get last codes for generating unique BBD/PBN per sticker
    let lastBbdCode: string | null = null;
    let lastPbnCode: string | null = null;

    try {
      const { data: lastProduct } = await supabase
        .from('product_list')
        .select('sticker_bbd_code, sticker_pbn_code')
        .not('sticker_bbd_code', 'is', null)
        .order('id', { ascending: false })
        .limit(1)
        .single();

      lastBbdCode = lastProduct?.sticker_bbd_code || null;
      lastPbnCode = lastProduct?.sticker_pbn_code || null;
    } catch {
      // Start fresh if no existing codes
    }

    // Generate first sticker data for preview (others will have sequential codes)
    const firstBbdCode = generateNextBbdCode(lastBbdCode);
    const firstPbnCode = generateNextPbnCode(lastPbnCode);

    const stickerData: StickerData = {
      productName: productName,
      ingredients: ingredients,
      bbdCode: firstBbdCode,
      pbnCode: firstPbnCode,
      barcode: barcode
    };

    // Generate PDF with unique BBD/PBN for each sticker
    const doc = generateMultiStickerPDF(stickerData, item.quantity);
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    if (stickerPreviewUrl) {
      URL.revokeObjectURL(stickerPreviewUrl);
    }

    setStickerPreviewUrl(pdfUrl);
    setStickerPreviewData({
      stickerData,
      quantity: item.quantity,
      productName
    });
    setShowStickerPreview(true);
  };

  // Generate barcode or product sticker for a single item (same modal as order-level)
  // Uses THE EXACT SAME approach as handleGenerateLabels
  const handleItemStickerModal = async (
    item: {
      id?: number;
      display_product_name: string;
      product_name?: string;
      product_id?: number;
      quantity: number;
      product_ingredient?: string | null;
      label_ingredients?: string | null;
      product_shelflife?: string | null;
    },
    orderId: number,
    orderDate: string,
    stickerType: "barcode" | "product"
  ) => {
    setIsGeneratingNewSticker(true);
    setNewStickerType(stickerType);
    setShowNewStickerModal(true);
    setShowItemStickerDropdown(null);

    const order = orders.find(o => o.id === orderId);
    if (!order) {
      alert('Order not found');
      setIsGeneratingNewSticker(false);
      setShowNewStickerModal(false);
      return;
    }

    setNewStickerOrderId(order.order_id);
    setNewStickerOrderDate(orderDate);

    const productName = item.display_product_name || item.product_name || 'Unknown Product';

    // ===== USE THE EXACT SAME APPROACH AS LABELS =====
    // Fetch this specific order item WITH product_list JOIN (same query as handleGenerateLabels)
    const { data: freshItems } = await supabase
      .from('client_order_item')
      .select(`
        *,
        product_list(
          product_ingredient,
          product_shelflife
        )
      `)
      .eq('order_id', orderId);

    // Find the matching item by product_name or id
    const matchedItem = freshItems?.find(fi =>
      fi.product_name === (item.product_name || item.display_product_name) ||
      fi.id === item.id
    );

    // Extract ingredients THE SAME WAY as Labels does
    let ingredients = 'No ingredients listed';
    let shelfLife = '3 months';

    if (matchedItem) {
      // First check label_ingredients (same as Labels line 907)
      if (matchedItem.label_ingredients) {
        ingredients = matchedItem.label_ingredients;
      }
      // Then check product_list JOIN (same as Labels lines 894-902)
      else if (matchedItem.product_list) {
        if (Array.isArray(matchedItem.product_list)) {
          ingredients = matchedItem.product_list[0]?.product_ingredient || ingredients;
          shelfLife = matchedItem.product_list[0]?.product_shelflife || shelfLife;
        } else {
          ingredients = (matchedItem.product_list as { product_ingredient?: string }).product_ingredient || ingredients;
          shelfLife = (matchedItem.product_list as { product_shelflife?: string }).product_shelflife || shelfLife;
        }
      }
    }

    console.log('=== STICKER INGREDIENTS (same as Labels) ===');
    console.log('Product:', productName);
    console.log('Matched item:', matchedItem?.product_name);
    console.log('label_ingredients:', matchedItem?.label_ingredients?.substring(0, 30));
    console.log('product_list:', matchedItem?.product_list);
    console.log('Final ingredients:', ingredients.substring(0, 50));

    const productId = item.product_id?.toString() || '0';

    // Generate 13-digit barcode from product_id
    const barcode13 = '3' + productId.replace(/\D/g, '').padStart(12, '0').slice(-12);

    const stickerItems: OrderItemForSticker[] = [{
      productName,
      ingredients,
      quantity: item.quantity,
      barcode13,
      shelfLife
    }];

    setNewStickerItems(stickerItems);
    setTotalStickerCount(item.quantity);

    // Get GPBN based on order date - all orders placed on same day get same GPBN
    const orderDateStr = new Date(order.order_date).toISOString().split('T')[0];
    const gpbnNumber = deliveryDateGpbn[orderDateStr] || 3000;

    // Store the fixed GPBN code for use by preview and download functions
    const gpbnCode = `GPBN${gpbnNumber}`;
    gpbnStartCodeRef.current = gpbnCode;

    // Generate previews
    console.log('=== CALLING STICKER PREVIEW ===');
    console.log('stickerItems being passed:', JSON.stringify(stickerItems, null, 2));

    if (stickerType === "barcode") {
      const previewUrl = generateOrderBarcodeStickersPreview(stickerItems);
      setBarcodeStickerPreviewUrl(previewUrl);
    } else {
      const { previewUrl } = generateOrderProductStickersPreview(stickerItems, orderDate, gpbnCode, true);
      setProductStickerPreviewUrl(previewUrl);
      setLastGpbnCode(gpbnCode);
    }

    setIsGeneratingNewSticker(false);
  };

  // Generate ALL stickers for an entire order (all products × quantities)
  // Uses the SAME approach as handleGenerateLabels - Supabase JOIN with product_list
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleGenerateAllOrderStickers = async (orderId: number) => {
    console.log('=== STICKER GENERATION DEBUG ===');
    console.log('Order ID:', orderId);

    // Use the EXACT same query as Labels - JOIN with product_list (only product_ingredient)
    const { data: items, error: fetchError } = await supabase
      .from('client_order_item')
      .select(`
        *,
        product_list(
          product_ingredient
        )
      `)
      .eq('order_id', orderId);

    console.log('Fetched items with JOIN:', items);

    if (fetchError) {
      console.error('Error fetching order items:', fetchError);
      alert('Error fetching order items: ' + fetchError.message);
      return;
    }

    if (!items || items.length === 0) {
      alert('No items found for this order.');
      return;
    }

    // Map items to sticker format - same logic as Labels
    const stickerItems: OrderStickerItem[] = items.map(item => {
      let productIngredients = 'No ingredients listed';

      // Extract from joined product_list (same as Labels does)
      if (item.product_list) {
        if (Array.isArray(item.product_list)) {
          productIngredients = item.product_list[0]?.product_ingredient || productIngredients;
        } else {
          productIngredients = (item.product_list as { product_ingredient?: string }).product_ingredient || productIngredients;
        }
      }

      // Prioritize label_ingredients from order item, fallback to product_list
      const finalIngredients = item.label_ingredients || productIngredients;
      console.log('Item:', item.product_name, '| label_ingredients:', item.label_ingredients?.substring(0, 30), '| product_list:', productIngredients?.substring(0, 30), '| Using:', finalIngredients?.substring(0, 30));

      return {
        productName: item.product_name || 'Unknown Product',
        ingredients: finalIngredients,
        quantity: item.quantity,
        existingBarcode: null
      };
    });

    console.log('=== FINAL STICKER ITEMS ===');
    console.log(stickerItems.map(s => ({ name: s.productName, ingredients: s.ingredients?.substring(0, 50), qty: s.quantity })));

    // Get last codes for generating unique BBD/PBN
    let lastBbdCode: string | null = null;
    let lastPbnCode: string | null = null;

    try {
      const { data: lastProduct } = await supabase
        .from('product_list')
        .select('sticker_bbd_code, sticker_pbn_code')
        .not('sticker_bbd_code', 'is', null)
        .order('id', { ascending: false })
        .limit(1)
        .single();

      lastBbdCode = lastProduct?.sticker_bbd_code || null;
      lastPbnCode = lastProduct?.sticker_pbn_code || null;
    } catch {
      // Start fresh if no existing codes
    }

    // Calculate total sticker count
    const totalStickers = stickerItems.reduce((sum, item) => sum + item.quantity, 0);

    // Generate PDF with all stickers
    const doc = generateAllOrderStickersPDF(stickerItems, lastBbdCode, lastPbnCode);
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    if (stickerPreviewUrl) {
      URL.revokeObjectURL(stickerPreviewUrl);
    }

    // Find the order to get order_id
    const order = orders.find(o => o.id === orderId);
    const orderIdStr = order?.order_id || `order-${orderId}`;

    setStickerPreviewUrl(pdfUrl);
    setStickerPreviewData({
      stickerData: {
        productName: `All Products - Order ${orderIdStr}`,
        ingredients: `${stickerItems.length} product(s), ${totalStickers} sticker(s)`,
        bbdCode: 'Multiple',
        pbnCode: 'Multiple',
        barcode: 'Multiple'
      },
      quantity: totalStickers,
      productName: `Order ${orderIdStr}`,
      // Store actual items for proper download
      allOrderItems: stickerItems,
      lastBbdCode: lastBbdCode,
      lastPbnCode: lastPbnCode
    });
    setShowStickerPreview(true);
  };

  // Download sticker from preview
  const handleDownloadSticker = () => {
    if (!stickerPreviewData) return;
    const filename = `stickers-${stickerPreviewData.productName.replace(/\s+/g, '-')}-x${stickerPreviewData.quantity}.pdf`;

    // If we have actual order items (from "all order stickers"), use those for accurate download
    if (stickerPreviewData.allOrderItems && stickerPreviewData.allOrderItems.length > 0) {
      downloadAllOrderStickersPDF(
        stickerPreviewData.allOrderItems,
        filename,
        stickerPreviewData.lastBbdCode || null,
        stickerPreviewData.lastPbnCode || null
      );
    } else {
      // Single item sticker - use the stickerData directly
      downloadMultiStickerPDF(stickerPreviewData.stickerData, stickerPreviewData.quantity, filename);
    }
  };

  // Close sticker preview
  const closeStickerPreview = () => {
    if (stickerPreviewUrl) {
      URL.revokeObjectURL(stickerPreviewUrl);
    }
    setStickerPreviewUrl('');
    setStickerPreviewData(null);
    setShowStickerPreview(false);
  };

  // ============================================================================
  // NEW STICKER TYPES: Barcode Stickers & Product Stickers (with Preview Modal)
  // ============================================================================

  // Open New Sticker Modal for an order
  const handleOpenNewStickerModal = async (orderId: number, stickerType: "barcode" | "product" = "barcode") => {
    setIsGeneratingNewSticker(true);
    setNewStickerType(stickerType);
    setShowNewStickerModal(true);

    // Find the order
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      alert('Order not found');
      setIsGeneratingNewSticker(false);
      setShowNewStickerModal(false);
      return;
    }

    setNewStickerOrderId(order.order_id);
    setNewStickerOrderDate(order.order_date);

    // Fetch order items with product data
    const { data: items, error: fetchError } = await supabase
      .from('client_order_item')
      .select(`
        *,
        product_list(
          product_id,
          product_ingredient,
          product_shelflife
        )
      `)
      .eq('order_id', orderId);

    if (fetchError) {
      console.error('Error fetching order items:', fetchError);
      alert('Error fetching order items: ' + fetchError.message);
      setIsGeneratingNewSticker(false);
      setShowNewStickerModal(false);
      return;
    }

    if (!items || items.length === 0) {
      alert('No items found for this order.');
      setIsGeneratingNewSticker(false);
      setShowNewStickerModal(false);
      return;
    }

    // Map items to sticker format - USE SAME APPROACH AS LABELS
    const stickerItems: OrderItemForSticker[] = items.map((item) => {
      // Get ingredients from product_list JOIN (same as Labels lines 894-902)
      let productIngredients = 'No ingredients listed';
      let shelfLife = '3 months';
      let productId = item.product_id?.toString() || '0';

      if (item.product_list) {
        const productData = Array.isArray(item.product_list) ? item.product_list[0] : item.product_list;
        productIngredients = productData?.product_ingredient || productIngredients;
        shelfLife = productData?.product_shelflife || shelfLife;
        productId = productData?.product_id || productId;
      }

      // Prioritize label_ingredients (same as Labels line 907)
      const ingredients = item.label_ingredients || productIngredients;

      console.log('Compiled sticker item:', item.product_name, '| label_ingredients:', item.label_ingredients?.substring(0, 30), '| product_list:', productIngredients?.substring(0, 30), '| Final:', ingredients?.substring(0, 30));

      // Generate 13-digit barcode from product_id (3 + padded product_id)
      const barcode13 = '3' + productId.replace(/\D/g, '').padStart(12, '0').slice(-12);

      return {
        productName: item.product_name || 'Unknown Product',
        ingredients,
        quantity: item.quantity,
        barcode13,
        shelfLife
      };
    });

    setNewStickerItems(stickerItems);
    const totalCount = stickerItems.reduce((sum, item) => sum + item.quantity, 0);
    setTotalStickerCount(totalCount);

    // Get GPBN based on order date - all orders placed on same day get same GPBN
    const orderDateStr = new Date(order.order_date).toISOString().split('T')[0];
    const gpbnNumber = deliveryDateGpbn[orderDateStr] || 3000;

    // Store the fixed GPBN code for use by preview and download functions
    const gpbnCode = `GPBN${gpbnNumber}`;
    gpbnStartCodeRef.current = gpbnCode;

    // Generate previews
    if (stickerType === "barcode") {
      const previewUrl = generateOrderBarcodeStickersPreview(stickerItems);
      setBarcodeStickerPreviewUrl(previewUrl);
    } else {
      const { previewUrl } = generateOrderProductStickersPreview(stickerItems, order.order_date, gpbnCode, true);
      setProductStickerPreviewUrl(previewUrl);
      setLastGpbnCode(gpbnCode);
    }

    setIsGeneratingNewSticker(false);
  };

  // Close new sticker modal
  const closeNewStickerModal = () => {
    if (barcodeStickerPreviewUrl) URL.revokeObjectURL(barcodeStickerPreviewUrl);
    if (productStickerPreviewUrl) URL.revokeObjectURL(productStickerPreviewUrl);
    setShowNewStickerModal(false);
    setBarcodeStickerPreviewUrl("");
    setProductStickerPreviewUrl("");
    setNewStickerItems([]);
    setNewStickerOrderId("");
  };

  // Regenerate barcode sticker preview
  const regenerateBarcodeStickerPreview = () => {
    if (barcodeStickerPreviewUrl) URL.revokeObjectURL(barcodeStickerPreviewUrl);
    const previewUrl = generateOrderBarcodeStickersPreview(newStickerItems);
    setBarcodeStickerPreviewUrl(previewUrl);
  };

  // Regenerate product sticker preview
  const regenerateProductStickerPreview = () => {
    if (productStickerPreviewUrl) URL.revokeObjectURL(productStickerPreviewUrl);

    // Use the ref value (set when modal opened) - fixed GPBN for all stickers
    const currentGpbnCode = gpbnStartCodeRef.current;

    const { previewUrl } = generateOrderProductStickersPreview(newStickerItems, newStickerOrderDate, currentGpbnCode, true);
    setProductStickerPreviewUrl(previewUrl);
    setLastGpbnCode(currentGpbnCode);
  };

  // Download barcode stickers
  const handleDownloadBarcodeStickers = () => {
    const filename = `barcode-stickers-${newStickerOrderId}.pdf`;
    downloadOrderBarcodeStickers(newStickerItems, filename);
  };

  // Download product stickers (GPBN is based on delivery date - same for all stickers)
  const handleDownloadProductStickers = () => {
    const filename = `product-stickers-${newStickerOrderId}.pdf`;

    // Use the ref value (same as preview) - fixed GPBN for all stickers
    const currentGpbnCode = gpbnStartCodeRef.current;

    downloadOrderProductStickers(newStickerItems, newStickerOrderDate, filename, currentGpbnCode, true);
  };

  // Show confirmation modal before changing status
  const handleStatusChangeRequest = (orderId: number, newStatus: string, orderInvoiceId: string) => {
    setStatusChangeData({ orderId, newStatus, orderInvoiceId });
    setShowStatusConfirmModal(true);
  };

  // Confirm and execute status change
  const handleConfirmStatusChange = async () => {
    if (!statusChangeData) return;

    const { orderId, newStatus } = statusChangeData;

    try {
      setUpdatingStatus(prev => ({ ...prev, [orderId]: true }));

      // Capture audit trail: who is making this change
      let modifiedBy = '';
      let modifiedByName = '';
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        modifiedBy = sessionData.session.user.id;
        const { data: adminData } = await supabase
          .from('admin_user')
          .select('admin_fullName')
          .eq('admin_auth_id', sessionData.session.user.id)
          .single();
        modifiedByName = adminData?.admin_fullName ?? sessionData.session.user.email ?? '';
      }

      const { error: updateError } = await supabase
        .from('client_order')
        .update({
          status: newStatus,
          last_modified_by: modifiedBy || null,
          last_modified_by_name: modifiedByName || null,
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Update local state and sort: completed/cancelled go to bottom
      setOrders(prevOrders => {
        const updatedOrders = prevOrders.map(order =>
          order.id === orderId
            ? {
                ...order,
                status: newStatus,
                last_modified_by: modifiedBy || order.last_modified_by,
                last_modified_by_name: modifiedByName || order.last_modified_by_name,
                updated_at: new Date().toISOString(),
              }
            : order
        );

        // Sort orders: Pending first, then by delivery_date, Completed/Cancelled at bottom
        return updatedOrders.sort((a, b) => {
          const aIsFinished = a.status === 'Completed' || a.status === 'Cancelled';
          const bIsFinished = b.status === 'Completed' || b.status === 'Cancelled';

          // If one is finished and the other is not, finished goes to bottom
          if (aIsFinished && !bIsFinished) return 1;
          if (!aIsFinished && bIsFinished) return -1;

          // Otherwise, sort by delivery_date (most recent first)
          return new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime();
        });
      });

      setShowStatusConfirmModal(false);
      setStatusChangeData(null);
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [statusChangeData.orderId]: false }));
    }
  };

  // Cancel status change
  const handleCancelStatusChange = () => {
    setShowStatusConfirmModal(false);
    setStatusChangeData(null);
  };

  // Sync a single order row to Xero directly from the table
  const handleSyncRowToXero = async (order: Order) => {
    setSyncingRowXero(prev => ({ ...prev, [order.id]: true }));
    try {
      const res = await fetch('/api/xero/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Sync failed');
      setOrders(prev =>
        prev.map(o =>
          o.id === order.id
            ? { ...o, xero_invoice_id: data.xeroInvoiceId, xero_synced_at: new Date().toISOString() }
            : o
        )
      );
      // Update xero status map with the newly synced invoice status (DRAFT by default until Xero processes)
      if (data.xeroInvoiceId) {
        setXeroInvoiceMap(prev => ({
          ...prev,
          [data.xeroInvoiceId]: { Status: 'DRAFT', AmountDue: order.total_amount, AmountPaid: 0 }
        }));
      }
    } catch (e) {
      alert(`Xero sync failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setSyncingRowXero(prev => ({ ...prev, [order.id]: false }));
    }
  };

  // Sync the currently viewed invoice to Xero
  const handleSyncToXero = async () => {
    if (!selectedOrder) return;
    setSyncingToXero(true);
    setXeroSyncMessage(null);
    try {
      const res = await fetch('/api/xero/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: selectedOrder.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Sync failed');
      setXeroSyncMessage({ type: 'success', text: `Synced to Xero (ID: ${data.xeroInvoiceId})` });
      // Refresh orders to get updated xero_invoice_id
      setOrders(prev =>
        prev.map(o =>
          o.id === selectedOrder.id
            ? { ...o, xero_invoice_id: data.xeroInvoiceId, xero_synced_at: new Date().toISOString() }
            : o
        )
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Xero sync failed';
      setXeroSyncMessage({ type: 'error', text: msg });
    } finally {
      setSyncingToXero(false);
    }
  };

  // Legacy function for backward compatibility (now redirects to confirmation)
  const handleStatusUpdate = async (orderId, newStatus) => {
    // Find the order to get its invoice_id
    const order = orders.find(o => o.id === orderId);
    const orderInvoiceId = order?.invoice_id || `Order #${orderId}`;
    handleStatusChangeRequest(orderId, newStatus, orderInvoiceId);
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
    const gst = getGST(orderItems, currentInvoiceGstPercent);

    doc.setFont('helvetica');

    // Load logo image
    let logoBase64: string | undefined;
    try {
      logoBase64 = await loadImageAsBase64('/assets/file_logo.png');
    } catch (e) {
      console.error('Failed to load logo:', e);
    }

    const selectedHeader = headerOptions.find(h => h.id === selectedHeaderId);
    const selectedFooter = footerOptions.find(f => f.id === selectedFooterId);

    // Calculate header lines for responsive spacing
    const getHeaderLineCount = () => {
      if (!selectedHeader) return 7;
      const lines = [
        selectedHeader.line1,
        selectedHeader.line2,
        selectedHeader.line3,
        selectedHeader.line4,
        selectedHeader.line5,
        selectedHeader.line6,
        selectedHeader.line7
      ];
      return lines.filter(line => line && line.trim() !== '').length;
    };
    const headerLineCount = getHeaderLineCount();
    // Each line is approximately 4mm in PDF
    const headerOffset = (7 - headerLineCount) * 4;

    // Dynamic pagination with precise space calculation
    // Page dimensions - A4 size
    const pageHeight = 297; // A4 height in mm
    const footerY = 268; // Footer positioned within bottom margin
    const maxContentY = footerY - 2; // Leave 2mm buffer before footer (content stops at Y=266)
    const firstPageStartY = 104 - headerOffset; // Y position after header on first page
    const continuationPageStartY = 20; // Y position on continuation pages
    const tableHeaderHeight = 13; // Height of table header row
    const termsBaseHeight = 58; // Height for terms, totals, signature (without notes)
    const lineHeight = 4; // Height per line of text

    // Calculate notes lines for pagination - full page width
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const notesText = selectedOrder.notes || '';
    const notesWidth = 170; // Full page width (210mm - 20mm margins)
    const notesLines = notesText ? doc.splitTextToSize(notesText, notesWidth) : [];

    // Pre-calculate height for each item based on text wrapping
    const calculateItemHeight = (item: typeof orderItems[0]) => {
      const productText = `${item.product_type || item.product_name}`;
      const productLines = doc.splitTextToSize(productText, 30);
      const descriptionText = item.product_billingName || productText;
      const descLines = doc.splitTextToSize(descriptionText, 50);
      const maxLines = Math.max(productLines.length, descLines.length);
      return (maxLines * lineHeight) + 1;
    };

    // Build pages dynamically
    interface PageStructure {
      items: typeof orderItems;
      showHeader: boolean;
      showTerms: boolean;
      notesLines?: string[];
      isNotesOverflow?: boolean;
      isFirstNotesPage?: boolean;
    }
    const pages: PageStructure[] = [];

    let currentPageItems: typeof orderItems = [];
    let currentY = firstPageStartY + tableHeaderHeight;
    let isFirstPage = true;
    let itemIndex = 0;

    // STEP 1: Process all items - fit as many as possible on each page
    while (itemIndex < orderItems.length) {
      const item = orderItems[itemIndex];
      const itemHeight = calculateItemHeight(item);

      if (currentY + itemHeight <= maxContentY) {
        currentPageItems.push(item);
        currentY += itemHeight;
        itemIndex++;
      } else if (currentPageItems.length === 0) {
        // Page is empty but item doesn't fit - add anyway
        currentPageItems.push(item);
        currentY += itemHeight;
        itemIndex++;
      } else {
        // Page full, start new page
        pages.push({
          items: currentPageItems,
          showHeader: isFirstPage,
          showTerms: false
        });
        currentPageItems = [];
        currentY = continuationPageStartY + tableHeaderHeight;
        isFirstPage = false;
      }
    }

    // STEP 2: Calculate remaining space and determine terms/notes placement
    // Terms section: dotted line at currentY, content ends at currentY + termsBaseHeight
    const termsEndY = currentY + termsBaseHeight;
    const spaceForNotes = maxContentY - termsEndY; // No extra buffer needed
    const maxNotesLinesOnPage = Math.max(0, Math.floor(spaceForNotes / lineHeight));

    // Track if we've shown the "Notes:" label yet
    let notesLabelShown = false;
    const hasNotes = notesLines.length > 0;

    const termsAndNotesWillFit = termsEndY <= maxContentY;

    if (termsAndNotesWillFit) {
      // Terms fit on same page as items
      const firstPageNotesLines = notesLines.slice(0, maxNotesLinesOnPage);
      const overflowNotesLines = notesLines.slice(maxNotesLinesOnPage);

      const showNotesLabel = hasNotes && firstPageNotesLines.length > 0;
      if (showNotesLabel) notesLabelShown = true;
      pages.push({
        items: currentPageItems,
        showHeader: isFirstPage,
        showTerms: true,
        notesLines: firstPageNotesLines.length > 0 ? firstPageNotesLines : undefined,
        isFirstNotesPage: showNotesLabel
      });

      // Add overflow notes pages if needed
      if (overflowNotesLines.length > 0) {
        const linesPerOverflowPage = Math.floor((maxContentY - continuationPageStartY) / lineHeight);
        for (let i = 0; i < overflowNotesLines.length; i += linesPerOverflowPage) {
          const isFirst = !notesLabelShown && i === 0;
          if (isFirst) notesLabelShown = true;
          pages.push({
            items: [],
            showHeader: false,
            showTerms: false,
            notesLines: overflowNotesLines.slice(i, i + linesPerOverflowPage),
            isNotesOverflow: true,
            isFirstNotesPage: isFirst
          });
        }
      }
    } else {
      // Terms don't fit - save items page, put terms on next page
      if (currentPageItems.length > 0) {
        pages.push({
          items: currentPageItems,
          showHeader: isFirstPage,
          showTerms: false
        });
      }

      // Calculate space for notes on the new terms page
      const termsPageNotesSpace = maxContentY - continuationPageStartY - termsBaseHeight;
      const maxNotesOnTermsPage = Math.max(0, Math.floor(termsPageNotesSpace / lineHeight));
      const firstPageNotesLines = notesLines.slice(0, maxNotesOnTermsPage);
      const remainingAfterTermsPage = notesLines.slice(maxNotesOnTermsPage);

      const showNotesLabel = hasNotes && firstPageNotesLines.length > 0;
      if (showNotesLabel) notesLabelShown = true;
      pages.push({
        items: [],
        showHeader: false,
        showTerms: true,
        notesLines: firstPageNotesLines.length > 0 ? firstPageNotesLines : undefined,
        isFirstNotesPage: showNotesLabel
      });

      if (remainingAfterTermsPage.length > 0) {
        const linesPerOverflowPage = Math.floor((maxContentY - continuationPageStartY) / lineHeight);
        for (let i = 0; i < remainingAfterTermsPage.length; i += linesPerOverflowPage) {
          const isFirst = !notesLabelShown && i === 0;
          if (isFirst) notesLabelShown = true;
          pages.push({
            items: [],
            showHeader: false,
            showTerms: false,
            notesLines: remainingAfterTermsPage.slice(i, i + linesPerOverflowPage),
            isNotesOverflow: true,
            isFirstNotesPage: isFirst
          });
        }
      }
    }

    // Handle edge case: no items
    if (orderItems.length === 0 && pages.length === 0) {
      const maxNotesOnPage = Math.floor((maxContentY - firstPageStartY - termsBaseHeight) / lineHeight);
      pages.push({
        items: [],
        showHeader: true,
        showTerms: true,
        notesLines: notesLines.slice(0, maxNotesOnPage),
        isFirstNotesPage: notesLines.length > 0
      });
    }

    // Helper function to render table header
    const renderTableHeader = (startY: number) => {
      doc.setFillColor(184, 230, 231);
      doc.rect(20, startY, 170, 8, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setTextColor("#0D909A");
      doc.setFontSize(9);
      doc.text('PRODUCT /', 22, startY + 3);
      doc.text('SERVICES', 22, startY + 6);
      doc.text('DESCRIPTION', 60, startY + 5);
      doc.text('QTY', 150, startY + 5, { align: 'center' });
      doc.text('UNIT', 168, startY + 3, { align: 'right' });
      doc.text('PRICE', 168, startY + 6, { align: 'right' });
      doc.text('AMOUNT', 185, startY + 5, { align: 'right' });
    };

    // Helper function to render terms and totals - notes use full page width (170mm)
    const renderTermsAndTotals = (startY: number, notesLines?: string[], isFirstNotesPage?: boolean) => {
      doc.setDrawColor('#e0e0e0');
      doc.setLineWidth(0.2);
      for (let i = 20; i < 190; i += 1.5) {
        doc.line(i, startY, i + 0.75, startY);
      }

      const yPos = startY + 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('Terms & Conditions', 20, yPos);

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

      doc.setDrawColor(0, 0, 0);
      doc.line(20, yPos + 50, 85, yPos + 50);
      doc.text("Client's Signature & Company Stamp", 20, yPos + 55);

      // Notes Section - full page width (170mm), label only on first notes page
      if (notesLines && notesLines.length > 0) {
        if (isFirstNotesPage) {
          doc.setFont('helvetica', 'bold');
          doc.text('Notes:', 20, yPos + 62);
          doc.setFont('helvetica', 'normal');
          doc.text(notesLines, 20, yPos + 67);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.text(notesLines, 20, yPos + 62);
        }
      }

      const totalsLabelX = 100;
      const totalsValueX = 185;
      doc.text('SUBTOTAL', totalsLabelX, yPos + 5);
      doc.text(subtotal.toFixed(2), totalsValueX, yPos + 5, { align: 'right' });

      doc.text(`GST ${currentInvoiceGstPercent}%`, totalsLabelX, yPos + 10);
      doc.text(gst.toFixed(2), totalsValueX, yPos + 10, { align: 'right' });

      doc.text('TOTAL', totalsLabelX, yPos + 15);
      doc.text(selectedOrder.total_amount.toFixed(2), totalsValueX, yPos + 15, { align: 'right' });

      doc.text('BALANCE DUE', totalsLabelX, yPos + 23);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${selectedOrder.total_amount.toFixed(2)}`, totalsValueX, yPos + 23, { align: 'right' });
    };

    // Helper function to render notes overflow page - NO label, just continue text
    const renderNotesOverflow = (notesLines: string[]) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      // No label - just continue the notes text from top of page
      doc.text(notesLines, 20, 20);
    };

    // Render each page
    pages.forEach((page, pageIndex) => {
      if (pageIndex > 0) {
        doc.addPage();
      }

      let yPos: number;

      if (page.showHeader) {
        renderHeaderInPDF(doc, selectedHeader, logoBase64);

        doc.setFontSize(16);
        doc.setTextColor("#0D909A");
        doc.text('Invoice', 20, 57 - headerOffset);
        doc.setTextColor(0, 0, 0);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('BILL TO', 20, 67 - headerOffset);
        doc.setFont('helvetica', 'normal');
        doc.text(clientData.client_operationName || 'N/A', 20, 72 - headerOffset);
        const billAddress = doc.splitTextToSize(clientData.client_billing_address || 'N/A', 45);
        doc.text(billAddress, 20, 77 - headerOffset);

        doc.setFont('helvetica', 'bold');
        doc.text('SHIP TO', 75, 67 - headerOffset);
        doc.setFont('helvetica', 'normal');
        doc.text(clientData.client_operationName || 'N/A', 75, 72 - headerOffset);
        const shipAddressParts = [
          clientData.ad_streetName,
          clientData.ad_country,
          clientData.ad_postal
        ].filter(Boolean).join(', ') || selectedOrder.delivery_address || 'N/A';
        const shipAddress = doc.splitTextToSize(shipAddressParts, 45);
        doc.text(shipAddress, 75, 77 - headerOffset);

        const labelX = 155;
        const valueX = 157;
        doc.setFont('helvetica', 'bold');
        doc.text('INVOICE NO.', labelX, 67 - headerOffset, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.text(selectedOrder.invoice_id, valueX, 67 - headerOffset);

        doc.setFont('helvetica', 'bold');
        doc.text('DATE', labelX, 72 - headerOffset, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.text(formatDate(selectedOrder.delivery_date), valueX, 72 - headerOffset);

        doc.setFont('helvetica', 'bold');
        doc.text('DUE DATE', labelX, 77 - headerOffset, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.text(formatDate(selectedOrder.delivery_date), valueX, 77 - headerOffset);

        doc.setFont('helvetica', 'bold');
        doc.text('TERMS', labelX, 82 - headerOffset, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.text('Due on receipt', valueX, 82 - headerOffset);

        doc.setDrawColor(77, 184, 186);
        doc.line(20, 87 - headerOffset, 190, 87 - headerOffset);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('SHIP DATE', 20, 93 - headerOffset);
        doc.setFont('helvetica', 'normal');
        doc.text(formatDate(selectedOrder.delivery_date), 20, 98 - headerOffset);
        doc.setFont('helvetica', 'bold');
        doc.text('TRACKING NO.', 100, 93 - headerOffset);
        doc.setFont('helvetica', 'normal');
        doc.text(selectedOrder.tracking_no, 100, 98 - headerOffset);

        yPos = 104 - headerOffset;
      } else {
        yPos = 20;
      }

      // Render table if there are items
      if (page.items.length > 0) {
        renderTableHeader(yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        yPos += 13;

        page.items.forEach((item) => {
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
      }

      // Render terms and totals on designated page
      if (page.showTerms) {
        renderTermsAndTotals(yPos + 2, page.notesLines, page.isFirstNotesPage);
      }

      // Render notes overflow page
      if (page.isNotesOverflow && page.notesLines) {
        renderNotesOverflow(page.notesLines);
      }

      // Render footer on every page
      renderFooterInPDF(doc, selectedFooter);
    });

    doc.autoPrint();

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
    const gst = getGST(orderItems, currentInvoiceGstPercent);

    doc.setFont('helvetica');

    // Load logo image
    let logoBase64: string | undefined;
    try {
      logoBase64 = await loadImageAsBase64('/assets/file_logo.png');
    } catch (e) {
      console.error('Failed to load logo:', e);
    }

    const selectedHeader = headerOptions.find(h => h.id === selectedHeaderId);
    const selectedFooter = footerOptions.find(f => f.id === selectedFooterId);

    // Calculate header lines for responsive spacing
    const getHeaderLineCount = () => {
      if (!selectedHeader) return 7;
      const lines = [
        selectedHeader.line1,
        selectedHeader.line2,
        selectedHeader.line3,
        selectedHeader.line4,
        selectedHeader.line5,
        selectedHeader.line6,
        selectedHeader.line7
      ];
      return lines.filter(line => line && line.trim() !== '').length;
    };
    const headerLineCount = getHeaderLineCount();
    // Each line is approximately 4mm in PDF
    const headerOffset = (7 - headerLineCount) * 4;

    // Dynamic pagination with precise space calculation
    // Page dimensions - A4 size
    const pageHeight = 297; // A4 height in mm
    const footerY = 268; // Footer positioned within bottom margin
    const maxContentY = footerY - 2; // Leave 2mm buffer before footer (content stops at Y=266)
    const firstPageStartY = 104 - headerOffset; // Y position after header on first page
    const continuationPageStartY = 20; // Y position on continuation pages
    const tableHeaderHeight = 13; // Height of table header row
    const termsBaseHeight = 58; // Height for terms, totals, signature (without notes)
    const lineHeight = 4; // Height per line of text

    // Calculate notes lines for pagination - full page width
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const notesText = selectedOrder.notes || '';
    const notesWidth = 170; // Full page width (210mm - 20mm margins)
    const notesLines = notesText ? doc.splitTextToSize(notesText, notesWidth) : [];

    // Pre-calculate height for each item based on text wrapping
    const calculateItemHeight = (item: typeof orderItems[0]) => {
      const productText = `${item.product_type || item.product_name}`;
      const productLines = doc.splitTextToSize(productText, 30);
      const descriptionText = item.product_billingName || productText;
      const descLines = doc.splitTextToSize(descriptionText, 50);
      const maxLines = Math.max(productLines.length, descLines.length);
      return (maxLines * lineHeight) + 1;
    };

    // Build pages dynamically
    interface PageStructure {
      items: typeof orderItems;
      showHeader: boolean;
      showTerms: boolean;
      notesLines?: string[];
      isNotesOverflow?: boolean;
      isFirstNotesPage?: boolean;
    }
    const pages: PageStructure[] = [];

    let currentPageItems: typeof orderItems = [];
    let currentY = firstPageStartY + tableHeaderHeight;
    let isFirstPage = true;
    let itemIndex = 0;

    // STEP 1: Process all items - fit as many as possible on each page
    while (itemIndex < orderItems.length) {
      const item = orderItems[itemIndex];
      const itemHeight = calculateItemHeight(item);

      if (currentY + itemHeight <= maxContentY) {
        currentPageItems.push(item);
        currentY += itemHeight;
        itemIndex++;
      } else if (currentPageItems.length === 0) {
        // Page is empty but item doesn't fit - add anyway
        currentPageItems.push(item);
        currentY += itemHeight;
        itemIndex++;
      } else {
        // Page full, start new page
        pages.push({
          items: currentPageItems,
          showHeader: isFirstPage,
          showTerms: false
        });
        currentPageItems = [];
        currentY = continuationPageStartY + tableHeaderHeight;
        isFirstPage = false;
      }
    }

    // STEP 2: Calculate remaining space and determine terms/notes placement
    // Terms section: dotted line at currentY, content ends at currentY + termsBaseHeight
    const termsEndY = currentY + termsBaseHeight;
    const spaceForNotes = maxContentY - termsEndY; // No extra buffer needed
    const maxNotesLinesOnPage = Math.max(0, Math.floor(spaceForNotes / lineHeight));

    // Track if we've shown the "Notes:" label yet
    let notesLabelShown = false;
    const hasNotes = notesLines.length > 0;

    const termsAndNotesWillFit = termsEndY <= maxContentY;

    if (termsAndNotesWillFit) {
      // Terms fit on same page as items
      const firstPageNotesLines = notesLines.slice(0, maxNotesLinesOnPage);
      const overflowNotesLines = notesLines.slice(maxNotesLinesOnPage);

      const showNotesLabel = hasNotes && firstPageNotesLines.length > 0;
      if (showNotesLabel) notesLabelShown = true;
      pages.push({
        items: currentPageItems,
        showHeader: isFirstPage,
        showTerms: true,
        notesLines: firstPageNotesLines.length > 0 ? firstPageNotesLines : undefined,
        isFirstNotesPage: showNotesLabel
      });

      // Add overflow notes pages if needed
      if (overflowNotesLines.length > 0) {
        const linesPerOverflowPage = Math.floor((maxContentY - continuationPageStartY) / lineHeight);
        for (let i = 0; i < overflowNotesLines.length; i += linesPerOverflowPage) {
          const isFirst = !notesLabelShown && i === 0;
          if (isFirst) notesLabelShown = true;
          pages.push({
            items: [],
            showHeader: false,
            showTerms: false,
            notesLines: overflowNotesLines.slice(i, i + linesPerOverflowPage),
            isNotesOverflow: true,
            isFirstNotesPage: isFirst
          });
        }
      }
    } else {
      // Terms don't fit - save items page, put terms on next page
      if (currentPageItems.length > 0) {
        pages.push({
          items: currentPageItems,
          showHeader: isFirstPage,
          showTerms: false
        });
      }

      // Calculate space for notes on the new terms page
      const termsPageNotesSpace = maxContentY - continuationPageStartY - termsBaseHeight;
      const maxNotesOnTermsPage = Math.max(0, Math.floor(termsPageNotesSpace / lineHeight));
      const firstPageNotesLines = notesLines.slice(0, maxNotesOnTermsPage);
      const remainingAfterTermsPage = notesLines.slice(maxNotesOnTermsPage);

      const showNotesLabel = hasNotes && firstPageNotesLines.length > 0;
      if (showNotesLabel) notesLabelShown = true;
      pages.push({
        items: [],
        showHeader: false,
        showTerms: true,
        notesLines: firstPageNotesLines.length > 0 ? firstPageNotesLines : undefined,
        isFirstNotesPage: showNotesLabel
      });

      if (remainingAfterTermsPage.length > 0) {
        const linesPerOverflowPage = Math.floor((maxContentY - continuationPageStartY) / lineHeight);
        for (let i = 0; i < remainingAfterTermsPage.length; i += linesPerOverflowPage) {
          const isFirst = !notesLabelShown && i === 0;
          if (isFirst) notesLabelShown = true;
          pages.push({
            items: [],
            showHeader: false,
            showTerms: false,
            notesLines: remainingAfterTermsPage.slice(i, i + linesPerOverflowPage),
            isNotesOverflow: true,
            isFirstNotesPage: isFirst
          });
        }
      }
    }

    // Handle edge case: no items
    if (orderItems.length === 0 && pages.length === 0) {
      const maxNotesOnPage = Math.floor((maxContentY - firstPageStartY - termsBaseHeight) / lineHeight);
      pages.push({
        items: [],
        showHeader: true,
        showTerms: true,
        notesLines: notesLines.slice(0, maxNotesOnPage),
        isFirstNotesPage: notesLines.length > 0
      });
    }

    // Helper function to render table header
    const renderTableHeader = (startY: number) => {
      doc.setFillColor(184, 230, 231);
      doc.rect(20, startY, 170, 8, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setTextColor("#0D909A");
      doc.setFontSize(9);
      doc.text('PRODUCT /', 22, startY + 3);
      doc.text('SERVICES', 22, startY + 6);
      doc.text('DESCRIPTION', 60, startY + 5);
      doc.text('QTY', 150, startY + 5, { align: 'center' });
      doc.text('UNIT', 168, startY + 3, { align: 'right' });
      doc.text('PRICE', 168, startY + 6, { align: 'right' });
      doc.text('AMOUNT', 185, startY + 5, { align: 'right' });
    };

    // Helper function to render terms and totals - notes use full page width (170mm)
    const renderTermsAndTotals = (startY: number, notesLines?: string[], isFirstNotesPage?: boolean) => {
      doc.setDrawColor('#e0e0e0');
      doc.setLineWidth(0.2);
      for (let i = 20; i < 190; i += 1.5) {
        doc.line(i, startY, i + 0.75, startY);
      }

      const yPos = startY + 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('Terms & Conditions', 20, yPos);

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

      doc.setDrawColor(0, 0, 0);
      doc.line(20, yPos + 50, 85, yPos + 50);
      doc.text("Client's Signature & Company Stamp", 20, yPos + 55);

      // Notes Section - full page width (170mm), label only on first notes page
      if (notesLines && notesLines.length > 0) {
        if (isFirstNotesPage) {
          doc.setFont('helvetica', 'bold');
          doc.text('Notes:', 20, yPos + 62);
          doc.setFont('helvetica', 'normal');
          doc.text(notesLines, 20, yPos + 67);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.text(notesLines, 20, yPos + 62);
        }
      }

      const totalsLabelX = 100;
      const totalsValueX = 185;
      doc.text('SUBTOTAL', totalsLabelX, yPos + 5);
      doc.text(subtotal.toFixed(2), totalsValueX, yPos + 5, { align: 'right' });

      doc.text(`GST ${currentInvoiceGstPercent}%`, totalsLabelX, yPos + 10);
      doc.text(gst.toFixed(2), totalsValueX, yPos + 10, { align: 'right' });

      doc.text('TOTAL', totalsLabelX, yPos + 15);
      doc.text(selectedOrder.total_amount.toFixed(2), totalsValueX, yPos + 15, { align: 'right' });

      doc.text('BALANCE DUE', totalsLabelX, yPos + 23);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${selectedOrder.total_amount.toFixed(2)}`, totalsValueX, yPos + 23, { align: 'right' });
    };

    // Helper function to render notes overflow page - NO label, just continue text
    const renderNotesOverflow = (notesLines: string[]) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      // No label - just continue the notes text from top of page
      doc.text(notesLines, 20, 20);
    };

    // Render each page
    pages.forEach((page, pageIndex) => {
      if (pageIndex > 0) {
        doc.addPage();
      }

      let yPos: number;

      if (page.showHeader) {
        renderHeaderInPDF(doc, selectedHeader, logoBase64);

        doc.setFontSize(16);
        doc.setTextColor("#0D909A");
        doc.text('Invoice', 20, 57 - headerOffset);
        doc.setTextColor(0, 0, 0);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('BILL TO', 20, 67 - headerOffset);
        doc.setFont('helvetica', 'normal');
        doc.text(clientData.client_operationName || 'N/A', 20, 72 - headerOffset);
        const billAddress = doc.splitTextToSize(clientData.client_billing_address || 'N/A', 45);
        doc.text(billAddress, 20, 77 - headerOffset);

        doc.setFont('helvetica', 'bold');
        doc.text('SHIP TO', 75, 67 - headerOffset);
        doc.setFont('helvetica', 'normal');
        doc.text(clientData.client_operationName || 'N/A', 75, 72 - headerOffset);
        const shipAddressParts = [
          clientData.ad_streetName,
          clientData.ad_country,
          clientData.ad_postal
        ].filter(Boolean).join(', ') || selectedOrder.delivery_address || 'N/A';
        const shipAddress = doc.splitTextToSize(shipAddressParts, 45);
        doc.text(shipAddress, 75, 77 - headerOffset);

        const labelX = 155;
        const valueX = 157;
        doc.setFont('helvetica', 'bold');
        doc.text('INVOICE NO.', labelX, 67 - headerOffset, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.text(selectedOrder.invoice_id, valueX, 67 - headerOffset);

        doc.setFont('helvetica', 'bold');
        doc.text('DATE', labelX, 72 - headerOffset, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.text(formatDate(selectedOrder.delivery_date), valueX, 72 - headerOffset);

        doc.setFont('helvetica', 'bold');
        doc.text('DUE DATE', labelX, 77 - headerOffset, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.text(formatDate(selectedOrder.delivery_date), valueX, 77 - headerOffset);

        doc.setFont('helvetica', 'bold');
        doc.text('TERMS', labelX, 82 - headerOffset, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.text('Due on receipt', valueX, 82 - headerOffset);

        doc.setDrawColor(77, 184, 186);
        doc.line(20, 87 - headerOffset, 190, 87 - headerOffset);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('SHIP DATE', 20, 93 - headerOffset);
        doc.setFont('helvetica', 'normal');
        doc.text(formatDate(selectedOrder.delivery_date), 20, 98 - headerOffset);
        doc.setFont('helvetica', 'bold');
        doc.text('TRACKING NO.', 100, 93 - headerOffset);
        doc.setFont('helvetica', 'normal');
        doc.text(selectedOrder.tracking_no, 100, 98 - headerOffset);

        yPos = 104 - headerOffset;
      } else {
        yPos = 20;
      }

      // Render table if there are items
      if (page.items.length > 0) {
        renderTableHeader(yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        yPos += 13;

        page.items.forEach((item) => {
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
      }

      // Render terms and totals on designated page
      if (page.showTerms) {
        renderTermsAndTotals(yPos + 2, page.notesLines, page.isFirstNotesPage);
      }

      // Render notes overflow page
      if (page.isNotesOverflow && page.notesLines) {
        renderNotesOverflow(page.notesLines);
      }

      // Render footer on every page
      renderFooterInPDF(doc, selectedFooter);
    });

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
      .select('client_operationName, client_billing_address, client_person_incharge, ad_streetName, ad_country, ad_postal')
      .eq('client_auth_id', order.client_auth_id)
      .single();

    // Fetch order items - explicitly select all needed columns including product_type and gelato_type
    const { data: items, error: itemsError } = await supabase
      .from('client_order_item')
      .select('id, order_id, product_id, product_name, product_type, gelato_type, quantity, unit_price, subtotal, calculated_weight')
      .eq('order_id', order.id);

    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
      throw itemsError;
    }

    console.log('Fetched order items for invoice:', items);

    // Map items - use order item values directly (these are the edited values)
    const itemsWithDetails = await Promise.all((items || []).map(async (item) => {
      // Default fallbacks
      let fallbackProductType = item.product_name;
      let fallbackGelatoType = 'Dairy';

      // Only fetch from product_list for fallback values if product_type/gelato_type are not set
      if (item.product_id && (!item.product_type || !item.gelato_type)) {
        const { data: productData } = await supabase
          .from('product_list')
          .select('product_type, product_gelato_type')
          .eq('id', item.product_id)
          .single();

        if (productData) {
          fallbackProductType = productData.product_type || item.product_name;
          fallbackGelatoType = productData.product_gelato_type || 'Dairy';
        }
      }

      // IMPORTANT: Use order item values directly - these are the edited values
      const itemProductType = item.product_type;
      const itemGelatoType = item.gelato_type;
      const itemProductName = item.product_name;

      // Only use fallback if order item value is null/undefined/empty
      const finalProductType = (itemProductType !== null && itemProductType !== undefined && itemProductType !== '')
        ? itemProductType
        : fallbackProductType;
      const finalGelatoType = (itemGelatoType !== null && itemGelatoType !== undefined && itemGelatoType !== '')
        ? itemGelatoType
        : fallbackGelatoType;

      console.log(`Item ${item.id}: product_name="${itemProductName}", product_type="${finalProductType}"`);

      return {
        id: item.id,
        product_id: item.product_id,
        product_name: itemProductName,
        product_type: finalProductType,
        gelato_type: finalGelatoType,
        // Use the order item's product_name for billing name display (this is the edited value)
        product_billingName: itemProductName,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        calculated_weight: item.calculated_weight
      };
    }));

    console.log('Final items with details for invoice:', itemsWithDetails);

    // Combine client data - use order's addresses if available, otherwise fall back to client's
    const combinedClientData = {
      ...client,
      // Map client_operationName to client_businessName for invoice display
      client_businessName: client?.client_operationName || '',
      // Use order's billing_address for Bill To if available
      client_billing_address: order.billing_address || client?.client_billing_address || '',
      // Use order's Ship To address fields if available
      ad_streetName: order.ad_streetName || client?.ad_streetName || '',
      ad_country: order.ad_country || client?.ad_country || '',
      ad_postal: order.ad_postal || client?.ad_postal || ''
    };

    setClientData(combinedClientData);
    setOrderItems(itemsWithDetails);
    setSelectedOrder(order);
    // Calculate GST percentage from stored total if possible, otherwise use default from localStorage or 9%
    const subtotal = itemsWithDetails.reduce((sum, item) => sum + item.subtotal, 0);
    if (subtotal > 0 && order.total_amount > subtotal) {
      const derivedGst = ((order.total_amount - subtotal) / subtotal) * 100;
      setCurrentInvoiceGstPercent(Math.round(derivedGst * 100) / 100); // Round to 2 decimal places
    } else {
      // Use saved default GST or fallback to 9%
      const savedGst = localStorage.getItem('defaultGstPercent_client');
      const defaultGst = savedGst ? parseFloat(savedGst) : 9;
      setCurrentInvoiceGstPercent(!isNaN(defaultGst) ? defaultGst : 9);
    }

    // Load saved header for this specific invoice, or use default
    const savedHeaderId = invoiceHeaders[order.invoice_id];
    if (savedHeaderId && headerOptions.some(h => h.id === savedHeaderId)) {
      setSelectedHeaderId(savedHeaderId);
    } else {
      // Use default header
      const defaultHeader = headerOptions.find(h => h.is_default) || headerOptions[0];
      if (defaultHeader) {
        setSelectedHeaderId(defaultHeader.id);
      }
    }

    setShowInvoiceModal(true);
  } catch (error) {
    console.error('Error loading invoice:', error);
    alert('Failed to load invoice');
  }
};

  const getSubtotal = (items) => {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const getGST = (items, gstPercentage?: number) => {
    const subtotal = getSubtotal(items);
    // Use order's GST percentage if available, otherwise default to 9%
    const gstRate = gstPercentage !== undefined ? gstPercentage / 100 : 0.09;
    return subtotal * gstRate;
  };

  // Open Edit Invoice modal with current data
  const handleOpenEditInvoice = () => {
    if (!selectedOrder || !orderItems) return;

    // Use the current invoice GST percentage
    setEditInvoiceGstPercent(currentInvoiceGstPercent);
    setEditInvoiceItems(orderItems.map(item => ({
      id: item.id,
      product_name: item.product_name,
      product_type: item.product_type || '',
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal
    })));

    // Check if this invoice's GST matches the saved default - if so, check the checkbox
    const savedGst = localStorage.getItem('defaultGstPercent_client');
    const savedGstValue = savedGst ? parseFloat(savedGst) : 9;
    setApplyGstToFutureOrders(currentInvoiceGstPercent === savedGstValue);

    // Initialize address fields from clientData
    if (clientData) {
      setEditBillToAddress(clientData.client_billing_address || '');
      const shipToAddress = [clientData.ad_streetName, clientData.ad_country, clientData.ad_postal]
        .filter(Boolean)
        .join(', ') || selectedOrder.delivery_address || '';
      setEditShipToAddress(shipToAddress);
    }
    setApplyAddressToFutureOrders(false);

    setShowEditInvoiceModal(true);
  };

  // Update an edit invoice item
  const handleEditInvoiceItemChange = (index: number, field: string, value: string | number) => {
    setEditInvoiceItems(prev => {
      const updated = [...prev];
      if (field === 'quantity' || field === 'unit_price') {
        const numValue = parseFloat(String(value)) || 0;
        updated[index] = {
          ...updated[index],
          [field]: numValue,
          subtotal: field === 'quantity'
            ? numValue * updated[index].unit_price
            : updated[index].quantity * numValue
        };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  // Save edited invoice data
  const handleSaveEditInvoice = async () => {
    if (!selectedOrder) return;

    setIsSavingInvoice(true);
    try {
      // Calculate new totals
      const newSubtotal = editInvoiceItems.reduce((sum, item) => sum + item.subtotal, 0);
      const newGst = newSubtotal * (editInvoiceGstPercent / 100);
      const newTotal = newSubtotal + newGst;

      // Update order items in database
      for (const item of editInvoiceItems) {
        const { error: itemError } = await supabase
          .from('client_order_item')
          .update({
            product_name: item.product_name,
            product_type: item.product_type,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal
          })
          .eq('id', item.id);

        if (itemError) {
          console.error('Error updating order item:', itemError);
          throw itemError;
        }
      }

      // Update order with new total and GST percentage
      const { error: orderError } = await supabase
        .from('client_order')
        .update({
          total_amount: newTotal
        })
        .eq('id', selectedOrder.id);

      if (orderError) {
        console.error('Error updating order:', orderError);
        throw orderError;
      }

      // Update local state
      setOrderItems(editInvoiceItems.map(item => ({
        ...orderItems.find(oi => oi.id === item.id),
        ...item
      })));

      setSelectedOrder(prev => ({
        ...prev,
        total_amount: newTotal
      }));

      // Update the current invoice GST percentage
      setCurrentInvoiceGstPercent(editInvoiceGstPercent);

      // If "Apply to future orders" is checked, save to localStorage
      if (applyGstToFutureOrders) {
        localStorage.setItem('defaultGstPercent_client', editInvoiceGstPercent.toString());
      }

      // Update local clientData with edited addresses for this invoice display
      setClientData(prev => ({
        ...prev,
        client_billing_address: editBillToAddress,
        ad_streetName: editShipToAddress,
        ad_country: '',
        ad_postal: ''
      }));

      // If "Apply to all upcoming orders" is checked, update client's default addresses in database
      if (applyAddressToFutureOrders && selectedOrder.client_auth_id) {
        const { error: clientUpdateError } = await supabase
          .from('client_user')
          .update({
            client_billing_address: editBillToAddress,
            ad_streetName: editShipToAddress
          })
          .eq('client_auth_id', selectedOrder.client_auth_id);

        if (clientUpdateError) {
          console.error('Error updating client addresses:', clientUpdateError);
        }
      }

      // Update this order's addresses in database (both billing_address and delivery_address)
      const { error: addressError } = await supabase
        .from('client_order')
        .update({
          delivery_address: editShipToAddress,
          billing_address: editBillToAddress
        })
        .eq('id', selectedOrder.id);

      if (addressError) {
        console.error('Error updating order address:', addressError);
      }

      // Refresh orders list
      const { data: refreshedOrders } = await supabase
        .from('client_order')
        .select(`
          id,
          order_id,
          client_auth_id,
          order_date,
          delivery_date,
          delivery_address,
          billing_address,
          ad_streetName,
          ad_country,
          ad_postal,
          total_amount,
          status,
          notes,
          invoice_id,
          tracking_no,
          created_at,
          updated_at,
          client_user!client_order_client_auth_id_fkey(client_operationName)
        `)
        .order('order_date', { ascending: false });

      if (refreshedOrders) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ordersWithCompany = refreshedOrders.map((order: any) => {
          let companyName = 'N/A';
          if (order.client_user) {
            if (Array.isArray(order.client_user)) {
              companyName = order.client_user[0]?.client_operationName || 'N/A';
            } else {
              companyName = order.client_user.client_operationName || 'N/A';
            }
          }
          return { ...order, company_name: companyName };
        });
        setOrders(ordersWithCompany);
      }

      setShowEditInvoiceModal(false);
      setSuccessMessage('Invoice updated successfully');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Failed to save invoice changes');
    } finally {
      setIsSavingInvoice(false);
    }
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 p-6 overflow-auto" style={{ backgroundColor: '#FCF0E3' }}>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6 relative z-10">
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
                  ref={sortButtonRef}
                  onClick={() => {
                    if (!showSortDropdown && sortButtonRef.current) {
                      const rect = sortButtonRef.current.getBoundingClientRect();
                      setSortDropdownPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
                    }
                    setShowSortDropdown(!showSortDropdown);
                    setShowFilterDropdown(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ChevronDown size={20} />
                  <span>Sort</span>
                </button>

                {showSortDropdown && (
                  <div
                    className="fixed w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-[100]"
                    style={{ top: sortDropdownPos.top, right: sortDropdownPos.right }}
                  >
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
                  ref={filterButtonRef}
                  onClick={() => {
                    if (!showFilterDropdown && filterButtonRef.current) {
                      const rect = filterButtonRef.current.getBoundingClientRect();
                      setFilterDropdownPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
                    }
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
                  <div
                    className="fixed w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-[100]"
                    style={{ top: filterDropdownPos.top, right: filterDropdownPos.right }}
                  >
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
                disabled={!canEditOrders}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-opacity"
                style={{
                  backgroundColor: canEditOrders ? '#FF5722' : '#ccc',
                  cursor: canEditOrders ? 'pointer' : 'not-allowed',
                  opacity: canEditOrders ? 1 : 0.6
                }}
                title={!canEditOrders ? 'You do not have permission to create orders' : ''}
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

            {/* Table Container */}
            <div className="border border-gray-200 rounded-lg">
              {/* Sticky Header + Scrollbar Container */}
              <div style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#ffffff' }}>
                {/* Header Table */}
                <div
                  ref={headerScrollRef}
                  className="overflow-x-auto overflow-y-hidden"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  onScroll={() => syncScroll('header')}
                >
                  <table className="w-full table-fixed min-w-[1400px]">
                    <thead className="bg-white">
                      <tr className="border-b-2" style={{ borderColor: '#5C2E1F' }}>
                        <th className="text-left py-3 px-2 w-[40px]">
                          <input
                            type="checkbox"
                            className={`w-4 h-4 ${canEditOrders ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                            checked={selectedRows.size === currentOrders.length && currentOrders.length > 0}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            disabled={!canEditOrders}
                          />
                        </th>
                        <th className="text-left py-3 px-2 font-bold text-xs w-[180px]" style={{ color: '#5C2E1F' }}>
                          COMPANY NAME
                        </th>
                        <th className="text-left py-3 px-2 font-bold text-xs w-[100px]" style={{ color: '#5C2E1F' }}>
                          ORDER DATE
                        </th>
                        <th className="text-left py-3 px-2 font-bold text-xs w-[100px]" style={{ color: '#5C2E1F' }}>
                          DELIVERY DATE
                        </th>
                        <th className="text-left py-3 px-2 font-bold text-xs w-[200px]" style={{ color: '#5C2E1F' }}>
                          DELIVERY ADDRESS
                        </th>
                        <th className="text-left py-3 px-2 font-bold text-xs w-[90px]" style={{ color: '#5C2E1F' }}>
                          AMOUNT ($)
                        </th>
                        <th className="text-left py-3 px-2 font-bold text-xs w-[100px]" style={{ color: '#5C2E1F' }}>
                          STATUS
                        </th>
                        <th className="text-left py-3 px-2 font-bold text-xs w-[100px]" style={{ color: '#5C2E1F' }}>
                          TRACKING NO
                        </th>
                        <th className="text-left py-3 px-2 font-bold text-xs w-[100px]" style={{ color: '#5C2E1F' }}>
                          INVOICE
                        </th>
                        <th className="text-left py-3 px-2 font-bold text-xs w-[70px]" style={{ color: '#5C2E1F' }}>
                          LABEL
                        </th>
                        <th className="text-left py-3 px-2 font-bold text-xs w-[90px]" style={{ color: '#5C2E1F' }}>
                          STICKER
                        </th>
                        <th className="text-left py-3 px-2 font-bold text-xs w-[70px]" style={{ color: '#5C2E1F' }}>
                          XERO
                        </th>
                        <th className="text-left py-3 px-2 font-bold text-xs w-[50px]" style={{ color: '#5C2E1F' }}>
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                  </table>
                </div>

                {/* Horizontal Scrollbar */}
                <div
                  ref={scrollbarRef}
                  className="overflow-x-auto overflow-y-hidden"
                  style={{
                    height: '16px',
                    scrollbarWidth: 'auto',
                    scrollbarColor: '#5C2E1F #f1f1f1',
                    backgroundColor: '#f9fafb',
                    borderBottom: '1px solid #e5e7eb'
                  }}
                  onScroll={() => syncScroll('scrollbar')}
                >
                  <div style={{ width: '1400px', height: '1px' }}></div>
                </div>
              </div>

              {/* Body Table */}
              <div
                ref={bodyScrollRef}
                className="overflow-x-auto overflow-y-hidden"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                onScroll={() => syncScroll('body')}
              >
                <table className="w-full table-fixed min-w-[1400px]">
                  <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="p-0">
                    <SkeletonStyles />
                    <TableSkeleton rows={8} columns={10} />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={12} className="text-center py-8">
                    <div className="text-red-500 font-medium">Error loading orders</div>
                    <div className="text-sm text-gray-600 mt-1">{error}</div>
                  </td>
                </tr>
              ) : currentOrders.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-8 text-gray-500">
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
                        <td className="py-3 px-2 w-[40px]">
                          <input
                            type="checkbox"
                            className={`w-4 h-4 ${canEditOrders ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                            checked={selectedRows.has(order.id)}
                            onChange={(e) => handleSelectRow(order.id, e.target.checked)}
                            disabled={!canEditOrders}
                          />
                        </td>
                        <td className="py-3 px-2 text-xs w-[180px]" title={order.company_name}>
                          <div className="truncate">{order.company_name}</div>
                        </td>
                        <td className="py-3 px-2 text-xs w-[100px] whitespace-nowrap">
                          {formatDate(order.order_date)}
                        </td>
                        <td className="py-3 px-2 text-xs w-[100px] whitespace-nowrap">
                          {formatDate(order.delivery_date)}
                        </td>
                        <td className="py-3 px-2 text-xs w-[200px]" title={order.delivery_address || ''}>
                          <div className="truncate">{order.delivery_address || '-'}</div>
                        </td>
                        <td className="py-3 px-2 text-xs font-medium w-[90px] whitespace-nowrap">
                          ${formatCurrency(order.total_amount)}
                        </td>
                        <td className="py-3 px-2 w-[100px]">
                          <select
                            value={order.status || 'pending'}
                            onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                            disabled={updatingStatus[order.id] || !canEditOrders}
                            className={`px-2 py-1 text-xs font-semibold rounded border-0 ${getStatusBadge(order.status)} ${
                              updatingStatus[order.id] ? 'opacity-50 cursor-wait' : ''
                            } ${!canEditOrders ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                            title={!canEditOrders ? 'You do not have permission to change status' : ''}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="py-3 px-2 text-xs w-[100px]">
                          <div className="truncate">{order.tracking_no || '-'}</div>
                        </td>
                        <td className="py-3 px-2 w-[100px]">
                          {order.invoice_id ? (
                            <button
                              onClick={() => handleViewInvoice(order)}
                              className="text-xs font-normal text-blue-700 hover:underline cursor-pointer transition-all"
                            >
                              View
                            </button>
                          ) : (
                            <span className="text-xs font-normal text-gray-500">
                              -
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 w-[70px]">
                          <button
                            onClick={() => handleGenerateLabels(order)}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                            title="Generate Product Labels"
                          >
                            Labels
                          </button>
                        </td>
                        <td className="py-3 px-2 w-[90px] relative">
                          <div className="relative inline-block">
                            <button
                              onClick={() => setShowStickerDropdown(showStickerDropdown === order.id ? null : order.id)}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                              title="Sticker Options"
                            >
                              <Tag size={12} />
                              Sticker
                              <ChevronDown size={12} />
                            </button>
                            {showStickerDropdown === order.id && (
                              <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[140px]">
                                <button
                                  onClick={() => {
                                    handleOpenNewStickerModal(order.id, "barcode");
                                    setShowStickerDropdown(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 rounded-t-lg"
                                >
                                  Barcode Sticker
                                </button>
                                <button
                                  onClick={() => {
                                    handleOpenNewStickerModal(order.id, "product");
                                    setShowStickerDropdown(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 rounded-b-lg"
                                >
                                  Product Sticker
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2 w-[70px]">
                          {/* Xero payment status badge — auto shown when synced */}
                          {order.xero_invoice_id && xeroInvoiceMap[order.xero_invoice_id] && (() => {
                            const xs = xeroInvoiceMap[order.xero_invoice_id];
                            const color =
                              xs.Status === 'PAID' ? 'bg-green-100 text-green-700' :
                              xs.Status === 'AUTHORISED' ? 'bg-blue-100 text-blue-700' :
                              xs.Status === 'VOIDED' ? 'bg-red-100 text-red-600' :
                              'bg-gray-100 text-gray-500';
                            return (
                              <div className={`text-xs font-semibold px-1 py-0.5 rounded mb-1 text-center ${color}`}>
                                {xs.Status === 'AUTHORISED' ? 'APPROVED' : xs.Status}
                              </div>
                            );
                          })()}
                          <button
                            onClick={() => handleSyncRowToXero(order)}
                            disabled={syncingRowXero[order.id]}
                            title={order.xero_invoice_id ? `Synced to Xero (${order.xero_invoice_id}) — click to re-sync` : 'Sync to Xero'}
                            className={`flex items-center gap-1 px-2 py-1 text-xs rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              order.xero_invoice_id
                                ? 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-teal-100 hover:text-teal-700'
                            }`}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={syncingRowXero[order.id] ? 'animate-spin' : ''}>
                              <path d="M21 2v6h-6"/>
                              <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
                              <path d="M3 22v-6h6"/>
                              <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
                            </svg>
                            {syncingRowXero[order.id] ? '...' : order.xero_invoice_id ? 'Synced' : 'Sync'}
                          </button>
                        </td>
                        <td className="py-3 px-2 w-[50px]">
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
                          <td className="py-2 px-2 text-xs font-bold text-center" style={{ color: 'gray' }}>STICKER</td>
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
                            <td className="py-2 px-2 text-center relative">
                              <div className="relative inline-block">
                                <button
                                  onClick={() => setShowItemStickerDropdown(showItemStickerDropdown === `${order.id}-${index}` ? null : `${order.id}-${index}`)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-white rounded hover:opacity-80 transition-opacity"
                                  style={{ backgroundColor: '#10B981' }}
                                  title={`Generate ${item.quantity} sticker(s)`}
                                >
                                  <Tag size={12} />
                                  <span>x{item.quantity}</span>
                                  <ChevronDown size={10} />
                                </button>
                                {showItemStickerDropdown === `${order.id}-${index}` && (
                                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[140px]">
                                    <button
                                      onClick={() => handleItemStickerModal(item, order.id, order.order_date, "barcode")}
                                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 rounded-t-lg"
                                    >
                                      Barcode Sticker
                                    </button>
                                    <button
                                      onClick={() => handleItemStickerModal(item, order.id, order.order_date, "product")}
                                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 rounded-b-lg"
                                    >
                                      Product Sticker
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : expandedRows[order.id] ? (
                        <tr className="bg-white border-b border-gray-200">
                          <td className="py-2 px-2"></td>
                          <td colSpan={11} className="text-center py-4 text-gray-500 text-xs border-l border-gray-400">
                            Loading order items...
                          </td>
                        </tr>
                      ) : null}
                      {/* Notes Row */}
                      {expandedRows[order.id] && (
                        <tr className="bg-blue-50 border-b border-gray-200">
                          <td className="py-3 px-2"></td>
                          <td colSpan={11} className="py-3 px-2 border-l border-gray-400">
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-bold text-gray-700">NOTES:</span>
                              <span className="text-xs text-gray-600 flex-1">
                                {order.notes || 'No additional notes'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                  ))}
                </>
              )}
              
                </tbody>
                </table>
              </div>
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
                            onChange={() => selectedOrder && saveInvoiceHeader(selectedOrder.invoice_id, header.id)}
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
                        key={`invoice-${selectedOrder.id}-${orderItems.length}-${Date.now()}`}
                        order={{
                          ...selectedOrder,
                          items: orderItems.map(item => ({
                            id: item.id,
                            product_name: item.product_name,
                            product_type: item.product_type,
                            product_billingName: item.product_billingName,
                            quantity: item.quantity,
                            unit_price: item.unit_price,
                            subtotal: item.subtotal
                          }))
                        }}
                        clientData={clientData}
                        formatDate={formatDate}
                        getSubtotal={() => getSubtotal(orderItems)}
                        getGST={() => getGST(orderItems, currentInvoiceGstPercent)}
                        gstPercentage={currentInvoiceGstPercent}
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
                    onClick={handleOpenEditInvoice}
                    className="flex-1 px-4 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#5C2E1F' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                    </svg>
                    Edit Invoice
                  </button>
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
                    onClick={handleSyncToXero}
                    disabled={syncingToXero}
                    className="flex-1 px-4 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#1AB4B4' }}
                    title="Sync this invoice to Xero"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 2v6h-6"/>
                      <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
                      <path d="M3 22v-6h6"/>
                      <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
                    </svg>
                    {syncingToXero ? 'Syncing...' : 'Sync to Xero'}
                  </button>
                  <button
                    onClick={() => setShowInvoiceModal(false)}
                    className="flex-1 px-4 py-3 rounded-lg border-2 font-medium hover:bg-gray-50 transition-colors"
                    style={{ borderColor: '#5C2E1F', color: '#5C2E1F' }}
                  >
                    Close
                  </button>
                </div>
                {/* Xero sync result message */}
                {xeroSyncMessage && (
                  <div className={`mt-2 px-4 py-2 rounded-lg text-sm text-center font-medium ${
                    xeroSyncMessage.type === 'success' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-600'
                  }`}>
                    {xeroSyncMessage.text}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Edit Invoice Modal */}
          {showEditInvoiceModal && selectedOrder && (
            <div className="fixed inset-0 z-[60] overflow-auto flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
              <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 shrink-0 rounded-t-lg flex justify-between items-center">
                  <h3 className="text-xl font-bold" style={{ color: '#5C2E1F' }}>
                    Edit Invoice - {selectedOrder.invoice_id}
                  </h3>
                  <button
                    onClick={() => setShowEditInvoiceModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                  {/* GST Section */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-lg font-semibold mb-4" style={{ color: '#5C2E1F' }}>GST Settings</h4>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">GST Percentage:</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={editInvoiceGstPercent}
                          onChange={(e) => setEditInvoiceGstPercent(parseFloat(e.target.value) || 0)}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-center"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={applyGstToFutureOrders}
                          onChange={(e) => setApplyGstToFutureOrders(e.target.checked)}
                          className="w-4 h-4 accent-orange-500"
                        />
                        <span className="text-sm text-gray-700">Apply this GST rate to future orders</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Note: Changing GST will only affect this order. Previous orders will retain their original GST rates.
                    </p>
                  </div>

                  {/* Address Section */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-lg font-semibold mb-4" style={{ color: '#5C2E1F' }}>Invoice Address</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Bill To Address</label>
                        <textarea
                          value={editBillToAddress}
                          onChange={(e) => setEditBillToAddress(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                          placeholder="Enter billing address"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Ship To Address</label>
                        <textarea
                          value={editShipToAddress}
                          onChange={(e) => setEditShipToAddress(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                          placeholder="Enter shipping address"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyAddressToFutureOrders}
                        onChange={(e) => setApplyAddressToFutureOrders(e.target.checked)}
                        className="w-4 h-4 accent-orange-500"
                      />
                      <span className="text-sm text-gray-700">Apply to all upcoming orders (update client default address)</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-2">
                      Note: Addresses will be updated for this invoice. Check the box above to also update the client&apos;s default address for future orders.
                    </p>
                  </div>

                  {/* Order Items Table */}
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold mb-4" style={{ color: '#5C2E1F' }}>Order Items</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="text-left px-3 py-2 text-sm font-semibold text-gray-700 border-b">Product Type</th>
                            <th className="text-left px-3 py-2 text-sm font-semibold text-gray-700 border-b">Product Name</th>
                            <th className="text-center px-3 py-2 text-sm font-semibold text-gray-700 border-b w-24">Qty</th>
                            <th className="text-right px-3 py-2 text-sm font-semibold text-gray-700 border-b w-32">Unit Price</th>
                            <th className="text-right px-3 py-2 text-sm font-semibold text-gray-700 border-b w-32">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editInvoiceItems.map((item, index) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 border-b">
                                <input
                                  type="text"
                                  value={item.product_type}
                                  onChange={(e) => handleEditInvoiceItemChange(index, 'product_type', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm"
                                />
                              </td>
                              <td className="px-3 py-2 border-b">
                                <input
                                  type="text"
                                  value={item.product_name}
                                  onChange={(e) => handleEditInvoiceItemChange(index, 'product_name', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm"
                                />
                              </td>
                              <td className="px-3 py-2 border-b text-center">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleEditInvoiceItemChange(index, 'quantity', e.target.value)}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm text-center"
                                />
                              </td>
                              <td className="px-3 py-2 border-b text-right">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unit_price}
                                  onChange={(e) => handleEditInvoiceItemChange(index, 'unit_price', e.target.value)}
                                  className="w-28 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm text-right"
                                />
                              </td>
                              <td className="px-3 py-2 border-b text-right font-medium">
                                ${item.subtotal.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Totals Preview */}
                  <div className="flex justify-end">
                    <div className="w-64 bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between py-1 text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">${editInvoiceItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-1 text-sm">
                        <span className="text-gray-600">GST ({editInvoiceGstPercent}%):</span>
                        <span className="font-medium">${(editInvoiceItems.reduce((sum, item) => sum + item.subtotal, 0) * (editInvoiceGstPercent / 100)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-2 text-lg font-bold border-t border-gray-300 mt-2" style={{ color: '#5C2E1F' }}>
                        <span>Total:</span>
                        <span>${(editInvoiceItems.reduce((sum, item) => sum + item.subtotal, 0) * (1 + editInvoiceGstPercent / 100)).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 shrink-0 rounded-b-lg">
                  <button
                    onClick={handleSaveEditInvoice}
                    disabled={isSavingInvoice}
                    className="flex-1 px-4 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#FF5722' }}
                  >
                    {isSavingInvoice ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check size={20} />
                        Save Changes
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowEditInvoiceModal(false)}
                    className="flex-1 px-4 py-3 rounded-lg border-2 font-medium hover:bg-gray-50 transition-colors"
                    style={{ borderColor: '#5C2E1F', color: '#5C2E1F' }}
                  >
                    Cancel
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
                    billing_address,
                    ad_streetName,
                    ad_country,
                    ad_postal,
                    total_amount,
                    status,
                    notes,
                    invoice_id,
                    tracking_no,
                    created_at,
                    updated_at,
                    client_user!client_order_client_auth_id_fkey(client_operationName)
                  `)
                  .order('order_date', { ascending: false });

                if (supabaseError) throw supabaseError;

                if (data) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const ordersWithCompany = data.map((order: any) => {
                    let companyName = 'N/A';
                    if (order.client_user) {
                      if (Array.isArray(order.client_user)) {
                        companyName = order.client_user[0]?.client_operationName || 'N/A';
                      } else {
                        companyName = order.client_user.client_operationName || 'N/A';
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
                    disabled={loading || !canEditOrders}
                    className="flex items-center gap-1.5 text-white hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ padding: '2px 6px' }}
                    title={!canEditOrders ? 'You do not have permission to edit orders' : ''}
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
                disabled={loading || !canEditOrders}
                className="flex items-center gap-1.5 text-white hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ padding: '2px 6px' }}
                title={!canEditOrders ? 'You do not have permission to delete orders' : ''}
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

              // Clear cached order items to force re-fetch with updated data
              setRowOrderItems({});
              setExpandedRows({});

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
                      billing_address,
                      ad_streetName,
                      ad_country,
                      ad_postal,
                      total_amount,
                      status,
                      notes,
                      invoice_id,
                      tracking_no,
                      created_at,
                      updated_at,
                      client_user!client_order_client_auth_id_fkey(client_operationName)
                    `)
                    .order('order_date', { ascending: false });

                  if (supabaseError) throw supabaseError;

                  if (data) {
                    const ordersWithCompany = data.map((order: SupabaseOrderResponse): Order => {
                      let companyName = 'N/A';
                      if (order.client_user) {
                        if (Array.isArray(order.client_user)) {
                          companyName = order.client_user[0]?.client_operationName || 'N/A';
                        } else {
                          companyName = order.client_user.client_operationName || 'N/A';
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

          {/* Status Change Confirmation Modal */}
          {showStatusConfirmModal && statusChangeData && (
            <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
              <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                <div className="flex justify-center mb-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                    statusChangeData.newStatus === 'Completed' ? 'bg-green-100' :
                    statusChangeData.newStatus === 'Cancelled' ? 'bg-red-100' :
                    'bg-orange-100'
                  }`}>
                    {statusChangeData.newStatus === 'Completed' ? (
                      <Check size={28} className="text-green-600" />
                    ) : statusChangeData.newStatus === 'Cancelled' ? (
                      <X size={28} className="text-red-600" />
                    ) : (
                      <svg className="w-7 h-7 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-center mb-3" style={{ color: '#5C2E1F' }}>
                  Confirm Status Change
                </h3>
                <div className={`rounded-lg p-4 mb-4 ${
                  statusChangeData.newStatus === 'Completed' ? 'bg-green-50 border border-green-200' :
                  statusChangeData.newStatus === 'Cancelled' ? 'bg-red-50 border border-red-200' :
                  'bg-orange-50 border border-orange-200'
                }`}>
                  <p className="text-sm text-gray-700 text-center">
                    You are about to change the status of order
                  </p>
                  <p className="text-sm font-bold text-center mt-1" style={{ color: '#5C2E1F' }}>
                    {statusChangeData.orderInvoiceId}
                  </p>
                  <p className="text-sm text-gray-700 text-center mt-2">
                    to <span className={`font-bold ${
                      statusChangeData.newStatus === 'Completed' ? 'text-green-600' :
                      statusChangeData.newStatus === 'Cancelled' ? 'text-red-600' :
                      'text-orange-600'
                    }`}>{statusChangeData.newStatus}</span>
                  </p>
                </div>
                {(statusChangeData.newStatus === 'Completed' || statusChangeData.newStatus === 'Cancelled') && (
                  <p className="text-xs text-center text-gray-500 mb-4">
                    This order will be moved to the bottom of the list.
                  </p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={handleCancelStatusChange}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    style={{ color: '#5C2E1F' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmStatusChange}
                    disabled={updatingStatus[statusChangeData.orderId]}
                    className={`flex-1 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 ${
                      statusChangeData.newStatus === 'Completed' ? 'bg-green-600' :
                      statusChangeData.newStatus === 'Cancelled' ? 'bg-red-600' :
                      'bg-orange-600'
                    }`}
                  >
                    {updatingStatus[statusChangeData.orderId] ? 'Updating...' : 'Confirm'}
                  </button>
                </div>
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
            <div
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              onClick={() => setIsEditSuccessOpen(false)}
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
                    Order updated successfully!
                  </p>
                  <button
                    onClick={() => setIsEditSuccessOpen(false)}
                    className="w-full px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#FF5722' }}
                  >
                    OK
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
              className="fixed inset-0 flex items-center justify-center z-50"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            >
              <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
                <h3 className="font-bold text-lg mb-4">Edit Header</h3>
                <p className="text-gray-600 mb-4">
                  Do you want to edit &quot;{headerToEdit.option_name}&quot;?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowEditConfirmModal(false);
                      setHeaderToEdit(null);
                    }}
                    className="flex-1 border border-gray-300 py-2 rounded hover:bg-gray-50"
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
                    className="flex-1 bg-orange-500 text-white py-2 rounded hover:bg-orange-600"
                  >
                    Edit
                  </button>
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
              className="fixed inset-0 flex items-center justify-center z-50"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            >
              <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
                <h3 className="font-bold text-lg mb-4">Edit Footer</h3>
                <p className="text-gray-600 mb-4">
                  Do you want to edit &quot;{footerToEdit.option_name}&quot;?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowFooterEditConfirmModal(false);
                      setFooterToEdit(null);
                    }}
                    className="flex-1 border border-gray-300 py-2 rounded hover:bg-gray-50"
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
                    className="flex-1 bg-orange-500 text-white py-2 rounded hover:bg-orange-600"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sticker Preview Modal */}
          {showStickerPreview && stickerPreviewData && (
            <div
              className="fixed inset-0 flex items-center justify-center z-50"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              onClick={closeStickerPreview}
            >
              <div
                className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold" style={{ color: '#5C2E1F' }}>
                    Sticker Preview
                  </h2>
                  <button
                    onClick={closeStickerPreview}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                  {stickerPreviewData.allOrderItems && stickerPreviewData.allOrderItems.length > 0 ? (
                    <>
                      <p className="font-semibold mb-2">Sticker Contents ({stickerPreviewData.quantity} sticker(s)):</p>
                      <div className="max-h-32 overflow-y-auto">
                        {stickerPreviewData.allOrderItems.map((item, idx) => (
                          <div key={idx} className="mb-2 p-2 bg-white rounded border text-xs">
                            <p><strong>Product:</strong> {item.productName} (x{item.quantity})</p>
                            <p><strong>Ingredients:</strong> {item.ingredients.substring(0, 100)}{item.ingredients.length > 100 ? '...' : ''}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <p><strong>Product:</strong> {stickerPreviewData.productName}</p>
                      <p><strong>Quantity:</strong> {stickerPreviewData.quantity} sticker(s)</p>
                      <p><strong>Ingredients:</strong> {stickerPreviewData.stickerData.ingredients}</p>
                      <p><strong>BBD Code:</strong> {stickerPreviewData.stickerData.bbdCode}</p>
                      <p><strong>PBN Code:</strong> {stickerPreviewData.stickerData.pbnCode}</p>
                    </>
                  )}
                </div>

                {/* PDF Preview */}
                <div className="flex justify-center mb-4 p-4 bg-gray-100 rounded-lg">
                  <embed
                    src={`${stickerPreviewUrl}#view=FitH&zoom=page-fit`}
                    type="application/pdf"
                    className="border border-gray-300 rounded bg-white"
                    style={{ width: '500px', height: '300px' }}
                  />
                </div>

                <p className="text-xs text-gray-500 text-center mb-4">
                  Sticker size: 3cm x 1.5cm | {stickerPreviewData.quantity} page(s)
                </p>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleDownloadSticker}
                    className="flex-1 px-4 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#FF5722' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7,10 12,15 17,10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download PDF
                  </button>
                  <button
                    onClick={closeStickerPreview}
                    className="flex-1 px-4 py-2 border-2 rounded font-medium hover:bg-gray-50 transition-colors"
                    style={{ borderColor: '#5C2E1F', color: '#5C2E1F' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* New Sticker Types Modal (Barcode & Product Stickers) - Same layout as Product List */}
          {showNewStickerModal && (
            <div
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              onClick={closeNewStickerModal}
            >
              <div
                className="bg-white rounded-lg max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold" style={{ color: '#5C2E1F' }}>
                    Sticker Preview
                  </h2>
                  <button
                    onClick={closeNewStickerModal}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {isGeneratingNewSticker ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    <span className="ml-3 text-gray-600">Generating sticker...</span>
                  </div>
                ) : (
                  <>
                    {/* Order Info */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                      <p><strong>Order:</strong> {newStickerOrderId}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Order Date: {newStickerOrderDate}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Products: {newStickerItems.map(item => `${item.productName} x${item.quantity}`).join(', ')}
                      </p>
                    </div>

                    {/* Sticker Type Selector */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2" style={{ color: "#5C2E1F" }}>
                        Sticker Type
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setNewStickerType("barcode");
                            regenerateBarcodeStickerPreview();
                          }}
                          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                            newStickerType === "barcode"
                              ? "bg-orange-500 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          Barcode Sticker
                        </button>
                        <button
                          onClick={() => {
                            setNewStickerType("product");
                            regenerateProductStickerPreview();
                          }}
                          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                            newStickerType === "product"
                              ? "bg-orange-500 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          Product Sticker
                        </button>
                      </div>
                    </div>

                    {/* Barcode Sticker Section */}
                    {newStickerType === "barcode" && (
                      <>
                        <div className="mb-4 p-4 border border-orange-200 rounded-lg bg-orange-50">
                          <h3 className="text-sm font-semibold mb-3" style={{ color: "#5C2E1F" }}>
                            Barcode Sticker Settings
                          </h3>
                          <p className="text-xs text-gray-600">
                            13-digit barcode generated from product ID. Same barcode for the same product across all orders.
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            Total: {totalStickerCount} sticker(s)
                          </p>
                        </div>

                        {/* Update Preview Button */}
                        <div className="mb-4">
                          <button
                            onClick={regenerateBarcodeStickerPreview}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
                            </svg>
                            Update Preview
                          </button>
                        </div>

                        {/* Barcode Sticker Preview */}
                        <div className="flex justify-center mb-4 p-4 bg-gray-100 rounded-lg">
                          {barcodeStickerPreviewUrl ? (
                            <embed
                              src={`${barcodeStickerPreviewUrl}#view=FitH&zoom=page-fit`}
                              type="application/pdf"
                              className="border border-gray-300 rounded bg-white"
                              style={{ width: '500px', height: '280px' }}
                            />
                          ) : (
                            <div className="text-gray-500 py-8">Click &quot;Update Preview&quot; to generate sticker</div>
                          )}
                        </div>

                        {/* Size Info */}
                        <p className="text-xs text-gray-500 text-center mb-4">
                          Sticker size: 3cm x 1.5cm
                        </p>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          <button
                            onClick={handleDownloadBarcodeStickers}
                            className="flex-1 px-4 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            style={{ backgroundColor: '#FF5722' }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7,10 12,15 17,10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download PDF
                          </button>
                          <button
                            onClick={closeNewStickerModal}
                            className="flex-1 px-4 py-2 border-2 rounded font-medium hover:bg-gray-50 transition-colors"
                            style={{ borderColor: '#5C2E1F', color: '#5C2E1F' }}
                          >
                            Close
                          </button>
                        </div>
                      </>
                    )}

                    {/* Product Sticker Section */}
                    {newStickerType === "product" && (
                      <>
                        <div className="mb-4 p-4 border border-orange-200 rounded-lg bg-orange-50">
                          <h3 className="text-sm font-semibold mb-3" style={{ color: "#5C2E1F" }}>
                            Product Sticker Settings
                          </h3>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <p className="text-gray-600"><strong>BBD (Best Before Date)</strong></p>
                              <p className="text-gray-500">Calculated from order date + shelf life</p>
                            </div>
                            <div>
                              <p className="text-gray-600"><strong>GPBN Code</strong></p>
                              <p className="text-gray-500">Auto-increments from {lastGpbnCode || 'GPBN3000'}</p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Total: {totalStickerCount} sticker(s)
                          </p>
                        </div>

                        {/* Update Preview Button */}
                        <div className="mb-4">
                          <button
                            onClick={regenerateProductStickerPreview}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
                            </svg>
                            Update Preview
                          </button>
                        </div>

                        {/* Product Sticker Preview */}
                        <div className="flex justify-center mb-4 p-4 bg-gray-100 rounded-lg">
                          {productStickerPreviewUrl ? (
                            <embed
                              src={`${productStickerPreviewUrl}#view=FitH&zoom=page-fit`}
                              type="application/pdf"
                              className="border border-gray-300 rounded bg-white"
                              style={{ width: '500px', height: '280px' }}
                            />
                          ) : (
                            <div className="text-gray-500 py-8">Click &quot;Update Preview&quot; to generate sticker</div>
                          )}
                        </div>

                        {/* Size Info */}
                        <p className="text-xs text-gray-500 text-center mb-4">
                          Sticker size: 3cm x 1.5cm
                        </p>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          <button
                            onClick={handleDownloadProductStickers}
                            className="flex-1 px-4 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            style={{ backgroundColor: '#FF5722' }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7,10 12,15 17,10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download PDF
                          </button>
                          <button
                            onClick={closeNewStickerModal}
                            className="flex-1 px-4 py-2 border-2 rounded font-medium hover:bg-gray-50 transition-colors"
                            style={{ borderColor: '#5C2E1F', color: '#5C2E1F' }}
                          >
                            Close
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}