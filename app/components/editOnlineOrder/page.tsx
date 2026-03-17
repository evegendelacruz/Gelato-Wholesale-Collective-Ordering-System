'use client';
import { useState, useEffect, Fragment } from 'react';
import { X, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
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

interface OrderItem {
  id: number;
  product_id: string | null;
  product_name: string;
  quantity: number;
  product_price: number;
  product_cost: number | null;
  product_type: string | null;
  gelato_type: string | null;
  calculated_weight: string | null;
  label_ingredients: string | null;
  label_allergens: string | null;
  product_ingredient?: string | null;
  product_allergen?: string | null;
  product_description?: string | null;
  best_before: string | null;
  batch_number: string | null;
  isDeleted?: boolean;
  isExpanded?: boolean;
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
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    const fetchOrderItems = async () => {
      try {
        console.log('Fetching order items for online order ID:', order.id);

        const { data: orderItemsData, error: itemsError } = await supabase
          .from('customer_order_item')
          .select('*')
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

        const mappedItems = orderItemsData.map(item => ({
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          product_price: item.product_price,
          product_cost: item.product_cost,
          product_type: item.product_type || '',
          gelato_type: item.gelato_type || '',
          calculated_weight: item.calculated_weight || '',
          label_ingredients: item.label_ingredients,
          label_allergens: item.label_allergens,
          product_ingredient: item.label_ingredients || '',
          product_allergen: item.label_allergens || '',
          product_description: '',
          best_before: item.best_before,
          batch_number: item.batch_number,
          isExpanded: false
        }));

        console.log('Mapped order items:', mappedItems);
        setOrderItems(mappedItems);
      } catch (error) {
        console.error('Error fetching order items:', error);
        setOrderItems([]);
      }
    };

    if (isOpen && order) {
      setFormData({
        customer_name: order.customer_name || '',
        order_date: order.order_date ? new Date(order.order_date).toISOString().split('T')[0] : '',
        delivery_date: order.delivery_date ? new Date(order.delivery_date).toISOString().split('T')[0] : '',
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
    setOrderItems(updatedItems);
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = [...orderItems];
    updatedItems[index] = {
      ...updatedItems[index],
      isDeleted: true
    };
    setOrderItems(updatedItems);
  };

  const handleRestoreItem = (index: number) => {
    const updatedItems = [...orderItems];
    updatedItems[index] = {
      ...updatedItems[index],
      isDeleted: false
    };
    setOrderItems(updatedItems);
  };

  const toggleItemExpand = (index: number) => {
    const updatedItems = [...orderItems];
    updatedItems[index] = {
      ...updatedItems[index],
      isExpanded: !updatedItems[index].isExpanded
    };
    setOrderItems(updatedItems);
  };

  const calculateTotalAmount = () => {
    return orderItems
      .filter(item => !item.isDeleted)
      .reduce((sum, item) => sum + (item.product_price * item.quantity), 0);
  };

  const activeOrderItems = orderItems.filter(item => !item.isDeleted);
  const deletedOrderItems = orderItems.filter(item => item.isDeleted);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate dates
      if (!formData.order_date || !formData.delivery_date) {
        alert('Please fill in all required fields');
        setLoading(false);
        return;
      }

      // Check if there are any active items left
      const itemsToKeep = orderItems.filter(item => !item.isDeleted);
      if (itemsToKeep.length === 0) {
        alert('Order must have at least one item. Please add items or cancel the order instead.');
        setLoading(false);
        return;
      }

      const totalAmount = calculateTotalAmount();

      // Update order
      const { error: orderError } = await supabase
        .from('customer_order')
        .update({
          customer_name: formData.customer_name,
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

      // Delete items marked for deletion
      const itemsToDelete = orderItems.filter(item => item.isDeleted);
      if (itemsToDelete.length > 0) {
        console.log('Deleting removed items:', itemsToDelete.map(i => i.id));
        const { error: deleteError } = await supabase
          .from('customer_order_item')
          .delete()
          .in('id', itemsToDelete.map(item => item.id));

        if (deleteError) {
          console.error('Error deleting items:', deleteError);
          throw new Error(`Failed to remove items: ${deleteError.message}`);
        }
      }

      // Update remaining order items
      for (const item of itemsToKeep) {
        const { error: itemError } = await supabase
          .from('customer_order_item')
          .update({
            product_name: item.product_name,
            product_type: item.product_type || null,
            gelato_type: item.gelato_type || null,
            quantity: item.quantity,
            product_price: item.product_price,
            calculated_weight: item.calculated_weight || null,
            label_ingredients: item.product_ingredient || null,
            label_allergens: item.product_allergen || null
          })
          .eq('id', item.id);

        if (itemError) {
          throw new Error(`Item update failed: ${itemError.message}`);
        }
      }

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
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 shrink-0 rounded-t-lg flex justify-between items-center">
          <h2 className="text-2xl font-bold" style={{ color: '#5C2E1F' }}>
            Edit Online Order - {order.order_id}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" disabled={loading}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer Info */}
          <div>
            <h3 className="text-lg font-semibold mb-3" style={{ color: '#5C2E1F' }}>
              Customer Information
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                  Customer Name *
                </label>
                <input
                  type="text"
                  name="customer_name"
                  required
                  value={formData.customer_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <p className="text-sm"><span className="font-medium">Invoice ID:</span> {order.invoice_id || 'N/A'}</p>
            </div>
          </div>

          {/* Order Details */}
          <div>
            <h3 className="text-lg font-semibold mb-3" style={{ color: '#5C2E1F' }}>
              Order Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                  Order Date *
                </label>
                <input
                  type="date"
                  name="order_date"
                  required
                  value={formData.order_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                  Delivery Date *
                </label>
                <input
                  type="date"
                  name="delivery_date"
                  required
                  value={formData.delivery_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                Delivery Address *
              </label>
              <textarea
                name="delivery_address"
                required
                value={formData.delivery_address}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                  Tracking Number
                </label>
                <input
                  type="text"
                  name="tracking_no"
                  value={formData.tracking_no}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1" style={{ color: '#5C2E1F' }}>
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Additional notes..."
              />
            </div>
          </div>

          {/* Order Items */}
          <div>
            <h3 className="text-lg font-semibold mb-3" style={{ color: '#5C2E1F' }}>
              Order Items ({activeOrderItems.length})
            </h3>
            <p className="text-xs text-gray-500 mb-2">Click on a product row to expand and edit product details</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2" style={{ borderColor: '#5C2E1F' }}>
                    <th className="text-left py-2 px-2 font-bold text-xs w-[5%]"></th>
                    <th className="text-left py-2 px-2 font-bold text-xs w-[28%]">PRODUCT</th>
                    <th className="text-center py-2 px-2 font-bold text-xs w-[10%]">TYPE</th>
                    <th className="text-center py-2 px-2 font-bold text-xs w-[10%]">QUANTITY</th>
                    <th className="text-right py-2 px-2 font-bold text-xs w-[13%]">UNIT PRICE</th>
                    <th className="text-right py-2 px-2 font-bold text-xs w-[13%]">SUBTOTAL</th>
                    <th className="text-center py-2 px-2 font-bold text-xs w-[8%]">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item, index) => (
                    <Fragment key={item.id}>
                      <tr
                        className={`border-b border-gray-200 ${item.isDeleted ? 'bg-red-50 opacity-50' : 'hover:bg-gray-50 cursor-pointer'}`}
                        onClick={() => !item.isDeleted && toggleItemExpand(index)}
                      >
                        <td className="py-2 px-2 text-center">
                          {!item.isDeleted && (
                            <button type="button" className="text-gray-500 hover:text-gray-700">
                              {item.isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          )}
                        </td>
                        <td className="py-2 px-2 text-xs">
                          <span className={item.isDeleted ? 'line-through text-red-500' : ''}>
                            {item.product_name}
                          </span>
                          {item.isDeleted && (
                            <span className="ml-2 text-red-500 text-xs">(Will be removed)</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center text-xs">
                          {item.gelato_type || item.product_type || '-'}
                        </td>
                        <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          {item.isDeleted ? (
                            <span className="text-gray-400">{item.quantity}</span>
                          ) : (
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                              min="1"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-center text-xs"
                            />
                          )}
                        </td>
                        <td className="py-2 px-2 text-right" onClick={(e) => e.stopPropagation()}>
                          {item.isDeleted ? (
                            <span className="text-gray-400">${item.product_price.toFixed(2)}</span>
                          ) : (
                            <input
                              type="number"
                              value={item.product_price}
                              onChange={(e) => handleItemChange(index, 'product_price', Number(e.target.value))}
                              step="0.01"
                              min="0"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-right text-xs"
                            />
                          )}
                        </td>
                        <td className="py-2 px-2 text-right text-xs font-medium">
                          <span className={item.isDeleted ? 'text-gray-400 line-through' : ''}>
                            ${(item.product_price * item.quantity).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          {item.isDeleted ? (
                            <button
                              type="button"
                              onClick={() => handleRestoreItem(index)}
                              className="text-green-500 hover:text-green-700 text-xs underline"
                              title="Restore item"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                              title="Remove item"
                              disabled={activeOrderItems.length <= 1}
                            >
                              <Trash2 size={16} className={activeOrderItems.length <= 1 ? 'opacity-30' : ''} />
                            </button>
                          )}
                        </td>
                      </tr>
                      {/* Expanded Product Details */}
                      {item.isExpanded && !item.isDeleted && (
                        <tr key={`${item.id}-expanded`} className="bg-gray-50 border-b border-gray-200">
                          <td colSpan={7} className="py-4 px-4">
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                              <h4 className="text-sm font-semibold mb-3" style={{ color: '#5C2E1F' }}>
                                Edit Product Details
                              </h4>
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-gray-700">
                                    Product Name
                                  </label>
                                  <input
                                    type="text"
                                    value={item.product_name}
                                    onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-gray-700">
                                    Type
                                  </label>
                                  <input
                                    type="text"
                                    value={item.product_type || ''}
                                    onChange={(e) => handleItemChange(index, 'product_type', e.target.value)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-gray-700">
                                    Gelato Type
                                  </label>
                                  <input
                                    type="text"
                                    value={item.gelato_type || ''}
                                    onChange={(e) => handleItemChange(index, 'gelato_type', e.target.value)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-gray-700">
                                    Weight (kg)
                                  </label>
                                  <input
                                    type="text"
                                    value={item.calculated_weight || ''}
                                    onChange={(e) => handleItemChange(index, 'calculated_weight', e.target.value)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className="block text-xs font-medium mb-1 text-gray-700">
                                    Description
                                  </label>
                                  <input
                                    type="text"
                                    value={item.product_description || ''}
                                    onChange={(e) => handleItemChange(index, 'product_description', e.target.value)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3 mt-3">
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-gray-700">
                                    Ingredients
                                  </label>
                                  <textarea
                                    value={item.product_ingredient || ''}
                                    onChange={(e) => handleItemChange(index, 'product_ingredient', e.target.value)}
                                    rows={2}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="Enter ingredients..."
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-gray-700">
                                    Allergen Information
                                  </label>
                                  <textarea
                                    value={item.product_allergen || ''}
                                    onChange={(e) => handleItemChange(index, 'product_allergen', e.target.value)}
                                    rows={2}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="Enter allergen information..."
                                  />
                                </div>
                              </div>
                              <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded p-2">
                                <p className="text-xs text-yellow-800">
                                  <strong>Note:</strong> Changes made here only affect this order item. The original product in your product list will not be modified.
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {deletedOrderItems.length > 0 && (
              <p className="text-sm text-red-500 mt-2">
                {deletedOrderItems.length} item(s) will be removed when you save
              </p>
            )}

            {/* Order Summary */}
            <div className="mt-4 flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-lg font-bold border-t pt-2" style={{ color: '#5C2E1F' }}>
                  <span>Total:</span>
                  <span>${calculateTotalAmount().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
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
