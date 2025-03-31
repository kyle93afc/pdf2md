"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, X, Loader2, User, Download, Package } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import { getPagesRemaining } from "@/lib/services/subscription-service";
import dynamic from "next/dynamic";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/firebase";
import ObsidianMarkdownPreview from "./ObsidianMarkdownPreview";
import { ScrollArea } from "@/components/ui/scroll-area";

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

// Helper to get file extension from MIME type
const getExtensionFromMime = (mimeType: string): string => {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/bmp": "bmp",
    "image/tiff": "tiff"
  };

  // Handle potential complex mime types like 'image/png;charset=utf-8'
  const simpleMime = mimeType.split(';')[0];
  return mimeToExt[simpleMime] || "png"; // Default to png if unknown
};

export default function FileUpload() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [pagesRemaining, setPagesRemaining] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [markdownResult, setMarkdownResult] = useState<string | null>(null);
  const [extractedImages, setExtractedImages] = useState<{ base64: string; index: number; mimeType: string }[]>([]);
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

  // Function to auto-login with test credentials for development only
  const autoLogin = async () => {
    try {
      console.log("Auto-login attempt...");
      // First try with Google sign-in popup
      await signInWithGoogle();
    } catch (error) {
      console.error("Error with auto-login:", error);
      toast.error("Please sign in using the button in the header");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    
    if (!selectedFile) return;
    
    console.log("File selected:", selectedFile.name, selectedFile.size);
    
    // TESTING MODE: Bypass authentication check
    /*
    if (!user) {
      console.log("No user authenticated");
      toast.error("Please sign in to upload files");
      return;
    }
    */
    
    if (selectedFile.type !== "application/pdf") {
      console.log("File is not a PDF:", selectedFile.type);
      toast.error("Please upload a PDF file");
      return;
    }
    
    setUploadingFile(true);
    
    try {
      // Estimate page count from file size (rough approximation)
      const estimatedPageCount = Math.max(1, Math.ceil(selectedFile.size / (5000 * 1024)));
      console.log("Estimated page count:", estimatedPageCount);
      
      // TESTING MODE: Skip Firebase verification and set high page count
      const remaining = 1000; // Assume 1000 pages available for testing
      setPagesRemaining(remaining);
      
      /*
      // Check if user has enough pages remaining
      const remaining = await getPagesRemaining(user.uid);
      console.log("Pages remaining:", remaining);
      setPagesRemaining(remaining);
      
      if (remaining < estimatedPageCount) {
        console.log("Not enough pages:", remaining, "<", estimatedPageCount);
        toast.error(`You don't have enough pages remaining in your plan (Needed: ~${estimatedPageCount}, Available: ${remaining})`);
        setFile(null);
        return;
      }
      */
      
      console.log("Setting file for conversion");
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

  const handleConversionComplete = (markdown: string, images: { base64: string; index: number; mimeType: string }[]) => {
    console.log("Conversion complete, markdown length:", markdown.length, "images:", images.length);
    setMarkdownResult(markdown);
    setExtractedImages(images);
    setIsProcessing(false);
    toast.success("PDF successfully converted to Markdown!");
    
    // Refresh remaining pages
    fetchUserSubscriptionDetails();
  };

  const handleConversionError = (error: string) => {
    console.error("Conversion error:", error);
    setIsProcessing(false);
    toast.error(`Error: ${error}`);
  };

  return (
    <div>
      {!file ? (
        <div 
          className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 text-center cursor-pointer"
          onClick={() => {
            // For testing: allow direct click even without login
            fileInputRef.current?.click();
            /*
            if (!user && !authLoading) {
              console.log("No user logged in, triggering auto-login");
              autoLogin();
            } else if (user) {
              fileInputRef.current?.click();
            }
            */
          }}
        >
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
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
              /*
              if (user) {
                fileInputRef.current?.click();
              } else {
                autoLogin();
              }
              */
            }}
          >
            {uploadingFile ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : !user ? (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Select PDF (Test Mode)
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
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Preview</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Create a blob and download it
                      const blob = new Blob([markdownResult], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${file.name.replace(/\.[^/.]+$/, "")}.md`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Markdown
                  </Button>
                  <Button
                    variant="default"
                    onClick={async () => {
                      try {
                        console.log("Starting ZIP download, images count:", extractedImages.length);
                        // Call the download-zip API
                        const response = await fetch('/api/mistral/download-zip', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            markdown: markdownResult,
                            images: extractedImages,
                            fileName: file.name.replace(/\.[^/.]+$/, "")
                          }),
                        });
                        
                        if (!response.ok) {
                          const errorData = await response.json();
                          throw new Error(errorData.error || 'Failed to generate ZIP file');
                        }
                        
                        // Get the ZIP file as a blob
                        const blob = await response.blob();
                        
                        // Create a URL for the blob
                        const url = URL.createObjectURL(blob);
                        
                        // Create a link to download the file
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${file.name.replace(/\.[^/.]+$/, "")}-converted.zip`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        
                        // Clean up the URL
                        URL.revokeObjectURL(url);
                      } catch (error) {
                        console.error("Error downloading ZIP:", error);
                        alert("Failed to download ZIP. Please try downloading just the markdown.");
                      }
                    }}
                  >
                    <Package className="mr-2 h-4 w-4" />
                    Download ZIP
                  </Button>
                </div>
              </div>
              
              <Card className="mt-4">
                <ScrollArea className="h-[500px] w-full rounded-md border p-4">
                  <ObsidianMarkdownPreview
                    content={markdownResult}
                    imageBlobUrls={Object.fromEntries(
                      extractedImages.map((img, index) => [
                        `images/img-${index}.${getExtensionFromMime(img.mimeType)}`,
                        `data:${img.mimeType};base64,${img.base64}`
                      ])
                    )}
                  />
                </ScrollArea>
              </Card>
            </div>
          )}
        </Card>
      )}
    </div>
  );
} 