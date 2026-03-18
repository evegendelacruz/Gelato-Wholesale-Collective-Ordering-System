'use client';
import { useState, useEffect, Fragment, useRef } from 'react';
import { X, Trash2, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import supabase from '@/lib/client';

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
  total_amount: number;
  invoice_id: string;
}

interface OrderItem {
  id: number;
  product_id: string | null;
  product_name: string;
  quantity: number;
  product_price: number;
  product_cost: number | null;
  product_type: string | null;
  gelato_type: string | null;
  product_weight: number;
  calculated_weight: string | null;
  label_ingredients: string | null;
  label_allergens: string | null;
  product_ingredient?: string | null;
  product_allergen?: string | null;
  product_description?: string | null;
  product_milkbase?: number;
  product_sugarbase?: number;
  product_notes?: string;
  best_before: string | null;
  batch_number: string | null;
  isDeleted?: boolean;
  isExpanded?: boolean;
  isNew?: boolean;
}

interface EditOnlineOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: Order;
}

export default function EditOnlineOrderModal({ isOpen, onClose, onSuccess, order }: EditOnlineOrderModalProps) {
  const [formData, setFormData] = useState({
    customer_name: '',
    order_date: '',
    delivery_date: '',
    delivery_address: '',
    tracking_no: '',
    notes: '',
    status: 'Pending'
  });
  const [loading, setLoading] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  // Dropdown options state
  const [productTypeOptions, setProductTypeOptions] = useState<string[]>([]);
  const [gelatoTypeOptions, setGelatoTypeOptions] = useState<string[]>([]);
  const [isAddOptionModalOpen, setIsAddOptionModalOpen] = useState(false);
  const [addOptionType, setAddOptionType] = useState<'product_type' | 'gelato_type' | null>(null);
  const [addOptionLabel, setAddOptionLabel] = useState('');
  const [newOptionValue, setNewOptionValue] = useState('');

  // Load dropdown options
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const { data: productTypes, error: productTypeError } = await supabase
          .from('order_dropdown_options')
          .select('option_value')
          .eq('option_type', 'product_type');

        const { data: gelatoTypes, error: gelatoTypeError } = await supabase
          .from('order_dropdown_options')
          .select('option_value')
          .eq('option_type', 'gelato_type');

        if (!productTypeError && productTypes) {
          setProductTypeOptions(productTypes.map(item => item.option_value));
        }

        if (!gelatoTypeError && gelatoTypes) {
          setGelatoTypeOptions(gelatoTypes.map(item => item.option_value));
        }
      } catch (error) {
        console.error('Error loading options:', error);
      }
    };
    loadOptions();
  }, []);

  useEffect(() => {
    const fetchOrderItems = async () => {
      try {
        console.log('Fetching order items for online order ID:', order.id);

        const { data: orderItemsData, error: itemsError } = await supabase
          .from('customer_order_item')
          .select('*')
          .eq('order_id', order.id);

        console.log('Order items response:', { data: orderItemsData, error: itemsError });

        if (itemsError) {
          console.error('Items error details:', itemsError);
          throw itemsError;
        }

        if (!orderItemsData || orderItemsData.length === 0) {
          console.log('No order items found');
          setOrderItems([]);
          return;
        }

        // Fetch ALL products to get milkbase and sugarbase values
        const { data: allProducts } = await supabase
          .from('product_list')
          .select('id, product_id, product_name, product_milkbased, product_sugarbased, product_description');

        // Create lookup maps for flexible matching
        const productMapById = new Map();
        const productMapByProductId = new Map();
        const productMapByName = new Map();

        (allProducts || []).forEach(p => {
          productMapById.set(p.id, p);
          if (p.product_id) {
            productMapByProductId.set(p.product_id, p);
          }
          if (p.product_name) {
            productMapByName.set(p.product_name.toLowerCase().trim(), p);
          }
        });

        const mappedItems = orderItemsData.map(item => {
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
          }

          return {
            id: item.id,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            product_price: item.product_price,
            product_cost: item.product_cost || 0,
            product_type: item.product_type || '',
            gelato_type: item.gelato_type || '',
            product_weight: item.calculated_weight ? parseFloat(item.calculated_weight) / (item.quantity || 1) : 0,
            calculated_weight: item.calculated_weight || '',
            label_ingredients: item.label_ingredients,
            label_allergens: item.label_allergens,
            product_ingredient: item.label_ingredients || '',
            product_allergen: item.label_allergens || '',
            product_description: item.product_description || productData?.product_description || '',
            // Prioritize order item values (for manually inputted products), then fall back to product_list
            product_milkbase: item.product_milkbase ?? productData?.product_milkbased ?? 0,
            product_sugarbase: item.product_sugarbase ?? productData?.product_sugarbased ?? 0,
            product_notes: '',
            best_before: item.best_before,
            batch_number: item.batch_number,
            isExpanded: false
          };
        });

        console.log('Mapped order items:', mappedItems);
        setOrderItems(mappedItems);
      } catch (error) {
        console.error('Error fetching order items:', error);
        setOrderItems([]);
      }
    };

    if (isOpen && order) {
      setFormData({
        customer_name: order.customer_name || '',
        order_date: order.order_date ? new Date(order.order_date).toISOString().split('T')[0] : '',
        delivery_date: order.delivery_date ? new Date(order.delivery_date).toISOString().split('T')[0] : '',
        delivery_address: order.delivery_address || '',
        tracking_no: order.tracking_no || '',
        notes: order.notes || '',
        status: order.status || 'Pending'
      });

      fetchOrderItems();
    }
  }, [isOpen, order]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number | boolean) => {
    const updatedItems = [...orderItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    setOrderItems(updatedItems);
  };

  // Custom Dropdown Component
  interface CustomDropdownProps {
    label: string;
    name: string;
    value: string;
    options: string[];
    onChange: (e: { target: { name: string; value: string } }) => void;
    onAddOption: () => void;
    onRemoveOption: (option: string) => void;
    required?: boolean;
  }

  const CustomDropdown = ({ label, name, value, options, onChange, onAddOption, onRemoveOption, required = false }: CustomDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen]);

    return (
      <div ref={dropdownRef} className="relative">
        <label className="block text-xs font-medium mb-1 text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs cursor-pointer bg-white flex justify-between items-center text-left"
        >
          <span className={value ? 'text-gray-900' : 'text-gray-500'}>
            {value || `Select ${label}`}
          </span>
          <svg
            className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            <div className="py-1">
              {options.length === 0 && (
                <div className="px-3 py-2 text-xs text-gray-500 text-center">
                  No options yet. Click &quot;Add Option&quot; to create one.
                </div>
              )}

              {options.map(option => (
                <div
                  key={option}
                  className="px-3 py-1.5 hover:bg-gray-50 cursor-pointer flex items-center justify-between group text-xs"
                  onClick={() => {
                    onChange({ target: { name, value: option } });
                    setIsOpen(false);
                  }}
                >
                  <span className={value === option ? 'text-orange-600 font-medium' : ''}>
                    {option}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveOption(option);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddOption();
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-orange-50 cursor-pointer flex items-center gap-2 text-orange-600 border-t border-gray-200 text-xs"
              >
                <Plus size={12} />
                <span className="font-medium">Add New Option</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleAddOption = async () => {
    if (!newOptionValue.trim() || !addOptionType) return;

    const trimmedValue = newOptionValue.trim();

    try {
      await supabase.from('order_dropdown_options').insert({
        option_type: addOptionType,
        option_value: trimmedValue,
      });

      if (addOptionType === 'product_type') {
        setProductTypeOptions(prev => [...prev, trimmedValue]);
      } else if (addOptionType === 'gelato_type') {
        setGelatoTypeOptions(prev => [...prev, trimmedValue]);
      }

      setNewOptionValue('');
      setIsAddOptionModalOpen(false);
      setAddOptionType(null);
    } catch (error) {
      console.error('Error adding option:', error);
      alert('Failed to add option');
    }
  };

  const handleRemoveProductType = async (option: string) => {
    try {
      const { error } = await supabase
        .from('order_dropdown_options')
        .delete()
        .eq('option_type', 'product_type')
        .eq('option_value', option);

      if (!error) {
        setProductTypeOptions(productTypeOptions.filter(opt => opt !== option));
      }
    } catch (error) {
      console.error('Error removing product type:', error);
    }
  };

  const handleRemoveGelatoType = async (option: string) => {
    try {
      const { error } = await supabase
        .from('order_dropdown_options')
        .delete()
        .eq('option_type', 'gelato_type')
        .eq('option_value', option);

      if (!error) {
        setGelatoTypeOptions(gelatoTypeOptions.filter(opt => opt !== option));
      }
    } catch (error) {
      console.error('Error removing gelato type:', error);
    }
  };

  const handleRemoveItem = (index: number) => {
    const item = orderItems[index];

    // If it's a new item, completely remove it from the list
    if (item.isNew) {
      setOrderItems(orderItems.filter((_, i) => i !== index));
    } else {
      // For existing items, mark as deleted (will be deleted from database on save)
      const updatedItems = [...orderItems];
      updatedItems[index] = {
        ...updatedItems[index],
        isDeleted: true
      };
      setOrderItems(updatedItems);
    }
  };

  const handleRestoreItem = (index: number) => {
    const updatedItems = [...orderItems];
    updatedItems[index] = {
      ...updatedItems[index],
      isDeleted: false
    };
    setOrderItems(updatedItems);
  };

  const toggleItemExpand = (index: number) => {
    const updatedItems = [...orderItems];
    updatedItems[index] = {
      ...updatedItems[index],
      isExpanded: !updatedItems[index].isExpanded
    };
    setOrderItems(updatedItems);
  };

  // Add new order item
  const handleAddItem = () => {
    const newItem: OrderItem = {
      id: Date.now(), // Temporary ID for new items
      product_id: null,
      product_name: '',
      quantity: 1,
      product_price: 0,
      product_cost: 0,
      product_type: '',
      gelato_type: '',
      product_weight: 0,
      calculated_weight: null,
      label_ingredients: null,
      label_allergens: null,
      product_ingredient: '',
      product_allergen: '',
      product_description: '',
      product_milkbase: 0,
      product_sugarbase: 0,
      product_notes: '',
      best_before: null,
      batch_number: null,
      isDeleted: false,
      isExpanded: true,
      isNew: true
    };
    setOrderItems([...orderItems, newItem]);
  };

  const calculateTotalAmount = () => {
    return orderItems
      .filter(item => !item.isDeleted)
      .reduce((sum, item) => sum + (item.product_price * item.quantity), 0);
  };

  const activeOrderItems = orderItems.filter(item => !item.isDeleted);
  const deletedOrderItems = orderItems.filter(item => item.isDeleted);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate dates
      if (!formData.order_date || !formData.delivery_date) {
        alert('Please fill in all required fields');
        setLoading(false);
        return;
      }

      // Check if there are any active items left
      const itemsToKeep = orderItems.filter(item => !item.isDeleted);
      if (itemsToKeep.length === 0) {
        alert('Order must have at least one item. Please add items or cancel the order instead.');
        setLoading(false);
        return;
      }

      // Validate all items have required fields
      for (let i = 0; i < itemsToKeep.length; i++) {
        const item = itemsToKeep[i];
        if (!item.product_name.trim()) {
          alert(`Please enter a product name for item ${i + 1}`);
          setLoading(false);
          return;
        }
        if (!item.product_type) {
          alert(`Please select a product type for "${item.product_name}"`);
          setLoading(false);
          return;
        }
        if (item.quantity < 1) {
          alert(`Please enter a valid quantity for "${item.product_name}"`);
          setLoading(false);
          return;
        }
      }

      const totalAmount = calculateTotalAmount();

      // Update order
      const { error: orderError } = await supabase
        .from('customer_order')
        .update({
          customer_name: formData.customer_name,
          order_date: formData.order_date,
          delivery_date: formData.delivery_date,
          delivery_address: formData.delivery_address,
          tracking_no: formData.tracking_no,
          notes: formData.notes,
          status: formData.status,
          total_amount: totalAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      // Delete items marked for deletion (only existing items, not new ones)
      const itemsToDelete = orderItems.filter(item => item.isDeleted && !item.isNew);
      if (itemsToDelete.length > 0) {
        console.log('Deleting removed items:', itemsToDelete.map(i => i.id));
        const { error: deleteError } = await supabase
          .from('customer_order_item')
          .delete()
          .in('id', itemsToDelete.map(item => item.id));

        if (deleteError) {
          console.error('Error deleting items:', deleteError);
          throw new Error(`Failed to remove items: ${deleteError.message}`);
        }
      }

      // Separate new items from existing items
      const newItems = itemsToKeep.filter(item => item.isNew);
      const existingItems = itemsToKeep.filter(item => !item.isNew);

      // Insert new items
      if (newItems.length > 0) {
        // Use ?? to properly handle 0 values when inserting new items
        const itemsToInsert = newItems.map(item => ({
          order_id: order.id,
          product_id: item.product_id ?? null,
          product_name: item.product_name.trim(),
          product_type: item.product_type ?? null,
          quantity: item.quantity,
          gelato_type: item.gelato_type ?? null,
          product_weight: item.product_weight ?? 0,
          calculated_weight: item.product_weight ? (item.product_weight * item.quantity).toFixed(2) : null,
          product_price: item.product_price ?? 0,
          product_cost: item.product_cost ?? 0,
          label_ingredients: item.product_ingredient ?? null,
          label_allergens: item.product_allergen ?? null,
          product_description: item.product_description ?? null,
          product_milkbase: item.product_milkbase ?? 0,
          product_sugarbase: item.product_sugarbase ?? 0
        }));

        const { error: insertError } = await supabase
          .from('customer_order_item')
          .insert(itemsToInsert);

        if (insertError) {
          console.error('Error inserting new items:', insertError);
          throw new Error(`Failed to add new items: ${insertError.message}`);
        }
      }

      // Update existing order items - use ?? to properly handle 0 values
      for (const item of existingItems) {
        const calculatedWeight = item.product_weight ? (item.product_weight * item.quantity).toFixed(2) : item.calculated_weight ?? null;
        const { error: itemError } = await supabase
          .from('customer_order_item')
          .update({
            product_name: item.product_name,
            product_type: item.product_type ?? null,
            gelato_type: item.gelato_type ?? null,
            quantity: item.quantity,
            product_weight: item.product_weight ?? 0,
            product_price: item.product_price ?? 0,
            product_cost: item.product_cost ?? 0,
            calculated_weight: calculatedWeight,
            label_ingredients: item.product_ingredient ?? null,
            label_allergens: item.product_allergen ?? null,
            product_description: item.product_description ?? null,
            product_milkbase: item.product_milkbase ?? 0,
            product_sugarbase: item.product_sugarbase ?? 0
          })
          .eq('id', item.id);

        if (itemError) {
          throw new Error(`Item update failed: ${itemError.message}`);
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-auto flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 shrink-0 rounded-t-lg flex justify-between items-center">
          <h2 className="text-2xl font-bold" style={{ color: '#5C2E1F' }}>
            Edit Online Order - {order.order_id}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" disabled={loading}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer Info */}
          <div>
            <h3 className="text-lg font-semibold mb-3" style={{ color: '#5C2E1F' }}>
              Customer Information
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                  Customer Name *
                </label>
                <input
                  type="text"
                  name="customer_name"
                  required
                  value={formData.customer_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <p className="text-sm"><span className="font-medium">Invoice ID:</span> {order.invoice_id || 'N/A'}</p>
            </div>
          </div>

          {/* Order Details */}
          <div>
            <h3 className="text-lg font-semibold mb-3" style={{ color: '#5C2E1F' }}>
              Order Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                  Order Date *
                </label>
                <input
                  type="date"
                  name="order_date"
                  required
                  value={formData.order_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                  Delivery Date *
                </label>
                <input
                  type="date"
                  name="delivery_date"
                  required
                  value={formData.delivery_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                Delivery Address *
              </label>
              <textarea
                name="delivery_address"
                required
                value={formData.delivery_address}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                  Tracking Number
                </label>
                <input
                  type="text"
                  name="tracking_no"
                  value={formData.tracking_no}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Additional notes..."
              />
            </div>
          </div>

          {/* Order Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold" style={{ color: '#5C2E1F' }}>
                  Order Items ({activeOrderItems.length})
                </h3>
                <p className="text-xs text-gray-500">Click on a product row to expand and edit product details</p>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                disabled={loading}
              >
                <Plus size={20} />
                <span>Add More Item</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2" style={{ borderColor: '#5C2E1F' }}>
                    <th className="text-left py-2 px-2 font-bold text-xs w-[5%]"></th>
                    <th className="text-left py-2 px-2 font-bold text-xs w-[28%]">PRODUCT</th>
                    <th className="text-center py-2 px-2 font-bold text-xs w-[10%]">TYPE</th>
                    <th className="text-center py-2 px-2 font-bold text-xs w-[10%]">QUANTITY</th>
                    <th className="text-right py-2 px-2 font-bold text-xs w-[13%]">UNIT PRICE</th>
                    <th className="text-right py-2 px-2 font-bold text-xs w-[13%]">SUBTOTAL</th>
                    <th className="text-center py-2 px-2 font-bold text-xs w-[8%]">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item, index) => (
                    <Fragment key={item.isNew ? `new-${item.id}` : item.id}>
                      <tr
                        className={`border-b border-gray-200 ${item.isDeleted ? 'bg-red-50 opacity-50' : 'hover:bg-gray-50 cursor-pointer'}`}
                        onClick={() => !item.isDeleted && toggleItemExpand(index)}
                      >
                        <td className="py-2 px-2 text-center">
                          {!item.isDeleted && (
                            <button type="button" className="text-gray-500 hover:text-gray-700">
                              {item.isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          )}
                        </td>
                        <td className="py-2 px-2 text-xs">
                          <span className={item.isDeleted ? 'line-through text-red-500' : ''}>
                            {item.product_name || (item.isNew ? 'New Item - Click to expand' : '')}
                          </span>
                          {item.isNew && !item.isDeleted && (
                            <span className="ml-2 text-green-600 text-xs font-medium">(New)</span>
                          )}
                          {item.isDeleted && (
                            <span className="ml-2 text-red-500 text-xs">(Will be removed)</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center text-xs">
                          {item.gelato_type || item.product_type || '-'}
                        </td>
                        <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          {item.isDeleted ? (
                            <span className="text-gray-400">{item.quantity}</span>
                          ) : (
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                              min="1"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-center text-xs"
                            />
                          )}
                        </td>
                        <td className="py-2 px-2 text-right" onClick={(e) => e.stopPropagation()}>
                          {item.isDeleted ? (
                            <span className="text-gray-400">${item.product_price.toFixed(2)}</span>
                          ) : (
                            <input
                              type="number"
                              value={item.product_price}
                              onChange={(e) => handleItemChange(index, 'product_price', Number(e.target.value))}
                              step="0.01"
                              min="0"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-right text-xs"
                            />
                          )}
                        </td>
                        <td className="py-2 px-2 text-right text-xs font-medium">
                          <span className={item.isDeleted ? 'text-gray-400 line-through' : ''}>
                            ${(item.product_price * item.quantity).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          {item.isDeleted ? (
                            <button
                              type="button"
                              onClick={() => handleRestoreItem(index)}
                              className="text-green-500 hover:text-green-700 text-xs underline"
                              title="Restore item"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                              title="Remove item"
                              disabled={activeOrderItems.length <= 1}
                            >
                              <Trash2 size={16} className={activeOrderItems.length <= 1 ? 'opacity-30' : ''} />
                            </button>
                          )}
                        </td>
                      </tr>
                      {/* Expanded Product Details */}
                      {item.isExpanded && !item.isDeleted && (
                        <tr key={`${item.id}-expanded`} className="bg-gray-50 border-b border-gray-200">
                          <td colSpan={7} className="py-4 px-4">
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                              <h4 className="text-sm font-semibold mb-3" style={{ color: '#5C2E1F' }}>
                                Edit Product Details
                              </h4>
                              <div className="grid grid-cols-4 gap-3">
                                <div className="col-span-2">
                                  <label className="block text-xs font-medium mb-1 text-gray-700">
                                    Product Name <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={item.product_name}
                                    onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  />
                                </div>
                                <div>
                                  <CustomDropdown
                                    label="Product Type"
                                    name="product_type"
                                    value={item.product_type || ''}
                                    options={productTypeOptions}
                                    onChange={(e) => handleItemChange(index, 'product_type', e.target.value)}
                                    onAddOption={() => {
                                      setAddOptionType('product_type');
                                      setAddOptionLabel('Product Type');
                                      setIsAddOptionModalOpen(true);
                                    }}
                                    onRemoveOption={handleRemoveProductType}
                                    required={true}
                                  />
                                </div>
                                <div>
                                  <CustomDropdown
                                    label="Gelato Type"
                                    name="gelato_type"
                                    value={item.gelato_type || ''}
                                    options={gelatoTypeOptions}
                                    onChange={(e) => handleItemChange(index, 'gelato_type', e.target.value)}
                                    onAddOption={() => {
                                      setAddOptionType('gelato_type');
                                      setAddOptionLabel('Gelato Type');
                                      setIsAddOptionModalOpen(true);
                                    }}
                                    onRemoveOption={handleRemoveGelatoType}
                                    required={true}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-gray-700">
                                    Weight (kg)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.product_weight || ''}
                                    onChange={(e) => handleItemChange(index, 'product_weight', parseFloat(e.target.value) || 0)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="0.00"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-gray-700">
                                    Price ($) <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.product_price}
                                    onChange={(e) => handleItemChange(index, 'product_price', parseFloat(e.target.value) || 0)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="0.00"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-gray-700">
                                    Cost ($)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.product_cost || ''}
                                    onChange={(e) => handleItemChange(index, 'product_cost', parseFloat(e.target.value) || 0)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="0.00"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-gray-700">
                                    Milk Based
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.product_milkbase || ''}
                                    onChange={(e) => handleItemChange(index, 'product_milkbase', parseFloat(e.target.value) || 0)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="0.00"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-gray-700">
                                    Sugar Based
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.product_sugarbase || ''}
                                    onChange={(e) => handleItemChange(index, 'product_sugarbase', parseFloat(e.target.value) || 0)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3 mt-3">
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-gray-700">
                                    Ingredients
                                  </label>
                                  <textarea
                                    value={item.product_ingredient || ''}
                                    onChange={(e) => handleItemChange(index, 'product_ingredient', e.target.value)}
                                    rows={2}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="Enter ingredients..."
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-gray-700">
                                    Allergen Information
                                  </label>
                                  <textarea
                                    value={item.product_allergen || ''}
                                    onChange={(e) => handleItemChange(index, 'product_allergen', e.target.value)}
                                    rows={2}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="Enter allergen information..."
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 gap-3 mt-3">
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-gray-700">
                                    Description <span className="text-gray-400 font-normal">(Shows in report instead of product name if provided)</span>
                                  </label>
                                  <textarea
                                    value={item.product_description || ''}
                                    onChange={(e) => handleItemChange(index, 'product_description', e.target.value)}
                                    rows={2}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="Enter description for report (optional - defaults to product name)..."
                                  />
                                </div>
                              </div>
                              <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded p-2">
                                <p className="text-xs text-yellow-800">
                                  <strong>Note:</strong> Changes made here only affect this order item. The original product in your product list will not be modified.
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {deletedOrderItems.length > 0 && (
              <p className="text-sm text-red-500 mt-2">
                {deletedOrderItems.length} item(s) will be removed when you save
              </p>
            )}

            {/* Order Summary */}
            <div className="mt-4 flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-lg font-bold border-t pt-2" style={{ color: '#5C2E1F' }}>
                  <span>Total:</span>
                  <span>${calculateTotalAmount().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#FF5722' }}
            >
              {loading ? 'Updating...' : 'Update Order'}
            </button>
          </div>
        </form>
      </div>

      {/* Add Option Modal */}
      {isAddOptionModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 9999 }}
        >
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: '#5C2E1F' }}>
                Add New {addOptionLabel}
              </h3>
              <button
                onClick={() => {
                  setIsAddOptionModalOpen(false);
                  setAddOptionType(null);
                  setNewOptionValue('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Option Name
              </label>
              <input
                type="text"
                value={newOptionValue}
                onChange={(e) => setNewOptionValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddOption();
                  }
                }}
                placeholder="Enter option name"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                autoFocus
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setIsAddOptionModalOpen(false);
                  setAddOptionType(null);
                  setNewOptionValue('');
                }}
                className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddOption}
                disabled={!newOptionValue.trim()}
                className="px-4 py-2 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Option
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
