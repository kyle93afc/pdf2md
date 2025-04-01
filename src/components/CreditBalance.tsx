'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { Loader2 } from 'lucide-react';

export default function CreditBalance() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('CreditBalance: User state changed', { userId: user?.uid });
    
    if (!user) {
      setCredits(null);
      setLoading(false);
      return;
    }

    console.log('CreditBalance: Setting up Firestore listener', {
      path: `user_credits/${user.uid}`,
    });

    // Subscribe to credit updates
    const unsubscribe = onSnapshot(
      doc(db, 'user_credits', user.uid),
      (doc) => {
        console.log('CreditBalance: Received Firestore update', {
          exists: doc.exists(),
          data: doc.data(),
        });
        setCredits(doc.exists() ? doc.data().balance : 0);
        setLoading(false);
      },
      (error) => {
        console.error('CreditBalance: Error fetching credits:', error);
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
    <div className="flex items-center gap-2 text-sm">
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <span className="font-medium">Credits:</span>
          <span>{credits?.toLocaleString() ?? 0} pages</span>
        </>
      )}
    </div>
  );
} 