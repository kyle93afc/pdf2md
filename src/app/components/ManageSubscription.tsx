'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';

export default function ManageSubscription() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handlePortalAccess = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error accessing customer portal:', error);
      alert('Failed to access the customer portal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <button
      onClick={handlePortalAccess}
      disabled={loading}
      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
        loading ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Processing...
        </>
      ) : (
        'Manage Subscription'
      )}
    </button>
  );
} 