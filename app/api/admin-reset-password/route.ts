import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Check if required environment variables are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing required environment variables');
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    // Create Supabase client with service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { email, newPassword } = await request.json();

    // Validate input
    if (!email || !newPassword) {
      return NextResponse.json(
        { error: 'Email and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Get admin user by email from admin_user table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('admin_user')
      .select('admin_auth_id')
      .eq('admin_email', email.trim().toLowerCase())
      .single();

    if (userError || !userData?.admin_auth_id) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      );
    }

    // Update auth password using admin API
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userData.admin_auth_id,
      { password: newPassword }
    );

    if (authError) {
      console.error('Error updating auth password:', authError);
      return NextResponse.json(
        { error: 'Failed to update authentication password' },
        { status: 500 }
      );
    }

    // Update admin_user table password
    const { error: updateError } = await supabaseAdmin
      .from('admin_user')
      .update({ admin_password: newPassword })
      .eq('admin_email', email.trim().toLowerCase());

    if (updateError) {
      console.error('Error updating admin password:', updateError);
      return NextResponse.json(
        { error: 'Failed to update admin password' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Admin password updated successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in admin-reset-password API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}