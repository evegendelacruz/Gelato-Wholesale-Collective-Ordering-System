'use client';
import Sidepanel from '@/app/components/sidepanel/page';
import Header from '@/app/components/header/page';

import { useState } from 'react';
import { Search, Filter, Plus, ChevronDown } from 'lucide-react';

export default function OrderPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 20;

  // In the future, fetch orders from your database
  const orders = [];

  return (
    <div className="min-h-screen flex" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
      <Sidepanel />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6" style={{ backgroundColor: '#FCF0E3' }}>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold" style={{ color: '#5C2E1F' }}>
                Orders
              </h1>
              
              <div className="flex items-center gap-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                    size={20} 
                  />
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Sort By Button */}
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Filter size={20} />
                  <span>Sort by</span>
                </button>

                {/* Filter Button */}
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Filter size={20} />
                  <span>Filter</span>
                </button>

                {/* Create Order Button */}
                <button 
                  className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#FF5722' }}
                >
                  <Plus size={20} />
                  <span>Create Order</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2" style={{ borderColor: '#5C2E1F' }}>
                    <th className="text-left py-3 px-4">
                      <input type="checkbox" className="w-4 h-4" />
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      ORDER ID
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      ORDER DATE
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      DELIVERY DATE
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      CLIENT NAME
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      COMPANY NAME
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      DELIVERY ADDRESS
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      AMOUNT (S$)
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      STATUS
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      INVOICE
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-gray-500">
                        No orders found. Click &quot;Create Order&quot; to get started.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <input type="checkbox" className="w-4 h-4" />
                        </td>
                        <td className="py-3 px-4 text-sm">{order.orderId}</td>
                        <td className="py-3 px-4 text-sm">{order.orderDate}</td>
                        <td className="py-3 px-4 text-sm">{order.deliveryDate}</td>
                        <td className="py-3 px-4 text-sm">{order.clientName}</td>
                        <td className="py-3 px-4 text-sm">{order.companyName}</td>
                        <td className="py-3 px-4 text-sm">{order.deliveryAddress}</td>
                        <td className="py-3 px-4 text-sm">{order.amount}</td>
                        <td className="py-3 px-4">
                          <span 
                            className={`text-sm ${
                              order.status === 'Paid' ? 'text-green-600' : 'text-orange-600'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button className="flex items-center gap-1 text-blue-600 hover:opacity-70 transition-opacity text-sm">
                            View Invoice
                            <ChevronDown size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="text-sm hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ color: '#5C2E1F' }}
              >
                Previous
              </button>
              
              <span className="text-sm" style={{ color: '#5C2E1F' }}>
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="text-sm hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ color: '#5C2E1F' }}
              >
                Next
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}