'use client';
import { useState, useEffect } from 'react';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import Sidepanel from '@/app/components/sidepanel/page';
import Header from '@/app/components/header/page';
import supabase from '@/lib/client';

interface Statement {
  statement_id: string;
  client_auth_id: string;
  company_name: string;
  date_generated: string;
  statement_month: string;
  total_amount: number;
  invoice_count: number;
  client_email: string;
  client_person_incharge: string;
  client_business_contact: string;
  business_address: string;
  aging_category?: string;
}

export default function ClientStatementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortBy, setSortBy] = useState('month');
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [statementInvoices, setStatementInvoices] = useState([]);
  const [headerOptions, setHeaderOptions] = useState([]);
  const [selectedHeaderId, setSelectedHeaderId] = useState(null);
  const [showHeaderEditor, setShowHeaderEditor] = useState(false);
  const [editingHeaderId, setEditingHeaderId] = useState(null);
  const [agingCategory, setAgingCategory] = useState('1-30_days');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [headerFormData, setHeaderFormData] = useState({
    option_name: '',
    line1: '',
    line2: '',
    line3: '',
    line4: '',
    line5: '',
    line6: '',
    line7: '',
  });
  const getAgingAmounts = () => {
  const amounts = {
    current: 0,
    '1-30': 0,
    '31-60': 0,
    '61-90': 0,
    '90plus': 0
  };
  
  if (selectedStatement) {
    const total = selectedStatement.total_amount;
    switch (agingCategory) {
      case 'current':
        amounts.current = total;
        break;
      case '1-30_days':
        amounts['1-30'] = total;
        break;
      case '31-60_days':
        amounts['31-60'] = total;
        break;
      case '61-90_days':
        amounts['61-90'] = total;
        break;
      case '90plus_days':
        amounts['90plus'] = total;
        break;
    }
  }
  
  return amounts;
};

  const itemsPerPage = 10;

    useEffect(() => {
    const fetchHeaderOptions = async () => {
      try {
        const { data, error } = await supabase
          .from('header_options')
          .select('*')
          .order('is_default', { ascending: false });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          setHeaderOptions(data);
          const defaultHeader = data.find(h => h.is_default) || data[0];
          setSelectedHeaderId(defaultHeader.id);
        }
      } catch (error) {
        console.error('Error fetching header options:', error);
      }
    };

    fetchHeaderOptions();
  }, []);

  useEffect(() => {
    fetchStatements();
  }, []);

  useEffect(() => {
  const initializeStatements = async () => {
    // First, generate statements for any orders without them
    await generateStatementsForOrders();
    // Then fetch all statements
    await fetchStatements();
  };
  
  initializeStatements();
}, []);

  // Add this function after the fetchStatementInvoices function
const generateStatementsForOrders = async () => {
  try {
    console.log('Checking for orders without statements...');
    
    // Get all orders that don't have a statement_id
    const { data: ordersWithoutStatement, error: ordersError } = await supabase
      .from('client_order')
      .select('id, client_auth_id, delivery_date, total_amount')
      .is('statement_id', null);

    if (ordersError) throw ordersError;

    if (!ordersWithoutStatement || ordersWithoutStatement.length === 0) {
      console.log('No orders without statements found');
      return;
    }

    console.log(`Found ${ordersWithoutStatement.length} orders without statements`);

    // Group orders by client and month
    const groupedOrders: { [key: string]: typeof ordersWithoutStatement } = {};
    
    ordersWithoutStatement.forEach(order => {
      const deliveryDate = new Date(order.delivery_date);
      const monthKey = `${order.client_auth_id}_${deliveryDate.getFullYear()}_${deliveryDate.getMonth()}`;
      
      if (!groupedOrders[monthKey]) {
        groupedOrders[monthKey] = [];
      }
      groupedOrders[monthKey].push(order);
    });

    console.log(`Grouped into ${Object.keys(groupedOrders).length} unique client-month combinations`);

    // Create statements for each group
    for (const orders of Object.values(groupedOrders)) {
      const firstOrder = orders[0];
      const deliveryDate = new Date(firstOrder.delivery_date);
      
      // Set to first day of the month
      const statementMonth = new Date(deliveryDate.getFullYear(), deliveryDate.getMonth(), 1);
      
      // Calculate total amount
      const totalAmount = orders.reduce((sum, order) => sum + parseFloat(order.total_amount.toString()), 0);

      console.log(`Creating statement for client ${firstOrder.client_auth_id}, month ${statementMonth.toISOString()}, total: ${totalAmount}`);

      // Check if statement already exists for this client-month
      const { data: existingStatement } = await supabase
        .from('client_statement')
        .select('statement_id')
        .eq('client_auth_id', firstOrder.client_auth_id)
        .eq('statement_month', statementMonth.toISOString().split('T')[0])
        .single();

      let statementId: string;

      if (existingStatement) {
        // Use existing statement
        statementId = existingStatement.statement_id;
        console.log(`Using existing statement: ${statementId}`);
        
        // Update the total amount
        const { error: updateError } = await supabase
          .from('client_statement')
          .update({ total_amount: totalAmount })
          .eq('statement_id', statementId);
          
        if (updateError) {
          console.error('Error updating statement total:', updateError);
        }
      } else {
        // Create new statement
        const { data: newStatement, error: statementError } = await supabase
          .from('client_statement')
          .insert({
            client_auth_id: firstOrder.client_auth_id,
            statement_month: statementMonth.toISOString().split('T')[0],
            total_amount: totalAmount,
            date_generated: new Date().toISOString()
          })
          .select('statement_id')
          .single();

        if (statementError) {
          console.error('Error creating statement:', statementError);
          continue;
        }

        statementId = newStatement.statement_id;
        console.log(`Created new statement: ${statementId}`);
      }

      // Update all orders in this group with the statement_id
      const orderIds = orders.map(o => o.id);
      const { error: updateOrdersError } = await supabase
        .from('client_order')
        .update({ statement_id: statementId })
        .in('id', orderIds);

      if (updateOrdersError) {
        console.error('Error updating orders with statement_id:', updateOrdersError);
      } else {
        console.log(`Updated ${orderIds.length} orders with statement_id ${statementId}`);
      }
    }

    console.log('Statement generation complete');
  } catch (error) {
    console.error('Error generating statements:', error);
  }
};

  const handleSaveHeaderOption = async () => {
  try {
    if (!headerFormData.option_name.trim()) {
      setWarningMessage('Please enter an option name');
      setShowWarningModal(true);
      return;
    }

    if (editingHeaderId) {
      const { error } = await supabase
        .from('header_options')
        .update({
          option_name: headerFormData.option_name,
          line1: headerFormData.line1,
          line2: headerFormData.line2,
          line3: headerFormData.line3,
          line4: headerFormData.line4,
          line5: headerFormData.line5,
          line6: headerFormData.line6,
          line7: headerFormData.line7,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingHeaderId);

      if (error) throw error;

      const { data: updatedData } = await supabase
        .from('header_options')
        .select('*')
        .order('is_default', { ascending: false });
      
      if (updatedData) {
        setHeaderOptions(updatedData);
      }

      setSuccessMessage('Header option updated successfully!');
    } else {
      const { data, error } = await supabase
        .from('header_options')
        .insert([{
          option_name: headerFormData.option_name,
          line1: headerFormData.line1,
          line2: headerFormData.line2,
          line3: headerFormData.line3,
          line4: headerFormData.line4,
          line5: headerFormData.line5,
          line6: headerFormData.line6,
          line7: headerFormData.line7,
          is_default: false
        }])
        .select();

      if (error) throw error;

      const { data: updatedData } = await supabase
        .from('header_options')
        .select('*')
        .order('is_default', { ascending: false });
      
      if (updatedData) {
        setHeaderOptions(updatedData);
        if (data && data[0]) {
          setSelectedHeaderId(data[0].id);
        }
      }

      setSuccessMessage('Header option created successfully!');
    }

    setShowSuccessModal(true);
    setShowHeaderEditor(false);
    setEditingHeaderId(null);
    setHeaderFormData({
      option_name: '',
      line1: '',
      line2: '',
      line3: '',
      line4: '',
      line5: '',
      line6: '',
      line7: '',
    });
  } catch (error) {
    console.error('Error saving header option:', error);
    setSuccessMessage('Failed to save header option');
    setShowSuccessModal(true);
  }
};

  const handleEditHeaderOption = (header) => {
    setEditingHeaderId(header.id);
    setHeaderFormData({
      option_name: header.option_name,
      line1: header.line1 || '',
      line2: header.line2 || '',
      line3: header.line3 || '',
      line4: header.line4 || '',
      line5: header.line5 || '',
      line6: header.line6 || '',
      line7: header.line7 || '',
    });
    setShowHeaderEditor(true);
  };

  const handleDeleteHeaderOption = async (headerId) => {
  if (!confirm('Are you sure you want to delete this header option?')) {
    return;
  }

  try {
    const { error } = await supabase
      .from('header_options')
      .delete()
      .eq('id', headerId);

    if (error) throw error;

    const { data: updatedData } = await supabase
      .from('header_options')
      .select('*')
      .order('is_default', { ascending: false });
    
    if (updatedData) {
      setHeaderOptions(updatedData);
      if (selectedHeaderId === headerId && updatedData.length > 0) {
        setSelectedHeaderId(updatedData[0].id);
      }
    }

    alert('Header option deleted successfully!');
  } catch (error) {
    console.error('Error deleting header option:', error);
    alert('Failed to delete header option');
  }
};

const renderHeaderInPDF = (doc, selectedHeader) => {
  if (!selectedHeader) return;

  doc.setFontSize(10);
  let yPos = 20;
  const lineHeight = 5;

  if (selectedHeader.line1) {
    doc.setFont('helvetica', 'bold');
    doc.text(selectedHeader.line1, 20, yPos);
    yPos += lineHeight;
  }

  doc.setFont('helvetica', 'normal');
  const lines = [
    selectedHeader.line2,
    selectedHeader.line3,
    selectedHeader.line4,
    selectedHeader.line5,
    selectedHeader.line6,
    selectedHeader.line7,
  ];

  lines.forEach(line => {
    if (line) {
      doc.text(line, 20, yPos);
      yPos += lineHeight;
    }
  });
};

const handleViewStatement = async (statement) => {
  try {
    setLoading(true);
    const invoices = await fetchStatementInvoices(statement.statement_id);
    
    if (invoices.length === 0) {
      alert('No invoices found for this statement.');
      setLoading(false);
      return;
    }

    setSelectedStatement(statement);
    setStatementInvoices(invoices);
    setAgingCategory(statement.aging_category || '1-30_days');
    setShowStatementModal(true);
    setLoading(false);
  } catch (error) {
    console.error('Error loading statement:', error);
    alert('Failed to load statement');
    setLoading(false);
  }
};

const handleSaveAgingCategory = async () => {
  if (!selectedStatement) return;
  
  try {
    const { error } = await supabase
      .from('client_statement')
      .update({ aging_category: agingCategory })
      .eq('statement_id', selectedStatement.statement_id);

    if (error) throw error;

    // Update local state
    setStatements(prev => prev.map(stmt => 
      stmt.statement_id === selectedStatement.statement_id 
        ? { ...stmt, aging_category: agingCategory }
        : stmt
    ));
    
    setSuccessMessage('Aging category updated successfully!');
    setShowSuccessModal(true);
  } catch (error) {
    console.error('Error updating aging category:', error);
    setSuccessMessage('Failed to update aging category');
    setShowSuccessModal(true);
  }
};

const handlePrintStatement = async () => {
  if (!selectedStatement || !statementInvoices) return;
  
  try {
    const jsPDF = (await import('jspdf')).default;
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    doc.setFont('helvetica');

    const selectedHeader = headerOptions.find(h => h.id === selectedHeaderId);
    renderHeaderInPDF(doc, selectedHeader);

    // Title
    doc.setFontSize(16);
    doc.setTextColor("#0D909A");
    doc.setFont('helvetica', 'normal');
    doc.text('Statement', 20, 58);

    doc.setTextColor(0, 0, 0);

    // Statement Details - Right Side
    const labelX = 155;
    const valueX = 157;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('STATEMENT NO.', labelX, 67, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(selectedStatement.statement_id, valueX, 67);

    doc.setFont('helvetica', 'bold');
    doc.text('DATE', labelX, 72, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(selectedStatement.date_generated).toLocaleDateString('en-GB'), valueX, 72);

    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL DUE', labelX, 77, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(`S$${selectedStatement.total_amount.toFixed(2)}`, valueX, 77);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('ENCLOSED', labelX, 82, { align: 'right' });

    // TO Section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TO', 20, 67);
    doc.setFont('helvetica', 'normal');
    doc.text(selectedStatement.company_name, 20, 72);
    const address = doc.splitTextToSize(selectedStatement.business_address, 60);
    doc.text(address, 20, 77);

    // Enclosed Invoices
    const invoicesY = 83;

    // Invoice table header
    const tableY = invoicesY + 5;
    doc.setFillColor(184, 230, 231);
    doc.rect(20, tableY, 170, 7, 'F');
    doc.setTextColor("#0D909A");
    
    doc.setFontSize(9);
    doc.text('DATE', 22, tableY + 5);
    doc.text('DESCRIPTION', 50, tableY + 5);
    doc.text('AMOUNT', 150, tableY + 5, { align: 'right' });
    doc.text('OPEN AMOUNT', 185, tableY + 5, { align: 'right' });

    // Invoice rows
    doc.setFont('helvetica', 'normal');
    let yPos = tableY + 13;
    doc.setTextColor(0, 0, 0);

    statementInvoices.forEach((invoice) => {
      const invoiceDate = new Date(invoice.order_date).toLocaleDateString('en-GB');
      doc.text(invoiceDate, 22, yPos);
      
      const description = `Invoice No. ${invoice.invoice_id}: Due ${invoiceDate}`;
      const descLines = doc.splitTextToSize(description, 90);
      doc.text(descLines, 50, yPos);
      
      const amount = invoice.total_amount.toFixed(2);
      
      doc.text(amount, 150, yPos, { align: 'right' });
      doc.text(amount, 185, yPos, { align: 'right' });
      
      yPos += Math.max(descLines.length * 4, 6);
    });
    
    const footerY = 270;
    doc.setFontSize(9);

    doc.setFillColor(184, 230, 231);
    doc.rect(20, footerY, 170, 8, 'F');

    doc.setTextColor(13, 144, 154);
    doc.setFont('helvetica', 'normal');
    doc.text('Current', 23, footerY + 3);
    doc.text('Due', 23, footerY + 6.5);

    doc.text('1-30 Days', 45, footerY + 3);
    doc.text('Past Due', 45, footerY + 6.5);

    doc.text('31-60 Days', 80, footerY + 3);
    doc.text('Past Due', 80, footerY + 6.5);

    doc.text('61-90 Days', 115, footerY + 3);
    doc.text('Past Due', 115, footerY + 6.5);

    doc.text('90+ Days', 150, footerY + 3);
    doc.text('Past Due', 150, footerY + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.text('Amount', 185, footerY + 3, { align: 'right' });
    doc.text('Due', 185, footerY + 6.5, { align: 'right' });

    // Get aging amounts
    const agingAmounts = getAgingAmounts();

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(agingAmounts.current.toFixed(2), 23, footerY + 12, { align: 'left' });
    doc.text(agingAmounts['1-30'].toFixed(2), 45, footerY + 12, { align: 'left' });
    doc.text(agingAmounts['31-60'].toFixed(2), 80, footerY + 12, { align: 'left' });
    doc.text(agingAmounts['61-90'].toFixed(2), 115, footerY + 12, { align: 'left' });
    doc.text(agingAmounts['90plus'].toFixed(2), 150, footerY + 12, { align: 'left' });
    doc.setFont('helvetica', 'bold');
    doc.text(`S$${selectedStatement.total_amount.toFixed(2)}`, 186, footerY + 12, { align: 'right' });
    doc.autoPrint();
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    window.open(blobUrl, '_blank');

  } catch (error) {
    console.error('Error generating statement for print:', error);
    alert('Failed to open print preview. Please try Download PDF instead.');
  }
};

const handleDownloadStatement = async () => {
  if (!selectedStatement || !statementInvoices) return;
  
  try {
    const jsPDF = (await import('jspdf')).default;
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    doc.setFont('helvetica');

    const selectedHeader = headerOptions.find(h => h.id === selectedHeaderId);
    renderHeaderInPDF(doc, selectedHeader);

    // Title
    doc.setFontSize(16);
    doc.setTextColor("#0D909A");
    doc.setFont('helvetica', 'normal');
    doc.text('Statement', 20, 58);

    doc.setTextColor(0, 0, 0);

    // Statement Details - Right Side
    const labelX = 155;
    const valueX = 157;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('STATEMENT NO.', labelX, 67, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(selectedStatement.statement_id, valueX, 67);

    doc.setFont('helvetica', 'bold');
    doc.text('DATE', labelX, 72, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(selectedStatement.date_generated).toLocaleDateString('en-GB'), valueX, 72);

    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL DUE', labelX, 77, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(`S$${selectedStatement.total_amount.toFixed(2)}`, valueX, 77);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('ENCLOSED', labelX, 82, { align: 'right' });

    // TO Section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TO', 20, 67);
    doc.setFont('helvetica', 'normal');
    doc.text(selectedStatement.company_name, 20, 72);
    const address = doc.splitTextToSize(selectedStatement.business_address, 60);
    doc.text(address, 20, 77);

    // Enclosed Invoices
    const invoicesY = 83;

    // Invoice table header
    const tableY = invoicesY + 5;
    doc.setFillColor(184, 230, 231);
    doc.rect(20, tableY, 170, 7, 'F');
    doc.setTextColor("#0D909A");
    
    doc.setFontSize(9);
    doc.text('DATE', 22, tableY + 5);
    doc.text('DESCRIPTION', 50, tableY + 5);
    doc.text('AMOUNT', 150, tableY + 5, { align: 'right' });
    doc.text('OPEN AMOUNT', 185, tableY + 5, { align: 'right' });

    // Invoice rows
    doc.setFont('helvetica', 'normal');
    let yPos = tableY + 13;
    doc.setTextColor(0, 0, 0);

    statementInvoices.forEach((invoice) => {
      const invoiceDate = new Date(invoice.order_date).toLocaleDateString('en-GB');
      doc.text(invoiceDate, 22, yPos);
      
      const description = `Invoice No. ${invoice.invoice_id}: Due ${invoiceDate}`;
      const descLines = doc.splitTextToSize(description, 90);
      doc.text(descLines, 50, yPos);
      
      const amount = invoice.total_amount.toFixed(2);
      
      doc.text(amount, 150, yPos, { align: 'right' });
      doc.text(amount, 185, yPos, { align: 'right' });
      
      yPos += Math.max(descLines.length * 4, 6);
    });
    
    const footerY = 270;
    doc.setFontSize(9);

    doc.setFillColor(184, 230, 231);
    doc.rect(20, footerY, 170, 8, 'F');

    doc.setTextColor(13, 144, 154);
    doc.setFont('helvetica', 'normal');
    doc.text('Current', 23, footerY + 3);
    doc.text('Due', 23, footerY + 6.5);

    doc.text('1-30 Days', 45, footerY + 3);
    doc.text('Past Due', 45, footerY + 6.5);

    doc.text('31-60 Days', 80, footerY + 3);
    doc.text('Past Due', 80, footerY + 6.5);

    doc.text('61-90 Days', 115, footerY + 3);
    doc.text('Past Due', 115, footerY + 6.5);

    doc.text('90+ Days', 150, footerY + 3);
    doc.text('Past Due', 150, footerY + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.text('Amount', 185, footerY + 3, { align: 'right' });
    doc.text('Due', 185, footerY + 6.5, { align: 'right' });

    // Get aging amounts
    const agingAmounts = getAgingAmounts();

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(agingAmounts.current.toFixed(2), 23, footerY + 12, { align: 'left' });
    doc.text(agingAmounts['1-30'].toFixed(2), 45, footerY + 12, { align: 'left' });
    doc.text(agingAmounts['31-60'].toFixed(2), 80, footerY + 12, { align: 'left' });
    doc.text(agingAmounts['61-90'].toFixed(2), 115, footerY + 12, { align: 'left' });
    doc.text(agingAmounts['90plus'].toFixed(2), 150, footerY + 12, { align: 'left' });
    doc.setFont('helvetica', 'bold');
    doc.text(`S$${selectedStatement.total_amount.toFixed(2)}`, 186, footerY + 12, { align: 'right' });

    const fileName = `Statement_${selectedStatement.statement_id}_${selectedStatement.statement_month.replace(/\s+/g, '_')}.pdf`;

    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 100);

  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF. Please try again.');
  }
};


  const fetchStatements = async () => {
  try {
    setLoading(true);
    
    // Fetch statements with client information directly from Supabase
    const { data, error: supabaseError } = await supabase
      .from('client_statement')
      .select(`
        *,
        client_user!client_statement_client_auth_id_fkey(
          client_businessName,
          client_email,
          client_person_incharge,
          client_business_contact,
          ad_streetName,
          ad_country,
          ad_postal
        )
      `)
      .order('statement_month', { ascending: false });

    if (supabaseError) {
      throw new Error(`${supabaseError.message} (Code: ${supabaseError.code})`);
    }

    console.log('Fetched statements:', data);

    if (!data || data.length === 0) {
      console.warn('No statements found in the database');
      setStatements([]);
      setMessage({ type: 'error', text: 'No statements available. Please generate statements first.' });
    } else {
      console.log(`Successfully fetched ${data.length} statements`);
      
      interface RawStatement {
        statement_id: string;
        client_auth_id: string;
        date_generated: string;
        statement_month: string;
        total_amount: string | number;
        aging_category: string;
        client_user?: {
          client_businessName: string;
          client_email: string;
          client_person_incharge: string;
          client_business_contact: string;
          ad_streetName: string;
          ad_country: string;
          ad_postal: string;
        } | Array<{
          client_businessName: string;
          client_email: string;
          client_person_incharge: string;
          client_business_contact: string;
          ad_streetName: string;
          ad_country: string;
          ad_postal: string;
        }>;
      }

      const transformedStatements = data.map((stmt: RawStatement) => {
        let clientData = {
          client_businessName: 'N/A',
          client_email: 'N/A',
          client_person_incharge: 'N/A',
          client_business_contact: 'N/A',
          ad_streetName: 'N/A',
          ad_country: 'N/A',
          ad_postal: 'N/A'
        };

        if (stmt.client_user) {
          if (Array.isArray(stmt.client_user)) {
            clientData = stmt.client_user[0] || clientData;
          } else {
            clientData = stmt.client_user;
          }
        }

        return {
          statement_id: stmt.statement_id,
          client_auth_id: stmt.client_auth_id,
          company_name: clientData.client_businessName,
          date_generated: stmt.date_generated,
          statement_month: new Date(stmt.statement_month).toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
          }),
          total_amount: typeof stmt.total_amount === 'string' ? parseFloat(stmt.total_amount) : stmt.total_amount,
          invoice_count: 0,
          client_email: clientData.client_email,
          client_person_incharge: clientData.client_person_incharge,
          client_business_contact: clientData.client_business_contact,
          business_address: `${clientData.ad_streetName}, ${clientData.ad_country}, ${clientData.ad_postal}`,
          aging_category: stmt.aging_category || '1-30_days' // Add this line
        };
      });

      // Fetch invoice counts for each statement
      for (const stmt of transformedStatements) {
        const { count, error: countError } = await supabase
          .from('client_order')
          .select('*', { count: 'exact', head: true })
          .eq('statement_id', stmt.statement_id);
        
        console.log(`Statement ${stmt.statement_id} has ${count} invoices`);
        
        if (!countError) {
          stmt.invoice_count = count || 0;
        }
      }

      setStatements(transformedStatements);
      setMessage({ type: '', text: '' });
    }
  } catch (error) {
    console.error('Error fetching statements:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred while fetching statements';
    setMessage({ type: 'error', text: errorMessage });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    setStatements([]);
  } finally {
    setLoading(false);
  }
};

  const fetchStatementInvoices = async (statementId: string) => {
  try {
    console.log('Fetching invoices for statement:', statementId);
    
    const { data, error: supabaseError } = await supabase
      .from('client_order')
      .select('invoice_id, order_date, total_amount, status')
      .eq('statement_id', statementId)
      .order('order_date', { ascending: true });

    if (supabaseError) {
      throw new Error(`${supabaseError.message} (Code: ${supabaseError.code})`);
    }

    console.log('Fetched invoices:', data);
    return data || [];
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }
};

  const handleSort = (option: string) => {
    setSortBy(option);
    setShowSortMenu(false);
  };

  const filteredStatements = statements
    .filter(statement => 
      statement.statement_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      statement.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      statement.statement_month.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'month':
          return new Date(b.date_generated).getTime() - new Date(a.date_generated).getTime();
        case 'company':
          return a.company_name.localeCompare(b.company_name);
        case 'date':
          return new Date(b.date_generated).getTime() - new Date(a.date_generated).getTime();
        default:
          return 0;
      }
    });

  const totalPages = Math.ceil(filteredStatements.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentStatements = filteredStatements.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen flex" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
      <Sidepanel />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6" style={{ backgroundColor: '#FCF0E3' }}>
          {message.text && (
            <div style={{
              marginBottom: '20px',
              padding: '12px 20px',
              borderRadius: '8px',
              backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
              color: message.type === 'success' ? '#155724' : '#721c24',
              border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
            }}>
              {message.text}
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold" style={{ color: '#5C2E1F' }}>
                Client Statement
              </h1>
              
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                    size={20} 
                  />
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="relative">
                  <button 
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <ChevronDown size={20} />
                    <span>Sort</span>
                  </button>
                  
                  {showSortMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                      <button
                        onClick={() => handleSort('month')}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${sortBy === 'month' ? 'bg-orange-50 text-orange-600' : ''}`}
                      >
                        Month
                      </button>
                      <button
                        onClick={() => handleSort('company')}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${sortBy === 'company' ? 'bg-orange-50 text-orange-600' : ''}`}
                      >
                        Company Name
                      </button>
                      <button
                        onClick={() => handleSort('date')}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${sortBy === 'date' ? 'bg-orange-50 text-orange-600' : ''}`}
                      >
                        Date Generated
                      </button>
                    </div>
                  )}
                </div>

                <button 
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Filter size={20} />
                  <span>Filter</span>
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr className="border-b-2" style={{ borderColor: '#5C2E1F' }}>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      STATEMENT ID
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      COMPANY NAME
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      DATE GENERATED
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      MONTH
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      INVOICES
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      TOTAL
                    </th>
                    <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5C2E1F' }}>
                      STATEMENT
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-500">
                        Loading statements...
                      </td>
                    </tr>
                  ) : currentStatements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-500">
                        {searchQuery ? 'No statements found matching your search.' : 'No statements available.'}
                      </td>
                    </tr>
                  ) : (
                    currentStatements.map((statement) => (
                      <tr 
                        key={statement.statement_id} 
                        className="border-b border-gray-200 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 text-sm">{statement.statement_id}</td>
                        <td className="py-3 px-4 text-sm">{statement.company_name}</td>
                        <td className="py-3 px-4 text-sm">
                          {new Date(statement.date_generated).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm">{statement.statement_month}</td>
                        <td className="py-3 px-4 text-sm">{statement.invoice_count}</td>
                        <td className="py-3 px-4 text-sm">S$ {statement.total_amount.toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleViewStatement(statement)}
                            disabled={loading}
                            className="text-xs font-normal text-blue-700 hover:underline cursor-pointer transition-all disabled:opacity-50"
                          >
                            View Statement
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredStatements.length > 0 && (
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
            )}
          </div>

          {/* Statement Preview Modal */}
          {showStatementModal && selectedStatement && statementInvoices && (
            <div className="fixed inset-0 z-50 overflow-auto flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
              <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 shrink-0 rounded-t-lg flex justify-between items-center">
                  <h3 className="text-xl font-bold" style={{ color: '#5C2E1F' }}>
                    Statement Customize Preview
                  </h3>
                  <button
                    onClick={() => setShowStatementModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Header Editor Modal */}
                {showHeaderEditor && (
                  <div 
                    className="fixed inset-0 flex items-center justify-center z-50 p-4"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                    onClick={() => {
                      setShowHeaderEditor(false);
                      setEditingHeaderId(null);
                      setHeaderFormData({
                        option_name: '',
                        line1: '',
                        line2: '',
                        line3: '',
                        line4: '',
                        line5: '',
                        line6: '',
                        line7: '',
                      });
                    }}
                  >
                    <div 
                      className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                        <h3 className="text-xl font-bold" style={{ color: '#5C2E1F' }}>
                          {editingHeaderId ? 'Edit Header Option' : 'Create Header Option'}
                        </h3>
                        <div className="flex items-center gap-2">
                          {editingHeaderId && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                handleDeleteHeaderOption(editingHeaderId);
                              }}
                              className="text-red-600 hover:text-red-800 text-sm px-3 py-1 border border-red-300 rounded hover:bg-red-50"
                            >
                              Delete
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setShowHeaderEditor(false);
                              setEditingHeaderId(null);
                              setHeaderFormData({
                                option_name: '',
                                line1: '',
                                line2: '',
                                line3: '',
                                line4: '',
                                line5: '',
                                line6: '',
                                line7: '',
                              });
                            }}
                            className="text-gray-500 hover:text-gray-700 text-2xl"
                          >
                            ×
                          </button>
                        </div>
                      </div>

                      <div className="p-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                            Option Name *
                          </label>
                          <input
                            type="text"
                            value={headerFormData.option_name}
                            onChange={(e) => setHeaderFormData({ ...headerFormData, option_name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g., Little Momo NBR Pte Ltd"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                            Line 1 (Company Name - Bold)
                          </label>
                          <input
                            type="text"
                            value={headerFormData.line1}
                            onChange={(e) => setHeaderFormData({ ...headerFormData, line1: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Little Momo NBR Pte Ltd"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                            Line 2 (Address Line 1)
                          </label>
                          <input
                            type="text"
                            value={headerFormData.line2}
                            onChange={(e) => setHeaderFormData({ ...headerFormData, line2: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="21 Tampines St 92 #05-01A"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                            Line 3 (Address Line 2)
                          </label>
                          <input
                            type="text"
                            value={headerFormData.line3}
                            onChange={(e) => setHeaderFormData({ ...headerFormData, line3: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Singapore 528891"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                            Line 4 (Contact)
                          </label>
                          <input
                            type="text"
                            value={headerFormData.line4}
                            onChange={(e) => setHeaderFormData({ ...headerFormData, line4: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="+6596797268"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                            Line 5 (Email)
                          </label>
                          <input
                            type="text"
                            value={headerFormData.line5}
                            onChange={(e) => setHeaderFormData({ ...headerFormData, line5: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="finance@momolato.com"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                            Line 6 (Company Registration Label)
                          </label>
                          <input
                            type="text"
                            value={headerFormData.line6}
                            onChange={(e) => setHeaderFormData({ ...headerFormData, line6: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Company Registration No."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: '#5C2E1F' }}>
                            Line 7 (Company Registration Number)
                          </label>
                          <input
                            type="text"
                            value={headerFormData.line7}
                            onChange={(e) => setHeaderFormData({ ...headerFormData, line7: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="202448214M"
                          />
                        </div>
                      </div>

                      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
                        <button
                          onClick={handleSaveHeaderOption}
                          className="flex-1 px-4 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity"
                          style={{ backgroundColor: '#FF5722' }}
                        >
                          {editingHeaderId ? 'Update' : 'Create'}
                        </button>
                        <button
                          onClick={() => {
                            setShowHeaderEditor(false);
                            setEditingHeaderId(null);
                            setHeaderFormData({
                              option_name: '',
                              line1: '',
                              line2: '',
                              line3: '',
                              line4: '',
                              line5: '',
                              line6: '',
                              line7: '',
                            });
                          }}
                          className="flex-1 px-4 py-2 border-2 rounded font-medium hover:bg-gray-50 transition-colors"
                          style={{ borderColor: '#5C2E1F', color: '#5C2E1F' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Header Options Selection */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="text-sm font-medium" style={{ color: '#5C2E1F' }}>
                      Statement Header:
                    </label>
                    <div className="flex items-center gap-3 flex-wrap">
                      {headerOptions.map((header) => (
                        <label key={header.id} className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-gray-200 hover:border-orange-300 transition-colors">
                          <input
                            type="radio"
                            name="headerOption"
                            value={header.id}
                            checked={selectedHeaderId === header.id}
                            onChange={() => setSelectedHeaderId(header.id)}
                            className="cursor-pointer accent-orange-500"
                          />
                          <span className="text-sm font-medium">{header.option_name}</span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleEditHeaderOption(header);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-xs ml-1 underline"
                          >
                            Edit
                          </button>
                        </label>
                      ))}
                      <button
                        onClick={() => {
                          setEditingHeaderId(null);
                          setHeaderFormData({
                            option_name: '',
                            line1: '',
                            line2: '',
                            line3: '',
                            line4: '',
                            line5: '',
                            line6: '',
                            line7: '',
                          });
                          setShowHeaderEditor(true);
                        }}
                        className="text-sm px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors font-medium"
                        style={{ color: '#5C2E1F' }}
                      >
                        + New Header
                      </button>
                    </div>
                  </div>
                </div>

                {/* Aging Category Selection */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="text-sm font-medium" style={{ color: '#5C2E1F' }}>
                      Aging Category:
                    </label>
                    <div className="flex items-center gap-3 flex-wrap">
                      <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-gray-200 hover:border-orange-300 transition-colors">
                        <input
                          type="radio"
                          name="agingCategory"
                          value="current"
                          checked={agingCategory === 'current'}
                          onChange={(e) => setAgingCategory(e.target.value)}
                          className="cursor-pointer accent-orange-500"
                        />
                        <span className="text-sm font-medium">Current Due</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-gray-200 hover:border-orange-300 transition-colors">
                        <input
                          type="radio"
                          name="agingCategory"
                          value="1-30_days"
                          checked={agingCategory === '1-30_days'}
                          onChange={(e) => setAgingCategory(e.target.value)}
                          className="cursor-pointer accent-orange-500"
                        />
                        <span className="text-sm font-medium">1-30 Days Past Due</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-gray-200 hover:border-orange-300 transition-colors">
                        <input
                          type="radio"
                          name="agingCategory"
                          value="31-60_days"
                          checked={agingCategory === '31-60_days'}
                          onChange={(e) => setAgingCategory(e.target.value)}
                          className="cursor-pointer accent-orange-500"
                        />
                        <span className="text-sm font-medium">31-60 Days Past Due</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-gray-200 hover:border-orange-300 transition-colors">
                        <input
                          type="radio"
                          name="agingCategory"
                          value="61-90_days"
                          checked={agingCategory === '61-90_days'}
                          onChange={(e) => setAgingCategory(e.target.value)}
                          className="cursor-pointer accent-orange-500"
                        />
                        <span className="text-sm font-medium">61-90 Days Past Due</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-gray-200 hover:border-orange-300 transition-colors">
                        <input
                          type="radio"
                          name="agingCategory"
                          value="90plus_days"
                          checked={agingCategory === '90plus_days'}
                          onChange={(e) => setAgingCategory(e.target.value)}
                          className="cursor-pointer accent-orange-500"
                        />
                        <span className="text-sm font-medium">90+ Days Past Due</span>
                      </label>
                      <button
                        onClick={handleSaveAgingCategory}
                        className="text-sm px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: '#FF5722' }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
                {/* Footer Actions */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 shrink-0 rounded-b-lg shadow-lg">
                  <button
                    onClick={handlePrintStatement}
                    className="flex-1 px-4 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#FF5722' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 6 2 18 2 18 9"></polyline>
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                      <rect x="6" y="14" width="12" height="8"></rect>
                    </svg>
                    Print Statement
                  </button>
                  <button
                    onClick={handleDownloadStatement}
                    className="flex-1 px-4 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#4db8ba' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download PDF
                  </button>
                  <button
                    onClick={() => setShowStatementModal(false)}
                    className="flex-1 px-4 py-3 rounded-lg border-2 font-medium hover:bg-gray-50 transition-colors"
                    style={{ borderColor: '#5C2E1F', color: '#5C2E1F' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success Modal */}
          {showSuccessModal && (
            <div 
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              onClick={() => setShowSuccessModal(false)}
            >
              <div 
                className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium mb-2" style={{ color: '#5C2E1F' }}>
                    Success!
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    {successMessage}
                  </p>
                  <button
                    onClick={() => setShowSuccessModal(false)}
                    className="w-full px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#FF5722' }}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Warning Modal */}
          {showWarningModal && (
            <div 
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              onClick={() => setShowWarningModal(false)}
            >
              <div 
                className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium mb-2" style={{ color: '#5C2E1F' }}>
                    Warning
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    {warningMessage}
                  </p>
                  <button
                    onClick={() => setShowWarningModal(false)}
                    className="w-full px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#FF5722' }}
                  >
                    OK
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