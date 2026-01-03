'use client';

import { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import supabase from '@/lib/client';

interface OrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: OrderFormData) => void;
  totalAmount: number;
  loading: boolean;
}

export interface OrderFormData {
  orderDate: string;
  clientName: string;
  companyName: string;
  deliveryAddress: string;
}

export default function OrderForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  totalAmount,
  loading 
}: OrderFormProps) {
  const [formData, setFormData] = useState<OrderFormData>({
    orderDate: '',
    clientName: '',
    companyName: '',
    deliveryAddress: ''
  });
  const [disabledDates, setDisabledDates] = useState<string[]>([]);
  const [loadingUserData, setLoadingUserData] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadUserData();
      loadLastOrderDate();
    }
  }, [isOpen]);

  const loadUserData = async () => {
  try {
    setLoadingUserData(true);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    const { data: clientData, error: clientError } = await supabase
      .from('client_user')
      .select('client_person_incharge, client_businessName, client_delivery_address')
      .eq('client_auth_id', user.id)
      .single();

    if (clientError) throw clientError;

    setFormData(prev => ({
      ...prev,
      clientName: clientData?.client_person_incharge || '',
      companyName: clientData?.client_businessName || '',
      deliveryAddress: clientData?.client_delivery_address || ''
    }));
  } catch (error) {
    console.error('Error loading user data:', error);
  } finally {
    setLoadingUserData(false);
  }
};

  const loadLastOrderDate = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) return;

      const { data: orders, error: orderError } = await supabase
        .from('client_order')
        .select('created_at')
        .eq('client_auth_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (orderError) throw orderError;

      if (orders && orders.length > 0) {
        const lastOrderDate = new Date(orders[0].created_at);
        const nextDay = new Date(lastOrderDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        // Format as YYYY-MM-DD for input comparison
        const nextDayStr = nextDay.toISOString().split('T')[0];
        setDisabledDates([nextDayStr]);
      }
    } catch (error) {
      console.error('Error loading last order date:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const isDateDisabled = (dateString: string): boolean => {
    return disabledDates.includes(dateString);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.orderDate) {
      alert('Please select an order date');
      return;
    }

    if (isDateDisabled(formData.orderDate)) {
      alert('This date is not available. Please select a different date.');
      return;
    }

    onSubmit(formData);
  };

  const getMinDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#e5e7eb' }}>
          <h2 className="text-2xl font-bold" style={{ color: '#7d3c3c' }}>
            Place Order Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {loadingUserData ? (
            <div className="text-center py-8 text-gray-600">
              Loading your information...
            </div>
          ) : (
            <div className="space-y-5">
              {/* Order Date */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#7d3c3c' }}>
                  Order Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                    size={20} 
                  />
                  <input
                    type="date"
                    name="orderDate"
                    value={formData.orderDate}
                    onChange={handleInputChange}
                    min={getMinDate()}
                    required
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    disabled={loading}
                  />
                </div>
                {disabledDates.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Note: Orders must be at least 1 day apart. Next available date is after {disabledDates[0]}.
                  </p>
                )}
                {formData.orderDate && isDateDisabled(formData.orderDate) && (
                  <p className="text-xs text-red-500 mt-1">
                    This date is not available. Please select a different date.
                  </p>
                )}
              </div>

              {/* Client Name */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#7d3c3c' }}>
                  Client Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter client name"
                  disabled={loading}
                />
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#7d3c3c' }}>
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter company name"
                  disabled={loading}
                />
              </div>

              {/* Delivery Address */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#7d3c3c' }}>
                  Preferred Delivery Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="deliveryAddress"
                  value={formData.deliveryAddress}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  placeholder="Enter delivery address"
                  disabled={loading}
                />
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-bold mb-2" style={{ color: '#7d3c3c' }}>
                  Order Summary
                </h3>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Amount (incl. GST)</span>
                  <span className="text-lg font-bold" style={{ color: '#e84e1b' }}>
                    S$ {totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || loadingUserData || (formData.orderDate && isDateDisabled(formData.orderDate))}
              className="flex-1 px-4 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#e84e1b' }}
            >
              {loading ? 'Processing...' : 'Confirm Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}