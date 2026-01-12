'use client';

import { useState, useEffect } from 'react';
import ClientHeader from '@/app/components/clientHeader/page';
import supabase from '@/lib/client';
import Image from 'next/image';
import LoadingSpinner from '../components/loader/page';

interface ClientProduct {
  id: number;
  client_auth_id: string;
  product_id: number;
  custom_price: number;
  is_available: boolean;
  created_at: string;
  product_list: {
    id: number;
    product_id: string;
    product_name: string;
    product_type: string;
    product_gelato_type: string;
    product_price: number;
    product_image: string | null;
    product_ingredient: string | null;
    product_allergen: string | null;
    
  };
}

interface Message {
  type: 'success' | 'error' | '';
  text: string;
}

function ProductCard({ product, onBasketAdded }: { product: ClientProduct; onBasketAdded: (productName: string) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [quantity, setQuantity] = useState(0);
  const getImageUrl = (imagePath: string | null): string => {
    if (!imagePath) return ''; 
    
    // If it's already a full URL, return it
    if (imagePath.startsWith('http')) return imagePath;

    return `https://boxzapgxostpqutxabzs.supabase.co/storage/v1/object/public/gwc_files/${imagePath}`;
  };

  const handleAddToBasket = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      setIsAdding(true);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Not authenticated. Please log in.');
      }

      const subtotal = product.custom_price * quantity;

      const { data: existingItem, error: checkError } = await supabase
        .from('client_basket')
        .select('*')
        .eq('client_auth_id', user.id)
        .eq('product_id', product.product_list.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        const newSubtotal = product.custom_price * newQuantity;
        
        const { error: updateError } = await supabase
          .from('client_basket')
          .update({
            quantity: newQuantity,
            subtotal: newSubtotal,
          })
          .eq('id', existingItem.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('client_basket')
          .insert({
            client_auth_id: user.id,
            product_id: product.product_list.id,
            product_name: product.product_list.product_name,
            quantity: quantity,
            unit_price: product.custom_price,
            subtotal: subtotal,
          });

        if (insertError) throw insertError;
      }

      onBasketAdded(product.product_list.product_name);
      setQuantity(0); // Reset quantity after adding

    } catch (error) {
      console.error('Error adding to basket:', error);
      alert('Failed to add to basket. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => prev > 1 ? prev - 1 : 1);

  return (
    <>
      {/* Mobile View - Landscape Rectangle */}
      <div className="sm:hidden bg-white rounded-lg border border-gray-200 p-3 flex gap-3 hover:shadow-lg transition-shadow">
        {/* Product Image - Hidden on very small screens */}
        <div className="w-20 h-20 shrink-0 bg-white rounded-lg overflow-hidden border border-gray-100 hidden xs:block min-[360px]:block">
          {product.product_list.product_image ? (
            <Image 
              src={getImageUrl(product.product_list.product_image)} 
              alt={product.product_list.product_name}
              width={80}
              height={80}
              loading="eager"
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = '<div class="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400"><span class="text-xs">No Image</span></div>';
                }
              }}
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
              <span className="text-xs">No Image</span>
            </div>
          )}
        </div>
        
        {/* Product Details */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div>
            <h3 className="text-sm font-semibold mb-1" style={{ color: '#7d3c3c' }}>
              {product.product_list.product_name}
            </h3>
            <p className="text-xs text-gray-600 mb-1 line-clamp-1">
              {product.product_list.product_gelato_type || product.product_list.product_type}
            </p>
            <p className="text-sm font-semibold mb-2" style={{ color: '#e84e1b' }}>
              S$ {product.custom_price.toFixed(2)}
            </p>
          </div>
          
          {/* Quantity Controls - Responsive sizing */}
          <div className="flex items-center gap-1.5 min-[360px]:gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                decrementQuantity();
              }}
              className="w-6 h-6 min-[360px]:w-7 min-[360px]:h-7 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50 text-base min-[360px]:text-lg font-semibold"
            >
              −
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              onClick={(e) => e.stopPropagation()}
              className="w-10 min-[360px]:w-12 text-center px-1 min-[360px]:px-2 py-1 border border-gray-300 rounded text-xs min-[360px]:text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
              min="1"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                incrementQuantity();
              }}
              className="w-6 h-6 min-[360px]:w-7 min-[360px]:h-7 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50 text-base min-[360px]:text-lg font-semibold"
            >
              +
            </button>
          </div>
        </div>

         {/* Add to Order Button - Responsive sizing */}
          <div className="flex items-center">
            <button 
              className="px-2 min-[360px]:px-3 py-2 rounded text-white text-[10px] min-[360px]:text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
              style={{ backgroundColor: '#e84e1b' }}
              onClick={handleAddToBasket}
              disabled={isAdding || quantity === 0}
            >
              {isAdding ? 'Adding...' : 'Add to order'}
            </button>
          </div>
        </div>

      {/* Desktop View - Square Card */}
      <div className="hidden sm:flex sm:flex-col bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow">
        <div className="aspect-square bg-white rounded-lg mb-3 overflow-hidden border border-gray-100">
          {product.product_list.product_image ? (
            <Image 
              src={getImageUrl(product.product_list.product_image)} 
              alt={product.product_list.product_name}
              width={300}
              height={300}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = '<div class="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400"><span class="text-xs">No Image</span></div>';
                }
              }}
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
              <span className="text-xs">No Image</span>
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <p className="text-sm font-semibold mb-1" style={{ color: '#e84e1b' }}>
            S$ {product.custom_price.toFixed(2)}
          </p>
          <h3 className="text-sm font-semibold mb-1" style={{ color: '#7d3c3c' }}>
            {product.product_list.product_name}
          </h3>
          <p className="text-xs text-gray-600 mb-1">
            {product.product_list.product_gelato_type || product.product_list.product_type}
          </p>
          
          {/* Quantity Controls */}
          <div className="flex items-center gap-3 mb-3 mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                decrementQuantity();
              }}
              className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50 text-lg font-semibold"
            >
              −
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              onClick={(e) => e.stopPropagation()}
              className="w-16 text-center px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
              min="1"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                incrementQuantity();
              }}
              className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50 text-lg font-semibold"
            >
              +
            </button>
          </div>
        </div>
        
        <button 
          className="w-full py-2 rounded text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ backgroundColor: '#e84e1b' }}
          onClick={handleAddToBasket}
          disabled={isAdding || quantity === 0}
        >
          {isAdding ? 'Adding...' : 'Add to order'}
        </button>
      </div>
    </>
  );
}

function ConfirmationModal({ isOpen, onClose, productName }: { isOpen: boolean; onClose: () => void; productName: string }) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4" style={{ backgroundColor: '#d4edda' }}>
            <svg className="h-6 w-6" style={{ color: '#155724' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h3 className="text-lg font-bold mb-2" style={{ color: '#7d3c3c' }}>
            Added to Basket!
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {productName} has been added to your basket.
          </p>
          
          <button
            onClick={onClose}
            className="w-full py-2 px-4 rounded text-white font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#e84e1b' }}
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}


export default function ClientPage() {
  const [products, setProducts] = useState<ClientProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message>({ type: '', text: '' });
  const [isProcessing, setIsProcessing] = useState(false); // Add this state
  const [showConfirmation, setShowConfirmation] = useState(false); // Add this state
  const [addedProductName, setAddedProductName] = useState(''); 

  useEffect(() => {
    fetchClientProducts();
  }, []);

  const fetchClientProducts = async () => {
    try {
      setLoading(true);
      
      // Get the current logged-in user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Not authenticated. Please log in.');
      }

      // Fetch products assigned to this client with their details
      const { data, error } = await supabase
        .from('client_product')
        .select(`
          *,
          product_list (
            id,
            product_id,
            product_name,
            product_type,
            product_gelato_type,
            product_price,
            product_image,
            product_ingredient,
            product_allergen
          )
        `)
        .eq('client_auth_id', user.id)
        .eq('is_available', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setProducts(data || []);
      
      if (!data || data.length === 0) {
        setMessage({ 
          type: 'error', 
          text: 'No products assigned to your account yet. Please contact your administrator.' 
        });
      }

    } catch (error) {
      console.error('Error fetching client products:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to load products. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

   const handleBasketAdded = (productName: string) => {
    setIsProcessing(true);
    
    // Show loader for 3 seconds
    setTimeout(() => {
      setIsProcessing(false);
      setAddedProductName(productName);
      setShowConfirmation(true);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: '"Roboto Condensed"', backgroundColor: '#f5e6d3' }}>
      <ClientHeader />
      
      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full">
        {/* Message Display */}
        {message.text && (
          <div style={{
            marginBottom: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            {message.text}
          </div>
        )}

        <h2 
          className="text-2xl font-bold mb-6"
          style={{ 
            color: '#7d3c3c',
            fontFamily: "'Roboto Condensed', sans-serif"
          }}
        >
          Product List
        </h2>
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-gray-600">Loading products...</div>
          </div>
        ) : products.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <p className="text-gray-600 mb-2">No products available</p>
              <p className="text-sm text-gray-500">
                Contact your administrator to get products assigned to your account
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onBasketAdded={handleBasketAdded} />
          ))}
        </div>
        )}
      </main>
      
      <footer 
        className="mt-auto py-4 px-6 text-white text-sm"
        style={{ backgroundColor: '#7d3c3c' }}
      >
        <div className="max-w-7xl mx-auto">
          Gelato Wholesale Collective | © 2025 All Rights Reserved
        </div>
      </footer>
    {/* Loading Spinner */}
      {isProcessing && (
        <LoadingSpinner 
          duration={500}
          onComplete={() => {}}
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal 
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        productName={addedProductName}
      />
    </div>
  );
}