'use client';

import { useState } from 'react';
import ClientHeader from '@/app/components/clientHeader/page';

interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  status: string;
}

export default function OrderPage() {
  const [orderItems] = useState<OrderItem[]>([
    { id: 1, name: 'Classic Vanilla Gelato', price: 120.00, quantity: 2, status: 'Dairy' },
    { id: 2, name: 'Chocolate Fudge Gelato', price: 135.00, quantity: 1, status: 'Dairy' },
    { id: 3, name: 'Mango Sorbetto', price: 130.00, quantity: 3, status: 'Sorbet' },
  ]);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Singapore',
    deliveryNotes: ''
  });

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.08;
  const shipping = 15.00;
  const total = subtotal + tax + shipping;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Order placed successfully!');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: '"Roboto Condensed"', backgroundColor: '#f5e6d3' }}>
      <ClientHeader />
      
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
        <h2 
          className="text-2xl font-bold mb-6"
          style={{ color: '#7d3c3c' }}
        >
          Complete Your Order
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: '#7d3c3c' }}>
                Order Items
              </h3>
              <div className="space-y-3">
                {orderItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <div className="flex-1">
                      <p className="font-semibold text-sm" style={{ color: '#7d3c3c' }}>
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-600">{item.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      <p className="font-semibold text-sm" style={{ color: '#e84e1b' }}>
                        S$ {(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: '#7d3c3c' }}>
                Delivery Information
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#7d3c3c' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-orange-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#7d3c3c' }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-orange-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#7d3c3c' }}>
                      Phone *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-orange-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#7d3c3c' }}>
                      Company
                    </label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#7d3c3c' }}>
                    Delivery Address *
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#7d3c3c' }}>
                      City *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-orange-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#7d3c3c' }}>
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-orange-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#7d3c3c' }}>
                      Country *
                    </label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-orange-500"
                      required
                    >
                      <option value="Singapore">Singapore</option>
                      <option value="Malaysia">Malaysia</option>
                      <option value="Indonesia">Indonesia</option>
                      <option value="Thailand">Thailand</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#7d3c3c' }}>
                    Delivery Notes
                  </label>
                  <textarea
                    name="deliveryNotes"
                    value={formData.deliveryNotes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-orange-500"
                    placeholder="Any special delivery instructions..."
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: '#7d3c3c' }}>
                Order Summary
              </h3>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">S$ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax (8%)</span>
                  <span className="font-medium">S$ {tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">S$ {shipping.toFixed(2)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="font-bold" style={{ color: '#7d3c3c' }}>Total</span>
                  <span className="font-bold text-lg" style={{ color: '#e84e1b' }}>
                    S$ {total.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
                <p className="mb-1">✓ Secure checkout</p>
                <p className="mb-1">✓ Delivery in 2-3 business days</p>
                <p>✓ Temperature-controlled transport</p>
              </div>
              
              <button 
                onClick={handleSubmit}
                className="w-full py-3 rounded text-white font-medium hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#e84e1b' }}
              >
                Place Order
              </button>
              
              <button 
                className="w-full py-3 rounded text-gray-700 font-medium hover:bg-gray-100 transition-colors mt-2 border border-gray-300"
              >
                Back to Basket
              </button>
            </div>
          </div>
        </div>
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