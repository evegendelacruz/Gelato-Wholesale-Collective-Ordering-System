'use client';

import { useState } from 'react';
import Image from 'next/image';
import supabase from '@/lib/client';

interface ProductViewProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: number;
    custom_price: number;
    product_list: {
      id: number;
      product_id: string;
      product_name: string;
      product_type: string;
      product_gelato_type: string;
      product_price: number;
      product_image: string | null;
      product_ingredient?: string | null;
      product_allergen?: string | null;
    };
  };
}

const packagingOptions = [
  { value: 'tub_500ml', label: '500ml Tub' },
  { value: 'tub_1l', label: '1L Tub' },
  { value: 'pint', label: 'Pint' },
  { value: 'bulk_3l', label: '3L Bulk' },
  { value: 'bulk_5l', label: '5L Bulk' },
];

export default function ProductView({ isOpen, onClose, product }: ProductViewProps) {
  const [quantity, setQuantity] = useState(1);
  const [packaging, setPackaging] = useState(packagingOptions[0].value);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });

  if (!isOpen) return null;

  const getImageUrl = (imagePath: string | null): string => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    return `https://boxzapgxostpqutxabzs.supabase.co/storage/v1/object/public/gwc_files/${imagePath}`;
  };

  const handleAddToBasket = async () => {
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Not authenticated. Please log in.');
      }

      const subtotal = product.custom_price * quantity;

      // Check if item with same product and packaging already exists in basket
      const { data: existingItem, error: checkError } = await supabase
        .from('client_basket')
        .select('*')
        .eq('client_auth_id', user.id)
        .eq('product_id', product.product_list.id)
        .eq('packaging_type', packaging)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingItem) {
        // Update existing basket item
        const newQuantity = existingItem.quantity + quantity;
        const newSubtotal = product.custom_price * newQuantity;
        
        const { error: updateError } = await supabase
          .from('client_basket')
          .update({
            quantity: newQuantity,
            subtotal: newSubtotal,
            notes: notes || existingItem.notes
          })
          .eq('id', existingItem.id);

        if (updateError) throw updateError;
      } else {
        // Insert new basket item
        const { error: insertError } = await supabase
          .from('client_basket')
          .insert({
            client_auth_id: user.id,
            product_id: product.product_list.id,
            product_name: product.product_list.product_name,
            quantity: quantity,
            unit_price: product.custom_price,
            packaging_type: packaging,
            subtotal: subtotal,
            notes: notes || null
          });

        if (insertError) throw insertError;
      }

      setMessage({ type: 'success', text: 'Added to basket successfully!' });
      
      // Reset form and close after a delay
      setTimeout(() => {
        setQuantity(1);
        setPackaging(packagingOptions[0].value);
        setNotes('');
        setMessage({ type: '', text: '' });
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Error adding to basket:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to add to basket. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => prev > 1 ? prev - 1 : 1);

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold" style={{ color: '#7d3c3c' }}>
            Product Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Message Display */}
        {message.text && (
          <div style={{
            margin: '16px 24px 0',
            padding: '12px 20px',
            borderRadius: '8px',
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            {message.text}
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Image Section with Ingredients & Allergens */}
            <div className="space-y-4">
              {/* Product Image */}
              <div className="aspect-square bg-white rounded-lg overflow-hidden border border-gray-200">
                {product.product_list.product_image ? (
                  <Image 
                    src={getImageUrl(product.product_list.product_image)} 
                    alt={product.product_list.product_name}
                    width={500}
                    height={500}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400"><span>No Image Available</span></div>';
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                    <span>No Image Available</span>
                  </div>
                )}
              </div>

              {/* Ingredients Section */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-bold text-gray-700 mb-2">Ingredients:</h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {product.product_list.product_ingredient || 'No ingredient information available'}
                </p>
              </div>

              {/* Allergen Section */}
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <h4 className="text-sm font-bold text-amber-900 mb-2">⚠️ Allergen Information:</h4>
                <p className="text-sm text-amber-800 leading-relaxed">
                  {product.product_list.product_allergen || 'No allergen information available'}
                </p>
              </div>
            </div>

            {/* Details Section */}
            <div className="flex flex-col">
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2" style={{ color: '#7d3c3c' }}>
                  {product.product_list.product_name}
                </h3>
                
                <p className="text-3xl font-bold mb-4" style={{ color: '#e84e1b' }}>
                  S$ {product.custom_price.toFixed(2)}
                </p>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center">
                    <span className="text-sm font-semibold text-gray-600 w-32">Product Type:</span>
                    <span className="text-sm text-gray-800">
                      {product.product_list.product_gelato_type || product.product_list.product_type}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-semibold text-gray-600 w-32">Product ID:</span>
                    <span className="text-sm text-gray-800">
                      {product.product_list.product_id}
                    </span>
                  </div>
                </div>

                {/* Packaging Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Packaging Type
                  </label>
                  <select
                    value={packaging}
                    onChange={(e) => setPackaging(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {packagingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Quantity
                  </label>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={decrementQuantity}
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 text-xl font-semibold"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-center px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      min="1"
                    />
                    <button
                      onClick={incrementQuantity}
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 text-xl font-semibold"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Notes */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special instructions or notes..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    rows={3}
                  />
                </div>

                {/* Total Price */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">Total:</span>
                    <span className="text-2xl font-bold" style={{ color: '#e84e1b' }}>
                      S$ {(product.custom_price * quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Add to Basket Button */}
              <button
                onClick={handleAddToBasket}
                disabled={loading}
                className="w-full py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#e84e1b' }}
              >
                {loading ? 'Adding to Basket...' : 'Add to Basket'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}