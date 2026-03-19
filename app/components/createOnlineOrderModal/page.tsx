'use client';
import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Check, Search } from 'lucide-react';
import supabase from '@/lib/client';
import {
  generateNextBbdCode,
  generateNextPbnCode,
  generate30DigitBarcode,
  generate13DigitBarcode,
  generateNextGpbnCode,
} from '@/lib/stickerGenerator';

interface OrderItem {
  product_id: number | null;
  product_name: string;
  product_type: string;
  gelato_type: string;
  quantity: number;
  product_weight: number;
  product_milkbase: number;
  product_sugarbase: number;
  product_notes: string;
  product_price: number;
  product_cost: number;
  product_ingredient: string;
  product_allergen: string;
  product_description: string;
  add_to_product_list: boolean;
  is_from_product_list?: boolean;
  product_list_id?: number;
  // Barcode fields from product_list
  sticker_bbd_code: string | null;
  sticker_pbn_code: string | null;
  sticker_barcode: string | null;
  barcode_13digit: string | null;
  sticker_gpbn_code: string | null;
}

interface Product {
  id: number;
  product_id: string;
  product_name: string;
  product_type: string;
  product_gelato_type: string;
  product_weight: number;
  product_milkbased: number | null;
  product_sugarbased: number | null;
  product_price: number;
  product_cost: number | null;
  product_ingredient: string | null;
  product_allergen: string | null;
  product_description: string | null;
  // Barcode fields
  sticker_bbd_code: string | null;
  sticker_pbn_code: string | null;
  sticker_barcode: string | null;
  barcode_13digit: string | null;
  sticker_gpbn_code: string | null;
}

interface CreateOnlineOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateOnlineOrderModal({ isOpen, onClose, onSuccess }: CreateOnlineOrderModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showProductEditor, setShowProductEditor] = useState(false);
  const [productFormData, setProductFormData] = useState({
    option_name: '',
    product_type: '',
    gelato_type: '',
    product_weight: 0,
    product_price: 0,
    product_cost: 0
  });
  const [productTypeOptions, setProductTypeOptions] = useState<string[]>([]);
  const [gelatoTypeOptions, setGelatoTypeOptions] = useState<string[]>([]);
  const [isAddOptionModalOpen, setIsAddOptionModalOpen] = useState(false);
  const [addOptionType, setAddOptionType] = useState<'product_type' | 'gelato_type' | null>(null);
  const [addOptionLabel, setAddOptionLabel] = useState('');
  const [newOptionValue, setNewOptionValue] = useState('');

  // Product list state
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductPicker, setShowProductPicker] = useState<number | null>(null);
  const [productPickerSearch, setProductPickerSearch] = useState('');

  // Fetch products from product_list
  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('product_list')
        .select('id, product_id, product_name, product_type, product_gelato_type, product_weight, product_milkbased, product_sugarbased, product_price, product_cost, product_ingredient, product_allergen, product_description, sticker_bbd_code, sticker_pbn_code, sticker_barcode, barcode_13digit, sticker_gpbn_code')
        .order('product_name', { ascending: true });

      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

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
    fetchProducts();
  }, []);

  
  // Step 1: Order Details
  const [customerName, setCustomerName] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  
  // Step 2: Order Items
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    {
      product_id: null,
      product_name: '',
      product_type: '',
      gelato_type: '',
      quantity: 1,
      product_weight: 0,
      product_milkbase: 0,
      product_sugarbase: 0,
      product_notes: '',
      product_price: 0,
      product_cost: 0,
      product_ingredient: '',
      product_allergen: '',
      product_description: '',
      add_to_product_list: false,
      is_from_product_list: false,
      sticker_bbd_code: null,
      sticker_pbn_code: null,
      sticker_barcode: null,
      barcode_13digit: null,
      sticker_gpbn_code: null
    }
  ]);

  const handleAddItem = () => {
    setOrderItems([
      ...orderItems,
      {
        product_id: null,
        product_name: '',
        product_type: '',
        gelato_type: '',
        quantity: 1,
        product_weight: 0,
        product_milkbase: 0,
        product_sugarbase: 0,
        product_notes: '',
        product_price: 0,
        product_cost: 0,
        product_ingredient: '',
        product_allergen: '',
        product_description: '',
        add_to_product_list: false,
        is_from_product_list: false,
        sticker_bbd_code: null,
        sticker_pbn_code: null,
        sticker_barcode: null,
        barcode_13digit: null,
        sticker_gpbn_code: null
      }
    ]);
  };

  // Handle selecting a product from the product list
  const handleSelectProduct = (index: number, product: Product) => {
    // Use ?? instead of || to properly handle 0 values (e.g., product_milkbased of 0 should remain 0)
    const updatedItems = [...orderItems];
    updatedItems[index] = {
      ...updatedItems[index],
      product_id: product.id ?? null,
      product_name: product.product_name,
      product_type: product.product_type ?? '',
      gelato_type: product.product_gelato_type ?? '',
      product_weight: product.product_weight ?? 0,
      product_milkbase: product.product_milkbased ?? 0,
      product_sugarbase: product.product_sugarbased ?? 0,
      product_price: product.product_price ?? 0,
      product_cost: product.product_cost ?? 0,
      product_ingredient: product.product_ingredient ?? '',
      product_allergen: product.product_allergen ?? '',
      product_description: product.product_description ?? '',
      add_to_product_list: false,
      is_from_product_list: true,
      product_list_id: product.id,
      // Copy barcode fields from product
      sticker_bbd_code: product.sticker_bbd_code ?? null,
      sticker_pbn_code: product.sticker_pbn_code ?? null,
      sticker_barcode: product.sticker_barcode ?? null,
      barcode_13digit: product.barcode_13digit ?? null,
      sticker_gpbn_code: product.sticker_gpbn_code ?? null
    };
    setOrderItems(updatedItems);
    setShowProductPicker(null);
    setProductPickerSearch('');
  };

  // Filter products based on search query for product picker
  const getFilteredProducts = () => {
    const query = productPickerSearch.toLowerCase();
    if (!query) return products;
    return products.filter(p =>
      p.product_name.toLowerCase().includes(query) ||
      p.product_id.toLowerCase().includes(query) ||
      p.product_type?.toLowerCase().includes(query)
    );
  };

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

const handleAddOption = async () => {
  if (!newOptionValue.trim() || !addOptionType) return;

  const trimmedValue = newOptionValue.trim();

  try {
    // Insert into order_dropdown_options table
    await supabase.from('order_dropdown_options').insert({  // Changed from 'dropdown_options'
      option_type: addOptionType,
      option_value: trimmedValue,
    });

    // Update local state
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
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number | boolean) => {
    const newItems = [...orderItems];
    newItems[index] = {
        ...newItems[index],
        [field]: value
    };
    setOrderItems(newItems);
    };

  const validateStep1 = () => {
    if (!customerName.trim()) {
      alert('Please enter customer name');
      return false;
    }
    if (!deliveryDate) {
      alert('Please select delivery date');
      return false;
    }
    if (!deliveryAddress.trim()) {
      alert('Please enter delivery address');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    for (let i = 0; i < orderItems.length; i++) {
        const item = orderItems[i];
        if (!item.product_name.trim()) {
        alert(`Please enter product name for item ${i + 1}`);
        return false;
        }
        if (!item.product_type.trim()) {
        alert(`Please enter product type for item ${i + 1}`);
        return false;
        }
        if (item.quantity < 1) {
        alert(`Please enter a valid quantity for item ${i + 1}`);
        return false;
        }
    }
    return true;
    };

  const handleProceed = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  // Generate product ID for new products
  const generateProductId = async (): Promise<string> => {
    try {
      const { data: existingProducts, error: fetchError } = await supabase
        .from('product_list')
        .select('product_id')
        .like('product_id', 'GEL-%')
        .order('product_id', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error('Error fetching existing products:', fetchError);
      }

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

  const handleSubmit = async () => {
    if (!validateStep2()) return;

    try {
      setLoading(true);

      // First, add new products to product_list (only those with add_to_product_list checked)
      const newProducts = orderItems.filter(item => item.add_to_product_list && !item.is_from_product_list && item.product_name.trim());

      for (const item of newProducts) {
        // Check if product already exists by name
        const { data: existingProduct } = await supabase
          .from('product_list')
          .select('id')
          .eq('product_name', item.product_name.trim())
          .single();

        if (!existingProduct) {
          // Generate product ID
          const productId = await generateProductId();

          // Generate unique sequential barcodes for the new product
          const { data: allProducts } = await supabase
            .from('product_list')
            .select('sticker_bbd_code, sticker_pbn_code, barcode_13digit, sticker_gpbn_code')
            .order('id', { ascending: false });

          // Find highest existing codes
          let highestBbdCode: string | null = null;
          let highestPbnCode: string | null = null;
          let highestBarcode13: string | null = null;
          let highestGpbnCode: string | null = null;

          if (allProducts) {
            for (const p of allProducts) {
              if (p.sticker_bbd_code) {
                const currentPrefix = parseInt(p.sticker_bbd_code.substring(0, 4) || '0', 10);
                const highestPrefix = parseInt(highestBbdCode?.substring(0, 4) || '0', 10);
                if (currentPrefix > highestPrefix) highestBbdCode = p.sticker_bbd_code;
              }
              if (p.sticker_pbn_code) {
                const currentNum = parseInt(p.sticker_pbn_code.replace('PBN', '') || '0', 10);
                const highestNum = parseInt(highestPbnCode?.replace('PBN', '') || '0', 10);
                if (currentNum > highestNum) highestPbnCode = p.sticker_pbn_code;
              }
              if (p.barcode_13digit) {
                const currentNum = parseInt(p.barcode_13digit || '0', 10);
                const highestNum = parseInt(highestBarcode13 || '0', 10);
                if (currentNum > highestNum) highestBarcode13 = p.barcode_13digit;
              }
              if (p.sticker_gpbn_code) {
                const currentNum = parseInt(p.sticker_gpbn_code.replace('GPBN', '') || '0', 10);
                const highestNum = parseInt(highestGpbnCode?.replace('GPBN', '') || '0', 10);
                if (currentNum > highestNum) highestGpbnCode = p.sticker_gpbn_code;
              }
            }
          }

          // Generate next sequential barcodes
          const newBbdCode = generateNextBbdCode(highestBbdCode);
          const newPbnCode = generateNextPbnCode(highestPbnCode);
          const newBarcode = generate30DigitBarcode(newBbdCode, newPbnCode);
          const newBarcode13 = generate13DigitBarcode(highestBarcode13);
          const newGpbnCode = generateNextGpbnCode(highestGpbnCode);

          // Add to product_list with barcodes
          const { data: newProduct, error: productError } = await supabase
            .from('product_list')
            .insert({
              product_id: productId,
              product_name: item.product_name.trim(),
              product_type: item.product_type ?? null,
              product_gelato_type: item.gelato_type ?? null,
              product_weight: item.product_weight ?? 0,
              product_milkbased: item.product_milkbase ?? null,
              product_sugarbased: item.product_sugarbase ?? null,
              product_price: item.product_price ?? 0,
              product_cost: item.product_cost ?? null,
              product_ingredient: item.product_ingredient ?? null,
              product_allergen: item.product_allergen ?? null,
              product_description: item.product_description ?? null,
              product_created_at: new Date().toISOString(),
              // Barcode fields
              sticker_bbd_code: newBbdCode,
              sticker_pbn_code: newPbnCode,
              sticker_barcode: newBarcode,
              barcode_13digit: newBarcode13,
              sticker_gpbn_code: newGpbnCode
            })
            .select('id, sticker_bbd_code, sticker_pbn_code, sticker_barcode, barcode_13digit, sticker_gpbn_code')
            .single();

          if (productError) {
            console.error('Error adding product to product_list:', productError);
            // Continue with order creation even if product insert fails
          } else if (newProduct) {
            // Update item's barcode fields so they get saved to order_item
            item.sticker_bbd_code = newProduct.sticker_bbd_code;
            item.sticker_pbn_code = newProduct.sticker_pbn_code;
            item.sticker_barcode = newProduct.sticker_barcode;
            item.barcode_13digit = newProduct.barcode_13digit;
            item.sticker_gpbn_code = newProduct.sticker_gpbn_code;
            item.product_list_id = newProduct.id;
            console.log(`Added product "${item.product_name}" to product_list with barcodes`);
          }
        } else {
          // Fetch existing product's barcodes to use in order item
          const { data: existingProductData } = await supabase
            .from('product_list')
            .select('sticker_bbd_code, sticker_pbn_code, sticker_barcode, barcode_13digit, sticker_gpbn_code')
            .eq('id', existingProduct.id)
            .single();

          if (existingProductData) {
            item.sticker_bbd_code = existingProductData.sticker_bbd_code;
            item.sticker_pbn_code = existingProductData.sticker_pbn_code;
            item.sticker_barcode = existingProductData.sticker_barcode;
            item.barcode_13digit = existingProductData.barcode_13digit;
            item.sticker_gpbn_code = existingProductData.sticker_gpbn_code;
            item.product_list_id = existingProduct.id;
          }
        }
      }

      // Ensure ALL order items have barcodes - fetch from product_list if they have a product_list_id
      for (const item of orderItems) {
        if (item.product_list_id && (!item.sticker_barcode || !item.barcode_13digit)) {
          const { data: productData } = await supabase
            .from('product_list')
            .select('sticker_bbd_code, sticker_pbn_code, sticker_barcode, barcode_13digit, sticker_gpbn_code')
            .eq('id', item.product_list_id)
            .single();

          if (productData) {
            item.sticker_bbd_code = productData.sticker_bbd_code;
            item.sticker_pbn_code = productData.sticker_pbn_code;
            item.sticker_barcode = productData.sticker_barcode;
            item.barcode_13digit = productData.barcode_13digit;
            item.sticker_gpbn_code = productData.sticker_gpbn_code;
          }
        }
      }

      // Generate tracking number and order_id
      const trackingNo = `TRK-${Date.now().toString().slice(-8)}`;
      const orderId = `ORD-${Date.now()}`;

      // Get current date in YYYY-MM-DD format
      const currentDate = new Date().toISOString().split('T')[0];

      // Insert customer order - database will auto-generate id
      const { data: orderData, error: orderError } = await supabase
        .from('customer_order')
        .insert({
          order_id: orderId,
          customer_name: customerName.trim(),
          order_date: currentDate,
          delivery_date: deliveryDate,
          delivery_address: deliveryAddress.trim(),
          status: 'Pending',
          notes: notes.trim() || null,
          tracking_no: trackingNo
        })
        .select()
        .single();

      if (orderError) {
        console.error('Order insert error details:', {
          error: orderError,
          message: orderError.message,
          details: orderError.details,
          hint: orderError.hint,
          code: orderError.code
        });
        alert(`Failed to create order: ${orderError.message || 'Unknown error'}`);
        throw orderError;
      }

      if (!orderData) {
        throw new Error('No order data returned after insert');
      }

      // Insert order items - database will auto-generate id
      // Save all product details to customer_order_item so they are preserved
      // even if the product is later edited in product_list
      const itemsToInsert = orderItems.map(item => ({
        order_id: orderData.id,
        product_id: item.product_list_id || null,  // Store reference to product_list if from there
        product_name: item.product_name.trim(),
        product_type: item.product_type ?? null,
        quantity: item.quantity,
        gelato_type: item.gelato_type ?? null,
        product_weight: item.product_weight ?? 0,
        calculated_weight: (item.product_weight * item.quantity).toFixed(2),
        product_price: item.product_price ?? 0,
        product_cost: item.product_cost ?? 0,
        label_ingredients: item.product_ingredient ?? null,
        label_allergens: item.product_allergen ?? null,
        product_description: item.product_description ?? null,
        product_milkbase: item.product_milkbase ?? 0,
        product_sugarbase: item.product_sugarbase ?? 0,
        // Barcode fields
        sticker_bbd_code: item.sticker_bbd_code ?? null,
        sticker_pbn_code: item.sticker_pbn_code ?? null,
        sticker_barcode: item.sticker_barcode ?? null,
        barcode_13digit: item.barcode_13digit ?? null,
        sticker_gpbn_code: item.sticker_gpbn_code ?? null
      }));

      const { error: itemsError } = await supabase
        .from('customer_order_item')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Items insert error - Full error:', JSON.stringify(itemsError, null, 2));
        console.error('Items insert error - Message:', itemsError.message);
        console.error('Items insert error - Details:', itemsError.details);
        console.error('Items insert error - Hint:', itemsError.hint);
        console.error('Items insert error - Code:', itemsError.code);
        console.error('Items being inserted:', JSON.stringify(itemsToInsert, null, 2));
        alert(`Failed to create order items: ${itemsError.message || JSON.stringify(itemsError) || 'Unknown error'}`);
        throw itemsError;
      }

      // Refresh products list for next time
      fetchProducts();

      // Show success message
      setShowSuccess(true);

      // Reset after delay
      setTimeout(() => {
        setShowSuccess(false);
        resetForm();
        onSuccess();
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Error creating order:', error);
    } finally {
      setLoading(false);
  }
};

  const resetForm = () => {
    setStep(1);
    setCustomerName('');
    setDeliveryDate('');
    setDeliveryAddress('');
    setNotes('');
    setOrderItems([
      {
        product_id: null,
        product_name: '',
        product_type: '',
        gelato_type: '',
        quantity: 1,
        product_weight: 0,
        product_milkbase: 0,
        product_sugarbase: 0,
        product_notes: '',
        product_price: 0,
        product_cost: 0,
        product_ingredient: '',
        product_allergen: '',
        product_description: '',
        add_to_product_list: false,
        is_from_product_list: false,
        sticker_bbd_code: null,
        sticker_pbn_code: null,
        sticker_barcode: null,
        barcode_13digit: null,
        sticker_gpbn_code: null
      }
    ]);
    setShowProductPicker(null);
    setProductPickerSearch('');
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

 if (showSuccess) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
            <Check size={32} className="text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#5C2E1F' }}>Order Created Successfully!</h2>
        <p className="text-gray-600 mb-6">The online order has been added to the system.</p>
        <button
          onClick={() => {
            setShowSuccess(false);
            resetForm();
            onSuccess();
            onClose();
          }}
          className="px-16 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#FF5722' }}
        >
          OK
        </button>
      </div>
    </div>
  );
}

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="bg-white rounded-lg w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: '#5C2E1F' }}>
                Create Online Order
              </h2>
              <p className="text-gray-500 mt-1">
                {step === 1 && 'Enter customer details'}
                {step === 2 && 'Add products to the order'}
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
                <span className="text-sm font-medium">Customer</span>
              </div>
              <div className={`w-16 h-0.5 ${step >= 2 ? 'bg-orange-600' : 'bg-gray-300'}`}></div>
              <div className={`flex items-center gap-2 ${step >= 2 ? 'text-orange-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-orange-600 text-white' : 'bg-gray-300'}`}>
                  2
                </div>
                <span className="text-sm font-medium">Product Details</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div>
          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter customer full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  placeholder="Enter delivery address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  placeholder="Enter any additional notes"
                />
              </div>

              {/* Buttons for Step 1 */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={handleClose}
                  className="px-8 py-2 border border-gray-300 rounded font-medium hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleProceed}
                  disabled={loading}
                  className="px-8 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#FF5722' }}
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-700">Order Items</h3>
                <button
                  onClick={handleAddItem}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  disabled={loading}
                >
                  <Plus size={20} />
                  <span>Add More Item</span>
                </button>
              </div>

              
              {orderItems.map((item, index) => (
                <div key={index} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-700">Item {index + 1}</h4>
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
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Name <span className="text-red-500">*</span>
                        {item.is_from_product_list && (
                          <span className="ml-2 text-xs text-green-600 font-normal">(From Product List)</span>
                        )}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={item.product_name}
                            onChange={(e) => {
                              const updatedItems = [...orderItems];
                              updatedItems[index] = {
                                ...updatedItems[index],
                                product_name: e.target.value,
                                is_from_product_list: false,
                                product_list_id: undefined
                              };
                              setOrderItems(updatedItems);
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

                    <div>
                        <CustomDropdown
                        label="Product Type"
                        name="product_type"
                        value={item.product_type}
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
                        value={item.gelato_type}
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity <span className="text-red-500">*</span>
                        </label>
                        <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                        Weight (kg) <span className="text-red-500">*</span>
                        </label>
                        <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.product_weight}
                        onChange={(e) => handleItemChange(index, 'product_weight', parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="0.00"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price ($) <span className="text-red-500">*</span>
                        </label>
                        <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.product_price}
                        onChange={(e) => handleItemChange(index, 'product_price', parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="0.00"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cost ($)
                        </label>
                        <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.product_cost}
                        onChange={(e) => handleItemChange(index, 'product_cost', parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="0.00"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                        Milk Based
                        </label>
                        <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.product_milkbase}
                        onChange={(e) => handleItemChange(index, 'product_milkbase', parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="0.00"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sugar Based
                        </label>
                        <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.product_sugarbase}
                        onChange={(e) => handleItemChange(index, 'product_sugarbase', parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="0.00"
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ingredients
                        </label>
                        <textarea
                        value={item.product_ingredient}
                        onChange={(e) => handleItemChange(index, 'product_ingredient', e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                        placeholder="Enter product ingredients..."
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                        Allergen
                        </label>
                        <textarea
                        value={item.product_allergen}
                        onChange={(e) => handleItemChange(index, 'product_allergen', e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                        placeholder="Enter product allergens..."
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description <span className="text-gray-400 font-normal text-xs">(Shows in report instead of product name if provided)</span>
                        </label>
                        <textarea
                        value={item.product_description}
                        onChange={(e) => handleItemChange(index, 'product_description', e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                        placeholder="Enter description for report (optional - defaults to product name)..."
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes / Special Request
                        </label>
                        <textarea
                        value={item.product_notes}
                        onChange={(e) => handleItemChange(index, 'product_notes', e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                        placeholder="Enter any special requests..."
                        />
                    </div>
                    </div>

                    {/* Add to Product List Option */}
                    <div className="flex items-center gap-6 mt-3 pt-3 border-t border-gray-200">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.add_to_product_list}
                          onChange={(e) => handleItemChange(index, 'add_to_product_list', e.target.checked)}
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
              {/* Buttons for Step 2 */}
              <div className="flex justify-between gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-8 py-2 border border-gray-300 rounded font-medium hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
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

      {/* Product Editor Modal */}
        {showProductEditor && (
        <div 
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={() => setShowProductEditor(false)}
        >
            <div 
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
            >
            
                <div className="grid grid-cols-2 gap-4">
                <div>
                <CustomDropdown
                    label="Product Type"
                    name="product_type"
                    value={productFormData.product_type}
                    options={productTypeOptions}
                    onChange={(e) => setProductFormData({ ...productFormData, product_type: e.target.value })}
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
                    value={productFormData.gelato_type}
                    options={gelatoTypeOptions}
                    onChange={(e) => setProductFormData({ ...productFormData, gelato_type: e.target.value })}
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
                    <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                    Weight (kg) *
                    </label>
                    <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={productFormData.product_weight}
                    onChange={(e) => setProductFormData({ ...productFormData, product_weight: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                    Price ($) *
                    </label>
                    <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={productFormData.product_price}
                    onChange={(e) => setProductFormData({ ...productFormData, product_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                    Cost ($)
                    </label>
                    <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={productFormData.product_cost}
                    onChange={(e) => setProductFormData({ ...productFormData, product_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>
                </div>
            </div>
            </div>

        )}
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

        {/* Product Picker Modal */}
        {showProductPicker !== null && (
          <div
            className="fixed inset-0 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 9999 }}
          >
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col shadow-xl">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-bold" style={{ color: '#5C2E1F' }}>
                  Select Product from List
                </h3>
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
                {getFilteredProducts().length > 0 ? (
                  <div className="space-y-2">
                    {getFilteredProducts().map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleSelectProduct(showProductPicker, product)}
                        className="w-full px-4 py-3 text-left border border-gray-200 rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-gray-900">{product.product_name}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              {product.product_id} | {product.product_type || 'N/A'} | {product.product_gelato_type || 'N/A'}
                            </div>
                            {product.product_ingredient && (
                              <div className="text-xs text-gray-400 mt-1">
                                Ingredients: {product.product_ingredient.substring(0, 50)}{product.product_ingredient.length > 50 ? '...' : ''}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-orange-600">${product.product_price.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">{product.product_weight} kg</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {products.length === 0 ? 'No products available in the product list.' : 'No products match your search.'}
                  </div>
                )}
              </div>

              <div className="p-4 border-t bg-gray-50">
                <button
                  type="button"
                  onClick={() => {
                    setShowProductPicker(null);
                    setProductPickerSearch('');
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}