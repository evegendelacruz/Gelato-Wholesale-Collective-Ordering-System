'use client';

import { useState } from 'react';
import ClientHeader from '@/app/components/clientHeader/page';

interface BasketItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  status: string;
}

function BasketItemCard({ item, onUpdateQuantity, onRemove }: { 
  item: BasketItem; 
  onUpdateQuantity: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex gap-4">
      <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 shrink-0">
        <span className="text-xs">Image</span>
      </div>
      
      <div className="flex-1">
        <h3 className="text-sm font-semibold mb-1" style={{ color: '#7d3c3c' }}>
          {item.name}
        </h3>
        <p className="text-xs text-gray-600 mb-2">{item.status}</p>
        <p className="text-sm font-semibold" style={{ color: '#e84e1b' }}>
          S$ {item.price.toFixed(2)}
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
  const [basketItems, setBasketItems] = useState<BasketItem[]>([
    { id: 1, name: 'Classic Vanilla Gelato', price: 120.00, quantity: 2, status: 'Dairy' },
    { id: 2, name: 'Chocolate Fudge Gelato', price: 135.00, quantity: 1, status: 'Dairy' },
    { id: 3, name: 'Mango Sorbetto', price: 130.00, quantity: 3, status: 'Sorbet' },
  ]);

  const updateQuantity = (id: number, quantity: number) => {
    setBasketItems(items =>
      items.map(item => item.id === id ? { ...item, quantity } : item)
    );
  };

  const removeItem = (id: number) => {
    setBasketItems(items => items.filter(item => item.id !== id));
  };

  const subtotal = basketItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: '"Roboto Condensed"', backgroundColor: '#f5e6d3' }}>
      <ClientHeader />
      
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
        <h2 
          className="text-2xl font-bold mb-6"
          style={{ color: '#7d3c3c' }}
        >
          Your Basket
        </h2>
        
        {basketItems.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Your basket is empty</p>
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
                  <div className="border-t pt-3 flex justify-between">
                    <span className="font-bold" style={{ color: '#7d3c3c' }}>Total</span>
                    <span className="font-bold text-lg" style={{ color: '#e84e1b' }}>
                      S$ {total.toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <button 
                  className="w-full py-3 rounded text-white font-medium hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#e84e1b' }}
                >
                  Proceed to Checkout
                </button>
                
                <button 
                  className="w-full py-3 rounded text-gray-700 font-medium hover:bg-gray-100 transition-colors mt-2 border border-gray-300"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
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