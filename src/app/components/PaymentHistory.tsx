'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';

interface Payment {
  transactionId: string;
  amount: number;
  credits: number;
  status: 'succeeded' | 'failed' | 'refunded';
  createdAt: string;
}

export default function PaymentHistory() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPaymentHistory = async () => {
      if (!user) {
        setPayments([]);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/stripe/payment-history');
        const data = await response.json();
        setPayments(data.payments);
      } catch (error) {
        console.error('Error fetching payment history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentHistory();
  }, [user]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No payment history available
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">Payment History</h3>
      </div>
      <div className="border-t border-gray-200">
        <ul role="list" className="divide-y divide-gray-200">
          {payments.map((payment) => (
            <li key={payment.transactionId} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-gray-900">
                    {payment.credits} Credits
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <p className="text-sm font-medium text-gray-900">
                    ${payment.amount.toFixed(2)}
                  </p>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                      ${
                        payment.status === 'succeeded'
                          ? 'bg-green-100 text-green-800'
                          : payment.status === 'refunded'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }
                    `}
                  >
                    {payment.status}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 