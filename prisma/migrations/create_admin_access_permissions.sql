-- Create admin access permissions table
-- This table stores access control settings for staff users

CREATE TABLE IF NOT EXISTS admin_access_permissions (
    id SERIAL PRIMARY KEY,
    admin_auth_id VARCHAR(255) NOT NULL UNIQUE,
    permissions JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_admin_user
        FOREIGN KEY (admin_auth_id)
        REFERENCES admin_user(admin_auth_id)
        ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_access_permissions_auth_id ON admin_access_permissions(admin_auth_id);

-- Example permissions JSON structure:
-- {
--   "client": { "view": true, "edit": true, "submenus": { "client": { "view": true, "edit": true }, "statement": { "view": true, "edit": false }, "quotation": { "view": true, "edit": false } } },
--   "product": { "view": true, "edit": true, "submenus": { "product-list": { "view": true, "edit": true }, "ingredients": { "view": true, "edit": false } } },
--   "orders": { "view": true, "edit": true, "submenus": { "order": { "view": true, "edit": true }, "online-order": { "view": true, "edit": false } } },
--   "report": { "view": true, "edit": false, "submenus": { "product-analysis": { "view": true, "edit": false }, "product-analysis-customer": { "view": true, "edit": false }, "delivery-list": { "view": true, "edit": false } } }
-- }
