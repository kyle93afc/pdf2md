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
import { Download, Loader2, Package } from "lucide-react";
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
  const processingStartedRef = useRef(false);
  const currentFileRef = useRef<File | null>(null);

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

      // Server action now returns raw base64, no need to check for data URI here
      // If API guarantees raw base64, this check can be simplified/removed
      // Keeping it for robustness in case API changes or server action adds it back
      if (b64Data.startsWith("data:")) {
        const parts = b64Data.split(";base64,");
        if (parts.length === 2) {
           if (parts[0].startsWith("data:")) {
             mimeType = parts[0].replace("data:", "") || defaultMimeType;
           }
           b64Data = parts[1];
        }
      }

      b64Data = b64Data.replace(/\s/g, "");
      if (!b64Data || b64Data.trim() === "") {
        console.warn("Empty base64 data provided to base64ToBlob.");
        return { blob: null, mimeType };
      }

      const byteCharacters = atob(b64Data);
      const byteArrays = [];
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      return { blob: new Blob(byteArrays, { type: mimeType }), mimeType };

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

  // Process file using Upload -> Signed URL -> Server Action flow
  const processFile = async () => {
    let tempPath = ""; // Variable to hold path for cleanup
    setLoading(true);
    setMarkdown("");
    setExtractedImages([]);
    setUploadedPath(""); // Reset stored path
    onError("");

    try {
      // 1. Upload the file to storage
      const tempFileName = `temp/${Date.now()}-${file.name}`;
      console.log(`Client: Uploading file to ${tempFileName}...`);
      const uploadResult = await uploadFileStorage(
        STORAGE_BUCKETS.PDF_UPLOADS,
        tempFileName,
        file,
        { upsert: true }
      );

      if (!uploadResult.isSuccess || !uploadResult.data) {
        throw new Error(uploadResult.message || "Failed to upload PDF file.");
      }
      tempPath = uploadResult.data.path; // Store path for potential cleanup
      setUploadedPath(tempPath); // Also store in state for unmount cleanup
      console.log(`Client: File uploaded successfully to ${tempPath}.`);

      // 2. Get a signed URL for the uploaded file
      console.log(`Client: Creating signed URL for ${tempPath}...`);
      const urlResult = await createSignedUrlStorage(
        STORAGE_BUCKETS.PDF_UPLOADS,
        tempPath
      );

      if (!urlResult.isSuccess || !urlResult.data?.signedUrl) {
        throw new Error(urlResult.message || "Failed to create signed URL.");
      }
      const signedUrl = urlResult.data.signedUrl;
      console.log(`Client: Signed URL created.`);

      // 3. Call the server action with the signed URL
      console.log(`Client: Calling processPdfWithMistralAction with URL...`);
      const response = await processPdfWithMistralAction(signedUrl);

      if (!response.isSuccess || !response.data) {
        throw new Error(response.message || 'Failed to process PDF via Mistral Action (URL method)');
      }

      console.log("Client: Received response from action. Text length:", response.data.text.length, "Images count:", response.data.images.length);

      // 4. Store results
      setExtractedImages(response.data.images); // Images have base64, index, mimeType
      setMarkdown(response.data.text); // Markdown text as processed by the action
      console.log("Client: Set markdown and image state.");

      // 5. Call the onComplete callback
      onComplete(response.data.text, response.data.images);

    } catch (error) {
      console.error("Client: Error processing file:", error);
      onError(error instanceof Error ? error.message : "Failed to process file");
    } finally {
      setLoading(false);
      // 6. Clean up the temporary file from storage if it was uploaded
      if (tempPath) {
        console.log(`Client: Cleaning up temporary file ${tempPath}...`);
        deleteFileStorage(STORAGE_BUCKETS.PDF_UPLOADS, tempPath)
          .then(result => {
            if (result.isSuccess) {
              console.log(`Client: Successfully deleted ${tempPath}.`);
            } else {
              console.warn(`Client: Failed to delete ${tempPath}: ${result.message}`);
            }
          })
          .catch(cleanupError => {
            console.error(`Client: Error during cleanup of ${tempPath}:`, cleanupError);
          });
        setUploadedPath(""); // Clear state path after attempting deletion
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

  if (loading) {
    return (
      <div className="flex items-center justify-center space-x-2 p-8">
        <Loader2 className="size-6 animate-spin" />
        <span>Processing document...</span>
      </div>
    );
  }

  if (markdown) {
    return (
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            OCR Result (Preview)
          </h3>
          <div className="flex gap-2">
            <Button onClick={handleDownloadMarkdown} size="sm" variant="outline">
              <Download className="mr-2 size-4" />
              Download .md
            </Button>
            <Button onClick={handleDownloadZip} size="sm" variant="default">
              <Package className="mr-2 size-4" />
              Download .zip
            </Button>
          </div>
        </div>

        {/* Basic Markdown Preview Area */}
        <ScrollArea className="h-[500px] w-full rounded-md border p-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
             {/* Use standard ReactMarkdown without blob URL logic */}
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              // Images won't render correctly here, but text will
              // You might want custom components to show placeholders for images
            >
              {markdown}
            </ReactMarkdown>
          </div>
        </ScrollArea>
      </Card>
    );
  }

  // Default state before processing or if file is null
  if (!file && !loading) {
      return (
        <Card className="p-6 text-center text-muted-foreground">
          Select a PDF file to begin processing.
        </Card>
      );
  }

  return null; // Render nothing if file selected but processing hasn't finished (or errored - parent handles error display)
} 