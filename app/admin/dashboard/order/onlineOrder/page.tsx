"use client";
import Sidepanel from "@/app/components/sidepanel/page";
import Header from "@/app/components/header/page";
import { TableSkeleton, SkeletonStyles } from "@/app/components/skeletonLoader/page";
import supabase from "@/lib/client";
import Image from "next/image";
import { useState, useEffect, Fragment, useCallback, useRef } from "react";
import { Search, Filter, Plus, X, Check, ChevronDown, Tag } from "lucide-react";
import { useAccessControl } from "@/lib/accessControl";
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
import CreateOnlineOrderModal from "@/app/components/createOnlineOrderModal/page";
import OnlineLabelGenerator from "@/app/components/onlineLabel/page";
import type jsPDF from "jspdf";
import EditOnlineOrderModal from "@/app/components/editOnlineOrder/page";
interface Order {
  id: number;
  order_id: string;
  customer_name: string;
  order_date: string;
  delivery_date: string;
  delivery_address: string;
  billing_address?: string;
  ad_streetName?: string;
  ad_country?: string;
  ad_postal?: string;
  status: string;
  notes: string | null;
  tracking_no: string;
  created_at: string;
  updated_at: string;
  total_amount: number;
  invoice_id: string;
  gst_percentage?: number;
  xero_invoice_id?: string;
  xero_synced_at?: string;
}
interface OrderItem {
  id: number;
  order_id: number;
  product_id: string;
  product_name: string;
  quantity: number;
  calculated_weight: string;
  gelato_type?: string;
  product_type: string;
  product_price: number;
  product_cost: number;
  label_ingredients?: string;
  label_allergens?: string;
  best_before?: string;
  batch_number?: string;
  product_ingredient?: string;
  product_allergen?: string;
  product_shelflife?: string;
  product_milkbase?: number;
  product_sugarbase?: number;
  product_description?: string;
  sticker_bbd_code?: string | null;
  sticker_pbn_code?: string | null;
  sticker_barcode?: string | null;
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

export default function OnlineOrderPage() {
  // Access Control
  const { canEdit } = useAccessControl();
  const canEditOnlineOrders = canEdit('orders', 'online-order');

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const itemsPerPage = 10;
  const [updatingStatus, setUpdatingStatus] = useState<Record<number, boolean>>(
    {},
  );

  // Status change confirmation modal
  const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false);
  const [statusChangeData, setStatusChangeData] = useState<{ orderId: number; newStatus: string; orderInvoiceId: string } | null>(null);

  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [rowOrderItems, setRowOrderItems] = useState<
    Record<number, OrderItem[]>
  >({});
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [sortBy, setSortBy] = useState("order_date_desc");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleteSuccessOpen, setIsDeleteSuccessOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showLabelGenerator, setShowLabelGenerator] = useState(false);
  const [selectedOrderItems, setSelectedOrderItems] = useState<OrderItem[]>([]);
  const [selectedClientData, setSelectedClientData] = useState<{
    client_businessName: string;
    client_delivery_address: string;
  } | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [invoiceOrderItems, setInvoiceOrderItems] = useState<OrderItem[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [headerOptions, setHeaderOptions] = useState<
    Array<{
      id: number;
      option_name: string;
      line1: string;
      line2: string;
      line3: string;
      line4: string;
      line5: string;
      line6: string;
      line7: string;
      is_default: boolean;
    }>
  >([]);
  const [selectedHeaderId, setSelectedHeaderId] = useState<number | null>(null);
  const [onlineInvoiceHeaders, setOnlineInvoiceHeaders] = useState<Record<string, number>>({});
  const [showHeaderEditor, setShowHeaderEditor] = useState(false);
  const [editingHeaderId, setEditingHeaderId] = useState<number | null>(null);
  const [headerFormData, setHeaderFormData] = useState({
    option_name: "",
    line1: "",
    line2: "",
    line3: "",
    line4: "",
    line5: "",
    line6: "",
    line7: "",
  });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [headerToDelete, setHeaderToDelete] = useState<number | null>(null);
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [isEditSuccessOpen, setIsEditSuccessOpen] = useState(false);
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
  const [showFooterDeleteConfirmModal, setShowFooterDeleteConfirmModal] =
    useState(false);
  const [footerToDelete, setFooterToDelete] = useState<number | null>(null);
  const [showFooterEditConfirmModal, setShowFooterEditConfirmModal] =
    useState(false);
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
  const [headerToEdit, setHeaderToEdit] = useState<{
    id: number;
    option_name: string;
    line1: string;
    line2: string;
    line3: string;
    line4: string;
    line5: string;
    line6: string;
    line7: string;
    is_default: boolean;
  } | null>(null);

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
  const [stickerDropdownPosition, setStickerDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [showItemStickerDropdown, setShowItemStickerDropdown] = useState<string | null>(null); // format: "orderId-itemIndex"
  const [itemStickerDropdownPosition, setItemStickerDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [itemStickerDropdownData, setItemStickerDropdownData] = useState<{ item: OrderItem; orderId: number; orderDate: string } | null>(null);


  // Xero sync state for online orders
  const [syncingRowXero, setSyncingRowXero] = useState<Record<number, boolean>>({});

  // Use ref for GPBN to avoid closure issues - this stores the starting code for current order
  const gpbnStartCodeRef = useRef<string | null>(null);

  // GPBN codes by delivery date (key = delivery_date string, value = GPBN number)
  const [deliveryDateGpbn, setDeliveryDateGpbn] = useState<Record<string, number>>({});

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

  // Load default GST from localStorage on mount
  useEffect(() => {
    const savedGst = localStorage.getItem('defaultGstPercent_online');
    if (savedGst) {
      const gstValue = parseFloat(savedGst);
      if (!isNaN(gstValue) && gstValue >= 0 && gstValue <= 100) {
        setCurrentInvoiceGstPercent(gstValue);
      }
    }
  }, []);

  // Fetch header options on component mount
  useEffect(() => {
    const fetchHeaderOptions = async () => {
      try {
        const { data, error } = await supabase
          .from("header_options")
          .select("*")
          .order("is_default", { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          setHeaderOptions(data);
          const defaultHeader = data.find((h) => h.is_default) || data[0];
          setSelectedHeaderId(defaultHeader.id);
        }
      } catch (error) {
        console.error("Error fetching header options:", error);
      }
    };

    fetchHeaderOptions();
  }, []);

  // Load saved online invoice headers from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('onlineInvoiceHeaders');
      if (saved) {
        setOnlineInvoiceHeaders(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading online invoice headers from localStorage:', error);
    }
  }, []);

  // Function to save header for a specific online invoice
  const saveOnlineInvoiceHeader = (invoiceId: string, headerId: number) => {
    const updated = { ...onlineInvoiceHeaders, [invoiceId]: headerId };
    setOnlineInvoiceHeaders(updated);
    setSelectedHeaderId(headerId);
    try {
      localStorage.setItem('onlineInvoiceHeaders', JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving online invoice headers to localStorage:', error);
    }
  };

  // Fetch footer options on component mount
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

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    if (typeof amount !== "number") return "0.00";
    return amount.toFixed(2);
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleHeaderInputChange = useCallback(
    (field: string, value: string) => {
      setHeaderFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleFooterInputChange = useCallback(
    (field: string, value: string) => {
      setFooterFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

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

  // Show confirmation modal before changing status
  const handleStatusChangeRequest = (orderId: number, newStatus: string, orderInvoiceId: string) => {
    setStatusChangeData({ orderId, newStatus, orderInvoiceId });
    setShowStatusConfirmModal(true);
  };

  // Confirm and execute status change
  const handleConfirmStatusChange = async () => {
    if (!statusChangeData) return;

    const { orderId, newStatus } = statusChangeData;

    setUpdatingStatus((prev) => ({ ...prev, [orderId]: true }));
    try {
      const { error } = await supabase
        .from("customer_order")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;

      // Update local state and sort: completed/cancelled go to bottom
      setOrders((prev) => {
        const updatedOrders = prev.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order,
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
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update order status");
    } finally {
      setUpdatingStatus((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  // Cancel status change
  const handleCancelStatusChange = () => {
    setShowStatusConfirmModal(false);
    setStatusChangeData(null);
  };

  // Legacy function that now redirects to confirmation
  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    // Find the order to get its invoice_id
    const order = orders.find(o => o.id === orderId);
    const orderInvoiceId = order?.invoice_id || `Order #${orderId}`;
    handleStatusChangeRequest(orderId, newStatus, orderInvoiceId);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(currentOrders.map((order) => order.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (orderId: number, checked: boolean) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(orderId);
      } else {
        newSet.delete(orderId);
      }
      return newSet;
    });
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const idsToDelete = Array.from(selectedRows);

      // Delete order items first
      const { error: itemsError } = await supabase
        .from("customer_order_item")
        .delete()
        .in("order_id", idsToDelete);

      if (itemsError) throw itemsError;

      // Then delete orders
      const { error: ordersError } = await supabase
        .from("customer_order")
        .delete()
        .in("id", idsToDelete);

      if (ordersError) throw ordersError;

      await refreshOrders();
      setSelectedRows(new Set());
      setIsDeleteConfirmOpen(false);
      setIsDeleteSuccessOpen(true);
    } catch (error) {
      console.error("Error deleting orders:", error);
      alert("Failed to delete orders");
    } finally {
      setLoading(false);
    }
  };

  const handleRowExpand = async (order: Order) => {
    const isExpanded = expandedRows[order.id];
    toggleRowExpansion(order.id);

    if (!isExpanded && !rowOrderItems[order.id]) {
      try {
        const { data, error } = await supabase
          .from("customer_order_item")
          .select("*")
          .eq("order_id", order.id);

        if (error) throw error;

        // Fetch ALL products once for efficient matching
        const { data: allProducts } = await supabase
          .from("product_list")
          .select("id, product_id, product_name, sticker_bbd_code, sticker_pbn_code, sticker_barcode, product_ingredient, product_shelflife, product_milkbased, product_sugarbased, product_description");

        const allProductsList = allProducts || [];

        // Create lookup maps for flexible matching
        const productMapById = new Map();
        const productMapByProductId = new Map();
        const productMapByName = new Map();

        allProductsList.forEach(p => {
          productMapById.set(p.id, p);
          if (p.product_id) {
            productMapByProductId.set(p.product_id, p);
          }
          if (p.product_name) {
            productMapByName.set(p.product_name.toLowerCase().trim(), p);
          }
        });

        // Helper function to normalize string for comparison
        const normalizeForMatch = (str: string): string => {
          return str.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
        };

        // Helper function to get words from a string
        const getWords = (str: string): string[] => {
          return normalizeForMatch(str).split(' ').filter(w => w.length > 2);
        };

        // Match order items with products using flexible matching
        const itemsWithStickerCodes = (data || []).map((item) => {
          // Try to find product by different methods
          let productData = null;

          // Try by numeric id
          if (item.product_id && typeof item.product_id === 'number') {
            productData = productMapById.get(item.product_id);
          }
          // Try by string product_id
          if (!productData && item.product_id) {
            productData = productMapByProductId.get(item.product_id);
          }
          // Try by exact name match
          if (!productData && item.product_name) {
            const normalizedName = item.product_name.toLowerCase().trim();
            productData = productMapByName.get(normalizedName);

            // Try normalized match (without special chars)
            if (!productData) {
              const cleanName = normalizeForMatch(item.product_name);
              for (const [pName, p] of productMapByName.entries()) {
                if (normalizeForMatch(pName) === cleanName) {
                  productData = p;
                  break;
                }
              }
            }

            // Try partial match if exact match fails
            if (!productData) {
              for (const [pName, p] of productMapByName.entries()) {
                if (pName && (pName.includes(normalizedName) || normalizedName.includes(pName))) {
                  productData = p;
                  break;
                }
              }
            }

            // Try word-based matching
            if (!productData) {
              const itemWords = getWords(item.product_name);
              if (itemWords.length > 0) {
                let bestMatch = null;
                let bestScore = 0;

                for (const product of allProductsList) {
                  if (!product.product_name) continue;
                  const productWords = getWords(product.product_name);
                  const matchingWords = itemWords.filter(w => productWords.includes(w));
                  const score = matchingWords.length / Math.max(itemWords.length, productWords.length);

                  if (score > bestScore && score >= 0.5) {
                    bestScore = score;
                    bestMatch = product;
                  }
                }

                productData = bestMatch;
              }
            }
          }

          // Prioritize label_ingredients, then product_list, then item.product_ingredient
          const finalIngredient = item.label_ingredients || productData?.product_ingredient || item.product_ingredient || null;
          console.log('Row expand - Item:', item.product_name, '-> Product:', productData?.product_name, '| label_ingredients:', item.label_ingredients?.substring(0, 20), '| product_ingredient:', finalIngredient?.substring(0, 30));

          return {
            ...item,
            sticker_bbd_code: productData?.sticker_bbd_code || null,
            sticker_pbn_code: productData?.sticker_pbn_code || null,
            sticker_barcode: productData?.sticker_barcode || null,
            product_ingredient: finalIngredient,
            // Store label_ingredients with the prioritized value for sticker use
            label_ingredients: finalIngredient,
            product_shelflife: productData?.product_shelflife || '3 months',
            // Prioritize order item values (for manually inputted products), then fall back to product_list
            product_milkbase: item.product_milkbase ?? productData?.product_milkbased ?? 0,
            product_sugarbase: item.product_sugarbase ?? productData?.product_sugarbased ?? 0,
            product_description: item.product_description || productData?.product_description || null
          };
        });

        // Calculate total amount from order items using product_price
        const totalAmount = itemsWithStickerCodes.reduce(
          (sum, item) => sum + item.product_price * item.quantity,
          0,
        );

        // Update the order's total_amount in state
        setOrders((prev) =>
          prev.map((o) =>
            o.id === order.id ? { ...o, total_amount: totalAmount } : o,
          ),
        );

        setRowOrderItems((prev) => ({
          ...prev,
          [order.id]: itemsWithStickerCodes,
        }));
      } catch (error) {
        console.error("Error fetching order items:", error);
      }
    }
  };

  // Generate stickers for a single order item (quantity x stickers)
  // For online orders: fetch ALL products and match by name (same logic as row expansion)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleGenerateStickers = async (item: OrderItem) => {
    const productName = item.product_name || 'Unknown Product';

    console.log('Single sticker - Product:', productName);
    console.log('Single sticker - Item has ingredient:', item.product_ingredient?.substring(0, 50));

    // Fetch ALL products to find match (same approach as row expansion)
    const { data: allProducts } = await supabase
      .from('product_list')
      .select('id, product_name, product_ingredient, sticker_barcode');

    let ingredients: string | null = null;
    let barcode = item.sticker_barcode;

    if (allProducts && productName) {
      const normalizedName = productName.toLowerCase().trim();

      // Helper for normalized matching
      const normalizeForMatch = (str: string): string => {
        return str.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
      };

      // Try exact name match first
      let matchedProduct = allProducts.find(p =>
        p.product_name?.toLowerCase().trim() === normalizedName
      );

      // Try normalized match (without special chars)
      if (!matchedProduct) {
        const cleanName = normalizeForMatch(productName);
        matchedProduct = allProducts.find(p =>
          p.product_name && normalizeForMatch(p.product_name) === cleanName
        );
      }

      // Try partial match
      if (!matchedProduct) {
        matchedProduct = allProducts.find(p => {
          const pName = p.product_name?.toLowerCase().trim() || '';
          return pName.includes(normalizedName) || normalizedName.includes(pName);
        });
      }

      if (matchedProduct) {
        console.log('Single sticker - Found product:', matchedProduct.product_name, '| Ingredient:', matchedProduct.product_ingredient?.substring(0, 50));
        ingredients = matchedProduct.product_ingredient;
        barcode = barcode || matchedProduct.sticker_barcode;
      }
    }

    // Fallback to item's stored ingredient
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

    // Generate first sticker data for preview
    const firstBbdCode = generateNextBbdCode(lastBbdCode);
    const firstPbnCode = generateNextPbnCode(lastPbnCode);

    const stickerData: StickerData = {
      productName: productName,
      ingredients: ingredients,
      bbdCode: firstBbdCode,
      pbnCode: firstPbnCode,
      barcode: barcode
    };

    // Generate PDF
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

  // Generate ALL stickers for an entire order (all products × quantities)
  // For online orders: fetch items and match by name to get ingredients (same as row expansion)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleGenerateAllOrderStickers = async (orderId: number) => {
    console.log('=== STICKER GENERATION DEBUG ===');
    console.log('Order ID:', orderId);

    // Step 1: Fetch order items
    const { data: orderItems, error } = await supabase
      .from('customer_order_item')
      .select('*')
      .eq('order_id', orderId);

    console.log('Order items fetched:', orderItems);

    if (error) {
      console.error('Error fetching order items:', error);
      alert('Error fetching order items: ' + error.message);
      return;
    }

    if (!orderItems || orderItems.length === 0) {
      alert('No items found for this order.');
      return;
    }

    // Step 2: Fetch ALL products to match ingredients (same as row expansion)
    const { data: allProducts } = await supabase
      .from('product_list')
      .select('id, product_name, product_ingredient, sticker_barcode');

    console.log('All products fetched:', allProducts?.length);

    // Helper for normalized matching
    const normalizeForMatch = (str: string): string => {
      return str.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
    };

    // Step 3: Match each order item to its product and get ingredients
    const stickerItems: OrderStickerItem[] = orderItems.map(item => {
      let productIngredient: string | null = null;
      let productBarcode: string | null = null;

      console.log('Processing order item:', item.product_name);

      if (allProducts && item.product_name) {
        const normalizedItemName = item.product_name.toLowerCase().trim();
        const cleanItemName = normalizeForMatch(item.product_name);

        // Try exact name match first
        let matchedProduct = allProducts.find(p =>
          p.product_name?.toLowerCase().trim() === normalizedItemName
        );

        // Try normalized match (without special chars)
        if (!matchedProduct) {
          matchedProduct = allProducts.find(p =>
            p.product_name && normalizeForMatch(p.product_name) === cleanItemName
          );
        }

        // Try partial match
        if (!matchedProduct) {
          matchedProduct = allProducts.find(p => {
            const pName = p.product_name?.toLowerCase().trim() || '';
            return pName.includes(normalizedItemName) || normalizedItemName.includes(pName);
          });
        }

        if (matchedProduct) {
          console.log('Found product match:', matchedProduct.product_name, '| Ingredient:', matchedProduct.product_ingredient?.substring(0, 50));
          productIngredient = matchedProduct.product_ingredient;
          productBarcode = matchedProduct.sticker_barcode;
        }
      }

      // Prioritize label_ingredients from order item, then item.product_ingredient, then product list
      const finalIngredients = item.label_ingredients || item.product_ingredient || productIngredient || 'No ingredients listed';
      console.log('Final ingredients for', item.product_name, '| label_ingredients:', item.label_ingredients?.substring(0, 30), '| Using:', finalIngredients.substring(0, 50));

      return {
        productName: item.product_name || 'Unknown Product',
        ingredients: finalIngredients,
        quantity: item.quantity,
        existingBarcode: productBarcode || item.sticker_barcode || null
      };
    });

    console.log('=== FINAL STICKER ITEMS ===');
    console.log(stickerItems.map(s => ({ name: s.productName, ingredients: s.ingredients.substring(0, 50), qty: s.quantity })));

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

    // Fetch order items
    const { data: items, error: fetchError } = await supabase
      .from('customer_order_item')
      .select('*')
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

    // Fetch product data for each item
    const productIds = items.map(item => item.product_id);
    const { data: products } = await supabase
      .from('product_list')
      .select('product_id, product_ingredient, product_shelflife')
      .in('product_id', productIds);

    const productMap = new Map(products?.map(p => [p.product_id, p]) || []);

    // Map items to sticker format
    const stickerItems: OrderItemForSticker[] = items.map(item => {
      const productData = productMap.get(item.product_id);
      const productId = item.product_id?.toString() || '0';
      // Generate 13-digit barcode from product_id (3 + padded product_id)
      const barcode13 = '3' + productId.replace(/\D/g, '').padStart(12, '0').slice(-12);

      return {
        productName: item.product_name || 'Unknown Product',
        // Prioritize label_ingredients from order item, then fallback to product_list
        ingredients: item.label_ingredients || productData?.product_ingredient || 'No ingredients listed',
        quantity: item.quantity,
        barcode13,
        shelfLife: productData?.product_shelflife || '3 months'
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

  // Generate barcode or product sticker for a single item (same modal as order-level)
  const handleItemStickerModal = async (
    item: OrderItem,
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

    const productName = item.product_name || 'Unknown Product';

    // Use ingredients from the enriched item (already includes label_ingredients or product_list fallback)
    const ingredients = item.label_ingredients || item.product_ingredient || 'No ingredients listed';
    const shelfLife = item.product_shelflife || '3 months';
    const productId = item.product_id || '0';

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

  const handleGenerateLabels = async (order: Order) => {
    try {
      const { data, error } = await supabase
        .from("customer_order_item")
        .select("*")
        .eq("order_id", order.id);

      if (error) throw error;

      // Get GPBN based on order date (same as product sticker)
      const orderDateStr = new Date(order.order_date).toISOString().split('T')[0];
      const gpbnNumber = deliveryDateGpbn[orderDateStr] || 3000;
      const gpbnCode = `GPBN${gpbnNumber}`;

      // Add GPBN as batch_number to each item
      const itemsWithGpbn = (data || []).map(item => ({
        ...item,
        batch_number: gpbnCode
      }));

      setSelectedOrderItems(itemsWithGpbn);
      setSelectedClientData({
        client_businessName: order.customer_name,
        client_delivery_address: order.delivery_address,
      });
      setShowLabelGenerator(true);
    } catch (error) {
      console.error("Error fetching order items for labels:", error);
      alert("Failed to load order items");
    }
  };

  // Sync a single online order row to Xero
  const handleSyncRowToXero = async (order: Order) => {
    setSyncingRowXero(prev => ({ ...prev, [order.id]: true }));
    try {
      const res = await fetch('/api/xero/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onlineOrderId: order.id }),
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
    } catch (e) {
      alert(`Xero sync failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setSyncingRowXero(prev => ({ ...prev, [order.id]: false }));
    }
  };

  const handleViewInvoice = async (order: Order) => {
    try {
      const { data, error } = await supabase
        .from("customer_order_item")
        .select("*")
        .eq("order_id", order.id);

      if (error) throw error;

      setSelectedOrder(order);
      setInvoiceOrderItems(data || []);

      // Calculate GST percentage from stored total if possible, otherwise use default from localStorage or 9%
      const items = data || [];
      const subtotal = items.reduce((sum, item) => sum + item.product_price * item.quantity, 0);
      if (subtotal > 0 && order.total_amount > subtotal) {
        const derivedGst = ((order.total_amount - subtotal) / subtotal) * 100;
        setCurrentInvoiceGstPercent(Math.round(derivedGst * 100) / 100); // Round to 2 decimal places
      } else {
        // Use saved default GST or fallback to 9%
        const savedGst = localStorage.getItem('defaultGstPercent_online');
        const defaultGst = savedGst ? parseFloat(savedGst) : 9;
        setCurrentInvoiceGstPercent(!isNaN(defaultGst) ? defaultGst : 9);
      }

      // Load saved header for this specific invoice, or use default
      const savedHeaderId = onlineInvoiceHeaders[order.invoice_id];
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
      console.error("Error fetching order items for invoice:", error);
      alert("Failed to load invoice data");
    }
  };

  const toggleRowExpansion = (orderId: number) => {
    setExpandedRows((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  useEffect(() => {
    const filterDate = sessionStorage.getItem("filterDeliveryDate");
    if (filterDate) {
      setSearchQuery(filterDate);
      sessionStorage.removeItem("filterDeliveryDate");
    }
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);

        const { data, error: supabaseError } = await supabase
          .from("customer_order")
          .select("*")
          .order("order_date", { ascending: false });

        if (supabaseError) {
          throw new Error(
            `${supabaseError.message} (Code: ${supabaseError.code})`,
          );
        }

        if (!data) {
          setOrders([]);
        } else {
          // Fetch all order items to calculate totals using product_price
          const ordersWithTotals = await Promise.all(
            data.map(async (order) => {
              const { data: items } = await supabase
                .from("customer_order_item")
                .select("*")
                .eq("order_id", order.id);

              const totalAmount = (items || []).reduce(
                (sum, item) => sum + item.product_price * item.quantity,
                0,
              );

              return { ...order, total_amount: totalAmount };
            }),
          );

          // Sort orders: Pending/active first, Completed/Cancelled at bottom
          const sortedOrders = ordersWithTotals.sort((a, b) => {
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
          // Fetch order dates from BOTH online orders AND client orders to ensure synchronized GPBN
          // GPBN is sequential: earliest date = 3000, next date = 3001, etc.

          // Get online order dates
          const onlineOrderDates = ordersWithTotals.map((o) => {
            const date = new Date(o.order_date);
            return date.toISOString().split('T')[0];
          });

          // Also fetch client order dates to ensure GPBN is synchronized
          const { data: clientOrders } = await supabase
            .from('client_order')
            .select('order_date');

          const clientOrderDates = (clientOrders || []).map((o: { order_date: string }) => {
            const date = new Date(o.order_date);
            return date.toISOString().split('T')[0];
          });

          // Combine all dates and get unique sorted dates
          const allOrderDates = [...onlineOrderDates, ...clientOrderDates];
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
        const errorMessage =
          err instanceof Error
            ? err.message
            : "An error occurred while fetching orders";
        setError(errorMessage);
        console.error("Error fetching orders:", err);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const refreshOrders = async () => {
    try {
      setLoading(true);

      const { data, error: supabaseError } = await supabase
        .from("customer_order")
        .select("*")
        .order("order_date", { ascending: false });

      if (supabaseError) {
        throw new Error(
          `${supabaseError.message} (Code: ${supabaseError.code})`,
        );
      }

      if (data) {
        // Fetch all order items to calculate totals using product_price
        const ordersWithTotals = await Promise.all(
          data.map(async (order) => {
            const { data: items } = await supabase
              .from("customer_order_item")
              .select("*")
              .eq("order_id", order.id);

            const totalAmount = (items || []).reduce(
              (sum, item) => sum + item.product_price * item.quantity,
              0,
            );

            return { ...order, total_amount: totalAmount };
          }),
        );

        setOrders(ordersWithTotals);
      }

      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An error occurred while fetching orders";
      setError(errorMessage);
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders
    .filter((order) => {
      const searchLower = searchQuery.toLowerCase();
      const deliveryDateStr = order.delivery_date
        ? new Date(order.delivery_date).toISOString().split("T")[0]
        : "";

      const matchesSearch =
        order.order_id?.toString().toLowerCase().includes(searchLower) ||
        order.delivery_address?.toLowerCase().includes(searchLower) ||
        order.status?.toLowerCase().includes(searchLower) ||
        order.tracking_no?.toLowerCase().includes(searchLower) ||
        order.customer_name?.toLowerCase().includes(searchLower) ||
        deliveryDateStr.includes(searchQuery);

      const matchesFilter =
        filterStatus === "all" ||
        order.status?.toLowerCase() === filterStatus.toLowerCase();

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      // First priority: Completed/Cancelled orders go to the bottom
      const aIsFinished = a.status === "Completed" || a.status === "Cancelled";
      const bIsFinished = b.status === "Completed" || b.status === "Cancelled";

      if (aIsFinished && !bIsFinished) return 1;
      if (!aIsFinished && bIsFinished) return -1;

      // Second priority: Apply user's chosen sorting within each group
      switch (sortBy) {
        case "order_date_desc":
          return (
            new Date(b.order_date).getTime() - new Date(a.order_date).getTime()
          );
        case "order_date_asc":
          return (
            new Date(a.order_date).getTime() - new Date(b.order_date).getTime()
          );
        case "delivery_date_desc":
          return (
            new Date(b.delivery_date).getTime() -
            new Date(a.delivery_date).getTime()
          );
        case "delivery_date_asc":
          return (
            new Date(a.delivery_date).getTime() -
            new Date(b.delivery_date).getTime()
          );
        case "order_id_asc":
          return (a.order_id || "").localeCompare(b.order_id || "");
        case "order_id_desc":
          return (b.order_id || "").localeCompare(a.order_id || "");
        case "customer_asc":
          return (a.customer_name || "").localeCompare(b.customer_name || "");
        case "customer_desc":
          return (b.customer_name || "").localeCompare(a.customer_name || "");
        default:
          return 0;
      }
    });
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  const handleSaveHeaderOption = async () => {
    try {
      if (!headerFormData.option_name.trim()) {
        setWarningMessage("Please enter an option name");
        setShowWarningModal(true);
        return;
      }

      if (editingHeaderId) {
        const { error } = await supabase
          .from("header_options")
          .update({
            option_name: headerFormData.option_name,
            line1: headerFormData.line1,
            line2: headerFormData.line2,
            line3: headerFormData.line3,
            line4: headerFormData.line4,
            line5: headerFormData.line5,
            line6: headerFormData.line6,
            line7: headerFormData.line7,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingHeaderId);

        if (error) throw error;

        const { data: updatedData } = await supabase
          .from("header_options")
          .select("*")
          .order("is_default", { ascending: false });

        if (updatedData) {
          setHeaderOptions(updatedData);
        }

        setSuccessMessage("Header option updated successfully!");
      } else {
        const { data, error } = await supabase
          .from("header_options")
          .insert([
            {
              option_name: headerFormData.option_name,
              line1: headerFormData.line1,
              line2: headerFormData.line2,
              line3: headerFormData.line3,
              line4: headerFormData.line4,
              line5: headerFormData.line5,
              line6: headerFormData.line6,
              line7: headerFormData.line7,
              is_default: false,
            },
          ])
          .select();

        if (error) throw error;

        const { data: updatedData } = await supabase
          .from("header_options")
          .select("*")
          .order("is_default", { ascending: false });

        if (updatedData) {
          setHeaderOptions(updatedData);
          if (data && data[0]) {
            setSelectedHeaderId(data[0].id);
          }
        }

        setSuccessMessage("Header option created successfully!");
      }

      setShowSuccessModal(true);
      setShowHeaderEditor(false);
      setEditingHeaderId(null);
      setHeaderFormData({
        option_name: "",
        line1: "",
        line2: "",
        line3: "",
        line4: "",
        line5: "",
        line6: "",
        line7: "",
      });
    } catch (error) {
      console.error("Error saving header option:", error);
      setWarningMessage("Failed to save header option");
      setShowWarningModal(true);
    }
  };

  const handleEditHeaderOption = (header: {
    id: number;
    option_name: string;
    line1: string;
    line2: string;
    line3: string;
    line4: string;
    line5: string;
    line6: string;
    line7: string;
    is_default: boolean;
  }) => {
    setHeaderToEdit(header);
    setShowEditConfirmModal(true);
  };

  const handleDeleteHeaderOption = async (headerId: number) => {
    setHeaderToDelete(headerId);
    setShowDeleteConfirmModal(true);
  };

  // Open Edit Invoice modal with current data
  const handleOpenEditInvoice = () => {
    if (!selectedOrder || !invoiceOrderItems) return;

    // Use the current invoice GST percentage
    setEditInvoiceGstPercent(currentInvoiceGstPercent);
    setEditInvoiceItems(invoiceOrderItems.map(item => ({
      id: item.id,
      product_name: item.product_name,
      product_type: item.product_type || '',
      quantity: item.quantity,
      unit_price: item.product_price,
      subtotal: item.product_price * item.quantity
    })));

    // Check if this invoice's GST matches the saved default - if so, check the checkbox
    const savedGst = localStorage.getItem('defaultGstPercent_online');
    const savedGstValue = savedGst ? parseFloat(savedGst) : 9;
    setApplyGstToFutureOrders(currentInvoiceGstPercent === savedGstValue);

    // Initialize address fields from order (online orders store address directly)
    // Bill To uses billing_address, Ship To uses individual address fields or delivery_address
    const billToAddr = selectedOrder.billing_address || selectedOrder.delivery_address || '';
    const shipToAddr = selectedOrder.ad_streetName
      ? [selectedOrder.ad_streetName, selectedOrder.ad_country, selectedOrder.ad_postal].filter(Boolean).join(', ')
      : selectedOrder.delivery_address || '';
    setEditBillToAddress(billToAddr);
    setEditShipToAddress(shipToAddr);
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
          .from('customer_order_item')
          .update({
            product_name: item.product_name,
            product_type: item.product_type,
            quantity: item.quantity,
            product_price: item.unit_price
          })
          .eq('id', item.id);

        if (itemError) {
          console.error('Error updating order item:', itemError);
          throw itemError;
        }
      }

      // Update order with new total
      const { error: orderError } = await supabase
        .from('customer_order')
        .update({
          total_amount: newTotal
        })
        .eq('id', selectedOrder.id);

      if (orderError) {
        console.error('Error updating order:', orderError);
        throw orderError;
      }

      // Update local state
      setInvoiceOrderItems(editInvoiceItems.map(item => ({
        ...invoiceOrderItems.find(oi => oi.id === item.id)!,
        product_name: item.product_name,
        product_type: item.product_type,
        quantity: item.quantity,
        product_price: item.unit_price
      })));

      setSelectedOrder(prev => prev ? {
        ...prev,
        total_amount: newTotal
      } : null);

      // Update the current invoice GST percentage
      setCurrentInvoiceGstPercent(editInvoiceGstPercent);

      // If "Apply to future orders" is checked, save to localStorage
      if (applyGstToFutureOrders) {
        localStorage.setItem('defaultGstPercent_online', editInvoiceGstPercent.toString());
      }

      // Update this order's addresses in database (online orders store address directly)
      const { error: addressError } = await supabase
        .from('customer_order')
        .update({
          delivery_address: editShipToAddress,
          billing_address: editBillToAddress
        })
        .eq('id', selectedOrder.id);

      if (addressError) {
        console.error('Error updating order address:', addressError);
      }

      // Update local state with new addresses
      setSelectedOrder(prev => prev ? {
        ...prev,
        delivery_address: editShipToAddress,
        billing_address: editBillToAddress
      } : null);

      // Refresh orders list
      const { data } = await supabase
        .from("customer_order")
        .select("*")
        .order("order_date", { ascending: false });
      if (data) {
        setOrders(data);
      }

      setShowEditInvoiceModal(false);
      setSuccessMessage('Invoice updated successfully');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error saving invoice:', error);
      setWarningMessage('Failed to save invoice changes');
      setShowWarningModal(true);
    } finally {
      setIsSavingInvoice(false);
    }
  };

  const InvoiceModal = ({
    isOpen,
    order,
    orderItems,
  }: {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;
    orderItems: OrderItem[];
  }) => {
    if (!isOpen || !order) return null;

    // Inside InvoiceModal component
    const getSubtotal = () =>
      orderItems.reduce(
        (sum, item) => sum + item.product_price * item.quantity,
        0,
      );
    const getGST = () => getSubtotal() * (currentInvoiceGstPercent / 100);
    const getTotal = () => getSubtotal() + getGST();
    const subtotal = getSubtotal();
    const gst = getGST();
    const total = getTotal();

    const renderHeaderInPDF = (
      doc: jsPDF,
      selectedHeader: {
        line1?: string;
        line2?: string;
        line3?: string;
        line4?: string;
        line5?: string;
        line6?: string;
        line7?: string;
      },
      logoBase64?: string,
    ) => {
      if (!selectedHeader) return;

      doc.setFontSize(10);
      let yPos = 20;
      const lineHeight = 5;

      if (selectedHeader.line1) {
        doc.setFont("helvetica", "bold");
        doc.text(selectedHeader.line1, 20, yPos);
        yPos += lineHeight;
      }

      doc.setFont("helvetica", "normal");
      const lines = [
        selectedHeader.line2,
        selectedHeader.line3,
        selectedHeader.line4,
        selectedHeader.line5,
        selectedHeader.line6,
        selectedHeader.line7,
      ];

      lines.forEach((line) => {
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

    const renderFooterInPDF = (
      doc: jsPDF,
      selectedFooter: {
        line1?: string;
        line2?: string;
        line3?: string;
        line4?: string;
        line5?: string;
      },
    ) => {
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

    const generatePDFContent = (doc: jsPDF, logoBase64?: string) => {
      doc.setFont("helvetica");
      const selectedHeader = headerOptions.find(
        (h) => h.id === selectedHeaderId,
      );
      renderHeaderInPDF(doc, selectedHeader, logoBase64);

      // Title
      doc.setFontSize(16);
      doc.setTextColor(13, 144, 154);
      doc.text("Invoice", 20, 57);
      doc.setTextColor(0, 0, 0);

      // Bill To, Ship To, Invoice Details
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("BILL TO", 20, 67);
      doc.setFont("helvetica", "normal");
      doc.text(order.customer_name || "N/A", 20, 72);
      const billAddressText = order.billing_address || order.delivery_address || "N/A";
      const billAddress = doc.splitTextToSize(billAddressText, 45);
      doc.text(billAddress, 20, 77);

      doc.setFont("helvetica", "bold");
      doc.text("SHIP TO", 75, 67);
      doc.setFont("helvetica", "normal");
      doc.text(order.customer_name || "N/A", 75, 72);
      const shipAddressText = order.ad_streetName
        ? [order.ad_streetName, order.ad_country, order.ad_postal].filter(Boolean).join(', ')
        : order.delivery_address || "N/A";
      const shipAddress = doc.splitTextToSize(shipAddressText, 45);
      doc.text(shipAddress, 75, 77);

      const labelX = 155;
      const valueX = 157;
      doc.setFont("helvetica", "bold");
      doc.text("INVOICE NO.", labelX, 67, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.text(order.invoice_id || "N/A", valueX, 67);

      doc.setFont("helvetica", "bold");
      doc.text("DATE", labelX, 72, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.text(formatDate(order.order_date), valueX, 72);

      doc.setFont("helvetica", "bold");
      doc.text("DUE DATE", labelX, 77, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.text(formatDate(order.delivery_date), valueX, 77);

      doc.setFont("helvetica", "bold");
      doc.text("TERMS", labelX, 82, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.text("Due on receipt", valueX, 82);

      doc.setDrawColor(77, 184, 186);
      doc.line(20, 87, 190, 87);

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("SHIP DATE", 20, 93);
      doc.setFont("helvetica", "normal");
      doc.text(formatDate(order.delivery_date), 20, 98);
      doc.setFont("helvetica", "bold");
      doc.text("TRACKING NO.", 100, 93);
      doc.setFont("helvetica", "normal");
      doc.text(order.tracking_no || "N/A", 100, 98);

      const tableStartY = 104;
      doc.setFillColor(184, 230, 231);
      doc.rect(20, tableStartY, 170, 8, "F");
      doc.setFont("helvetica", "normal");
      doc.setTextColor(13, 144, 154);
      doc.setFontSize(9);
      doc.text("PRODUCT /", 22, tableStartY + 3);
      doc.text("SERVICES", 22, tableStartY + 6);
      doc.text("DESCRIPTION", 60, tableStartY + 5);
      doc.text("QTY", 150, tableStartY + 5, { align: "center" });
      doc.text("UNIT", 168, tableStartY + 3, { align: "right" });
      doc.text("PRICE", 168, tableStartY + 6, { align: "right" });
      doc.text("AMOUNT", 185, tableStartY + 5, { align: "right" });

      // Page dimensions for pagination
      const footerY = 268; // Footer positioned within bottom margin
      const maxContentY = footerY - 2; // Content stops at Y=266 (2mm buffer)
      const termsBaseHeight = 58; // Height for terms, totals, signature
      const lineHeight = 4;
      const continuationPageStartY = 20;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      let yPos = tableStartY + 13;

      // Render items with page break handling
      orderItems.forEach((item, idx) => {
        const productText = item.product_type || item.product_name;
        doc.setFont("helvetica", "bold");
        const productLines = doc.splitTextToSize(productText, 30);
        const descriptionText = item.product_name;
        const descLines = doc.splitTextToSize(descriptionText, 50);
        const maxLines = Math.max(productLines.length, descLines.length);
        const itemHeight = maxLines * 4 + 1;

        // Check if item fits on current page
        // For last item, also check if terms will fit
        const isLastItem = idx === orderItems.length - 1;
        const extraSpaceNeeded = isLastItem ? termsBaseHeight : 0;

        if (yPos + itemHeight + extraSpaceNeeded > maxContentY && idx > 0) {
          // Need new page
          const selectedFooter = footerOptions.find((f) => f.id === selectedFooterId);
          renderFooterInPDF(doc, selectedFooter);
          doc.addPage();

          // Render table header on new page
          doc.setFillColor(184, 230, 231);
          doc.rect(20, continuationPageStartY, 170, 8, "F");
          doc.setFont("helvetica", "normal");
          doc.setTextColor(13, 144, 154);
          doc.setFontSize(9);
          doc.text("PRODUCT /", 22, continuationPageStartY + 3);
          doc.text("SERVICES", 22, continuationPageStartY + 6);
          doc.text("DESCRIPTION", 60, continuationPageStartY + 5);
          doc.text("QTY", 150, continuationPageStartY + 5, { align: "center" });
          doc.text("UNIT", 168, continuationPageStartY + 3, { align: "right" });
          doc.text("PRICE", 168, continuationPageStartY + 6, { align: "right" });
          doc.text("AMOUNT", 185, continuationPageStartY + 5, { align: "right" });

          yPos = continuationPageStartY + 13;
          doc.setTextColor(0, 0, 0);
        }

        doc.setFont("helvetica", "bold");
        doc.text(productLines, 22, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(descLines, 60, yPos);

        const centerY = yPos + ((maxLines - 1) * 4) / 2;
        doc.text(item.quantity.toString(), 150, centerY, { align: "center" });
        doc.text(item.product_price.toFixed(2), 168, centerY, { align: "right" });
        doc.text((item.product_cost * item.quantity).toFixed(2), 185, centerY, { align: "right" });

        yPos += itemHeight;
      });

      // Check if terms fit on current page
      if (yPos + termsBaseHeight > maxContentY) {
        const selectedFooter = footerOptions.find((f) => f.id === selectedFooterId);
        renderFooterInPDF(doc, selectedFooter);
        doc.addPage();
        yPos = continuationPageStartY;
      }

      // Dotted line separator
      doc.setDrawColor(224, 224, 224);
      doc.setLineWidth(0.2);
      for (let i = 20; i < 190; i += 1.5) {
        doc.line(i, yPos + 2, i + 0.75, yPos + 2);
      }

      yPos += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Terms & Conditions", 20, yPos);
      const terms1 = doc.splitTextToSize(
        "We acknowledge that the above goods are received in good condition. Please inform us of any issues within 24 hours. Otherwise, kindly note no return or refunds accepted.",
        70,
      );
      doc.text(terms1, 20, yPos + 5);

      const terms2 = doc.splitTextToSize(
        "We are not liable for any damage to products once stored at your premises. Please keep frozen products (gelato and / or popsicles) frozen at -18 degree Celsius and below.",
        70,
      );
      doc.text(terms2, 20, yPos + 25);

      doc.setDrawColor(0, 0, 0);
      doc.line(20, yPos + 50, 85, yPos + 50);
      doc.text("Client's Signature & Company Stamp", 20, yPos + 55);

      // Totals on right side
      const totalsLabelX = 100;
      const totalsValueX = 185;
      doc.text("SUBTOTAL", totalsLabelX, yPos + 5);
      doc.text(subtotal.toFixed(2), totalsValueX, yPos + 5, { align: "right" });
      doc.text(`GST ${currentInvoiceGstPercent}%`, totalsLabelX, yPos + 10);
      doc.text(gst.toFixed(2), totalsValueX, yPos + 10, { align: "right" });
      doc.text("TOTAL", totalsLabelX, yPos + 15);
      doc.text(total.toFixed(2), totalsValueX, yPos + 15, { align: "right" });
      doc.text("BALANCE DUE", totalsLabelX, yPos + 23);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`$${total.toFixed(2)}`, totalsValueX, yPos + 23, { align: "right" });

      // Notes Section
      if (order.notes) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const notesWidth = 170;
        const notesLines = doc.splitTextToSize(order.notes, notesWidth);
        const notesStartY = yPos + 62;
        const spaceForNotes = maxContentY - notesStartY - 2;
        const maxLinesOnPage = Math.max(0, Math.floor(spaceForNotes / lineHeight));

        if (notesLines.length <= maxLinesOnPage) {
          doc.setFont("helvetica", "bold");
          doc.text("Notes:", 20, notesStartY);
          doc.setFont("helvetica", "normal");
          doc.text(notesLines, 20, notesStartY + 5);
        } else {
          // Render what fits on current page
          const firstPageLines = notesLines.slice(0, Math.max(1, maxLinesOnPage));
          doc.setFont("helvetica", "bold");
          doc.text("Notes:", 20, notesStartY);
          doc.setFont("helvetica", "normal");
          doc.text(firstPageLines, 20, notesStartY + 5);

          const selectedFooter = footerOptions.find((f) => f.id === selectedFooterId);
          renderFooterInPDF(doc, selectedFooter);

          // Render remaining on new pages
          let remainingLines = notesLines.slice(Math.max(1, maxLinesOnPage));
          const linesPerPage = Math.floor((maxContentY - continuationPageStartY) / lineHeight);

          while (remainingLines.length > 0) {
            doc.addPage();
            const pageLines = remainingLines.slice(0, linesPerPage);
            remainingLines = remainingLines.slice(linesPerPage);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(pageLines, 20, continuationPageStartY);
            renderFooterInPDF(doc, selectedFooter);
          }
          return;
        }
      }

      const selectedFooter = footerOptions.find((f) => f.id === selectedFooterId);
      renderFooterInPDF(doc, selectedFooter);
    };

    const handlePrintInvoice = async () => {
      try {
        const jsPDF = (await import("jspdf")).default;
        const doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        // Load logo image
        let logoBase64: string | undefined;
        try {
          logoBase64 = await loadImageAsBase64('/assets/file_logo.png');
        } catch (e) {
          console.error('Failed to load logo:', e);
        }

        generatePDFContent(doc, logoBase64);
        doc.autoPrint();
        const pdfBlob = doc.output("blob");
        const blobUrl = URL.createObjectURL(pdfBlob);
        window.open(blobUrl, "_blank");
      } catch (error) {
        console.error("Error generating PDF for print:", error);
        alert("Failed to open print preview.");
      }
    };

    const handleDownloadPDF = async () => {
      setIsGeneratingPDF(true);
      try {
        const jsPDF = (await import("jspdf")).default;
        const doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        // Load logo image
        let logoBase64: string | undefined;
        try {
          logoBase64 = await loadImageAsBase64('/assets/file_logo.png');
        } catch (e) {
          console.error('Failed to load logo:', e);
        }

        generatePDFContent(doc, logoBase64);
        const fileName = `Invoice_${order.invoice_id}_${formatDate(order.delivery_date).replace(/\//g, "-")}.pdf`;
        doc.save(fileName);
      } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Failed to generate PDF.");
      } finally {
        setIsGeneratingPDF(false);
      }
    };

    return (
      <div
        className="fixed inset-0 z-50 overflow-auto flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      >
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 shrink-0 rounded-t-lg flex justify-between items-center">
            <h3 className="text-xl font-bold" style={{ color: "#5C2E1F" }}>
              Invoice Preview
            </h3>
            <button
              onClick={() => setShowInvoiceModal(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-3 flex-wrap">
              <label
                className="text-sm font-medium"
                style={{ color: "#5C2E1F" }}
              >
                Invoice Header:
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                {headerOptions.map((header) => (
                  <label
                    key={header.id}
                    className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-gray-200 hover:border-orange-300 transition-colors"
                  >
                    <input
                      type="radio"
                      name="headerOption"
                      value={header.id}
                      checked={selectedHeaderId === header.id}
                      onChange={() => selectedOrder && saveOnlineInvoiceHeader(selectedOrder.invoice_id, header.id)}
                      className="cursor-pointer accent-orange-500"
                    />
                    <span className="text-sm font-medium">
                      {header.option_name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleEditHeaderOption(header);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-xs ml-1 underline"
                    >
                      Edit
                    </button>
                  </label>
                ))}
                <button
                  onClick={() => {
                    setEditingHeaderId(null);
                    setHeaderFormData({
                      option_name: "",
                      line1: "",
                      line2: "",
                      line3: "",
                      line4: "",
                      line5: "",
                      line6: "",
                      line7: "",
                    });
                    setShowHeaderEditor(true);
                  }}
                  className="text-sm px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors font-medium"
                  style={{ color: "#5C2E1F" }}
                >
                  + New Header
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6 bg-gray-100">
            {(() => {
              const selectedHeader = headerOptions.find((h) => h.id === selectedHeaderId);
              const selectedFooter = footerOptions.find((f) => f.id === selectedFooterId);

              // Calculate footer lines count
              const footerLineCount = selectedFooter
                ? [selectedFooter.line1, selectedFooter.line2, selectedFooter.line3, selectedFooter.line4, selectedFooter.line5].filter(Boolean).length
                : 0;

              // Calculate header lines count
              const headerLineCount = selectedHeader
                ? [selectedHeader.line1, selectedHeader.line2, selectedHeader.line3, selectedHeader.line4, selectedHeader.line5, selectedHeader.line6, selectedHeader.line7].filter(Boolean).length
                : 0;

              // Calculate items per page based on available space
              const baseItemsFirstPage = 8;
              const baseItemsOtherPages = 18;
              const extraFromHeader = Math.max(0, 7 - headerLineCount);
              const extraFromFooter = Math.max(0, 5 - footerLineCount);

              const itemsFirstPage = baseItemsFirstPage + extraFromHeader + Math.floor(extraFromFooter / 2);
              const itemsOtherPages = baseItemsOtherPages + Math.floor(extraFromFooter / 2);

              // Page structure interface with notes lines for proper pagination
              interface PageStructure {
                items: OrderItem[];
                showHeader: boolean;
                showTerms: boolean;
                notesLines?: string[]; // Notes split into lines for pagination
                isNotesOverflow?: boolean;
                isFirstNotesPage?: boolean;
              }

              const notesText = order.notes || '';

              // Dynamic pagination with notes overflow handling for HTML preview
              const pageContentHeight = 730; // Usable content height (leaving space for footer ~70px)
              const headerHeight = 260; // Height of header section
              const termsBaseHeight = 160; // Height for terms, totals, signature
              const tableHeaderHeight = 30; // Height of table header
              const itemRowHeight = 22; // Height per item row
              const notesLineHeight = 16; // Approximate height per line of notes
              const charsPerLine = 120; // Approximate characters per line

              // Split notes into lines for pagination
              const splitNotesIntoLines = (text: string): string[] => {
                if (!text) return [];
                const words = text.split(/\s+/);
                const lines: string[] = [];
                let currentLine = '';
                for (const word of words) {
                  if ((currentLine + ' ' + word).trim().length <= charsPerLine) {
                    currentLine = (currentLine + ' ' + word).trim();
                  } else {
                    if (currentLine) lines.push(currentLine);
                    currentLine = word;
                  }
                }
                if (currentLine) lines.push(currentLine);
                return lines;
              };

              const allNotesLines = splitNotesIntoLines(notesText);
              const linesPerOverflowPage = Math.floor((pageContentHeight - 20) / notesLineHeight);

              // Track if we've shown the "Notes:" label yet
              let notesLabelShown = false;
              const hasNotes = allNotesLines.length > 0;

              const pages: PageStructure[] = [];
              const allItems = orderItems;

              let currentPageItems: OrderItem[] = [];
              let currentHeight = headerHeight + tableHeaderHeight;
              let isFirstPage = true;
              let itemIdx = 0;

              // Process all items - fit as many as possible
              while (itemIdx < allItems.length) {
                if (currentHeight + itemRowHeight <= pageContentHeight) {
                  currentPageItems.push(allItems[itemIdx]);
                  currentHeight += itemRowHeight;
                  itemIdx++;
                } else if (currentPageItems.length === 0) {
                  currentPageItems.push(allItems[itemIdx]);
                  currentHeight += itemRowHeight;
                  itemIdx++;
                } else {
                  pages.push({
                    items: currentPageItems,
                    showHeader: isFirstPage,
                    showTerms: false
                  });
                  currentPageItems = [];
                  currentHeight = tableHeaderHeight;
                  isFirstPage = false;
                }
              }

              // Check if terms fit on the same page
              const termsEndHeight = currentHeight + termsBaseHeight;
              const termsWillFit = termsEndHeight <= pageContentHeight;

              // Calculate space for notes
              const spaceForNotesOnTermsPage = termsWillFit ? pageContentHeight - termsEndHeight - 10 : 0;
              const maxNotesLinesOnTermsPage = Math.max(0, Math.floor(spaceForNotesOnTermsPage / notesLineHeight));
              const firstPageNotesLines = allNotesLines.slice(0, maxNotesLinesOnTermsPage);
              const overflowNotesLines = allNotesLines.slice(maxNotesLinesOnTermsPage);

              if (termsWillFit) {
                const showNotesLabel = hasNotes && firstPageNotesLines.length > 0;
                if (showNotesLabel) notesLabelShown = true;
                pages.push({
                  items: currentPageItems,
                  showHeader: isFirstPage,
                  showTerms: true,
                  notesLines: firstPageNotesLines.length > 0 ? firstPageNotesLines : undefined,
                  isFirstNotesPage: showNotesLabel
                });
                // Add overflow pages for notes
                if (overflowNotesLines.length > 0) {
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
                if (currentPageItems.length > 0) {
                  pages.push({
                    items: currentPageItems,
                    showHeader: isFirstPage,
                    showTerms: false
                  });
                }
                // Calculate notes for separate terms page
                const termsPageNotesSpace = pageContentHeight - termsBaseHeight - 20;
                const maxNotesOnTermsPage = Math.max(0, Math.floor(termsPageNotesSpace / notesLineHeight));
                const termsPageNotes = allNotesLines.slice(0, maxNotesOnTermsPage);
                const remainingAfterTermsPage = allNotesLines.slice(maxNotesOnTermsPage);

                const showNotesLabel = hasNotes && termsPageNotes.length > 0;
                if (showNotesLabel) notesLabelShown = true;
                pages.push({
                  items: [],
                  showHeader: false,
                  showTerms: true,
                  notesLines: termsPageNotes.length > 0 ? termsPageNotes : undefined,
                  isFirstNotesPage: showNotesLabel
                });

                // Add overflow pages for remaining notes
                if (remainingAfterTermsPage.length > 0) {
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

              // Handle no items case
              if (allItems.length === 0 && pages.length === 0) {
                const emptyPageNotesSpace = pageContentHeight - headerHeight - termsBaseHeight - 20;
                const maxNotesOnEmpty = Math.max(0, Math.floor(emptyPageNotesSpace / notesLineHeight));
                pages.push({
                  items: [],
                  showHeader: true,
                  showTerms: true,
                  notesLines: allNotesLines.slice(0, maxNotesOnEmpty),
                  isFirstNotesPage: allNotesLines.length > 0
                });
                const remainingNotes = allNotesLines.slice(maxNotesOnEmpty);
                if (remainingNotes.length > 0) {
                  for (let i = 0; i < remainingNotes.length; i += linesPerOverflowPage) {
                    pages.push({
                      items: [],
                      showHeader: false,
                      showTerms: false,
                      notesLines: remainingNotes.slice(i, i + linesPerOverflowPage),
                      isNotesOverflow: true,
                      isFirstNotesPage: false
                    });
                  }
                }
              }

              const totalPages = pages.length;

              // Render footer component - centered at bottom with same font as header
              const renderFooter = () => (
                <div style={{
                  position: 'absolute',
                  bottom: '15mm',
                  left: '20mm',
                  right: '20mm',
                  textAlign: 'center',
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '10px',
                  lineHeight: '1.6'
                }}>
                  {selectedFooter && (
                    <>
                      {selectedFooter.line1 && <p style={{ margin: '4px 0' }}>{selectedFooter.line1}</p>}
                      {selectedFooter.line2 && <p style={{ margin: '4px 0' }}>{selectedFooter.line2}</p>}
                      {selectedFooter.line3 && <p style={{ margin: '4px 0' }}>{selectedFooter.line3}</p>}
                      {selectedFooter.line4 && <p style={{ margin: '4px 0' }}>{selectedFooter.line4}</p>}
                      {selectedFooter.line5 && <p style={{ margin: '4px 0' }}>{selectedFooter.line5}</p>}
                    </>
                  )}
                </div>
              );

              return (
                <div className="space-y-8">
                  {pages.map((page, pageIndex) => (
                    <div
                      key={pageIndex}
                      className="bg-white shadow-lg mx-auto"
                      style={{
                        fontFamily: "Arial, sans-serif",
                        width: "210mm",
                        height: "297mm",
                        padding: "20mm",
                        boxSizing: "border-box",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {/* First page - full header */}
                      {page.showHeader && (
                        <>
                          {/* Header Section */}
                          {selectedHeader && (
                            <div className="mb-2 flex justify-between items-start">
                              <div>
                                {selectedHeader.line1 && <div className="font-bold text-[10px]">{selectedHeader.line1}</div>}
                                {selectedHeader.line2 && <div className="text-[10px]">{selectedHeader.line2}</div>}
                                {selectedHeader.line3 && <div className="text-[10px]">{selectedHeader.line3}</div>}
                                {selectedHeader.line4 && <div className="text-[10px]">{selectedHeader.line4}</div>}
                                {selectedHeader.line5 && <div className="text-[10px]">{selectedHeader.line5}</div>}
                                {selectedHeader.line6 && <div className="text-[10px]">{selectedHeader.line6}</div>}
                                {selectedHeader.line7 && <div className="text-[10px]">{selectedHeader.line7}</div>}
                              </div>
                              <div>
                                <Image
                                  src="/assets/file_logo.png"
                                  alt="Company Logo"
                                  width={80}
                                  height={60}
                                  style={{ objectFit: 'contain' }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Tax Invoice Title */}
                          <h2 className="text-xl font-light mb-3" style={{ color: "#0D909A" }}>
                            Invoice {totalPages > 1 && `(Page ${pageIndex + 1} of ${totalPages})`}
                          </h2>

                          {/* Three Column Section */}
                          <div className="grid grid-cols-3 gap-4 mb-3">
                            <div>
                              <h3 className="font-bold text-[10px] mb-1">BILL TO</h3>
                              <p className="text-[10px] font-bold">{order.customer_name || "N/A"}</p>
                              <p className="text-[10px] text-gray-700 max-w-150px wrap-break-words">{order.billing_address || order.delivery_address || "N/A"}</p>
                            </div>
                            <div>
                              <h3 className="font-bold text-[10px] mb-1">SHIP TO</h3>
                              <p className="text-[10px] font-bold">{order.customer_name || "N/A"}</p>
                              <p className="text-[10px] text-gray-700 max-w-150px wrap-break-words">
                                {order.ad_streetName
                                  ? [order.ad_streetName, order.ad_country, order.ad_postal].filter(Boolean).join(', ')
                                  : order.delivery_address || "N/A"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] mb-0.5"><strong>INVOICE NO.</strong> {order.invoice_id || "N/A"}</p>
                              <p className="text-[10px] mb-0.5"><strong>DATE</strong> {formatDate(order.delivery_date)}</p>
                              <p className="text-[10px] mb-0.5"><strong>DUE DATE</strong> {formatDate(order.delivery_date)}</p>
                              <p className="text-[10px]"><strong>TERMS</strong> Due on receipt</p>
                            </div>
                          </div>

                          {/* Horizontal Divider */}
                          <div className="border-t mb-3" style={{ borderColor: "#4db8ba" }}></div>

                          {/* Shipping Section */}
                          <div className="flex justify-between px-3 py-2 mb-3 pr-[25%]">
                            <div className="text-[10px]">
                              <strong className="block mb-1">SHIP DATE</strong>
                              <span>{formatDate(order.delivery_date)}</span>
                            </div>
                            <div className="text-[10px]">
                              <strong className="block mb-1">TRACKING NO.</strong>
                              <span>{order.tracking_no || "N/A"}</span>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Continuation pages - minimal header */}
                      {!page.showHeader && (
                        <div className="mb-4 pb-2 border-b border-gray-200">
                          <div className="flex justify-between items-center text-[10px]">
                            <div><strong>Invoice #{order.invoice_id}</strong> - {order.customer_name || "N/A"}</div>
                            <div className="text-gray-500">Page {pageIndex + 1} of {totalPages}</div>
                          </div>
                        </div>
                      )}

                      {/* Table - only if page has items */}
                      {page.items.length > 0 && (
                        <div className="mb-3">
                          <div
                            className="grid grid-cols-[1.2fr_1.8fr_0.6fr_0.8fr_0.8fr] gap-2 p-2 text-[10px] font-bold"
                            style={{ background: "rgba(184, 230, 231, 0.5)", color: "#4db8ba" }}
                          >
                            <div>PRODUCT / SERVICES</div>
                            <div>DESCRIPTION</div>
                            <div className="text-center">QTY</div>
                            <div className="text-right">UNIT PRICE</div>
                            <div className="text-right">AMOUNT</div>
                          </div>
                          {page.items.map((item, index) => (
                            <div
                              key={index}
                              className="grid grid-cols-[1.2fr_1.8fr_0.6fr_0.8fr_0.8fr] gap-2 p-2 text-[10px]"
                            >
                              <div>{item.product_type || item.product_name}</div>
                              <div className="text-gray-700">{item.product_name}</div>
                              <div className="text-center">{item.quantity}</div>
                              <div className="text-right">{formatCurrency(item.product_price)}</div>
                              <div className="text-right font-medium">{formatCurrency(item.product_price * item.quantity)}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Notes Overflow - show label only on first notes page */}
                      {page.isNotesOverflow && page.notesLines && page.notesLines.length > 0 && (
                        <div className="mt-3" style={{ width: '100%' }}>
                          {page.isFirstNotesPage && (
                            <p className="text-[10px] font-bold mb-1">Notes:</p>
                          )}
                          <p className="text-[10px] leading-relaxed text-gray-700 whitespace-pre-wrap break-words m-0">
                            {page.notesLines.join(' ')}
                          </p>
                        </div>
                      )}

                      {/* Bottom Section - only on pages with showTerms */}
                      {page.showTerms && (
                        <>
                          <div className="grid grid-cols-2 gap-8 mt-2 pt-2 border-t-2 border-dashed border-gray-300">
                            {/* Terms & Conditions */}
                            <div className="pr-4">
                              <h3 className="font-bold text-[10px] mb-2 mt-1">Terms & Conditions</h3>
                              <p className="text-[10px] leading-relaxed mb-2 text-gray-700">
                                We acknowledge that the above goods are received in good condition. Please inform us of any issues within 24 hours. Otherwise, kindly note no return or refunds accepted.
                              </p>
                              <p className="text-[10px] leading-relaxed mb-4 text-gray-700">
                                We are not liable for any damage to products once stored at your premises. Please keep frozen products (gelato and / or popsicles) frozen at -18 degree Celsius and below.
                              </p>
                              <div className="border-t border-black pt-1 mt-8" style={{ width: '250px' }}>
                                <p className="text-[10px]">Client&apos;s Signature & Company Stamp</p>
                              </div>
                            </div>

                            {/* Totals */}
                            <div className="text-right">
                              <div className="flex justify-end mb-1.5 text-[10px]">
                                <div className="w-32 text-right pr-4 font-bold">SUBTOTAL</div>
                                <div className="w-24 text-right">{formatCurrency(subtotal)}</div>
                              </div>
                              <div className="flex justify-end mb-1.5 text-[10px]">
                                <div className="w-32 text-right pr-4 font-bold">GST {currentInvoiceGstPercent}%</div>
                                <div className="w-24 text-right">{formatCurrency(gst)}</div>
                              </div>
                              <div className="flex justify-end mb-1.5 text-[10px]">
                                <div className="w-32 text-right pr-4 font-bold">TOTAL</div>
                                <div className="w-24 text-right font-medium">{formatCurrency(total)}</div>
                              </div>
                              <div className="flex justify-end mt-2 pt-0">
                                <div className="w-32 text-right pr-4 font-bold text-[10px]">BALANCE DUE</div>
                                <div className="w-24 text-right text-base font-bold">${formatCurrency(total)}</div>
                              </div>
                            </div>
                          </div>

                          {/* Notes Section - FULL PAGE WIDTH, outside the 2-column grid */}
                          {page.notesLines && page.notesLines.length > 0 && (
                            <div className="mt-4" style={{ width: '100%' }}>
                              {page.isFirstNotesPage && (
                                <p className="text-[10px] font-bold mb-1">Notes:</p>
                              )}
                              <p className="text-[10px] leading-relaxed text-gray-700 whitespace-pre-wrap break-words">
                                {page.notesLines.join(' ')}
                              </p>
                            </div>
                          )}
                        </>
                      )}

                      {/* Footer - centered at bottom of each page */}
                      {renderFooter()}

                      {/* Page continuation indicator */}
                      {totalPages > 1 && pageIndex < totalPages - 1 && (
                        <div style={{ position: 'absolute', bottom: '8mm', right: '20mm' }} className="text-[9px] text-gray-400">
                          Continued on next page...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Footer Selector */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center gap-3 flex-wrap">
              <label
                className="text-sm font-medium"
                style={{ color: "#5C2E1F" }}
              >
                Invoice Footer:
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                {footerOptions.map((footer) => (
                  <label
                    key={footer.id}
                    className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-gray-200 hover:border-orange-300 transition-colors"
                  >
                    <input
                      type="radio"
                      name="footerOption"
                      value={footer.id}
                      checked={selectedFooterId === footer.id}
                      onChange={() => setSelectedFooterId(footer.id)}
                      className="cursor-pointer accent-orange-500"
                    />
                    <span className="text-sm font-medium">
                      {footer.option_name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleEditFooterOption(footer);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-xs ml-1 underline"
                    >
                      Edit
                    </button>
                  </label>
                ))}
                <button
                  onClick={() => {
                    setEditingFooterId(null);
                    setFooterFormData({
                      option_name: "",
                      line1: "",
                      line2: "",
                      line3: "",
                      line4: "",
                      line5: "",
                    });
                    setShowFooterEditor(true);
                  }}
                  className="text-sm px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors font-medium"
                  style={{ color: "#5C2E1F" }}
                >
                  + New Footer
                </button>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 shrink-0 rounded-b-lg shadow-lg">
            <button
              onClick={handleOpenEditInvoice}
              className="flex-1 px-4 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              style={{ backgroundColor: "#5C2E1F" }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
              </svg>
              Edit Invoice
            </button>
            <button
              onClick={handlePrintInvoice}
              className="flex-1 px-4 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              style={{ backgroundColor: "#FF5722" }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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
              style={{ backgroundColor: "#4db8ba" }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              {isGeneratingPDF ? "Generating PDF..." : "Download PDF"}
            </button>
            <button
              onClick={() => setShowInvoiceModal(false)}
              className="flex-1 px-4 py-3 rounded-lg border-2 font-medium hover:bg-gray-50 transition-colors"
              style={{ borderColor: "#5C2E1F", color: "#5C2E1F" }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ fontFamily: '"Roboto Condensed", sans-serif' }}
    >
      <Sidepanel />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 p-6 overflow-auto" style={{ backgroundColor: "#FCF0E3" }}>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold" style={{ color: "#5C2E1F" }}>
                Online Orders
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
                            setSortBy("order_date_desc");
                            setShowSortDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortBy === "order_date_desc" ? "bg-gray-50 font-medium" : ""}`}
                        >
                          Order Date (Newest First)
                        </button>
                        <button
                          onClick={() => {
                            setSortBy("order_date_asc");
                            setShowSortDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortBy === "order_date_asc" ? "bg-gray-50 font-medium" : ""}`}
                        >
                          Order Date (Oldest First)
                        </button>
                        <button
                          onClick={() => {
                            setSortBy("delivery_date_desc");
                            setShowSortDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortBy === "delivery_date_desc" ? "bg-gray-50 font-medium" : ""}`}
                        >
                          Delivery Date (Newest First)
                        </button>
                        <button
                          onClick={() => {
                            setSortBy("delivery_date_asc");
                            setShowSortDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortBy === "delivery_date_asc" ? "bg-gray-50 font-medium" : ""}`}
                        >
                          Delivery Date (Oldest First)
                        </button>
                        <button
                          onClick={() => {
                            setSortBy("order_id_asc");
                            setShowSortDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortBy === "order_id_asc" ? "bg-gray-50 font-medium" : ""}`}
                        >
                          Order ID (A-Z)
                        </button>
                        <button
                          onClick={() => {
                            setSortBy("order_id_desc");
                            setShowSortDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortBy === "order_id_desc" ? "bg-gray-50 font-medium" : ""}`}
                        >
                          Order ID (Z-A)
                        </button>
                        <button
                          onClick={() => {
                            setSortBy("customer_asc");
                            setShowSortDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortBy === "customer_asc" ? "bg-gray-50 font-medium" : ""}`}
                        >
                          Customer Name (A-Z)
                        </button>
                        <button
                          onClick={() => {
                            setSortBy("customer_desc");
                            setShowSortDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortBy === "customer_desc" ? "bg-gray-50 font-medium" : ""}`}
                        >
                          Customer Name (Z-A)
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
                    {filterStatus !== "all" && (
                      <span className="ml-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                        1
                      </span>
                    )}
                  </button>

                  {showFilterDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="py-1">
                        <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">
                          Status
                        </div>
                        <button
                          onClick={() => {
                            setFilterStatus("all");
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${filterStatus === "all" ? "bg-gray-50 font-medium" : ""}`}
                        >
                          All Orders
                        </button>
                        <button
                          onClick={() => {
                            setFilterStatus("pending");
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${filterStatus === "pending" ? "bg-gray-50 font-medium" : ""}`}
                        >
                          Pending
                        </button>
                        <button
                          onClick={() => {
                            setFilterStatus("completed");
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${filterStatus === "completed" ? "bg-gray-50 font-medium" : ""}`}
                        >
                          Completed
                        </button>
                        <button
                          onClick={() => {
                            setFilterStatus("cancelled");
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${filterStatus === "cancelled" ? "bg-gray-50 font-medium" : ""}`}
                        >
                          Cancelled
                        </button>
                        {filterStatus !== "all" && (
                          <>
                            <div className="border-t border-gray-200 my-1"></div>
                            <button
                              onClick={() => {
                                setFilterStatus("all");
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
                  onClick={() => setIsCreateModalOpen(true)}
                  disabled={!canEditOnlineOrders}
                  className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-opacity"
                  style={{
                    backgroundColor: canEditOnlineOrders ? "#FF5722" : "#ccc",
                    cursor: canEditOnlineOrders ? "pointer" : "not-allowed",
                    opacity: canEditOnlineOrders ? 1 : 0.6
                  }}
                  title={!canEditOnlineOrders ? "You do not have permission to create orders" : ""}
                >
                  <Plus size={20} />
                  <span>Create Online Order</span>
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
                <span className="text-sm text-gray-600">
                  Filtering by delivery date:
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-2">
                  {new Date(searchQuery).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  <button
                    onClick={() => setSearchQuery("")}
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
                      <tr className="border-b-2" style={{ borderColor: "#5C2E1F" }}>
                        <th className="text-left py-3 px-2 w-[40px]">
                          <input
                            type="checkbox"
                            className={`w-4 h-4 ${canEditOnlineOrders ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                            checked={
                              selectedRows.size === currentOrders.length &&
                              currentOrders.length > 0
                            }
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            disabled={!canEditOnlineOrders}
                          />
                        </th>
                        <th className="text-left py-3 px-2 font-bold text-xs w-[180px]" style={{ color: "#5C2E1F" }}>
                          CUSTOMER NAME
                        </th>
                        <th className="text-left py-3 px-2 font-bold text-xs w-[100px]" style={{ color: "#5C2E1F" }}>
                          ORDER DATE
                        </th>
                        <th className="text-left py-3 px-2 font-bold text-xs w-[100px]" style={{ color: "#5C2E1F" }}>
                          DELIVERY DATE
                        </th>
                        <th className="text-left py-3 px-2 font-bold text-xs w-[200px]" style={{ color: "#5C2E1F" }}>
                          DELIVERY ADDRESS
                        </th>
                        <th className="text-left py-3 px-2 font-bold text-xs w-[90px]" style={{ color: "#5C2E1F" }}>
                          AMOUNT ($)
                        </th>
                        <th className="text-left py-3 px-2 font-bold text-xs w-[100px]" style={{ color: "#5C2E1F" }}>
                          STATUS
                        </th>
                        <th className="text-left py-3 px-2 font-bold text-xs w-[100px]" style={{ color: "#5C2E1F" }}>
                          TRACKING NO
                        </th>
                        <th className="text-left py-3 px-2 font-bold text-xs w-[100px]" style={{ color: "#5C2E1F" }}>
                          INVOICE
                        </th>
                        <th className="text-left py-3 px-2 font-bold text-xs w-[70px]" style={{ color: "#5C2E1F" }}>
                          XERO
                        </th>
                        <th className="text-left py-3 px-2 font-bold text-xs w-[70px]" style={{ color: "#5C2E1F" }}>
                          LABEL
                        </th>
                        <th className="text-left py-3 px-2 font-bold text-xs w-[90px]" style={{ color: "#5C2E1F" }}>
                          STICKER
                        </th>
                        <th className="text-left py-3 px-2 font-bold text-xs w-[50px]" style={{ color: "#5C2E1F" }}>
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
                        <div className="text-red-500 font-medium">
                          Error loading orders
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {error}
                        </div>
                      </td>
                    </tr>
                  ) : currentOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={12}
                        className="text-center py-8 text-gray-500"
                      >
                        {searchQuery
                          ? "No orders found matching your search."
                          : 'No orders found. Click "Create Online Order" to get started.'}
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
                                className={`w-4 h-4 ${canEditOnlineOrders ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                                checked={selectedRows.has(order.id)}
                                onChange={(e) =>
                                  handleSelectRow(order.id, e.target.checked)
                                }
                                disabled={!canEditOnlineOrders}
                              />
                            </td>
                            <td className="py-3 px-2 text-xs w-[180px]" title={order.customer_name}>
                              <div className="truncate">{order.customer_name}</div>
                            </td>
                            <td className="py-3 px-2 text-xs w-[100px] whitespace-nowrap">
                              {formatDate(order.order_date)}
                            </td>
                            <td className="py-3 px-2 text-xs w-[100px] whitespace-nowrap">
                              {formatDate(order.delivery_date)}
                            </td>
                            <td className="py-3 px-2 text-xs w-[200px]" title={order.delivery_address || ""}>
                              <div className="truncate">{order.delivery_address || "-"}</div>
                            </td>
                            <td className="py-3 px-2 text-xs font-medium w-[90px] whitespace-nowrap">
                              ${formatCurrency(order.total_amount)}
                            </td>
                            <td className="py-3 px-2 w-[100px]">
                              <select
                                value={order.status || "pending"}
                                onChange={(e) =>
                                  handleStatusUpdate(order.id, e.target.value)
                                }
                                disabled={updatingStatus[order.id] || !canEditOnlineOrders}
                                className={`px-2 py-1 text-xs font-semibold rounded border-0 ${getStatusBadge(order.status)} ${updatingStatus[order.id] ? "opacity-50 cursor-wait" : ""} ${!canEditOnlineOrders ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                                title={!canEditOnlineOrders ? "You do not have permission to change status" : ""}
                              >
                                <option value="Pending">Pending</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            </td>
                            <td className="py-3 px-2 text-xs w-[100px]">
                              <div className="truncate">{order.tracking_no || "-"}</div>
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
                                onClick={() => handleSyncRowToXero(order)}
                                disabled={syncingRowXero[order.id]}
                                className={`px-2 py-1 text-xs rounded text-white transition-colors ${
                                  order.xero_invoice_id
                                    ? 'bg-teal-600 hover:bg-teal-700'
                                    : 'bg-[#0D909A] hover:bg-[#0a7a82]'
                                } ${syncingRowXero[order.id] ? 'opacity-50 cursor-wait' : ''}`}
                                title={order.xero_invoice_id ? `Synced to Xero (${order.xero_invoice_id}) — click to re-sync` : 'Sync to Xero'}
                              >
                                {syncingRowXero[order.id] ? '...' : order.xero_invoice_id ? 'Synced' : 'Sync'}
                              </button>
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
                            <td className="py-3 px-2 w-[90px]">
                              <div className="relative inline-block">
                                <button
                                  onClick={(e) => {
                                    if (showStickerDropdown === order.id) {
                                      setShowStickerDropdown(null);
                                      setStickerDropdownPosition(null);
                                    } else {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setStickerDropdownPosition({
                                        top: rect.bottom + 4,
                                        left: rect.left
                                      });
                                      setShowStickerDropdown(order.id);
                                    }
                                  }}
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                  title="Sticker Options"
                                >
                                  <Tag size={12} />
                                  Sticker
                                  <ChevronDown size={12} />
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-2 w-[50px]">
                              <button
                                onClick={() => handleRowExpand(order)}
                                className="text-gray-600 hover:text-gray-900 transition-colors p-1"
                                title={
                                  expandedRows[order.id] ? "Collapse" : "Expand"
                                }
                              >
                                {expandedRows[order.id] ? (
                                  <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 15l7-7 7 7"
                                    />
                                  </svg>
                                ) : (
                                  <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 9l-7 7-7-7"
                                    />
                                  </svg>
                                )}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Order Items - Header Row */}
                          {expandedRows[order.id] && (
                            <tr>
                              <td className="py-2 px-2"></td>
                              <td
                                className="py-2 px-4 text-xs font-bold"
                                style={{ color: "gray" }}
                              >
                                NAME
                              </td>
                              <td
                                className="py-2 px-2 text-xs font-bold"
                                style={{ color: "gray" }}
                              >
                                TYPE
                              </td>
                              <td
                                className="py-2 px-2 text-xs font-bold"
                                style={{ color: "gray" }}
                              >
                                GELATO TYPE
                              </td>
                              <td
                                className="py-2 px-2 text-xs font-bold text-center"
                                style={{ color: "gray" }}
                              >
                                QUANTITY
                              </td>
                              <td
                                className="py-2 px-2 text-xs font-bold text-right"
                                style={{ color: "gray" }}
                              >
                                WEIGHT (kg)
                              </td>
                              <td
                                className="py-2 px-2 text-xs font-bold text-right"
                                style={{ color: "gray" }}
                              >
                                UNIT PRICE
                              </td>
                              <td
                                className="py-2 px-2 text-xs font-bold text-right"
                                style={{ color: "gray" }}
                              >
                                AMOUNT ($)
                              </td>
                              <td
                                className="py-2 px-2 text-xs font-bold text-center"
                                style={{ color: "gray" }}
                              >
                                STICKER
                              </td>
                              <td className="py-2 px-2"></td>
                            </tr>
                          )}

                          {/* Expanded Order Items - Data Rows */}
                          {expandedRows[order.id] &&
                          rowOrderItems[order.id] &&
                          rowOrderItems[order.id].length > 0 ? (
                            rowOrderItems[order.id].map((item, index) => (
                              <tr
                                key={`${order.id}-item-${index}`}
                                className="bg-white border-b border-gray-200 hover:bg-gray-50"
                              >
                                <td className="py-2 px-2"></td>
                                <td className="py-2 px-2 text-xs border-l border-gray-400">
                                  {item.product_name}
                                </td>
                                <td className="py-2 px-2 text-xs">
                                  {item.product_type}
                                </td>
                                <td className="py-2 px-2 text-xs">
                                  {item.gelato_type || "N/A"}
                                </td>
                                <td className="py-2 px-2 text-xs text-center">
                                  {item.quantity}
                                </td>
                                <td className="py-2 px-2 text-xs text-right">
                                  {item.calculated_weight}
                                </td>
                                <td className="py-2 px-2 text-xs text-right">
                                  {item.product_price?.toFixed(2) || "0.00"}
                                </td>
                                <td className="py-2 px-2 text-xs text-right font-medium">
                                  {formatCurrency(
                                    item.product_price * item.quantity,
                                  )}
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <div className="relative inline-block">
                                    <button
                                      onClick={(e) => {
                                        if (showItemStickerDropdown === `${order.id}-${index}`) {
                                          setShowItemStickerDropdown(null);
                                          setItemStickerDropdownPosition(null);
                                          setItemStickerDropdownData(null);
                                        } else {
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          setItemStickerDropdownPosition({
                                            top: rect.bottom + 4,
                                            left: rect.left - 80 // offset to align better
                                          });
                                          setShowItemStickerDropdown(`${order.id}-${index}`);
                                          setItemStickerDropdownData({
                                            item,
                                            orderId: order.id,
                                            orderDate: order.order_date
                                          });
                                        }
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-white rounded hover:opacity-80 transition-opacity"
                                      style={{ backgroundColor: '#10B981' }}
                                      title={`Generate ${item.quantity} sticker(s)`}
                                    >
                                      <Tag size={12} />
                                      <span>x{item.quantity}</span>
                                      <ChevronDown size={10} />
                                    </button>
                                  </div>
                                </td>
                                <td className="py-2 px-2"></td>
                              </tr>
                            ))
                          ) : expandedRows[order.id] ? (
                            <tr className="bg-white border-b border-gray-200">
                              <td className="py-2 px-2"></td>
                              <td
                                colSpan={10}
                                className="text-center py-4 text-gray-500 text-xs border-l border-gray-400"
                              >
                                Loading order items...
                              </td>
                            </tr>
                          ) : null}

                          {/* Notes Row */}
                          {expandedRows[order.id] && (
                            <tr className="bg-blue-50 border-b border-gray-200">
                              <td className="py-3 px-2"></td>
                              <td
                                colSpan={10}
                                className="py-3 px-2 border-l border-gray-400"
                              >
                                <div className="flex items-start gap-2">
                                  <span className="text-xs font-bold text-gray-700">
                                    NOTES:
                                  </span>
                                  <span className="text-xs text-gray-600 flex-1">
                                    {order.notes || "No additional notes"}
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
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="text-sm hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ color: "#5C2E1F" }}
                >
                  Previous
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: "#5C2E1F" }}>
                    Page {currentPage} of {totalPages}
                  </span>
                </div>

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="text-sm hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ color: "#5C2E1F" }}
                >
                  Next
                </button>
              </div>
            )}
          </div>

          <CreateOnlineOrderModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={refreshOrders}
          />

          {showLabelGenerator && selectedOrderItems && selectedClientData && (
            <OnlineLabelGenerator
              orderItems={selectedOrderItems}
              clientData={selectedClientData}
              onUpdate={() => setShowLabelGenerator(false)}
            />
          )}

          {showInvoiceModal && selectedOrder && (
            <InvoiceModal
              isOpen={showInvoiceModal}
              onClose={() => setShowInvoiceModal(false)}
              order={selectedOrder}
              orderItems={invoiceOrderItems}
            />
          )}

          {/* Edit Invoice Modal */}
          {showEditInvoiceModal && selectedOrder && (
            <div className="fixed inset-0 z-[60] overflow-auto flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
              <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 shrink-0 rounded-t-lg flex justify-between items-center">
                  <h3 className="text-xl font-bold" style={{ color: '#5C2E1F' }}>
                    Edit Invoice - {selectedOrder.invoice_id || selectedOrder.order_id}
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
                    <p className="text-xs text-gray-500 mt-2">
                      Note: Addresses will be updated for this invoice only.
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

          {/* Edit Order Modal */}
          {showEditOrderModal && selectedOrder && (
            <EditOnlineOrderModal
              isOpen={showEditOrderModal}
              onClose={() => {
                setShowEditOrderModal(false);
                setSelectedOrder(null);
                setSelectedRows(new Set());
              }}
              onSuccess={async () => {
                setShowEditOrderModal(false);
                setSelectedOrder(null);
                setSelectedRows(new Set());
                setIsEditSuccessOpen(true);
                await refreshOrders();
              }}
              order={selectedOrder}
            />
          )}

          {/* Action Toast for Selected Rows */}
          {selectedRows.size > 0 && (
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
                onClick={() => setSelectedRows(new Set())}
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
                {selectedRows.size} item{selectedRows.size === 1 ? "" : "s"}{" "}
                selected
              </span>

              <div
                style={{
                  width: "1px",
                  height: "20px",
                  backgroundColor: "rgba(255, 255, 255, 0.3)",
                }}
              ></div>

              {selectedRows.size === 1 && (
                <>
                  <button
                    onClick={() => {
                      const orderId = Array.from(selectedRows)[0];
                      const order = orders.find((o) => o.id === orderId);
                      if (order) {
                        setSelectedOrder(order);
                        setShowEditOrderModal(true);
                      }
                    }}
                    disabled={loading || !canEditOnlineOrders}
                    className="flex items-center gap-1.5 text-white hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ padding: "2px 6px" }}
                    title={!canEditOnlineOrders ? "You do not have permission to edit orders" : ""}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
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
                onClick={() => setIsDeleteConfirmOpen(true)}
                disabled={loading || !canEditOnlineOrders}
                className="flex items-center gap-1.5 text-white hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ padding: "2px 6px" }}
                title={!canEditOnlineOrders ? "You do not have permission to delete orders" : ""}
              >
                <X size={16} />
                <span className="text-sm">Remove</span>
              </button>
            </div>
          )}
        </main>

        {/* Fixed Sticker Dropdown - Rendered outside container */}
        {showStickerDropdown !== null && stickerDropdownPosition && (
          <>
            {/* Backdrop to close dropdown when clicking outside */}
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => {
                setShowStickerDropdown(null);
                setStickerDropdownPosition(null);
              }}
            />
            <div
              className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] min-w-[140px]"
              style={{
                top: stickerDropdownPosition.top,
                left: stickerDropdownPosition.left
              }}
            >
              <button
                onClick={() => {
                  handleOpenNewStickerModal(showStickerDropdown, "barcode");
                  setShowStickerDropdown(null);
                  setStickerDropdownPosition(null);
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 rounded-t-lg"
              >
                Barcode Sticker
              </button>
              <button
                onClick={() => {
                  handleOpenNewStickerModal(showStickerDropdown, "product");
                  setShowStickerDropdown(null);
                  setStickerDropdownPosition(null);
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 rounded-b-lg"
              >
                Product Sticker
              </button>
            </div>
          </>
        )}

        {/* Fixed Item Sticker Dropdown - Rendered outside container */}
        {showItemStickerDropdown !== null && itemStickerDropdownPosition && itemStickerDropdownData && (
          <>
            {/* Backdrop to close dropdown when clicking outside */}
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => {
                setShowItemStickerDropdown(null);
                setItemStickerDropdownPosition(null);
                setItemStickerDropdownData(null);
              }}
            />
            <div
              className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] min-w-[140px]"
              style={{
                top: itemStickerDropdownPosition.top,
                left: itemStickerDropdownPosition.left
              }}
            >
              <button
                onClick={() => {
                  handleItemStickerModal(
                    itemStickerDropdownData.item,
                    itemStickerDropdownData.orderId,
                    itemStickerDropdownData.orderDate,
                    "barcode"
                  );
                  setShowItemStickerDropdown(null);
                  setItemStickerDropdownPosition(null);
                  setItemStickerDropdownData(null);
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 rounded-t-lg"
              >
                Barcode Sticker
              </button>
              <button
                onClick={() => {
                  handleItemStickerModal(
                    itemStickerDropdownData.item,
                    itemStickerDropdownData.orderId,
                    itemStickerDropdownData.orderDate,
                    "product"
                  );
                  setShowItemStickerDropdown(null);
                  setItemStickerDropdownPosition(null);
                  setItemStickerDropdownData(null);
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 rounded-b-lg"
              >
                Product Sticker
              </button>
            </div>
          </>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div
            className="fixed inset-0 flex items-center justify-center z-60"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          >
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
              <div className="flex items-center gap-3 mb-4">
                <Check className="text-green-500" size={24} />
                <h3 className="font-bold text-lg">Success</h3>
              </div>
              <p className="text-gray-600 mb-4">{successMessage}</p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* Warning Modal */}
        {showWarningModal && (
          <div
            className="fixed inset-0 flex items-center justify-center z-60"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          >
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
              <div className="flex items-center gap-3 mb-4">
                <X className="text-red-500" size={24} />
                <h3 className="font-bold text-lg">Warning</h3>
              </div>
              <p className="text-gray-600 mb-4">{warningMessage}</p>
              <button
                onClick={() => setShowWarningModal(false)}
                className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600"
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirm Modal */}
        {showDeleteConfirmModal && (
          <div
            className="fixed inset-0 flex items-center justify-center z-60"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          >
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
              <h3 className="font-bold text-lg mb-4">Confirm Delete</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete this header option?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="flex-1 border border-gray-300 py-2 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (headerToDelete) {
                      const { error } = await supabase
                        .from("header_options")
                        .delete()
                        .eq("id", headerToDelete);
                      if (!error) {
                        const { data } = await supabase
                          .from("header_options")
                          .select("*")
                          .order("is_default", { ascending: false });
                        if (data) setHeaderOptions(data);
                        setSuccessMessage("Header deleted successfully");
                        setShowSuccessModal(true);
                      }
                    }
                    setShowDeleteConfirmModal(false);
                    setHeaderToDelete(null);
                  }}
                  className="flex-1 bg-red-500 text-white py-2 rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Success Modal */}
        {isEditSuccessOpen && (
          <div
            className="fixed inset-0 flex items-center justify-center z-60"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          >
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
              <div className="flex items-center gap-3 mb-4">
                <Check className="text-green-500" size={24} />
                <h3 className="font-bold text-lg">Success</h3>
              </div>
              <p className="text-gray-600 mb-4">Order updated successfully!</p>
              <button
                onClick={() => setIsEditSuccessOpen(false)}
                className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* Edit Confirm Modal */}
        {showEditConfirmModal && headerToEdit && (
          <div
            className="fixed inset-0 flex items-center justify-center z-60"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
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
                      line1: headerToEdit.line1 || "",
                      line2: headerToEdit.line2 || "",
                      line3: headerToEdit.line3 || "",
                      line4: headerToEdit.line4 || "",
                      line5: headerToEdit.line5 || "",
                      line6: headerToEdit.line6 || "",
                      line7: headerToEdit.line7 || "",
                    });
                    setShowHeaderEditor(true);
                    setShowEditConfirmModal(false);
                    setHeaderToEdit(null);
                  }}
                  className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status Change Confirmation Modal */}
        {showStatusConfirmModal && statusChangeData && (
          <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
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
              <h3 className="text-lg font-bold text-center mb-3" style={{ color: "#5C2E1F" }}>
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
                <p className="text-sm font-bold text-center mt-1" style={{ color: "#5C2E1F" }}>
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
                  style={{ color: "#5C2E1F" }}
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
          <div
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          >
            <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <X size={32} className="text-red-600" />
                </div>
              </div>
              <h2
                className="text-2xl font-bold mb-2"
                style={{ color: "#5C2E1F" }}
              >
                Confirm Order Removal
              </h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to remove {selectedRows.size}{" "}
                {selectedRows.size === 1 ? "order" : "orders"}? This action
                cannot be undone.
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
                  {loading ? "Removing..." : "Remove"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Delete Confirm Modal */}
        {showFooterDeleteConfirmModal && (
          <div
            className="fixed inset-0 flex items-center justify-center z-60"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          >
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
              <h3 className="font-bold text-lg mb-4">Confirm Delete</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete this footer option?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowFooterDeleteConfirmModal(false)}
                  className="flex-1 border border-gray-300 py-2 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (footerToDelete) {
                      const { error } = await supabase
                        .from("footer_options")
                        .delete()
                        .eq("id", footerToDelete);
                      if (!error) {
                        const { data } = await supabase
                          .from("footer_options")
                          .select("*")
                          .order("is_default", { ascending: false });
                        if (data) setFooterOptions(data);
                        setSuccessMessage("Footer deleted successfully");
                        setShowSuccessModal(true);
                      }
                    }
                    setShowFooterDeleteConfirmModal(false);
                    setFooterToDelete(null);
                  }}
                  className="flex-1 bg-red-500 text-white py-2 rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Edit Confirm Modal */}
        {showFooterEditConfirmModal && footerToEdit && (
          <div
            className="fixed inset-0 flex items-center justify-center z-60"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
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
                      line1: footerToEdit.line1 || "",
                      line2: footerToEdit.line2 || "",
                      line3: footerToEdit.line3 || "",
                      line4: footerToEdit.line4 || "",
                      line5: footerToEdit.line5 || "",
                    });
                    setShowFooterEditor(true);
                    setShowFooterEditConfirmModal(false);
                    setFooterToEdit(null);
                  }}
                  className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Success Modal */}
        {isDeleteSuccessOpen && (
          <div
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          >
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
              <h2
                className="text-2xl font-bold mb-2"
                style={{ color: "#5C2E1F" }}
              >
                Successfully Removed!
              </h2>
              <p className="text-gray-600 mb-6">
                Order(s) have been removed from the system.
              </p>
              <button
                onClick={() => setIsDeleteSuccessOpen(false)}
                className="px-16 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#FF5722" }}
              >
                OK
              </button>
            </div>
          </div>
        )}
        {showInvoiceModal && selectedOrder && (
          <InvoiceModal
            isOpen={showInvoiceModal}
            onClose={() => setShowInvoiceModal(false)}
            order={selectedOrder}
            orderItems={invoiceOrderItems}
          />
        )}

        {/* Header Editor Modal */}
        {showHeaderEditor && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-60 p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          >
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h3 className="text-xl font-bold" style={{ color: '#5C2E1F' }}>
                  {editingHeaderId ? 'Edit Header Option' : 'Create Header Option'}
                </h3>
                <div className="flex items-center gap-2">
                  {editingHeaderId && (
                    <button 
                      onClick={() => handleDeleteHeaderOption(editingHeaderId)} 
                      className="text-red-600 hover:text-red-800 text-sm px-3 py-1 border border-red-300 rounded hover:bg-red-50"
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
                    className="text-gray-600 hover:text-gray-800"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Option Name *</label>
                    <input 
                      type="text" 
                      value={headerFormData.option_name} 
                      onChange={(e) => handleHeaderInputChange('option_name', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                      placeholder="e.g., Main Office"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Line 1</label>
                    <input 
                      type="text" 
                      value={headerFormData.line1} 
                      onChange={(e) => handleHeaderInputChange('line1', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                      placeholder="Line 1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Line 2</label>
                    <input 
                      type="text" 
                      value={headerFormData.line2} 
                      onChange={(e) => handleHeaderInputChange('line2', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                      placeholder="Line 2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Line 3</label>
                    <input 
                      type="text" 
                      value={headerFormData.line3} 
                      onChange={(e) => handleHeaderInputChange('line3', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                      placeholder="Line 3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Line 4</label>
                    <input 
                      type="text" 
                      value={headerFormData.line4} 
                      onChange={(e) => handleHeaderInputChange('line4', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                      placeholder="Line 4"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Line 5</label>
                    <input 
                      type="text" 
                      value={headerFormData.line5} 
                      onChange={(e) => handleHeaderInputChange('line5', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                      placeholder="Line 5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Line 6</label>
                    <input 
                      type="text" 
                      value={headerFormData.line6} 
                      onChange={(e) => handleHeaderInputChange('line6', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                      placeholder="Line 6"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Line 7</label>
                    <input 
                      type="text" 
                      value={headerFormData.line7} 
                      onChange={(e) => handleHeaderInputChange('line7', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                      placeholder="Line 7"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
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
                    className="flex-1 border border-gray-300 py-2 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveHeaderOption} 
                    className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Editor Modal */}
        {showFooterEditor && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-60 p-4" 
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          >
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h3 className="text-xl font-bold" style={{ color: '#5C2E1F' }}>
                  {editingFooterId ? 'Edit Footer Option' : 'Create Footer Option'}
                </h3>
                <div className="flex items-center gap-2">
                  {editingFooterId && (
                    <button 
                      onClick={() => handleDeleteFooterOption(editingFooterId)} 
                      className="text-red-600 hover:text-red-800 text-sm px-3 py-1 border border-red-300 rounded hover:bg-red-50"
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
                    className="text-gray-600 hover:text-gray-800"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Option Name *</label>
                    <input 
                      type="text" 
                      value={footerFormData.option_name} 
                      onChange={(e) => handleFooterInputChange('option_name', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                      placeholder="e.g., Standard Payment Info"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Line 1</label>
                    <input 
                      type="text" 
                      value={footerFormData.line1} 
                      onChange={(e) => handleFooterInputChange('line1', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                      placeholder="Line 1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Line 2</label>
                    <input 
                      type="text" 
                      value={footerFormData.line2} 
                      onChange={(e) => handleFooterInputChange('line2', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                      placeholder="Line 2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Line 3</label>
                    <input 
                      type="text" 
                      value={footerFormData.line3} 
                      onChange={(e) => handleFooterInputChange('line3', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                      placeholder="Line 3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Line 4</label>
                    <input 
                      type="text" 
                      value={footerFormData.line4} 
                      onChange={(e) => handleFooterInputChange('line4', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                      placeholder="Line 4"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Line 5</label>
                    <input 
                      type="text" 
                      value={footerFormData.line5} 
                      onChange={(e) => handleFooterInputChange('line5', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                      placeholder="Line 5"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
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
                    className="flex-1 border border-gray-300 py-2 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveFooterOption} 
                    className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                  >
                    Save
                  </button>
                </div>
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
      </div>
    </div>
  );
}
