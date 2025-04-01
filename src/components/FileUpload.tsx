"use client";

import { useState, useRef, useEffect, useCallback, DragEvent } from "react";
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
import { Progress } from "@/components/ui/progress";
import { uploadFile } from "@/lib/firebase/firebaseUtils";
import { v4 as uuidv4 } from 'uuid';

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

// Upload status type
type UploadStatus = 'idle' | 'validating' | 'uploading' | 'processing' | 'complete' | 'error';

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function FileUpload() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [pagesRemaining, setPagesRemaining] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [storageUrl, setStorageUrl] = useState<string | null>(null); // Store the uploaded file URL
  const [markdownResult, setMarkdownResult] = useState<string | null>(null);
  const [extractedImages, setExtractedImages] = useState<{ base64: string; index: number; mimeType: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
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

  const validateFile = (selectedFile: File | null): boolean => {
    if (!selectedFile) return false;

    // TESTING MODE: Bypass auth check (keep commented for production)
    /*
    if (!user) {
      toast.error("Please sign in to upload files");
      return false;
    }
    */

    if (selectedFile.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return false;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`File size exceeds the ${MAX_FILE_SIZE_MB}MB limit.`);
      return false;
    }

    // Optional: Add page count check here if needed and possible before upload
    // const remaining = pagesRemaining; // Assuming fetched earlier
    // const estimatedPageCount = ...;
    // if (remaining < estimatedPageCount) { ... }

    return true;
  };

  const handleFileSelect = async (selectedFile: File | null) => {
    if (!validateFile(selectedFile)) {
      resetState();
      return;
    }

    setUploadStatus('validating');
    setFile(selectedFile);
    setMarkdownResult(null); // Clear previous results
    setStorageUrl(null);
    setUploadProgress(0);

    // Start upload process
    if (selectedFile) {
      await startUpload(selectedFile);
    }
  };

  const startUpload = async (fileToUpload: File) => {
    if (!user) {
      toast.error("Authentication error. Please sign in again.");
      resetState();
      return;
    }
    setUploadStatus('uploading');
    setUploadProgress(0);

    const filePath = `uploads/${user.uid}/${uuidv4()}-${fileToUpload.name}`;

    try {
      const downloadURL = await uploadFile(fileToUpload, filePath, (progress) => {
        setUploadProgress(progress);
      });
      setStorageUrl(downloadURL);
      setUploadStatus('processing'); // Move to processing stage after successful upload
      console.log("File uploaded successfully:", downloadURL);
      // Don't call setIsProcessing(true) here, it's handled by uploadStatus change
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("File upload failed. Please try again.");
      resetState();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files?.[0] || null);
  };

  // Drag and Drop handlers
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0] || null;
    handleFileSelect(droppedFile);
  }, [user]); // Include dependencies like user if needed for validation inside handleFileSelect

  const resetState = () => {
    setFile(null);
    setMarkdownResult(null);
    setExtractedImages([]);
    setUploadStatus('idle');
    setUploadProgress(0);
    setStorageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleConversionComplete = (markdown: string, images: { base64: string; index: number; mimeType: string }[]) => {
    console.log("Conversion complete, markdown length:", markdown?.length, "images:", images?.length);
    if (!markdown || !images) {
      handleConversionError("Received empty conversion result");
      return;
    }
    setMarkdownResult(markdown);
    setExtractedImages(images);
    setUploadStatus('complete'); // Set status to complete
    toast.success("PDF successfully converted to Markdown!");
    fetchUserSubscriptionDetails(); // Refresh remaining pages
  };

  const handleConversionError = (error: string) => {
    console.error("Conversion error:", error);
    setUploadStatus('error'); // Set status to error
    setMarkdownResult(null);
    setExtractedImages([]);
    if (error && error.trim()) {
      toast.error(`Error: ${error}`);
    }
  };

  // Debug useEffect for image path troubleshooting
  useEffect(() => {
    if (markdownResult && extractedImages.length > 0) {
      console.log("Markdown preview debugging:", {
        firstImageRef: markdownResult.includes("![") ? 
          markdownResult.substring(
            markdownResult.indexOf("!["), 
            markdownResult.indexOf("![") + 50
          ) : "No image refs",
        imageBlobUrlKeys: Object.keys(Object.fromEntries(
          extractedImages.map((img, index) => [
            `images/img-${index}.${getExtensionFromMime(img.mimeType)}`,
            `data:${img.mimeType};base64,${img.base64}`
          ])
        ))
      });
    }
  }, [markdownResult, extractedImages]);

  // Determine button/area text and state
  const getUploadAreaContent = () => {
    switch (uploadStatus) {
      case 'uploading':
        return (
          <>
            <Loader2 className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
            <h3 className="text-lg font-medium mb-2">Uploading...</h3>
            <Progress value={uploadProgress} className="w-full max-w-xs" />
            <p className="text-sm text-muted-foreground mt-2">{uploadProgress.toFixed(0)}%</p>
          </>
        );
      case 'validating':
         return (
           <>
             <Loader2 className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
             <h3 className="text-lg font-medium mb-2">Validating...</h3>
             <p className="text-sm text-muted-foreground max-w-md">Checking file type and size.</p>
           </>
         );
      case 'processing':
      case 'complete': // Show selected file info even when complete
      case 'error':    // Show selected file info even on error
        if (!file) return null; // Should not happen if file state is managed correctly
        return (
           <div className="flex flex-col items-center text-center">
             <FileText className="h-12 w-12 text-primary mb-4" />
             <p className="font-medium mb-1">{file.name}</p>
             <p className="text-sm text-muted-foreground mb-4">
               {(file.size / 1024 / 1024).toFixed(2)} MB
             </p>
             {uploadStatus === 'processing' && (
                <div className="w-full flex flex-col items-center">
                    <Loader2 className="h-6 w-6 animate-spin mr-2 mb-2" />
                    <span>Processing PDF...</span>
                </div>
             )}
             {uploadStatus === 'error' && (
                 <p className="text-sm text-red-500">An error occurred. Please try again.</p>
             )}
             {// Keep remove button accessible unless actively processing
              (uploadStatus === 'complete' || uploadStatus === 'error') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetState}
                  className="mt-4"
                >
                  <X className="h-4 w-4 mr-2" /> Remove File
                </Button>
             )}
           </div>
        );
      case 'idle':
      default:
        return (
          <>
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {isDragging ? "Drop your PDF here" : "Upload your PDF"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              {user ? (
                `Drag & drop or click to select. ${pagesRemaining !== null ? `(${pagesRemaining} pages remaining)` : ''}`
              ) : (
                "Please sign in to upload and convert PDFs"
              )}
            </p>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                // For testing: allow direct click even without login
                fileInputRef.current?.click();
                /*
                if (user) { fileInputRef.current?.click(); }
                else { autoLogin(); }
                */
              }}
              disabled={!user && !authLoading} // Disable if not logged in (unless testing)
            >
              <FileText className="mr-2 h-4 w-4" />
              Select PDF {(user || true) ? '' : '(Sign in required)'}
            </Button>
             <p className="text-xs text-muted-foreground mt-2">Max {MAX_FILE_SIZE_MB}MB</p>
          </>
        );
    }
  };

  return (
    <div>
      {(uploadStatus === 'idle' || uploadStatus === 'validating' || uploadStatus === 'uploading' || (uploadStatus === 'error' && !markdownResult)) ? (
        <div
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
            isDragging ? 'border-primary bg-primary/10' : 'border-muted'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver} // Use same handler for enter
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
            disabled={uploadStatus === 'uploading' || uploadStatus === 'validating'}
          />
          {getUploadAreaContent()}
        </div>
      ) : ( // Show card when processing, complete, or error with results
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
             {getUploadAreaContent()} {/* Reuse content display */}
          </div>

          {/* Conditionally render MistralProcessor only when upload is done and status is 'processing' */}
          {uploadStatus === 'processing' && storageUrl && file && (
            <MistralOCRProcessor
              fileUrl={storageUrl} // Pass URL instead of file
              fileName={file.name} // Pass file name for reference
              onComplete={handleConversionComplete}
              onError={handleConversionError}
              pagesRemaining={pagesRemaining || 0} // Pass remaining pages if needed by processor
            />
          )}

          {uploadStatus === 'complete' && markdownResult && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Preview</h3>
                <div className="flex gap-2">
                   {/* Download Buttons */}
                   <Button
                    variant="outline"
                    onClick={() => {
                      const blob = new Blob([markdownResult], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${file?.name.replace(/\.[^/.]+$/, "") || 'converted'}.md`;
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
                        const response = await fetch('/api/mistral/download-zip', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            markdown: markdownResult,
                            images: extractedImages,
                            fileName: file?.name.replace(/\.[^/.]+$/, "") || 'converted'
                          }),
                        });
                        if (!response.ok) throw new Error('Failed to generate ZIP');
                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${file?.name.replace(/\.[^/.]+$/, "") || 'converted'}-package.zip`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
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
                 <Button
                  variant="secondary"
                  size="sm"
                  onClick={resetState}
                  className="mt-4 w-full"
                >
                   Upload Another File
                </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
} 