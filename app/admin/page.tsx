'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import client from '../../lib/client';
import Link from 'next/link';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setLoginError('');
    
    if (value && !validateEmail(value)) {
      setEmailError('Invalid email');
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async () => {
    setLoginError('');
    setSuccessMessage('');

    if (!validateEmail(email)) {
      setEmailError('Invalid email');
      return;
    }

    if (!password) {
      setLoginError('Password is required');
      return;
    }

    setIsLoading(true);

    try {
      // Check if user exists in admin_user table
      const { data: adminUser, error: queryError } = await client
        .from('admin_user')
        .select('*')
        .eq('admin_email', email)
        .single();

      if (queryError || !adminUser) {
        setLoginError('Invalid email or password');
        setIsLoading(false);
        return;
      }

      // Check if password matches
      if (adminUser.admin_password !== password) {
        setLoginError('Invalid email or password');
        setIsLoading(false);
        return;
      }

      // Try to sign in with Supabase Auth
      const { data: authData, error: signInError } = await client.auth.signInWithPassword({
        email: email,
        password: password,
      });

      // If sign in fails because user doesn't exist in Auth, create the auth user
      if (signInError) {
        if (signInError.message.includes('Invalid login credentials') || 
            signInError.message.includes('Email not confirmed')) {
          
          // Create auth user
          const { data: signUpData, error: signUpError } = await client.auth.signUp({
            email: email,
            password: password,
            options: {
              emailRedirectTo: undefined, // Skip email confirmation
            }
          });

          if (signUpError) {
            console.error('Sign up error:', signUpError);
            setLoginError('Authentication setup failed. Please contact support.');
            setIsLoading(false);
            return;
          }

          // Update admin_user with the new auth_id
          if (signUpData.user) {
            const { error: updateError } = await client
              .from('admin_user')
              .update({ admin_auth_id: signUpData.user.id })
              .eq('admin_email', email);

            if (updateError) {
              console.error('Update error:', updateError);
            }
          }

          setSuccessMessage('Login successful! Redirecting...');
          console.log('Admin logged in (new auth):', {
            auth_id: signUpData.user?.id,
            account_id: adminUser.admin_acc_id,
            name: adminUser.admin_fullName,
            role: adminUser.admin_role
          });
          
          setTimeout(() => {
            router.push('/admin/dashboard');
          }, 1000);
          
          return;
        } else {
          console.error('Auth error:', signInError);
          setLoginError('Authentication failed. Please try again.');
          setIsLoading(false);
          return;
        }
      }

      // Verify auth user matches admin record (if auth_id exists)
      if (authData.user && adminUser.admin_auth_id && authData.user.id !== adminUser.admin_auth_id) {
        console.error('User ID mismatch');
        await client.auth.signOut();
        setLoginError('Account verification failed');
        setIsLoading(false);
        return;
      }

      // Update admin_auth_id if it's null
      if (authData.user && !adminUser.admin_auth_id) {
        await client
          .from('admin_user')
          .update({ admin_auth_id: authData.user.id })
          .eq('admin_email', email);
      }

      setSuccessMessage('Login successful! Redirecting...');
      console.log('Admin logged in:', {
        auth_id: authData.user?.id,
        account_id: adminUser.admin_acc_id,
        name: adminUser.admin_fullName,
        role: adminUser.admin_role
      });
      
      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 1000);
      
    } catch (err) {
      setLoginError('An unexpected error occurred');
      console.error('Login error:', err);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{
      backgroundImage: 'url("/assets/background.png")',
      backgroundSize: 'cover',     
      backgroundPosition: 'center',
      fontFamily: '"Roboto Condensed", sans-serif'
    }}>
      {/* Header */}
      <header className="w-full py-4 px-8" style={{ backgroundColor: '#7A1F1F', color: '#FCF0E3' }}>
        <h1 className="font-normal text-4xl text-center" style={{ fontFamily: 'Egyptienne MN, serif'}}>
          Gelato Wholesale Collective
        </h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 relative">
        {/* Background overlay */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'linear-gradient(rgba(245, 230, 211, 0.8), rgba(245, 230, 211, 0.8))',
        }}></div>

        {/* Admin Login Card */}
        <div className="relative bg-white rounded-lg shadow-2xl p-8 w-full max-w-sm">

          <h2 className="text-2xl font-bold mb-2 text-left" style={{ color: '#7d3c3c' }}>
            ADMIN LOGIN
          </h2>
          <p className="text-sm text-gray-600 mb-6 text-left">
            Enter your administrator credentials to access the system.
          </p>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {successMessage}
            </div>
          )}

          {/* Error Message */}
          {loginError && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {loginError}
            </div>
          )}

          <div>
            {/* Email Field */}
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={handleEmailChange}
                disabled={isLoading}
                className={`w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:border-transparent ${
                  emailError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-red-900'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              {emailError && (
                <p className="text-red-500 text-xs mt-1">{emailError}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className={`w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:border-transparent pr-10 ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className={`w-full py-3 rounded text-white font-semibold text-sm tracking-wider transition-colors hover:opacity-90 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              style={{ backgroundColor: '#e84e1b' }}
            >
              {isLoading ? 'LOGGING IN...' : 'LOGIN'}
            </button>

            {/* Back to User Login Link */}
            <div className="mt-4 text-center">
              <Link href="/" className="text-sm hover:underline" style={{ color: '#7d3c3c' }}>
                Client Here
              </Link>
            </div>

            {/* Forgot Password Link */}
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => router.push('/admin/reset')}
                className="text-sm hover:underline"
                style={{ color: '#e84e1b' }}
              >
                Forgot Password?
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 px-8 text-white text-sm" style={{ backgroundColor: '#7A1F1F', color: '#FCF0E3' }}>
        <p>Gelato Wholesale Collective | © 2025 All Rights Reserved</p>
      </footer>
    </div>
  );
}