'use client';

import ClientHeader from '@/app/components/clientHeader/page';

interface Product {
  id: number;
  name: string;
  price: string;
  image: string;
  status: string;
}

function ProductCard({ product }: { product: Product }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col">
      <div className="aspect-square bg-white rounded-lg mb-3 overflow-hidden border border-gray-100">
        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
          <span className="text-xs">Product Image</span>
        </div>
      </div>
      
      <div className="flex-1">
        <p className="text-sm font-semibold mb-1" style={{ color: '#e84e1b' }}>
          {product.price}
        </p>
        <h3 className="text-sm font-semibold mb-1" style={{ color: '#7d3c3c' }}>
          {product.name}
        </h3>
        <p className="text-xs text-gray-600 mb-3">{product.status}</p>
      </div>
      
      <button 
        className="w-full py-2 rounded text-white text-sm font-medium hover:opacity-90 transition-opacity"
        style={{ backgroundColor: '#e84e1b' }}
      >
        Add to order
      </button>
    </div>
  );
}

export default function ClientPage() {
  const products: Product[] = [
    { id: 1, name: 'Classic Vanilla Gelato', price: 'S$ 120.00', image: '', status: 'Dairy' },
    { id: 2, name: 'Chocolate Fudge Gelato', price: 'S$ 135.00', image: '', status: 'Dairy' },
    { id: 3, name: 'Strawberry Cheesecake Gelato', price: 'S$ 140.00', image: '', status: 'Dairy' },
    { id: 4, name: 'Pistachio Italian Gelato', price: 'S$ 160.00', image: '', status: 'Dairy' },
    { id: 5, name: 'Mango Sorbetto', price: 'S$ 130.00', image: '', status: 'Sorbet' },
    { id: 6, name: 'Cookies & Cream Gelato', price: 'S$ 145.00', image: '', status: 'Dairy' },
  ];

  return (
    <div className="min-h-screen" style={{ fontFamily: '"Roboto Condensed"', backgroundColor: '#f5e6d3' }}>
      <ClientHeader />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h2 
          className="text-2xl font-bold mb-6"
          style={{ 
            color: '#7d3c3c',
            fontFamily: "'Roboto Condensed', sans-serif"
          }}
        >
          Product List
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
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