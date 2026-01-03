'use client';

import { useEffect } from 'react';

interface LoadingSpinnerProps {
  duration?: number; // in milliseconds
  onComplete?: () => void;
}

export default function LoadingSpinner({ 
  duration = 3000,
  onComplete 
}: LoadingSpinnerProps) {
  
  useEffect(() => {
    if (onComplete && duration) {
      const timer = setTimeout(() => {
        onComplete();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onComplete]);

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
    >
      <div className="bg-white rounded-lg p-8 flex flex-col items-center justify-center shadow-xl w-48 h-48">
        {/* Spinner */}
        <div 
          className="w-16 h-16 border-4 border-solid rounded-full animate-spin mb-4"
          style={{ 
            borderColor: '#e84e1b',
            borderTopColor: 'transparent'
          }}
        />
        
        {/* Message */}
        <p 
          className="text-lg font-semibold"
          style={{ color: '#7d3c3c' }}
        >
          Loading...
        </p>
      </div>
    </div>
  );
}