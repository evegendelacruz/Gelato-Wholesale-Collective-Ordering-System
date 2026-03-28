'use client';

import Image from 'next/image';

interface OrderItem {
  id: number;
  product_name: string;
  product_type?: string;
  product_billingName?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface Order {
  id: number;
  order_id: string;
  invoice_id: string;
  tracking_no: string;
  order_date: string;
  delivery_date: string;
  invoice_due_date?: string;
  delivery_address: string;
  total_amount: number;
  status: string;
  notes: string | null;
  items: OrderItem[];
  // Audit trail
  last_modified_by?: string;
  last_modified_by_name?: string;
  updated_at?: string;
  // Xero sync
  xero_invoice_id?: string;
  xero_synced_at?: string;
}

interface ClientData {
  client_businessName: string;
  client_delivery_address: string;
  client_billing_address: string;
  client_person_incharge: string;
  ad_streetName: string;
  ad_country: string;
  ad_postal: string;
}

interface ClientInvoiceProps {
  order: Order;
  clientData: ClientData;
  formatDate: (dateString: string) => string;
  getSubtotal: (order: Order) => number;
  getGST: (order: Order) => number;
  gstPercentage?: number;
  selectedHeader?: {
    id: number;
    option_name: string;
    line1: string;
    line2: string;
    line3: string;
    line4: string;
    line5: string;
    line6: string;
    line7: string;
    is_default: boolean;
  } | null;
  selectedFooter?: {
    id: number;
    option_name: string;
    line1: string;
    line2: string;
    line3: string;
    line4: string;
    line5: string;
    is_default: boolean;
  } | null;
}

export default function ClientInvoice({
  order,
  clientData,
  formatDate,
  getSubtotal,
  getGST,
  gstPercentage = 9,
  selectedHeader,
  selectedFooter
}: ClientInvoiceProps) {
  const subtotal = getSubtotal(order);
  const gst = getGST(order);
  const displayGstPercentage = gstPercentage;

  const allItems = order.items;

  // Dynamic pagination with notes overflow handling for HTML preview
  // Page dimensions (A4 in approximate px at 96dpi)
  const pageContentHeight = 730; // Usable content height (leaving space for footer ~70px)
  const headerHeight = 260; // Height of header section
  const termsBaseHeight = 160; // Height for terms, totals, signature (without notes)
  const tableHeaderHeight = 30; // Height of table header
  const itemRowHeight = 22; // Height per item row
  const notesLineHeight = 16; // Approximate height per line of notes text
  const charsPerLine = 120; // Approximate characters per line at 10px font

  const notesText = order.notes || '';

  // Split notes into lines for pagination
  const splitNotesIntoLines = (text: string): string[] => {
    if (!text) return [];
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= charsPerLine) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  const allNotesLines = splitNotesIntoLines(notesText);

  // Build pages dynamically
  const pages: { items: OrderItem[]; showHeader: boolean; showTerms: boolean; notesLines?: string[]; isNotesOverflow?: boolean; isFirstNotesPage?: boolean }[] = [];

  let currentPageItems: OrderItem[] = [];
  let currentHeight = headerHeight + tableHeaderHeight;
  let isFirstPage = true;
  let itemIndex = 0;

  // Process all items - fit as many as possible
  while (itemIndex < allItems.length) {
    if (currentHeight + itemRowHeight <= pageContentHeight) {
      currentPageItems.push(allItems[itemIndex]);
      currentHeight += itemRowHeight;
      itemIndex++;
    } else if (currentPageItems.length === 0) {
      currentPageItems.push(allItems[itemIndex]);
      currentHeight += itemRowHeight;
      itemIndex++;
    } else {
      pages.push({
        items: currentPageItems,
        showHeader: isFirstPage,
        showTerms: false
      });
      currentPageItems = [];
      currentHeight = tableHeaderHeight;
      isFirstPage = false;
    }
  }

  // Check if terms fit on the same page
  const termsEndHeight = currentHeight + termsBaseHeight;
  const termsWillFit = termsEndHeight <= pageContentHeight;

  // Calculate space for notes
  const spaceForNotesOnTermsPage = termsWillFit ? pageContentHeight - termsEndHeight - 10 : 0;
  const maxNotesLinesOnTermsPage = Math.max(0, Math.floor(spaceForNotesOnTermsPage / notesLineHeight));
  const firstPageNotesLines = allNotesLines.slice(0, maxNotesLinesOnTermsPage);
  const overflowNotesLines = allNotesLines.slice(maxNotesLinesOnTermsPage);

  // Lines per overflow page (full page minus some margin)
  const linesPerOverflowPage = Math.floor((pageContentHeight - 20) / notesLineHeight);

  // Track if we've shown the "Notes:" label yet
  let notesLabelShown = false;
  const hasNotes = allNotesLines.length > 0;

  if (termsWillFit) {
    const showNotesLabel = hasNotes && firstPageNotesLines.length > 0;
    if (showNotesLabel) notesLabelShown = true;
    pages.push({
      items: currentPageItems,
      showHeader: isFirstPage,
      showTerms: true,
      notesLines: firstPageNotesLines.length > 0 ? firstPageNotesLines : undefined,
      isFirstNotesPage: showNotesLabel
    });
  } else {
    if (currentPageItems.length > 0) {
      pages.push({
        items: currentPageItems,
        showHeader: isFirstPage,
        showTerms: false
      });
    }
    // Calculate notes for separate terms page
    const termsPageNotesSpace = pageContentHeight - termsBaseHeight - 20;
    const maxNotesOnTermsPage = Math.max(0, Math.floor(termsPageNotesSpace / notesLineHeight));
    const termsPageNotes = allNotesLines.slice(0, maxNotesOnTermsPage);
    const remainingAfterTermsPage = allNotesLines.slice(maxNotesOnTermsPage);

    const showNotesLabel = hasNotes && termsPageNotes.length > 0;
    if (showNotesLabel) notesLabelShown = true;
    pages.push({
      items: [],
      showHeader: false,
      showTerms: true,
      notesLines: termsPageNotes.length > 0 ? termsPageNotes : undefined,
      isFirstNotesPage: showNotesLabel
    });

    // Add overflow pages for remaining notes
    if (remainingAfterTermsPage.length > 0) {
      for (let i = 0; i < remainingAfterTermsPage.length; i += linesPerOverflowPage) {
        const isFirst = !notesLabelShown && i === 0;
        if (isFirst) notesLabelShown = true;
        pages.push({
          items: [],
          showHeader: false,
          showTerms: false,
          notesLines: remainingAfterTermsPage.slice(i, i + linesPerOverflowPage),
          isNotesOverflow: true,
          isFirstNotesPage: isFirst
        });
      }
    }
  }

  // Add overflow pages for notes if terms fit but notes overflow
  if (termsWillFit && overflowNotesLines.length > 0) {
    for (let i = 0; i < overflowNotesLines.length; i += linesPerOverflowPage) {
      const isFirst = !notesLabelShown && i === 0;
      if (isFirst) notesLabelShown = true;
      pages.push({
        items: [],
        showHeader: false,
        showTerms: false,
        notesLines: overflowNotesLines.slice(i, i + linesPerOverflowPage),
        isNotesOverflow: true,
        isFirstNotesPage: isFirst
      });
    }
  }

  // Handle no items case
  if (allItems.length === 0 && pages.length === 0) {
    const emptyPageNotesSpace = pageContentHeight - headerHeight - termsBaseHeight - 20;
    const maxNotesOnEmpty = Math.max(0, Math.floor(emptyPageNotesSpace / notesLineHeight));
    pages.push({
      items: [],
      showHeader: true,
      showTerms: true,
      notesLines: allNotesLines.slice(0, maxNotesOnEmpty),
      isFirstNotesPage: allNotesLines.length > 0
    });
    // Add overflow if needed
    const remainingNotes = allNotesLines.slice(maxNotesOnEmpty);
    if (remainingNotes.length > 0) {
      for (let i = 0; i < remainingNotes.length; i += linesPerOverflowPage) {
        pages.push({
          items: [],
          showHeader: false,
          showTerms: false,
          notesLines: remainingNotes.slice(i, i + linesPerOverflowPage),
          isNotesOverflow: true,
          isFirstNotesPage: false
        });
      }
    }
  }

  const totalPages = pages.length;

  // Render footer component
  const renderFooter = () => (
    <div style={{
      position: 'absolute',
      bottom: '15mm',
      left: '0.5in',
      right: '0.5in',
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      lineHeight: '1.6'
    }}>
      {selectedFooter?.line1 && <p style={{ margin: '4px 0' }}>{selectedFooter.line1}</p>}
      {selectedFooter?.line2 && <p style={{ margin: '4px 0' }}>{selectedFooter.line2}</p>}
      {selectedFooter?.line3 && <p style={{ margin: '4px 0' }}>{selectedFooter.line3}</p>}
      {selectedFooter?.line4 && <p style={{ margin: '4px 0' }}>{selectedFooter.line4}</p>}
      {selectedFooter?.line5 && <p style={{ margin: '4px 0' }}>{selectedFooter.line5}</p>}

      {!selectedFooter && (
        <>
          <p style={{ margin: '4px 0 12px 0' }}>The team at Momolato deeply appreciates your kind support.</p>
          <p style={{ margin: '4px 0' }}>Payment instructions:</p>
          <p style={{ margin: '4px 0' }}>
            PayNow : UEN201319550R, cheque (attention to: Momolato Pte Ltd) or bank transfer (details below)
          </p>
          <p style={{ margin: '4px 0' }}>
            OCBC BANK | SWIFT: OCBCSGSG | Account no.: 647 886 415 001 | Momolato Pte Ltd
          </p>
        </>
      )}
    </div>
  );

  // Render table header
  const renderTableHeader = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1.2fr 1.8fr 0.6fr 0.8fr 0.8fr',
      background: 'rgba(184, 230, 231, 0.5)',
      padding: '8px 10px',
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#4db8ba'
    }}>
      <div>PRODUCT / SERVICES</div>
      <div>DESCRIPTION</div>
      <div style={{ textAlign: 'center' }}>QTY</div>
      <div style={{ textAlign: 'right' }}>UNIT PRICE</div>
      <div style={{ textAlign: 'right' }}>AMOUNT</div>
    </div>
  );

  // Render terms and totals - notes use full page width (outside grid), label only on first notes page
  const renderTermsAndTotals = (notesLines?: string[], isFirstNotesPage?: boolean) => (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '35px',
        marginTop: '10px',
        borderTop: '2px dotted #e0e0e0'
      }}>
        {/* Terms & Conditions */}
        <div style={{ paddingRight: '18px' }}>
          <h3 style={{ fontSize: '10px', marginBottom: '8px', marginTop: '3.5px' }}>Terms & Conditions</h3>
          <p style={{ fontSize: '10px', lineHeight: '1.6', marginBottom: '10px' }}>
            We acknowledge that the above goods are received in good condition. Please inform us of any issues
            within 24 hours. Otherwise, kindly note no return or refunds accepted.
          </p>
          <p style={{ fontSize: '10px', lineHeight: '1.6', marginBottom: '10px' }}>
            We are not liable for any damage to products once stored at your premises. Please keep frozen products
            (gelato and / or popsicles) frozen at -18 degree Celsius and below.
          </p>
          <div style={{
            marginTop: '35px',
            paddingTop: '5px',
            borderTop: '1px solid #000',
            width: '250px',
            fontSize: '10px'
          }}>
            Client&apos;s Signature & Company Stamp
          </div>
        </div>

        {/* Totals */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '7px 0', fontSize: '10px' }}>
            <div style={{ width: '130px', textAlign: 'right', paddingRight: '18px', fontWeight: 'bold' }}>SUBTOTAL</div>
            <div style={{ width: '90px', textAlign: 'right' }}>{subtotal.toFixed(2)}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '7px 0', fontSize: '10px' }}>
            <div style={{ width: '130px', textAlign: 'right', paddingRight: '18px', fontWeight: 'bold' }}>GST {displayGstPercentage}%</div>
            <div style={{ width: '90px', textAlign: 'right' }}>{gst.toFixed(2)}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '7px 0', fontSize: '10px' }}>
            <div style={{ width: '130px', textAlign: 'right', paddingRight: '18px', fontWeight: 'bold' }}>TOTAL</div>
            <div style={{ width: '90px', textAlign: 'right' }}>{order.total_amount.toFixed(2)}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', fontSize: '10px' }}>
            <div style={{ width: '130px', textAlign: 'right', paddingRight: '18px', fontWeight: 'bold' }}>BALANCE DUE</div>
            <div style={{ width: '90px', textAlign: 'right', fontSize: '16px', fontWeight: 'bold' }}>${order.total_amount.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Notes Section - FULL PAGE WIDTH, outside the 2-column grid */}
      {notesLines && notesLines.length > 0 && (
        <div style={{
          marginTop: '15px',
          fontSize: '10px',
          lineHeight: '1.6',
          width: '100%'
        }}>
          {isFirstNotesPage && (
            <strong style={{ display: 'block', marginBottom: '5px' }}>Notes:</strong>
          )}
          <p style={{
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word'
          }}>
            {notesLines.join(' ')}
          </p>
        </div>
      )}
    </>
  );

  return (
    <div style={{
      width: '100%',
      backgroundColor: '#e5e7eb',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <style jsx>{`
        @media print {
          @page {
            size: 8.5in 11in;
            margin: 1.27cm;
          }
          .page-break {
            page-break-after: always;
          }
        }
      `}</style>

      {pages.map((page, pageIndex) => (
        <div
          key={pageIndex}
          className={pageIndex < totalPages - 1 ? 'page-break' : ''}
          style={{
            width: '8.5in',
            height: '11in',
            padding: '0.5in',
            backgroundColor: 'white',
            position: 'relative',
            fontFamily: 'Arial, sans-serif',
            boxSizing: 'border-box',
            marginBottom: pageIndex < totalPages - 1 ? '30px' : '0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}
        >
          {/* Header and billing info - only on first page */}
          {page.showHeader && (
            <>
              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '5px'
              }}>
                <div style={{ fontSize: '10px', lineHeight: '1.5', color: '#000' }}>
                  {selectedHeader ? (
                    <>
                      {selectedHeader.line1 && <div style={{ fontWeight: 'bold' }}>{selectedHeader.line1}</div>}
                      {selectedHeader.line2 && <div>{selectedHeader.line2}</div>}
                      {selectedHeader.line3 && <div>{selectedHeader.line3}</div>}
                      {selectedHeader.line4 && <div>{selectedHeader.line4}</div>}
                      {selectedHeader.line5 && <div>{selectedHeader.line5}</div>}
                      {selectedHeader.line6 && <div>{selectedHeader.line6}</div>}
                      {selectedHeader.line7 && <div>{selectedHeader.line7}</div>}
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight: 'bold' }}>Momolato Pte Ltd</div>
                      <div>21 Tampines Street 92, #04-06</div>
                      <div>Singapore</div>
                      <div>finance@momolato.com</div>
                      <div>GST Registration No. : 201319550R</div>
                      <div>Company Registration No. UEN:</div>
                      <div>201319550R</div>
                    </>
                  )}
                </div>
                <div>
                  <Image
                    src="/assets/file_logo.png"
                    alt="Company Logo"
                    width={80}
                    height={60}
                    style={{ objectFit: 'contain' }}
                  />
                </div>
              </div>

              {/* Invoice Title */}
              <h1 style={{
                fontSize: '20px',
                color: '#0D909A',
                fontWeight: '300',
                margin: '5px 0'
              }}>
                Invoice
              </h1>

              {/* Bill To, Ship To, Invoice Details */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '18px',
                marginBottom: '12px'
              }}>
                <div>
                  <h3 style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '5px' }}>BILL TO</h3>
                  <p style={{ fontSize: '10px', margin: 0 }}><strong>{clientData?.client_businessName || 'N/A'}</strong></p>
                  <p style={{ fontSize: '10px', margin: 0, maxWidth: '150px', wordWrap: 'break-word' }}>
                    {clientData?.client_billing_address || 'N/A'}
                  </p>
                </div>

                <div>
                  <h3 style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '5px' }}>SHIP TO</h3>
                  <p style={{ fontSize: '10px', margin: 0 }}><strong>{clientData?.client_businessName || 'N/A'}</strong></p>
                  <p style={{ fontSize: '10px', margin: 0, maxWidth: '150px', wordWrap: 'break-word' }}>
                    {[clientData?.ad_streetName, clientData?.ad_country, clientData?.ad_postal]
                      .filter(Boolean)
                      .join(', ') || order.delivery_address || 'N/A'}
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '10px', margin: '1px 0' }}><strong>INVOICE NO.</strong> {order.invoice_id}</p>
                  <p style={{ fontSize: '10px', margin: '1px 0' }}><strong>DATE</strong> {formatDate(order.delivery_date)}</p>
                  <p style={{ fontSize: '10px', margin: '1px 0' }}><strong>DUE DATE</strong> {formatDate(order.delivery_date)}</p>
                  <p style={{ fontSize: '10px', margin: '1px 0' }}><strong>TERMS</strong> Due on receipt</p>
                </div>
              </div>

              {/* Divider */}
              <hr style={{ border: 'none', borderTop: '1px solid #4db8ba', margin: '12px 0' }} />

              {/* Shipping Section */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 12px',
                paddingRight: '25%',
                margin: '12px 0'
              }}>
                <div style={{ fontSize: '10px' }}>
                  <strong style={{ display: 'block', marginBottom: '3px' }}>SHIP DATE</strong>
                  <span>{formatDate(order.delivery_date)}</span>
                </div>
                <div style={{ fontSize: '10px' }}>
                  <strong style={{ display: 'block', marginBottom: '3px' }}>TRACKING NO.</strong>
                  <span>{order.tracking_no}</span>
                </div>
              </div>
            </>
          )}

          {/* Table - only if there are items on this page */}
          {page.items.length > 0 && (
            <div style={{ margin: '12px 0' }}>
              {renderTableHeader()}

              {page.items.map((item) => (
                <div key={item.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1.8fr 0.6fr 0.8fr 0.8fr',
                  padding: '6px 10px',
                  fontSize: '10px'
                }}>
                  <div>{item.product_type || item.product_name}</div>
                  <div>{item.product_billingName || item.product_name}</div>
                  <div style={{ textAlign: 'center' }}>{item.quantity}</div>
                  <div style={{ textAlign: 'right' }}>{item.unit_price.toFixed(2)}</div>
                  <div style={{ textAlign: 'right' }}>{item.subtotal.toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Terms & Totals - only on designated page */}
          {page.showTerms && renderTermsAndTotals(page.notesLines, page.isFirstNotesPage)}

          {/* Notes Overflow - show label only on first notes page */}
          {page.isNotesOverflow && page.notesLines && page.notesLines.length > 0 && (
            <div style={{
              marginTop: '10px',
              width: '100%'
            }}>
              {page.isFirstNotesPage && (
                <strong style={{ display: 'block', marginBottom: '5px', fontSize: '10px' }}>Notes:</strong>
              )}
              <p style={{
                margin: 0,
                fontSize: '10px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}>
                {page.notesLines?.join(' ')}
              </p>
            </div>
          )}

          {/* Audit Trail — shown at bottom of last page, synced to Xero as a history note */}
          {(page.showTerms || page.isNotesOverflow) && (order.last_modified_by_name || order.xero_invoice_id) && (
            <div style={{
              marginTop: '8px',
              paddingTop: '6px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '8px',
              color: '#9ca3af',
              fontFamily: 'Arial, sans-serif',
            }}>
              {order.last_modified_by_name && order.updated_at && (
                <span>
                  Last modified by: <strong>{order.last_modified_by_name}</strong>{' '}
                  on {new Date(order.updated_at).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}
                </span>
              )}
              {order.xero_invoice_id && (
                <span>
                  Xero ID: {order.xero_invoice_id}
                  {order.xero_synced_at && (
                    <> · Synced: {new Date(order.xero_synced_at).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}</>
                  )}
                </span>
              )}
            </div>
          )}

          {/* Footer - on every page */}
          {renderFooter()}
        </div>
      ))}
    </div>
  );
}
