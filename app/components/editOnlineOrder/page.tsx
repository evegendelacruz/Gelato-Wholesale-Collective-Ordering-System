'use client';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import supabase from '@/lib/client';

interface Order {
  id: number;
  order_id: string;
  customer_name: string;
  order_date: string;
  delivery_date: string;
  delivery_address: string;
  status: string;
  notes: string | null;
  tracking_no: string;
  total_amount: number;
  invoice_id: string;
}

interface EditOnlineOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: Order;
}

export default function EditOnlineOrderModal({ isOpen, onClose, onSuccess, order }: EditOnlineOrderModalProps) {
  const [formData, setFormData] = useState({
    customer_name: '',
    order_date: '',
    delivery_date: '',
    delivery_address: '',
    tracking_no: '',
    notes: '',
    status: 'Pending'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (order) {
      setFormData({
        customer_name: order.customer_name || '',
        order_date: order.order_date ? new Date(order.order_date).toISOString().split('T')[0] : '',
        delivery_date: order.delivery_date ? new Date(order.delivery_date).toISOString().split('T')[0] : '',
        delivery_address: order.delivery_address || '',
        tracking_no: order.tracking_no || '',
        notes: order.notes || '',
        status: order.status || 'Pending'
      });
    }
  }, [order]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('customer_order')
        .update({
          customer_name: formData.customer_name,
          order_date: formData.order_date,
          delivery_date: formData.delivery_date,
          delivery_address: formData.delivery_address,
          tracking_no: formData.tracking_no,
          notes: formData.notes,
          status: formData.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;

      onSuccess();
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-auto flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 shrink-0 rounded-t-lg flex justify-between items-center">
          <h2 className="text-2xl font-bold" style={{ color: '#5C2E1F' }}>
            Edit Online Order
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
              Customer Name *
            </label>
            <input
              type="text"
              required
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                Order Date *
              </label>
              <input
                type="date"
                required
                value={formData.order_date}
                onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                Delivery Date *
              </label>
              <input
                type="date"
                required
                value={formData.delivery_date}
                onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
              Delivery Address *
            </label>
            <textarea
              required
              value={formData.delivery_address}
              onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
              Tracking Number
            </label>
            <input
              type="text"
              value={formData.tracking_no}
              onChange={(e) => setFormData({ ...formData, tracking_no: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#FF5722' }}
            >
              {loading ? 'Updating...' : 'Update Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}