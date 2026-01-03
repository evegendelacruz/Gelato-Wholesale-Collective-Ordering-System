'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ClientHeader from '@/app/components/clientHeader/page';
import OrderForm from '@/app/components/orderForm/page';
import supabase from '@/lib/client';
import Image from 'next/image';

interface BasketItem {
  id: number;
  client_auth_id: string;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  packaging_type: string;
  notes: string | null;
  subtotal: number;
  created_at: string;
  product_list: {
    product_image: string | null;
    product_type: string;
    product_gelato_type: string;
  };
}

interface OrderFormData {
  clientName: string;
  companyName: string;
  deliveryAddress: string;
  orderDate: string;
}

interface Message {
  type: 'success' | 'error' | '';
  text: string;
}

function BasketItemCard({ 
  item, 
  onUpdateQuantity, 
  onRemove 
}: { 
  item: BasketItem; 
  onUpdateQuantity: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
}) {
  const getImageUrl = (imagePath: string | null): string => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    return `https://boxzapgxostpqutxabzs.supabase.co/storage/v1/object/public/gwc_files/${imagePath}`;
  };

  const formatPackaging = (packaging: string): string => {
    return packaging
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex gap-4" >
      <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0">
        {item.product_list.product_image ? (
          <Image 
            src={getImageUrl(item.product_list.product_image)} 
            alt={item.product_name}
            width={80}
            height={80}
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
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-xs">No Image</span>
          </div>
        )}
      </div>
      
      <div className="flex-1">
        <h3 className="text-sm font-semibold mb-1" style={{ color: '#7d3c3c' }}>
          {item.product_name}
        </h3>
        <p className="text-xs text-gray-600 mb-1">
          {item.product_list.product_gelato_type || item.product_list.product_type}
        </p>
        <p className="text-xs text-gray-500 mb-2">
          {formatPackaging(item.packaging_type)}
        </p>
        {item.notes && (
          <p className="text-xs text-gray-500 italic mb-2">Note: {item.notes}</p>
        )}
        <p className="text-sm font-semibold" style={{ color: '#e84e1b' }}>
          S$ {item.unit_price.toFixed(2)} each
        </p>
      </div>
      
      <div className="flex flex-col justify-between items-end">
        <button
          onClick={() => onRemove(item.id)}
          className="text-gray-400 hover:text-red-500 text-sm"
        >
          ✕
        </button>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
            className="w-7 h-7 rounded border border-gray-300 hover:bg-gray-100 flex items-center justify-center"
          >
            −
          </button>
          <span className="w-8 text-center font-medium">{item.quantity}</span>
          <button
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            className="w-7 h-7 rounded border border-gray-300 hover:bg-gray-100 flex items-center justify-center"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BasketPage() {
  const router = useRouter();
  const [basketItems, setBasketItems] = useState<BasketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message>({ type: '', text: '' });
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [processingOrder, setProcessingOrder] = useState(false);

  useEffect(() => {
    fetchBasketItems();
  }, []);

  const fetchBasketItems = async () => {
    try {
      setLoading(true);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Not authenticated. Please log in.');
      }

      const { data, error } = await supabase
        .from('client_basket')
        .select(`
          *,
          product_list (
            product_image,
            product_type,
            product_gelato_type
          )
        `)
        .eq('client_auth_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBasketItems(data || []);

    } catch (error) {
      console.error('Error fetching basket items:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to load basket items.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (id: number, quantity: number) => {
    try {
      const item = basketItems.find(i => i.id === id);
      if (!item) return;

      const newSubtotal = item.unit_price * quantity;

      const { error } = await supabase
        .from('client_basket')
        .update({ 
          quantity, 
          subtotal: newSubtotal 
        })
        .eq('id', id);

      if (error) throw error;

      setBasketItems(items =>
        items.map(item => 
          item.id === id 
            ? { ...item, quantity, subtotal: newSubtotal } 
            : item
        )
      );

    } catch (error) {
      console.error('Error updating quantity:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to update quantity. Please try again.' 
      });
    }
  };

  const removeItem = async (id: number) => {
    try {
      const { error } = await supabase
        .from('client_basket')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBasketItems(items => items.filter(item => item.id !== id));
      setMessage({ 
        type: 'success', 
        text: 'Item removed from basket.' 
      });
      
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);

    } catch (error) {
      console.error('Error removing item:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to remove item. Please try again.' 
      });
    }
  };

  const handlePlaceOrderClick = () => {
    if (basketItems.length === 0) return;
    setIsOrderFormOpen(true);
  };

  const handleOrderFormSubmit = async (formData: OrderFormData) => {
  try {
    setProcessingOrder(true);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Not authenticated. Please log in.');
    }

    const totalAmount = basketItems.reduce((sum, item) => sum + item.subtotal, 0);
    const gst = totalAmount * 0.09;
    const finalTotal = totalAmount + gst;

    // Generate order ID
    const { data: orderIdData, error: orderIdError } = await supabase
      .rpc('generate_order_id');

    if (orderIdError) throw orderIdError;

    // Create the order with form data
    const { data: orderData, error: orderError } = await supabase
      .from('client_order')
      .insert({
        order_id: orderIdData,
        client_auth_id: user.id,
        order_date: new Date(formData.orderDate).toISOString(),
        delivery_address: formData.deliveryAddress,
        total_amount: finalTotal,
        status: 'Pending',
        notes: `Client: ${formData.clientName}, Company: ${formData.companyName}`
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items from basket
    const orderItems = basketItems.map(item => ({
      order_id: orderData.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      packaging_type: item.packaging_type,
      subtotal: item.subtotal
    }));

    const { error: itemsError } = await supabase
      .from('client_order_item')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // Clear the basket
    const { error: clearError } = await supabase
      .from('client_basket')
      .delete()
      .eq('client_auth_id', user.id);

    if (clearError) throw clearError;

    setMessage({ 
      type: 'success', 
      text: `Order ${orderIdData} created successfully!` 
    });

    setIsOrderFormOpen(false);
    
    setTimeout(() => {
      router.push('/client');
    }, 2000);

  } catch (error) {
    console.error('Error creating order:', error);
    setMessage({ 
      type: 'error', 
      text: error instanceof Error ? error.message : 'Failed to create order. Please try again.' 
    });
  } finally {
    setProcessingOrder(false);
  }
};

  const subtotal = basketItems.reduce((sum, item) => sum + item.subtotal, 0);
  const gst = subtotal * 0.09;
  const total = subtotal + gst;

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: '"Roboto Condensed"', backgroundColor: '#f5e6d3' }}>
      <ClientHeader />
      
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
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
          style={{ color: '#7d3c3c' }}
        >
          Your Basket
        </h2>
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-gray-600">Loading basket...</div>
          </div>
        ) : basketItems.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500 mb-4">Your basket is empty</p>
            <button
              onClick={() => router.push('/client')}
              className="px-6 py-2 rounded text-white font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#e84e1b' }}
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {basketItems.map((item) => (
                <BasketItemCard 
                  key={item.id} 
                  item={item}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeItem}
                />
              ))}
            </div>
            
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: '#7d3c3c' }}>
                  Basket Summary
                </h3>
                
                <div className="space-y-3 mb-4">
                  {/* Product breakdown */}
                  {basketItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm pb-2 border-b border-gray-100">
                      <span className="text-gray-600">
                        {item.product_name} x{item.quantity}
                      </span>
                      <span className="font-medium">S$ {item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                  
                  {/* Subtotal */}
                  <div className="flex justify-between text-sm pt-2">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">S$ {subtotal.toFixed(2)}</span>
                  </div>
                  
                  {/* GST */}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">GST (9%)</span>
                    <span className="font-medium">S$ {gst.toFixed(2)}</span>
                  </div>
                  
                  {/* Total */}
                  <div className="border-t pt-3 flex justify-between">
                    <span className="font-bold" style={{ color: '#7d3c3c' }}>Total</span>
                    <span className="font-bold text-lg" style={{ color: '#e84e1b' }}>
                      S$ {total.toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={handlePlaceOrderClick}
                  disabled={loading}
                  className="w-full py-3 rounded text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#e84e1b' }}
                >
                  Place Order
                </button>
                
                <button 
                  onClick={() => router.push('/client')}
                  className="w-full py-3 rounded text-gray-700 font-medium hover:bg-gray-100 transition-colors mt-2 border border-gray-300"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Order Form Modal */}
      <OrderForm
        isOpen={isOrderFormOpen}
        onClose={() => setIsOrderFormOpen(false)}
        onSubmit={handleOrderFormSubmit}
        totalAmount={total}
        loading={processingOrder}
      />
      
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