'use client';
import Sidepanel from '@/app/components/sidepanel/page';
import Header from '@/app/components/header/page';
import supabase from '@/lib/client';
import { useState, useEffect, Fragment } from 'react';
import { Search, Filter, Plus, X, Check, ChevronDown } from 'lucide-react';
import CreateOnlineOrderModal from '@/app/components/createOnlineOrderModal/page';

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
  display_product_name: string;
  product_price: number;
  product_cost: number;
  product_list?: {
    product_type: string;
    product_name: string;
    product_weight: string;
  };
}

export default function OnlineOrderPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const itemsPerPage = 10;
  const [updatingStatus, setUpdatingStatus] = useState<Record<number, boolean>>({});
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [rowOrderItems, setRowOrderItems] = useState<Record<number, OrderItem[]>>({});
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [sortBy, setSortBy] = useState('order_date_desc'); 
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleteSuccessOpen, setIsDeleteSuccessOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const toggleRowExpansion = (orderId: number) => {
    setExpandedRows(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  useEffect(() => {
    const filterDate = sessionStorage.getItem('filterDeliveryDate');
    if (filterDate) {
        setSearchQuery(filterDate);
        sessionStorage.removeItem('filterDeliveryDate');
    }
    }, []);

    useEffect(() => {
    const fetchOrders = async () => {
        try {
        setLoading(true);
        
        const { data, error: supabaseError } = await supabase
            .from('customer_order')
            .select('*')
            .order('order_date', { ascending: false });

        if (supabaseError) {
            throw new Error(`${supabaseError.message} (Code: ${supabaseError.code})`);
        }

        if (!data) {
            setOrders([]);
        } else {
            setOrders(data);
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

    const refreshOrders = async () => {
    try {
        setLoading(true);
        
        const { data, error: supabaseError } = await supabase
        .from('customer_order')
        .select('*')
        .order('order_date', { ascending: false });

        if (supabaseError) {
        throw new Error(`${supabaseError.message} (Code: ${supabaseError.code})`);
        }

        if (data) {
        setOrders(data);
        }
        
        setError(null);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching orders';
        setError(errorMessage);
        console.error('Error fetching orders:', err);
    } finally {
        setLoading(false);
    }
    };


  const filteredOrders = orders.filter(order => {
    const searchLower = searchQuery.toLowerCase();
    const deliveryDateStr = order.delivery_date ? new Date(order.delivery_date).toISOString().split('T')[0] : '';
    
    const matchesSearch = (
      order.order_id?.toString().toLowerCase().includes(searchLower) ||
      order.delivery_address?.toLowerCase().includes(searchLower) ||
      order.status?.toLowerCase().includes(searchLower) ||
      order.tracking_no?.toLowerCase().includes(searchLower) ||
      order.customer_name?.toLowerCase().includes(searchLower) ||
      deliveryDateStr.includes(searchQuery)
    );

    const matchesFilter = filterStatus === 'all' || 
      order.status?.toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'order_date_desc':
        return new Date(b.order_date).getTime() - new Date(a.order_date).getTime();
      case 'order_date_asc':
        return new Date(a.order_date).getTime() - new Date(b.order_date).getTime();
      case 'delivery_date_desc':
        return new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime();
      case 'delivery_date_asc':
        return new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime();
      case 'order_id_asc':
        return (a.order_id || '').localeCompare(b.order_id || '');
      case 'order_id_desc':
        return (b.order_id || '').localeCompare(a.order_id || '');
      case 'customer_asc':
        return (a.customer_name || '').localeCompare(b.customer_name || '');
      case 'customer_desc':
        return (b.customer_name || '').localeCompare(a.customer_name || '');
      default:
        return 0;
    }
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const formatDate = (dateString: string) => {
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

  const handleDelete = async () => {
    try {
      setLoading(true);
      const idsToDelete = Array.from(selectedRows);
      
      const { error: itemsError } = await supabase
        .from('customer_order_item')
        .delete()
        .in('order_id', idsToDelete);
      
      if (itemsError) throw itemsError;
      
      const { error: ordersError } = await supabase
        .from('customer_order')
        .delete()
        .in('id', idsToDelete);
      
      if (ordersError) throw ordersError;
      
      const { data, error: fetchError } = await supabase
        .from('customer_order')
        .select('*')
        .order('order_date', { ascending: false });

      if (!fetchError && data) {
        setOrders(data);
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

  const handleRowExpand = async (order: Order) => {
    if (expandedRows[order.id]) {
      toggleRowExpansion(order.id);
      return;
    }

    if (!rowOrderItems[order.id]) {
      try {
        const { data: items } = await supabase
          .from('customer_order_item')
          .select('*')
          .eq('order_id', order.id);

        setRowOrderItems(prev => ({
          ...prev,
          [order.id]: items || []
        }));
      } catch (error) {
        console.error('Error fetching order items:', error);
      }
    }

    toggleRowExpansion(order.id);
};

  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    try {
      setUpdatingStatus(prev => ({ ...prev, [orderId]: true }));
      
      const { error: updateError } = await supabase
        .from('customer_order')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (updateError) throw updateError;

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

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || 'pending';
    
    const statusStyles: Record<string, string> = {
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
                Online Orders
              </h1>
              
              <div className="flex items-center gap-4">
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
                        <button onClick={() => { setSortBy('order_date_desc'); setShowSortDropdown(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortBy === 'order_date_desc' ? 'bg-gray-50 font-medium' : ''}`}>Order Date (Newest First)</button>
                        <button onClick={() => { setSortBy('order_date_asc'); setShowSortDropdown(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortBy === 'order_date_asc' ? 'bg-gray-50 font-medium' : ''}`}>Order Date (Oldest First)</button>
                        <button onClick={() => { setSortBy('delivery_date_desc'); setShowSortDropdown(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortBy === 'delivery_date_desc' ? 'bg-gray-50 font-medium' : ''}`}>Delivery Date (Newest First)</button>
                        <button onClick={() => { setSortBy('delivery_date_asc'); setShowSortDropdown(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortBy === 'delivery_date_asc' ? 'bg-gray-50 font-medium' : ''}`}>Delivery Date (Oldest First)</button>
                        <button onClick={() => { setSortBy('order_id_asc'); setShowSortDropdown(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortBy === 'order_id_asc' ? 'bg-gray-50 font-medium' : ''}`}>Order ID (A-Z)</button>
                        <button onClick={() => { setSortBy('order_id_desc'); setShowSortDropdown(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortBy === 'order_id_desc' ? 'bg-gray-50 font-medium' : ''}`}>Order ID (Z-A)</button>
                        <button onClick={() => { setSortBy('customer_asc'); setShowSortDropdown(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortBy === 'customer_asc' ? 'bg-gray-50 font-medium' : ''}`}>Customer Name (A-Z)</button>
                        <button onClick={() => { setSortBy('customer_desc'); setShowSortDropdown(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortBy === 'customer_desc' ? 'bg-gray-50 font-medium' : ''}`}>Customer Name (Z-A)</button>
                      </div>
                    </div>
                  )}
                </div>

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
                      <span className="ml-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">1</span>
                    )}
                  </button>
                  
                  {showFilterDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="py-1">
                        <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Status</div>
                        <button onClick={() => { setFilterStatus('all'); setShowFilterDropdown(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${filterStatus === 'all' ? 'bg-gray-50 font-medium' : ''}`}>All Orders</button>
                        <button onClick={() => { setFilterStatus('pending'); setShowFilterDropdown(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${filterStatus === 'pending' ? 'bg-gray-50 font-medium' : ''}`}>Pending</button>
                        <button onClick={() => { setFilterStatus('completed'); setShowFilterDropdown(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${filterStatus === 'completed' ? 'bg-gray-50 font-medium' : ''}`}>Completed</button>
                        <button onClick={() => { setFilterStatus('cancelled'); setShowFilterDropdown(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${filterStatus === 'cancelled' ? 'bg-gray-50 font-medium' : ''}`}>Cancelled</button>
                        {filterStatus !== 'all' && (
                          <>
                            <div className="border-t border-gray-200 my-1"></div>
                            <button onClick={() => { setFilterStatus('all'); setShowFilterDropdown(false); }} className="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-gray-100">Clear Filter</button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#FF5722' }}
                    >
                    <Plus size={20} />
                    <span>Create Online Order</span>
                    </button>
              </div>
            </div>

            {!loading && !error && (
              <div className="mb-4 text-sm text-gray-600">
                Showing {currentOrders.length} of {filteredOrders.length} orders
                {searchQuery && ` (filtered from ${orders.length} total)`}
              </div>
            )}

            {searchQuery && searchQuery.match(/^\d{4}-\d{2}-\d{2}$/) && (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-sm text-gray-600">Filtering by delivery date:</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-2">
                  {new Date(searchQuery).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  <button onClick={() => setSearchQuery('')} className="hover:bg-blue-200 rounded-full p-0.5">
                    <X size={14} />
                  </button>
                </span>
              </div>
            )}

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
                    <th className="text-left py-3 px-2 font-bold text-xs whitespace-nowrap" style={{ color: '#5C2E1F' }}>ORDER ID</th>
                    <th className="text-left py-3 px-3 font-bold text-xs whitespace-nowrap" style={{ color: '#5C2E1F' }}>CUSTOMER NAME</th>
                    <th className="text-left py-3 px-2 font-bold text-xs whitespace-nowrap" style={{ color: '#5C2E1F' }}>ORDER DATE</th>
                    <th className="text-left py-3 px-2 font-bold text-xs whitespace-nowrap" style={{ color: '#5C2E1F' }}>DELIVERY DATE</th>
                    <th className="text-left py-3 px-2 font-bold text-xs whitespace-nowrap" style={{ color: '#5C2E1F' }}>DELIVERY ADDRESS</th>
                    <th className="text-left py-3 px-2 font-bold text-xs whitespace-nowrap" style={{ color: '#5C2E1F' }}>STATUS</th>
                    <th className="text-left py-3 px-2 font-bold text-xs whitespace-nowrap" style={{ color: '#5C2E1F' }}>TRACKING NO</th>
                    <th className="text-left py-3 px-2 font-bold text-xs whitespace-nowrap" style={{ color: '#5C2E1F' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-gray-500">Loading orders...</td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8">
                        <div className="text-red-500 font-medium">Error loading orders</div>
                        <div className="text-sm text-gray-600 mt-1">{error}</div>
                      </td>
                    </tr>
                  ) : currentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-gray-500">
                        {searchQuery ? 'No orders found matching your search.' : 'No orders found. Click "Create Online Order" to get started.'}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {currentOrders.map((order) => (
                        <Fragment key={order.id}>
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
                            <td className="py-3 px-3 text-xs max-w-37.5 truncate" title={order.customer_name}>{order.customer_name}</td>
                            <td className="py-3 px-2 text-xs whitespace-nowrap">{formatDate(order.order_date)}</td>
                            <td className="py-3 px-2 text-xs whitespace-nowrap">{formatDate(order.delivery_date)}</td>
                            <td className="py-3 px-2 text-xs max-w-37.5 truncate" title={order.delivery_address || ''}>{order.delivery_address || '-'}</td>
                            <td className="py-3 px-2">
                              <select
                                value={order.status || 'pending'}
                                onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                                disabled={updatingStatus[order.id]}
                                className={`px-2 py-1 text-xs font-semibold rounded border-0 cursor-pointer ${getStatusBadge(order.status)} ${updatingStatus[order.id] ? 'opacity-50 cursor-wait' : ''}`}
                              >
                                <option value="Pending">Pending</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            </td>
                            <td className="py-3 px-2 text-xs whitespace-nowrap">{order.tracking_no || '-'}</td>
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

                          {expandedRows[order.id] && (
                            <tr>
                                <td className="py-2 px-2"></td>
                                <td className="py-2 px-2 text-xs font-bold border-l border-gray-400" style={{ color: 'gray' }}>PRODUCT ID</td>
                                <td className="py-2 px-4 text-xs font-bold" style={{ color: 'gray' }}>NAME</td>
                                <td className="py-2 px-2 text-xs font-bold" style={{ color: 'gray' }}>TYPE</td>
                                <td className="py-2 px-2 text-xs font-bold" style={{ color: 'gray' }}>GELATO TYPE</td>
                                <td className="py-2 px-2 text-xs font-bold text-center" style={{ color: 'gray' }}>QUANTITY</td>
                                <td className="py-2 px-2 text-xs font-bold text-right" style={{ color: 'gray' }}>WEIGHT (kg)</td>
                                <td className="py-2 px-2 text-xs font-bold text-right" style={{ color: 'gray' }}>PRICE ($)</td>
                                <td className="py-2 px-2 text-xs font-bold text-right" style={{ color: 'gray' }}>COST ($)</td>
                            </tr>
                            )}

                          {expandedRows[order.id] && rowOrderItems[order.id] && rowOrderItems[order.id].length > 0 ? (
                            rowOrderItems[order.id].map((item, index) => (
                                <tr key={`${order.id}-item-${index}`} className="bg-white border-b border-gray-200 hover:bg-gray-50">
                                <td className="py-2 px-2"></td>
                                <td className="py-2 px-2 text-xs border-l border-gray-400">{item.product_id}</td>
                                <td className="py-2 px-3 text-xs">{item.product_name}</td>
                                <td className="py-2 px-2 text-xs">{item.product_type}</td>
                                <td className="py-2 px-2 text-xs">{item.gelato_type || 'N/A'}</td>
                                <td className="py-2 px-2 text-xs text-center">{item.quantity}</td>
                                <td className="py-2 px-2 text-xs text-right">{item.calculated_weight}</td>
                                <td className="py-2 px-2 text-xs text-right">{item.product_price?.toFixed(2) || '0.00'}</td>
                                <td className="py-2 px-2 text-xs text-right">{item.product_cost?.toFixed(2) || '0.00'}</td>
                                </tr>
                            ))
                        ) : expandedRows[order.id] ? (
                            <tr className="bg-white border-b border-gray-200">
                                <td className="py-2 px-2"></td>
                                <td colSpan={8} className="text-center py-4 text-gray-500 text-xs border-l border-gray-400">Loading order items...</td>
                            </tr>
                        ) : null}

                          {expandedRows[order.id] && (
                            <tr className="bg-blue-50 border-b border-gray-200">
                              <td className="py-3 px-2"></td>
                              <td colSpan={8} className="py-3 px-2 border-l border-gray-400">
                                <div className="flex items-start gap-2">
                                  <span className="text-xs font-bold text-gray-700">NOTES:</span>
                                  <span className="text-xs text-gray-600 flex-1">{order.notes || 'No additional notes'}</span>
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

          {isDeleteConfirmOpen && (
            <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
              <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <X size={32} className="text-red-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#5C2E1F' }}>Confirm Order Removal</h2>
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
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#5C2E1F' }}>Successfully Removed!</h2>
                <p className="text-gray-600 mb-6">Order(s) have been removed from the system.</p>
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

          <CreateOnlineOrderModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={refreshOrders}
          />
          
        </main>
      </div>
    </div>
  );
}