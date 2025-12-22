'use client';
import Sidepanel from '@/app/components/sidepanel/page';
import Header from '@/app/components/header/page';

import { useState } from 'react';
import { Search, Filter } from 'lucide-react';

export default function ReportPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 20;

  // In the future, fetch reports from your database
  const reports = [];

  return (
    <div className="min-h-screen flex" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
      <Sidepanel />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6" style={{ backgroundColor: '#FCF0E3' }}>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold" style={{ color: '#5C2E1F' }}>
                Reports
              </h1>

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
              
              <div className="flex items-center gap-4">

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
                      SUMMARY ID
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      ORDER DATE
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      CREATED BY
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      CREATED AT
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      CONSOLIDATED
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">
                        No reports found.
                      </td>
                    </tr>
                  ) : (
                    reports.map((report) => (
                      <tr key={report.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <input type="checkbox" className="w-4 h-4" />
                        </td>
                        <td className="py-3 px-4 text-sm">{report.summaryId}</td>
                        <td className="py-3 px-4 text-sm">{report.orderDate}</td>
                        <td className="py-3 px-4 text-sm">{report.createdBy}</td>
                        <td className="py-3 px-4 text-sm">{report.createdAt}</td>
                        <td className="py-3 px-4">
                          <button className="text-blue-600 hover:opacity-70 transition-opacity text-sm">
                            {report.consolidated}
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