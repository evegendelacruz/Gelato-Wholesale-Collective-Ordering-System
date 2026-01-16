'use client';
import { useState, useEffect } from 'react';
import { Search, Download, FileSpreadsheet, RefreshCw, ChevronDown } from 'lucide-react';
import ExcelJS from 'exceljs';
import Sidepanel from '@/app/components/sidepanel/page';
import Header from '@/app/components/header/page';
import supabase from "@/lib/client";


interface DeliveryDateData {
  delivery_date: string;
  total_orders: number;
  orders: Array<{
    company: string;
    address: string;
    invoice: string;
  }>;
}

interface Report {
  id: string;
  summary_id: string;
  delivery_date: string;
  created_by: string;
  created_at: string;
  report_data: {
    [deliveryDate: string]: DeliveryDateData;
  };
}

interface ClientUser {
  client_businessName: string;
  client_delivery_address: string;
  ad_streetName: string;
  ad_country: string;
  ad_postal: string;
}

interface DeliveryDateOrder {
  delivery_date: string;
}

interface ReportDataFromDB {
  id: string;
  summary_id: string;
  delivery_date: string;
  created_by: string;
  created_at: string;
  report_data: {
    [deliveryDate: string]: DeliveryDateData;
  };
}

export default function DeliveryReportPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{ [deliveryDate: string]: DeliveryDateData }>({});
  const [previewDate, setPreviewDate] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'created-desc' | 'created-asc'>('date-desc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchReports();
  }, []);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateFull = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDayOfWeek = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  };

  const fetchReports = async () => {
  try {
    setLoading(true);
    
    const { data: reportsData, error } = await supabase
      .from('delivery_reports')
      .select('*')
      .order('delivery_date', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Group reports by year and filter out empty dates
    const yearlyReports: { [year: string]: Report } = {};
    
    (reportsData as ReportDataFromDB[] || []).forEach((report) => {
      const year = new Date(report.delivery_date).getFullYear().toString();
      
      if (!yearlyReports[year]) {
        yearlyReports[year] = {
          id: `year-${year}`,
          summary_id: `YEAR-${year}`,
          delivery_date: `${year}-01-01`,
          created_by: 'System',
          created_at: report.created_at,
          report_data: {}
        };
      }
      
      // **FIX: Only merge delivery dates that have valid orders**
      Object.keys(report.report_data).forEach((dateKey) => {
        const dateData = report.report_data[dateKey];
        if (dateData && dateData.orders && dateData.orders.length > 0) {
          yearlyReports[year].report_data[dateKey] = dateData;
        }
      });
    });

    // **FIX: Filter out years with no valid delivery dates**
    const transformedReports = Object.values(yearlyReports)
      .filter(report => Object.keys(report.report_data).length > 0)
      .sort((a, b) => 
        new Date(b.delivery_date).getFullYear() - new Date(a.delivery_date).getFullYear()
      );

    setReports(transformedReports);
  } catch (err) {
    console.error('Error fetching reports:', err);
    alert('Failed to load reports. Please try again.');
  } finally {
    setLoading(false);
  }
};

const generateAndSaveReport = async (deliveryDate: string) => {
  try {
    // Fetch ONLY existing (non-deleted) orders for this delivery date
    const { data: orders, error: ordersError } = await supabase
      .from('client_order')
      .select(`
        id,
        delivery_date,
        invoice_id,
        client_auth_id,
        client_user!client_order_client_auth_id_fkey(
          client_businessName, 
          client_delivery_address,
          ad_streetName,
          ad_country,
          ad_postal
        )
      `)
      .eq('delivery_date', deliveryDate)
      .order('client_auth_id', { ascending: true });

    if (ordersError) {
      console.error('Supabase error:', ordersError);
      throw ordersError;
    }
    
    // Filter out orders with invalid or missing invoice_id OR missing client_user data
    const validOrders = (orders || []).filter(order => {
      const hasValidInvoice = order.invoice_id && order.invoice_id.trim() !== '';
      const hasValidClient = order.client_user && 
        (Array.isArray(order.client_user) ? order.client_user.length > 0 : true);
      return hasValidInvoice && hasValidClient;
    });

    // Get the year for this delivery date
    const year = new Date(deliveryDate).getFullYear();
    
    // Check if ANY report exists for this year
    const { data: existingYearReports } = await supabase
      .from('delivery_reports')
      .select('*')
      .gte('delivery_date', `${year}-01-01`)
      .lte('delivery_date', `${year}-12-31`);

    const existingYearReport = existingYearReports && existingYearReports.length > 0 
      ? existingYearReports[0] 
      : null;

    // **FIX: If no valid orders, remove this date from report**
    if (!validOrders || validOrders.length === 0) {
      console.log(`No valid orders found for delivery date: ${deliveryDate}`);
      
      if (existingYearReport) {
        // Remove this delivery_date from report_data
        const updatedReportData = { ...existingYearReport.report_data };
        delete updatedReportData[deliveryDate];
        
        // If report_data is now empty, delete the entire report
        if (Object.keys(updatedReportData).length === 0) {
          await supabase
            .from('delivery_reports')
            .delete()
            .eq('id', existingYearReport.id);
        } else {
          // Otherwise, update with the modified report_data
          await supabase
            .from('delivery_reports')
            .update({
              report_data: updatedReportData,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingYearReport.id);
        }
      }
      
      // **IMPORTANT: Return here to prevent adding empty data**
      return;
    }

    // Transform orders into the format needed for the report
    const ordersList = validOrders.map((order) => {
      const clientData: ClientUser | undefined = Array.isArray(order.client_user) 
        ? order.client_user[0]
        : order.client_user;
      
      // Combine address fields
      const addressParts = [
        clientData?.ad_streetName,
        clientData?.ad_country,
        clientData?.ad_postal
      ].filter(Boolean);
      
      const combinedAddress = addressParts.length > 0 
        ? addressParts.join(', ') 
        : clientData?.client_delivery_address || 'N/A';
      
      return {
        company: clientData?.client_businessName || 'N/A',
        address: combinedAddress,
        invoice: order.invoice_id
      };
    });

    const newDateData = {
      delivery_date: deliveryDate,
      total_orders: validOrders.length,
      orders: ordersList
    };

    if (existingYearReport) {
      // Before updating, clean up any stale data by re-validating all dates in report_data
      const cleanedReportData: { [deliveryDate: string]: DeliveryDateData } = {};
      
      for (const [existingDate, existingData] of Object.entries(existingYearReport.report_data)) {
        // Type guard to ensure existingData is DeliveryDateData
        if (!existingData || typeof existingData !== 'object' || !('orders' in existingData)) {
          continue;
        }
        
        const typedExistingData = existingData as DeliveryDateData;
        
        if (existingDate === deliveryDate) {
          // This date will be replaced with fresh data
          continue;
        }
        
        // Re-validate orders for existing dates still exist in database
        const invoiceIds = typedExistingData.orders.map(o => o.invoice);
        
        // **FIX: Skip validation if no invoice IDs**
        if (invoiceIds.length === 0) {
          continue;
        }
        
        const { data: stillExistingOrders } = await supabase
          .from('client_order')
          .select('invoice_id, client_user!client_order_client_auth_id_fkey(client_businessName)')
          .in('invoice_id', invoiceIds)
          .eq('delivery_date', existingDate);
        
        // Only keep orders that still exist with valid client data
        const validExistingOrders = typedExistingData.orders.filter(order => 
          stillExistingOrders?.some(dbOrder => 
            dbOrder.invoice_id === order.invoice && 
            dbOrder.client_user
          )
        );
        
        // **FIX: Only keep this date if it has valid orders**
        if (validExistingOrders.length > 0) {
          cleanedReportData[existingDate] = {
            delivery_date: typedExistingData.delivery_date,
            total_orders: validExistingOrders.length,
            orders: validExistingOrders
          };
        }
      }
      
      // Add the new/updated date data
      cleanedReportData[deliveryDate] = newDateData;

      const result = await supabase
        .from('delivery_reports')
        .update({
          report_data: cleanedReportData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingYearReport.id);

      if (result.error) {
        console.error('Database update error:', JSON.stringify(result.error, null, 2));
        throw new Error(`Database error: ${result.error.message || 'Unknown error'}`);
      }
    } else {
      // Create new year report
      const reportData = {
        [deliveryDate]: newDateData
      };

      const summaryId = `YEAR-${year}`;
      
      const result = await supabase
        .from('delivery_reports')
        .insert({
          summary_id: summaryId,
          delivery_date: `${year}-01-01`,
          created_by: 'System',
          report_data: reportData
        });

      if (result.error) {
        console.error('Database insert error:', JSON.stringify(result.error, null, 2));
        throw new Error(`Database error: ${result.error.message || 'Unknown error'}`);
      }
    }

    console.log(`Successfully generated report for ${deliveryDate} with ${validOrders.length} valid orders`);

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Error generating report for ${deliveryDate}:`, errorMessage, err);
    throw err;
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

    const uniqueDates = [...new Set((orders as DeliveryDateOrder[] || []).map((o) => o.delivery_date).filter(date => date != null))];

    console.log('Generating reports for dates:', uniqueDates);

    for (const deliveryDate of uniqueDates) {
      await generateAndSaveReport(deliveryDate);
    }

    // Wait a moment for database to fully update
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Force refresh from database
    await fetchReports();
    
    setShowSuccessModal(true);
  } catch (err) {
    console.error('Error generating reports:', err);
    setShowErrorModal(true);
  } finally {
    setGenerating(false);
  }
};

 const handlePreview = async (report: Report) => {
  const validPreviewData: { [deliveryDate: string]: DeliveryDateData } = {};
  
  Object.keys(report.report_data).forEach((dateKey) => {
    const dateData = report.report_data[dateKey];
    if (dateData && dateData.orders && dateData.orders.length > 0) {
      validPreviewData[dateKey] = dateData;
    }
  });
  
  if (Object.keys(validPreviewData).length === 0) {
    alert('No valid delivery data available for preview');
    return;
  }
  
  setPreviewData(validPreviewData);
  setPreviewDate(Object.keys(validPreviewData).sort()[0]);
  setShowPreview(true);
};


  const handleDownload = async (report: Report) => {
  // **FIX: Filter out empty dates first**
  const validDates = Object.keys(report.report_data).filter(dateKey => {
    const dateData = report.report_data[dateKey];
    return dateData && dateData.orders && dateData.orders.length > 0;
  });

  if (validDates.length === 0) {
    alert('No data available for this year');
    return;
  }

  const year = new Date(report.delivery_date).getFullYear();
  const workbook = new ExcelJS.Workbook();

  // Get all delivery dates sorted (already filtered)
  const deliveryDates = validDates.sort();

  // Create a sheet for each delivery date in the year
  for (const sheetDate of deliveryDates) {
    const dateData = report.report_data[sheetDate];
    
    // Double-check (shouldn't be needed after filter, but safe)
    if (!dateData || !dateData.orders || dateData.orders.length === 0) {
      console.log(`Skipping ${sheetDate} - no orders`);
      continue;
    }

    // Format sheet name: "Jan 15" or "Dec 31"
    const sheetName = new Date(sheetDate).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    
    const worksheet = workbook.addWorksheet(sheetName);

    // Set column widths
    worksheet.columns = [
      { key: 'no', width: 6 },
      { key: 'company', width: 25 },
      { key: 'address', width: 30 },
      { key: 'operatingHours', width: 20 },
      { key: 'invoice', width: 12 },
      { key: 'items', width: 25 },
      { key: 'remarks', width: 20 },
      { key: 'temp', width: 10 },
      { key: 'route', width: 10 }
    ];

    // Header section with MOMOLATO branding
    worksheet.mergeCells('A1:F1');
    const headerCell = worksheet.getCell('A1');
    headerCell.value = 'MOMOLATO';
    headerCell.font = { name: 'Arial Black', size: 24, bold: true };
    headerCell.alignment = { horizontal: 'left', vertical: 'middle' };

    // Date box (top right)
    worksheet.mergeCells('G1:H1');
    const dateHeaderCell = worksheet.getCell('G1');
    dateHeaderCell.value = 'Date';
    dateHeaderCell.font = { name: 'Arial', size: 11, bold: true };
    dateHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
    dateHeaderCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    worksheet.mergeCells('I1:I1');
    const dateValueCell = worksheet.getCell('I1');
    dateValueCell.value = formatDateFull(sheetDate);
    dateValueCell.font = { name: 'Arial', size: 11 };
    dateValueCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    dateValueCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Driver box (empty)
    worksheet.mergeCells('G2:H2');
    const driverHeaderCell = worksheet.getCell('G2');
    driverHeaderCell.value = 'Driver';
    driverHeaderCell.font = { name: 'Arial', size: 11, bold: true };
    driverHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
    driverHeaderCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    worksheet.mergeCells('I2:I2');
    const driverValueCell = worksheet.getCell('I2');
    driverValueCell.value = ''; // Empty driver field
    driverValueCell.font = { name: 'Arial', size: 11, bold: true };
    driverValueCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    driverValueCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Day of week
    const dayCell = worksheet.getCell('I3');
    dayCell.value = `(${getDayOfWeek(sheetDate)})`;
    dayCell.font = { name: 'Arial', size: 11, bold: true };
    dayCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Important notes section
    worksheet.getRow(2).height = 70;
    worksheet.mergeCells('A2:F3');
    const notesCell = worksheet.getCell('A2');
    notesCell.value = 'IMPORTANT NOTE:\nKindly follow TIMINGS strictly and accordingly. Inform office if going to be late.\nKindly ensure all invoice is signed/acknowledged.\nKindly write down truck temperature.\nKindly check orders with invoice delivery to make sure number of items is correct.';
    notesCell.font = { name: 'Arial', size: 9, bold: true };
    notesCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

    // Table header row
    const tableHeaderRow = worksheet.getRow(4);
    tableHeaderRow.values = ['No.', 'Company', 'Address', 'Operating Hours', 'Invoice', 'Items', 'Remarks', 'Temp °', 'Route #'];
    tableHeaderRow.height = 30;
    tableHeaderRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    tableHeaderRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    tableHeaderRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF0000' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add data rows
    dateData.orders.forEach((order, index) => {
      const row = worksheet.addRow({
        no: index + 1,
        company: order.company,
        address: order.address,
        operatingHours: '',
        invoice: order.invoice,
        items: '',
        remarks: '',
        temp: '',
        route: ''
      });

      row.height = 40;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        
        if (colNumber === 1) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        }
      });
    });

    // Page setup
    worksheet.pageSetup = {
      orientation: 'landscape',
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
  }

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Delivery_Reports_${year}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};

  const filteredReports = reports
    .filter(report => {
      const matchesSearch = report.summary_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.delivery_date.includes(searchQuery);
      return matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime();
        case 'date-asc':
          return new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime();
        case 'created-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'created-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default:
          return 0;
      }
    });

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentReports = filteredReports.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div
          className="min-h-screen flex"
          style={{ fontFamily: '"Roboto Condensed", sans-serif' }}
        >
          <Sidepanel />
          <div className="flex-1 flex flex-col">
            <Header />
        <main className="flex-1 p-6" style={{ backgroundColor: '#FCF0E3' }}>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold" style={{ color: '#5C2E1F' }}>
                Delivery Reports
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

                {/* Sort By Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <ChevronDown size={20} />
                    <span>Sort</span>
                  </button>
                  
                  {showSortDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                      <button
                        onClick={() => {
                          setSortBy('date-desc');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${sortBy === 'date-desc' ? 'bg-gray-100 font-semibold' : ''}`}
                      >
                        Delivery Date (Newest First)
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('date-asc');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${sortBy === 'date-asc' ? 'bg-gray-100 font-semibold' : ''}`}
                      >
                        Delivery Date (Oldest First)
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('created-desc');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${sortBy === 'created-desc' ? 'bg-gray-100 font-semibold' : ''}`}
                      >
                        Date Created (Newest First)
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('created-asc');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 rounded-b-lg ${sortBy === 'created-asc' ? 'bg-gray-100 font-semibold' : ''}`}
                      >
                        Date Created (Oldest First)
                      </button>
                    </div>
                  )}
                </div>

                {/* Generate All Reports Button */}
                <button
                  onClick={generateAllReports}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
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
                      DELIVERY DATE
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      TOTAL ORDERS
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      CREATED BY
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      GENERATED AT
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                {loading ? (
                    <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                        Loading reports...
                    </td>
                    </tr>
                ) : currentReports.length === 0 ? (
                    <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                        No reports found. Click &quot;Generate Reports&quot; to create them.
                    </td>
                    </tr>
                ) : (
                    currentReports.map((report) => {
                    const year = new Date(report.delivery_date).getFullYear();
                    const totalOrders = Object.values(report.report_data).reduce((sum, data) => sum + (data?.total_orders || 0), 0);
                    const deliveryDatesCount = Object.keys(report.report_data).length;
                    
                    return (
                        <tr key={report.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4">
                            <input type="checkbox" className="w-4 h-4" />
                        </td>
                        <td className="py-3 px-4 text-sm font-medium">{report.summary_id}</td>
                        <td className="py-3 px-4 text-sm">{year} ({deliveryDatesCount} dates)</td>
                        <td className="py-3 px-4 text-sm">{totalOrders}</td>
                        <td className="py-3 px-4 text-sm">{report.created_by}</td>
                        <td className="py-3 px-4 text-sm">{formatDate(report.created_at)}</td>
                        <td className="py-3 px-4">
                            <div className="flex gap-2">
                            <button
                                onClick={() => handlePreview(report)}
                                className="flex items-center gap-1 text-blue-600 hover:underline transition-colors text-sm"
                            >
                                View Report
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                                onClick={() => handleDownload(report)}
                                className="flex items-center gap-1 text-green-600 hover:underline transition-colors text-sm"
                            >
                                <Download size={16} />
                                Download
                            </button>
                            </div>
                        </td>
                        </tr>
                    );
                    })
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

          {/* Success Modal */}
          {showSuccessModal && (
            <div 
              className="fixed inset-0 flex items-center justify-center z-50"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            >
              <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#5C2E1F' }}>
                  Success!
                </h2>
                <p className="text-gray-600 mb-6">
                  All delivery reports generated successfully!
                </p>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="px-16 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#10B981' }}
                >
                  OK
                </button>
              </div>
            </div>
          )}

          {/* Error Modal */}
          {showErrorModal && (
            <div 
              className="fixed inset-0 flex items-center justify-center z-50"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            >
              <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#5C2E1F' }}>
                  Error
                </h2>
                <p className="text-gray-600 mb-6">
                  Error generating reports. Please try again.
                </p>
                <button
                  onClick={() => setShowErrorModal(false)}
                  className="px-16 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity bg-red-600"
                >
                  OK
                </button>
              </div>
            </div>
          )}

          {/* Preview Modal */}
            {showPreview && (
            <div 
                className="fixed inset-0 flex items-center justify-center z-50 p-4"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
                onClick={() => setShowPreview(false)}
            >
                <div 
                className="rounded-lg max-w-6xl w-full max-h-[95vh] flex flex-col"
                style={{ backgroundColor: 'white' }}
                onClick={(e) => e.stopPropagation()}
                >
                {/* Header */}
                <div className="px-6 py-4 flex justify-between items-center shrink-0 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                    <FileSpreadsheet color="green" size={24} />
                    <div>
                        <h3 className="text-xl font-bold" style={{ color: '#5C2E1F' }}>
                        Delivery Reports - {new Date(previewDate).getFullYear()}
                        </h3>
                        <p className="text-sm text-gray-600">
                        {Object.keys(previewData).length} delivery dates with {Object.values(previewData).reduce((sum, data) => sum + (data?.total_orders || 0), 0)} total orders
                        </p>
                    </div>
                    </div>
                    <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-500 hover:text-gray-700 text-3xl font-light leading-none"
                    >
                    ×
                    </button>
                </div>

                {/* Tabs for each delivery date */}
                <div className="px-6 py-3 border-b border-gray-200 overflow-x-auto shrink-0">
                    <div className="flex gap-2">
                    {Object.keys(previewData).sort().map((date) => (
                        <button
                        key={date}
                        onClick={() => setPreviewDate(date)}
                        className={`px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors ${
                            previewDate === date
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        >
                        {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        <span className="ml-2 text-xs opacity-75">
                            ({previewData[date]?.total_orders || 0})
                        </span>
                        </button>
                    ))}
                    </div>
                </div>

                {/* Paper Container with Shadow */}
                <div className="flex-1 overflow-auto bg-gray-200 px-4 pb-4">
                    <div
                    className="bg-white mx-auto mt-8 shadow-2xl"
                    style={{
                        width: '11in',
                        minHeight: '8.5in',
                        padding: '0.5in',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                    }}
                    >
                    {(() => {
                        const currentData = previewData[previewDate];
                        
                        if (!currentData) return (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            No data available for this date
                        </div>
                        );

                        return (
                        <div className="w-full">
                            {/* Header Section */}
                            <div className="mb-4 pb-4 border-b-2 border-gray-300">
                            <h1 className="text-3xl font-bold">MOMOLATO</h1>
                            <div className="flex justify-between items-start mt-2">
                                <div className="text-sm">
                                <p className="font-bold">Date: {formatDateFull(previewDate)}</p>
                                <p className="font-bold">({getDayOfWeek(previewDate)})</p>
                                </div>
                                <div className="text-sm">
                                <p className="font-bold">Driver: </p>
                                </div>
                            </div>
                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                <p className="text-xs font-bold">IMPORTANT NOTE:</p>
                                <p className="text-xs">Kindly follow TIMINGS strictly and accordingly. Inform office if going to be late.</p>
                                <p className="text-xs">Kindly ensure all invoice is signed/acknowledged.</p>
                                <p className="text-xs">Kindly write down truck temperature.</p>
                                <p className="text-xs">Kindly check orders with invoice delivery to make sure number of items is correct.</p>
                            </div>
                            </div>

                            {/* Table */}
                            <table className="w-full border-collapse" style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px' }}>
                            <thead>
                                <tr>
                                <th className="border border-black px-2 py-2 text-center font-bold bg-red-600 text-white" style={{ fontSize: '9px', width: '40px' }}>
                                    No.
                                </th>
                                <th className="border border-black px-2 py-2 text-center font-bold bg-red-600 text-white" style={{ fontSize: '9px', width: '180px' }}>
                                    Company
                                </th>
                                <th className="border border-black px-2 py-2 text-center font-bold bg-red-600 text-white" style={{ fontSize: '9px', width: '220px' }}>
                                    Address
                                </th>
                                <th className="border border-black px-2 py-2 text-center font-bold bg-red-600 text-white" style={{ fontSize: '9px', width: '120px' }}>
                                    Operating Hours
                                </th>
                                <th className="border border-black px-2 py-2 text-center font-bold bg-red-600 text-white" style={{ fontSize: '9px', width: '80px' }}>
                                    Invoice
                                </th>
                                <th className="border border-black px-2 py-2 text-center font-bold bg-red-600 text-white" style={{ fontSize: '9px', width: '150px' }}>
                                    Items
                                </th>
                                <th className="border border-black px-2 py-2 text-center font-bold bg-red-600 text-white" style={{ fontSize: '9px', width: '120px' }}>
                                    Remarks
                                </th>
                                <th className="border border-black px-2 py-2 text-center font-bold bg-red-600 text-white" style={{ fontSize: '9px', width: '60px' }}>
                                    Temp °
                                </th>
                                <th className="border border-black px-2 py-2 text-center font-bold bg-red-600 text-white" style={{ fontSize: '9px', width: '60px' }}>
                                    Route #
                                </th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentData.orders.map((order, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="border border-black text-center px-2 py-2" style={{ fontSize: '9px' }}>
                                    {index + 1}
                                    </td>
                                    <td className="border border-black text-left px-2 py-2" style={{ fontSize: '9px' }}>
                                    {order.company}
                                    </td>
                                    <td className="border border-black text-left px-2 py-2" style={{ fontSize: '9px' }}>
                                    {order.address}
                                    </td>
                                    <td className="border border-black text-center px-2 py-2" style={{ fontSize: '9px' }}>
                                    {/* Empty for manual entry */}
                                    </td>
                                    <td className="border border-black text-center px-2 py-2" style={{ fontSize: '9px' }}>
                                    {order.invoice}
                                    </td>
                                    <td className="border border-black text-center px-2 py-2" style={{ fontSize: '9px' }}>
                                    {/* Empty for manual entry */}
                                    </td>
                                    <td className="border border-black text-center px-2 py-2" style={{ fontSize: '9px' }}>
                                    {/* Empty for manual entry */}
                                    </td>
                                    <td className="border border-black text-center px-2 py-2" style={{ fontSize: '9px' }}>
                                    {/* Empty for manual entry */}
                                    </td>
                                    <td className="border border-black text-center px-2 py-2" style={{ fontSize: '9px' }}>
                                    {/* Empty for manual entry */}
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
                    onClick={() => {
                        const report = reports.find(r => new Date(r.delivery_date).getFullYear() === new Date(previewDate).getFullYear());
                        if (report) handleDownload(report);
                    }}
                    className="flex-1 px-6 py-3 rounded font-medium transition-colors text-white hover:opacity-90"
                    style={{ backgroundColor: '#10B981' }}
                    >
                    <div className="flex items-center justify-center gap-2">
                        <Download size={20} />
                        <span>Download Excel File ({new Date(previewDate).getFullYear()})</span>
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