"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, XCircle } from "lucide-react";
import Link from "next/link";

export default function SubscriptionCancelPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="max-w-md w-full mx-auto text-center">
        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-4">Subscription Cancelled</h1>
        <p className="text-lg mb-6">
          Your subscription process was cancelled. You can still use the free tier or try again later.
        </p>
        <div className="space-y-4">
          <Button asChild className="w-full">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
} 