'use client';

import { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import supabase from '@/lib/client';
import LoadingSpinner from '../loader/page';

interface OrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: OrderFormData) => void;
  totalAmount: number;
  loading: boolean;
}

export interface OrderFormData {
  deliveryDate: string;
  clientName: string;
  companyName: string;
  streetName: string;
  country: string;
  postalCode: string;
  additionalNotes: string;
  saveAsPreferred: boolean;
}

export default function OrderForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  totalAmount,
  loading 
}: OrderFormProps) {
  const [formData, setFormData] = useState<OrderFormData>({
    deliveryDate: '',
    clientName: '',
    companyName: '',
    streetName: '',
    country: 'Singapore',
    postalCode: '',
    additionalNotes: '',
    saveAsPreferred: false
  });

  const [loadingUserData, setLoadingUserData] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadUserData();
    }
  }, [isOpen]);

  const loadUserData = async () => {
  try {
    setLoadingUserData(true);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    // First try to fetch with preferred_address, if it fails, try without it
    let clientData;
    let clientError;

    // Try fetching with client_preferred_address
    const result = await supabase
      .from('client_user')
      .select('client_person_incharge, client_businessName, client_delivery_address, client_preferred_address')
      .eq('client_auth_id', user.id)
      .single();

    // If the column doesn't exist, try without it
    if (result.error && result.error.message.includes('column')) {
      const fallbackResult = await supabase
        .from('client_user')
        .select('client_person_incharge, client_businessName, client_delivery_address')
        .eq('client_auth_id', user.id)
        .single();
      
      clientData = fallbackResult.data;
      clientError = fallbackResult.error;
    } else {
      clientData = result.data;
      clientError = result.error;
    }

    if (clientError) {
      console.error('Client data fetch error:', clientError);
      throw clientError;
    }

    // Parse address - prioritize preferred_address if it exists, otherwise use delivery_address
    let streetName = '';
    let country = 'Singapore';
    let postalCode = '';

    // Check if client_preferred_address exists and use it, otherwise use client_delivery_address
    const addressToUse = clientData?.client_preferred_address || clientData?.client_delivery_address;

    if (addressToUse) {
      // Format: "Street Name, Country, Postal Code"
      const parts = addressToUse.split(',').map((p: string) => p.trim());
      if (parts.length >= 3) {
        streetName = parts[0];
        country = parts[1];
        postalCode = parts[2];
      } else if (parts.length === 2) {
        streetName = parts[0];
        country = parts[1];
      } else if (parts.length === 1) {
        // If it's just a single address string, put it in streetName
        streetName = parts[0];
      }
    }

    setFormData(prev => ({
      ...prev,
      clientName: clientData?.client_person_incharge || '',
      companyName: clientData?.client_businessName || '',
      streetName: streetName,
      country: country,
      postalCode: postalCode
    }));
  } catch (error) {
    console.error('Error loading user data:', error);
    // Set default values even if there's an error
    setFormData(prev => ({
      ...prev,
      country: 'Singapore'
    }));
  } finally {
    setLoadingUserData(false);
  }
};

  

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      saveAsPreferred: e.target.checked
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.deliveryDate) {
      alert('Please select a delivery date');
      return;
    }

    onSubmit(formData);
  };

  const getMinDate = () => {
    return new Date().toISOString().split('T')[0];
  };

if (!isOpen) return null;

  return (
    <>
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
              {/* Delivery Date */}
              <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#7d3c3c' }}>
                Delivery Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                  size={20} 
                />
                <input
                  type="date"
                  name="deliveryDate"
                  value={formData.deliveryDate}
                  onChange={handleInputChange}
                  min={getMinDate()}
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  disabled={loading}
                  onClick={(e) => {
                    const input = e.target as HTMLInputElement;
                    input.showPicker?.();
                  }}
                />
              </div>
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
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter Business/R.O.C. Name"
                  disabled={loading}
                />
              </div>

              {/* Preferred Delivery Address Section */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#7d3c3c' }}>
                  Preferred Delivery Address <span className="text-red-500">*</span>
                </label>
                
                {/* Block/Home Number/Street Name */}
                <div className="mb-3">
                  <input
                    type="text"
                    name="streetName"
                    value={formData.streetName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Block/Home Number/Street Name"
                    disabled={loading}
                  />
                </div>

                {/* Country and Postal Code in Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Country */}
                  <div>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Country"
                      disabled={loading}
                    />
                  </div>

                  {/* Postal Code */}
                  <div>
                    <input
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Postal Code"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Save as Preferred Address Checkbox */}
                <div className="mt-3 flex items-center">
                  <input
                    type="checkbox"
                    id="saveAsPreferred"
                    checked={formData.saveAsPreferred}
                    onChange={handleCheckboxChange}
                    disabled={loading}
                    className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500 cursor-pointer"
                  />
                  <label 
                    htmlFor="saveAsPreferred" 
                    className="ml-2 text-sm text-gray-700 cursor-pointer"
                  >
                    Save as preferred address for future orders
                  </label>
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#7d3c3c' }}>
                  Additional Notes <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                </label>
                <textarea
                  name="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  placeholder="Enter any special instructions or notes for this order"
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
              disabled={
                loading || 
                loadingUserData || 
                !formData.deliveryDate.trim() ||
                !formData.clientName.trim() ||
                !formData.companyName.trim() ||
                !formData.streetName.trim() ||
                !formData.country.trim() ||
                !formData.postalCode.trim() 
              }
              className="flex-1 px-4 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#e84e1b' }}
            >
              {loading ? 'Processing...' : 'Confirm Order'}
            </button>
          </div>
        </form>
       </div>
    </div>
    {/* Loading Spinner - outside modal */}
    {loading && (
      <LoadingSpinner 
        duration={3000}
        onComplete={() => {}}
      />
    )}
  </>
);
}