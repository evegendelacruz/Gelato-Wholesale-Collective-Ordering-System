'use client';
import { useState, useEffect } from 'react';
import { X, Search, Trash2, Check } from 'lucide-react';
import supabase from '@/lib/client';
import Image from 'next/image';

interface Client {
  client_id: string;
  client_auth_id: string;
  client_businessName: string;
  client_delivery_address: string;
  client_person_incharge: string;
}

interface Product {
  id: number;
  product_id: string;
  product_name: string;
  product_type: string;
  product_gelato_type: string;
  product_weight: number;
  product_price: number;
  product_image: string | null;
}

interface ClientProduct {
  id: number;
  product_id: number;
  custom_price: number;
  product_list: Product;
}

interface OrderItem {
  product_id: number;
  product_name: string;
  packaging_type: string;
  quantity: number;
  unit_price: number;
  gelato_type: string;
  weight: number;
  request: string;
  subtotal: number;
}

interface ClientOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ClientOrderModal({ isOpen, onClose, onSuccess }: ClientOrderModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });
  
  // Step 1: Client Selection
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // Step 2: Order Details
  const [orderDate, setOrderDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  
  // Step 3: Product Selection
  const [availableProducts, setAvailableProducts] = useState<ClientProduct[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  
  // Success Modal
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState('');

  // Fetch clients on mount
  useEffect(() => {
    if (isOpen) {
      fetchClients();
    }
  }, [isOpen]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('client_user')
        .select('client_id, client_auth_id, client_businessName, client_delivery_address, client_person_incharge')
        .order('client_businessName', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setMessage({ type: 'error', text: 'Failed to load clients' });
      setTimeout(() => setMessage({ type: '', text: '' }), 1000);
    }
  };

  const fetchClientProducts = async (clientAuthId: string) => {
    try {
      setLoading(true);
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
            product_weight,
            product_price,
            product_image
          )
        `)
        .eq('client_auth_id', clientAuthId)
        .eq('is_available', true);

      if (error) throw error;
      setAvailableProducts(data || []);
    } catch (error) {
      console.error('Error fetching client products:', error);
      setMessage({ type: 'error', text: 'Failed to load client products' });
      setTimeout(() => setMessage({ type: '', text: '' }), 1000);
    } finally {
      setLoading(false);
    }
  };

  const generateOrderId = async (): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('client_order')
        .select('order_id')
        .like('order_id', 'ORD-%')
        .order('order_id', { ascending: false })
        .limit(1);

      if (error && error.code !== 'PGRST116') throw error;

      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastId = data[0].order_id;
        const lastNumber = parseInt(lastId.replace('ORD-', ''));
        nextNumber = lastNumber + 1;
      }

      return `ORD-${String(nextNumber).padStart(5, '0')}`;
    } catch (error) {
      console.error('Error generating order ID:', error);
      return `ORD-${String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0')}`;
    }
  };

  const handleClientSelect = async (client: Client) => {
    setSelectedClient(client);
    setDeliveryAddress(client.client_delivery_address);
    await fetchClientProducts(client.client_auth_id);
  };

  const handleStep1Next = () => {
    if (!selectedClient) {
      setMessage({ type: 'error', text: 'Please select a client' });
      setTimeout(() => setMessage({ type: '', text: '' }), 1000);
      return;
    }
    setStep(2);
  };

  const handleStep2Next = () => {
    if (!orderDate || !deliveryDate || !deliveryAddress) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      setTimeout(() => setMessage({ type: '', text: '' }), 1000);
      return;
    }
    setStep(3);
  };

  const handleAddProduct = (clientProduct: ClientProduct) => {
    const newItem: OrderItem = {
      product_id: clientProduct.product_list.id,
      product_name: clientProduct.product_list.product_name,
      packaging_type: clientProduct.product_list.product_type,
      quantity: 1,
      unit_price: clientProduct.custom_price,
      gelato_type: clientProduct.product_list.product_gelato_type,
      weight: clientProduct.product_list.product_weight,
      request: '',
      subtotal: clientProduct.custom_price
    };
    setOrderItems([...orderItems, newItem]);
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    const newItems = [...orderItems];
    if (quantity <= 0) {
      newItems.splice(index, 1);
    } else {
      newItems[index].quantity = quantity;
      newItems[index].subtotal = quantity * newItems[index].unit_price;
    }
    setOrderItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = orderItems.filter((_, i) => i !== index);
    setOrderItems(newItems);
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const calculateGST = () => {
    return calculateTotal() * 0.09;
  };

  const calculateGrandTotal = () => {
    return calculateTotal() + calculateGST();
  };

  const handleSubmitOrder = async () => {
    if (orderItems.length === 0) {
        setMessage({ type: 'error', text: 'Please add at least one product' });
        setTimeout(() => setMessage({ type: '', text: '' }), 1000);
        return;
    }

    if (!selectedClient) {
        setMessage({ type: 'error', text: 'Client not selected' });
        setTimeout(() => setMessage({ type: '', text: '' }), 1000);
        return;
    }

    try {
        setLoading(true);

        // Generate Order ID
        const orderId = await generateOrderId();
        const totalAmount = calculateGrandTotal();

        // Insert order - let database trigger handle invoice_id and tracking_no
        const { data: orderData, error: orderError } = await supabase
        .from('client_order')
        .insert({
            order_id: orderId,
            client_auth_id: selectedClient.client_auth_id,
            order_date: orderDate,
            delivery_date: deliveryDate,
            delivery_address: deliveryAddress,
            total_amount: totalAmount,
            status: 'Pending',
            notes: notes || null
        })
        .select('*')
        .single();

        if (orderError) {
            console.error('Order creation error:', orderError);
            throw new Error(`Failed to create order: ${orderError.message || JSON.stringify(orderError)}`);
        }

        if (!orderData) {
            throw new Error('Order created but no data returned');
        }

        console.log('Order created successfully:', orderData);

        const orderItemsData = orderItems.map(item => ({
            order_id: orderData.id,
            product_id: item.product_id,
            product_name: item.product_name,
            packaging_type: item.packaging_type,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal
        }));

        console.log('Attempting to insert order items:', orderItemsData);

        const { data: insertedItems, error: itemsError } = await supabase
            .from('client_order_item')
            .insert(orderItemsData)
            .select();

        if (itemsError) {
            console.error('Order items creation error:', itemsError);
            // Try to rollback the order if items insertion fails
            await supabase
                .from('client_order')
                .delete()
                .eq('id', orderData.id);
            
            throw new Error(`Failed to create order items: ${itemsError.message || 'Unknown error'}`);
        }

        console.log('Order items created successfully:', insertedItems);

        // Success!
        setCreatedOrderId(orderId);
        setIsSuccessModalOpen(true);

    } catch (error) {
        console.error('Error creating order:', error);
        
        let errorMessage = 'Failed to create order';
        
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'object' && error !== null) {
            errorMessage = JSON.stringify(error);
        }
        
        setMessage({
            type: 'error',
            text: errorMessage
        });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } finally {
        setLoading(false);
    }
};

  const handleClose = () => {
    setStep(1);
    setSelectedClient(null);
    setOrderDate('');
    setDeliveryDate('');
    setDeliveryAddress('');
    setNotes('');
    setOrderItems([]);
    setClientSearch('');
    setProductSearch('');
    setMessage({ type: '', text: '' });
    onClose();
  };

  const handleSuccessClose = () => {
    setIsSuccessModalOpen(false);
    handleClose();
    onSuccess();
  };

  if (!isOpen) return null;

  const filteredClients = clients.filter(client =>
    client.client_id.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.client_businessName.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.client_person_incharge.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const filteredProducts = availableProducts.filter(cp =>
    cp.product_list.product_id.toLowerCase().includes(productSearch.toLowerCase()) ||
    cp.product_list.product_name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const isProductAdded = (productId: number) => {
    return orderItems.some(item => item.product_id === productId);
  };

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <div className="bg-white rounded-lg w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold" style={{ color: '#5C2E1F' }}>
                  Create New Order
                </h2>
                <p className="text-gray-500 mt-1">
                  {step === 1 && 'Select a client to create order for'}
                  {step === 2 && 'Enter order details'}
                  {step === 3 && 'Add products to the order'}
                </p>
              </div>
              <button onClick={handleClose} disabled={loading} className="text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed">
                <X size={24} />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 ${step >= 1 ? 'text-orange-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-orange-600 text-white' : 'bg-gray-300'}`}>
                    1
                  </div>
                  <span className="text-sm font-medium">Client</span>
                </div>
                <div className={`w-16 h-0.5 ${step >= 2 ? 'bg-orange-600' : 'bg-gray-300'}`}></div>
                <div className={`flex items-center gap-2 ${step >= 2 ? 'text-orange-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-orange-600 text-white' : 'bg-gray-300'}`}>
                    2
                  </div>
                  <span className="text-sm font-medium">Details</span>
                </div>
                <div className={`w-16 h-0.5 ${step >= 3 ? 'bg-orange-600' : 'bg-gray-300'}`}></div>
                <div className={`flex items-center gap-2 ${step >= 3 ? 'text-orange-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-orange-600 text-white' : 'bg-gray-300'}`}>
                    3
                  </div>
                  <span className="text-sm font-medium">Products</span>
                </div>
              </div>
            </div>

            {/* Message Display */}
            {message.text && (
              <div style={{
                marginBottom: '20px',
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
                color: message.type === 'success' ? '#155724' : '#721c24',
                fontSize: '14px',
                border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
              }}>
                {message.text}
              </div>
            )}

            {/* Step 1: Client Selection */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search clients by ID, name, or person in charge..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                  {filteredClients.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      No clients found
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {filteredClients.map((client) => (
                        <div
                          key={client.client_id}
                          onClick={() => handleClientSelect(client)}
                          className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                            selectedClient?.client_id === client.client_id ? 'bg-orange-50 border-l-4 border-orange-600' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{client.client_businessName}</p>
                              <p className="text-sm text-gray-600">ID: {client.client_id} • {client.client_person_incharge}</p>
                              <p className="text-xs text-gray-500 mt-1">{client.client_delivery_address}</p>
                            </div>
                            {selectedClient?.client_id === client.client_id && (
                              <Check size={24} className="text-orange-600" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={handleClose}
                    className="px-8 py-2 border border-gray-300 rounded font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStep1Next}
                    disabled={!selectedClient || loading}
                    className="px-8 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#FF5722' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Order Details */}
            {step === 2 && (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                    Order Date <span className="text-red-500">*</span>
                    </label>
                    <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                    Delivery Date <span className="text-red-500">*</span>
                    </label>
                    <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                    />
                </div>
                </div>

                <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                    Delivery Address <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                />
                </div>

                {/* Removed Tracking Number field - now auto-generated */}

                <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                    Notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                </div>

                <div className="flex justify-between gap-3 mt-6">
                <button
                    onClick={() => setStep(1)}
                    className="px-8 py-2 border border-gray-300 rounded font-medium hover:bg-gray-50 transition-colors"
                >
                    Back
                </button>
                <button
                    onClick={handleStep2Next}
                    disabled={loading}
                    className="px-8 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#FF5722' }}
                >
                    Next
                </button>
                </div>
            </div>
            )}

            {/* Step 3: Product Selection */}
            {step === 3 && (
              <div className="space-y-4">
                {/* Available Products */}
                <div>
                  <h3 className="text-lg font-semibold mb-3" style={{ color: '#5C2E1F' }}>
                    Available Products
                  </h3>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No products available for this client
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {filteredProducts.map((cp) => (
                          <div key={cp.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                            <div className="flex items-center gap-3 flex-1">
                              {cp.product_list.product_image ? (
                                <Image
                                  src={`https://boxzapgxostpqutxabzs.supabase.co/storage/v1/object/public/gwc_files/${cp.product_list.product_image}`}
                                  alt={cp.product_list.product_name}
                                  width={48}
                                  height={48}
                                  className="w-12 h-12 object-cover rounded"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                                  <span className="text-gray-400 text-xs">No img</span>
                                </div>
                              )}
                              <div className="flex-1">
                                <p className="font-medium text-sm">{cp.product_list.product_name}</p>
                                <p className="text-xs text-gray-600">
                                  {cp.product_list.product_id} • {cp.product_list.product_type}
                                </p>
                                <p className="text-xs text-orange-600 font-medium mt-1">
                                  S$ {cp.custom_price.toFixed(2)}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleAddProduct(cp)}
                              disabled={isProductAdded(cp.product_list.id)}
                              className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isProductAdded(cp.product_list.id) ? 'Added' : 'Add'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="text-lg font-semibold mb-3" style={{ color: '#5C2E1F' }}>
                    Order Items ({orderItems.length})
                  </h3>
                  {orderItems.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
                      No products added yet. Add products from the list above.
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700">Product</th>
                              <th className="text-center py-2 px-3 text-xs font-semibold text-gray-700">Qty</th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-700">Price</th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-700">Subtotal</th>
                              <th className="text-center py-2 px-3 text-xs font-semibold text-gray-700">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {orderItems.map((item, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="py-2 px-3">
                                  <p className="text-sm font-medium">{item.product_name}</p>
                                  <p className="text-xs text-gray-600">{item.packaging_type}</p>
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value) || 1)}
                                    className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  />
                                </td>
                                <td className="py-2 px-3 text-right text-sm">S$ {item.unit_price.toFixed(2)}</td>
                                <td className="py-2 px-3 text-right text-sm font-medium">S$ {item.subtotal.toFixed(2)}</td>
                                <td className="py-2 px-3 text-center">
                                  <button
                                    onClick={() => handleRemoveItem(index)}
                                    className="text-red-500 hover:text-red-700 transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Order Summary */}
                      <div className="bg-gray-50 p-4 border-t border-gray-200">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-medium">S$ {calculateTotal().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600">GST (9%):</span>
                          <span className="font-medium">S$ {calculateGST().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t pt-2">
                          <span style={{ color: '#5C2E1F' }}>Total:</span>
                          <span style={{ color: '#FF5722' }}>S$ {calculateGrandTotal().toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between gap-3 mt-6">
                  <button
                    onClick={() => setStep(2)}
                    className="px-8 py-2 border border-gray-300 rounded font-medium hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmitOrder}
                    disabled={loading || orderItems.length === 0}
                    className="px-8 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#FF5722' }}
                  >
                    {loading ? 'Creating Order...' : 'Create Order'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-60" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <Check size={32} className="text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#5C2E1F' }}>
              Order Created Successfully!
            </h2>
            <p className="text-gray-600 mb-2">
              Order ID: <span className="font-semibold">{createdOrderId}</span>
            </p>
            <p className="text-gray-600 mb-6">
              The order has been created for {selectedClient?.client_businessName}
            </p>
            <button
              onClick={handleSuccessClose}
              className="px-16 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#FF5722' }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}