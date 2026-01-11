'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import supabase from '@/lib/client';
import { useRouter } from 'next/navigation';

export default function Home() {
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
  setIsLoading(true);

  const trimmedEmail = email.trim();
  const trimmedPassword = password.trim();

  if (!validateEmail(trimmedEmail)) {
    setEmailError('Invalid email');
    setIsLoading(false);
    return;
  }

  if (!trimmedPassword) {
    setLoginError('Password is required');
    setIsLoading(false);
    return;
  }

  try {
    // 1️⃣ AUTH FIRST (this creates auth.uid for RLS)
    const { error: authError } =
      await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });

    if (authError) {
      setLoginError('Invalid email or password');
      setIsLoading(false);
      return;
    }

    // 2️⃣ NOW query client_user (RLS-safe)
    const { data: clientUser, error: queryError } = await supabase
      .from('client_user')
      .select('*')
      .eq('client_email', trimmedEmail)
      .maybeSingle();

    if (queryError || !clientUser) {
      setLoginError('Invalid email or password');
      setIsLoading(false);
      return;
    }

    // 3️⃣ Ensure auth user is linked
    if (!clientUser.client_auth_id) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from('client_user')
          .update({ client_auth_id: user.id })
          .eq('client_email', trimmedEmail);
      }
    }

    // 4️⃣ SUCCESS
    setSuccessMessage('Login successful! Redirecting...');
    setTimeout(() => router.push('/client'), 1000);

  } catch (err) {
    console.error(err);
    setLoginError('An unexpected error occurred');
  } finally {
    setIsLoading(false);
  }
};


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{
      backgroundImage: 'url("/assets/background.png")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundColor: '#f5e6d3',
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

        {/* Login Card */}
        <div className="relative bg-white rounded-lg shadow-2xl p-8 w-full max-w-sm">
          <h2 className="text-2xl font-bold mb-2 text-left" style={{ color: '#7d3c3c' }}>
            LOGIN
          </h2>
          <p className="text-sm text-gray-600 mb-4 text-left">
            Enter your credentials to login your account.
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
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className={`w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:border-transparent ${
                  emailError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-orange-500'
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
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className={`w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-10 ${
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

            {/* Administrator Login Link */}
            <div className="mt-4 text-center">
              <a href="/admin" className="text-sm hover:underline" style={{ color: '#7d3c3c' }}>
                Administrator Here
              </a>
            </div>

            {/* Forgot Password Link */}
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => router.push('/reset')}
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