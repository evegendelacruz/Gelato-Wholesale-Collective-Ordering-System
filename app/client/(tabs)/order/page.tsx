'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ClientHeader from '@/app/components/clientHeader/page';
import supabase from '@/lib/client';

interface OrderItem {
  id: number;
  product_name: string;
  product_billingName?: string; 
  product_description?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product_image?: string;
  product_list?: {
    product_image: string | null;
  };
}

interface Order {
  id: number;
  order_id: string;
  invoice_id: string;
  tracking_no: string;
  order_date: string;
  delivery_address: string;
  delivery_date?: string; 
  total_amount: number;
  status: string;
  notes: string | null;
  client_order_item?: OrderItem[];
  items: OrderItem[];
}

export default function OrderPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          throw new Error('Not authenticated. Please log in.');
        }

        const { data: ordersData, error: ordersError } = await supabase
          .from('client_order')
          .select('*')
          .eq('client_auth_id', user.id)
          .order('created_at', { ascending: false });

        if (ordersError) throw ordersError;

        const ordersWithItems = await Promise.all(
          (ordersData || []).map(async (order) => {
            const { data: itemsData, error: itemsError } = await supabase
              .from('client_order_item')
              .select('*')
              .eq('order_id', order.id);

            if (itemsError) throw itemsError;

            const itemsWithImages = await Promise.all(
            (itemsData || []).map(async (item) => {
              const { data: productData } = await supabase
                .from('product_list')
                .select('product_image, product_description, product_billingName')  
                .eq('id', item.product_id)
                .single();

              return {
                ...item,
                product_description: productData?.product_description || item.product_name,
                product_billingName: productData?.product_billingName || item.product_name  
              };
            })
          );

            return {
              ...order,
              items: itemsWithImages
            };
          })
        );

        setOrders(ordersWithItems);

      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('client_order_changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'client_order',
            filter: `client_auth_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Order status updated:', payload);
            setOrders(prevOrders =>
              prevOrders.map(order =>
                order.id === payload.new.id
                  ? { ...order, ...payload.new }
                  : order
              )
            );
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupRealtimeSubscription();

    return () => {
      cleanup.then(unsubscribe => unsubscribe?.());
    };
  }, []);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-SG', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getSubtotal = (order: Order): number => {
    return order.items.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const getGST = (order: Order): number => {
    const subtotal = getSubtotal(order);
    return subtotal * 0.09;
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: '"Roboto Condensed"', backgroundColor: '#f5e6d3' }}>
      <ClientHeader />
      
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
        <h2 
          className="text-2xl font-bold mb-6"
          style={{ color: '#7d3c3c' }}
        >
          My Orders
        </h2>
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-gray-600">Loading orders...</div>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500 mb-4">You haven&apos;t placed any orders yet</p>
            <button
              onClick={() => router.push('/client')}
              className="px-6 py-2 rounded text-white font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#e84e1b' }}
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold mb-1" style={{ color: '#7d3c3c' }}>
                      Order #{order.order_id}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Order on {formatDate(order.order_date)}
                    </p>
                    <span className="text-sm text-gray-600 font-bold" style={{ color: '#7d3c3c' }}>
                      Delivery on {order.delivery_date ? formatDate(order.delivery_date) : 'Not scheduled'}
                  </span>
                  </div>
                  <div className="text-right">
                    <span 
                      className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: order.status === 'Completed' ? '#d4edda' : 
                                       order.status === 'Pending' ? '#fff3cd' : '#f8d7da',
                        color: order.status === 'Completed' ? '#155724' : 
                               order.status === 'Pending' ? '#856404' : '#721c24'
                      }}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 mb-4">
                  <h4 className="text-sm font-semibold mb-2" style={{ color: '#7d3c3c' }}>Order Items</h4>
                  <div className="space-y-2">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 flex-1">
                            {item.product_name} x{item.quantity}
                          </span>
                          <span className="font-medium ml-2">S$ {item.subtotal.toFixed(2)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No items found</p>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">S$ {getSubtotal(order).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">GST (9%)</span>
                    <span className="font-medium">S$ {getGST(order).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold" style={{ color: '#7d3c3c' }}>Total</span>
                    <span className="font-bold text-lg" style={{ color: '#e84e1b' }}>
                      S$ {order.total_amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push('/client')}
                    className="flex-1 px-4 py-2 rounded border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Order Again
                  </button>
                </div>
              </div>
              </div>
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