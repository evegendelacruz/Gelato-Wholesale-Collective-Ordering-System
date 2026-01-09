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

  const handleViewInvoice = async (order: Order) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clientData } = await supabase
        .from('client_user')
        .select('client_businessName, client_delivery_address, client_person_incharge')
        .eq('client_auth_id', user.id)
        .single();

      if (!clientData) return;

      // Generate PDF and open in new tab
      const jsPDF = (await import('jspdf')).default;
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const subtotal = getSubtotal(order);
      const gst = getGST(order);

      doc.setFont('helvetica');

      // Add logo
      try {
        const logo = document.createElement('img') as HTMLImageElement;
        logo.crossOrigin = 'anonymous';
        logo.src = '/assets/Picture1.jpg';
        await new Promise((resolve, reject) => {
          logo.onload = resolve;
          logo.onerror = reject;
        });
        
        const canvas = document.createElement('canvas');
        const scale = 3;
        canvas.width = logo.width * scale;
        canvas.height = logo.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(logo, 0, 0, canvas.width, canvas.height);
        }
        const logoData = canvas.toDataURL('image/jpeg', 0.95);
        
        const logoWidth = 28.6;
        const logoHeight = 7.4;
        const logoX = 161.4;
        const logoY = 15;
        doc.addImage(logoData, 'JPEG', logoX, logoY, logoWidth, logoHeight);
      } catch {
        console.log('Logo loading failed, continuing without logo');
      }

      // Header - Company Info
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Momolato Pte Ltd', 20, 20);
      doc.setFont('helvetica', 'normal');
      doc.text('21 Tampines Street 92, #04-06', 20, 25);
      doc.text('Singapore', 20, 30);
      doc.text('finance@momolato.com', 20, 35);
      doc.text('GST Registration No. : 201319550R', 20, 40);
      doc.text('Company Registration No. UEN:', 20, 45);
      doc.text('201319550R', 20, 50);

      // Title
      doc.setFontSize(16);
      doc.setTextColor("#0D909A");
      doc.text('Tax Invoice', 20, 57);
      doc.setTextColor(0, 0, 0);

      // Bill To, Ship To, Invoice Details
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('BILL TO', 20, 67);
      doc.setFont('helvetica', 'normal');
      doc.text(clientData.client_businessName || 'N/A', 20, 72);
      const billAddress = doc.splitTextToSize(order.delivery_address || clientData.client_delivery_address || 'N/A', 45);
      doc.text(billAddress, 20, 77);

      doc.setFont('helvetica', 'bold');
      doc.text('SHIP TO', 75, 67);
      doc.setFont('helvetica', 'normal');
      doc.text(clientData.client_businessName || 'N/A', 75, 72);
      const shipAddress = doc.splitTextToSize(order.delivery_address || clientData.client_delivery_address || 'N/A', 45);
      doc.text(shipAddress, 75, 77);

      // Invoice Details
      const labelX = 155;
      const valueX = 157;
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE NO.', labelX, 67, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(order.invoice_id, valueX, 67);

      doc.setFont('helvetica', 'bold');
      doc.text('DATE', labelX, 72, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(order.order_date), valueX, 72);

      doc.setFont('helvetica', 'bold');
      doc.text('DUE DATE', labelX, 77, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(order.order_date), valueX, 77);

      doc.setFont('helvetica', 'bold');
      doc.text('TERMS', labelX, 82, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text('Due on receipt', valueX, 82);

      // Horizontal line
      doc.setDrawColor(77, 184, 186);
      doc.line(20, 87, 190, 87);

      // Shipping info
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('SHIP DATE', 20, 93);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(order.order_date), 20, 98);
      doc.setFont('helvetica', 'bold');
      doc.text('TRACKING NO.', 100, 93);
      doc.setFont('helvetica', 'normal');
      doc.text(order.tracking_no, 100, 98);

      // Table Header
      const tableStartY = 104;
      doc.setFillColor(184, 230, 231);
      doc.rect(20, tableStartY, 170, 8, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setTextColor("#0D909A");
      doc.setFontSize(9);
      doc.text('PRODUCT /', 22, tableStartY + 3);
      doc.text('SERVICES', 22, tableStartY + 6);
      doc.text('DESCRIPTION', 60, tableStartY + 5);
      doc.text('QTY', 150, tableStartY + 5, { align: 'center' });
      doc.text('UNIT', 168, tableStartY + 3, { align: 'right' });
      doc.text('PRICE', 168, tableStartY + 6, { align: 'right' });
      doc.text('AMOUNT', 185, tableStartY + 5, { align: 'right' });

      // Table Rows
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      let yPos = tableStartY + 13;

      order.items.forEach((item) => {
        const productText = `${item.product_billingName || item.product_name}`;
        const descriptionText = `${item.product_description}` || `${item.product_name}`;
        
        doc.setFont('helvetica', 'bold');
        const productLines = doc.splitTextToSize(productText, 30);
        doc.text(productLines, 22, yPos);
        
        doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(descriptionText, 88);
        doc.text(descLines, 60, yPos);
        
        const maxLines = Math.max(productLines.length, descLines.length);
        const centerY = yPos + ((maxLines - 1) * 4) / 2;
        
        doc.text(item.quantity.toString(), 150, centerY, { align: 'center' });
        doc.text(item.unit_price.toFixed(2), 168, centerY, { align: 'right' });
        doc.text(item.subtotal.toFixed(2), 185, centerY, { align: 'right' });
        
        yPos += (maxLines * 4) + 1;
      });

      doc.setDrawColor('#e0e0e0');
      doc.setLineWidth(0.2);
      for (let i = 20; i < 190; i += 1.5) {
        doc.line(i, yPos + 2, i + 0.75, yPos + 2);
      }

      // Terms & Conditions
      yPos += 7;
      doc.setFont('helvetica', 'normal');
      doc.text('Terms & Conditions', 20, yPos);
      doc.setFontSize(10);
      const terms1 = doc.splitTextToSize(
        'We acknowledge that the above goods are received in good condition. Please inform us of any issues within 24 hours. Otherwise, kindly note no return or refunds accepted.',
        70
      );
      doc.text(terms1, 20, yPos + 5);

      const terms2 = doc.splitTextToSize(
        'We are not liable for any damage to products once stored at your premises. Please keep frozen products (gelato and / or popsicles) frozen at -18 degree Celsius and below.',
        70
      );
      doc.text(terms2, 20, yPos + 25);

      // Signature line
      doc.setDrawColor(0, 0, 0);
      doc.line(20, yPos + 50, 85, yPos + 50);
      doc.setFontSize(10);
      doc.text("Client's Signature & Company Stamp", 20, yPos + 55);

      const totalsLabelX = 100;
      const totalsValueX = 185;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('SUBTOTAL', totalsLabelX, yPos + 5);
      doc.text(subtotal.toFixed(2), totalsValueX, yPos + 5, { align: 'right' });

      doc.text('GST TOTAL', totalsLabelX, yPos + 10);
      doc.text(gst.toFixed(2), totalsValueX, yPos + 10, { align: 'right' });

      doc.text('TOTAL', totalsLabelX, yPos + 15);
      doc.text(order.total_amount.toFixed(2), totalsValueX, yPos + 15, { align: 'right' });

      doc.text('BALANCE DUE', totalsLabelX, yPos + 23);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`S$${order.total_amount.toFixed(2)}`, totalsValueX, yPos + 23, { align: 'right' });

      // Footer
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const footerY = 275;
      doc.text('The team at Momolato deeply appreciates your kind support.', 105, footerY, { align: 'center' });
      doc.text('Payment instructions:', 105, footerY + 4, { align: 'center' });
      doc.text('PayNow : UEN201319550R, cheque (attention to: Momolato Pte Ltd) or bank transfer (details below)', 105, footerY + 8, { align: 'center' });
      doc.text('OCBC BANK | SWIFT: OCBCSGSG | Account no.: 647 886 415 001 | Momolato Pte Ltd', 105, footerY + 12, { align: 'center' });

      // Open PDF in new tab
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      window.open(blobUrl, '_blank');

    } catch (error) {
      console.error('Error loading invoice:', error);
      alert('Failed to open invoice. Please try again.');
    }
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
                      Placed on {formatDate(order.order_date)}
                    </p>
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

                <div className="flex gap-3">
                  <button
                    onClick={() => handleViewInvoice(order)}
                    className="flex-1 px-4 py-2 rounded text-white font-medium hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#e84e1b' }}
                  >
                    View Invoice
                  </button>
                  <button
                    onClick={() => router.push('/client')}
                    className="flex-1 px-4 py-2 rounded border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Order Again
                  </button>
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