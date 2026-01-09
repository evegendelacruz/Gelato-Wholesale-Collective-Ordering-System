'use client';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import supabase from '@/lib/client';

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: {
    id: number;
    order_id: string;
    client_auth_id: string;
    order_date: string;
    delivery_date: string;
    delivery_address: string;
    total_amount: number;
    status: string;
    notes: string | null;
    invoice_id: string;
    tracking_no: string;
    company_name: string;
  };
}

interface OrderItem {
  id: number;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  gelato_type: string;
  weight: number;
  request: string | null;
}

export default function EditOrderModal({ isOpen, onClose, onSuccess, order }: EditOrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [formData, setFormData] = useState({
    order_date: '',
    delivery_date: '',
    delivery_address: '',
    tracking_no: '',
    notes: '',
    status: ''
  });

  useEffect(() => {
    const fetchOrderItems = async () => {
        try {
        const { data, error } = await supabase
            .from('client_order_item')
            .select('*')
            .eq('order_id', order.id);

        if (error) throw error;
        setOrderItems(data || []);
        } catch (error) {
        console.error('Error fetching order items:', error);
        }
    };

    if (isOpen && order) {
        // Format dates for input fields (YYYY-MM-DD)
        const formatDateForInput = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
        };

        setFormData({
        order_date: formatDateForInput(order.order_date),
        delivery_date: formatDateForInput(order.delivery_date),
        delivery_address: order.delivery_address || '',
        tracking_no: order.tracking_no || '',
        notes: order.notes || '',
        status: order.status || 'Pending'
        });

        // Fetch order items
        fetchOrderItems();
    }
    }, [isOpen, order]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
    const updatedItems = [...orderItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };

    // Recalculate subtotal if quantity or unit_price changes
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = field === 'quantity' ? Number(value) : updatedItems[index].quantity;
      const unitPrice = field === 'unit_price' ? Number(value) : updatedItems[index].unit_price;
      updatedItems[index].subtotal = quantity * unitPrice;
    }

    setOrderItems(updatedItems);
  };

  const calculateTotalAmount = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const gst = subtotal * 0.09;
    return subtotal + gst;
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Validate dates
      if (!formData.order_date || !formData.delivery_date) {
        alert('Please fill in all required fields');
        return;
      }

      const totalAmount = calculateTotalAmount();

      // Update order
      const { error: orderError } = await supabase
        .from('client_order')
        .update({
          order_date: formData.order_date,
          delivery_date: formData.delivery_date,
          delivery_address: formData.delivery_address,
          tracking_no: formData.tracking_no,
          notes: formData.notes,
          status: formData.status,
          total_amount: totalAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      // Update order items
      for (const item of orderItems) {
        const { error: itemError } = await supabase
          .from('client_order_item')
          .update({
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
            request: item.request
          })
          .eq('id', item.id);

        if (itemError) throw itemError;
      }

      onSuccess();
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold" style={{ color: '#5C2E1F' }}>
            Edit Order - {order.order_id}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Company Info */}
          <div>
            <h3 className="text-lg font-semibold mb-3" style={{ color: '#5C2E1F' }}>
              Company Information
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm"><span className="font-medium">Company:</span> {order.company_name}</p>
              <p className="text-sm"><span className="font-medium">Invoice ID:</span> {order.invoice_id}</p>
            </div>
          </div>

          {/* Order Details */}
          <div>
            <h3 className="text-lg font-semibold mb-3" style={{ color: '#5C2E1F' }}>
              Order Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Order Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="order_date"
                  value={formData.order_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Delivery Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="delivery_date"
                  value={formData.delivery_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">
                Delivery Address
              </label>
              <textarea
                name="delivery_address"
                value={formData.delivery_address}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tracking Number
                </label>
                <input
                  type="text"
                  name="tracking_no"
                  value={formData.tracking_no}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Order Items */}
          <div>
            <h3 className="text-lg font-semibold mb-3" style={{ color: '#5C2E1F' }}>
              Order Items
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2" style={{ borderColor: '#5C2E1F' }}>
                    <th className="text-left py-2 px-2 font-bold text-xs">PRODUCT</th>
                    <th className="text-left py-2 px-2 font-bold text-xs">TYPE</th>
                    <th className="text-center py-2 px-2 font-bold text-xs">QUANTITY</th>
                    <th className="text-right py-2 px-2 font-bold text-xs">UNIT PRICE</th>
                    <th className="text-right py-2 px-2 font-bold text-xs">SUBTOTAL</th>
                    <th className="text-left py-2 px-2 font-bold text-xs">REQUEST</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item, index) => (
                    <tr key={item.id} className="border-b border-gray-200">
                      <td className="py-2 px-2 text-xs">{item.product_name}</td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                          min="1"
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-xs"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', Number(e.target.value))}
                          step="0.01"
                          min="0"
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-right text-xs"
                        />
                      </td>
                      <td className="py-2 px-2 text-right text-xs font-medium">
                        ${item.subtotal.toFixed(2)}
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={item.request || ''}
                          onChange={(e) => handleItemChange(index, 'request', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          placeholder="Special request..."
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Order Summary */}
            <div className="mt-4 flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>${orderItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>GST (9%):</span>
                  <span>${(orderItems.reduce((sum, item) => sum + item.subtotal, 0) * 0.09).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2" style={{ color: '#5C2E1F' }}>
                  <span>Total:</span>
                  <span>${calculateTotalAmount().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end pt-4 border-t">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 border-2 rounded font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              style={{ borderColor: '#5C2E1F', color: '#5C2E1F' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#FF5722' }}
            >
              {loading ? 'Updating...' : 'Update Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}