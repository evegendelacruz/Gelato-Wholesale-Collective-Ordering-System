-- Create client_quotation table
CREATE TABLE IF NOT EXISTS client_quotation (
    id SERIAL PRIMARY KEY,
    quotation_id VARCHAR(50) UNIQUE NOT NULL,
    client_auth_id UUID REFERENCES client_user(client_auth_id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    business_address TEXT,
    date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create client_quotation_item table
CREATE TABLE IF NOT EXISTS client_quotation_item (
    id SERIAL PRIMARY KEY,
    quotation_id INTEGER NOT NULL REFERENCES client_quotation(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES product_list(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_client_quotation_client_auth_id ON client_quotation(client_auth_id);
CREATE INDEX IF NOT EXISTS idx_client_quotation_date_created ON client_quotation(date_created);
CREATE INDEX IF NOT EXISTS idx_client_quotation_status ON client_quotation(status);
CREATE INDEX IF NOT EXISTS idx_client_quotation_item_quotation_id ON client_quotation_item(quotation_id);
