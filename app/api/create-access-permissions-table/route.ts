import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST() {
  try {
    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Create the table using raw SQL via RPC
    // Note: This requires a Postgres function to be set up, or you can create the table via Supabase dashboard
    const { error } = await supabase.rpc('create_access_permissions_table');

    if (error) {
      // If RPC doesn't exist, return instructions
      return NextResponse.json({
        success: false,
        message: 'Please create the table manually in Supabase SQL Editor',
        sql: `
CREATE TABLE IF NOT EXISTS admin_access_permissions (
    id SERIAL PRIMARY KEY,
    admin_auth_id VARCHAR(255) NOT NULL UNIQUE,
    permissions JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_access_permissions_auth_id ON admin_access_permissions(admin_auth_id);
        `.trim()
      });
    }

    return NextResponse.json({ success: true, message: 'Table created successfully' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to create table' },
      { status: 500 }
    );
  }
}
