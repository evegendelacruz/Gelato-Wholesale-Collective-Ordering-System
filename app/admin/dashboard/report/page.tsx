'use client';
import Sidepanel from '@/app/components/sidepanel/page';
import Header from '@/app/components/header/page';
import ExcelJS from 'exceljs';
import { useState, useEffect } from 'react';
import { Search, Filter, Download, FileSpreadsheet, RefreshCw } from 'lucide-react';
import supabase from '@/lib/client';
interface ReportDataItem {
  deliveryDate: string;
  customerName: string;
  productName: string;
  type: string;
  quantity: number;
  gelatoType: string;
  weight: number;
}
interface ClientUser {
  client_businessName?: string;
}
interface DeliveryDateData {
  delivery_date: string;
  total_orders: number;
  total_items: number;
  milk_production_kg: number;
  sugar_syrup_production_kg: number;
  total_5l_tubs: number;
  total_2_5l_tubs: number;
  total_100ml_cups: number;
  total_ice_cream_cakes: number;
  items: ReportDataItem[];
}

interface Order {
  id: number;
  delivery_date: string;
  client_auth_id: string;
  client_user?: ClientUser | ClientUser[];
}

interface OrderItem {
  id: number;
  order_id: number;
  product_id: string;
  product_name: string;
  packaging_type: string;
  quantity: number;
  gelato_type: string;
  weight: number;
  unit_price: number;
  subtotal: number;
}

interface Report {
  id: string;
  summary_id: string;
  year: number;
  created_by: string;
  created_at: string;
  report_data: {
    [deliveryDate: string]: DeliveryDateData;
  };
}

interface SupabaseReportResponse {
  id: string;
  summary_id: string;
  year: number;
  created_by: string;
  created_at: string;
  updated_at?: string;
  report_data: {
    [deliveryDate: string]: DeliveryDateData;
  } | null;
}

export default function ReportPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{ [deliveryDate: string]: DeliveryDateData }>({});
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [previewDate, setPreviewDate] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    fetchReports();
  }, []);

  const formatPackaging = (packaging: string): string => {
    const packagingMap: Record<string, string> = {
      'tub_5l': 'Gelato [5L/Grey Tub]',
      'tub_2.5l': 'Gelato [2.5L/Grey Tub]',
      'cup_100ml': '100ml Cup',
      'pint_473ml': 'Pint [473ml]',
      'ice_cream_cake_6inch': 'Ice Cream Cake',
      'ice_cream_cake_8inch': 'Ice Cream Cake',
    };
    return packagingMap[packaging] || packaging;
  };

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

  const fetchReports = async () => {
  try {
    setLoading(true);
    
    const { data: reportsData, error } = await supabase
      .from('reports')
      .select('*')
      .order('year', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Transform the data to match our interface
    const transformedReports: Report[] = (reportsData || []).map((report: SupabaseReportResponse) => ({
      id: report.id,
      summary_id: report.summary_id,
      year: report.year,
      created_by: report.created_by,
      created_at: report.created_at,
      report_data: report.report_data || {}
    }));

    setReports(transformedReports);
  } catch (err) {
    console.error('Error fetching reports:', err);
    // Optionally show an error message to the user
    alert('Failed to load reports. Please try again.');
  } finally {
    setLoading(false);
  }
};

  const generateAllReports = async () => {
  try {
    setGenerating(true);

    const { data: orders, error: ordersError } = await supabase
      .from('client_order')
      .select('delivery_date')
      .order('delivery_date', { ascending: true });

    if (ordersError) throw ordersError;

    const uniqueDates = [...new Set(orders?.map((o: { delivery_date: string }) => o.delivery_date).filter(date => date != null) || [])];
    
    // Group dates by year
    const datesByYear: { [year: number]: string[] } = {};
    uniqueDates.forEach(date => {
      const year = new Date(date).getFullYear();
      if (!datesByYear[year]) {
        datesByYear[year] = [];
      }
      datesByYear[year].push(date);
    });

    // Generate report for each year
    for (const [year, dates] of Object.entries(datesByYear)) {
      await generateAndSaveYearReport(parseInt(year), dates);
    }

    await fetchReports();
    alert('All reports generated successfully!');
  } catch (err) {
    console.error('Error generating reports:', err);
    alert('Error generating reports. Please try again.');
  } finally {
    setGenerating(false);
  }
};

  const generateAndSaveYearReport = async (year: number, deliveryDates: string[]) => {
  try {
    const yearReportData: { [deliveryDate: string]: DeliveryDateData } = {};

    for (const deliveryDate of deliveryDates) {
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
      if (!orders || orders.length === 0) continue;

      const orderIds = orders.map((o: Order) => o.id);
      const { data: orderItems, error: itemsError } = await supabase
        .from('client_order_item')
        .select('*')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      let milkProduction = 0;
      let sugarSyrupProduction = 0;
      let tub5L = 0;
      let tub2_5L = 0;
      let cup100ml = 0;
      let iceCreamCake = 0;
      let totalItems = 0;

      const items: ReportDataItem[] = [];

      orders.forEach((order: Order) => {
        const companyName = Array.isArray(order.client_user) 
          ? order.client_user[0]?.client_businessName || 'N/A'
          : order.client_user?.client_businessName || 'N/A';

        const orderItemsList = orderItems?.filter((item: OrderItem) => item.order_id === order.id) || [];

        orderItemsList.forEach((item: OrderItem) => {
          const weight = item.weight || (item.quantity * 4);
          totalItems += item.quantity;
          
          if (item.gelato_type === 'Dairy') {
            milkProduction += weight;
          } else if (item.gelato_type === 'Sorbet') {
            sugarSyrupProduction += weight;
          }

          const type = formatPackaging(item.packaging_type);
          if (type.includes('5L/Grey Tub')) {
            tub5L += item.quantity;
          } else if (type.includes('2.5L/Grey Tub')) {
            tub2_5L += item.quantity;
          } else if (type.includes('100ml Cup')) {
            cup100ml += item.quantity;
          } else if (type.includes('Ice Cream Cake')) {
            iceCreamCake += item.quantity;
          }

          items.push({
            deliveryDate: order.delivery_date,
            customerName: companyName,
            productName: item.product_name,
            type: type,
            quantity: item.quantity,
            gelatoType: item.gelato_type || 'Dairy',
            weight: weight
          });
        });
      });

      items.sort((a, b) => {
        const nameCompare = a.customerName.localeCompare(b.customerName);
        if (nameCompare !== 0) return nameCompare;
        return a.productName.localeCompare(b.productName);
      });

      yearReportData[deliveryDate] = {
        delivery_date: deliveryDate,
        total_orders: orders.length,
        total_items: totalItems,
        milk_production_kg: milkProduction,
        sugar_syrup_production_kg: sugarSyrupProduction,
        total_5l_tubs: tub5L,
        total_2_5l_tubs: tub2_5L,
        total_100ml_cups: cup100ml,
        total_ice_cream_cakes: iceCreamCake,
        items: items
      };
    }

    const summaryId = `PROD-${year}`;
    
    await supabase
      .from('reports')
      .upsert({
        summary_id: summaryId,
        year: year,
        created_by: 'System',
        report_data: yearReportData
      }, {
        onConflict: 'year'
      });

  } catch (err) {
    console.error(`Error generating report for ${year}:`, err);
  }
};

  const handlePreview = async (report: Report) => {
    setPreviewData(report.report_data);
    setPreviewDate(report.year.toString());
    setShowPreview(true);
  };

  const handleDownload = async (report: Report) => {
  if (!report.report_data || Object.keys(report.report_data).length === 0) {
    alert('No data available for this year');
    return;
  }

  const workbook = new ExcelJS.Workbook();

  // Sort delivery dates
  const sortedDates = Object.keys(report.report_data).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  // Create a sheet for each delivery date
  sortedDates.forEach(deliveryDate => {
    const dateData = report.report_data[deliveryDate];
    const sheetName = formatDateShort(deliveryDate);
    const worksheet = workbook.addWorksheet(sheetName);

    // Define columns
    worksheet.columns = [
      { header: 'Delivery Date', key: 'deliveryDate', width: 12 },
      { header: 'Customer Full Name', key: 'customerName', width: 25 },
      { header: 'Memo/Description', key: 'description', width: 55 },
      { header: 'Type', key: 'type', width: 25 },
      { header: 'Quantity', key: 'quantity', width: 15 },
      { header: 'Gelato Type', key: 'gelatoType', width: 15 },
      { header: 'Weight (kg)', key: 'weight', width: 15 },
      { header: 'Milk Production (kg)', key: 'milkProduction', width: 25 }
    ];

    // Add data rows
    dateData.items.forEach((item, index) => {
      worksheet.addRow({
        deliveryDate: formatDateShort(item.deliveryDate),
        customerName: item.customerName,
        description: item.productName,
        type: item.type,
        quantity: item.quantity,
        gelatoType: item.gelatoType,
        weight: item.weight,
        milkProduction: index === 0 && dateData.milk_production_kg > 0 ? `Dairy\n${dateData.milk_production_kg}` : ''
      });
    });

    // Set page setup
    worksheet.pageSetup = {
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.5,
        right: 0.5,
        top: 0.5,
        bottom: 0.5,
        header: 0.3,
        footer: 0.3
      }
    };

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.height = 60;
    headerRow.font = { name: 'Poppins', size: 11, bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
    const milkProductionHeaderCell = headerRow.getCell(8);
      milkProductionHeaderCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF2CC' }
      };

    // Style data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.height = 40;
        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Poppins', size: 11 };
          
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
          
          if (colNumber === 2 || colNumber === 3) {
            cell.alignment = { vertical: 'top', horizontal: colNumber === 2 || colNumber === 3 ? 'left' : 'center', wrapText: true };
          } else {
            cell.alignment = { vertical: 'top', horizontal: 'center', wrapText: true };
          }
          
          if (colNumber === 8) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFF2CC' }
            };
          }
        });
      }
    });
  });

  // Generate Excel file and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Production_Analysis_${report.year}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};

  const filteredReports = reports.filter(report =>
  report.summary_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
  report.year.toString().includes(searchQuery)
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

                {/* Generate All Reports Button */}
                <button
                  onClick={generateAllReports}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 "
                  style={{ 
                    backgroundColor: generating ? '#FF5722' : '#FF5722',
                    color: 'white'
                  }}
                >
                  <RefreshCw size={20} className={generating ? 'animate-spin' : ''} />
                  <span>{generating ? 'Generating...' : 'Generate Reports'}</span>
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
                      YEAR
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      CREATED BY
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      GENERATED AT
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      CONSOLIDATED
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
                        No reports found. Click &ldquo;Generate Reports&rdquo; to create them.
                      </td>
                    </tr>
                  ) : (
                    currentReports.map((report) => (
                      <tr key={report.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <input type="checkbox" className="w-4 h-4" />
                        </td>
                        <td className="py-3 px-4 text-sm font-medium">{report.summary_id}</td>
                        <td className="py-3 px-4 text-sm">{report.year}</td>
                        <td className="py-3 px-4 text-sm">{report.created_by}</td>
                        <td className="py-3 px-4 text-sm">{formatDate(report.created_at)}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handlePreview(report)}
                              className="flex items-center gap-1 text-blue-600 hover:underline active:underline transition-colors text-sm cursor-pointer"
                            >
                              View Production Analysis
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
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
              onClick={() => setShowPreview(false)}
            >
              <div 
                className="rounded-lg max-w-7xl w-[200vh] max-h-[95vh] flex flex-col"
                style={{ backgroundColor: 'white' }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="px-6 py-4 flex justify-between items-center shrink-0 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet color="green" size={24} />
                    <div>
                      <h3 className="text-xl font-bold" style={{ color: '#5C2E1F' }}>
                        Production Analysis - {previewDate}
                      </h3>
                      <p className="text-sm text-black-300">
                        {Object.keys(previewData).length} delivery dates
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray hover:text-gray-300 text-3xl font-light leading-none"
                  >
                    ×
                  </button>
                </div>

                {/* Sheet Tabs */}
                <div className="px-6 py-3 border-b border-gray-200 overflow-x-auto flex gap-2 shrink-0">
                  {Object.keys(previewData).sort((a, b) => new Date(a).getTime() - new Date(b).getTime()).map((date) => (
                    <button
                      key={date}
                      onClick={() => setSelectedSheet(date)}
                      className={`px-4 py-2 rounded-t text-sm font-medium transition-colors whitespace-nowrap ${
                        selectedSheet === date || (selectedSheet === '' && date === Object.keys(previewData).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0])
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {formatDateShort(date)}
                    </button>
                  ))}
                </div>
                
                {/* Paper Container with Shadow */}
                <div className="flex-1 overflow-auto bg-gray-200 px-4 pb-4">
                  <div
                    className="bg-white mx-auto mt-8 shadow-2xl"
                    style={{
                      width: '8.5in',
                      minHeight: '11in',
                      padding: '0.5in',
                      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                    }}
                  >
                    {(() => {
                      const currentDate = selectedSheet || Object.keys(previewData).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
                      const currentData = previewData[currentDate];
                      
                      if (!currentData) return null;

                      return (
                        <div className="w-full">
                          <table className="w-full border-collapse" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '7px' }}>
                            <thead>
                              <tr>
                                <th className="border border-black px-2 py-2 text-center font-bold" style={{ fontSize: '7px', width: '10px' }}>
                                  Delivery Date
                                </th>
                                <th className="border border-black px-2 py-2 text-center font-bold" style={{ fontSize: '7px', width: '140px' }}>
                                  Customer Full Name
                                </th>
                                <th className="border border-black px-2 py-2 text-center font-bold" style={{ fontSize: '7px', width: '390px' }}>
                                  Memo/Description
                                </th>
                                <th className="border border-black px-2 py-2 text-center font-bold" style={{ fontSize: '7px', width: '150px' }}>
                                  Type
                                </th>
                                <th className="border border-black px-2 py-2 text-center font-bold" style={{ fontSize: '7px', width: '10px' }}>
                                  Quantity
                                </th>
                                <th className="border border-black px-2 py-2 text-center font-bold" style={{ fontSize: '7px', width: '90px' }}>
                                  Gelato Type
                                </th>
                                <th className="border border-black px-2 py-2 text-center font-bold" style={{ fontSize: '7px', width: '80px' }}>
                                  Weight (kg)
                                </th>
                                <th className="border border-black px-2 py-2 text-center font-bold" style={{ fontSize: '7px', backgroundColor: '#FFF2CC', width: '130px' }}>
                                  Milk Production (kg)
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentData.items.map((item, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="border border-black text-center" style={{ fontSize: '7px' }}>
                                    {formatDateShort(item.deliveryDate)}
                                  </td>
                                  <td className="border border-black text-left" style={{ fontSize: '7px' }}>
                                    {item.customerName}
                                  </td>
                                  <td className="border border-black text-left" style={{ fontSize: '7px' }}>
                                    {item.productName}
                                  </td>
                                  <td className="border border-black text-center" style={{ fontSize: '7px' }}>
                                    {item.type}
                                  </td>
                                  <td className="border border-black text-center" style={{ fontSize: '7px' }}>
                                    {item.quantity}
                                  </td>
                                  <td className="border border-black text-center" style={{ fontSize: '7px' }}>
                                    {item.gelatoType}
                                  </td>
                                  <td className="border border-black text-center" style={{ fontSize: '7px' }}>
                                    {item.weight}
                                  </td>
                                  <td className="border border-black text-center whitespace-pre-line" style={{ fontSize: '7px', backgroundColor: '#FFF2CC' }}>
                                    {index === 0 && currentData.milk_production_kg > 0 ? `Dairy\n${currentData.milk_production_kg}` : ''}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="px-6 pt-6 pb-6 flex gap-3 shrink-0 border-t border-gray-200">
                  <button
                    onClick={() => handleDownload(reports.find(r => r.year.toString() === previewDate)!)}
                    className="flex-1 px-6 py-3 rounded font-medium transition-colors text-white hover:opacity-90"
                    style={{ backgroundColor: '#10B981' }}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Download size={20} />
                      <span>Download Excel File</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="flex-1 px-6 py-3 rounded font-medium transition-colors bg-gray-300 hover:bg-gray-200"
                    style={{ color: 'black' }}
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