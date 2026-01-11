'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/client';

interface Message {
  type: 'success' | 'error' | '';
  text: string;
}

export default function ResetPasswordPage() {
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message>({ type: '', text: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const handleEmailSubmit = async () => {
  setLoading(true);
  setMessage({ type: '', text: '' });

  try {
    // Query the client_user table to verify email exists
    const { data, error } = await supabase
      .from('client_user')
      .select('client_auth_id, client_email')
      .eq('client_email', email.trim().toLowerCase())
      .single();

    if (error || !data) {
      setMessage({
        type: 'error',
        text: 'Email not found. Please check your email address.',
      });
      setLoading(false);
      return;
    }

    const authIdValue = data.client_auth_id;

    if (!authIdValue) {
      setMessage({
        type: 'error',
        text: 'No authentication account found for this email.',
      });
      setLoading(false);
      return;
    }

    // Move to password step - email found is considered authenticated
    setStep('password');
    setMessage({ type: 'success', text: 'Email verified! Please enter your new password.' });
    
  } catch (error) {
    console.error('Error verifying email:', error);
    setMessage({
      type: 'error',
      text: 'Failed to verify email. Please try again.',
    });
  } finally {
    setLoading(false);
  }
};

const handlePasswordSubmit = async () => {
  setLoading(true);
  setMessage({ type: '', text: '' });

  if (password.length < 6) {
    setMessage({
      type: 'error',
      text: 'Password must be at least 6 characters long.',
    });
    setLoading(false);
    return;
  }

  if (password !== confirmPassword) {
    setMessage({
      type: 'error',
      text: 'Passwords do not match.',
    });
    setLoading(false);
    return;
  }

  try {
    // Call the API route to update password
    const response = await fetch('/api/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        newPassword: password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage({
        type: 'error',
        text: data.error || 'Failed to update password.',
      });
      setLoading(false);
      return;
    }

    setMessage({
      type: 'success',
      text: 'Password updated successfully! Redirecting to login...',
    });

    setTimeout(() => {
      router.push('/');
    }, 2000);
  } catch (error) {
    console.error('Error updating password:', error);
    setMessage({
      type: 'error',
      text: 'Failed to update password. Please try again.',
    });
  } finally {
    setLoading(false);
  }
};

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (step === 'email' && email.trim()) {
        handleEmailSubmit();
      } else if (step === 'password' && password && confirmPassword) {
        handlePasswordSubmit();
      }
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

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        {/* Reset Password Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
          <h2
            className="text-2xl font-bold text-center mb-2"
            style={{ color: '#7d3c3c' }}
          >
            Reset Password
          </h2>
          <p className="text-sm text-gray-600 text-center mb-6">
            {step === 'email' 
              ? 'Enter your email address to continue.' 
              : 'Enter your new password below.'}
          </p>

          {/* Message Display */}
          {message.text && (
            <div
              className="mb-4 p-3 rounded-lg text-sm"
              style={{
                backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
                color: message.type === 'success' ? '#155724' : '#721c24',
                border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
              }}
            >
              {message.text}
            </div>
          )}

          {/* Email Step */}
          {step === 'email' && (
            <>
              <div className="mb-6">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-2"
                  style={{ color: '#7d3c3c' }}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                />
              </div>

              <button
                onClick={handleEmailSubmit}
                disabled={loading || !email.trim()}
                className="w-full py-2 px-4 rounded-lg text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: '#e84e1b' }}
              >
                {loading ? 'Verifying...' : 'Continue'}
              </button>
            </>
          )}

          {/* Password Step */}
          {step === 'password' && (
            <>
              <p className="text-xs text-gray-500 text-center mb-4">
                Email: {email}
              </p>

              {/* New Password Input */}
              <div className="mb-4">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium mb-2"
                  style={{ color: '#7d3c3c' }}
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 pr-10"
                    placeholder="Enter new password"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
              </div>

              {/* Confirm Password Input */}
              <div className="mb-6">
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium mb-2"
                  style={{ color: '#7d3c3c' }}
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 pr-10"
                    placeholder="Confirm new password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={handlePasswordSubmit}
                disabled={loading || !password || !confirmPassword}
                className="w-full py-2 px-4 rounded-lg text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: '#e84e1b' }}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </>
          )}

          {/* Back to Login Link */}
          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-sm hover:underline"
              style={{ color: '#e84e1b' }}
            >
              Back to Login
            </button>
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