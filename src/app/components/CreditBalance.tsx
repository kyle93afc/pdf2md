'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';

export default function CreditBalance() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCredits = async () => {
      if (!user) {
        setCredits(null);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/stripe/credits');
        const data = await response.json();
        setCredits(data.balance);
      } catch (error) {
        console.error('Error fetching credits:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCredits();
  }, [user]);

  if (!user || loading) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm">
      <svg
        className="w-5 h-5 text-blue-500"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="font-medium text-gray-700">{credits} Credits</span>
    </div>
  );
} 