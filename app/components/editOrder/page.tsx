'use client';
import { useState, useEffect, Fragment, useRef } from 'react';
import { X, Trash2, ChevronDown, ChevronUp, Plus, Search } from 'lucide-react';
import supabase from '@/lib/client';
import Image from 'next/image';

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: {
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
    company_name: string;
  };
}

interface Product {
  id: number;
  product_id: string;
  product_name: string;
  product_type: string | null;
  product_gelato_type: string | null;
  product_weight: number;
  product_price: number;
  product_cost: number | null;
  product_milkbased: number | null;
  product_sugarbased: number | null;
  product_ingredient: string | null;
  product_image: string | null;
}

interface OrderItem {
  id: number;
  product_id: number | null;
  product_name: string;
  product_type?: string;
  gelato_type?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  weight: number;
  calculated_weight?: string;
  request: string | null;
  product_ingredient?: string;
  product_allergen?: string;
  product_description?: string;
  isDeleted?: boolean;
  isExpanded?: boolean;
  isNew?: boolean;
  product_cost?: number;
  product_milkbase?: number;
  product_sugarbase?: number;
}

export default function EditOrderModal({ isOpen, onClose, onSuccess, order }: EditOrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [productTypeOptions, setProductTypeOptions] = useState<string[]>([]);
  const [gelatoTypeOptions, setGelatoTypeOptions] = useState<string[]>([]);
  const [newProductType, setNewProductType] = useState("");
  const [newGelatoType, setNewGelatoType] = useState("");
  const [isAddOptionModalOpen, setIsAddOptionModalOpen] = useState(false);
  const [addOptionType, setAddOptionType] = useState<"product_type" | "gelato_type" | null>(null);
  const [addOptionLabel, setAddOptionLabel] = useState("");
  const [currentEditingItemIndex, setCurrentEditingItemIndex] = useState<number | null>(null);

  // New item states
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState<number | null>(null);
  const [productPickerSearch, setProductPickerSearch] = useState('');
  const [newItemIdCounter, setNewItemIdCounter] = useState(-1);

  const [formData, setFormData] = useState({
    order_date: '',
    delivery_date: '',
    delivery_address: '',
    tracking_no: '',
    notes: '',
    status: ''
  });

// Fetch dropdown options for product type and gelato type
useEffect(() => {
  const fetchDropdownOptions = async () => {
    try {
      const { data: productTypes, error: productTypeError } = await supabase
        .from("dropdown_options")
        .select("option_value")
        .eq("option_type", "product_type");

      const { data: gelatoTypes, error: gelatoTypeError } = await supabase
        .from("dropdown_options")
        .select("option_value")
        .eq("option_type", "gelato_type");

      if (!productTypeError && productTypes) {
        setProductTypeOptions(productTypes.map((item) => item.option_value));
      }

      if (!gelatoTypeError && gelatoTypes) {
        setGelatoTypeOptions(gelatoTypes.map((item) => item.option_value));
      }
    } catch (error) {
      console.error('Error fetching dropdown options:', error);
    }
  };

  if (isOpen) {
    fetchDropdownOptions();
    fetchAllProducts();
  }
}, [isOpen]);

// Fetch all products for the product picker
const fetchAllProducts = async () => {
  try {
    setLoadingProducts(true);
    const { data, error } = await supabase
      .from('product_list')
      .select('id, product_id, product_name, product_type, product_gelato_type, product_weight, product_price, product_cost, product_milkbased, product_sugarbased, product_ingredient, product_image')
      .eq('is_deleted', false)
      .order('product_name', { ascending: true });

    if (error) throw error;
    setAllProducts(data || []);
  } catch (error) {
    console.error('Error fetching all products:', error);
  } finally {
    setLoadingProducts(false);
  }
};

// Filter products for search
const getFilteredProducts = () => {
  if (!productPickerSearch.trim()) return allProducts;
  const search = productPickerSearch.toLowerCase();
  return allProducts.filter(product =>
    product.product_name.toLowerCase().includes(search) ||
    product.product_id.toLowerCase().includes(search) ||
    (product.product_type && product.product_type.toLowerCase().includes(search))
  );
};

// Add new empty item
const handleAddNewItem = () => {
  const newItem: OrderItem = {
    id: newItemIdCounter,
    product_id: null,
    product_name: '',
    product_type: '',
    gelato_type: '',
    quantity: 1,
    unit_price: 0,
    subtotal: 0,
    weight: 0,
    calculated_weight: '',
    request: null,
    product_ingredient: '',
    product_allergen: '',
    product_description: '',
    isDeleted: false,
    isExpanded: true,
    isNew: true,
    product_cost: 0,
    product_milkbase: 0,
    product_sugarbase: 0
  };
  setOrderItems([...orderItems, newItem]);
  setNewItemIdCounter(prev => prev - 1);
};

// Select product from picker for a specific item
const handleSelectProductForItem = (index: number, product: Product) => {
  const productType = product.product_type || '';
  const gelatoType = product.product_gelato_type || '';

  // Add to options if not present
  if (productType && !productTypeOptions.includes(productType)) {
    setProductTypeOptions(prev => [...prev, productType]);
  }
  if (gelatoType && !gelatoTypeOptions.includes(gelatoType)) {
    setGelatoTypeOptions(prev => [...prev, gelatoType]);
  }

  const updatedItems = [...orderItems];
  updatedItems[index] = {
    ...updatedItems[index],
    product_id: product.id,
    product_name: product.product_name,
    product_type: productType,
    gelato_type: gelatoType,
    weight: product.product_weight || 0,
    calculated_weight: String(product.product_weight || 0),
    unit_price: product.product_price || 0,
    subtotal: updatedItems[index].quantity * (product.product_price || 0),
    product_cost: product.product_cost || 0,
    product_milkbase: product.product_milkbased || 0,
    product_sugarbase: product.product_sugarbased || 0,
    product_ingredient: product.product_ingredient || ''
  };
  setOrderItems(updatedItems);
  setShowProductPicker(null);
  setProductPickerSearch('');
};

// Update the fetchOrderItems useEffect
useEffect(() => {
  const fetchOrderItems = async () => {
    try {
      console.log('Fetching order items for order ID:', order.id);
      
      // Fetch order items with product details using the foreign key relationship
      // Include product_list JOIN for ingredient, allergen, milkbase, sugarbase (same as Labels)
      const { data: orderItemsData, error: itemsError } = await supabase
        .from('client_order_item')
        .select(`
          *,
          product_list(
            product_ingredient,
            product_allergen,
            product_milkbased,
            product_sugarbased
          )
        `)
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

      // Map the data to include all product details
      // Extract ingredient, allergen, milkbase, sugarbase from product_list JOIN
      const itemsWithDetails = orderItemsData.map(item => {
        let productIngredient = '';
        let productAllergen = '';
        let productMilkbase = 0;
        let productSugarbase = 0;

        if (item.product_list) {
          const productData = Array.isArray(item.product_list) ? item.product_list[0] : item.product_list;
          productIngredient = productData?.product_ingredient || '';
          productAllergen = productData?.product_allergen || '';
          productMilkbase = productData?.product_milkbased || 0;
          productSugarbase = productData?.product_sugarbased || 0;
        }

        return {
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_type: item.product_type || '',
          gelato_type: item.gelato_type || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          weight: item.calculated_weight || 0,
          calculated_weight: item.calculated_weight || '',
          request: item.product_notes || null,
          // Prioritize saved label data, fallback to product_list (same as Labels)
          product_ingredient: item.label_ingredients || productIngredient,
          product_allergen: item.label_allergens || productAllergen,
          product_description: '',
          // Get milkbase and sugarbase from product_list JOIN
          product_milkbase: productMilkbase,
          product_sugarbase: productSugarbase,
          isExpanded: false
        };
      });

      console.log('Final items with details:', itemsWithDetails);
      setOrderItems(itemsWithDetails);
    } catch (error) {
      console.error('Error fetching order items:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      setOrderItems([]);
    }
  };

  if (isOpen && order) {
    const formatDateForInput = (dateString: string) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    };

    setFormData({
      order_date: formatDateForInput(order.order_date),
      delivery_date: formatDateForInput(order.delivery_date),
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

  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
    const updatedItems = [...orderItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };

    // Recalculate subtotal if quantity or unit_price changes
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = field === 'quantity' ? Number(value) : updatedItems[index].quantity;
      const unitPrice = field === 'unit_price' ? Number(value) : updatedItems[index].unit_price;
      updatedItems[index].subtotal = quantity * unitPrice;
    }

    setOrderItems(updatedItems);
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = [...orderItems];
    // Mark the item as deleted instead of removing it immediately
    // This way we can delete it from the database when submitting
    updatedItems[index] = {
      ...updatedItems[index],
      isDeleted: true
    };
    setOrderItems(updatedItems);
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

  const handleAddProductType = async () => {
    if (newProductType.trim() && !productTypeOptions.includes(newProductType.trim())) {
      const trimmedValue = newProductType.trim();

      // Update state FIRST
      setProductTypeOptions((prev) => [...prev, trimmedValue]);

      // Update the current item's product_type
      if (currentEditingItemIndex !== null) {
        handleItemChange(currentEditingItemIndex, 'product_type', trimmedValue);
      }

      setNewProductType("");

      // Save to database in background
      try {
        await supabase.from("dropdown_options").insert({
          option_type: "product_type",
          option_value: trimmedValue,
        });
      } catch (error) {
        console.error("Error adding product type:", error);
      }
    }
  };

  const handleAddGelatoType = async () => {
    if (newGelatoType.trim() && !gelatoTypeOptions.includes(newGelatoType.trim())) {
      const trimmedValue = newGelatoType.trim();

      // Update state FIRST
      setGelatoTypeOptions((prev) => [...prev, trimmedValue]);

      // Update the current item's gelato_type
      if (currentEditingItemIndex !== null) {
        handleItemChange(currentEditingItemIndex, 'gelato_type', trimmedValue);
      }

      setNewGelatoType("");

      // Save to database in background
      try {
        await supabase.from("dropdown_options").insert({
          option_type: "gelato_type",
          option_value: trimmedValue,
        });
      } catch (error) {
        console.error("Error adding gelato type:", error);
      }
    }
  };

  const handleRemoveProductType = async (option: string) => {
    try {
      const { error } = await supabase
        .from("dropdown_options")
        .delete()
        .eq("option_type", "product_type")
        .eq("option_value", option);

      if (!error) {
        setProductTypeOptions(productTypeOptions.filter((opt) => opt !== option));
      }
    } catch (error) {
      console.error("Error removing product type:", error);
    }
  };

  const handleRemoveGelatoType = async (option: string) => {
    try {
      const { error } = await supabase
        .from("dropdown_options")
        .delete()
        .eq("option_type", "gelato_type")
        .eq("option_value", option);

      if (!error) {
        setGelatoTypeOptions(gelatoTypeOptions.filter((opt) => opt !== option));
      }
    } catch (error) {
      console.error("Error removing gelato type:", error);
    }
  };

  // CustomDropdown component for inline use
  interface CustomDropdownProps {
    label: string;
    name: string;
    value: string;
    options: string[];
    onChange: (value: string) => void;
    onAddOption: () => void;
    onRemoveOption: (option: string) => void;
  }

  const CustomDropdown = ({
    label,
    name,
    value,
    options,
    onChange,
    onAddOption,
    onRemoveOption,
  }: CustomDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isOpen]);

    return (
      <div ref={dropdownRef} className="relative">
        <label className="block text-xs font-medium mb-1 text-gray-700">
          {label}
        </label>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs cursor-pointer bg-white flex justify-between items-center text-left"
        >
          <span className={value ? "text-gray-900" : "text-gray-500"}>
            {value || `Select ${label}`}
          </span>
          <svg
            className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
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
                  No options yet. Click &quot;Add New Option&quot; to create one.
                </div>
              )}

              {options.map((option) => (
                <div
                  key={option}
                  className="px-3 py-1.5 hover:bg-gray-50 cursor-pointer flex items-center justify-between group text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(option);
                    setIsOpen(false);
                  }}
                >
                  <span className={value === option ? "text-orange-600 font-medium" : ""}>
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
                className="w-full text-left px-3 py-1.5 hover:bg-orange-50 cursor-pointer flex items-center gap-2 text-orange-600 border-t border-gray-200"
              >
                <Plus size={12} />
                <span className="text-xs font-medium">Add New Option</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const calculateTotalAmount = () => {
    // Only count items that are not deleted
    const subtotal = orderItems
      .filter(item => !item.isDeleted)
      .reduce((sum, item) => sum + item.subtotal, 0);
    const gst = subtotal * 0.09;
    return subtotal + gst;
  };

  const activeOrderItems = orderItems.filter(item => !item.isDeleted);
  const deletedOrderItems = orderItems.filter(item => item.isDeleted);


  const handleSubmit = async () => {
    try {
      setLoading(true);
      console.log('Starting order update...');
      console.log('Order ID:', order.id);
      console.log('Form Data:', formData);
      console.log('Order Items:', orderItems);

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

      console.log('Calculating total amount...');
      const totalAmount = calculateTotalAmount();
      console.log('Total Amount:', totalAmount);

      // Update order (notes is stored here in client_order table)
      console.log('Updating order in database...');
      const { data: orderData, error: orderError } = await supabase
        .from('client_order')
        .update({
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

      console.log('Order update response:', { data: orderData, error: orderError });

      if (orderError) {
        console.error('Order update error details:', orderError);
        throw new Error(`Order update failed: ${orderError.message}`);
      }

      // Delete items marked for deletion
      const itemsToDelete = orderItems.filter(item => item.isDeleted);
      if (itemsToDelete.length > 0) {
        console.log('Deleting removed items:', itemsToDelete.map(i => i.id));
        const { error: deleteError } = await supabase
          .from('client_order_item')
          .delete()
          .in('id', itemsToDelete.map(item => item.id));

        if (deleteError) {
          console.error('Error deleting items:', deleteError);
          throw new Error(`Failed to remove items: ${deleteError.message}`);
        }
      }

      // Separate new items from existing items
      const existingItems = itemsToKeep.filter(item => !item.isNew);
      const newItems = itemsToKeep.filter(item => item.isNew);

      // Update existing order items
      console.log('Updating existing order items...');
      for (let i = 0; i < existingItems.length; i++) {
        const item = existingItems[i];
        console.log(`Updating item ${i + 1}/${existingItems.length}:`, item);

        const productTypeToSave = item.product_type || null;
        const gelatoTypeToSave = item.gelato_type || null;

        const { data: itemData, error: itemError } = await supabase
          .from('client_order_item')
          .update({
            product_name: item.product_name,
            product_type: productTypeToSave,
            gelato_type: gelatoTypeToSave,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
            calculated_weight: item.calculated_weight && !isNaN(parseFloat(String(item.calculated_weight))) ? parseFloat(String(item.calculated_weight)) : null,
            label_ingredients: item.product_ingredient || null,
            label_allergens: item.product_allergen || null
          })
          .eq('id', item.id);

        if (itemError) {
          console.error(`Item ${i + 1} update error:`, itemError);
          throw new Error(`Item update failed: ${itemError.message}`);
        }
      }

      // Insert new items
      if (newItems.length > 0) {
        console.log('Inserting new order items...');
        for (let i = 0; i < newItems.length; i++) {
          const item = newItems[i];
          console.log(`Inserting new item ${i + 1}/${newItems.length}:`, item);

          if (!item.product_name.trim()) {
            console.log('Skipping item with empty product name');
            continue;
          }

          const { error: insertError } = await supabase
            .from('client_order_item')
            .insert({
              order_id: order.id,
              product_id: item.product_id,
              product_name: item.product_name,
              product_type: item.product_type || null,
              gelato_type: item.gelato_type || null,
              quantity: item.quantity,
              unit_price: item.unit_price,
              subtotal: item.subtotal,
              calculated_weight: item.calculated_weight && !isNaN(parseFloat(String(item.calculated_weight))) ? parseFloat(String(item.calculated_weight)) : null,
              label_ingredients: item.product_ingredient || null,
              label_allergens: item.product_allergen || null
            });

          if (insertError) {
            console.error(`New item ${i + 1} insert error:`, insertError);
            throw new Error(`Failed to add new item: ${insertError.message}`);
          }
        }
      }

      console.log('Order items processed successfully');

      onSuccess();
      onClose();
    } catch (error: unknown) {
      console.error('Caught error in handleSubmit:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to update order: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold" style={{ color: '#5C2E1F' }}>
            Edit Order - {order.order_id}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Company Info */}
          <div>
            <h3 className="text-lg font-semibold mb-3" style={{ color: '#5C2E1F' }}>
              Company Information
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm"><span className="font-medium">Company:</span> {order.company_name}</p>
              <p className="text-sm"><span className="font-medium">Invoice ID:</span> {order.invoice_id}</p>
            </div>
          </div>

          {/* Order Details */}
          <div>
            <h3 className="text-lg font-semibold mb-3" style={{ color: '#5C2E1F' }}>
              Order Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Order Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="order_date"
                  value={formData.order_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Delivery Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="delivery_date"
                  value={formData.delivery_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">
                Delivery Address
              </label>
              <textarea
                name="delivery_address"
                value={formData.delivery_address}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tracking Number
                </label>
                <input
                  type="text"
                  name="tracking_no"
                  value={formData.tracking_no}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Order Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold" style={{ color: '#5C2E1F' }}>
                Order Items ({activeOrderItems.length})
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const newIndex = orderItems.length;
                    handleAddNewItem();
                    setShowProductPicker(newIndex);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                >
                  <Search size={14} />
                  <span>Select from List</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddNewItem}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
                >
                  <Plus size={14} />
                  <span>Add Manual Item</span>
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-2">Click on a product row to expand and edit product details</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2" style={{ borderColor: '#5C2E1F' }}>
                    <th className="text-left py-2 px-2 font-bold text-xs w-[5%]"></th>
                    <th className="text-left py-2 px-2 font-bold text-xs w-[30%]">PRODUCT</th>
                    <th className="text-center py-2 px-2 font-bold text-xs w-[12%]">QUANTITY</th>
                    <th className="text-right py-2 px-2 font-bold text-xs w-[15%]">UNIT PRICE</th>
                    <th className="text-right py-2 px-2 font-bold text-xs w-[15%]">SUBTOTAL</th>
                    <th className="text-center py-2 px-2 font-bold text-xs w-[8%]">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item, index) => (
                    <Fragment key={item.id}>
                      <tr
                        className={`border-b border-gray-200 ${item.isDeleted ? 'bg-red-50 opacity-50' : 'hover:bg-gray-50 cursor-pointer'}`}
                        onClick={() => !item.isDeleted && toggleItemExpand(index)}
                      >
                        <td className="py-2 px-2 text-center">
                          {!item.isDeleted && (
                            <button className="text-gray-500 hover:text-gray-700">
                              {item.isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          )}
                        </td>
                        <td className="py-2 px-2 text-xs" onClick={(e) => item.isNew && e.stopPropagation()}>
                          {item.isNew ? (
                            <div className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={item.product_name}
                                onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                                placeholder="Enter product name..."
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowProductPicker(index);
                                  setProductPickerSearch('');
                                }}
                                className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-xs whitespace-nowrap"
                              >
                                Select
                              </button>
                              {item.isNew && (
                                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">New</span>
                              )}
                            </div>
                          ) : (
                            <>
                              <span className={item.isDeleted ? 'line-through text-red-500' : ''}>
                                {item.product_name}
                              </span>
                              {item.isDeleted && (
                                <span className="ml-2 text-red-500 text-xs">(Will be removed)</span>
                              )}
                            </>
                          )}
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
                            <span className="text-gray-400">${item.unit_price.toFixed(2)}</span>
                          ) : (
                            <input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => handleItemChange(index, 'unit_price', Number(e.target.value))}
                              step="0.01"
                              min="0"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-right text-xs"
                            />
                          )}
                        </td>
                        <td className="py-2 px-2 text-right text-xs font-medium">
                          <span className={item.isDeleted ? 'text-gray-400 line-through' : ''}>
                            ${item.subtotal.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          {item.isDeleted ? (
                            <button
                              onClick={() => handleRestoreItem(index)}
                              className="text-green-500 hover:text-green-700 text-xs underline"
                              title="Restore item"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
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
                          <td colSpan={6} className="py-4 px-4">
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                              <h4 className="text-sm font-semibold mb-3" style={{ color: '#5C2E1F' }}>
                                Edit Product Details
                              </h4>
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-gray-700">
                                    Product Name
                                  </label>
                                  <input
                                    type="text"
                                    value={item.product_name}
                                    onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  />
                                </div>
                                <div onClick={(e) => e.stopPropagation()}>
                                  <CustomDropdown
                                    label="Type"
                                    name="product_type"
                                    value={item.product_type || ''}
                                    options={productTypeOptions}
                                    onChange={(value) => handleItemChange(index, 'product_type', value)}
                                    onAddOption={() => {
                                      setCurrentEditingItemIndex(index);
                                      setAddOptionType("product_type");
                                      setAddOptionLabel("Type");
                                      setIsAddOptionModalOpen(true);
                                    }}
                                    onRemoveOption={handleRemoveProductType}
                                  />
                                </div>
                                <div onClick={(e) => e.stopPropagation()}>
                                  <CustomDropdown
                                    label="Gelato Type"
                                    name="gelato_type"
                                    value={item.gelato_type || ''}
                                    options={gelatoTypeOptions}
                                    onChange={(value) => handleItemChange(index, 'gelato_type', value)}
                                    onAddOption={() => {
                                      setCurrentEditingItemIndex(index);
                                      setAddOptionType("gelato_type");
                                      setAddOptionLabel("Gelato Type");
                                      setIsAddOptionModalOpen(true);
                                    }}
                                    onRemoveOption={handleRemoveGelatoType}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-gray-700">
                                    Weight (kg)
                                  </label>
                                  <input
                                    type="text"
                                    value={item.calculated_weight || ''}
                                    onChange={(e) => handleItemChange(index, 'calculated_weight', e.target.value)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-gray-700">
                                    Milk Based (kg)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.product_milkbase || 0}
                                    onChange={(e) => handleItemChange(index, 'product_milkbase', parseFloat(e.target.value) || 0)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-gray-700">
                                    Sugar Syrup (kg)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.product_sugarbase || 0}
                                    onChange={(e) => handleItemChange(index, 'product_sugarbase', parseFloat(e.target.value) || 0)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-3 mt-3">
                                <div className="col-span-3">
                                  <label className="block text-xs font-medium mb-1 text-gray-700">
                                    Description
                                  </label>
                                  <input
                                    type="text"
                                    value={item.product_description || ''}
                                    onChange={(e) => handleItemChange(index, 'product_description', e.target.value)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>${activeOrderItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>GST (9%):</span>
                  <span>${(activeOrderItems.reduce((sum, item) => sum + item.subtotal, 0) * 0.09).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2" style={{ color: '#5C2E1F' }}>
                  <span>Total:</span>
                  <span>${calculateTotalAmount().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end pt-4 border-t">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 border-2 rounded font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              style={{ borderColor: '#5C2E1F', color: '#5C2E1F' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#FF5722' }}
            >
              {loading ? 'Updating...' : 'Update Order'}
            </button>
          </div>
        </div>
      </div>

      {/* Add Option Modal */}
      {isAddOptionModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[60]" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold" style={{ color: '#5C2E1F' }}>
                Add New {addOptionLabel}
              </h3>
              <button
                onClick={() => {
                  setIsAddOptionModalOpen(false);
                  setAddOptionType(null);
                  setCurrentEditingItemIndex(null);
                  if (addOptionType === "product_type") setNewProductType("");
                  if (addOptionType === "gelato_type") setNewGelatoType("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Option Name
              </label>
              <input
                type="text"
                value={addOptionType === "product_type" ? newProductType : newGelatoType}
                onChange={(e) => {
                  if (addOptionType === "product_type") setNewProductType(e.target.value);
                  if (addOptionType === "gelato_type") setNewGelatoType(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (addOptionType === "product_type" && newProductType.trim()) {
                      handleAddProductType();
                      setIsAddOptionModalOpen(false);
                      setCurrentEditingItemIndex(null);
                    }
                    if (addOptionType === "gelato_type" && newGelatoType.trim()) {
                      handleAddGelatoType();
                      setIsAddOptionModalOpen(false);
                      setCurrentEditingItemIndex(null);
                    }
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
                  setCurrentEditingItemIndex(null);
                  if (addOptionType === "product_type") setNewProductType("");
                  if (addOptionType === "gelato_type") setNewGelatoType("");
                }}
                className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (addOptionType === "product_type" && newProductType.trim()) {
                    handleAddProductType();
                    setIsAddOptionModalOpen(false);
                    setCurrentEditingItemIndex(null);
                  }
                  if (addOptionType === "gelato_type" && newGelatoType.trim()) {
                    handleAddGelatoType();
                    setIsAddOptionModalOpen(false);
                    setCurrentEditingItemIndex(null);
                  }
                }}
                disabled={
                  (addOptionType === "product_type" && !newProductType.trim()) ||
                  (addOptionType === "gelato_type" && !newGelatoType.trim())
                }
                className="px-4 py-2 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Option
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Picker Modal */}
      {showProductPicker !== null && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[60]"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
        >
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold" style={{ color: '#5C2E1F' }}>
                  Select Product from List
                </h3>
                <span className="text-sm text-gray-500">({allProducts.length} products)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchAllProducts}
                  disabled={loadingProducts}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {loadingProducts ? 'Loading...' : 'Refresh'}
                </button>
                <button
                  onClick={() => {
                    setShowProductPicker(null);
                    setProductPickerSearch('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-4 border-b">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={productPickerSearch}
                  onChange={(e) => setProductPickerSearch(e.target.value)}
                  placeholder="Search products by name, ID, or type..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingProducts ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent"></div>
                  <p className="mt-2 text-gray-500">Loading products...</p>
                </div>
              ) : getFilteredProducts().length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500 mb-2">Showing {getFilteredProducts().length} products</p>
                  {getFilteredProducts().map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleSelectProductForItem(showProductPicker, product)}
                      className="w-full px-4 py-3 text-left border border-gray-200 rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {product.product_image ? (
                          <Image
                            src={`https://boxzapgxostpqutxabzs.supabase.co/storage/v1/object/public/gwc_files/${product.product_image}`}
                            alt={product.product_name}
                            width={40}
                            height={40}
                            className="w-10 h-10 object-cover rounded"
                            unoptimized
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                            <span className="text-gray-400 text-xs">No img</span>
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{product.product_name}</div>
                          <div className="text-sm text-gray-500">
                            {product.product_id} • {product.product_type || 'N/A'} • S$ {(product.product_price || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : allProducts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No products found in the database</p>
                  <button
                    onClick={fetchAllProducts}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Refresh Products
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No products found matching your search
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}