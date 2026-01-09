'use client';
import { useState, useEffect} from 'react';
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
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
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

// Update the fetchOrderItems useEffect
useEffect(() => {
  const fetchOrderItems = async () => {
    try {
      console.log('Fetching order items for order ID:', order.id);
      
      // Fetch order items with product details using the foreign key relationship
      const { data: orderItemsData, error: itemsError } = await supabase
        .from('client_order_item')
        .select(`
          *`)
        .eq('order_id', order.id);

      console.log('Order items response:', { data: orderItemsData, error: itemsError });

      if (itemsError) {
        console.error('Items error details:', itemsError);
        throw itemsError;
      }

      if (!orderItemsData || orderItemsData.length === 0) {
        console.log('No order items found');
        setOrderItems([]);
        return;
      }

      // Map the data to include gelato_type from product_list
      const itemsWithGelatoType = orderItemsData.map(item => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        weight: item.calculated_weight || 0,
        request: item.notes || null,
        label_allergens: item.label_allergens,
        label_ingredients: item.label_ingredients,
        best_before: item.best_before,
        calculated_weight: item.calculated_weight
      }));

      console.log('Final items with gelato type:', itemsWithGelatoType);
      setOrderItems(itemsWithGelatoType);
    } catch (error) {
      console.error('Error fetching order items:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      setOrderItems([]);
    }
  };

  if (isOpen && order) {
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
    console.log('Starting order update...');
    console.log('Order ID:', order.id);
    console.log('Form Data:', formData);
    console.log('Order Items:', orderItems);

    // Validate dates
    if (!formData.order_date || !formData.delivery_date) {
      alert('Please fill in all required fields');
      setLoading(false);
      return;
    }

    console.log('Calculating total amount...');
    const totalAmount = calculateTotalAmount();
    console.log('Total Amount:', totalAmount);

    // Update order (notes is stored here in client_order table)
    console.log('Updating order in database...');
    const { data: orderData, error: orderError } = await supabase
      .from('client_order')
      .update({
        order_date: formData.order_date,
        delivery_date: formData.delivery_date,
        delivery_address: formData.delivery_address,
        tracking_no: formData.tracking_no,
        notes: formData.notes, // Notes stored in client_order
        status: formData.status,
        total_amount: totalAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    console.log('Order update response:', { data: orderData, error: orderError });

    if (orderError) {
      console.error('Order update error details:', orderError);
      throw new Error(`Order update failed: ${orderError.message}`);
    }

    // Update order items (without notes - that's in client_order)
    console.log('Updating order items...');
    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i];
      console.log(`Updating item ${i + 1}/${orderItems.length}:`, item);
      
      const { data: itemData, error: itemError } = await supabase
        .from('client_order_item')
        .update({
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal
          // Removed: notes: item.request (this column doesn't exist in client_order_item)
        })
        .eq('id', item.id);

      console.log(`Item ${i + 1} update response:`, { data: itemData, error: itemError });

      if (itemError) {
        console.error(`Item ${i + 1} update error:`, itemError);
        throw new Error(`Item update failed: ${itemError.message}`);
      }
    }
    onSuccess();
    onClose();
  } catch (error: unknown) {
    console.error('Caught error in handleSubmit:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Error message:', errorMessage);
    console.error('Error stack:', errorStack);
    alert(`Failed to update order: ${errorMessage}`);
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
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="border-b-2" style={{ borderColor: '#5C2E1F' }}>
                    <th className="text-left py-2 px-2 font-bold text-xs w-[25%]">PRODUCT</th>
                    <th className="text-center py-2 px-2 font-bold text-xs w-[12%]">QUANTITY</th>
                    <th className="text-right py-2 px-2 font-bold text-xs w-[13%]">UNIT PRICE</th>
                    <th className="text-right py-2 px-2 font-bold text-xs w-[13%]">SUBTOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item, index) => (
                    <tr key={item.id} className="border-b border-gray-200">
                      <td className="py-2 px-2 text-xs">{item.product_name}</td>
                      <td className="py-2 px-2 text-center">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                          min="1"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-center text-xs"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', Number(e.target.value))}
                          step="0.01"
                          min="0"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-right text-xs"
                        />
                      </td>
                      <td className="py-2 px-2 text-right text-xs font-medium">
                        ${item.subtotal.toFixed(2)}
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