'use client';
import { useState, useEffect, useRef } from 'react';
import { X, Search, Trash2, Check, Plus } from 'lucide-react';
import supabase from '@/lib/client';
import Image from 'next/image';

interface Client {
  client_id: string;
  client_auth_id: string;
  client_businessName: string;
  client_operationName: string | null;
  client_delivery_address: string;
  client_person_incharge: string;
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

interface ClientProduct {
  id: number;
  product_id: number;
  custom_price: number;
  product_list: Product;
}

interface OrderItem {
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  gelato_type: string;
  weight: number;
  request: string;
  subtotal: number;
  product_type: string;
  product_cost: number;
  product_milkbase: number;
  product_sugarbase: number;
  product_ingredient: string;
  is_manual: boolean;
  is_from_product_list: boolean;
  publish_to_client: boolean;  // Add product to client's assigned products
  add_to_product_list: boolean; // For manual items: add to product_list table
}

interface ClientOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Custom Dropdown Component for Product Type and Gelato Type
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
      <label className="block text-sm font-medium mb-1 text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm cursor-pointer bg-white flex justify-between items-center text-left"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-500'}>
          {value || `Select ${label}`}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <div className="py-1">
            {options.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                No options yet. Click &quot;Add Option&quot; to create one.
              </div>
            )}

            {options.map(option => (
              <div
                key={option}
                className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between group"
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
                  <X size={16} />
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
              className="w-full text-left px-3 py-2 hover:bg-orange-50 cursor-pointer flex items-center gap-2 text-orange-600 border-t border-gray-200"
            >
              <Plus size={16} />
              <span className="text-sm font-medium">Add New Option</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function ClientOrderModal({ isOpen, onClose, onSuccess }: ClientOrderModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });

  // Step 1: Client Selection
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Step 2: Order Details
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [country, setCountry] = useState('Singapore');
  const [postalCode, setPostalCode] = useState('');
  const [publishToClient, setPublishToClient] = useState(true);

  // Step 3: Product Selection
  const [availableProducts, setAvailableProducts] = useState<ClientProduct[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showProductPicker, setShowProductPicker] = useState<number | null>(null);
  const [productPickerSearch, setProductPickerSearch] = useState('');

  // Dropdown options for manual items
  const [productTypeOptions, setProductTypeOptions] = useState<string[]>([]);
  const [gelatoTypeOptions, setGelatoTypeOptions] = useState<string[]>([]);
  const [isAddOptionModalOpen, setIsAddOptionModalOpen] = useState(false);
  const [addOptionType, setAddOptionType] = useState<'product_type' | 'gelato_type' | null>(null);
  const [addOptionLabel, setAddOptionLabel] = useState('');
  const [newOptionValue, setNewOptionValue] = useState('');

  // Manual item editor
  const [showManualItemEditor, setShowManualItemEditor] = useState(false);
  const [manualItemData, setManualItemData] = useState({
    product_name: '',
    product_type: '',
    gelato_type: '',
    quantity: 1,
    weight: 0,
    unit_price: 0,
    product_cost: 0,
    product_milkbase: 0,
    product_sugarbase: 0,
    product_ingredient: '',
    request: ''
  });

  // Success Modal
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState('');

  // Fetch clients and dropdown options on mount
  useEffect(() => {
    if (isOpen) {
      fetchClients();
      fetchAllProducts();
      fetchDropdownOptions();
    }
  }, [isOpen]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('client_user')
        .select('client_id, client_auth_id, client_businessName, client_operationName, client_delivery_address, client_person_incharge')
        .order('client_businessName', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setMessage({ type: 'error', text: 'Failed to load clients' });
      setTimeout(() => setMessage({ type: '', text: '' }), 1000);
    }
  };

  const fetchAllProducts = async () => {
    try {
      setLoadingProducts(true);
      const { data, error } = await supabase
        .from('product_list')
        .select('id, product_id, product_name, product_type, product_gelato_type, product_weight, product_price, product_cost, product_milkbased, product_sugarbased, product_ingredient, product_image')
        .eq('is_deleted', false)
        .order('product_name', { ascending: true });

      if (error) {
        console.error('Error fetching products:', error);
        throw error;
      }
      setAllProducts(data || []);
    } catch (error) {
      console.error('Error fetching all products:', error);
      setMessage({ type: 'error', text: 'Failed to load products' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchDropdownOptions = async () => {
    try {
      // Try to get options from order_dropdown_options table
      const { data: productTypes, error: productTypeError } = await supabase
        .from('order_dropdown_options')
        .select('option_value')
        .eq('option_type', 'product_type');

      const { data: gelatoTypes, error: gelatoTypeError } = await supabase
        .from('order_dropdown_options')
        .select('option_value')
        .eq('option_type', 'gelato_type');

      let productTypeOpts: string[] = [];
      let gelatoTypeOpts: string[] = [];

      if (!productTypeError && productTypes && productTypes.length > 0) {
        productTypeOpts = productTypes.map(item => item.option_value);
      }

      if (!gelatoTypeError && gelatoTypes && gelatoTypes.length > 0) {
        gelatoTypeOpts = gelatoTypes.map(item => item.option_value);
      }

      // Also fetch unique types from product_list to supplement options
      const { data: products } = await supabase
        .from('product_list')
        .select('product_type, product_gelato_type')
        .eq('is_deleted', false);

      if (products) {
        products.forEach(p => {
          if (p.product_type && !productTypeOpts.includes(p.product_type)) {
            productTypeOpts.push(p.product_type);
          }
          if (p.product_gelato_type && !gelatoTypeOpts.includes(p.product_gelato_type)) {
            gelatoTypeOpts.push(p.product_gelato_type);
          }
        });
      }

      setProductTypeOptions(productTypeOpts);
      setGelatoTypeOptions(gelatoTypeOpts);
    } catch (error) {
      console.error('Error loading dropdown options:', error);
    }
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

  // Update the fetchClientProducts function to also fetch address data
  const fetchClientProducts = async (clientAuthId: string) => {
    try {
      setLoading(true);
      
      // Fetch client products with full product details including ingredients
      const { data: productsData, error: productsError } = await supabase
        .from('client_product')
        .select(`
          *,
          product_list (
            id,
            product_id,
            product_name,
            product_type,
            product_gelato_type,
            product_weight,
            product_price,
            product_cost,
            product_milkbased,
            product_sugarbased,
            product_ingredient,
            product_image
          )
        `)
        .eq('client_auth_id', clientAuthId)
        .eq('is_available', true);

      if (productsError) throw productsError;
      setAvailableProducts(productsData || []);

      // Fetch client address data
      const { data: clientData, error: clientError } = await supabase
        .from('client_user')
        .select('ad_streetName, ad_country, ad_postal')
        .eq('client_auth_id', clientAuthId)
        .single();

      if (clientError) throw clientError;
      
      // Set address fields with fetched data or defaults
      setDeliveryAddress(clientData?.ad_streetName || '');
      setCountry(clientData?.ad_country || 'Singapore');
      setPostalCode(clientData?.ad_postal || '');

    } catch (error) {
      console.error('Error fetching client data:', error);
      setMessage({ type: 'error', text: 'Failed to load client data' });
      setTimeout(() => setMessage({ type: '', text: '' }), 1000);
    } finally {
      setLoading(false);
    }
  };

  const generateOrderId = async (): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('client_order')
        .select('order_id')
        .like('order_id', 'ORD-%')
        .order('order_id', { ascending: false })
        .limit(1);

      if (error && error.code !== 'PGRST116') throw error;

      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastId = data[0].order_id;
        const lastNumber = parseInt(lastId.replace('ORD-', ''));
        nextNumber = lastNumber + 1;
      }

      return `ORD-${String(nextNumber).padStart(5, '0')}`;
    } catch (error) {
      console.error('Error generating order ID:', error);
      return `ORD-${String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0')}`;
    }
  };

  const handleClientSelect = async (client: Client) => {
    setSelectedClient(client);
    setDeliveryAddress(client.client_delivery_address);
    await fetchClientProducts(client.client_auth_id);
  };

  const handleStep1Next = () => {
    if (!selectedClient) {
      setMessage({ type: 'error', text: 'Please select a client' });
      setTimeout(() => setMessage({ type: '', text: '' }), 1000);
      return;
    }
    setStep(2);
  };

  const handleStep2Next = () => {
    if (!deliveryDate || !deliveryAddress) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      setTimeout(() => setMessage({ type: '', text: '' }), 1000);
      return;
    }
    setStep(3);
  };

  const handleAddProduct = (clientProduct: ClientProduct) => {
    const newItem: OrderItem = {
      product_id: clientProduct.product_list.id,
      product_name: clientProduct.product_list.product_name,
      quantity: 1,
      unit_price: clientProduct.custom_price,
      gelato_type: clientProduct.product_list.product_gelato_type || '',
      weight: clientProduct.product_list.product_weight || 0,
      request: '',
      subtotal: clientProduct.custom_price,
      product_type: clientProduct.product_list.product_type || '',
      product_cost: clientProduct.product_list.product_cost || 0,
      product_milkbase: clientProduct.product_list.product_milkbased || 0,
      product_sugarbase: clientProduct.product_list.product_sugarbased || 0,
      product_ingredient: clientProduct.product_list.product_ingredient || '',
      is_manual: false,
      is_from_product_list: true,
      publish_to_client: false, // Already assigned to client
      add_to_product_list: false
    };
    setOrderItems([...orderItems, newItem]);
  };

  const handleAddManualItem = () => {
    if (!manualItemData.product_name.trim()) {
      setMessage({ type: 'error', text: 'Please enter a product name' });
      setTimeout(() => setMessage({ type: '', text: '' }), 1000);
      return;
    }

    const newItem: OrderItem = {
      product_id: null,
      product_name: manualItemData.product_name.trim(),
      quantity: manualItemData.quantity,
      unit_price: manualItemData.unit_price,
      gelato_type: manualItemData.gelato_type,
      weight: manualItemData.weight,
      request: manualItemData.request,
      subtotal: manualItemData.quantity * manualItemData.unit_price,
      product_type: manualItemData.product_type,
      product_cost: manualItemData.product_cost,
      product_milkbase: manualItemData.product_milkbase,
      product_sugarbase: manualItemData.product_sugarbase,
      product_ingredient: manualItemData.product_ingredient,
      is_manual: true,
      is_from_product_list: false,
      publish_to_client: true, // Default to true for manual items
      add_to_product_list: true // Default to true for manual items
    };

    setOrderItems([...orderItems, newItem]);
    setShowManualItemEditor(false);
    resetManualItemData();
  };

  const resetManualItemData = () => {
    setManualItemData({
      product_name: '',
      product_type: '',
      gelato_type: '',
      quantity: 1,
      weight: 0,
      unit_price: 0,
      product_cost: 0,
      product_milkbase: 0,
      product_sugarbase: 0,
      product_ingredient: '',
      request: ''
    });
  };

  const getFilteredAllProducts = () => {
    const query = productPickerSearch.toLowerCase();
    if (!query) return allProducts;
    return allProducts.filter(p =>
      p.product_name.toLowerCase().includes(query) ||
      p.product_id.toLowerCase().includes(query) ||
      p.product_type?.toLowerCase().includes(query)
    );
  };

  // Update handleUpdateQuantity to handle custom price
  const handleUpdateQuantity = (index: number, quantity: number) => {
    const newItems = [...orderItems];
    if (quantity <= 0) {
      newItems.splice(index, 1);
    } else {
      newItems[index].quantity = quantity;
      newItems[index].subtotal = quantity * newItems[index].unit_price;
    }
    setOrderItems(newItems);
  };

  const handleUpdatePrice = (index: number, price: number) => {
    const newItems = [...orderItems];
    newItems[index].unit_price = price;
    newItems[index].subtotal = newItems[index].quantity * price;
    setOrderItems(newItems);
  };

  const handleUpdateItemField = (index: number, field: keyof OrderItem, value: string | number | boolean | null) => {
    const newItems = [...orderItems];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].subtotal = newItems[index].quantity * newItems[index].unit_price;
    }
    setOrderItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = orderItems.filter((_, i) => i !== index);
    setOrderItems(newItems);
  };

  // Add a new empty item
  const handleAddItem = () => {
    const newItem: OrderItem = {
      product_id: null,
      product_name: '',
      quantity: 1,
      unit_price: 0,
      gelato_type: '',
      weight: 0,
      request: '',
      subtotal: 0,
      product_type: '',
      product_cost: 0,
      product_milkbase: 0,
      product_sugarbase: 0,
      product_ingredient: '',
      is_manual: true,
      is_from_product_list: false,
      publish_to_client: true,
      add_to_product_list: false
    };
    setOrderItems([...orderItems, newItem]);
  };

  // Handle selecting a product from the picker for a specific item
  const handleSelectProductForItem = (index: number, product: Product) => {
    const newItems = [...orderItems];
    // Check if product is already assigned to this client
    const isAlreadyAssigned = availableProducts.some(cp => cp.product_list.id === product.id);

    // Handle null/undefined product_type and gelato_type
    const productType = product.product_type ?? '';
    const gelatoType = product.product_gelato_type ?? '';

    // Add product_type to options if not already present
    if (productType && !productTypeOptions.includes(productType)) {
      setProductTypeOptions(prev => [...prev, productType]);
    }

    // Add gelato_type to options if not already present
    if (gelatoType && !gelatoTypeOptions.includes(gelatoType)) {
      setGelatoTypeOptions(prev => [...prev, gelatoType]);
    }

    const updatedItem = {
      ...newItems[index],
      product_id: product.id,
      product_name: product.product_name,
      product_type: productType,
      gelato_type: gelatoType,
      weight: product.product_weight || 0,
      unit_price: product.product_price || 0,
      product_cost: product.product_cost || 0,
      product_milkbase: product.product_milkbased || 0,
      product_sugarbase: product.product_sugarbased || 0,
      product_ingredient: product.product_ingredient || '',
      subtotal: newItems[index].quantity * (product.product_price || 0),
      is_manual: false,
      is_from_product_list: true,
      publish_to_client: !isAlreadyAssigned
    };

    newItems[index] = updatedItem;
    setOrderItems(newItems);
    setShowProductPicker(null);
    setProductPickerSearch('');
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const calculateGST = () => {
    return calculateTotal() * 0.09;
  };

  const calculateGrandTotal = () => {
    return calculateTotal() + calculateGST();
  };

    // Update handleSubmitOrder to include address fields and auto-generate order_date
    const handleSubmitOrder = async () => {
      if (orderItems.length === 0) {
        setMessage({ type: 'error', text: 'Please add at least one product' });
        setTimeout(() => setMessage({ type: '', text: '' }), 1000);
        return;
      }

      if (!selectedClient) {
        setMessage({ type: 'error', text: 'Client not selected' });
        setTimeout(() => setMessage({ type: '', text: '' }), 1000);
        return;
      }

      try {
        setLoading(true);

        // Generate Order ID
        const orderId = await generateOrderId();
        const totalAmount = calculateGrandTotal();

        // Get current timestamp for order_date
        const currentTimestamp = new Date().toISOString();

        // Helper function to generate product ID
        const generateProductId = async (): Promise<string> => {
          try {
            const { data: existingProducts } = await supabase
              .from('product_list')
              .select('product_id')
              .like('product_id', 'GEL-%')
              .order('product_id', { ascending: false })
              .limit(1);

            let nextNumber = 1;
            if (existingProducts && existingProducts.length > 0) {
              const lastId = existingProducts[0].product_id;
              const match = lastId.match(/GEL-(\d+)/);
              if (match) {
                nextNumber = parseInt(match[1], 10) + 1;
              }
            }

            return `GEL-${nextNumber.toString().padStart(4, '0')}`;
          } catch (error) {
            console.error('Error generating product ID:', error);
            return `GEL-${Date.now()}`;
          }
        };

        // Step 1: Add manual products to product_list if add_to_product_list is true
        const manualItemsToAddToList = orderItems.filter(item => item.is_manual && item.add_to_product_list);
        const productIdMap: Record<string, number> = {}; // Map product name to new product ID

        for (const item of manualItemsToAddToList) {
          // Check if product already exists by name
          const { data: existingProduct } = await supabase
            .from('product_list')
            .select('id')
            .eq('product_name', item.product_name.trim())
            .single();

          if (!existingProduct) {
            // Generate product ID and add to product_list
            const productId = await generateProductId();

            const { data: newProduct, error: productError } = await supabase
              .from('product_list')
              .insert({
                product_id: productId,
                product_name: item.product_name.trim(),
                product_type: item.product_type || null,
                product_gelato_type: item.gelato_type || null,
                product_weight: item.weight || 0,
                product_milkbased: item.product_milkbase || null,
                product_sugarbased: item.product_sugarbase || null,
                product_price: item.unit_price || 0,
                product_cost: item.product_cost || null,
                product_ingredient: item.product_ingredient || null,
                product_created_at: new Date().toISOString()
              })
              .select('id')
              .single();

            if (productError) {
              console.error('Error adding product to product_list:', productError);
            } else if (newProduct) {
              productIdMap[item.product_name] = newProduct.id;
              console.log(`Added product "${item.product_name}" to product_list with ID: ${newProduct.id}`);
            }
          } else {
            productIdMap[item.product_name] = existingProduct.id;
          }
        }

        // Insert order with address fields
        // Try with published_to_client first, fallback without it if column doesn't exist
        let orderData = null;
        let orderError = null;

        // First try with published_to_client column
        const { data: data1, error: error1 } = await supabase
          .from('client_order')
          .insert({
            order_id: orderId,
            client_auth_id: selectedClient.client_auth_id,
            order_date: currentTimestamp,
            delivery_date: deliveryDate,
            delivery_address: deliveryAddress,
            ad_streetName: deliveryAddress,
            ad_country: country,
            ad_postal: postalCode,
            total_amount: totalAmount,
            status: 'Pending',
            notes: notes || null,
            published_to_client: publishToClient
          })
          .select('*')
          .single();

        if (error1 && error1.message?.includes('published_to_client')) {
          // Column doesn't exist, try without it
          console.log('published_to_client column not found, inserting without it');
          const { data: data2, error: error2 } = await supabase
            .from('client_order')
            .insert({
              order_id: orderId,
              client_auth_id: selectedClient.client_auth_id,
              order_date: currentTimestamp,
              delivery_date: deliveryDate,
              delivery_address: deliveryAddress,
              ad_streetName: deliveryAddress,
              ad_country: country,
              ad_postal: postalCode,
              total_amount: totalAmount,
              status: 'Pending',
              notes: notes || null
            })
            .select('*')
            .single();

          orderData = data2;
          orderError = error2;
        } else {
          orderData = data1;
          orderError = error1;
        }

        if (orderError) {
          console.error('Order creation error:', orderError);
          throw new Error(`Failed to create order: ${orderError.message || JSON.stringify(orderError)}`);
        }

        if (!orderData) {
          throw new Error('Order created but no data returned');
        }

        console.log('Order created successfully:', orderData);

        // Update product_id for manual items that were added to product_list
        const orderItemsData = orderItems.map(item => {
          let productId = item.product_id;

          // If this is a manual item that was added to product list, use the new product ID
          if (item.is_manual && item.add_to_product_list && productIdMap[item.product_name]) {
            productId = productIdMap[item.product_name];
          }

          // Base columns including product_type and gelato_type
          return {
            order_id: orderData.id,
            product_id: productId,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
            product_type: item.product_type || null,
            gelato_type: item.gelato_type || null
          };
        });

        console.log('Attempting to insert order items:', orderItemsData);

        // Try inserting with extended columns first, fallback to basic columns
        let insertedItems = null;
        let itemsError = null;

        // Insert with columns that exist in the database
        const extendedOrderItemsData = orderItems.map(item => {
          let productId = item.product_id;
          if (item.is_manual && item.add_to_product_list && productIdMap[item.product_name]) {
            productId = productIdMap[item.product_name];
          }
          return {
            order_id: orderData.id,
            product_id: productId,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
            product_type: item.product_type || null,
            gelato_type: item.gelato_type || null,
            calculated_weight: (item.weight || 0) * item.quantity,
            label_ingredients: item.product_ingredient || null
          };
        });

        const { data: itemData1, error: itemError1 } = await supabase
          .from('client_order_item')
          .insert(extendedOrderItemsData)
          .select();

        if (itemError1 && (itemError1.message?.includes('column') || itemError1.message?.includes('schema'))) {
          // Extended columns don't exist, use basic columns only
          console.log('Extended columns not found, inserting with basic columns only');
          const { data: itemData2, error: itemError2 } = await supabase
            .from('client_order_item')
            .insert(orderItemsData)
            .select();

          insertedItems = itemData2;
          itemsError = itemError2;
        } else {
          insertedItems = itemData1;
          itemsError = itemError1;
        }

        if (itemsError) {
          console.error('Order items creation error:', itemsError);
          await supabase
            .from('client_order')
            .delete()
            .eq('id', orderData.id);

          throw new Error(`Failed to create order items: ${itemsError.message || 'Unknown error'}`);
        }

        console.log('Order items created successfully:', insertedItems);

        // Step 2: Add products to client_product if publish_to_client is true
        const itemsToPublish = orderItems.filter(item => item.publish_to_client);

        for (const item of itemsToPublish) {
          let productId = item.product_id;

          // If this is a manual item that was added to product list, use the new product ID
          if (item.is_manual && productIdMap[item.product_name]) {
            productId = productIdMap[item.product_name];
          }

          if (productId) {
            // Check if product is already assigned to client
            const { data: existingAssignment } = await supabase
              .from('client_product')
              .select('id')
              .eq('client_auth_id', selectedClient.client_auth_id)
              .eq('product_id', productId)
              .single();

            if (!existingAssignment) {
              // Add to client_product
              const { error: assignError } = await supabase
                .from('client_product')
                .insert({
                  client_auth_id: selectedClient.client_auth_id,
                  product_id: productId,
                  custom_price: item.unit_price,
                  is_available: true,
                  is_published: true,
                  created_at: new Date().toISOString()
                });

              if (assignError) {
                console.error('Error assigning product to client:', assignError);
              } else {
                console.log(`Assigned product "${item.product_name}" to client with custom price: ${item.unit_price}`);
              }
            } else {
              console.log(`Product "${item.product_name}" is already assigned to client`);
            }
          }
        }

        // Success!
        setCreatedOrderId(orderId);
        setIsSuccessModalOpen(true);

      } catch (error) {
        console.error('Error creating order:', error);

        let errorMessage = 'Failed to create order';

        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'object' && error !== null) {
          errorMessage = JSON.stringify(error);
        }

        setMessage({
          type: 'error',
          text: errorMessage
        });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      } finally {
        setLoading(false);
      }
    };

const handleClose = () => {
  setStep(1);
  setSelectedClient(null);
  setDeliveryDate('');
  setDeliveryAddress('');
  setCountry('Singapore');
  setPostalCode('');
  setNotes('');
  setPublishToClient(true);
  setOrderItems([]);
  setClientSearch('');
  setProductSearch('');
  setShowProductPicker(null);
  setProductPickerSearch('');
  setShowManualItemEditor(false);
  setLoadingProducts(false);
  setAvailableProducts([]);
  resetManualItemData();
  setMessage({ type: '', text: '' });
  onClose();
};

  const handleSuccessClose = () => {
    setIsSuccessModalOpen(false);
    handleClose();
    onSuccess();
  };

  if (!isOpen) return null;

  const filteredClients = clients.filter(client =>
    client.client_id.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.client_businessName.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.client_person_incharge.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const filteredProducts = availableProducts.filter(cp =>
    cp.product_list.product_id.toLowerCase().includes(productSearch.toLowerCase()) ||
    cp.product_list.product_name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const isProductAdded = (productId: number) => {
    return orderItems.some(item => item.product_id === productId);
  };

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <div className="bg-white rounded-lg w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold" style={{ color: '#5C2E1F' }}>
                  Create New Order
                </h2>
                <p className="text-gray-500 mt-1">
                  {step === 1 && 'Select a client to create order for'}
                  {step === 2 && 'Enter order details'}
                  {step === 3 && 'Add products to the order'}
                </p>
              </div>
              <button onClick={handleClose} disabled={loading} className="text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed">
                <X size={24} />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 ${step >= 1 ? 'text-orange-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-orange-600 text-white' : 'bg-gray-300'}`}>
                    1
                  </div>
                  <span className="text-sm font-medium">Client</span>
                </div>
                <div className={`w-16 h-0.5 ${step >= 2 ? 'bg-orange-600' : 'bg-gray-300'}`}></div>
                <div className={`flex items-center gap-2 ${step >= 2 ? 'text-orange-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-orange-600 text-white' : 'bg-gray-300'}`}>
                    2
                  </div>
                  <span className="text-sm font-medium">Details</span>
                </div>
                <div className={`w-16 h-0.5 ${step >= 3 ? 'bg-orange-600' : 'bg-gray-300'}`}></div>
                <div className={`flex items-center gap-2 ${step >= 3 ? 'text-orange-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-orange-600 text-white' : 'bg-gray-300'}`}>
                    3
                  </div>
                  <span className="text-sm font-medium">Products</span>
                </div>
              </div>
            </div>

            {/* Message Display */}
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

            {/* Step 1: Client Selection */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search clients by ID, name, or person in charge..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                  {filteredClients.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      No clients found
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {filteredClients.map((client) => (
                        <div
                          key={client.client_id}
                          onClick={() => handleClientSelect(client)}
                          className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                            selectedClient?.client_id === client.client_id ? 'bg-orange-50 border-l-4 border-orange-600' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{client.client_businessName}</p>
                              <p className="text-sm text-gray-600">{client.client_operationName || 'No Operation Name'} • {client.client_person_incharge}</p>
                              <p className="text-xs text-gray-500 mt-1">{client.client_delivery_address}</p>
                            </div>
                            {selectedClient?.client_id === client.client_id && (
                              <Check size={24} className="text-orange-600" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={handleClose}
                    className="px-8 py-2 border border-gray-300 rounded font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStep1Next}
                    disabled={!selectedClient || loading}
                    className="px-8 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#FF5722' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Order Details */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Delivery Date <span className="text-red-500">*</span>
                  </label>
                  
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    min={new Date(new Date().setDate(new Date().getDate() + 3)).toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Preferred Delivery Address <span className="text-red-500">*</span>
                </label>
                
                {/* Street Name */}
                <div className="mb-3">
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Block/Home Number/Street Name/City"
                    required
                  />
                </div>

                {/* Country and Postal Code in Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Country"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Postal Code"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Publish to Client Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Publish to Client
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Make this order visible in the client&apos;s order history
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPublishToClient(!publishToClient)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    publishToClient ? 'bg-orange-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      publishToClient ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex justify-between gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-8 py-2 border border-gray-300 rounded font-medium hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleStep2Next}
                  disabled={loading}
                  className="px-8 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#FF5722' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}

            {/* Step 3: Product Selection */}
            {step === 3 && (
              <div className="space-y-4">
                {/* Action Buttons */}
                <div className="flex gap-3 mb-4">
                  <button
                    onClick={() => {
                      // Add a new empty item and open picker for it
                      const newIndex = orderItems.length;
                      handleAddItem();
                      setShowProductPicker(newIndex);
                      // Refetch products if empty
                      if (allProducts.length === 0) {
                        fetchAllProducts();
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Search size={18} />
                    <span>Select from Product List</span>
                  </button>
                  <button
                    onClick={handleAddItem}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <Plus size={18} />
                    <span>Add Manual Item</span>
                  </button>
                </div>

                {/* Available Client Products (if any) */}
                {availableProducts.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3" style={{ color: '#5C2E1F' }}>
                      Client&apos;s Assigned Products
                    </h3>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        placeholder="Search assigned products..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                      <div className="divide-y divide-gray-200">
                        {filteredProducts.map((cp) => (
                          <div key={cp.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                            <div className="flex items-center gap-3 flex-1">
                              {cp.product_list.product_image ? (
                                <Image
                                  src={`https://boxzapgxostpqutxabzs.supabase.co/storage/v1/object/public/gwc_files/${cp.product_list.product_image}`}
                                  alt={cp.product_list.product_name}
                                  width={48}
                                  height={48}
                                  className="w-12 h-12 object-cover rounded"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                                  <span className="text-gray-400 text-xs">No img</span>
                                </div>
                              )}
                              <div className="flex-1">
                                <p className="font-medium text-sm">{cp.product_list.product_name}</p>
                                <p className="text-xs text-gray-600">
                                  {cp.product_list.product_id} • {cp.product_list.product_type}
                                </p>
                                <p className="text-xs text-orange-600 font-medium mt-1">
                                  S$ {cp.custom_price.toFixed(2)}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleAddProduct(cp)}
                              disabled={isProductAdded(cp.product_list.id)}
                              className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isProductAdded(cp.product_list.id) ? 'Added' : 'Add'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Message when no assigned products */}
                {availableProducts.length === 0 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-700 text-sm">
                      This client has no assigned products. You can select products from the full product list or add manual items.
                    </p>
                  </div>
                )}

                {/* Order Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold" style={{ color: '#5C2E1F' }}>
                      Order Items ({orderItems.length})
                    </h3>
                    <button
                      onClick={handleAddItem}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      disabled={loading}
                    >
                      <Plus size={20} />
                      <span>Add More Item</span>
                    </button>
                  </div>

                  <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-700">
                      <strong>Note:</strong> Product details for these orders (milkbase, sugar syrup, etc.) are recorded in the Production Guide. To view or edit these details after order creation, use the Edit Order function.
                    </p>
                  </div>

                {orderItems.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
                    No products added yet. Click &quot;Add More Item&quot; to start adding products.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orderItems.map((item, index) => (
                      <div key={index} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-700">Item {index + 1}</h4>
                            {item.is_manual && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                                Manual
                              </span>
                            )}
                            {item.is_from_product_list && !item.is_manual && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                From List
                              </span>
                            )}
                          </div>
                          {orderItems.length > 1 && (
                            <button
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-500 hover:text-red-700"
                              disabled={loading}
                            >
                              <Trash2 size={20} />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {/* Product Name with Select from List */}
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Product Name <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={item.product_name}
                                onChange={(e) => {
                                  const newItems = [...orderItems];
                                  newItems[index] = {
                                    ...newItems[index],
                                    product_name: e.target.value,
                                    is_manual: true,
                                    is_from_product_list: false,
                                    product_id: null
                                  };
                                  setOrderItems(newItems);
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="Enter product name..."
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setShowProductPicker(index);
                                  setProductPickerSearch('');
                                }}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 whitespace-nowrap"
                              >
                                <Search size={16} />
                                Select from List
                              </button>
                            </div>
                          </div>

                          {/* Product Type */}
                          <div>
                            <CustomDropdown
                              label="Product Type"
                              name="product_type"
                              value={item.product_type}
                              options={productTypeOptions}
                              onChange={(e) => handleUpdateItemField(index, 'product_type', e.target.value)}
                              onAddOption={() => {
                                setAddOptionType('product_type');
                                setAddOptionLabel('Product Type');
                                setIsAddOptionModalOpen(true);
                              }}
                              onRemoveOption={handleRemoveProductType}
                              required={true}
                            />
                          </div>

                          {/* Gelato Type */}
                          <div>
                            <CustomDropdown
                              label="Gelato Type"
                              name="gelato_type"
                              value={item.gelato_type}
                              options={gelatoTypeOptions}
                              onChange={(e) => handleUpdateItemField(index, 'gelato_type', e.target.value)}
                              onAddOption={() => {
                                setAddOptionType('gelato_type');
                                setAddOptionLabel('Gelato Type');
                                setIsAddOptionModalOpen(true);
                              }}
                              onRemoveOption={handleRemoveGelatoType}
                              required={true}
                            />
                          </div>

                          {/* Quantity */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Quantity <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value) || 1)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>

                          {/* Weight */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Weight (kg) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.weight}
                              onChange={(e) => handleUpdateItemField(index, 'weight', parseFloat(e.target.value) || 0)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                              placeholder="0.00"
                            />
                          </div>

                          {/* Price */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Price (S$) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unit_price}
                              onChange={(e) => handleUpdatePrice(index, parseFloat(e.target.value) || 0)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                              placeholder="0.00"
                            />
                          </div>

                          {/* Cost */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Cost (S$)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.product_cost}
                              onChange={(e) => handleUpdateItemField(index, 'product_cost', parseFloat(e.target.value) || 0)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                              placeholder="0.00"
                            />
                          </div>

                          {/* Milk Based */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Milk Based (kg)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.product_milkbase}
                              onChange={(e) => handleUpdateItemField(index, 'product_milkbase', parseFloat(e.target.value) || 0)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                              placeholder="0.00"
                            />
                          </div>

                          {/* Sugar Based */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Sugar Based (kg)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.product_sugarbase}
                              onChange={(e) => handleUpdateItemField(index, 'product_sugarbase', parseFloat(e.target.value) || 0)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                              placeholder="0.00"
                            />
                          </div>

                          {/* Ingredients */}
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Ingredients
                            </label>
                            <textarea
                              value={item.product_ingredient}
                              onChange={(e) => handleUpdateItemField(index, 'product_ingredient', e.target.value)}
                              rows={2}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                              placeholder="Enter product ingredients..."
                            />
                          </div>

                          {/* Notes/Request */}
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Notes / Special Request
                            </label>
                            <textarea
                              value={item.request}
                              onChange={(e) => handleUpdateItemField(index, 'request', e.target.value)}
                              rows={2}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                              placeholder="Enter any special requests..."
                            />
                          </div>
                        </div>

                        {/* Subtotal Display */}
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <div className="flex justify-end">
                            <div className="text-right">
                              <span className="text-sm text-gray-500">Subtotal: </span>
                              <span className="text-lg font-bold text-orange-600">S$ {item.subtotal.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Options Row */}
                        <div className="flex items-center gap-6 mt-3 pt-3 border-t border-gray-200">
                          {/* Publish to Client Option */}
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.publish_to_client}
                              onChange={(e) => handleUpdateItemField(index, 'publish_to_client', e.target.checked)}
                              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            />
                            <span className="text-xs text-gray-600">
                              Publish to Client
                              <span className="text-gray-400 ml-1">(Add to client&apos;s assigned products)</span>
                            </span>
                          </label>

                          {/* Add to Product List Option */}
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.add_to_product_list}
                              onChange={(e) => handleUpdateItemField(index, 'add_to_product_list', e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-xs text-gray-600">
                              Add to Product List
                              <span className="text-gray-400 ml-1">(Save as new product)</span>
                            </span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Order Summary */}
                {orderItems.length > 0 && (
                  <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">S$ {calculateTotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">GST (9%):</span>
                      <span className="font-medium">S$ {calculateGST().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span style={{ color: '#5C2E1F' }}>Total:</span>
                      <span style={{ color: '#FF5722' }}>S$ {calculateGrandTotal().toFixed(2)}</span>
                    </div>
                  </div>
                )}
                </div>

                <div className="flex justify-between gap-3 mt-6">
                  <button
                    onClick={() => setStep(2)}
                    className="px-8 py-2 border border-gray-300 rounded font-medium hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmitOrder}
                    disabled={loading || orderItems.length === 0}
                    className="px-8 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#FF5722' }}
                  >
                    {loading ? 'Creating Order...' : 'Create Order'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Picker Modal */}
      {showProductPicker !== null && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 9999 }}
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
              ) : getFilteredAllProducts().length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500 mb-2">Showing {getFilteredAllProducts().length} products</p>
                  {getFilteredAllProducts().map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleSelectProductForItem(showProductPicker as number, product)}
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

      {/* Manual Item Editor Modal */}
      {showManualItemEditor && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 9999 }}
        >
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto shadow-xl">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-bold" style={{ color: '#5C2E1F' }}>
                Add Manual Item
              </h3>
              <button
                onClick={() => {
                  setShowManualItemEditor(false);
                  resetManualItemData();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={manualItemData.product_name}
                  onChange={(e) => setManualItemData({ ...manualItemData, product_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter product name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <CustomDropdown
                  label="Product Type"
                  name="product_type"
                  value={manualItemData.product_type}
                  options={productTypeOptions}
                  onChange={(e) => setManualItemData({ ...manualItemData, product_type: e.target.value })}
                  onAddOption={() => {
                    setAddOptionType('product_type');
                    setAddOptionLabel('Product Type');
                    setIsAddOptionModalOpen(true);
                  }}
                  onRemoveOption={handleRemoveProductType}
                  required={true}
                />

                <CustomDropdown
                  label="Gelato Type"
                  name="gelato_type"
                  value={manualItemData.gelato_type}
                  options={gelatoTypeOptions}
                  onChange={(e) => setManualItemData({ ...manualItemData, gelato_type: e.target.value })}
                  onAddOption={() => {
                    setAddOptionType('gelato_type');
                    setAddOptionLabel('Gelato Type');
                    setIsAddOptionModalOpen(true);
                  }}
                  onRemoveOption={handleRemoveGelatoType}
                  required={true}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={manualItemData.quantity}
                    onChange={(e) => setManualItemData({ ...manualItemData, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={manualItemData.weight}
                    onChange={(e) => setManualItemData({ ...manualItemData, weight: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (S$) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={manualItemData.unit_price}
                    onChange={(e) => setManualItemData({ ...manualItemData, unit_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost (S$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={manualItemData.product_cost}
                    onChange={(e) => setManualItemData({ ...manualItemData, product_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Milk Based
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={manualItemData.product_milkbase}
                    onChange={(e) => setManualItemData({ ...manualItemData, product_milkbase: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sugar Based
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={manualItemData.product_sugarbase}
                    onChange={(e) => setManualItemData({ ...manualItemData, product_sugarbase: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ingredients
                </label>
                <textarea
                  value={manualItemData.product_ingredient}
                  onChange={(e) => setManualItemData({ ...manualItemData, product_ingredient: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter ingredients (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes / Request
                </label>
                <textarea
                  value={manualItemData.request}
                  onChange={(e) => setManualItemData({ ...manualItemData, request: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter any notes or special requests (optional)"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  setShowManualItemEditor(false);
                  resetManualItemData();
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddManualItem}
                disabled={!manualItemData.product_name.trim()}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Option Modal */}
      {isAddOptionModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 10000 }}
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

      {/* Success Modal */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-60" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <Check size={32} className="text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#5C2E1F' }}>
              Order Created Successfully!
            </h2>
            <p className="text-gray-600 mb-2">
              Order ID: <span className="font-semibold">{createdOrderId}</span>
            </p>
            <p className="text-gray-600 mb-2">
              The order has been created for {selectedClient?.client_businessName}
            </p>
            {!publishToClient && (
              <p className="text-sm text-orange-600 mb-4">
                (This order is not visible to the client)
              </p>
            )}
            <button
              onClick={handleSuccessClose}
              className="px-16 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#FF5722' }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}