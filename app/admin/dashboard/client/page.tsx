'use client';
import Sidepanel from '@/app/components/sidepanel/page';
import Header from '@/app/components/header/page';

import { useState } from 'react';
import { Search, Filter, Plus, User } from 'lucide-react';

export default function ClientAccountPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 20;

  // In the future, fetch clients from your database
  const clients = [];

  return (
    <div className="min-h-screen flex" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
      <Sidepanel />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6" style={{ backgroundColor: '#FCF0E3' }}>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold" style={{ color: '#5C2E1F' }}>
                Client Accounts
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

                {/* Add New Customer Button */}
                <button 
                  className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#FF5722' }}
                >
                  <Plus size={20} />
                  <span>Add New Client</span>
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
                      CLIENT ID
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      PERSON INCHARGE
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      BUSINESS NAME
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      EMAIL
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      CONTACT NUMBER
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      DELIVERY ADDRESS
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      STATUS
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      ACTION
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clients.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-gray-500">
                        No clients found. Click &quot;Add New Customer&quot; to get started.
                      </td>
                    </tr>
                  ) : (
                    clients.map((client) => (
                      <tr key={client.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <input type="checkbox" className="w-4 h-4" />
                        </td>
                        <td className="py-3 px-4 text-sm">{client.clientId}</td>
                        <td className="py-3 px-4 text-sm">{client.name}</td>
                        <td className="py-3 px-4 text-sm">{client.company}</td>
                        <td className="py-3 px-4 text-sm">{client.email}</td>
                        <td className="py-3 px-4 text-sm">{client.contactNumber}</td>
                        <td className="py-3 px-4 text-sm">{client.address}</td>
                        <td className="py-3 px-4">
                          <span 
                            className={`text-sm ${
                              client.status === 'Active' ? 'text-green-600' : 'text-gray-500'
                            }`}
                          >
                            {client.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button className="hover:opacity-70 transition-opacity">
                            <User size={20} style={{ color: '#5C2E1F' }} />
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