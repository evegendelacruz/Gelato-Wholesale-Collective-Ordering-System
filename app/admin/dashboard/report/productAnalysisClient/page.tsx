'use client';
import Sidepanel from '@/app/components/sidepanel/page';
import Header from '@/app/components/header/page';
import ExcelJS from 'exceljs';
import { useState, useEffect } from 'react';
import { Search, Filter, Download, FileSpreadsheet, RefreshCw, ChevronDown } from 'lucide-react';
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

interface ConsolidatedItem {
  productName: string;
  type: string;
  quantity: number;
  costPerTab: number;
  pricePerTab: number;
  totalCost: number;
  totalSales: number;
  grossMargin: number;
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
  items: ReportDataItem[] | ConsolidatedItem[];
  type_totals?: { [key: string]: number }
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
  product_type: string;
  quantity: number;
  product_gelato_type: string;
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

export default function ReportClientPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{ [deliveryDate: string]: DeliveryDateData }>({});
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [previewDate, setPreviewDate] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [sortBy, setSortBy] = useState<'year-desc' | 'year-asc' | 'date-desc' | 'date-asc'>('year-desc');
  const [filterBy, setFilterBy] = useState<'all' | '2024' | '2025' | '2026'>('all');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
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
    setShowSuccessModal(true); 
  } catch (err) {
    console.error('Error generating reports:', err);
    setShowErrorModal(true); 
  } finally {
    setGenerating(false);
  }
};

  const generateAndSaveYearReport = async (year: number, deliveryDates: string[]) => {
  try {
    const yearReportData: { [deliveryDate: string]: DeliveryDateData } = {};
    
    // Group dates by month
    const datesByMonth = new Map<string, string[]>();
    deliveryDates.forEach(date => {
      const monthKey = new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!datesByMonth.has(monthKey)) {
        datesByMonth.set(monthKey, []);
      }
      datesByMonth.get(monthKey)!.push(date);
    });

    // Track consolidated data per month
    const monthlyConsolidatedMaps = new Map<string, Map<string, {
      productName: string;
      type: string;
      quantity: number;
      cost: number;
      price: number;
    }>>();

    for (const deliveryDate of deliveryDates) {
      const monthKey = new Date(deliveryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      
      if (!monthlyConsolidatedMaps.has(monthKey)) {
        monthlyConsolidatedMaps.set(monthKey, new Map());
      }
      const consolidatedMap = monthlyConsolidatedMaps.get(monthKey)!;

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

      const productIds = [...new Set(orderItems?.map((item: OrderItem) => item.product_id) || [])];
      const { data: products, error: productsError } = await supabase
        .from('product_list')
        .select('id, product_type, product_weight, product_gelato_type, product_milkbased, product_sugarbased, product_cost, product_price')
        .in('id', productIds);

      if (productsError) throw productsError;

      const productTypeMap = new Map(products?.map(p => [p.id, p.product_type]) || []);
      const productWeightMap = new Map(products?.map(p => [p.id, p.product_weight]) || []);
      const productGelatoTypeMap = new Map(products?.map(p => [p.id, p.product_gelato_type]) || []);
      const productMilkBasedMap = new Map(products?.map(p => [p.id, p.product_milkbased]) || []);
      const productSugarBasedMap = new Map(products?.map(p => [p.id, p.product_sugarbased]) || []);
      const productCostMap = new Map(products?.map(p => [p.id, p.product_cost]) || []);
      const productPriceMap = new Map(products?.map(p => [p.id, p.product_price]) || []);

      let milkProduction = 0;
      let sugarSyrupProduction = 0;
      let totalItems = 0;
      const items: ReportDataItem[] = [];

      orders.forEach((order: Order) => {
        const companyName = Array.isArray(order.client_user) 
          ? order.client_user[0]?.client_businessName || 'N/A'
          : order.client_user?.client_businessName || 'N/A';

        const orderItemsList = orderItems?.filter((item: OrderItem) => item.order_id === order.id) || [];

        orderItemsList.forEach((item: OrderItem) => {
          const productWeight = productWeightMap.get(item.product_id) || 0;
          const calculatedWeightNum = productWeight * item.quantity;
          const productType = productTypeMap.get(item.product_id) || item.product_type || 'N/A';
          const productGelatoType = productGelatoTypeMap.get(item.product_id) || 'Dairy';
          const productCost = productCostMap.get(item.product_id) || 0;
          const productPrice = productPriceMap.get(item.product_id) || 0;
          
          totalItems += item.quantity;
          
          if (productGelatoType === 'Dairy') {
            const milkBased = productMilkBasedMap.get(item.product_id) || 0;
            milkProduction += milkBased * item.quantity;
          } else if (productGelatoType === 'Sorbet') {
            const sugarBased = productSugarBasedMap.get(item.product_id) || 0;
            sugarSyrupProduction += sugarBased * item.quantity;
          }

          items.push({
            deliveryDate: order.delivery_date,
            customerName: companyName,
            productName: item.product_name,
            type: productType,
            quantity: item.quantity,
            gelatoType: productGelatoType,
            weight: parseFloat(calculatedWeightNum.toFixed(1))
          });

          // Aggregate for monthly consolidated view
          const key = `${item.product_name}|${productType}`;
          if (consolidatedMap.has(key)) {
            const existing = consolidatedMap.get(key)!;
            existing.quantity += item.quantity;
          } else {
            consolidatedMap.set(key, {
              productName: item.product_name,
              type: productType,
              quantity: item.quantity,
              cost: productCost,
              price: productPrice
            });
          }
        });
      });

      items.sort((a, b) => {
        const nameCompare = a.customerName.localeCompare(b.customerName);
        if (nameCompare !== 0) return nameCompare;
        return a.productName.localeCompare(b.productName);
      });

      const typeTotals = new Map<string, number>();
      items.forEach(item => {
        const currentTotal = typeTotals.get(item.type) || 0;
        typeTotals.set(item.type, currentTotal + item.quantity);
      });

      yearReportData[deliveryDate] = {
        delivery_date: deliveryDate,
        total_orders: orders.length,
        total_items: totalItems,
        milk_production_kg: Math.round(milkProduction),
        sugar_syrup_production_kg: Math.round(sugarSyrupProduction),
        items: items,
        type_totals: Object.fromEntries(typeTotals)
      };
    }

    // Create monthly consolidated sheets
    monthlyConsolidatedMaps.forEach((consolidatedMap, monthKey) => {
      const consolidatedItems: ConsolidatedItem[] = Array.from(consolidatedMap.values()).map(item => {
      const totalCost = item.cost * item.quantity;
      const totalSales = item.price * item.quantity;
      const grossMargin = totalSales > 0 ? (totalCost / totalSales) * 100 : 0;

      return {
        productName: item.productName,
        type: item.type,
        quantity: item.quantity,
        costPerTab: item.cost,
        pricePerTab: item.price,
        totalCost: totalCost,
        totalSales: totalSales,
        grossMargin: grossMargin
      };
    });

      consolidatedItems.sort((a, b) => a.productName.localeCompare(b.productName));

      yearReportData[`${monthKey} Consolidated`] = {
        delivery_date: `${monthKey} Consolidated`,
        total_orders: 0,
        total_items: 0,
        milk_production_kg: 0,
        sugar_syrup_production_kg: 0,
        items: consolidatedItems,
        type_totals: {}
      };
    });

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

  // Separate regular dates and consolidated sheets
  const allKeys = Object.keys(report.report_data);
  const regularDates = allKeys.filter(key => !key.includes('Consolidated')).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const consolidatedSheets = allKeys.filter(key => key.includes('Consolidated')).sort();

  // Type guard function
  const isReportDataItem = (item: ReportDataItem | ConsolidatedItem): item is ReportDataItem => {
    return 'deliveryDate' in item;
  };

  // Create a sheet for each delivery date
  regularDates.forEach(deliveryDate => {
    const dateData = report.report_data[deliveryDate];
    const sheetName = formatDateShort(deliveryDate);
    const worksheet = workbook.addWorksheet(sheetName);

    // Define columns
    worksheet.columns = [
      { header: 'Delivery Date', key: 'deliveryDate', width: 12 },
      { header: 'Customer Full Name', key: 'customerName', width: 25 },
      { header: 'Memo/Description', key: 'description', width: 55 },
      { header: 'Quantity', key: 'quantity', width: 15 },
      { header: 'Type', key: 'type', width: 25 },
      { header: 'Gelato Type', key: 'gelatoType', width: 15 },
      { header: 'Weight (kg)', key: 'weight', width: 15 },
      { header: 'Milk Production (kg)', key: 'milkProduction', width: 25 }
    ];

    // Filter only ReportDataItem items and sort by customer name, then product name
    const reportItems = dateData.items.filter(isReportDataItem);
    const sortedItems = [...reportItems].sort((a, b) => {
      const nameCompare = a.customerName.localeCompare(b.customerName);
      if (nameCompare !== 0) return nameCompare;
      return a.productName.localeCompare(b.productName);
    });

    // Track the number of data rows
    const dataRowsCount = sortedItems.length;

    // Build summary array - ALWAYS add these sections
    const summaryContent = [];
    
    // Add Dairy section - ALWAYS
    summaryContent.push({ text: 'Dairy', isBold: false });
    summaryContent.push({ text: (dateData.milk_production_kg || 0).toString(), isBold: false });
    summaryContent.push({ text: '', isBold: false });
    
    // Add Sugar Syrup Production section - ALWAYS
    summaryContent.push({ text: 'Sugar Syrup Production (kg)', isBold: true });
    summaryContent.push({ text: 'Sorbet', isBold: false });
    summaryContent.push({ text: (dateData.sugar_syrup_production_kg || 0).toString(), isBold: false });
    summaryContent.push({ text: '', isBold: false });
    
    // Add Type Totals section
    if (dateData.type_totals) {
      Object.entries(dateData.type_totals).forEach(([type, count]) => {
        summaryContent.push({ text: `Total ${type}`, isBold: true });
        summaryContent.push({ text: count.toString(), isBold: false });
        summaryContent.push({ text: '', isBold: false });
      });
    }

    // Determine total rows needed
    const totalRows = Math.max(dataRowsCount, summaryContent.length);

    // Add all rows (data + summary side by side)
    const boldRows = []; // Track which rows need bold in column 8

    for (let i = 0; i < totalRows; i++) {
      const item = i < dataRowsCount ? sortedItems[i] : null;
      const summaryItem = i < summaryContent.length ? summaryContent[i] : null;

      const row = worksheet.addRow({
        deliveryDate: item ? formatDateShort(item.deliveryDate) : '',
        customerName: item ? item.customerName : '',
        description: item ? item.productName : '',
        quantity: item ? item.quantity : '',
        type: item ? item.type : '',
        gelatoType: item ? item.gelatoType : '',
        weight: item ? item.weight : '',
        milkProduction: summaryItem ? summaryItem.text : ''
      });

      // Format weight cell
      if (item) {
        const weightCell = row.getCell(7);
        weightCell.numFmt = '0.0';
      }

      // Track if this row needs bold
      if (summaryItem?.isBold) {
        boldRows.push(row.number);
      }
    }

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
    
    // Highlight Milk Production header
    const milkProductionHeaderCell = headerRow.getCell(8);
    milkProductionHeaderCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF2CC' }
    };

    // Style data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Poppins', size: 11 };
          
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
          
          // Left align customer name and description with text wrap, center others with text wrap
          if (colNumber === 2 || colNumber === 3) {
            cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
          } else {
            cell.alignment = { vertical: 'top', horizontal: 'center', wrapText: true };
          }
          
          // Highlight Milk Production column
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

    // Apply bold to specific rows in column 8 AFTER all other styling
    boldRows.forEach(rowNumber => {
      const cell = worksheet.getRow(rowNumber).getCell(8);
      cell.font = { name: 'Poppins', size: 11, bold: true };
    });
  });

  // Create Monthly Consolidated Sheets
  consolidatedSheets.forEach(consolidatedKey => {
    const consolidatedData = report.report_data[consolidatedKey];
    const sheetName = consolidatedKey.replace(' Consolidated', ''); // e.g., "Jan 2024"
    const consolidatedSheet = workbook.addWorksheet(sheetName);
    
    consolidatedSheet.columns = [
      { header: 'Memo/Description', key: 'description', width: 55 },
      { header: 'Type', key: 'type', width: 25 },
      { header: 'Quantity', key: 'quantity', width: 15 },
      { header: 'Cost per Tab', key: 'costPerTab', width: 15 },
      { header: 'Price per Tab', key: 'pricePerTab', width: 15 },
      { header: 'Total Cost', key: 'totalCost', width: 15 },
      { header: 'Total Sales', key: 'totalSales', width: 15 },
      { header: 'Gross Margin', key: 'grossMargin', width: 15 }
    ];

    const consolidatedItems = consolidatedData.items as unknown as ConsolidatedItem[];
    
    consolidatedItems.forEach(item => {
      consolidatedSheet.addRow({
        description: item.productName,
        type: item.type,
        quantity: item.quantity,
        costPerTab: item.costPerTab,
        pricePerTab: item.pricePerTab,
        totalCost: item.totalCost,
        totalSales: item.totalSales,
        grossMargin: item.grossMargin
      });
    });

    // Style header row
    const headerRow = consolidatedSheet.getRow(1);
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
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };
    });

    // Style data rows
    consolidatedSheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Poppins', size: 11 };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
          
          if (colNumber === 1) {
            cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
          } else {
            cell.alignment = { vertical: 'top', horizontal: 'center', wrapText: true };
          }

          // Format currency columns
          if (colNumber === 4 || colNumber === 5 || colNumber === 6 || colNumber === 7) {
            cell.numFmt = '#,##0.00';
          }
          
          // Format percentage column
          if (colNumber === 8) {
            cell.numFmt = '0.00"%"';
          }
        });
      }
    });

    consolidatedSheet.pageSetup = {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
    };
  });

  // Generate Excel file and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Product_Analysis_(by_Client)_${report.year}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};
  const filteredReports = reports
  .filter(report => {
    // Search filter
    const matchesSearch = report.summary_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.year.toString().includes(searchQuery);
    
    // Year filter
    const matchesFilter = filterBy === 'all' || report.year.toString() === filterBy;
    
    return matchesSearch && matchesFilter;
  })
  .sort((a, b) => {
    switch (sortBy) {
      case 'year-desc':
        return b.year - a.year;
      case 'year-asc':
        return a.year - b.year;
      case 'date-desc':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'date-asc':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      default:
        return 0;
    }
  });

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
                Product Analysis (By Client)
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
                    onClick={() => {
                      setShowSortDropdown(!showSortDropdown);
                      setShowFilterDropdown(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <ChevronDown size={20} />
                    <span>Sort</span>
                  </button>
                  
                  {showSortDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                      <button
                        onClick={() => {
                          setSortBy('year-desc');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${sortBy === 'year-desc' ? 'bg-gray-100 font-semibold' : ''}`}
                      >
                        Year (Newest First)
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('year-asc');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${sortBy === 'year-asc' ? 'bg-gray-100 font-semibold' : ''}`}
                      >
                        Year (Oldest First)
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('date-desc');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${sortBy === 'date-desc' ? 'bg-gray-100 font-semibold' : ''}`}
                      >
                        Date Created (Newest First)
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('date-asc');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 rounded-b-lg ${sortBy === 'date-asc' ? 'bg-gray-100 font-semibold' : ''}`}
                      >
                        Date Created (Oldest First)
                      </button>
                    </div>
                  )}
                </div>

                {/* Filter Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => {
                      setShowFilterDropdown(!showFilterDropdown);
                      setShowSortDropdown(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Filter size={20} />
                    <span>Filter</span>
                    {filterBy !== 'all' && (
                      <span className="ml-1 px-2 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                        1
                      </span>
                    )}
                  </button>
                  
                  {showFilterDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                      <button
                        onClick={() => {
                          setFilterBy('all');
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 rounded-t-lg ${filterBy === 'all' ? 'bg-gray-100 font-semibold' : ''}`}
                      >
                        All Years
                      </button>
                      <button
                        onClick={() => {
                          setFilterBy('2026');
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${filterBy === '2026' ? 'bg-gray-100 font-semibold' : ''}`}
                      >
                        2026
                      </button>
                      <button
                        onClick={() => {
                          setFilterBy('2025');
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${filterBy === '2025' ? 'bg-gray-100 font-semibold' : ''}`}
                      >
                        2025
                      </button>
                      <button
                        onClick={() => {
                          setFilterBy('2024');
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 rounded-b-lg ${filterBy === '2024' ? 'bg-gray-100 font-semibold' : ''}`}
                      >
                        2024
                      </button>
                    </div>
                  )}
                </div>
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

          {/* Success Modal */}
          {showSuccessModal && (
            <div 
              className="fixed inset-0 flex items-center justify-center z-50"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            >
              <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#5C2E1F' }}>
                  Success!
                </h2>
                <p className="text-gray-600 mb-6">
                  All reports generated successfully!
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
                      {date.includes('Consolidated') ? date : formatDateShort(date)}
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

                      const isConsolidated = currentDate.includes('Consolidated');

                      if (isConsolidated) {
                        // Render consolidated table
                        const consolidatedItems = currentData.items as unknown as ConsolidatedItem[];

                        return (
                          <div className="w-full">
                            <table className="w-full border-collapse" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '7px' }}>
                              <thead>
                                <tr>
                                  <th className="border border-black px-2 py-2 text-center font-bold bg-gray-300" style={{ fontSize: '7px', width: '390px' }}>
                                    Memo/Description
                                  </th>
                                  <th className="border border-black px-2 py-2 text-center font-bold bg-gray-300" style={{ fontSize: '7px', width: '150px' }}>
                                    Type
                                  </th>
                                  <th className="border border-black px-2 py-2 text-center font-bold bg-gray-300" style={{ fontSize: '7px', width: '80px' }}>
                                    Quantity
                                  </th>
                                  <th className="border border-black px-2 py-2 text-center font-bold bg-gray-300" style={{ fontSize: '7px', width: '80px' }}>
                                    Cost per Tab
                                  </th>
                                  <th className="border border-black px-2 py-2 text-center font-bold bg-gray-300" style={{ fontSize: '7px', width: '80px' }}>
                                    Price per Tab
                                  </th>
                                  <th className="border border-black px-2 py-2 text-center font-bold bg-gray-300" style={{ fontSize: '7px', width: '80px' }}>
                                    Total Cost
                                  </th>
                                  <th className="border border-black px-2 py-2 text-center font-bold bg-gray-300" style={{ fontSize: '7px', width: '80px' }}>
                                    Total Sales
                                  </th>
                                  <th className="border border-black px-2 py-2 text-center font-bold bg-gray-300" style={{ fontSize: '7px', width: '80px' }}>
                                    Gross Margin
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {consolidatedItems.map((item, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="border border-black text-left px-2 py-1" style={{ fontSize: '7px' }}>
                                      {item.productName}
                                    </td>
                                    <td className="border border-black text-center px-2 py-1" style={{ fontSize: '7px' }}>
                                      {item.type}
                                    </td>
                                    <td className="border border-black text-center px-2 py-1" style={{ fontSize: '7px' }}>
                                      {item.quantity}
                                    </td>
                                    <td className="border border-black text-center px-2 py-1" style={{ fontSize: '7px' }}>
                                      {item.costPerTab.toFixed(2)}
                                    </td>
                                    <td className="border border-black text-center px-2 py-1" style={{ fontSize: '7px' }}>
                                      {item.pricePerTab.toFixed(2)}
                                    </td>
                                    <td className="border border-black text-center px-2 py-1" style={{ fontSize: '7px' }}>
                                      {item.totalCost.toFixed(2)}
                                    </td>
                                    <td className="border border-black text-center px-2 py-1" style={{ fontSize: '7px' }}>
                                      {item.totalSales.toFixed(2)}
                                    </td>
                                    <td className="border border-black text-center px-2 py-1" style={{ fontSize: '7px' }}>
                                      {((item.totalCost / item.totalSales) * 100).toFixed(2)}%
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      }

                      // Regular date table
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
                                <th className="border border-black px-2 py-2 text-center font-bold" style={{ fontSize: '7px', width: '10px' }}>
                                  Quantity
                                </th>
                                <th className="border border-black px-2 py-2 text-center font-bold" style={{ fontSize: '7px', width: '150px' }}>
                                  Type
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
                              {(() => {
                                const allRows = [];
                                const dataRowsCount = currentData.items.length;
                                
                                // Build summary array - ALWAYS add these regardless of value
                                const summaryContent = [];
                                
                                // Add Milk Production section - ALWAYS
                                summaryContent.push({ text: 'Dairy', isBold: false });
                                summaryContent.push({ text: (currentData.milk_production_kg || 0).toString(), isBold: false });
                                summaryContent.push({ text: '', isBold: false });
                                
                                // Add Sugar Syrup Production section - ALWAYS
                                summaryContent.push({ text: 'Sugar Syrup Production (kg)', isBold: true });
                                summaryContent.push({ text: 'Sorbet', isBold: false });
                                summaryContent.push({ text: (currentData.sugar_syrup_production_kg || 0).toString(), isBold: false });
                                summaryContent.push({ text: '', isBold: false });
                                
                                // Add Type Totals section
                                if (currentData.type_totals) {
                                  Object.entries(currentData.type_totals).forEach(([type, count]) => {
                                    summaryContent.push({ text: `Total ${type}`, isBold: true });
                                    summaryContent.push({ text: count.toString(), isBold: false });
                                    summaryContent.push({ text: '', isBold: false });
                                  });
                                }
                                
                                // Determine how many rows we need total
                                const totalRows = Math.max(dataRowsCount, summaryContent.length);
                                
                                // Type guard to check if item is ReportDataItem
                                const isReportDataItem = (item: ReportDataItem | ConsolidatedItem | null): item is ReportDataItem => {
                                  return item !== null && 'deliveryDate' in item && 'weight' in item;
                                };
                                
                                // Create all rows
                                for (let i = 0; i < totalRows; i++) {
                                  const item = i < dataRowsCount ? currentData.items[i] : null;
                                  const summaryItem = i < summaryContent.length ? summaryContent[i] : null;
                                  
                                  allRows.push(
                                    <tr key={`row-${i}`} className="hover:bg-gray-50">
                                      <td className="border border-black text-center" style={{ fontSize: '7px' }}>
                                        {isReportDataItem(item) ? formatDateShort(item.deliveryDate) : ''}
                                      </td>
                                      <td className="border border-black text-left" style={{ fontSize: '7px' }}>
                                        {isReportDataItem(item) ? item.customerName : ''}
                                      </td>
                                      <td className="border border-black text-left" style={{ fontSize: '7px' }}>
                                        {item ? item.productName : ''}
                                      </td>
                                      <td className="border border-black text-center" style={{ fontSize: '7px' }}>
                                        {item ? item.quantity : ''}
                                      </td>
                                      <td className="border border-black text-center" style={{ fontSize: '7px' }}>
                                        {item ? item.type : ''}
                                      </td>
                                      <td className="border border-black text-center" style={{ fontSize: '7px' }}>
                                        {isReportDataItem(item) ? item.gelatoType : ''}
                                      </td>
                                      <td className="border border-black text-center" style={{ fontSize: '7px' }}>
                                        {isReportDataItem(item) ? item.weight.toFixed(1) : ''}
                                      </td>
                                      <td 
                                        className="border border-black text-center" 
                                        style={{ 
                                          fontSize: '7px', 
                                          backgroundColor: '#FFF2CC',
                                          fontWeight: summaryItem?.isBold ? 'bold' : 'normal'
                                        }}
                                      >
                                        {summaryItem?.text || ''}
                                      </td>
                                    </tr>
                                  );
                                }
                                
                                return allRows;
                              })()}
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