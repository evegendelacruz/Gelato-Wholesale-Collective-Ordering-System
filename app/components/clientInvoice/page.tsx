'use client';

interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  packaging_type: string;
  subtotal: number;
}

interface Order {
  id: number;
  order_id: string;
  invoice_id: string;
  tracking_no: string;
  order_date: string;
  delivery_address: string;
  total_amount: number;
  status: string;
  notes: string | null;
  items: OrderItem[];
}

interface ClientData {
  client_businessName: string;
  client_delivery_address: string;
  client_person_incharge: string;
}

interface ClientInvoiceProps {
  order: Order;
  clientData: ClientData;
  formatDate: (dateString: string) => string;
  formatPackaging: (packaging: string) => string;
  getSubtotal: (order: Order) => number;
  getGST: (order: Order) => number;
}

export default function ClientInvoice({
  order,
  clientData,
  formatDate,
  formatPackaging,
  getSubtotal,
  getGST
}: ClientInvoiceProps) {
  const subtotal = getSubtotal(order);
  const gst = getGST(order);

  return (
    <div style={{
      width: '100%',
      minHeight: '100%',
      backgroundColor: '#525659',
      padding: '40px',
      boxSizing: 'border-box',
      position: 'relative'
    }}>
      <div 
        id="invoice-content"
        style={{ 
          width: '8.5in', 
          height: '13in',
          margin: '0 auto',
          padding: '0.5in 0.5in 0.19in 0.5in',
          backgroundColor: 'white',
          position: 'relative',
          fontFamily: 'Arial MT, sans-serif',
          boxSizing: 'border-box',
          boxShadow: '0 0 15px rgba(0,0,0,0.4)',
          marginBottom: '40px'
        }}>
        <style jsx>{`
          @media print {
            @page {
                size: 8.5in 11in;
                margin: 1.27cm 1.27cm 0 1.27cm;
            }
            
            html, body {
                width: 8.5in;
                height: 11in;
                margin: 0;
                padding: 0;
            }
          }
          
          .invoice-content {
            width: 100%;
            height: 100%;
            position: relative;
          }
          
          .header-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 5px;
          }
          .company-info {
            font-size: 10px;
            line-height: 1.5;
            color: #000;
          }
          .company-info .company-name {
            font-weight: bold;
            margin-bottom: 0px;
          }
          .logo {
            font-family: 'Brush Script MT', cursive;
            font-size: 38px;
            font-style: italic;
            color: #000;
            font-weight: normal;
            width: 120px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .logo img {
            max-width: 100%;
            height: auto;
            display: block;
          }
          .tax-invoice-title {
            font-size: 20px;
            color: #0D909A;
            font-weight: 300;
            margin: 5px 0 5px 0;
          }
          .three-column-section {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 18px;
            margin-bottom: 12px;
          }
          .info-box h3 {
            font-size: 10px;
            font-weight: bold;
            color: #000;
            margin-bottom: 5px;
          }
          .info-box p {
            font-size: 10px;
            color: #000;
            line-height: 1.5;
            margin: 0;
          }
          .invoice-meta-box {
            text-align: right;
          }
          .invoice-meta-box p {
            margin: 1px 0;
            font-size: 10px;
            line-height: 1.6;
          }
          .invoice-meta-box strong {
            font-weight: bold;
          }
          .horizontal-divider {
            border: none;
            border-top: 1px solid #4db8ba;
            margin: 12px 0;
          }
          .shipping-section {
            display: flex;
            justify-content: space-between;
            padding: 8px 12px;
            margin: 12px 0;
          }
          .shipping-item {
            font-size: 10px;
          }
          .shipping-item strong {
            display: block;
            font-weight: bold;
            margin-bottom: 3px;
          }
          .table-section {
            margin: 12px 0;
          }
          .table-header {
            display: grid;
            grid-template-columns: 1.2fr 1.8fr 0.6fr 0.8fr 0.8fr;
            background: rgba(184, 230, 231, 0.5);
            padding: 8px 10px;
            font-size: 10px;
            font-weight: bold;
            color: #4db8ba;
          }
          .table-header-col {
            text-align: left;
          }
          .table-header-col.qty {
            text-align: center;
          }
          .table-header-col.price {
            text-align: right;
          }
          .table-header-col.amount {
            text-align: right;
          }
          .table-row {
            display: grid;
            grid-template-columns: 1.2fr 1.8fr 0.6fr 0.8fr 0.8fr;
            padding: 6px 10px;
            font-size: 10px;
          }
          .table-col {
            text-align: left;
          }
          .table-col.qty {
            text-align: center;
          }
          .table-col.price {
            text-align: right;
          }
          .table-col.amount {
            text-align: right;
          }
          .bottom-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 35px;
            margin-top: 10px;
            padding-bottom: 170px;
            border-top: 2px dotted #e0e0e0;
          }
          .terms-section {
            padding-right: 18px;
          }
          .terms-section h3 {
            font-size: 10px;
            margin-bottom: 8px;
            margin-top: 3.5px;
          }
          .terms-section p {
            font-size: 10px;
            line-height: 1.6;
            margin-bottom: 10px;
            color: #000;
          }
          .totals-section {
            text-align: right;
          }
          .totals-row {
            display: flex;
            justify-content: flex-end;
            margin: 7px 0;
            font-size: 10px;
          }
          .totals-label {
            width: 130px;
            text-align: right;
            padding-right: 18px;
            font-weight: bold;
          }
          .totals-value {
            width: 90px;
            text-align: right;
          }
          .balance-due-row {
            margin-top: 10px;
            padding-top: 0px;
          }
          .balance-due-row .totals-label {
            font-size: 10px;
            font-weight: bold;
          }
          .balance-due-row .totals-value {
            font-size: 16px;
            font-weight: bold;
          }
          .signature-line {
            margin-top: 35px;
            padding-top: 5px;
            border-top: 1px solid #000;
            width: 250px;
            font-size: 10px;
          }
          .footer-section {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 10px;
            line-height: 1.6;
          }
          .footer-section p {
            margin: 4px 0;
          }
          .footer-thank-you {
            margin-bottom: 12px;
          }
          
          @media print {
            .footer-section {
              position: fixed;
              bottom: 0.5in;
            }
          }
        `}</style>

        <div className="invoice-content">
          {/* Header */}
          <div className="header-section">
            <div className="company-info">
              <div className="company-name">Momolato Pte Ltd</div>
              <div>21 Tampines Street 92, #04-06</div>
              <div>Singapore</div>
              <div>finance@momolato.com</div>
              <div>GST Registration No. : 201319550R</div>
              <div>Company Registration No. UEN:</div>
              <div>201319550R</div>
            </div>
            <div className="logo">
              <img 
                src="/assets/Picture1.jpg" 
                alt="Momolato" 
                crossOrigin="anonymous"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
          </div>

          {/* Tax Invoice Title */}
          <h1 className="tax-invoice-title">Tax Invoice</h1>

          {/* Three Column Section: Bill To, Ship To, Invoice Details */}
          <div className="three-column-section">
            <div className="info-box">
              <h3>BILL TO</h3>
              <p><strong>{clientData?.client_businessName || 'N/A'}</strong></p>
              <p>{clientData?.client_delivery_address || 'N/A'}</p>
            </div>
            
            <div className="info-box">
              <h3>SHIP TO</h3>
              <p><strong>{clientData?.client_businessName || 'N/A'}</strong></p>
              <p>{order.delivery_address || clientData?.client_delivery_address || 'N/A'}</p>
            </div>

            <div className="info-box invoice-meta-box">
              <p><strong>INVOICE NO.</strong> {order.invoice_id}</p>
              <p><strong>DATE</strong> {formatDate(order.order_date)}</p>
              <p><strong>DUE DATE</strong> {formatDate(order.order_date)}</p>
              <p><strong>TERMS</strong> Due on receipt</p>
            </div>
          </div>

          {/* Horizontal Divider */}
          <hr className="horizontal-divider" />

          {/* Shipping Section */}
          <div className="shipping-section">
            <div className="shipping-item">
              <strong>SHIP DATE</strong>
              <span>{formatDate(order.order_date)}</span>
            </div>
            <div className="shipping-item">
              <strong>TRACKING NO.</strong>
              <span>{order.tracking_no}</span>
            </div>
          </div>

          {/* Table */}
          <div className="table-section">
            <div className="table-header">
              <div className="table-header-col">PRODUCT / SERVICES</div>
              <div className="table-header-col">DESCRIPTION</div>
              <div className="table-header-col qty">QTY</div>
              <div className="table-header-col price">UNIT PRICE</div>
              <div className="table-header-col amount">AMOUNT</div>
            </div>

            {order.items.map((item) => (
              <div key={item.id} className="table-row">
                <div className="table-col">{item.product_name} ({formatPackaging(item.packaging_type)})</div>
                <div className="table-col">{item.product_name} ({formatPackaging(item.packaging_type)})</div>
                <div className="table-col qty">{item.quantity}</div>
                <div className="table-col price">{item.unit_price.toFixed(2)}</div>
                <div className="table-col amount">{item.subtotal.toFixed(2)}</div>
              </div>
            ))}
          </div>

          {/* Bottom Section: Terms & Totals side by side */}
          <div className="bottom-section">
            {/* Terms & Conditions */}
            <div className="terms-section">
              <h3>Terms & Conditions</h3>
              <p>
                We acknowledge that the above goods are received in good condition. Please inform us of any issues 
                within 24 hours. Otherwise, kindly note no return or refunds accepted.
              </p>
              <p>
                We are not liable for any damage to products once stored at your premises. Please keep frozen products 
                (gelato and / or popsicles) frozen at -18 degree Celsius and below.
              </p>
              
              {/* Signature Line */}
              <div className="signature-line">Client&apos;s Signature & Company Stamp</div>
            </div>

            {/* Totals */}
            <div className="totals-section">
              <div className="totals-row">
                <div className="totals-label">SUBTOTAL</div>
                <div className="totals-value">{subtotal.toFixed(2)}</div>
              </div>
              <div className="totals-row">
                <div className="totals-label">GST TOTAL</div>
                <div className="totals-value">{gst.toFixed(2)}</div>
              </div>
              <div className="totals-row">
                <div className="totals-label">TOTAL</div>
                <div className="totals-value">{order.total_amount.toFixed(2)}</div>
              </div>
              <div className="totals-row balance-due-row">
                <div className="totals-label">BALANCE DUE</div>
                <div className="totals-value">S${order.total_amount.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Footer - Fixed at bottom of page */}
          <div className="footer-section">
            <p className="footer-thank-you">The team at Momolato deeply appreciates your kind support.</p>
            <p>Payment instructions:</p>
            <p>
              PayNow : UEN201319550R, cheque (attention to: Momolato Pte Ltd) or bank transfer (details below)
            </p>
            <p>
              OCBC BANK | SWIFT: OCBCSGSG | Account no.: 647 886 415 001 | Momolato Pte Ltd
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}