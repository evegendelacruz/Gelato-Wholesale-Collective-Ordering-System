'use client';
import Sidepanel from '@/app/components/sidepanel/page';
import Header from '@/app/components/header/page';
import { useState, useEffect } from 'react';
import { Search, Filter, Download, Eye, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import supabase from '@/lib/client';

interface Report {
  id: string;
  summaryId: string;
  orderDate: string;
  createdBy: string;
  createdAt: string;
  deliveryDate: string;
  totalOrders: number;
}

interface ClientUser {
  client_businessName?: string;
}

interface Order {
  id: number;
  delivery_date: string;
  client_auth_id: string;
  client_user?: ClientUser | ClientUser[];
}

interface OrderItemDB {
  id: number;
  order_id: number;
  product_id: string;
  product_name: string;
  product_type: string;
  quantity: number;
  product_gelato_type: string;
  weight: number;
  unit_price: number;
  subtotal: number;
  request?: string;
}

interface ReportRow {
  'Delivery Date': string;
  'Customer Full Name': string;
  'Memo/Description': string;
  'Type': string;
  'Quantity': number;
  'Gelato Type': string;
  'Weight (kg)': number | string;
}

export default function ReportPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<ReportRow[]>([]);
  const [previewDate, setPreviewDate] = useState('');
  const itemsPerPage = 10;

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateShort = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short'
    });
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      
      // Get all unique delivery dates from orders
      const { data: orders, error } = await supabase
        .from('client_order')
        .select('delivery_date, created_at')
        .order('delivery_date', { ascending: false });

      if (error) throw error;

      // Group by delivery date
      const uniqueDates = new Map<string, { count: number; createdAt: string }>();
      
      orders?.forEach(order => {
        const date = order.delivery_date;
        if (!uniqueDates.has(date)) {
          uniqueDates.set(date, {
            count: 1,
            createdAt: order.created_at
          });
        } else {
          const existing = uniqueDates.get(date)!;
          uniqueDates.set(date, {
            count: existing.count + 1,
            createdAt: existing.createdAt
          });
        }
      });

      // Convert to reports array
      const reportsData: Report[] = Array.from(uniqueDates.entries()).map(([date, info], index) => ({
        id: `report-${index}`,
        summaryId: `PROD-${date.replace(/-/g, '')}`,
        orderDate: date,
        createdBy: 'System',
        createdAt: info.createdAt,
        deliveryDate: date,
        totalOrders: info.count
      }));

      setReports(reportsData);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateReportData = async (deliveryDate: string) => {
  try {
    // Fetch orders for the selected date
    const { data: orders, error: ordersError } = await supabase
      .from('client_order')
      .select(`
        id,
        delivery_date,
        client_auth_id,
        client_user!client_order_client_auth_id_fkey(client_businessName)
      `)
      .eq('delivery_date', deliveryDate)
      .order('delivery_date', { ascending: true });

    if (ordersError) throw ordersError;
    if (!orders || orders.length === 0) return [];

    // Fetch order items
    const orderIds = orders.map((o: Order) => o.id);
    const { data: orderItems, error: itemsError } = await supabase
      .from('client_order_item')
      .select('*')
      .in('order_id', orderIds);

    if (itemsError) throw itemsError;

    const productIds = [...new Set(orderItems?.map((item: OrderItemDB) => item.product_id) || [])];
    const { data: products, error: productsError } = await supabase
      .from('product_list')
      .select('id, product_type, product_weight, product_gelato_type')   
      .in('id', productIds); 

    if (productsError) throw productsError;

    // Create maps for quick product lookup
    const productTypeMap = new Map(products?.map(p => [p.id, p.product_type]) || []);
    const productWeightMap = new Map(products?.map(p => [p.id, p.product_weight]) || []);
    const productGelatoTypeMap = new Map(products?.map(p => [p.id, p.product_gelato_type]) || []);

    // Prepare report data
    const reportData: ReportRow[] = [];

    orders.forEach((order: Order) => {
      const companyName = Array.isArray(order.client_user) 
        ? order.client_user[0]?.client_businessName || 'N/A'
        : order.client_user?.client_businessName || 'N/A';

      const items = orderItems?.filter((item: OrderItemDB) => item.order_id === order.id) || [];

      items.forEach((item: OrderItemDB) => {
        const productWeight = productWeightMap.get(item.product_id) || 0;
        const calculatedWeight = productWeight * item.quantity;
        const productType = productTypeMap.get(item.product_id) || 'N/A';
        const productGelatoType = productGelatoTypeMap.get(item.product_id) || 'Dairy';

        // Create the row data with product type from product_list
        const rowData: ReportRow = {
          'Delivery Date': formatDateShort(order.delivery_date),
          'Customer Full Name': companyName,
          'Memo/Description': item.product_name,
          'Type': productType,
          'Quantity': item.quantity,
          'Gelato Type': productGelatoType,
          'Weight (kg)': calculatedWeight
        };

        reportData.push(rowData);
      });
    });

    // Sort alphabetically by customer name, then by product name
    reportData.sort((a, b) => {
      const nameCompare = a['Customer Full Name'].localeCompare(b['Customer Full Name']);
      if (nameCompare !== 0) return nameCompare;
      return a['Memo/Description'].localeCompare(b['Memo/Description']);
    });

    return reportData;
  } catch (err) {
    console.error('Error generating report data:', err);
    return [];
  }
};


  const handlePreview = async (report: Report) => {
    const data = await generateReportData(report.deliveryDate);
    setPreviewData(data);
    setPreviewDate(report.deliveryDate);
    setShowPreview(true);
  };

  const handleDownload = async (report: Report) => {
  const data = await generateReportData(report.deliveryDate);
  
  if (data.length === 0) {
    alert('No data available for this date');
    return;
  }

  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths for 7 columns
  ws['!cols'] = [
    { wch: 12 },  // Delivery Date
    { wch: 28 },  // Customer Full Name
    { wch: 55 },  // Memo/Description
    { wch: 22 },  // Type
    { wch: 10 },  // Quantity
    { wch: 12 },  // Gelato Type
    { wch: 12 },  // Weight (kg)
  ];

  // Apply Poppins font to all cells
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellAddress]) continue;
      
      if (!ws[cellAddress].s) ws[cellAddress].s = {};
      ws[cellAddress].s.font = { name: 'Poppins', sz: 10 };
      
      // Make header row bold
      if (R === 0) {
        ws[cellAddress].s.font = { name: 'Poppins', sz: 10, bold: true };
      }
    }
  }

  // Set page setup for Letter size (11 x 8.5 inches) in landscape
  ws['!margins'] = { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 };
  ws['!pageSetup'] = {
    paperSize: 5, // Letter size (8.5 x 11 inches)
    orientation: 'landscape',
    scale: 100,
    fitToWidth: 1,
    fitToHeight: 0
  };

  XLSX.utils.book_append_sheet(wb, ws, 'Production Analysis');

  const fileName = `Production_Analysis_${formatDateShort(report.deliveryDate).replace(/ /g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

  const filteredReports = reports.filter(report =>
    report.summaryId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    formatDate(report.orderDate).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentReports = filteredReports.slice(startIndex, startIndex + itemsPerPage);

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
                      DELIVERY DATE
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      CREATED BY
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      CREATED AT
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">
                        Loading reports...
                      </td>
                    </tr>
                  ) : currentReports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">
                        No reports found.
                      </td>
                    </tr>
                  ) : (
                    currentReports.map((report) => (
                      <tr key={report.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <input type="checkbox" className="w-4 h-4" />
                        </td>
                        <td className="py-3 px-4 text-sm font-medium">{report.summaryId}</td>
                        <td className="py-3 px-4 text-sm">{formatDate(report.orderDate)}</td>
                        <td className="py-3 px-4 text-sm">{report.createdBy}</td>
                        <td className="py-3 px-4 text-sm">{formatDate(report.createdAt)}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handlePreview(report)}
                              className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors text-sm"
                              title="Preview Report"
                            >
                              <Eye size={16} />
                              Preview
                            </button>
                            <button
                              onClick={() => handleDownload(report)}
                              className="flex items-center gap-1 px-3 py-1 text-green-600 hover:bg-green-50 rounded transition-colors text-sm"
                              title="Download Excel"
                            >
                              <Download size={16} />
                              Download
                            </button>
                          </div>
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
                Page {currentPage} of {totalPages || 1}
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

          {/* Preview Modal */}
          {showPreview && (
            <div 
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              onClick={() => setShowPreview(false)}
            >
              <div 
                className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0 rounded-t-lg">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="text-green-600" size={24} />
                    <div>
                      <h3 className="text-xl font-bold" style={{ color: '#5C2E1F' }}>
                        Production Analysis - {formatDateShort(previewDate)}
                      </h3>
                      <p className="text-sm text-gray-600">{previewData.length} items</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
                
                <div className="flex-1 overflow-auto p-6">
                  <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-2 py-2 text-left font-bold">Delivery Date</th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-bold">Customer Full Name</th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-bold">Memo/Description</th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-bold">Type</th>
                        <th className="border border-gray-300 px-2 py-2 text-center font-bold">Quantity</th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-bold">Gelato Type</th>
                        <th className="border border-gray-300 px-2 py-2 text-right font-bold">Weight (kg)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-2 py-1">{row['Delivery Date']}</td>
                          <td className="border border-gray-300 px-2 py-1">{row['Customer Full Name']}</td>
                          <td className="border border-gray-300 px-2 py-1">{row['Memo/Description']}</td>
                          <td className="border border-gray-300 px-2 py-1">{row['Type']}</td>
                          <td className="border border-gray-300 px-2 py-1 text-center">{row['Quantity']}</td>
                          <td className="border border-gray-300 px-2 py-1">{row['Gelato Type']}</td>
                          <td className="border border-gray-300 px-2 py-1 text-right">{Number(row['Weight (kg)']).toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 shrink-0 rounded-b-lg">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="flex-1 px-4 py-2 rounded border-2 font-medium hover:bg-gray-50 transition-colors"
                    style={{ borderColor: '#5C2E1F', color: '#5C2E1F' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}