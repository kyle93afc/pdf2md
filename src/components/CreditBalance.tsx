"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { doc, onSnapshot, collection, query, where, limit, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { Loader2 } from 'lucide-react';

export default function CreditBalance() {
  const { user } = useAuth();
  const [subscriptionPages, setSubscriptionPages] = useState<number | null>(null);
  const [oneTimeCredits, setOneTimeCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('CreditBalance: User state changed', { userId: user?.uid });
    
    if (!user) {
      setSubscriptionPages(null);
      setOneTimeCredits(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    let unsubCredits: (() => void) | null = null;
    let unsubSubscription: (() => void) | null = null;
    let activeListeners = 2;

    const checkLoadingDone = () => {
      activeListeners -= 1;
      if (activeListeners === 0) {
        setLoading(false);
      }
    };

    console.log('CreditBalance: Setting up Firestore listener for user_credits', {
      path: `user_credits/${user.uid}`,
    });
    const creditsRef = doc(db, 'user_credits', user.uid);
    unsubCredits = onSnapshot(
      creditsRef,
      (docSnap) => {
        console.log('CreditBalance: Received user_credits update', {
          exists: docSnap.exists(),
          data: docSnap.data(),
        });
        setOneTimeCredits(docSnap.exists() ? docSnap.data()?.balance ?? 0 : 0);
        checkLoadingDone();
        setError(null);
      },
      (error) => {
        console.error('CreditBalance: Error fetching user_credits:', error);
        setOneTimeCredits(0);
        setError('Failed to load credits.');
        checkLoadingDone();
      }
    );

    console.log('CreditBalance: Setting up Firestore listener for active user_subscriptions', {
      userId: user.uid,
    });
    const subscriptionQuery = query(
      collection(db, 'user_subscriptions'),
      where('userId', '==', user.uid),
      where('status', '==', 'active'),
      limit(1)
    );

    unsubSubscription = onSnapshot(
      subscriptionQuery,
      (querySnapshot) => {
        console.log('CreditBalance: Received user_subscriptions update', {
          empty: querySnapshot.empty,
          docs: querySnapshot.docs.map(d => ({ id: d.id, data: d.data() })),
        });
        if (!querySnapshot.empty) {
          const subDoc = querySnapshot.docs[0];
          const data = subDoc.data() as DocumentData;
          setSubscriptionPages(data.pagesPerMonth ?? null);
        } else {
          setSubscriptionPages(null);
        }
        checkLoadingDone();
        setError(null);
      },
      (error) => {
        console.error('CreditBalance: Error fetching user_subscriptions:', error);
        setSubscriptionPages(null);
        setError('Failed to load subscription status.');
        checkLoadingDone();
      }
    );

    return () => {
      console.log('CreditBalance: Cleaning up Firestore listeners');
      if (unsubCredits) unsubCredits();
      if (unsubSubscription) unsubSubscription();
    };
  }, [user]);

  if (!user) return null;

  const displayCredits = subscriptionPages !== null ? subscriptionPages : oneTimeCredits;

  return (
    <div className="flex items-center gap-2 text-sm">
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : error ? (
        <span className="text-red-500 text-xs">{error}</span>
      ) : (
        <>
          <span className="font-medium">Credits:</span>
          <span>{displayCredits?.toLocaleString() ?? 0} pages</span>
        </>
      )}
    </div>
  );
} 