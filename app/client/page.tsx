'use client';

import { useState, useEffect } from 'react';
import ClientHeader from '@/app/components/clientHeader/page';
import supabase from '@/lib/client';
import Image from 'next/image';
import ProductView from '../components/productView/page';

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

function ProductCard({ product }: { product: ClientProduct }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Helper function to get full image URL from Supabase storage
  const getImageUrl = (imagePath: string | null): string => {
    if (!imagePath) return ''; 
    
    // If it's already a full URL, return it
    if (imagePath.startsWith('http')) return imagePath;

    return `https://boxzapgxostpqutxabzs.supabase.co/storage/v1/object/public/gwc_files/${imagePath}`;
  };

  return (
    <>
      <div 
        className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => setIsModalOpen(true)}
      >
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
          <p className="text-xs text-gray-500 mb-3">
            ID: {product.product_list.product_id}
          </p>
        </div>
        
        <button 
          className="w-full py-2 rounded text-white text-sm font-medium hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#e84e1b' }}
          onClick={(e) => {
            e.stopPropagation();
            setIsModalOpen(true);
          }}
        >
          Add to order
        </button>
      </div>

      <ProductView 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={product}
      />
    </>
  );
}

export default function ClientPage() {
  const [products, setProducts] = useState<ClientProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message>({ type: '', text: '' });

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
              <ProductCard key={product.id} product={product} />
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
    </div>
  );
}