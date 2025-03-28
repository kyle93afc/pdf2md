"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Menu, X, User, LogOut } from "lucide-react";

export default function Header() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-background border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 flex justify-between items-center h-16">
        <Link href="/" className="font-bold text-xl flex items-center">
          PDF2MD
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">
            Home
          </Link>
          <Link href="/pricing" className="text-sm font-medium hover:text-primary transition-colors">
            Pricing
          </Link>
          <Link href="/docs" className="text-sm font-medium hover:text-primary transition-colors">
            Documentation
          </Link>
        </nav>

        {/* Auth buttons */}
        <div className="hidden md:flex items-center space-x-4">
          {loading ? (
            <Button disabled variant="outline" size="sm">
              Loading...
            </Button>
          ) : user ? (
            <div className="flex items-center gap-4">
              <div className="text-sm">
                {user.displayName || user.email}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={signOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          ) : (
            <Button 
              onClick={signInWithGoogle} 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              Sign In
            </Button>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden flex items-center"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 py-4 border-t space-y-4">
          <Link 
            href="/" 
            className="block py-2 text-sm font-medium"
            onClick={() => setMobileMenuOpen(false)}
          >
            Home
          </Link>
          <Link 
            href="/pricing" 
            className="block py-2 text-sm font-medium"
            onClick={() => setMobileMenuOpen(false)}
          >
            Pricing
          </Link>
          <Link 
            href="/docs" 
            className="block py-2 text-sm font-medium"
            onClick={() => setMobileMenuOpen(false)}
          >
            Documentation
          </Link>
          
          <div className="pt-4 border-t">
            {loading ? (
              <Button disabled variant="outline" size="sm" className="w-full">
                Loading...
              </Button>
            ) : user ? (
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  {user.displayName || user.email}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button 
                onClick={() => {
                  signInWithGoogle();
                  setMobileMenuOpen(false);
                }} 
                variant="outline" 
                size="sm"
                className="w-full flex items-center justify-center gap-2"
              >
                <User className="h-4 w-4" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
} 