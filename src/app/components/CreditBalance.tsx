'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { db } from '@/lib/firebase/firebase';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';

export default function CreditBalance() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setCredits(0);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    console.log(`CreditBalance: Setting up Firestore listener for user ${user.uid}`);

    const creditsRef = doc(db, 'user_credits', user.uid);

    const unsubscribe = onSnapshot(creditsRef, 
      (docSnap) => {
        setLoading(false);
        if (docSnap.exists()) {
          const data = docSnap.data() as DocumentData;
          const balance = data.balance ?? 0;
          console.log(`CreditBalance: Received Firestore update - balance: ${balance}`);
          setCredits(balance);
        } else {
          console.log('CreditBalance: Received Firestore update - document does not exist.');
          setCredits(0);
        }
        setError(null);
      },
      (err) => {
        console.error('CreditBalance: Firestore listener error:', err);
        setError('Failed to load credits.');
        setCredits(0);
        setLoading(false);
      }
    );

    return () => {
      console.log('CreditBalance: Cleaning up Firestore listener');
      unsubscribe();
    };

  }, [user]);

  if (!user) return null;

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
      <span className="font-medium text-gray-700">
        {loading ? '...' : credits} Credits
      </span>
    </div>
  );
} 