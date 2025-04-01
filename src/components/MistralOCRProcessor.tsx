"use client";

import { useState, useEffect, useRef } from "react";
import { OCRProcessorProps } from "@/types/ocr-types";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Package, AlertCircle } from "lucide-react";
import { processPdfWithMistralAction } from "@/actions/mistral-ocr-actions";
import {
  uploadFileStorage,
  createSignedUrlStorage,
  deleteFileStorage
} from "@/lib/storage-helpers";
import { STORAGE_BUCKETS } from "@/lib/storage-constants";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import "katex/dist/katex.min.css"; // Keep KaTeX CSS
import { ErrorBoundary } from "./ErrorBoundary";

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

export default function MistralOCRProcessor({
  file,
  onComplete,
  onError
}: OCRProcessorProps) {
  const [markdown, setMarkdown] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [uploadedPath, setUploadedPath] = useState<string>("");
  const [extractedImages, setExtractedImages] = useState<
    { base64: string; index: number; mimeType: string }[]
  >([]);
  const [processingStage, setProcessingStage] = useState<string>("");
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const processingStartedRef = useRef(false);
  const currentFileRef = useRef<File | null>(null);

  // Custom components for ReactMarkdown
  const components = {
    img: ({ src, alt, ...props }: any) => {
      try {
        // Find the corresponding image data
        const imageData = extractedImages.find(img => {
          try {
            const filename = `img-${img.index}.${getExtensionFromMime(img.mimeType)}`;
            return src.includes(filename);
          } catch (e) {
            console.warn("Error matching image:", e);
            return false;
          }
        });

        if (!imageData) {
          console.warn("No matching image data found for:", src);
          return (
            <div className="flex items-center justify-center p-4 border rounded bg-muted">
              <AlertCircle className="w-6 h-6 text-muted-foreground mr-2" />
              <span className="text-sm text-muted-foreground">Image not found</span>
            </div>
          );
        }

        // Ensure the base64 data has the correct prefix
        const imgSrc = imageData.base64.startsWith('data:') 
          ? imageData.base64 
          : `data:${imageData.mimeType || 'image/png'};base64,${imageData.base64}`;

        return (
          <img
            src={imgSrc}
            alt={alt || `Image ${imageData.index + 1}`}
            className="max-w-full h-auto my-4"
            onError={(e) => {
              console.error("Error loading image:", e);
              const target = e.target as HTMLImageElement;
              target.onerror = null; // Prevent infinite loop
              target.src = ''; // Clear the broken image
              target.alt = 'Failed to load image';
              target.className = 'hidden';
            }}
            {...props}
          />
        );
      } catch (error) {
        console.error("Error rendering image:", error);
        return (
          <div className="flex items-center justify-center p-4 border rounded bg-destructive/10">
            <AlertCircle className="w-6 h-6 text-destructive mr-2" />
            <span className="text-sm">Error loading image</span>
          </div>
        );
      }
    }
  };

  // Download raw markdown as received from the server action
  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const filename = `${file.name.replace(/\.[^/.]+$/, "")}.md`;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    try {
      a.click();
    } catch (err) {
      console.error("Error clicking download link:", err);
    } finally {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Helper to convert base64 (potentially with data URI) to Blob
  const base64ToBlob = (
    base64: string,
    defaultMimeType = "image/png"
  ): { blob: Blob | null; mimeType: string } => {
    try {
      let b64Data = base64;
      let mimeType = defaultMimeType;

      // First, ensure we have valid base64 data
      if (!b64Data) {
        console.warn("Empty base64 data provided");
        return { blob: null, mimeType };
      }

      // Handle data URI format if present
      if (b64Data.startsWith("data:")) {
        const parts = b64Data.split(";base64,");
        if (parts.length === 2) {
          mimeType = parts[0].replace("data:", "") || defaultMimeType;
          b64Data = parts[1];
        }
      }

      // Clean the base64 string
      b64Data = b64Data.replace(/[\r\n\s]/g, "");
      
      // Validate base64 string
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b64Data)) {
        console.warn("Invalid base64 data format");
        return { blob: null, mimeType };
      }

      try {
        // Convert base64 to binary
        const byteCharacters = atob(b64Data);
        const byteArrays = [];

        // Process in chunks to handle large images
        const sliceSize = 1024;
        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
          const slice = byteCharacters.slice(offset, offset + sliceSize);
          const byteNumbers = new Array(slice.length);
          
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          
          byteArrays.push(new Uint8Array(byteNumbers));
        }

        return {
          blob: new Blob(byteArrays, { type: mimeType }),
          mimeType
        };
      } catch (e) {
        console.error("Error converting base64 to blob:", e);
        return { blob: null, mimeType };
      }
    } catch (error) {
      console.error("Error in base64ToBlob:", error);
      return { blob: null, mimeType: defaultMimeType };
    }
  };


  // Download Zip with images folder and adjusted markdown paths
  const handleDownloadZip = async () => {
    const zip = new JSZip();
    const folderName = file.name.replace(/\.[^/.]+$/, "");
    const imagesFolder = zip.folder("images");
    if (!imagesFolder) {
      console.error("Failed to create images folder in zip.");
      return;
    }

    const imageFileInfo: { index: number; filename: string }[] = [];
    for (const img of extractedImages) {
      const { blob, mimeType } = base64ToBlob(img.base64, img.mimeType);
      const extension = getExtensionFromMime(mimeType);
      const filename = `img-${img.index}.${extension}`;

      if (blob) {
        imagesFolder.file(filename, blob);
        imageFileInfo.push({ index: img.index, filename });
      } else {
        console.error(`Failed to process image ${img.index} for zip.`);
      }
    }

    let mdContentForZip = markdown;
    imageFileInfo.forEach(info => {
      const pattern = new RegExp(`(!\\[[^\\]]*\\]\\()(${info.filename.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")})(\\))`,
        "g"
      );
      mdContentForZip = mdContentForZip.replace(pattern, `$1images/${info.filename}$3`);

      if (!mdContentForZip.includes(`images/${info.filename}`)) {
          const fallbackPattern = new RegExp(
            `(!\\[Image ${info.index + 1}\\]\\()(${info.filename.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")})(\\))`,
            "g"
          );
          mdContentForZip = mdContentForZip.replace(fallbackPattern, `$1images/${info.filename}$3`);
      }
    });

    zip.file(`${folderName}.md`, mdContentForZip);

    try {
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `${folderName}.zip`);
    } catch (error) {
      console.error("Error generating ZIP:", error);
    }
  };

  // Enhanced processFile function with better error handling and progress tracking
  const processFile = async () => {
    let tempPath = "";
    setLoading(true);
    setMarkdown("");
    setExtractedImages([]);
    setUploadedPath("");
    setProcessingStage("Initializing...");
    setProcessingProgress(0);
    onError("");

    try {
      // Validate input file
      if (!file || !(file instanceof File)) {
        throw new Error("Invalid file provided");
      }

      // Upload stage
      setProcessingStage("Uploading PDF...");
      setProcessingProgress(10);
      const tempFileName = `temp/${Date.now()}-${file.name}`;
      const uploadResult = await uploadFileStorage(
        STORAGE_BUCKETS.PDF_UPLOADS,
        tempFileName,
        file,
        { upsert: true }
      );

      if (!uploadResult.isSuccess || !uploadResult.data) {
        throw new Error(uploadResult.message || "Failed to upload PDF file.");
      }
      tempPath = uploadResult.data.path;
      setUploadedPath(tempPath);
      setProcessingProgress(30);

      // URL Generation stage
      setProcessingStage("Preparing for processing...");
      const urlResult = await createSignedUrlStorage(
        STORAGE_BUCKETS.PDF_UPLOADS,
        tempPath
      );

      if (!urlResult.isSuccess || !urlResult.data?.signedUrl) {
        throw new Error(urlResult.message || "Failed to create signed URL.");
      }
      setProcessingProgress(50);

      // Processing stage
      setProcessingStage("Processing PDF with OCR...");
      const response = await processPdfWithMistralAction(urlResult.data.signedUrl);

      if (!response.isSuccess || !response.data) {
        console.error("Server response:", response);
        throw new Error(response.message || 'Failed to process PDF');
      }

      // Validate response data
      if (!response.data.text || typeof response.data.text !== 'string') {
        console.error("Invalid text in response:", response.data);
        throw new Error('Invalid text data in response');
      }

      if (!Array.isArray(response.data.images)) {
        console.error("Invalid images array in response:", response.data);
        throw new Error('Invalid images data in response');
      }

      // Validate each image
      const validImages = response.data.images.filter(img => {
        if (!img || typeof img !== 'object') {
          console.warn(`Invalid image object:`, img);
          return false;
        }
        if (!img.base64 || typeof img.base64 !== 'string') {
          console.warn(`Invalid base64 data for image ${img.index}:`, img.base64);
          return false;
        }
        if (!img.mimeType || typeof img.mimeType !== 'string') {
          console.warn(`Invalid mime type for image ${img.index}:`, img.mimeType);
          return false;
        }
        if (typeof img.index !== 'number') {
          console.warn(`Invalid index for image:`, img);
          return false;
        }
        return true;
      });

      if (validImages.length === 0 && response.data.images.length > 0) {
        console.warn("No valid images found in response");
      }

      setProcessingProgress(80);

      // Finalizing stage
      setProcessingStage("Finalizing results...");
      setExtractedImages(validImages);
      setMarkdown(response.data.text);
      setProcessingProgress(100);
      
      if (response.data.text.trim().length === 0) {
        throw new Error('No text content extracted from PDF');
      }

      onComplete(response.data.text, validImages);

    } catch (error) {
      console.error("Error processing file:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Failed to process file";
      onError(errorMessage);
      setProcessingStage(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
      if (tempPath) {
        try {
          await deleteFileStorage(STORAGE_BUCKETS.PDF_UPLOADS, tempPath);
          setUploadedPath("");
        } catch (cleanupError) {
          console.error("Error cleaning up temporary file:", cleanupError);
        }
      }
    }
  };

  // useEffect to trigger processing when the file prop changes
  useEffect(() => {
    if (file && file !== currentFileRef.current) {
      console.log("Client: New file prop detected. Resetting and starting processing.");
      currentFileRef.current = file; // Update the current file ref
      processingStartedRef.current = false; // Reset processing flag for the new file

      if (!processingStartedRef.current) {
        processingStartedRef.current = true; // Set flag to true
        processFile().catch((err) => {
            console.error("Client: Unhandled error in processFile execution:", err);
            onError(err instanceof Error ? err.message : "Unknown error during processing start");
            processingStartedRef.current = false; // Reset flag on error
        });
      }
    } else if (!file) {
        console.log("Client: File prop removed or became null.");
        currentFileRef.current = null;
        processingStartedRef.current = false;
        setMarkdown("");
        setExtractedImages([]);
        setUploadedPath("");
        setLoading(false);
    }

    return () => {
      console.log("Client: MistralOCRProcessor effect cleanup running.");
    };
  }, [file, onComplete, onError]);

  // Separate useEffect for cleaning up the temp file on unmount if path exists
   useEffect(() => {
     const pathToDelete = uploadedPath;
     return () => {
       if (pathToDelete) {
         console.log(`Client Unmount Cleanup: Deleting temp file ${pathToDelete}...`);
         deleteFileStorage(STORAGE_BUCKETS.PDF_UPLOADS, pathToDelete)
           .catch(console.error);
       }
     };
   }, [uploadedPath]);

  return (
    <ErrorBoundary>
      <div className="w-full">
        {loading ? (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="font-medium">{processingStage}</span>
              </div>
              <div className="w-full max-w-xs">
                <div className="h-2 bg-secondary rounded-full">
                  <div
                    className="h-2 bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        ) : markdown ? (
          <Card className="w-full">
            <ScrollArea className="h-[600px] w-full rounded-md border p-4">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={components}
              >
                {markdown}
              </ReactMarkdown>
            </ScrollArea>
            <div className="flex justify-end gap-2 p-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadMarkdown}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Markdown
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadZip}
                className="flex items-center gap-2"
              >
                <Package className="h-4 w-4" />
                Download Zip
              </Button>
            </div>
          </Card>
        ) : null}
      </div>
    </ErrorBoundary>
  );
} 