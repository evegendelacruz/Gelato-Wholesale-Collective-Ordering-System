"use client";
import Sidepanel from "@/app/components/sidepanel/page";
import Header from "@/app/components/header/page";
import supabase from "@/lib/client";
import { useState, useEffect, Fragment, useCallback } from "react";
import { Search, Filter, Plus, X, Check, ChevronDown } from "lucide-react";
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
  status: string;
  notes: string | null;
  tracking_no: string;
  created_at: string;
  updated_at: string;
  total_amount: number;
  invoice_id: string;
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
}

export default function OnlineOrderPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const itemsPerPage = 10;
  const [updatingStatus, setUpdatingStatus] = useState<Record<number, boolean>>(
    {},
  );
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

  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    setUpdatingStatus((prev) => ({ ...prev, [orderId]: true }));
    try {
      const { error } = await supabase
        .from("customer_order")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order,
        ),
      );
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update order status");
    } finally {
      setUpdatingStatus((prev) => ({ ...prev, [orderId]: false }));
    }
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

        // Calculate total amount from order items using product_price
        const totalAmount = (data || []).reduce(
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
          [order.id]: data || [],
        }));
      } catch (error) {
        console.error("Error fetching order items:", error);
      }
    }
  };

  const handleGenerateLabels = async (order: Order) => {
    try {
      const { data, error } = await supabase
        .from("customer_order_item")
        .select("*")
        .eq("order_id", order.id);

      if (error) throw error;

      setSelectedOrderItems(data || []);
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

  const handleViewInvoice = async (order: Order) => {
    try {
      const { data, error } = await supabase
        .from("customer_order_item")
        .select("*")
        .eq("order_id", order.id);

      if (error) throw error;

      setSelectedOrder(order);
      setInvoiceOrderItems(data || []);
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
    const getGST = () => getSubtotal() * 0.09;
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

    const generatePDFContent = (doc: jsPDF) => {
      doc.setFont("helvetica");
      const selectedHeader = headerOptions.find(
        (h) => h.id === selectedHeaderId,
      );
      renderHeaderInPDF(doc, selectedHeader);

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
      const billAddress = doc.splitTextToSize(
        order.delivery_address || "N/A",
        45,
      );
      doc.text(billAddress, 20, 77);

      doc.setFont("helvetica", "bold");
      doc.text("SHIP TO", 75, 67);
      doc.setFont("helvetica", "normal");
      doc.text(order.customer_name || "N/A", 75, 72);
      const shipAddress = doc.splitTextToSize(
        order.delivery_address || "N/A",
        45,
      );
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

      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      let yPos = tableStartY + 13;

      orderItems.forEach((item) => {
        const productText = item.product_type || item.product_name;
        doc.setFont("helvetica", "bold");
        const productLines = doc.splitTextToSize(productText, 30);
        const descriptionText = item.product_name;
        doc.text(productLines, 22, yPos);

        doc.setFont("helvetica", "normal");
        const descLines = doc.splitTextToSize(descriptionText, 50);
        doc.text(descLines, 60, yPos);

        const maxLines = Math.max(productLines.length, descLines.length);
        const centerY = yPos + ((maxLines - 1) * 4) / 2;

        doc.text(item.quantity.toString(), 150, centerY, { align: "center" });
        doc.text(item.product_price.toFixed(2), 168, centerY, {
          align: "right",
        });
        doc.text((item.product_cost * item.quantity).toFixed(2), 185, centerY, {
          align: "right",
        });

        yPos += maxLines * 4 + 1;
      });

      doc.setDrawColor(224, 224, 224);
      doc.setLineWidth(0.2);
      for (let i = 20; i < 190; i += 1.5) {
        doc.line(i, yPos + 2, i + 0.75, yPos + 2);
      }

      yPos += 7;
      doc.setFont("helvetica", "normal");
      doc.text("Terms & Conditions", 20, yPos);
      doc.setFontSize(10);
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

      const totalsLabelX = 100;
      const totalsValueX = 185;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("SUBTOTAL", totalsLabelX, yPos + 5);
      doc.text(subtotal.toFixed(2), totalsValueX, yPos + 5, { align: "right" });

      doc.text("GST 9%", totalsLabelX, yPos + 10);
      doc.text(gst.toFixed(2), totalsValueX, yPos + 10, { align: "right" });

      doc.text("TOTAL", totalsLabelX, yPos + 15);
      doc.text(total.toFixed(2), totalsValueX, yPos + 15, { align: "right" });

      doc.text("BALANCE DUE", totalsLabelX, yPos + 23);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`$${total.toFixed(2)}`, totalsValueX, yPos + 23, {
        align: "right",
      });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const selectedFooter = footerOptions.find(
        (f) => f.id === selectedFooterId,
      );
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
        generatePDFContent(doc);
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
        generatePDFContent(doc);
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
                      onChange={() => setSelectedHeaderId(header.id)}
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
            <div
              className="bg-white shadow-lg mx-auto"
              style={{
                fontFamily: "Arial, sans-serif",
                width: "210mm",
                minHeight: "297mm",
                padding: "20mm",
                boxSizing: "border-box",
              }}
            >
              {/* Header Section */}
              {headerOptions.find((h) => h.id === selectedHeaderId) &&
                (() => {
                  const header = headerOptions.find(
                    (h) => h.id === selectedHeaderId,
                  );
                  return (
                    <div className="mb-2">
                      {header?.line1 && (
                        <div className="font-bold text-[10px]">
                          {header.line1}
                        </div>
                      )}
                      {header?.line2 && (
                        <div className="text-[10px]">{header.line2}</div>
                      )}
                      {header?.line3 && (
                        <div className="text-[10px]">{header.line3}</div>
                      )}
                      {header?.line4 && (
                        <div className="text-[10px]">{header.line4}</div>
                      )}
                      {header?.line5 && (
                        <div className="text-[10px]">{header.line5}</div>
                      )}
                      {header?.line6 && (
                        <div className="text-[10px]">{header.line6}</div>
                      )}
                      {header?.line7 && (
                        <div className="text-[10px]">{header.line7}</div>
                      )}
                    </div>
                  );
                })()}

              {/* Tax Invoice Title */}
              <h2
                className="text-xl font-light mb-3"
                style={{ color: "#0D909A" }}
              >
                Invoice
              </h2>

              {/* Three Column Section */}
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div>
                  <h3 className="font-bold text-[10px] mb-1">BILL TO</h3>
                  <p className="text-[10px] font-bold">
                    {order.customer_name || "N/A"}
                  </p>
                  <p className="text-[10px] text-gray-700 max-w-150px wrap-break-words">
                    {order.delivery_address || "N/A"}
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-[10px] mb-1">SHIP TO</h3>
                  <p className="text-[10px] font-bold">
                    {order.customer_name || "N/A"}
                  </p>
                  <p className="text-[10px] text-gray-700 max-w-150px wrap-break-words">
                    {order.delivery_address || "N/A"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] mb-0.5">
                    <strong>INVOICE NO.</strong> {order.invoice_id || "N/A"}
                  </p>
                  <p className="text-[10px] mb-0.5">
                    <strong>DATE</strong> {formatDate(order.delivery_date)}
                  </p>
                  <p className="text-[10px] mb-0.5">
                    <strong>DUE DATE</strong> {formatDate(order.delivery_date)}
                  </p>
                  <p className="text-[10px]">
                    <strong>TERMS</strong> Due on receipt
                  </p>
                </div>
              </div>

              {/* Horizontal Divider */}
              <div
                className="border-t mb-3"
                style={{ borderColor: "#4db8ba" }}
              ></div>

              {/* Shipping Section */}
              <div className="flex justify-between px-3 py-2 mb-3">
                <div className="text-[10px]">
                  <strong className="block mb-1">SHIP DATE</strong>
                  <span>{formatDate(order.delivery_date)}</span>
                </div>
                <div className="text-[10px]">
                  <strong className="block mb-1">TRACKING NO.</strong>
                  <span>{order.tracking_no || "N/A"}</span>
                </div>
              </div>

              {/* Table */}
              <div className="mb-3">
                <div
                  className="grid grid-cols-[1.2fr_1.8fr_0.6fr_0.8fr_0.8fr] gap-2 p-2 text-[10px] font-bold"
                  style={{
                    background: "rgba(184, 230, 231, 0.5)",
                    color: "#4db8ba",
                  }}
                >
                  <div>PRODUCT / SERVICES</div>
                  <div>DESCRIPTION</div>
                  <div className="text-center">QTY</div>
                  <div className="text-right">UNIT PRICE</div>
                  <div className="text-right">AMOUNT</div>
                </div>
                {orderItems.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[1.2fr_1.8fr_0.6fr_0.8fr_0.8fr] gap-2 p-2 text-[10px]"
                  >
                    <div>{item.product_type || item.product_name}</div>
                    <div className="text-gray-700">{item.product_name}</div>
                    <div className="text-center">{item.quantity}</div>
                    <div className="text-right">
                      {formatCurrency(item.product_price)}
                    </div>
                    <div className="text-right font-medium">
                      {formatCurrency(item.product_price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Section */}
              <div className="grid grid-cols-2 gap-8 mt-2 pt-2 border-t-2 border-dashed border-gray-300">
                {/* Terms & Conditions */}
                <div className="pr-4">
                  <h3 className="font-bold text-[10px] mb-2 mt-1">
                    Terms & Conditions
                  </h3>
                  <p className="text-[10px] leading-relaxed mb-2 text-gray-700">
                    We acknowledge that the above goods are received in good
                    condition. Please inform us of any issues within 24 hours.
                    Otherwise, kindly note no return or refunds accepted.
                  </p>
                  <p className="text-[10px] leading-relaxed mb-4 text-gray-700">
                    We are not liable for any damage to products once stored at
                    your premises. Please keep frozen products (gelato and / or
                    popsicles) frozen at -18 degree Celsius and below.
                  </p>
                  <div className="border-t border-black pt-1 w-250px mt-8">
                    <p className="text-[10px]">
                      Client&apos;s Signature & Company Stamp
                    </p>
                  </div>
                </div>

                {/* Totals */}
                <div className="text-right">
                  <div className="flex justify-end mb-1.5 text-[10px]">
                    <div className="w-32 text-right pr-4 font-bold">
                      SUBTOTAL
                    </div>
                    <div className="w-24 text-right">
                      {formatCurrency(subtotal)}
                    </div>
                  </div>
                  <div className="flex justify-end mb-1.5 text-[10px]">
                    <div className="w-32 text-right pr-4 font-bold">GST 9%</div>
                    <div className="w-24 text-right">{formatCurrency(gst)}</div>
                  </div>
                  <div className="flex justify-end mb-1.5 text-[10px]">
                    <div className="w-32 text-right pr-4 font-bold">TOTAL</div>
                    <div className="w-24 text-right font-medium">
                      {formatCurrency(total)}
                    </div>
                  </div>
                  <div className="flex justify-end mt-2 pt-0">
                    <div className="w-32 text-right pr-4 font-bold text-[10px]">
                      BALANCE DUE
                    </div>
                    <div className="w-24 text-right text-base font-bold">
                      ${formatCurrency(total)}
                    </div>
                  </div>
                </div>
              </div>
              {/* Footer */}
              <div className="mt-16 text-center text-[10px] leading-relaxed text-gray-700">
                {footerOptions.find((f) => f.id === selectedFooterId) &&
                  (() => {
                    const footer = footerOptions.find(
                      (f) => f.id === selectedFooterId,
                    );
                    return (
                      <>
                        {footer?.line1 && (
                          <p className="mb-1">{footer.line1}</p>
                        )}
                        {footer?.line2 && (
                          <p className="mb-1">{footer.line2}</p>
                        )}
                        {footer?.line3 && (
                          <p className="mb-1">{footer.line3}</p>
                        )}
                        {footer?.line4 && (
                          <p className="mb-1">{footer.line4}</p>
                        )}
                        {footer?.line5 && (
                          <p className="mb-1">{footer.line5}</p>
                        )}
                      </>
                    );
                  })()}
              </div>
            </div>
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
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6" style={{ backgroundColor: "#FCF0E3" }}>
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
                  className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "#FF5722" }}
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

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b-2" style={{ borderColor: "#5C2E1F" }}>
                    <th className="text-left py-3 px-2 w-10">
                      <input
                        type="checkbox"
                        className="w-4 h-4 cursor-pointer"
                        checked={
                          selectedRows.size === currentOrders.length &&
                          currentOrders.length > 0
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                    <th
                      className="text-left py-3 px-2 font-bold text-xs whitespace-nowrap"
                      style={{ color: "#5C2E1F" }}
                    >
                      ORDER ID
                    </th>
                    <th
                      className="text-left py-3 px-3 font-bold text-xs whitespace-nowrap"
                      style={{ color: "#5C2E1F" }}
                    >
                      CUSTOMER NAME
                    </th>
                    <th
                      className="text-left py-3 px-2 font-bold text-xs whitespace-nowrap"
                      style={{ color: "#5C2E1F" }}
                    >
                      ORDER DATE
                    </th>
                    <th
                      className="text-left py-3 px-2 font-bold text-xs whitespace-nowrap"
                      style={{ color: "#5C2E1F" }}
                    >
                      DELIVERY DATE
                    </th>
                    <th
                      className="text-left py-3 px-2 font-bold text-xs whitespace-nowrap"
                      style={{ color: "#5C2E1F" }}
                    >
                      DELIVERY ADDRESS
                    </th>
                    <th
                      className="text-left py-3 px-2 font-bold text-xs whitespace-nowrap"
                      style={{ color: "#5C2E1F" }}
                    >
                      AMOUNT ($)
                    </th>
                    <th
                      className="text-left py-3 px-2 font-bold text-xs whitespace-nowrap"
                      style={{ color: "#5C2E1F" }}
                    >
                      STATUS
                    </th>
                    <th
                      className="text-left py-3 px-2 font-bold text-xs whitespace-nowrap"
                      style={{ color: "#5C2E1F" }}
                    >
                      TRACKING NO
                    </th>
                    <th
                      className="text-left py-3 px-2 font-bold text-xs whitespace-nowrap"
                      style={{ color: "#5C2E1F" }}
                    >
                      INVOICE
                    </th>
                    <th
                      className="text-left py-3 px-2 font-bold text-xs whitespace-nowrap"
                      style={{ color: "#5C2E1F" }}
                    >
                      LABEL
                    </th>
                    <th
                      className="text-left py-3 px-2 font-bold text-xs whitespace-nowrap"
                      style={{ color: "#5C2E1F" }}
                    >
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={12}
                        className="text-center py-8 text-gray-500"
                      >
                        Loading orders...
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
                            <td className="py-3 px-2">
                              <input
                                type="checkbox"
                                className="w-4 h-4 cursor-pointer"
                                checked={selectedRows.has(order.id)}
                                onChange={(e) =>
                                  handleSelectRow(order.id, e.target.checked)
                                }
                              />
                            </td>
                            <td className="py-3 px-2 text-xs font-medium whitespace-nowrap">
                              {order.order_id}
                            </td>
                            <td
                              className="py-3 px-3 text-xs max-w-37.5 truncate"
                              title={order.customer_name}
                            >
                              {order.customer_name}
                            </td>
                            <td className="py-3 px-2 text-xs whitespace-nowrap">
                              {formatDate(order.order_date)}
                            </td>
                            <td className="py-3 px-2 text-xs whitespace-nowrap">
                              {formatDate(order.delivery_date)}
                            </td>
                            <td
                              className="py-3 px-2 text-xs max-w-37.5 truncate"
                              title={order.delivery_address || ""}
                            >
                              {order.delivery_address || "-"}
                            </td>
                            <td className="py-3 px-2 text-xs font-medium whitespace-nowrap">
                              ${formatCurrency(order.total_amount)}
                            </td>
                            <td className="py-3 px-2">
                              <select
                                value={order.status || "pending"}
                                onChange={(e) =>
                                  handleStatusUpdate(order.id, e.target.value)
                                }
                                disabled={updatingStatus[order.id]}
                                className={`px-2 py-1 text-xs font-semibold rounded border-0 cursor-pointer ${getStatusBadge(order.status)} ${updatingStatus[order.id] ? "opacity-50 cursor-wait" : ""}`}
                              >
                                <option value="Pending">Pending</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            </td>
                            <td className="py-3 px-2 text-xs whitespace-nowrap">
                              {order.tracking_no || "-"}
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
                              <td className="py-2 px-2"></td>
                              <td className="py-2 px-2"></td>
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
                                <td className="py-2 px-2"></td>
                                <td className="py-2 px-2"></td>
                                <td className="py-2 px-2"></td>
                              </tr>
                            ))
                          ) : expandedRows[order.id] ? (
                            <tr className="bg-white border-b border-gray-200">
                              <td className="py-2 px-2"></td>
                              <td
                                colSpan={11}
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
                                colSpan={11}
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
                    disabled={loading}
                    className="flex items-center gap-1.5 text-white hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ padding: "2px 6px" }}
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
                disabled={loading}
                className="flex items-center gap-1.5 text-white hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ padding: "2px 6px" }}
              >
                <X size={16} />
                <span className="text-sm">Remove</span>
              </button>
            </div>
          )}
        </main>
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
      </div>
    </div>
  );
}
