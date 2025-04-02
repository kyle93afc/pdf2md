"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";

export default function SubscriptionSuccessPage() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [verifying, setVerifying] = useState(true);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading && !user) {
        console.error("SubscriptionSuccessPage: No authenticated user found.");
        router.push("/");
      }
      return;
    }

    if (!sessionId) {
      router.push("/");
      return;
    }

    const verifySession = async () => {
      console.log("SubscriptionSuccessPage: Verifying session for user:", user.uid);
      setVerifying(true);
      try {
        const idToken = await user.getIdToken();
        if (!idToken) {
          throw new Error("Failed to get ID token");
        }

        const response = await fetch(`/api/stripe/verify-session?session_id=${sessionId}`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
        
        if (!response.ok) {
           const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
           console.error("SubscriptionSuccessPage: Failed API verification", response.status, errorData);
          throw new Error(`Failed to verify subscription: ${errorData.message || response.statusText}`);
        }
        
        console.log("SubscriptionSuccessPage: Session verified successfully.");
        setVerifying(false);
      } catch (error) {
        console.error("Error verifying session:", error);
        router.push("/");
      }
    };

    verifySession();
  }, [sessionId, router, user, authLoading]);

  if (authLoading || verifying) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h1 className="text-2xl font-bold mb-2">{authLoading ? "Authenticating..." : "Processing your subscription..."}</h1>
        <p className="text-muted-foreground">{authLoading ? "Checking your login status." : "Please wait while we verify your payment."}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="max-w-md w-full mx-auto text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-4">Subscription Successful!</h1>
        <p className="text-lg mb-6">
          Thank you for subscribing to PDF2MD. Your account has been upgraded and you can now
          convert more PDFs to Markdown.
        </p>
        <div className="space-y-4">
          <Button asChild className="w-full">
            <Link href="/">
              Convert Your First PDF
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/account">
              View Subscription Details
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
} 