"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import { getPagesRemaining } from "@/lib/services/subscription-service";
import dynamic from "next/dynamic";

// Dynamically import the OCR processor to reduce initial bundle size
const MistralOCRProcessor = dynamic(() => import("./MistralOCRProcessor"), {
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-6 w-6 animate-spin mr-2" />
      <span>Loading OCR processor...</span>
    </div>
  ),
  ssr: false,
});

export default function FileUpload() {
  const { user, loading: authLoading } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [pagesRemaining, setPagesRemaining] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [markdownResult, setMarkdownResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUserSubscriptionDetails = async () => {
    if (!user) return;
    
    try {
      const remaining = await getPagesRemaining(user.uid);
      setPagesRemaining(remaining);
    } catch (error) {
      console.error("Error fetching subscription details:", error);
      toast.error("Failed to fetch subscription information");
    }
  };

  // Check pages remaining when user logs in
  useEffect(() => {
    if (user && !authLoading) {
      fetchUserSubscriptionDetails();
    }
  }, [user, authLoading]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    
    if (!selectedFile) return;
    
    if (!user) {
      toast.error("Please sign in to upload files");
      return;
    }
    
    if (selectedFile.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }
    
    setUploadingFile(true);
    
    try {
      // Estimate page count from file size (rough approximation)
      const estimatedPageCount = Math.max(1, Math.ceil(selectedFile.size / (500 * 1024)));
      
      // Check if user has enough pages remaining
      const remaining = await getPagesRemaining(user.uid);
      setPagesRemaining(remaining);
      
      if (remaining < estimatedPageCount) {
        toast.error(`You don't have enough pages remaining in your plan (Needed: ~${estimatedPageCount}, Available: ${remaining})`);
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setMarkdownResult(null);
    } catch (error) {
      console.error("Error checking subscription:", error);
      toast.error("Failed to validate subscription");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setMarkdownResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleConversionComplete = (markdown: string) => {
    setMarkdownResult(markdown);
    setIsProcessing(false);
    toast.success("PDF successfully converted to Markdown!");
    
    // Refresh remaining pages
    fetchUserSubscriptionDetails();
  };

  const handleConversionError = (error: string) => {
    setIsProcessing(false);
    toast.error(`Error: ${error}`);
  };

  return (
    <div>
      {!file ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 text-center">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
          />
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Upload your PDF</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            {user ? (
              `You have ${pagesRemaining !== null ? pagesRemaining : '...'} pages remaining in your plan`
            ) : (
              "Please sign in to upload and convert PDFs"
            )}
          </p>
          <Button 
            disabled={!user || authLoading || uploadingFile} 
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadingFile ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Select PDF
              </>
            )}
          </Button>
        </div>
      ) : (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <FileText className="h-6 w-6 mr-2 text-primary" />
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            {!isProcessing && !markdownResult && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRemoveFile}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {!isProcessing && !markdownResult && (
            <Button 
              onClick={() => setIsProcessing(true)} 
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              Convert to Markdown
            </Button>
          )}

          {isProcessing && (
            <MistralOCRProcessor
              file={file}
              onComplete={handleConversionComplete}
              onError={handleConversionError}
              pagesRemaining={pagesRemaining || 0}
            />
          )}

          {markdownResult && !isProcessing && (
            <div className="mt-4">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleRemoveFile}
              >
                Convert Another File
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
} 