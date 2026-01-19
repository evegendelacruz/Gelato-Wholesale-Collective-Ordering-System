'use client';
import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, ArrowLeft, Check } from 'lucide-react';
import supabase from '@/lib/client';

interface OrderItem {
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
    

    useEffect(() => {
    const loadOptions = async () => {
        try {
        const { data: productTypes, error: productTypeError } = await supabase
            .from('order_dropdown_options')  // Changed from 'dropdown_options'
            .select('option_value')
            .eq('option_type', 'product_type');

        const { data: gelatoTypes, error: gelatoTypeError } = await supabase
            .from('order_dropdown_options')  // Changed from 'dropdown_options'
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

  
  // Step 1: Order Details
  const [customerName, setCustomerName] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  
  // Step 2: Order Items
 const [orderItems, setOrderItems] = useState<OrderItem[]>([
  {
    product_name: '',
    product_type: '',
    gelato_type: '',
    quantity: 1,
    product_weight: 0,
    product_milkbase: 0,  
    product_sugarbase: 0,
    product_notes: '',
    product_price: 0,
    product_cost: 0
  }
]);

  const handleAddItem = () => {
  setOrderItems([
    ...orderItems,
    {
      product_name: '',
      product_type: '',
      gelato_type: '',
      quantity: 1,
      product_weight: 0,
      product_milkbase: 0,  
      product_sugarbase: 0,  
      product_notes: '',
      product_price: 0,
      product_cost: 0
    }
  ]);
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

  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
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

  const handleSubmit = async () => {
  if (!validateStep2()) return;

  try {
    setLoading(true);

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

    // Insert order items - database will auto-generate id and product_id
    const itemsToInsert = orderItems.map(item => ({
      order_id: orderData.id,
      product_name: item.product_name.trim(),
      product_type: item.product_type,
      quantity: item.quantity,
      gelato_type: item.gelato_type,
      product_weight: item.product_weight,
      calculated_weight: parseFloat((item.product_weight * item.quantity).toFixed(2)),
      product_milkbase: item.product_milkbase,
      product_sugarbase: item.product_sugarbase,
      product_notes: item.product_notes.trim() || null,
      product_price: item.product_price,
      product_cost: item.product_cost
    }));

    const { error: itemsError } = await supabase
      .from('customer_order_item')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('Items insert error details:', {
        error: itemsError,
        message: itemsError.message,
        details: itemsError.details,
        hint: itemsError.hint,
        code: itemsError.code
      });
      alert(`Failed to create order items: ${itemsError.message || 'Unknown error'}`);
      throw itemsError;
    }

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
        product_name: '',
        product_type: '',
        gelato_type: '',
        quantity: 1,
        product_weight: 0,
        product_milkbase: 0,
        product_sugarbase: 0,
        product_notes: '',
        product_price: 0,
        product_cost: 0
        }
    ]);
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
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-4">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="text-gray-600 hover:text-gray-900"
                disabled={loading}
              >
                <ArrowLeft size={24} />
              </button>
            )}
            <h2 className="text-2xl font-bold" style={{ color: '#5C2E1F' }}>
              {step === 1 ? 'Create Online Order - Order Details' : 'Create Online Order - Order Items'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center px-6 py-4 bg-gray-50">
          <div className="flex items-center flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-orange-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
              1
            </div>
            <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-orange-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
              2
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
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
                        </label>
                        <input
                        type="text"
                        value={item.product_name}
                        onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Enter product name"
                        />
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
                        Cost ($) <span className="text-red-500">*</span>
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
                    </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 p-6 border-t">
          <button
            onClick={handleClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          
          {step === 1 ? (
            <button
              onClick={handleProceed}
              className="px-6 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#FF5722' }}
              disabled={loading}
            >
              Proceed to Items
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-6 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#FF5722' }}
              disabled={loading}
            >
              {loading ? 'Creating Order...' : 'Create Order'}
            </button>
          )}
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
                    Cost ($) *
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
      </div>
    </div>
  );
}